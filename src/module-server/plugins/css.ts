import { transformCssImports } from '../transform-css-imports';
import { posix, relative, resolve, sep } from 'path';
import type { Plugin } from '../plugin';
import type { SourceDescription } from 'rollup';
import postcssSimpleVars from 'postcss-simple-vars';
import postcssModules from 'postcss-modules';

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
    code: string,
    id: string,
  ) => Promise<CSSTransformResult> | CSSTransformResult;
}

const sassPlugin = (): CSSPlugin => {
  let sass: typeof import('sass') | undefined;
  return {
    name: 'pleasantest-sass',
    async transform(code, id) {
      if (!id.endsWith('.sass')) return null;
      if (!sass) {
        try {
          sass = await import('sass');
        } catch {
          throw new Error('failed to load sass TODO error message');
        }
      }
      const result = sass.renderSync({
        file: id,
        data: code,
        // TODO: base on file ext
        indentedSyntax: true,
      });
      return { code: result.css.toString(), map: result.map?.toString() };
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
      const result = await postcss
        .default([
          postcssSimpleVars({ variables: [] }),
          postcssModules({
            getJSON(cssFile, exportedNames) {
              if (cssFile === id) jsExports = exportedNames;
            },
          }),
        ])
        .process(code, { from: id });
      return {
        code: result.css,
        // eslint-disable-next-line @cloudfour/typescript-eslint/no-unnecessary-condition
        map: result.map?.toString(),
        jsExports,
      };
    },
  };
};

// Next up:
// - PostCSS
// - PostCSS modules
// - Sass vs scss
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
): Promise<{ code: string; jsExports?: Record<string, string> }> => {
  let jsExports;
  for (const plugin of plugins) {
    if (plugin.transform) {
      // TODO: deal with `this`
      const result = await plugin.transform(code, id);
      // TODO: source maps?
      if (result) {
        code = typeof result === 'string' ? result : result.code || code;
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
    const transformedCSS = await transformCSS(code, id, root);
    let js = `
      const style = document.createElement('style')
      style.type = 'text/css'
      const promise = new Promise(r => style.addEventListener('load', r))
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
      for (const [expName, expValue] of Object.entries(
        transformedCSS.jsExports,
      ))
        js += `
          export const ${expName} = ${JSON.stringify(expValue)}
        `;
    }
    return js.trim();
  },
});
