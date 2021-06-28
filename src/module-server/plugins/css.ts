import postcssPlugin from 'rollup-plugin-postcss';
import { transformCssImports } from '../transform-css-imports';
import { join } from 'path';

export const cssExts = /\.(?:css|styl|stylus|s[ac]ss|less)$/;
export const cssPlugin = ({
  returnCSS = false,
}: { returnCSS?: boolean } = {}) => {
  const transformedCSS = new Map<string, string>();
  const plugin = postcssPlugin({
    inject: (cssVariable) => {
      return `
        const style = document.createElement('style')
        style.type = 'text/css'
        const promise = new Promise(r => style.addEventListener('load', r))
        style.appendChild(document.createTextNode(${cssVariable}))
        document.head.append(style)
        await promise
      `;
    },
    // They are executed right to left. We want our custom loader to run last
    use: ['rewriteImports', 'sass', 'stylus', 'less'],
    loaders: [
      {
        // Rewrites emitted url(...) and @imports to be relative to the project root.
        // Otherwise, relative paths don't work for injected stylesheets
        name: 'rewriteImports',
        test: /\.(?:css|styl|stylus|s[ac]ss|less)$/,
        async process({ code, map }: { code: string; map?: string }) {
          code = await transformCssImports(code, this.id, {
            resolveId(specifier, id) {
              if (!specifier.startsWith('./')) return specifier;
              return join(id, '..', specifier);
            },
          });
          if (returnCSS) {
            transformedCSS.set(this.id, code);
          }

          return { code, map };
        },
      },
    ],
  });
  // Adds .meta.css to returned object (for use in CSS middleware)
  if (returnCSS) {
    const originalTranform = plugin.transform!;
    plugin.transform = async function (code, id) {
      let result = await originalTranform.call(this, code, id);
      if (result === null || result === undefined) return result;
      if (typeof result === 'string') result = { code: result, map: '' };
      if (!result.meta) result.meta = {};
      result.meta.css = transformedCSS.get(id);
      return result;
    };
  }

  return plugin;
};
