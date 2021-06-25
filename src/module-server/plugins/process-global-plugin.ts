import type { Plugin } from 'rollup';

/**
 * Set global process.env.* variables
 * processGlobalPlugin({ NODE_ENV: 'development' })
 */
export const processGlobalPlugin = (env: Record<string, string>): Plugin => {
  return {
    name: 'process-global',
    transform(code) {
      for (const [property, value] of Object.entries(env)) {
        code = code.replace(
          new RegExp(`process\\.env\\.${property}`, 'g'),
          JSON.stringify(value),
        );
      }

      return code;
    },
  };
};
