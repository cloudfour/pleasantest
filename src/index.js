import puppeteer from 'puppeteer';
import * as vite from 'vite';
import fetch from 'node-fetch';
import { within } from 'pptr-testing-library';
import './extend-expect';

const createServer = async () => {
  const viteMiddleware = ({ app }) => {
    app.use(async (ctx, next) => {
      if (ctx.path === '/fake-module') {
        ctx.type = 'js';
        ctx.body = ctx.request.query.code;
      }
      // make vite do built-in transforms
      await next();
    });
  };

  const server = vite.createServer({
    configureServer: [viteMiddleware],
    optimizeDeps: { auto: false },
    hmr: false,
  });
  server.listen(3000);
  await new Promise((resolve) => server.on('listening', resolve));

  return server;
};

let browserPromise = puppeteer.launch(
  { headless: true },
  // { headless: false, devtools: true }
);
let serverPromise = createServer();

export const createTab = async () => {
  const browser = await browserPromise;
  const page = await browser.newPage();
  page.on('console', (message) => console.log(message.text()));

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
