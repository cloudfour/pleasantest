const puppeteer = require('puppeteer');

process.on('message', async ({ browser, headless }) => {
  if (browser !== 'chromium')
    throw new Error(`unrecognized browser: ${browser}`);
  if (typeof headless !== 'boolean')
    throw new Error('headless must be a boolean');

  const browserInstance = await puppeteer.launch({
    headless,
    devtools: !headless,
    ignoreDefaultArgs: [
      // Don't pop up "Chrome is being controlled by automated software"
      '--enable-automation',
      // Unsupported flag that pops up a warning
      '--enable-blink-features=IdleDetection',
    ],
    args: [
      // Don't pop up "Chrome is not your default browser"
      '--no-default-browser-check',
    ],
  });
  const browserWSEndpoint = browserInstance.wsEndpoint();
  process.send({ browserWSEndpoint });
  browserInstance.on('disconnected', () => process.exit());
});
