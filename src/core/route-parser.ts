import type { OffsetRange, ParseResult, RouteTarget } from './types';

const PhpParser: new (options: unknown) => { parseCode(source: string, filename: string): unknown } = require('php-parser');

interface PositionLike { offset: number }
interface LocationLike { start: PositionLike; end: PositionLike }
interface PhpNode {
  kind: string;
  loc?: LocationLike;
  [key: string]: unknown;
}

const ROUTE_METHODS = new Set([
  'get', 'post', 'put', 'patch', 'delete', 'options', 'any', 'match',
  'resource', 'apiResource', 'singleton', 'apiSingleton',
]);
const RESOURCE_METHODS = new Set(['resource', 'apiResource', 'singleton', 'apiSingleton']);

export class LaravelRouteParser {
  private readonly parser = new PhpParser({
    parser: { extractDoc: true, suppressErrors: true },
    ast: { withPositions: true },
  });

  parse(source: string, filename = 'routes.php'): ParseResult {
    let program: PhpNode;
    try {
      program = this.parser.parseCode(source, filename) as unknown as PhpNode;
    } catch (error) {
      return { targets: [], errors: [error instanceof Error ? error.message : String(error)] };
    }

    const aliases = collectAliases(program);
    const targets: RouteTarget[] = [];
    visit(program, undefined, aliases, targets);
    const parseErrors = Array.isArray(program.errors)
      ? program.errors.map((error) => String(error))
      : [];
    return { targets, errors: parseErrors };
  }
}

function visit(
  node: unknown,
  groupController: string | undefined,
  aliases: ReadonlyMap<string, string>,
  targets: RouteTarget[],
): void {
  if (!isNode(node)) return;

  if (node.kind === 'call') {
    const group = parseControllerGroup(node, aliases);
    if (group) {
      visit(group.body, group.controller, aliases, targets);
      return;
    }

    const routeCall = getStaticRouteCall(node, aliases);
    if (routeCall && ROUTE_METHODS.has(routeCall.method)) {
      const target = parseRouteTarget(node, routeCall.method, groupController, aliases);
      if (target) targets.push(target);
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'errors' || key === 'comments') continue;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, groupController, aliases, targets);
    } else {
      visit(value, groupController, aliases, targets);
    }
  }
}

function parseRouteTarget(
  call: PhpNode,
  method: string,
  groupController: string | undefined,
  aliases: ReadonlyMap<string, string>,
): RouteTarget | undefined {
  const args = nodeArray(call.arguments);
  const actionIndex = method === 'match' ? 2 : 1;
  const action = args[actionIndex];
  if (!action) return undefined;

  if (RESOURCE_METHODS.has(method)) {
    const classTarget = classConstantTarget(action, aliases);
    if (!classTarget) return undefined;
    return { controller: classTarget.name, kind: 'resource', controllerRange: classTarget.range };
  }

  if (action.kind === 'array') {
    const items = nodeArray(action.items).map((item) => isNode(item.value) ? item.value : item);
    const classTarget = items[0] ? classConstantTarget(items[0], aliases) : undefined;
    const actionMethod = items[1] ? stringTarget(items[1]) : undefined;
    if (!classTarget || !actionMethod) return undefined;
    return {
      controller: classTarget.name,
      method: actionMethod.value,
      kind: 'action',
      controllerRange: classTarget.range,
      methodRange: actionMethod.range,
    };
  }

  const classTarget = classConstantTarget(action, aliases);
  if (classTarget) {
    return {
      controller: classTarget.name,
      method: '__invoke',
      kind: 'invokable',
      controllerRange: classTarget.range,
    };
  }

  const string = stringTarget(action);
  if (!string) return undefined;
  if (groupController && !string.value.includes('@') && !string.value.includes('::')) {
    return {
      controller: groupController,
      method: string.value,
      kind: 'action',
      controllerRange: string.range,
      methodRange: string.range,
    };
  }

  const separator = string.value.includes('@') ? '@' : string.value.includes('::') ? '::' : undefined;
  if (!separator) return undefined;
  const splitAt = string.value.lastIndexOf(separator);
  const controller = resolveName(string.value.slice(0, splitAt), aliases);
  const actionMethod = string.value.slice(splitAt + separator.length);
  const valueStart = string.range.start;
  return {
    controller,
    method: actionMethod,
    kind: 'action',
    controllerRange: { start: valueStart, end: valueStart + splitAt },
    methodRange: {
      start: valueStart + splitAt + separator.length,
      end: string.range.end,
    },
  };
}

