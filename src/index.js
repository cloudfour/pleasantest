import puppeteer from 'puppeteer';
import * as vite from 'vite';
import * as path from 'path';
import { promises as fs } from 'fs';
import { within } from 'pptr-testing-library';
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
    app.use(async (ctx, next) => {
      if (ctx.path === '/@test-mule/runtime') {
        ctx.type = 'js';
        const p = path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          '../jest-dom.js',
        );
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

/** @type {Promise<puppeteer.Browser>} */
let browserPromise;
let serverPromise = createServer();

/** Pages that are in "debug mode" that the user will have to manually close */
const debuggedPages = new Set();

export const createTab = async ({ headless = true } = {}) => {
  browserPromise = connectToBrowser('chromium', headless);

  // Figure out the file that called createTab so that we can resolve paths correctly from there
  const stack = parseStackTrace(new Error().stack);
  const testFile = stack.find((stackItem) => {
    // ignore if it is the current file
    if (stackItem.fileName === __filename) return false;
    // find the first item that is not the current file
    return true;
  }).fileName;
  const testPath = path.relative(process.cwd(), testFile);

  const browser = await browserPromise;
  const previousPages = await browser.pages();
  const page = await browser.newPage();
  // close all other tabs
  await Promise.all(previousPages.map((page) => page.close()));
  page.on('console', (message) => {
    const text = message.text();
    // ignore vite spam
    if (text.startsWith('[vite]')) return;
    // ignore repeated messages within the browser
    if (text.startsWith('matcher failed')) return;
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
  const doc = await page
    .evaluateHandle('document')
    .then((handle) => handle.asElement());
  const screen = within(doc);

  const debug = () => {
    if (headless) {
      throw new Error(
        'debug() can only be used in headed mode. Pass { headless: false } to createTab()',
      );
    }
    debuggedPages.add(page);
    throw new Error('[debug mode]');
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

  return { screen, debug, utils, page };
};

afterAll(async () => {
  const browser = await browserPromise;
  // close all tabs, but not the browser itself (so it can be reused)
  const pages = await browser.pages();
  await Promise.all(
    pages.map(async (page) => {
      // if it is headless, no reason to keep pages open, even if test failed
      if (/headless/.test(browser.version())) return page.close();
      // leave any tab open if the test with it called debug()
      if (debuggedPages.has(page)) return;
      // check if the browser has a global window.__testMuleDebug__ set
      // If it does, then that means that a matcher failed and left that mark there
      const hasDebugFlag = await page
        .evaluateHandle(() => window.__testMuleDebug__)
        .then((v) => v.jsonValue());
      if (hasDebugFlag) return;
      return page.close();
    }),
  );
  browser.disconnect();
  const server = await serverPromise;
  await new Promise((resolve) => server.close(resolve));
});
