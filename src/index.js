import puppeteer from 'puppeteer';
import * as vite from 'vite';
import { within } from 'pptr-testing-library';
import { connectToBrowser } from './connect-to-browser';
import './extend-expect';

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

const createServer = async () => {
  /** @type {import('chokidar').FSWatcher} */
  let watcher;
  const viteStealWatcherMiddleware = ({ watcher: _watcher }) => {
    watcher = _watcher;
  };
  const viteFakeModuleMiddleware = ({ app }) => {
    app.use(async (ctx, next) => {
      if (ctx.path === '/fake-module') {
        ctx.type = 'js';
        ctx.body = ctx.request.query.code;
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

  const server = vite.createServer({
    configureServer: [
      viteFakeModuleMiddleware,
      viteStealWatcherMiddleware,
      viteHomeMiddleware,
    ],
    optimizeDeps: { auto: false },
    hmr: false,
  });
  server.listen(3000);
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
  const browser = await browserPromise;
  const previousPages = await browser.pages();
  const page = await browser.newPage();
  // close all other tabs
  await Promise.all(previousPages.map((page) => page.close()));
  page.on('console', (message) => {
    const text = message.text();
    // ignore vite spam
    if (text.startsWith('[vite]')) return;
    console.log(text);
  });

  await serverPromise;

  await page.goto('http://localhost:3000');

  const user = {};
  const runJS = async (code) => {
    const encodedCode = encodeURIComponent(code);
    const url = `http://localhost:3000/fake-module?code=${encodedCode}`;
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

  return { screen, user, runJS, debug, injectCSS, injectHTML };
};

afterAll(async () => {
  const browser = await browserPromise;
  // close all tabs, but not the browser itself (so it can be reused)
  const pages = await browser.pages();
  await Promise.all(
    pages.map(async (page) => {
      if (!debuggedPages.has(page)) await page.close();
    }),
  );
  browser.disconnect();
  const server = await serverPromise;
  await new Promise((resolve) => server.close(resolve));
});
