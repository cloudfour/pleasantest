import playwright from 'playwright';

type Browser = 'chromium' | 'firefox' | 'webkit';

process.on(
  'message',
  async ({ browser, headless }: { browser: Browser; headless: boolean }) => {
    if (browser !== 'chromium')
      throw new Error(`unrecognized browser: ${browser}`);
    if (typeof headless !== 'boolean')
      throw new Error('headless must be a boolean');

    const browserInstance = await playwright[browser].launchServer({
      headless,
      devtools: !headless,
      // ignoreDefaultArgs: [
      //   // Don't pop up "Chrome is being controlled by automated software"
      //   '--enable-automation',
      //   // Unsupported flag that pops up a warning
      //   '--enable-blink-features=IdleDetection',
      // ],
      // args: [
      //   // Don't pop up "Chrome is not your default browser"
      //   '--no-default-browser-check',
      // ],
    });

    // const allPages = await browserInstance.pages();
    // // close startup page
    // await Promise.all(allPages.map((p) => p.close()));
    const browserWSEndpoint = browserInstance.wsEndpoint();
    process.send!({ browserWSEndpoint });
    browserInstance.on('close', () => process.exit());
  },
);
