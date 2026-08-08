export type Psr4Value = string | string[];

export interface ComposerJson {
  autoload?: { 'psr-4'?: Record<string, Psr4Value> };
  'autoload-dev'?: { 'psr-4'?: Record<string, Psr4Value> };
}

export interface ClassPathCandidate {
  relativePath: string;
  source: 'composer' | 'configuration';
}

export function parseComposerJson(contents: string): ComposerJson {
  const parsed: unknown = JSON.parse(contents);
  return typeof parsed === 'object' && parsed !== null ? parsed as ComposerJson : {};
}

export function psr4Mappings(composer: ComposerJson): Array<[string, string]> {
  const entries = [
    ...Object.entries(composer.autoload?.['psr-4'] ?? {}),
    ...Object.entries(composer['autoload-dev']?.['psr-4'] ?? {}),
  ];
  return entries
    .flatMap(([prefix, values]) => (Array.isArray(values) ? values : [values]).map((value) => [prefix, value] as [string, string]))
    .sort(([left], [right]) => right.length - left.length);
}

export function classPathCandidates(
  className: string,
  composer: ComposerJson,
  controllerNamespace: string,
  controllerPath: string,
): ClassPathCandidate[] {
  const normalized = className.replace(/^\\/, '');
  const candidates: ClassPathCandidate[] = [];
  for (const [prefix, directory] of psr4Mappings(composer)) {
    const normalizedPrefix = prefix.replace(/^\\/, '');
    if (!normalized.startsWith(normalizedPrefix)) continue;
    const suffix = normalized.slice(normalizedPrefix.length).replace(/\\/g, '/');
    candidates.push({ relativePath: join(directory, `${suffix}.php`), source: 'composer' });
  }

  const namespace = controllerNamespace.replace(/^\\|\\$/g, '');
  if (normalized === namespace || normalized.startsWith(`${namespace}\\`)) {
    const suffix = normalized.slice(namespace.length).replace(/^\\/, '').replace(/\\/g, '/');
    candidates.push({ relativePath: join(controllerPath, `${suffix}.php`), source: 'configuration' });
  } else if (!normalized.includes('\\')) {
    candidates.push({ relativePath: join(controllerPath, `${normalized}.php`), source: 'configuration' });
  } else if (candidates.length === 0) {
    // Laravel <= 8 commonly used controller names relative to the configured
    // controller namespace, for example "Admin\\UserController@show".
    candidates.push({ relativePath: join(controllerPath, `${normalized.replace(/\\/g, '/')}.php`), source: 'configuration' });
  }

  return deduplicate(candidates);
}

function join(left: string, right: string): string {
  return `${left.replace(/[\\/]+$/, '')}/${right.replace(/^[\\/]+/, '')}`.replace(/\\/g, '/');
}

function deduplicate(candidates: ClassPathCandidate[]): ClassPathCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.relativePath)) return false;
    seen.add(candidate.relativePath);
    return true;
  });
}
