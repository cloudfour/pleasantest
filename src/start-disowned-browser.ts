import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as puppeteer from 'puppeteer';

process.on('message', async ({ browser, headless }) => {
  try {
    if (browser !== 'chromium')
      throw new Error(`unrecognized browser: ${browser}`);
    if (typeof headless !== 'boolean')
      throw new Error('headless must be a boolean');

    let userDataDir: string | undefined;
    if (browser === 'chromium') {
      userDataDir = await fs.mkdtemp(os.tmpdir() + path.sep);
      const prefs = JSON.stringify({
        devtools: {
          preferences: {
            'panel-selectedTab': JSON.stringify('console'),
            currentDockState: JSON.stringify('right'),
            'InspectorView.splitViewState': JSON.stringify({
              horizontal: { size: 600 },
              vertical: { size: 450 },
            }),
          },
        },
      });
      const prefsPath = path.join(userDataDir, 'Default', 'Preferences');
      await fs.mkdir(path.dirname(prefsPath), { recursive: true });
      await fs.writeFile(prefsPath, prefs);
    }

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
        '--disable-features=ChromeLabs', // Remove little beaker icon next to URL bar
      ],
      userDataDir,
    });
    const allPages = await browserInstance.pages();
    // Close startup page
    await Promise.all(allPages.map((p) => p.close()));
    const browserWSEndpoint = browserInstance.wsEndpoint();
    process.send!({ browserWSEndpoint });
    // eslint-disable-next-line @cloudfour/n/no-process-exit
    browserInstance.on('disconnected', () => process.exit());
  } catch (error) {
    process.send!({ error: error.message });
  }
});
