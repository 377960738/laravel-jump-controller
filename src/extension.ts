import {
  CancellationToken,
  CancellationTokenSource,
  commands,
  Definition,
  DefinitionProvider,
  Disposable,
  ExtensionContext,
  Hover,
  HoverProvider,
  languages,
  Location,
  MarkdownString,
  Position,
  Range,
  TextDocument,
  TextEditor,
  TextEditorDecorationType,
  Uri,
  window,
  workspace,
} from 'vscode';
import { LaravelRouteParser } from './core/route-parser';
import type { RouteTarget } from './core/types';
import { classPathCandidates, parseComposerJson, type ComposerJson } from './core/composer';
import { controllerSnapshot, controllerSymbolChanged, locateClass, locateMethod, parentClassName, type ControllerSnapshot } from './core/method-locator';
import { TargetCache } from './core/target-cache';

const selector = { scheme: 'file', language: 'php' };

export function activate(context: ExtensionContext): void {
  const service = new LaravelNavigationService();
  const provider = new LaravelNavigationProvider(service);
  const decorations = new LaravelDecorationManager(service);
  const phpWatcher = workspace.createFileSystemWatcher('**/*.php');
  const composerWatcher = workspace.createFileSystemWatcher('**/composer.json');
  const invalidateAndRefresh = async (uri: Uri, contents?: string): Promise<void> => {
    const affectedRoutes = await service.invalidate(uri, contents);
    if (affectedRoutes.size > 0) decorations.refreshVisible(affectedRoutes);
  };
  context.subscriptions.push(
    languages.registerDefinitionProvider(selector, provider),
    languages.registerHoverProvider(selector, provider),
    window.onDidChangeVisibleTextEditors(() => decorations.refreshVisible()),
    workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'php') decorations.refreshDocument(event.document);
    }),
    workspace.onDidSaveTextDocument((document) => {
      if (document.languageId === 'php') void invalidateAndRefresh(document.uri, document.getText());
    }),
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('laravel_jump_controller')) {
        service.clear();
        decorations.refreshVisible();
      }
    }),
    phpWatcher.onDidCreate(invalidateAndRefresh),
    phpWatcher.onDidChange(invalidateAndRefresh),
    phpWatcher.onDidDelete(invalidateAndRefresh),
    composerWatcher.onDidCreate(invalidateAndRefresh),
    composerWatcher.onDidChange(invalidateAndRefresh),
    composerWatcher.onDidDelete(invalidateAndRefresh),
    commands.registerCommand('laravelJumpController.refreshIndex', () => {
      service.clear();
      decorations.refreshVisible();
      void window.showInformationMessage('Laravel controller index refreshed.');
    }),
    phpWatcher,
    composerWatcher,
    decorations,
    service,
  );
  decorations.refreshVisible();
}

export function deactivate(): void {}

class LaravelNavigationProvider implements DefinitionProvider, HoverProvider {
  constructor(private readonly service: LaravelNavigationService) {}

  async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Definition | undefined> {
    const resolved = await this.service.resolveAt(document, position, token);
    return resolved ? new Location(resolved.uri, resolved.position) : undefined;
  }

  async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | undefined> {
    const resolved = await this.service.resolveAt(document, position, token);
    if (!resolved) return undefined;
    const relative = workspace.asRelativePath(resolved.uri, false);
    const markdown = new MarkdownString();
    markdown.appendMarkdown(`**Laravel controller**\n\n\`${relative}\``);
    if (resolved.target.method) markdown.appendMarkdown(` → \`${resolved.target.method}()\``);
    return new Hover(markdown, offsetRange(document, resolved.target.controllerRange));
  }

}

class LaravelDecorationManager implements Disposable {
  private readonly decoration: TextEditorDecorationType = window.createTextEditorDecorationType({
    textDecoration: 'underline',
    cursor: 'pointer',
  });
  private readonly requests = new Map<string, CancellationTokenSource>();

  constructor(private readonly service: LaravelNavigationService) {}

  refreshVisible(affectedRoutes?: ReadonlySet<string>): void {
    for (const editor of window.visibleTextEditors) {
      if (!affectedRoutes || affectedRoutes.has(editor.document.uri.toString())) this.refreshEditor(editor);
    }
  }

  refreshDocument(document: TextDocument): void {
    for (const editor of window.visibleTextEditors) {
      if (editor.document.uri.toString() === document.uri.toString()) this.refreshEditor(editor);
    }
  }

