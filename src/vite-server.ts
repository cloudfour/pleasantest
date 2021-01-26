import { URLSearchParams, fileURLToPath } from 'url';
import * as vite from 'vite';
import * as path from 'path';

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

export const createServer = async () => {
  const inlineModulePlugin = (): vite.Plugin => {
    const pluginName = 'test-mule-inline-module-plugin';
    return {
      name: pluginName,
      // has to run resolveId before vite's other resolve handlers
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

  const disablePollingPlugin = (): vite.Plugin => ({
    name: 'test-mule-disable-polling',
    transform(code, id) {
      if (!id.endsWith('vite/dist/client/client.js')) return null;
      return code
        .replace(
          // here is code sninppet we are removing:
          // socket.addEventListener('close', () => {
          //   ...
          // }, 1000);});
          /socket\.addEventListener\('close'[\w\W]*?, [0-9]*\);[\s\r]*}\);/,
          '',
        )
        .replace(/console\.log\(['"`]\[vite\] connecting...['"`]\)/, '')
        .replace(/console\.log\(['"`]\[vite\] connected.['"`]\)/, '')
        .replace(/setInterval(() => socket.send('ping'), \d+)/, '');
    },
  });

  const server = await vite.createServer({
    optimizeDeps: {
      auto: false,
      // not sure why this has to be excluded, since auto: false should disable entirely
      // Without this, intermittently, vite tries to bundle pptr and fails
      exclude: ['puppeteer'],
    },
    server: { port, cors: true, hmr: false },
    plugins: [
      indexHTMLPlugin(),
      inlineModulePlugin(),
      clientRuntimePlugin(),
      disablePollingPlugin(),
    ],
    logLevel: 'warn',
  });

  await server.listen();

  // if original port was not available, use whichever vite ended up choosing
  port = server.config.server.port || port;

  return server;
};
