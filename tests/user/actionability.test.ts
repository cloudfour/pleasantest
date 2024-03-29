import path from 'node:path';

import { withBrowser } from 'pleasantest';
import type { ElementHandle } from 'puppeteer';

import {
  cleanupClientRuntimeServer,
  createClientRuntimeServer,
} from '../../src/module-server/client-runtime-server.js';
import { printColorsInErrorMessages } from '../../src/utils.js';

const runWithUtils = async <Args extends any[], Return>(
  fn: (
    userUtil: typeof import('../../src/user-util/index.js'),
    ...args: Args
  ) => Return,
): Promise<(...args: Args) => Promise<Return>> => {
  const { port } = await createClientRuntimeServer(
    path.join(process.cwd(), 'dist'),
  );
  return new Function(
    '...args',
    `return import("http://localhost:${port}/@pleasantest/user-util")
    .then((utils) => [utils, (0, ${fn.toString()})(utils, ...args)])
    .then(([utils, result]) => {
      if (result && typeof result === 'object' && result.error) {
        const msgWithLiveEls = result.error
        if (typeof msgWithLiveEls === 'string') return { error: msgWithLiveEls }
        const msgWithStringEls = msgWithLiveEls
          .map(el => {
            if (el instanceof Element || el instanceof Document)
              return utils.printElement(el, ${printColorsInErrorMessages})
            return el
          })
          .join('')
        return { error: { msgWithLiveEls, msgWithStringEls } }
      }
      return result
    })`,
  ) as any;
};

const isAttached = async (el: ElementHandle) =>
  el.evaluate(
    await runWithUtils((utils, clickEl) => {
      try {
        utils.assertAttached(clickEl);
        return true;
      } catch {
        return false;
      }
    }),
  );

const isVisible = async (el: ElementHandle) =>
  el.evaluate(
    await runWithUtils((utils, clickEl) => {
      try {
        utils.assertVisible(clickEl);
        return true;
      } catch {
        return false;
      }
    }),
  );

describe('attached', () => {
  test(
    'isAttached returns true until element is removed',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<button>Hi</button>');
      const div = await screen.getByRole('button');
      expect(await isAttached(div)).toBe(true);
      await div.evaluate((el) => el.remove());
      expect(await isAttached(div)).toBe(false);
    }),
  );
});

describe('visible', () => {
  test(
    'visible element returns true for isVisible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<button>Hi</button>');
      const button = await screen.getByRole('button');
      expect(await isVisible(button)).toBe(true);
    }),
  );
  test(
    'non-attached element is not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<button>Hi</button>');
      const button = await screen.getByRole('button');
      await button.evaluate((el) => el.remove());
      expect(await isVisible(button)).toBe(false);
    }),
  );
  test(
    'opacity:0 is not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<button style="opacity:0">Hi</button>');
      const button = await screen.getByRole('button');
      expect(await isVisible(button)).toBe(false);
    }),
  );
  test(
    'width:0 is not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<div style="width:0">Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await isVisible(div)).toBe(false);
    }),
  );
  test(
    'height:0 is not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<div style="height:0">Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await isVisible(div)).toBe(false);
    }),
  );
  test(
    'display:none is not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<div style="display:none">Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await isVisible(div)).toBe(false);
    }),
  );
  test(
    'visibility:hidden is not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<div style="visibility:hidden">Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await isVisible(div)).toBe(false);
    }),
  );
  test(
    'hidden attribute is not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<div hidden>Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await isVisible(div)).toBe(false);
    }),
  );
  test(
    'hiding parent makes child not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<div hidden><div>Hi</div></div>');
      const div = await screen.getByText('Hi');
      expect(await isVisible(div)).toBe(false);
    }),
  );
  test(
    'zero-size parent makes child not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<div style="width:0"><div>Hi</div></div>');
      const div = await screen.getByText('Hi');
      expect(await isVisible(div)).toBe(false);
    }),
  );
  test(
    'opacity:0 on parent makes child not visible',
    withBrowser(async ({ utils, screen }) => {
      await utils.injectHTML('<div style="opacity:0"><div>Hi</div></div>');
      const div = await screen.getByText('Hi');
      expect(await isVisible(div)).toBe(false);
    }),
  );
});

afterAll(async () => {
  await cleanupClientRuntimeServer();
});
