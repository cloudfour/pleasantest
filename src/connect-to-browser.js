import * as childProcess from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';
import envPaths from 'env-paths';
import puppeteer from 'puppeteer';

/** @param {string} configPath */
const readConfig = async (configPath) => {
  try {
    const config = await fs.readFile(configPath, 'utf8').catch(() => '');
    const parsed = JSON.parse(config);
    if (typeof parsed === 'object') return parsed;
  } catch {}
  return {};
};

/**
 * @param {string} configPath
 * @param {object} config
 */
const updateConfig = async (configPath, config) => {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  const oldConfig = await readConfig(configPath);
  for (const prop in config) {
    oldConfig[prop] = oldConfig[prop] || {};
    Object.assign(oldConfig[prop], config[prop]);
  }
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
};

/**
 * @param {'chromium'} browser
 * @param {boolean} headless
 */
export const connectToBrowser = async (browser, headless) => {
  const dataPath = envPaths('test-mule').data;
  const configPath = path.join(dataPath, 'config.json');
  const config = await readConfig(configPath);
  const headlessString = headless ? 'headless' : 'headed';
  const cachedWSEndpoint = config[browser]?.[headlessString];
  if (cachedWSEndpoint) {
    try {
      return await puppeteer.connect({ browserWSEndpoint: cachedWSEndpoint });
    } catch {}
  }
  const subprocess = childProcess.fork(
    require.resolve('./start-disowned-browser'),
  );
  const wsEndpoint = await new Promise((resolve) => {
    subprocess.send({ browser, headless });
    subprocess.on('message', async (msg) => {
      if (!msg.browserWSEndpoint) return;
      resolve(msg.browserWSEndpoint);
    });
  });
  // disconnect from the spawned process so it can keep running in the background
  subprocess.unref();
  subprocess.disconnect();
  await updateConfig(configPath, {
    [browser]: { [headlessString]: wsEndpoint },
  });
  return await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
};
