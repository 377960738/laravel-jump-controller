const PhpParser: new (options: unknown) => { parseCode(source: string, filename: string): unknown } = require('php-parser');

interface NodeLike {
  kind: string;
  name?: string | { name?: string; loc?: LocationLike };
  loc?: LocationLike;
  [key: string]: unknown;
}
interface LocationLike { start: { offset: number }; end: { offset: number } }

const parser = new PhpParser({ parser: { suppressErrors: true }, ast: { withPositions: true } });

export function locateMethod(source: string, method: string, className?: string): number | undefined {
  let ast: unknown;
  try {
    ast = parser.parseCode(source, 'controller.php');
  } catch {
    return undefined;
  }
  const scope = className ? findClassNode(ast, className) : undefined;
  return findMethod(scope ?? ast, method.toLowerCase());
}

export function locateClass(source: string, className?: string): number | undefined {
  let ast: unknown;
  try {
    ast = parser.parseCode(source, 'controller.php');
  } catch {
    return undefined;
  }
  const classNode = className ? findClassNode(ast, className) : findClassNode(ast);
  return classNode ? nameOffset(classNode) : undefined;
}

export function parentClassName(source: string, className: string): string | undefined {
  let ast: unknown;
  try {
    ast = parser.parseCode(source, 'controller.php');
  } catch {
    return undefined;
  }
  const classNode = findClassNode(ast, className);
  if (!classNode) return undefined;
  const parent = classNode && isNode(classNode.extends) && typeof classNode.extends.name === 'string'
    ? classNode.extends.name
    : undefined;
  if (!parent) return undefined;
  const normalized = parent.replace(/^\\/, '');
  if (parent.startsWith('\\')) return normalized;
  const aliases = collectClassAliases(ast);
  const [head, ...tail] = normalized.split('\\');
  const imported = head ? aliases.get(head.toLowerCase()) : undefined;
  if (imported) return [imported, ...tail].join('\\');
  const namespace = containingNamespace(ast, classNode);
  if (normalized.toLowerCase().startsWith('namespace\\')) {
    return [namespace, normalized.slice('namespace\\'.length)].filter(Boolean).join('\\');
  }
  return [namespace, normalized].filter(Boolean).join('\\');
}

function findMethod(value: unknown, method: string): number | undefined {
  if (!isNode(value)) return undefined;
  if (value.kind === 'method') {
    const name = typeof value.name === 'string' ? value.name : value.name?.name;
    if (name?.toLowerCase() === method) {
      if (typeof value.name === 'object' && value.name.loc) return value.name.loc.start.offset;
      return value.loc?.start.offset;
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'loc') continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findMethod(item, method);
        if (found !== undefined) return found;
      }
    } else {
      const found = findMethod(child, method);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function findClassNode(value: unknown, expectedName?: string): NodeLike | undefined {
  if (!isNode(value)) return undefined;
  if (value.kind === 'class') {
    const actualName = typeof value.name === 'string' ? value.name : value.name?.name;
    if (!expectedName || actualName?.toLowerCase() === expectedName.toLowerCase()) return value;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'loc') continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findClassNode(item, expectedName);
        if (found !== undefined) return found;
      }
    } else {
      const found = findClassNode(child, expectedName);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function nameOffset(node: NodeLike): number | undefined {
  if (typeof node.name === 'object' && node.name.loc) return node.name.loc.start.offset;
  return node.loc?.start.offset;
}

function collectClassAliases(value: unknown, aliases = new Map<string, string>()): Map<string, string> {
  if (!isNode(value)) return aliases;
  if (value.kind === 'usegroup' && (value.type === null || value.type === undefined || value.type === 'class')) {
    const prefix = typeof value.name === 'string' ? `${value.name}\\` : '';
    const items = Array.isArray(value.items) ? value.items : [];
    for (const item of items) {
      if (!isNode(item) || typeof item.name !== 'string') continue;
      if (item.type !== null && item.type !== undefined && item.type !== 'class') continue;
      const fullName = `${prefix}${item.name}`;
      const alias = isNode(item.alias) && typeof item.alias.name === 'string'
        ? item.alias.name
        : fullName.split('\\').at(-1);
      if (alias) aliases.set(alias.toLowerCase(), fullName);
    }
    return aliases;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'loc') continue;
    if (Array.isArray(child)) {
      for (const item of child) collectClassAliases(item, aliases);
    } else {
      collectClassAliases(child, aliases);
    }
  }
  return aliases;
}

function containingNamespace(value: unknown, target: NodeLike): string | undefined {
  if (!isNode(value)) return undefined;
  if (value.kind === 'namespace' && containsNode(value, target)) {
    return typeof value.name === 'string' ? value.name : undefined;
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = containingNamespace(item, target);
        if (found !== undefined) return found;
      }
    } else {
      const found = containingNamespace(child, target);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function containsNode(value: unknown, target: NodeLike): boolean {
  if (value === target) return true;
  if (!isNode(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'loc') continue;
    if (Array.isArray(child)) {
      if (child.some((item) => containsNode(item, target))) return true;
    } else if (containsNode(child, target)) {
      return true;
    }
  }
  return false;
}

function isNode(value: unknown): value is NodeLike {
  return typeof value === 'object' && value !== null && typeof (value as { kind?: unknown }).kind === 'string';
}
