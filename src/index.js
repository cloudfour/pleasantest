import puppeteer from 'puppeteer';
import * as vite from 'vite';
import fetch from 'node-fetch';
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
  <body></body>
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

const HEADLESS = true;

let browserPromise = puppeteer.launch({
  headless: HEADLESS,
  devtools: !HEADLESS,
  ignoreDefaultArgs: [
    // Don't pop up "Chrome is being controlled by automated software"
    '--enable-automation',
  ],
  // most are taken from https://github.com/GoogleChrome/chrome-launcher/blob/v0.13.4/src/flags.ts
  args: [
    // Don't pop up "Chrome is not your default browser"
    '--no-default-browser-check',
  ],
});
let serverPromise = createServer();

export const createTab = async () => {
  const browser = await browserPromise;
  const previousPages = await browser.pages();
  const page = await browser.newPage();
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
    const res = await fetch(`http://localhost:3000/fake-module?code=${code}`);
    const transpiled = await res.text();
    await page.evaluate(transpiled);
  };
  const doc = await page
    .evaluateHandle('document')
    .then((handle) => handle.asElement());
  const screen = within(doc);
  return { screen, user, runJS };
};

afterAll(async () => {
  const browser = await browserPromise;
  await browser.close();
  const server = await serverPromise;
  server.close();
  await new Promise((resolve) => server.on('close', resolve));
});
