import { Console } from 'node:console';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import _ansiRegex from 'ansi-regex';
import { parseStackTrace } from 'errorstacks';
import { bgRed, bold, options as koloristOpts, red, white } from 'kolorist';
import * as puppeteer from 'puppeteer';

import { ansiColorsLog } from './ansi-colors-browser.js';
import type { AsyncHookTracker } from './async-hooks.js';
import { createAsyncHookTracker } from './async-hooks.js';
import { connectToBrowser } from './connect-to-browser.js';
import { createBuildStatusTracker } from './module-server/build-status-tracker.js';
import { cleanupClientRuntimeServer } from './module-server/client-runtime-server.js';
import type { ModuleServerOpts } from './module-server/index.js';
import { createModuleServer } from './module-server/index.js';
import type { BoundQueries, WaitForOptions } from './pptr-testing-library.js';
import {
  getQueriesForElement,
  waitFor as innerWaitFor,
} from './pptr-testing-library.js';
import { sourceMapErrorFromBrowser } from './source-map-error-from-browser.js';
import type { PleasantestUser, UserOpts } from './user.js';
import { pleasantestUser } from './user.js';
import { assertElementHandle } from './utils.js';

import './extend-expect.js';

export { JSHandle, ElementHandle } from 'puppeteer';
koloristOpts.enabled = true;
const ansiRegex = _ansiRegex({ onlyFirst: true });

export interface PleasantestUtils {
  /**
   * Execute a JS code string in the browser.
   * The code string inherits the syntax abilities of the file it is in,
   * i.e. if your test file is a .tsx file, then the code string can include JSX and TS.
   * The code string can use (static or dynamic) ES6 imports to import other modules,
   * including TS/JSX modules, and it supports resolving from node_modules,
   * and relative paths from the test file.
   * The code string supports top-level await to wait for a Promise to resolve.
   * You can pass an array of variables to be passed into the browser as the 2nd parameter.
   */
  runJS<Module extends Record<string, unknown>>(
    code: string,
    args?: unknown[],
  ): Promise<{ [Export in keyof Module]: puppeteer.JSHandle<Module[Export]> }>;

  /** Set the contents of a new style tag */
  injectCSS(css: string): Promise<void>;

  /** Set the contents of document.body */
  injectHTML(
    html: string,
    opts?: { executeScriptTags?: boolean },
  ): Promise<void>;

  /** Load a CSS (or Sass, Less, etc.) file into the browser. Pass a path that will be resolved from your test file. */
  loadCSS(cssPath: string): Promise<void>;
  /** Load a JS (or TS, JSX) file into the browser. Pass a path that will be resolved from your test file. */
  loadJS(jsPath: string): Promise<void>;
}

export interface PleasantestContext {
  /** DOM Testing Library queries that are bound to the document */
  screen: BoundQueries;
  utils: PleasantestUtils;
  /** Returns DOM Testing Library queries that only search within a single element */
  within(element: puppeteer.ElementHandle | null): BoundQueries;
  page: puppeteer.Page;
  user: PleasantestUser;
  waitFor: <T>(cb: () => T | Promise<T>, opts?: WaitForOptions) => Promise<T>;
}

export interface WithBrowserOpts {
  headless?: boolean;
  device?: puppeteer.Device;
  moduleServer?: ModuleServerOpts;
  user?: UserOpts;
}

interface TestFn {
  (ctx: PleasantestContext): boolean | void | Promise<boolean | void>;
}

interface WithBrowserFn {
  (testFn: TestFn): () => Promise<void>;
  (options: WithBrowserOpts, testFn: TestFn): () => Promise<void>;
}

interface WithBrowser extends WithBrowserFn {
  headed: WithBrowserFn;
}

// Call signatures of withBrowser:
// withBrowser(() => {})
// withBrowser({ ... }, () => {})
// withBrowser.headed(() => {})
// withBrowser.headed({ ... }, () => {})