  dispose(): void {
    for (const request of this.requests.values()) {
      request.cancel();
      request.dispose();
    }
    this.requests.clear();
    this.decoration.dispose();
  }

  private refreshEditor(editor: TextEditor): void {
    if (editor.document.languageId !== 'php' || editor.document.uri.scheme !== 'file') return;
    const key = editor.document.uri.toString();
    const previous = this.requests.get(key);
    previous?.cancel();
    previous?.dispose();
    const request = new CancellationTokenSource();
    this.requests.set(key, request);
    void this.service.resolvedLinks(editor.document, request.token).then((links) => {
      if (request.token.isCancellationRequested || this.requests.get(key) !== request) return;
      editor.setDecorations(this.decoration, links.map((link) => offsetRange(editor.document, link.range)));
      this.requests.delete(key);
      request.dispose();
    }, () => {
      if (this.requests.get(key) === request) this.requests.delete(key);
      request.dispose();
    });
  }
}

interface ResolvedTarget { uri: Uri; position: Position; target: RouteTarget }
interface ResolvedLink {
  range: { start: number; end: number };
  resolved: ResolvedTarget;
}
interface ParsedDocument { text: string; targets: RouteTarget[] }
interface ResolvedDocument { text: string; links: TargetCache<ResolvedLink | undefined> }
interface ProjectInfo { root: Uri; composer: ComposerJson }
interface CachedFile { signature: string; contents: Promise<string | undefined> }
type SymbolKind = 'class' | 'method';
interface Dependency { route: string; link: string; className: string; method?: string; symbol: SymbolKind }

class LaravelNavigationService implements Disposable {
  private readonly parser = new LaravelRouteParser();
  private readonly documents = new Map<string, ParsedDocument>();
  private readonly resolvedDocuments = new Map<string, ResolvedDocument>();
  private readonly projects = new Map<string, Promise<ProjectInfo>>();
  private readonly fileContents = new Map<string, CachedFile>();
  private readonly controllerSnapshots = new Map<string, ControllerSnapshot | undefined>();
  private readonly controllerDependencies = new Map<string, Map<string, Dependency>>();
  private readonly linkControllers = new Map<string, Set<string>>();

  async resolveAt(document: TextDocument, position: Position, token: CancellationToken): Promise<ResolvedTarget | undefined> {
    const offset = document.offsetAt(position);
    const target = this.targets(document).find((candidate) => contains(candidate.controllerRange, offset) || (candidate.methodRange && contains(candidate.methodRange, offset)));
    if (!target || token.isCancellationRequested) return undefined;
    const symbol: SymbolKind = target.methodRange && contains(target.methodRange, offset) ? 'method' : 'class';
    return this.resolveTarget(document, target, symbol, token);
  }

  async resolvedLinks(document: TextDocument, token: CancellationToken): Promise<ResolvedLink[]> {
    const key = document.uri.toString();
    const text = document.getText();
    let cached = this.resolvedDocuments.get(key);
    if (!cached || cached.text !== text) {
      this.clearRouteDependencies(key);
      cached = { text, links: new TargetCache() };
      this.resolvedDocuments.set(key, cached);
    }
    const links = await this.computeResolvedLinks(document, cached);
    return token.isCancellationRequested ? [] : links;
  }

  private async computeResolvedLinks(document: TextDocument, cached: ResolvedDocument): Promise<ResolvedLink[]> {
    const route = document.uri.toString();
    const pending = this.targets(document).flatMap((target) => {
      const methodOnly = target.methodRange && sameRange(target.controllerRange, target.methodRange);
      const requests: Array<Promise<ResolvedLink | undefined>> = [];
      if (!methodOnly) {
        requests.push(this.cachedLink(cached, document, target, 'class', target.controllerRange));
      }
      if (target.methodRange) {
        requests.push(this.cachedLink(cached, document, target, 'method', target.methodRange));
      } else if (methodOnly) {
        requests.push(this.cachedLink(cached, document, target, 'class', target.controllerRange));
      }
      return requests;
    });
    const links = await Promise.all(pending);
    if (this.resolvedDocuments.get(route) !== cached) return [];
    return links.filter((link): link is ResolvedLink => link !== undefined);
  }

  private cachedLink(
    cached: ResolvedDocument,
    document: TextDocument,
    target: RouteTarget,
    symbol: SymbolKind,
    range: { start: number; end: number },
  ): Promise<ResolvedLink | undefined> {
    const key = linkKey(symbol, range);
    return cached.links.resolve(key, () => this.resolveLink(document, target, symbol, range, key));
  }

