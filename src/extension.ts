import {
  CancellationToken,
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
  context.subscriptions.push(
    languages.registerDefinitionProvider(selector, provider),
    languages.registerHoverProvider(selector, provider),
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('laravel_jump_controller')) service.clear();
    }),
    workspace.onDidSaveTextDocument((document) => service.invalidate(document.uri)),
    commands.registerCommand('laravelJumpController.refreshIndex', () => {
      service.clear();
      void window.showInformationMessage('Laravel controller index refreshed.');
    }),
    service,
  );
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

interface ResolvedTarget { uri: Uri; position: Position; target: RouteTarget }
interface ParsedDocument { version: number; targets: RouteTarget[] }
interface ProjectInfo { root: Uri; composer: ComposerJson }

class LaravelNavigationService implements Disposable {
  private readonly parser = new LaravelRouteParser();
  private readonly documents = new Map<string, ParsedDocument>();
  private readonly projects = new Map<string, Promise<ProjectInfo>>();

  async resolveAt(document: TextDocument, position: Position, token: CancellationToken): Promise<ResolvedTarget | undefined> {
    const offset = document.offsetAt(position);
    const target = this.targets(document).find((candidate) => contains(candidate.controllerRange, offset) || (candidate.methodRange && contains(candidate.methodRange, offset)));
    if (!target || token.isCancellationRequested) return undefined;

    const project = await this.projectFor(document.uri);
    if (!project || token.isCancellationRequested) return undefined;
    const configuration = workspace.getConfiguration('laravel_jump_controller', document.uri);
    const controllerPath = configuration.get<string>('pathController', 'app/Http/Controllers');
    const controllerNamespace = configuration.get<string>('pathNamespace', 'App\\Http\\Controllers');

    for (const candidate of classPathCandidates(target.controller, project.composer, controllerNamespace, controllerPath)) {
      const uri = Uri.joinPath(project.root, ...candidate.relativePath.split('/'));
      if (!(await exists(uri))) continue;
      const contents = new TextDecoder().decode(await workspace.fs.readFile(uri));
      const className = target.controller.split('\\').at(-1);
      const onMethod = target.methodRange ? contains(target.methodRange, offset) : false;
      const targetOffset = onMethod && target.method
        ? locateMethod(contents, target.method, className)
        : locateClass(contents, className);
      const position = targetOffset === undefined ? new Position(0, 0) : positionAt(contents, targetOffset);
      return { uri, position, target };
    }
    return undefined;
  }

  invalidate(uri: Uri): void {
    this.documents.delete(uri.toString());
    if (uri.path.endsWith('/composer.json')) this.projects.clear();
  }

  clear(): void {
    this.documents.clear();
    this.projects.clear();
  }

  dispose(): void { this.clear(); }

  private targets(document: TextDocument): RouteTarget[] {
    const key = document.uri.toString();
    const cached = this.documents.get(key);
    if (cached?.version === document.version) return cached.targets;
    const targets = this.parser.parse(document.getText(), document.fileName).targets;
    this.documents.set(key, { version: document.version, targets });
    return targets;
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

function offsetRange(document: TextDocument, range: { start: number; end: number }): Range {
  return new Range(document.positionAt(range.start), document.positionAt(range.end));
}

function positionAt(source: string, offset: number): Position {
  const before = source.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return new Position(lines.length - 1, lines.at(-1)?.length ?? 0);
}
