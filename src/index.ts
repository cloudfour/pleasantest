import type playwright from 'playwright';
import * as vite from 'vite';
import * as path from 'path';
import { getQueriesForElement } from './pptr-testing-library';
import { connectToBrowser } from './connect-to-browser';
import { parseStackTrace } from 'errorstacks';
import './extend-expect';
import { URLSearchParams, fileURLToPath } from 'url';

const defaultHTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:;base64,=" />
    <title>test-mule</title>
  </head>
  <body>
    <h1 style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)">
      Your test will run here
    </h1>
  </body>
</html>
`;

export let port = 3000;

const createServer = async () => {
  const inlineModulePlugin = (): vite.Plugin => {
    const pluginName = 'test-mule-inline-module-plugin';
    return {
      name: pluginName,
      enforce: 'pre',
      resolveId(id) {
        const [idWithoutQuery, qs] = id.split('?');
        if (!qs) return null;
        const parsedParams = new URLSearchParams(qs);
        const inlineCode = parsedParams.get('inline-code');
        if (!inlineCode) return null;
        return `.${idWithoutQuery}#inline-code=${encodeURIComponent(
          inlineCode,
        )}`;
      },
      load(id) {
        const hash = id.split('#')[1];
        if (!hash) return null;
        const inlineCode = new URLSearchParams(hash).get('inline-code');
        if (!inlineCode) return null;
        return inlineCode;
      },
    };
  };

  const indexHTMLPlugin = (): vite.Plugin => ({
    name: 'test-mule-index-html',
    configureServer({ app }) {
      app.use(async (req, res, next) => {
        if (req.url !== '/') return next();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.write(defaultHTML);
        res.end();
      });
    },
  });

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const clientRuntimePlugin = (): vite.Plugin => ({
    name: 'test-mule-client-runtime',
    resolveId(id) {
      if (!id.startsWith('/@test-mule')) return null;
      return id === '/@test-mule/jest-dom'
        ? path.join(currentDir, '../jest-dom.js')
        : path.join(currentDir, '../pptr-testing-library-client.js');
    },
  });

  const server = await vite.createServer({
    optimizeDeps: { auto: false },
    server: { port, cors: true, hmr: false },
    plugins: [indexHTMLPlugin(), inlineModulePlugin(), clientRuntimePlugin()],
    logLevel: 'warn',
  });

  await server.listen();

  // if original port was not available, use whichever vite ended up choosing
  port = server.config.server.port || port;

  return server;
};

/** Keeps track of all the browser contexts to can clean them up later */
const browserContexts: playwright.BrowserContext[] = [];
let serverPromise = createServer();

/** Pages that are in "debug mode" that the user will have to manually close */
const debuggedPages = new Set();

export const createTab = async ({
  headless = true,
  browser: browserName = 'chromium',
}: {
  headless?: boolean;
  browser?: 'chromium' | 'firefox' | 'webkit';
} = {}) => {
  const browser = await connectToBrowser(browserName, headless);
  const browserContext = await browser.newContext();
  browserContexts.push(browserContext);
  const page = await browserContext.newPage();

  // Figure out the file that called createTab so that we can resolve paths correctly from there
  const stack = parseStackTrace(new Error().stack as string).map(
    (stackFrame) => {
      if (stackFrame.fileName) return stackFrame.fileName;
      return /\s*at\s+([\w/\-.]*)/.exec(stackFrame.raw)?.[1];
    },
  );
  const testFile = stack.find((stackItem) => {
    if (!stackItem) return false;
    // ignore if it is the current file
    if (stackItem === __filename) return false;
    // ignore if it is an internal-to-node thing
    if (!stackItem.startsWith('/')) return false;
    // find the first item that is not the current file
    return true;
  });
  const testPath = testFile
    ? path.relative(process.cwd(), testFile)
    : __filename;

  page.on('console', (message) => {
    const text = message.text();
    // ignore vite spam
    if (text.startsWith('[vite]')) return;
    // ignore repeated messages within the browser
    if (text.startsWith('matcher failed') || text.startsWith('query failed'))
      return;
    const type = message.type();
    if (type === 'error') {
      const error = new Error(text);
      const location = message.location();
      error.stack = `Error: ${text}
    at ${location.url}`;
      console.error('[browser]', error);
    } else {
      console.log('[browser]', text);
    }
  });

  await serverPromise;

  await page.goto(`http://localhost:${port}`);

  const runJS = async (code: string) => {
    const encodedCode = encodeURIComponent(code);
    // This uses the testPath as the url so that if there are relative imports
    // in the inline code, the relative imports are resolved relative to the test file
    const url = `http://localhost:${port}/${testPath}?inline-code=${encodedCode}`;
    await page.evaluateHandle(`import(${JSON.stringify(url)})`).catch((e) => {
      debuggedPages.add(page);
      throw e;
    });
  };

  const debug = () => {
    if (headless) {
      throw removeFuncFromStackTrace(
        new Error(
          'debug() can only be used in headed mode. Pass { headless: false } to createTab()',
        ),
        debug,
      );
    }
    debuggedPages.add(page);
    throw removeFuncFromStackTrace(new Error('[debug mode]'), debug);
  };

  /** Set the contents of document.body */
  const injectHTML = async (html: string) => {
    await page.evaluate((html) => {
      document.body.innerHTML = html;
    }, html);
  };

  /** Set the contents of a new style tag */
  const injectCSS = async (css: string) => {
    await page.evaluate((css) => {
      const styleTag = document.createElement('style');
      styleTag.innerHTML = css;
      document.head.append(styleTag);
    }, css);
  };

  /** Load a CSS (or sass, less, etc.) file. Pass a path that will be resolved from your test file */
  const loadCSS = async (cssPath: string) => {
    const fullPath = path.join(path.dirname(testPath), cssPath);
    await page.evaluateHandle(
      `import(${JSON.stringify(
        `http://localhost:${port}/${fullPath}?import`,
      )})`,
    );
  };

  /** Load a JS (or TS, JSX) file. Pass a path that will be resolved from your test file */
  const loadJS = async (jsPath: string) => {
    const fullPath = jsPath.startsWith('.')
      ? path.join(path.dirname(testPath), jsPath)
      : jsPath;
    await page.evaluateHandle(
      `import(${JSON.stringify(`http://localhost:${port}/${fullPath}`)})`,
    );
  };

  const utils = { runJS, injectCSS, injectHTML, loadCSS, loadJS };

  const screen = getQueriesForElement(page);

  /** Returns DOM Testing Library queries that only search within a single element */
  // the | null is so you can pass directly the result of page.$() which returns null if not found
  const within = (element: playwright.ElementHandle | null) => {
    const type =
      element === null
        ? 'null'
        : // @ts-expect-error this is doing manual type checking
        typeof element === 'object' && element.then && element.catch
        ? 'Promise'
        : typeof element;
    if (type === 'Promise') {
      throw removeFuncFromStackTrace(
        new Error(
          `Must pass elementhandle to within(el), received ${type}. Did you forget await?`,
        ),
        within,
      );
    }
    if (type !== 'object' || element === null || !element.asElement) {
      throw removeFuncFromStackTrace(
        new Error(`Must pass elementhandle to within(el), received ${type}`),
        within,
      );
    }
    // returns null if it is a JSHandle that does not point to an element
    const el = element.asElement();
    if (!el) {
      throw new Error(
        'Must pass elementhandle to within(el), received a JSHandle that did not point to an element',
      );
    }
    return getQueriesForElement(page, element);
  };

  return { screen, debug, utils, page, within };
};

/**
 * Manipulate the stack trace and remove fn from it
 * That way jest will show a code frame from the user's code, not ours
 * https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
 */
const removeFuncFromStackTrace = (
  error: Error,
  fn: (...params: any[]) => any,
) => {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, fn);
  }
  return error;
};

/**
 * Closes all tabs (and the BrowserContext itself) as long as each tab is not in debug mode or failed
 * @param {playwright.BrowserContext} context
 */
const cleanUpBrowserContext = async (context: playwright.BrowserContext) => {
  let isHeadless = true;
  try {
    isHeadless = /headless/.test(context.browser()!.version());
  } catch {}
  const pages = context.pages();
  /** Array of booleans for whether each tab should be open. Indexes match pages array */
  const shouldLeaveOpen = await Promise.all(
    pages.map(async (page) => {
      // if it is headless, no reason to keep pages open, even if test failed
      if (isHeadless) return false;
      // leave any tab open if the test with it called debug()
      if (debuggedPages.has(page)) return true;
      // check if the browser has a global window.__testMuleDebug__ set
      // If it does, then that means that a matcher failed and left that mark there
      const hasDebugFlag = await page
        .evaluateHandle(() => window.__testMuleDebug__)
        .then((v) => v.jsonValue())
        .catch(() => false);
      return hasDebugFlag;
    }),
  );
  if (shouldLeaveOpen.every((t) => t === false)) return await context.close();
  await Promise.all(
    shouldLeaveOpen.map(async (shouldLeaveOpen, i) => {
      if (shouldLeaveOpen) return;
      await pages[i].close().catch(() => {}); // sometimes it fails to close if it is already closed
    }),
  );
};

afterAll(async () => {
  await Promise.all(browserContexts.map(cleanUpBrowserContext));
  browserContexts.map((ctx) => ctx.browser()!.close());
  const server = await serverPromise;
  await server.close();
});
