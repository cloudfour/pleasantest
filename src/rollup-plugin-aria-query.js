/** @returns {import("rollup").Plugin} */
export const rollupPluginAriaQuery = () => ({
  resolveId(source) {
    if (source === 'aria-query') return 'aria-query';
    return null;
  },
  async load(source) {
    if (source !== 'aria-query') return null;
    return getAriaQueryCode();
  },
});

const getAriaQueryCode = async () => {
  const q = await import('aria-query');
  return `export const roles = ${stringify(q.roles)};
export const elementRoles = ${stringify(q.elementRoles)};`;
};

const stringify = (input) => {
  // Can't use instanceof because they have a map polyfill
  if (typeof input === 'object') {
    if (input === null) return 'null';
    if (input[Symbol.toStringTag] === 'Map') {
      return `new Map(${stringify([...input.entries()])})`;
    }

    if (input[Symbol.toStringTag] === 'Set') {
      return `new Set(${stringify([...input.values()])})`;
    }

    if (Array.isArray(input)) {
      return `[${input.map(stringify).join(',')}]`;
    }

    const content = Object.entries(input)
      .map(([k, v]) => `${stringify(k)}:${stringify(v)}`)
      .join(',');
    return `{${content}}`;
  }

  return JSON.stringify(input, null, 2);
};
