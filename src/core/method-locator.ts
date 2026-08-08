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

function isNode(value: unknown): value is NodeLike {
  return typeof value === 'object' && value !== null && typeof (value as { kind?: unknown }).kind === 'string';
}