  private async resolveLink(
    document: TextDocument,
    target: RouteTarget,
    symbol: SymbolKind,
    range: { start: number; end: number },
    link: string,
    token?: CancellationToken,
  ): Promise<ResolvedLink | undefined> {
    const resolved = await this.resolveTarget(document, target, symbol, token, link);
    return resolved ? { range, resolved } : undefined;
  }

  private async resolveTarget(
    document: TextDocument,
    target: RouteTarget,
    symbol: SymbolKind,
    token?: CancellationToken,
    link?: string,
  ): Promise<ResolvedTarget | undefined> {

    const project = await this.projectFor(document.uri);
    if (!project || token?.isCancellationRequested) return undefined;
    const configuration = workspace.getConfiguration('laravel_jump_controller', document.uri);
    const controllerPath = configuration.get<string>('pathController', 'app/Http/Controllers');
    const controllerNamespace = configuration.get<string>('pathNamespace', 'App\\Http\\Controllers');
    let currentClass: string | undefined = target.controller;
    const visited = new Set<string>();
    while (currentClass && !visited.has(currentClass.toLowerCase())) {
      visited.add(currentClass.toLowerCase());
      let parent: string | undefined;
      let foundClass = false;
      for (const candidate of classPathCandidates(currentClass, project.composer, controllerNamespace, controllerPath)) {
        const uri = Uri.joinPath(project.root, ...candidate.relativePath.split('/'));
        if (link) this.trackDependency(uri.toString(), {
          route: document.uri.toString(), link, className: currentClass, method: target.method, symbol,
        });
        if (!(await exists(uri))) continue;
        const contents = await this.readText(uri);
        if (contents === undefined) continue;
        if (link && !this.controllerSnapshots.has(uri.toString())) {
          this.controllerSnapshots.set(uri.toString(), controllerSnapshot(contents));
        }
        const className = currentClass.split('\\').at(-1);
        const classOffset = locateClass(contents, className);
        if (classOffset === undefined) continue;
        foundClass = true;
        if (symbol === 'class') return { uri, position: positionAt(contents, classOffset), target };
        const methodOffset = target.method ? locateMethod(contents, target.method, className) : undefined;
        if (methodOffset !== undefined) return { uri, position: positionAt(contents, methodOffset), target };
        parent = parentClassName(contents, className ?? '');
        break;
      }
      if (!foundClass || !parent) return undefined;
      currentClass = parent;
    }
    return undefined;
  }

  async invalidate(uri: Uri, contents?: string): Promise<ReadonlySet<string>> {
    const key = uri.toString();
    const isKnownRoute = (this.documents.get(key)?.targets.length ?? 0) > 0;
    const previousContents = this.fileContents.get(key)?.contents;
    this.fileContents.delete(key);
    if (uri.path.endsWith('/composer.json')) {
      this.clear();
      return new Set([...window.visibleTextEditors].map((editor) => editor.document.uri.toString()));
    }
    if (isKnownRoute) {
      this.documents.delete(key);
      this.resolvedDocuments.delete(key);
      this.clearRouteDependencies(key);
      return new Set([key]);
    }
    const oldSnapshot = this.controllerSnapshots.get(key)
      ?? controllerSnapshot((await previousContents) ?? '');
    const nextContents = contents ?? await readWorkspaceText(uri);
    const nextSnapshot = nextContents === undefined ? undefined : controllerSnapshot(nextContents);
    this.controllerSnapshots.set(key, nextSnapshot);
    const affectedRoutes = new Set<string>();
    for (const dependency of [...(this.controllerDependencies.get(key)?.values() ?? [])]) {
      const method = dependency.symbol === 'method' ? dependency.method : undefined;
      if (!controllerSymbolChanged(oldSnapshot, nextSnapshot, dependency.className, method)) continue;
      const cached = this.resolvedDocuments.get(dependency.route);
      cached?.links.invalidate(dependency.link);
      this.clearLinkDependencies(dependency.route, dependency.link);
      affectedRoutes.add(dependency.route);
    }
    return affectedRoutes;
  }

  clear(): void {
    this.documents.clear();
    this.resolvedDocuments.clear();
    this.projects.clear();
    this.fileContents.clear();
    this.controllerSnapshots.clear();
    this.controllerDependencies.clear();
    this.linkControllers.clear();
  }

