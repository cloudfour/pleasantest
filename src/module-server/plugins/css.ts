import { transformCssImports } from '../transform-css-imports';
import { dirname, posix, relative, resolve, sep } from 'path';
import type { Plugin } from '../plugin';
import postcssSimpleVars from 'postcss-simple-vars';
import postcssModules from 'postcss-modules';
import { cssExts } from '../extensions-and-detection';
import type { TransformPluginContext } from 'rollup';

type CSSTransformResult =
  | string
  | null
  | undefined
  | {
      code?: string;
      map?: string;
      /**
       * Object whose keys are export names
       * and whose values are the values to be exported from the transpiled CSS file,
       * if it is imported from a JS file
       */
      jsExports?: Record<string, string>;
    };

interface CSSPlugin {
  name: string;
  transform?: (
    this: CSSPluginContext,
    code: string,
    id: string,
  ) => Promise<CSSTransformResult> | CSSTransformResult;
}
interface CSSPluginContext {
  error: TransformPluginContext['error'];
}

const sassPlugin = (): CSSPlugin => {
  let sass: typeof import('sass-embedded') | undefined;
  return {
    name: 'pleasantest-sass',
    async transform(code, id) {
      const isSass = id.endsWith('.sass');
      const isScss = id.endsWith('.scss');
      if (!isSass && !isScss) return null;
      if (!sass) {
        try {
          sass = await import('sass-embedded');
        } catch {
          throw new Error('failed to load sass TODO error message');
        }
      }
      let result;
      try {
        result = await sass.compileStringAsync(code, {
          alertColor: false,
          syntax: isScss ? 'scss' : 'indented',
          loadPaths: [dirname(id)],
        });
      } catch (error) {
        if ('sassMessage' in error)
          this.error(error.sassMessage, {
            line: (error.span.start.line as number) + 1,
            column: error.span.start.column,
          });
        else this.error(error);
      }
      return { code: result.css.toString() };
    },
  };
};

const postcssPlugin = (): CSSPlugin => {
  let postcss: typeof import('postcss') | undefined;
  return {
    name: 'pleasantest-postcss',
    async transform(code, id) {
      // TODO: `.module.css`? `.postcss`? Find out what people use
      // Also, should be able to run it on top of sass/etc output
      if (!id.endsWith('.css')) return null;
      if (!postcss) {
        try {
          postcss = await import('postcss');
        } catch {
          throw new Error('failed to load postcss TODO error message');
        }
      }
      let jsExports;
      // TODO: reuse postcss instance? (see if possible _after_ adding configurability)
      const result = await postcss
        .default([
          // TODO: remove (only a test)
          postcssSimpleVars({ variables: [] }),
          // TODO: allow passing in postcss plugins
          // TODO: allow configuration
          postcssModules({
            localsConvention: 'camelCase',
            getJSON(cssFile, exportedNames) {
              if (cssFile === id) jsExports = exportedNames;
            },
          }),
        ])
        .process(code, { from: id })
        .catch((error) => {
          if (
            error &&
            typeof error === 'object' &&
            'file' in error &&
            'line' in error &&
            'reason' in error &&
            'column' in error
          ) {
            this.error(error.reason, {
              column: error.column - 1,
              line: error.line,
            });
          } else {
            this.error(error);
          }
        });
      return {
        code: result.css,
        map: result.map?.toString(),
        jsExports,
      };
    },
  };
};

// Next up:
// - PostCSS
// - PostCSS modules
// - Error handling / source map errors
// - Allow passing in css transformers
// - No css transformers by default

// TODO: make configurable
// TODO: use different type from Plugin
const plugins: CSSPlugin[] = [sassPlugin(), postcssPlugin()];

export const transformCSS = async (
  code: string,
  id: string,
  root: string,
  rollupCtx?: TransformPluginContext,
): Promise<{ code: string; jsExports?: Record<string, string> }> => {
  let jsExports;
  const cssPluginCtx: CSSPluginContext = {
    error:
      rollupCtx?.error ||
      ((error) => {
        if (error instanceof Error) throw error;
        throw new Error(error as string);
      }),
  };
  for (const plugin of plugins) {
    if (plugin.transform) {
      let result;
      try {
        result = await plugin.transform.call(cssPluginCtx, code, id);
      } catch (error) {
        if (plugin.name) error.message = `[${plugin.name}] ${error.message}`;
        throw error;
      }
      // TODO: source maps?
      if (result) {
        code = (typeof result === 'string' ? result : result.code) || code;
        if (typeof result === 'object' && result.jsExports)
          jsExports = result.jsExports;
      }
    }
  }
  code = await transformCssImports(code, id, {
    resolveId: (spec, id) => {
      if (!spec.startsWith('./')) return spec.split(sep).join(posix.sep);
      const absolutePath = resolve(id, '..', spec);
      return `./${relative(root, absolutePath).split(sep).join(posix.sep)}`;
    },
  });
  return { code, jsExports };
};

export const cssPlugin = ({ root }: { root: string }): Plugin => ({
  name: 'css-plugin',
  async transform(code, id) {
    // TODO: should be configurable
    if (!cssExts.test(id)) return null;
    const transformedCSS = await transformCSS(code, id, root, this);
    let js = `
      const style = document.createElement('style')
      style.type = 'text/css'
      const promise = new Promise((resolve, reject) => {
        style.addEventListener('load', () => resolve())
        style.addEventListener('error', () => {
          reject(new Error(\`Failed to load stylesheet: ${JSON.stringify(
            id,
          )}\`))
        })
      })
      style.appendChild(
        document.createTextNode(${JSON.stringify(transformedCSS.code)})
      )
      document.head.append(style)
      await promise
    `;
    if (transformedCSS.jsExports) {
      js += `
        export default ${JSON.stringify(transformedCSS.jsExports)}
      `;
      let counter = 0;
      const namedExports: string[] = [];
      for (const [expName, expValue] of Object.entries(
        transformedCSS.jsExports,
      )) {
        const varName = `${expName.replace(/[^\w$]/g, '_')}${counter++}`;
        js += `
          const ${varName} = ${JSON.stringify(expValue)}
        `;
        namedExports.push(`${varName} as ${JSON.stringify(expName)}`);
      }
      js += `export {
        ${namedExports.join(',\n')}
      }`;
    }
    return js.trim();
  },
});
