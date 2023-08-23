import * as childProcess from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// @ts-expect-error the bundle: syntax is from a plugin in the rollup config and TS does not know about it
import startDisownedBrowserPath from 'bundle:./start-disowned-browser';
import * as puppeteer from 'puppeteer';

// This is the folder that Pleasantest is installed in (e.g. <something>/node_modules/pleasantest)
const installFolder = path.dirname(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
);
// Something like <something>/node_modules/pleasantest/.browser-cache.json
const cachePath = path.join(installFolder, '.browser-cache.json');

const readCache = async () => {
  try {
    const cache = await fs.readFile(cachePath, 'utf8').catch(() => '');
    const parsed = JSON.parse(cache);
    if (typeof parsed === 'object') return parsed;
  } catch {}

  return {};
};

const updateCacheFile = async (
  browser: 'chromium',
  headless: boolean,
  value: string | undefined,
  previousValue: string | undefined,
) => {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  const oldCache = await readCache();
  const headlessStr = headless ? 'headless' : 'headed';
  const browserObj = oldCache[browser] || (oldCache[browser] = {});
  if (
    previousValue !== undefined &&
    previousValue !== browserObj[headlessStr]
  ) {
    return browserObj[headlessStr];
  }

  browserObj[headlessStr] = value;
  await fs.writeFile(cachePath, JSON.stringify(oldCache, null, 2));
};

const connectToCachedBrowser = async (
  browser: 'chromium',
  headless: boolean,
  timeLimit = 5000,
) => {
  const cache = await readCache();
  const cachedWSEndpoint = cache[browser]?.[headless ? 'headless' : 'headed'];
  // In case another process is currently starting a browser, wait for that process
  // rather than starting a whole new one
  if (cachedWSEndpoint === 'starting' && timeLimit > 0) {
    return new Promise<
      puppeteer.Browser | { connected: false; previousValue: string }
    >((resolve) => {
      // Every 50ms check again (this is recursive)
      setTimeout(
        () =>
          connectToCachedBrowser(browser, headless, timeLimit - 50).then(
            resolve,
          ),
        50,
      );
    });
  }

  if (cachedWSEndpoint) {
    return puppeteer
      .connect({ browserWSEndpoint: cachedWSEndpoint })
      .catch(
        () => ({ connected: false, previousValue: cachedWSEndpoint }) as const,
      );
  }

  return { connected: false, previousValue: cachedWSEndpoint } as const;
};

const isBrowser = (input: unknown): input is puppeteer.Browser =>
  // @ts-expect-error checking for properties on unknown object
  input && typeof input === 'object' && input.version;

export const connectToBrowser = async (
  browser: 'chromium',
  headless: boolean,
) => {
  // I acknowledge that this code is gross and should be refactored
  // Constraints:
  // - If there is no browser in the cache, multiple concurrent processes should only start 1 new browser
  // - If there is a killed browser in the cache, multiple concurrent processes should only start 1 new browser
  // - If there "starting" in the cache but nothing is really starting, multiple concurrent processes should only start 1 new browser
  const cachedBrowser = await connectToCachedBrowser(browser, headless);
  if (isBrowser(cachedBrowser)) {
    return cachedBrowser;
  }

  let valueWrittenInMeantime = await updateCacheFile(
    browser,
    headless,
    'starting',
    cachedBrowser.previousValue,
  );
  if (valueWrittenInMeantime) {
    const connectedBrowser = await connectToCachedBrowser(browser, headless);
    if (!isBrowser(connectedBrowser))
      throw new Error('unable to connect to browser');
    return connectedBrowser;
  }

  const subprocess = childProcess.fork(
    fileURLToPath(startDisownedBrowserPath),
    {
      detached: true,
      stdio: 'ignore',
    },
  );
  const wsEndpoint = await new Promise<string>((resolve, reject) => {
    subprocess.send({ browser, headless });
    subprocess.on('message', (msg: any) => {
      if (msg.error) {
        reject(new Error(`Failed to start browser: ${msg.error}`));
        return;
      }
      if (!msg.browserWSEndpoint) return;
      resolve(msg.browserWSEndpoint);
    });
  }).catch(async (error) => {
    subprocess.kill();
    valueWrittenInMeantime = await updateCacheFile(
      browser,
      headless,
      '',
      'starting',
    );
    throw error;
  });
  valueWrittenInMeantime = await updateCacheFile(
    browser,
    headless,
    wsEndpoint,
    'starting',
  );
  if (valueWrittenInMeantime) {
    // Another browser was started while this browser was starting
    // so we are going to kill the current browser and connect to the other one instead
    subprocess.kill();
    return puppeteer.connect({
      browserWSEndpoint: valueWrittenInMeantime,
    });
  }

  // Disconnect from the spawned process so it can keep running in the background
  subprocess.unref();
  subprocess.disconnect();
  return puppeteer.connect({ browserWSEndpoint: wsEndpoint });
};