export const withBrowser: WithBrowser = (...args: any[]) => {
  const testFn: TestFn = args.length === 1 ? args[0] : args[1];
  const options: WithBrowserOpts = args.length === 1 ? {} : args[0];
  const thisFile = fileURLToPath(import.meta.url);
  // Figure out the file that called withBrowser so that we can resolve paths correctly from there
  // eslint-disable-next-line @cloudfour/unicorn/error-message
  const stack = parseStackTrace(new Error().stack as string).map(
    (stackFrame) => {
      if (stackFrame.fileName) return stackFrame.fileName;
      return /\s*at\s+([\w./-]*)/.exec(stackFrame.raw)?.[1];
    },
  );
  const testFile = stack.find((stackItem) => {
    if (!stackItem) return false;
    // ignore if it is the current file
    if (stackItem === thisFile) return false;
    // ignore if it is an internal-to-node thing
    if (!stackItem.startsWith('/')) return false;
    // Find the first item that is not the current file
    return true;
  });

  const testPath = testFile ? relative(process.cwd(), testFile) : thisFile;

  return async () => {
    const { cleanupServer, asyncHookTracker, ...ctx } = await createTab({
      testPath,
      options,
    });
    const cleanup = async (leaveOpen: boolean) => {
      if (!leaveOpen || options.headless) {
        await ctx.page.close();
      }

      ctx.page.browser().disconnect();
      await cleanupServer();
    };

    try {
      await testFn(ctx);
      const forgotAwaitError = asyncHookTracker.close();
      if (forgotAwaitError) throw forgotAwaitError;
    } catch (error) {
      const forgotAwaitError = asyncHookTracker.close();
      if (forgotAwaitError) {
        await cleanup(false);
        throw forgotAwaitError;
      }
      const messageForBrowser:
        | undefined
        | (Element | string | number | boolean)[] =
        // This is how we attach the elements to the error from testing-library
        error?.messageForBrowser ||
        // This is how we attach the elements to the error from jest-dom
        error?.matcherResult?.messageForBrowser;
      // Jest hangs when sending the error
      // from the worker process up to the main process
      // if the error has circular references in it
      // (which it does if there are elementHandles)
      if (error.matcherResult) delete error.matcherResult.messageForBrowser;
      delete error.messageForBrowser;
      if (!options.headless) {
        const failureMessage: unknown[] = [
          `${bold(white(bgRed(' FAIL ')))}\n\n`,
        ];
        const testName = getTestName();
        if (testName) {
          failureMessage.push(`${bold(red(`● ${testName}`))}\n\n`);
        }

        if (messageForBrowser) {
          // Combine adjacent string chunks
          // So the browser does not insert extra line breaks/indents between the lines
          const normalizedMessageForBrowser = messageForBrowser.reduce(
            (acc, chunk) => {
              if (
                typeof chunk !== 'object' &&
                acc.length > 0 &&
                typeof acc[acc.length - 1] === 'string'
              )
                acc[acc.length - 1] += String(chunk);
              else acc.push(typeof chunk === 'object' ? chunk : String(chunk));
              return acc;
            },
            [] as (string | Element)[],
          );
          failureMessage.push(
            ...normalizedMessageForBrowser.map((segment, i) => {
              if (typeof segment !== 'string') return segment;
              if (
                i !== 0 &&
                typeof normalizedMessageForBrowser[i - 1] !== 'string'
              ) {
                return indent(segment, false);
              }

              return indent(segment);
            }),
          );
        } else {
          failureMessage.push(
            indent(error instanceof Error ? error.message : String(error)),
          );
        }

        await ctx.page.evaluate((...colorErr) => {
          console.log(...colorErr);
        }, ...(ansiColorsLog(...failureMessage) as any));
      }

      await cleanup(true);
      throw error;
    }

    await cleanup(false);
  };
};

withBrowser.headed = (...args: any[]) => {
  const testFn: TestFn = args.length === 1 ? args[0] : args[1];
  const options: WithBrowserOpts = args.length === 1 ? {} : args[0];
  return withBrowser({ ...options, headless: false }, testFn);
};

const getTestName = () => {
  try {
    return expect.getState().currentTestName;
  } catch {
    return null;
  }
};

const indent = (input: string, indentFirstLine = true) =>
  input
    .split('\n')
    .map((line, i) => {
      if (!indentFirstLine && i === 0) return line;
      // If there is an escape code at the beginning of the line
      // put the tab after the escape code
      // the reason for this is to prevent the indentation from getting messed up from wrapping
      // you can see this if you squish the devtools window
      const match = ansiRegex.exec(line);
      if (!match || match.index !== 0) return `  ${line}`;
      const insertPoint = match[0].length;
      return `${line.slice(0, insertPoint)}  ${line.slice(insertPoint)}`;
    })
    .join('\n');

