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
import { locateClass, locateMethod } from './core/method-locator';

const selector = { scheme: 'file', language: 'php' };

export function activate(context: ExtensionContext): void {
  const service = new LaravelNavigationService();
  const provider = new LaravelNavigationProvider(service);
  const decorations = new LaravelDecorationManager(service);
  const phpWatcher = workspace.createFileSystemWatcher('**/*.php');
  const composerWatcher = workspace.createFileSystemWatcher('**/composer.json');
  const invalidateAndRefresh = (uri: Uri): void => {
    const affectedRoutes = service.invalidate(uri);
    decorations.refreshVisible(affectedRoutes);
  };
  context.subscriptions.push(
    languages.registerDefinitionProvider(selector, provider),
    languages.registerHoverProvider(selector, provider),
    window.onDidChangeVisibleTextEditors(() => decorations.refreshVisible()),
    workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'php') decorations.refreshDocument(event.document);
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
interface ResolvedDocument { text: string; links: Promise<ResolvedLink[]> }
interface ProjectInfo { root: Uri; composer: ComposerJson }
type SymbolKind = 'class' | 'method';

class LaravelNavigationService implements Disposable {
  private readonly parser = new LaravelRouteParser();
  private readonly documents = new Map<string, ParsedDocument>();
  private readonly resolvedDocuments = new Map<string, ResolvedDocument>();
  private readonly projects = new Map<string, Promise<ProjectInfo>>();
  private readonly fileContents = new Map<string, Promise<string | undefined>>();
  private readonly controllerRoutes = new Map<string, Set<string>>();
  private readonly routeControllers = new Map<string, Set<string>>();

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
      const links = this.computeResolvedLinks(document);
      cached = { text, links };
      this.resolvedDocuments.set(key, cached);
      void links.catch(() => {
        if (this.resolvedDocuments.get(key)?.links === links) this.resolvedDocuments.delete(key);
      });
    }
    const links = await cached.links;
    return token.isCancellationRequested ? [] : links;
  }

  private async computeResolvedLinks(document: TextDocument): Promise<ResolvedLink[]> {
    this.clearRouteDependencies(document.uri.toString());
    const pending = this.targets(document).flatMap((target) => {
      const methodOnly = target.methodRange && sameRange(target.controllerRange, target.methodRange);
      const requests: Array<Promise<ResolvedLink | undefined>> = [];
      if (!methodOnly) {
        requests.push(this.resolveLink(document, target, 'class', target.controllerRange));
      }
      if (target.methodRange) {
        requests.push(this.resolveLink(document, target, 'method', target.methodRange));
      } else if (methodOnly) {
        requests.push(this.resolveLink(document, target, 'class', target.controllerRange));
      }
      return requests;
    });
    const links = await Promise.all(pending);
    return links.filter((link): link is ResolvedLink => link !== undefined);
  }

  private async resolveLink(
    document: TextDocument,
    target: RouteTarget,
    symbol: SymbolKind,
    range: { start: number; end: number },
    token?: CancellationToken,
  ): Promise<ResolvedLink | undefined> {
    const resolved = await this.resolveTarget(document, target, symbol, token);
    return resolved ? { range, resolved } : undefined;
  }

  private async resolveTarget(
    document: TextDocument,
    target: RouteTarget,
    symbol: SymbolKind,
    token?: CancellationToken,
  ): Promise<ResolvedTarget | undefined> {

    const project = await this.projectFor(document.uri);
    if (!project || token?.isCancellationRequested) return undefined;
    const configuration = workspace.getConfiguration('laravel_jump_controller', document.uri);
    const controllerPath = configuration.get<string>('pathController', 'app/Http/Controllers');
    const controllerNamespace = configuration.get<string>('pathNamespace', 'App\\Http\\Controllers');

    for (const candidate of classPathCandidates(target.controller, project.composer, controllerNamespace, controllerPath)) {
      const uri = Uri.joinPath(project.root, ...candidate.relativePath.split('/'));
      this.trackDependency(document.uri.toString(), uri.toString());
      if (!(await exists(uri))) continue;
      const contents = await this.readText(uri);
      if (contents === undefined) continue;
      const className = target.controller.split('\\').at(-1);
      const classOffset = locateClass(contents, className);
      if (classOffset === undefined) continue;
      const targetOffset = symbol === 'method'
        ? target.method ? locateMethod(contents, target.method, className) : undefined
        : classOffset;
      if (targetOffset === undefined) continue;
      const position = positionAt(contents, targetOffset);
      return { uri, position, target };
    }
    return undefined;
  }

  invalidate(uri: Uri): ReadonlySet<string> | undefined {
    const key = uri.toString();
    const isKnownRoute = this.documents.has(key);
    this.documents.delete(key);
    this.resolvedDocuments.delete(key);
    this.fileContents.delete(key);
    if (uri.path.endsWith('/composer.json')) {
      this.projects.clear();
      this.resolvedDocuments.clear();
      return undefined;
    }
    const affectedRoutes = new Set(this.controllerRoutes.get(key) ?? []);
    if (isKnownRoute) {
      affectedRoutes.add(key);
      this.clearRouteDependencies(key);
    }
    for (const route of affectedRoutes) this.resolvedDocuments.delete(route);
    return affectedRoutes;
  }

  clear(): void {
    this.documents.clear();
    this.resolvedDocuments.clear();
    this.projects.clear();
    this.fileContents.clear();
    this.controllerRoutes.clear();
    this.routeControllers.clear();
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

  private readText(uri: Uri): Promise<string | undefined> {
    const key = uri.toString();
    let pending = this.fileContents.get(key);
    if (!pending) {
      pending = Promise.resolve(workspace.fs.readFile(uri))
        .then((contents) => new TextDecoder().decode(contents), () => undefined);
      this.fileContents.set(key, pending);
    }
    return pending;
  }

  private trackDependency(route: string, controller: string): void {
    let controllers = this.routeControllers.get(route);
    if (!controllers) this.routeControllers.set(route, controllers = new Set());
    controllers.add(controller);
    let routes = this.controllerRoutes.get(controller);
    if (!routes) this.controllerRoutes.set(controller, routes = new Set());
    routes.add(route);
  }

  private clearRouteDependencies(route: string): void {
    const controllers = this.routeControllers.get(route);
    if (!controllers) return;
    for (const controller of controllers) {
      const routes = this.controllerRoutes.get(controller);
      routes?.delete(route);
      if (routes?.size === 0) this.controllerRoutes.delete(controller);
    }
    this.routeControllers.delete(route);
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