  dispose(): void { this.clear(); }

  private targets(document: TextDocument): RouteTarget[] {
    const key = document.uri.toString();
    const text = document.getText();
    const cached = this.documents.get(key);
    if (cached?.text === text) return cached.targets;
    const targets = this.parser.parse(text, document.fileName).targets;
    this.documents.set(key, { text, targets });
    return targets;
  }

  private async readText(uri: Uri): Promise<string | undefined> {
    const key = uri.toString();
    let stat;
    try {
      stat = await workspace.fs.stat(uri);
    } catch {
      return undefined;
    }
    const signature = `${stat.mtime}:${stat.size}`;
    let cached = this.fileContents.get(key);
    if (!cached || cached.signature !== signature) {
      const contents = Promise.resolve(workspace.fs.readFile(uri))
        .then((contents) => new TextDecoder().decode(contents), () => undefined);
      cached = { signature, contents };
      this.fileContents.set(key, cached);
    }
    return cached.contents;
  }

  private trackDependency(controller: string, dependency: Dependency): void {
    const reference = dependencyKey(dependency.route, dependency.link);
    let dependencies = this.controllerDependencies.get(controller);
    if (!dependencies) this.controllerDependencies.set(controller, dependencies = new Map());
    dependencies.set(reference, dependency);
    let controllers = this.linkControllers.get(reference);
    if (!controllers) this.linkControllers.set(reference, controllers = new Set());
    controllers.add(controller);
  }

  private clearRouteDependencies(route: string): void {
    for (const reference of [...this.linkControllers.keys()]) {
      if (reference.startsWith(`${route}\0`)) this.clearLinkDependencies(route, reference.slice(route.length + 1));
    }
  }

  private clearLinkDependencies(route: string, link: string): void {
    const reference = dependencyKey(route, link);
    const controllers = this.linkControllers.get(reference);
    for (const controller of controllers ?? []) {
      const dependencies = this.controllerDependencies.get(controller);
      dependencies?.delete(reference);
      if (dependencies?.size === 0) this.controllerDependencies.delete(controller);
    }
    this.linkControllers.delete(reference);
  }

  private async projectFor(document: Uri): Promise<ProjectInfo | undefined> {
    const folder = workspace.getWorkspaceFolder(document);
    if (!folder) return undefined;
    const key = `${folder.uri.toString()}|${document.toString()}`;
    let pending = this.projects.get(key);
    if (!pending) {
      pending = findProject(document, folder.uri);
      this.projects.set(key, pending);
    }
    return pending;
  }
}

async function findProject(document: Uri, workspaceRoot: Uri): Promise<ProjectInfo> {
  let directory = Uri.joinPath(document, '..');
  while (directory.path.length >= workspaceRoot.path.length) {
    const composerUri = Uri.joinPath(directory, 'composer.json');
    if (await exists(composerUri)) {
      try {
        const contents = new TextDecoder().decode(await workspace.fs.readFile(composerUri));
        return { root: directory, composer: parseComposerJson(contents) };
      } catch {
        return { root: directory, composer: {} };
      }
    }
    if (directory.path === workspaceRoot.path) break;
    const parent = Uri.joinPath(directory, '..');
    if (parent.path === directory.path) break;
    directory = parent;
  }
  return { root: workspaceRoot, composer: {} };
}

async function exists(uri: Uri): Promise<boolean> {
  try {
    await workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function readWorkspaceText(uri: Uri): Promise<string | undefined> {
  try {
    return new TextDecoder().decode(await workspace.fs.readFile(uri));
  } catch {
    return undefined;
  }
}

function linkKey(symbol: SymbolKind, range: { start: number; end: number }): string {
  return `${symbol}:${range.start}:${range.end}`;
}

function dependencyKey(route: string, link: string): string {
  return `${route}\0${link}`;
}

function contains(range: { start: number; end: number }, offset: number): boolean {
  return offset >= range.start && offset < range.end;
}

function sameRange(left: { start: number; end: number }, right: { start: number; end: number }): boolean {
  return left.start === right.start && left.end === right.end;
}

function offsetRange(document: TextDocument, range: { start: number; end: number }): Range {
  return new Range(document.positionAt(range.start), document.positionAt(range.end));
}

function positionAt(source: string, offset: number): Position {
  const before = source.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return new Position(lines.length - 1, lines.at(-1)?.length ?? 0);
}