const createTab = async ({
  testPath,
  options: {
    headless = defaultOptions.headless ?? true,
    device = defaultOptions.device,
    moduleServer: moduleServerOpts = {},
    user: userOpts = {},
  },
}: {
  testPath: string;
  options: WithBrowserOpts;
}): Promise<
  PleasantestContext & {
    cleanupServer: () => Promise<void>;
    asyncHookTracker: AsyncHookTracker;
  }
> => {
  const asyncHookTracker = createAsyncHookTracker();
  const browser = await connectToBrowser('chromium', headless);
  const browserContext = await browser.createIncognitoBrowserContext();
  const page = await browserContext.newPage();
  const {
    requestCache,
    port,
    close: closeServer,
  } = await createModuleServer({
    ...defaultOptions.moduleServer,
    ...moduleServerOpts,
    ...defaultOptions.moduleServer,
    ...moduleServerOpts,
  });

  if (device) {
    if (!headless) {
      const session = await page.target().createCDPSession();
      const { windowId } = (await session.send(
        'Browser.getWindowForTarget',
      )) as any;
      await session.send('Browser.setWindowBounds', {
        windowId,
        bounds: {
          // Allow space for devtools
          // start-disowned-browser.ts sets the devtools preferences with default width
          width: device.viewport.width + 450,
          height: device.viewport.height + 79, // Allow space for toolbar
        },
      });
      await session.detach();
    }

    await page.emulate(device);
  }

  page.on('console', (message) => {
    const text = message.text();
    // This is naive, there is probably something better to check
    // If the text includes %c, then it probably came from the jest output being forwarded into the browser
    // So we don't need to print it _again_ in node, since it already came from node
    if (text.includes('%c')) return;
    // This is intended so that transpilation errors from the module server,
    // which will get a nice code frame in node,
    // do not also log "Failed to load resource: the server responded with a status of 500"
    if (
      /Failed to load resource: the server responded with a status of 500/.test(
        text,
      ) &&
      message.location().url?.includes(`http://localhost:${port}`)
    )
      return;
    const type = message.type();
    // Create a new console instance instead of using the global one
    // Because the global one is overridden by Jest, and it adds a misleading second stack trace and code frame below it
    const console = new Console(process.stdout, process.stderr);
    if (type === 'error') {
      const error = new Error(text);
      const location = message.location();
      error.stack = `Error: ${text}
    at ${location.url}`;
      console.error('[browser]', error);
    } else {
      console.log('[browser]', text);
    }
  });

  await page.goto(`http://localhost:${port}`);

  // eslint-disable-next-line @cloudfour/typescript-eslint/ban-types
  const functionArgs: Function[] = [];

  const runJS: PleasantestUtils['runJS'] = (code, args) =>
    asyncHookTracker.addHook(async () => {
      await page
        .exposeFunction('_pleasantestCallFunction', (id: any, args: any) =>
          functionArgs[id](...args),
        )
        .catch((error) => {
          if (!error.message.includes('already exists')) throw error;
        });
      // For some reason encodeURIComponent doesn't encode '
      const encodedCode = encodeURIComponent(code).replace(/'/g, '%27');
      const buildStatus = createBuildStatusTracker();

      const argsWithFuncsAsObjs = args?.map((arg) => {
        if (typeof arg === 'function') {
          const id = functionArgs.push(arg) - 1;
          return { isFunction: true, id };
        }
        return arg;
      });

      // This uses the testPath as the url so that if there are relative imports
      // in the inline code, the relative imports are resolved relative to the test file
      const url = `http://localhost:${port}/${testPath}?inline-code=${encodedCode}&build-id=${buildStatus.buildId}`;

      const outputHandle = await page.evaluateHandle(
        new Function(
          '...args',
          `
          const argsWithFuncs = args.map(arg => {
            if (typeof arg === 'object' && arg?.isFunction) {
              return async (...args) => {
                return await window._pleasantestCallFunction(arg.id, args);
              }
            }
            return arg
          })
          window._pleasantestArgs = argsWithFuncs;
          return import(${JSON.stringify(url)})
            .then(async mod => {
              window._pleasantestArgs = undefined;
              return { success: true, result: { ...mod } }
            })
            .catch(e => ({
              success: false,
              result: e instanceof Error ? { message: e.message, stack: e.stack } : e
            }))`,
        ) as () => any,
        ...(Array.isArray(argsWithFuncsAsObjs)
          ? (argsWithFuncsAsObjs as any)
          : []),
      );

      const { success, result } = Object.fromEntries(
        await outputHandle.getProperties(),
      );

      const errorsFromBuild = buildStatus.complete();
      // It only throws the first one but that is probably OK
      if (errorsFromBuild) throw errorsFromBuild[0];

      if (await success.jsonValue())
        return Object.fromEntries(await result.getProperties()) as any;
      await sourceMapErrorFromBrowser(
        await result.jsonValue(),
        requestCache,
        port,
        runJS,
      );
      throw await result.jsonValue();
    }, runJS);

  const injectHTML: PleasantestUtils['injectHTML'] = (
    html,
    { executeScriptTags = true } = {},
  ) =>
    asyncHookTracker.addHook(
      () =>
        page.evaluate(
          (html, executeScriptTags) => {
            document.body.innerHTML = html;
            if (executeScriptTags) {
              // Scripts injected with innerHTML are not executed by default;
              // To get the browser to execute them we must manually create the script tags
              // and replace them
              const scripts = document.body.querySelectorAll('script');
              for (const script of scripts) {
                const newScript = document.createElement('script');
                newScript.text = script.innerHTML;
                for (const attribute of script.attributes) {
                  newScript.setAttribute(attribute.name, attribute.value);
                }
                script.replaceWith(newScript);
              }
            }
          },
          html,
          executeScriptTags,
        ),
      injectHTML,
    );

  const injectCSS: PleasantestUtils['injectCSS'] = (css) =>
    asyncHookTracker.addHook(
      () =>
        page.evaluate((css) => {
          const styleTag = document.createElement('style');
          styleTag.innerHTML = css;
          document.head.append(styleTag);
        }, css),
      injectCSS,
    );

  const loadCSS: PleasantestUtils['loadCSS'] = (cssPath) =>
    asyncHookTracker.addHook(async () => {
      const fullPath = isAbsolute(cssPath)
        ? relative(process.cwd(), cssPath)
        : join(dirname(testPath), cssPath);
      await page.evaluate(
        `import(${JSON.stringify(
          `http://localhost:${port}/${fullPath}?import`,
        )})`,
      );
    }, loadCSS);

  const loadJS: PleasantestUtils['loadJS'] = (jsPath) =>
    asyncHookTracker.addHook(async () => {
      const fullPath = jsPath.startsWith('.')
        ? join(dirname(testPath), jsPath)
        : jsPath;
      const buildStatus = createBuildStatusTracker();
      const url = `http://localhost:${port}/${fullPath}?build-id=${buildStatus.buildId}`;
      const res = await page.evaluate(
        `import(${JSON.stringify(url)})
          .then(mod => {})
          .catch(e => e instanceof Error
            ? { message: e.message, stack: e.stack }
            : e)`,
      );

      const errorsFromBuild = buildStatus.complete();
      // It only throws the first one but that is probably OK
      if (errorsFromBuild) throw errorsFromBuild[0];

      await sourceMapErrorFromBrowser(res, requestCache, port, loadJS);
    }, loadJS);

  const utils: PleasantestUtils = {
    runJS,
    injectCSS,
    injectHTML,
    loadCSS,
    loadJS,
  };

  const screen = getQueriesForElement(page, asyncHookTracker);

  // The | null is so you can pass directly the result of page.$() which returns null if not found
  const within: PleasantestContext['within'] = (
    element: puppeteer.ElementHandle | null,
  ) => {
    assertElementHandle(element, within);
    return getQueriesForElement(page, asyncHookTracker, element);
  };

  const waitFor: PleasantestContext['waitFor'] = (
    cb,
    opts: WaitForOptions = {},
  ) => innerWaitFor(page, asyncHookTracker, cb, opts, waitFor);

  return {
    screen,
    utils,
    page,
    within,
    waitFor,
    user: await pleasantestUser(page, asyncHookTracker, {
      ...defaultOptions.user,
      ...userOpts,
    }),
    asyncHookTracker,
    cleanupServer: () => closeServer(),
  };
};

let defaultOptions: WithBrowserOpts = {};

export const configureDefaults = (options: WithBrowserOpts) => {
  defaultOptions = options;
};

export const devices = puppeteer.devices;

afterAll(async () => {
  await cleanupClientRuntimeServer();
});

export {
  getAccessibilityTree,
  accessibilityTreeSnapshotSerializer,
} from './accessibility/index.js';

export { makeCallableJSHandle } from './utils.js';
export { type PleasantestUser } from './user.js';
export { type WaitForOptions } from './pptr-testing-library.js';
