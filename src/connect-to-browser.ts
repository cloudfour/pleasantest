import * as childProcess from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';
import envPaths from 'env-paths';
import * as puppeteer from 'puppeteer';
// @ts-expect-error
import startDisownedBrowserPath from 'bundle:./start-disowned-browser';

const readConfig = async (configPath: string) => {
  try {
    const config = await fs.readFile(configPath, 'utf8').catch(() => '');
    const parsed = JSON.parse(config);
    if (typeof parsed === 'object') return parsed;
  } catch {}
  return {};
};

/**
 * @param [previousValue] If the read value does not match this, skips updating and returns the newly read value
 */
const updateConfig = async (
  configPath: string,
  browser: 'chromium',
  headless: boolean,
  value: string | undefined,
  previousValue: string | undefined,
) => {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  const oldConfig = await readConfig(configPath);
  const headlessStr = headless ? 'headless' : 'headed';
  const browserObj = oldConfig[browser] || (oldConfig[browser] = {});
  if (
    previousValue !== undefined &&
    previousValue !== browserObj[headlessStr]
  ) {
    return browserObj[headlessStr];
  }
  browserObj[headlessStr] = value;
  await fs.writeFile(configPath, JSON.stringify(oldConfig, null, 2));
};

/**
 * @param timeLimit The maximum amount of time to wait for a browesr to start from another process
 */
const connectToCachedBrowser = async (
  configPath: string,
  browser: 'chromium',
  headless: boolean,
  timeLimit: number = 5000,
) => {
  const config = await readConfig(configPath);
  const cachedWSEndpoint = config[browser]?.[headless ? 'headless' : 'headed'];
  // in case another process is currently starting a browser, wait for that process
  // rather than starting a whole new one
  if (cachedWSEndpoint === 'starting' && timeLimit > 0) {
    return new Promise<
      puppeteer.Browser | { connected: false; previousValue: string }
    >((resolve) => {
      // every 50ms check again (this is recursive)
      setTimeout(
        () =>
          connectToCachedBrowser(
            configPath,
            browser,
            headless,
            timeLimit - 50,
          ).then(resolve),
        50,
      );
    });
  }
  if (cachedWSEndpoint) {
    return await puppeteer
      .connect({ browserWSEndpoint: cachedWSEndpoint })
      .catch(
        () => ({ connected: false, previousValue: cachedWSEndpoint } as const),
      );
  }
  return { connected: false, previousValue: cachedWSEndpoint } as const;
};

const isBrowser = (input: unknown): input is puppeteer.Browser =>
  // @ts-expect-error
  input && typeof input === 'object' && input.version;

export const connectToBrowser = async (
  browser: 'chromium',
  headless: boolean,
) => {
  // I acknowledge that this code is gross and should be refactored
  // Constraints:
  // - If there is no browser in the config, multiple concurrent processes should only start 1 new browser
  // - If there is a killed browser in the config, multiple concurrent processes should only start 1 new browser
  // - If there "starting" in the config but nothing is really starting, multiple concurrent processes should only start 1 new browser
  // TODO: Idea: use a state machine!!!
  const dataPath = envPaths('test-mule').data;
  const configPath = path.join(dataPath, 'config.json');
  const cachedBrowser = await connectToCachedBrowser(
    configPath,
    browser,
    headless,
  );
  if (isBrowser(cachedBrowser)) return cachedBrowser;
  let valueWrittenInMeantime = await updateConfig(
    configPath,
    browser,
    headless,
    'starting',
    cachedBrowser.previousValue,
  );
  if (valueWrittenInMeantime) {
    const connectedBrowser = await connectToCachedBrowser(
      configPath,
      browser,
      headless,
    );
    if (!isBrowser(connectedBrowser))
      throw new Error('unable to connect to brwoser');
    return connectedBrowser;
  }
  const subprocess = childProcess.fork(startDisownedBrowserPath, {
    detached: true,
    stdio: 'ignore',
  });
  const wsEndpoint = await new Promise<string>((resolve) => {
    subprocess.send({ browser, headless });
    subprocess.on('message', async (msg: any) => {
      if (!msg.browserWSEndpoint) return;
      resolve(msg.browserWSEndpoint);
    });
  });
  valueWrittenInMeantime = await updateConfig(
    configPath,
    browser,
    headless,
    wsEndpoint,
    'starting',
  );
  if (valueWrittenInMeantime) {
    // another browser was started while this browser was starting
    // so we are going to kill the current browser and connect to the other one instead
    subprocess.kill();
    return await puppeteer.connect({
      browserWSEndpoint: valueWrittenInMeantime,
    });
  }
  // disconnect from the spawned process so it can keep running in the background
  subprocess.unref();
  subprocess.disconnect();
  return await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
};
