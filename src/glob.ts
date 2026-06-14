const escapeRegExp = (value: string): string => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');

const normalizePath = (value: string): string => value.replace(/\\/g, '/').replace(/^\.\/+/, '');

const globToRegExp = (pattern: string): RegExp => {
  const normalized = normalizePath(pattern.trim()).replace(/^\/+/, '');
  let source = '';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '*') {
      const next = normalized[index + 1];

      if (next === '*') {
        source += '.*';
        index += 1;
        continue;
      }

      source += '[^/]*';
      continue;
    }

    source += escapeRegExp(char ?? '');
  }

  return new RegExp(`^${source}$`);
};

export const matchesGlob = (filePath: string, pattern: string): boolean => {
  const normalizedPath = normalizePath(filePath);
  const normalizedPattern = normalizePath(pattern.trim());

  if (normalizedPattern.length === 0) {
    return false;
  }

  if (!normalizedPattern.includes('/')) {
    const basename = normalizedPath.split('/').at(-1) ?? normalizedPath;
    return globToRegExp(normalizedPattern).test(basename);
  }

  const directoryPattern = normalizedPattern.endsWith('/') ? `${normalizedPattern}**` : normalizedPattern;
  return globToRegExp(directoryPattern).test(normalizedPath);
};
