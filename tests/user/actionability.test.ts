import { withBrowser } from 'test-mule';

describe('attached', () => {
  test(
    'user.isAttached returns true until element is removed',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<button>Hi</button>');
      const div = await screen.getByRole('button');
      expect(await user.isAttached(div)).toBe(true);
      await div.evaluate((el) => el.remove());
      expect(await user.isAttached(div)).toBe(false);
    }),
  );
});

describe('visible', () => {
  test(
    'visible element returns true for isVisible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<button>Hi</button>');
      const button = await screen.getByRole('button');
      expect(await user.isVisible(button)).toBe(true);
    }),
  );
  test(
    'non-attached element is not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<button>Hi</button>');
      const button = await screen.getByRole('button');
      await button.evaluate((el) => el.remove());
      expect(await user.isVisible(button)).toBe(false);
    }),
  );
  test(
    'opacity:0 is not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<button style="opacity:0">Hi</button>');
      const button = await screen.getByRole('button');
      expect(await user.isVisible(button)).toBe(false);
    }),
  );
  test(
    'width:0 is not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<div style="width:0">Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await user.isVisible(div)).toBe(false);
    }),
  );
  test(
    'height:0 is not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<div style="height:0">Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await user.isVisible(div)).toBe(false);
    }),
  );
  test(
    'display:none is not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<div style="display:none">Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await user.isVisible(div)).toBe(false);
    }),
  );
  test(
    'visibility:hidden is not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<div style="visibility:hidden">Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await user.isVisible(div)).toBe(false);
    }),
  );
  test(
    'hidden attribute is not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<div hidden>Hi</div>');
      const div = await screen.getByText('Hi');
      expect(await user.isVisible(div)).toBe(false);
    }),
  );
  test(
    'hiding parent makes child not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<div hidden><div>Hi</div></div>');
      const div = await screen.getByText('Hi');
      expect(await user.isVisible(div)).toBe(false);
    }),
  );
  test(
    'zero-size parent makes child not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<div style="width:0"><div>Hi</div></div>');
      const div = await screen.getByText('Hi');
      expect(await user.isVisible(div)).toBe(false);
    }),
  );
  test(
    'opacity:0 on parent makes child not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML('<div style="opacity:0"><div>Hi</div></div>');
      const div = await screen.getByText('Hi');
      expect(await user.isVisible(div)).toBe(false);
    }),
  );
});
