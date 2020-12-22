import puppeteer from 'puppeteer';
import * as vite from 'vite';
import { within } from 'pptr-testing-library';
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
  // when the server closes, close vite's watcher (vite bug)
  server.on('close', () => watcher.close());
  await new Promise((resolve) => server.on('listening', resolve));

  return server;
};

/** @type {Promise<puppeteer.Browser>} */
let browserPromise;
let serverPromise = createServer();

export const createTab = async ({ headless = true } = {}) => {
  browserPromise = puppeteer.launch({
    headless: headless,
    devtools: !headless,
    ignoreDefaultArgs: [
      // Don't pop up "Chrome is being controlled by automated software"
      '--enable-automation',
      // Unsupported flag that pops up a warning
      '--enable-blink-features=IdleDetection',
    ],
    // most are taken from https://github.com/GoogleChrome/chrome-launcher/blob/v0.13.4/src/flags.ts
    args: [
      // Don't pop up "Chrome is not your default browser"
      '--no-default-browser-check',
    ],
  });
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
  const debug = async () => {
    if (headless) {
      throw new Error(
        'debug() can only be used in headed mode. Pass { headless: false } to createTab()',
      );
    }
    // Block indefinitely (or until browser/tab is closed)
    await new Promise((resolve) => {
      page.on('close', resolve);
      browser.on('disconnected', resolve);
    });
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
  await browser.close();
  const server = await serverPromise;
  server.close();
  await new Promise((resolve) => server.on('close', resolve));
});
