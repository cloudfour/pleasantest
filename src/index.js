import puppeteer from 'puppeteer';
import * as vite from 'vite';
import * as path from 'path';
import { promises as fs } from 'fs';
import { getQueriesForElement } from './pptr-testing-library';
import { connectToBrowser } from './connect-to-browser';
import { parseStackTrace } from 'errorstacks';
import './extend-expect';
import { fileURLToPath } from 'url';

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
  /** @type {import('chokidar').FSWatcher} */
  let watcher;
  const viteStealWatcherMiddleware = ({ watcher: _watcher }) => {
    watcher = _watcher;
  };
  const viteInlineModuleMiddleware = ({ app }) => {
    app.use(async (ctx, next) => {
      const query = ctx.request.query;
      if (query['inline-code-type']) {
        ctx.type = query['inline-code-type'];
        ctx.body = query['inline-code'];
      }
      // make vite do built-in transforms
      await next();
    });
  };

  const viteHomeMiddleware = ({ app }) => {
    app.use(async (ctx, next) => {
      if (ctx.path === '/') {
        ctx.type = 'html';
        ctx.body = defaultHTML;
      }
      await next();
    });
  };

  const viteClientRuntimeMiddleware = ({ app }) => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/@test-mule')) {
        ctx.type = 'js';
        const p =
          ctx.path === '/@test-mule/jest-dom'
            ? path.join(currentDir, '../jest-dom.js')
            : path.join(currentDir, '../pptr-testing-library-client.js');
        ctx.body = await fs.readFile(p, 'utf8');
      }
      await next();
    });
  };

  // when the vite client disconnects from the server it polls to reconnect
  // this feature is useless for our use case and it generates a lot of console noise
  // so we are snipping this feature from their client code
  const viteDisablePollingMiddleware = ({ app }) => {
    app.use(async (ctx, next) => {
      await next();

      if (ctx.path === '/vite/client') {
        ctx.body = ctx.body
          .replace(
            // here is code sninppet we are removing:
            // socket.addEventListener('close', () => {
            //   ...
            // }, 1000);});
            /socket\.addEventListener\('close'[\w\W]*?, [0-9]*\);[\s\r]*}\);/,
            '',
          )
          .replace(/console\.log\(['"`]\[vite\] connecting...['"`]\)/, '')
          .replace(/console\.log\(['"`]\[vite\] connected.['"`]\)/, '');
      }
    });
  };

  const server = vite.createServer({
    configureServer: [
      viteInlineModuleMiddleware,
      viteStealWatcherMiddleware,
      viteHomeMiddleware,
      viteDisablePollingMiddleware,
      viteClientRuntimeMiddleware,
    ],
    alias: {
      'jest-dom': '/Users/calebeby/Projects/test-mule/dist/jest-dom.js',
    },
    optimizeDeps: { auto: false },
    cors: true,
    hmr: false,
  });

  server.listen(port);

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      setTimeout(() => {
        server.close();
        server.listen(++port);
      }, 100);
    } else {
      console.error(`[vite] server error:`);
      if (e.stack) console.log(e.stack);
      console.error(e);
    }
  });
  await new Promise((resolve) => server.on('listening', resolve));

  const sockets = new Set();

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  const originalClose = server.close;
  server.close = (cb) => {
    // force-kill all active connections
    sockets.forEach((socket) => socket.destroy());
    originalClose.call(server, cb);
    // When the server closes, close vite's watcher (vite bug)
    // Otherwise the process doesn't exit
    watcher.close();
  };

  return server;
};

/**
 * Keeps track of all the browser contexts started by this instance so we can clean them up later
 * @type {puppeteer.BrowserContext[]}
 */
const browserContexts = [];
let serverPromise = createServer();

/** Pages that are in "debug mode" that the user will have to manually close */
const debuggedPages = new Set();

export const createTab = async ({ headless = true } = {}) => {
  const browser = await connectToBrowser('chromium', headless);
  const browserContext = await browser.createIncognitoBrowserContext();
  browserContexts.push(browserContext);
  const page = await browserContext.newPage();

  // Figure out the file that called createTab so that we can resolve paths correctly from there
  const stack = parseStackTrace(new Error().stack);
  const testFile = stack.find((stackItem) => {
    // ignore if it is the current file
    if (stackItem.fileName === __filename) return false;
    // ignore if it is an internal-to-node thing
    if (!stackItem.fileName.startsWith('/')) return false;
    // find the first item that is not the current file
    return true;
  }).fileName;
  const testPath = path.relative(process.cwd(), testFile);

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

  const runJS = async (code) => {
    const encodedCode = encodeURIComponent(code);
    // This uses the testPath as the url so that if there are relative imports
    // in the inline code, the relative imports are resolved relative to the test file
    const url = `http://localhost:${port}/${testPath}?inline-code-type=js&inline-code=${encodedCode}`;
    await page.evaluateHandle(`import(${JSON.stringify(url)})`);
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

  /**
   * Set the contents of document.body
   * @param {string} html
   */
  const injectHTML = async (html) => {
    await page.evaluate((html) => {
      document.body.innerHTML = html;
    }, html);
  };

  /**
   * Set the contents of a new style tag
   * @param {string} css
   */
  const injectCSS = async (css) => {
    await page.evaluate((css) => {
      const styleTag = document.createElement('style');
      styleTag.innerHTML = css;
      document.head.append(styleTag);
    }, css);
  };

  /**
   * Load a CSS (or sass, less, etc.) file. Pass a path that will be resolved from your test file
   * @param {string} cssPath
   */
  const loadCSS = async (cssPath) => {
    const fullPath = path.join(path.dirname(testPath), cssPath);
    await page.evaluateHandle(
      `import(${JSON.stringify('./' + fullPath + '?import')})`,
    );
  };

  /**
   * Load a JS (or ts, jsx) file. Pass a path that will be resolved from your test file
   * @param {string} jsPath
   */
  const loadJS = async (jsPath) => {
    const fullPath = jsPath.startsWith('.')
      ? path.join(path.dirname(testPath), jsPath)
      : jsPath;
    await page.evaluateHandle(`import(${JSON.stringify('./' + fullPath)})`);
  };

  const utils = { runJS, injectCSS, injectHTML, loadCSS, loadJS };

  const screen = getQueriesForElement(page);

  /**
   * Returns DOM Testing Library queries that only search within a single element
   * @param {ElementHandle} element
   */
  const within = (element) => {
    const type =
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
    if (type !== 'object' || !element.asElement) {
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
 * @param {Error} error
 * @param {function} fn
 */
const removeFuncFromStackTrace = (error, fn) => {
  // manipulate the stack trace and remove fn from it
  // That way jest will show a code frame from the user's code, not ours
  // https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, fn);
  }
  return error;
};

/**
 * Closes all tabs (and the BrowserContext itself) as long as each tab is not in debug mode or failed
 * @param {puppeteer.BrowserContext} context
 */
const cleanUpBrowserContext = async (context) => {
  let isHeadless = true;
  try {
    isHeadless = /headless/.test(await context.browser().version());
  } catch {}
  const pages = await context.pages();
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
  browserContexts.map((ctx) => ctx.browser().disconnect());
  const server = await serverPromise;
  await new Promise((resolve) => server.close(resolve));
});