function parseControllerGroup(
  call: PhpNode,
  aliases: ReadonlyMap<string, string>,
): { controller: string; body: PhpNode } | undefined {
  const what = isNode(call.what) ? call.what : undefined;
  if (!what || what.kind !== 'propertylookup' || identifierName(what.offset) !== 'group') return undefined;
  const closure = nodeArray(call.arguments).find((argument) => argument.kind === 'closure');
  if (!closure || !isNode(closure.body)) return undefined;

  const controllerCall = findControllerCall(what.what, aliases);
  if (controllerCall) {
    const argument = nodeArray(controllerCall.arguments)[0];
    const target = argument ? classConstantTarget(argument, aliases) : undefined;
    if (target) return { controller: target.name, body: closure.body };
  }
  return undefined;
}

function findControllerCall(value: unknown, aliases: ReadonlyMap<string, string>): PhpNode | undefined {
  if (!isNode(value)) return undefined;
  if (value.kind === 'call' && getStaticRouteCall(value, aliases)?.method === 'controller') return value;
  if (value.kind === 'call' && isNode(value.what) && value.what.kind === 'propertylookup' && identifierName(value.what.offset) === 'controller') return value;
  if (value.kind === 'call') return findControllerCall(value.what, aliases);
  if (value.kind === 'propertylookup') return findControllerCall(value.what, aliases);
  return undefined;
}

function getStaticRouteCall(call: PhpNode, aliases: ReadonlyMap<string, string>): { method: string } | undefined {
  if (call.kind !== 'call' || !isNode(call.what) || call.what.kind !== 'staticlookup') return undefined;
  const lookup = call.what;
  if (!isNode(lookup.what) || lookup.what.kind !== 'name') return undefined;
  const facade = typeof lookup.what.name === 'string' ? lookup.what.name : '';
  const resolvedFacade = resolveName(facade, aliases);
  if (resolvedFacade !== 'Route' && resolvedFacade !== 'Illuminate\\Support\\Facades\\Route') return undefined;
  const method = identifierName(lookup.offset);
  return method ? { method } : undefined;
}

function classConstantTarget(
  node: PhpNode,
  aliases: ReadonlyMap<string, string>,
): { name: string; range: OffsetRange } | undefined {
  if (node.kind !== 'staticlookup' || identifierName(node.offset) !== 'class' || !isNode(node.what)) return undefined;
  const nameNode = node.what;
  if (nameNode.kind !== 'name' || typeof nameNode.name !== 'string' || !nameNode.loc) return undefined;
  return { name: resolveName(nameNode.name, aliases), range: rangeOf(nameNode.loc) };
}

function stringTarget(node: PhpNode): { value: string; range: OffsetRange } | undefined {
  if (node.kind !== 'string' || typeof node.value !== 'string' || !node.loc) return undefined;
  return {
    value: node.value,
    range: { start: node.loc.start.offset + 1, end: node.loc.end.offset - 1 },
  };
}

function collectAliases(program: PhpNode): Map<string, string> {
  const aliases = new Map<string, string>();
  collect(program);
  return aliases;

  function collect(node: PhpNode): void {
    if (node.kind === 'usegroup' && (node.type === null || node.type === undefined || node.type === 'class')) {
      const prefix = typeof node.name === 'string' ? `${node.name}\\` : '';
      for (const item of nodeArray(node.items)) {
        if (item.type !== null && item.type !== undefined && item.type !== 'class') continue;
        if (typeof item.name !== 'string') continue;
        const fullName = `${prefix}${item.name}`;
        const alias = isNode(item.alias) ? identifierName(item.alias) : undefined;
        const fallback = fullName.split('\\').pop();
        if (alias ?? fallback) aliases.set((alias ?? fallback)!, fullName);
      }
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'comments' || key === 'errors') continue;
      if (Array.isArray(value)) {
        for (const child of value) if (isNode(child)) collect(child);
      } else if (isNode(value)) {
        collect(value);
      }
    }
  }
}

function resolveName(name: string, aliases: ReadonlyMap<string, string>): string {
  const normalized = name.replace(/^\\/, '');
  const [head, ...tail] = normalized.split('\\');
  if (!head) return normalized;
  const imported = aliases.get(head);
  return imported ? [imported, ...tail].join('\\') : normalized;
}

function rangeOf(location: LocationLike): OffsetRange {
  return { start: location.start.offset, end: location.end.offset };
}

function identifierName(value: unknown): string | undefined {
  return isNode(value) && typeof value.name === 'string' ? value.name : undefined;
}

function nodeArray(value: unknown): PhpNode[] {
  return Array.isArray(value) ? value.filter(isNode) : [];
}

function isNode(value: unknown): value is PhpNode {
  return typeof value === 'object' && value !== null && typeof (value as { kind?: unknown }).kind === 'string';
}
