import type { ElementHandle, JSHandle, Page } from 'puppeteer';
import type { AsyncHookTracker } from './async-hooks';
import { createClientRuntimeServer } from './module-server/client-runtime-server';
import {
  assertElementHandle,
  jsHandleToArray,
  removeFuncFromStackTrace,
} from './utils';

export interface PleasantestUser {
  /** Clicks an element, if the element is visible and not covered by another element */
  click(
    element: ElementHandle | null,
    options?: { force?: boolean },
  ): Promise<void>;
  /** Types text into an element, if the element is visible. The element must be an `<input>` or `<textarea>` or have `[contenteditable]`. */
  type(
    element: ElementHandle | null,
    text: string,
    options?: { delay?: number; force?: boolean },
  ): Promise<void>;
  /** Clears a text input's value, if the element is visible. The element must be an `<input>` or `<textarea>`. */
  clear(
    element: ElementHandle | null,
    options?: { force?: boolean },
  ): Promise<void>;
  /** Selects the specified option(s) of a <select> or a <select multiple> element. Values can be passed as either strings (option values) or as ElementHandle references to elements. */
  selectOptions(
    element: ElementHandle | null,
    values: ElementHandle | ElementHandle[] | string[] | string,
    options?: { force?: boolean },
  ): Promise<void>;
}

/** Wraps each user method to catch errors that happen when user forgets to await */
const wrapWithForgotAwait = (
  user: PleasantestUser,
  asyncHookTracker: AsyncHookTracker,
) => {
  for (const key of Object.keys(user) as (keyof PleasantestUser)[]) {
    const original = user[key];
    // eslint-disable-next-line @cloudfour/unicorn/consistent-function-scoping
    const wrapper = async (...args: any[]) =>
      // The await is necessary so `wrapper` is in the stack trace,
      // so captureStackTrace works correctly
      // eslint-disable-next-line no-return-await
      await asyncHookTracker.addHook<any>(
        () => (original as any)(...args),
        wrapper,
      );

    user[key] = wrapper;
  }
};

export const pleasantestUser = async (
  page: Page,
  asyncHookTracker: AsyncHookTracker,
) => {
  const { port } = await createClientRuntimeServer();
  const runWithUtils = <Args extends any[], Return extends unknown>(
    fn: (userUtil: typeof import('./user-util'), ...args: Args) => Return,
  ): ((...args: Args) => Promise<Return>) =>
    new Function(
      '...args',
      `return import("http://localhost:${port}/@pleasantest/user-util")
      .then((utils) => {
        try {
          return [utils, (0, ${fn.toString()})(utils, ...args)]
        } catch (error) {
          if (error.error) error = error.error
          return [utils, { error }]
        }
      })
      .then(([utils, result]) => {
        if (result && typeof result === 'object' && result.error) {
          const msgWithLiveEls = result.error
          if (typeof msgWithLiveEls === 'string') return { error: msgWithLiveEls }
          const msgWithStringEls = msgWithLiveEls
            .map(el => {
              if (el instanceof Element || el instanceof Document)
                return utils.printElement(el)
              return el
            })
            .join('')
          return { error: { msgWithLiveEls, msgWithStringEls } }
        }
        return result
      })`,
    ) as any;

  const user: PleasantestUser = {
    async click(el, { force = false } = {}) {
      assertElementHandle(el, user.click);
      await el
        .evaluateHandle(
          runWithUtils((utils, clickEl, force: boolean) => {
            utils.assertAttached(clickEl);
            if (!force) {
              utils.assertVisible(clickEl);
              const clickElRect = clickEl.getBoundingClientRect();
              // See if there is an element covering the center of the click target element
              const coveringEl = document.elementFromPoint(
                Math.floor(clickElRect.x + clickElRect.width / 2),
                Math.floor(clickElRect.y + clickElRect.height / 2),
              )!;
              if (coveringEl === clickEl || clickEl.contains(coveringEl))
                return;
              // TODO: try to find other points on the element that are clickable,
              // in case the covering element does not cover the whole click-target element
              return utils.error`Could not click element:
${clickEl}

Element was covered by:
${coveringEl}`;
            }
          }),
          force,
        )
        .then(throwBrowserError(user.click));
      await el.click();
    },

    // Implementation notes:
    // - *Appends* to existing text - different from some other tools:
    //   Puppeteer and Playwright *Prepend*
    //   Cypress and user-event *Append*
    // - The names of the commands in curly brackets are mirroring the user-event command names
    //   *NOT* the Cypress names.
    //   i.e. Cypress uses {leftarrow} but user-event and pleasantest use {arrowleft}
    async type(el, text, { delay = 1, force = false } = {}) {
      assertElementHandle(el, user.type);

      // Splits input into chunks
      // i.e. "something{backspace}something{enter} "
      // => ["something", "{backspace}", "something", "{enter}"]
      const chunks: string[] = [];
      while (text) {
        text = text.startsWith('{')
          ? text.replace(/^{[^{}]*}/, (substr) => {
              chunks.push(substr.toLowerCase());
              return '';
            })
          : text.replace(/^[^{]*/, (substr) => {
              chunks.push(substr);
              return '';
            });
      }

      await el
        .evaluateHandle(
          runWithUtils((utils, el, force: boolean) => {
            utils.assertAttached(el);
            if (!force) utils.assertVisible(el);
            if (
              el instanceof HTMLInputElement ||
              el instanceof HTMLTextAreaElement
            ) {
              // No need to focus it if it is already focused
              // We won't move the cursor to the end either because that could be unexpected
              if (document.activeElement === el) return;
              el.focus();
              // Move cursor to the end
              const end = el.value.length;
              el.setSelectionRange(end, end);
            } else if (el instanceof HTMLElement && el.isContentEditable) {
              // No need to focus it if it is already focused
              // We won't move the cursor to the end either because that could be unexpected
              if (document.activeElement === el) return;
              el.focus();
              const range = el.ownerDocument.createRange();
              range.selectNodeContents(el);
              const end = el.textContent!.length;
              range.setStart(el.firstChild!, end);
              range.setEnd(el.firstChild!, end);
              // Move cursor to the end
              const sel = el.ownerDocument.getSelection()!;
              sel.removeAllRanges();
              sel.addRange(range);
            } else {
              return utils.error`Cannot type in element that is not typeable:
${el}
Element must be an <input> or <textarea> or an element with the contenteditable attribute.`;
            }
          }),
          force,
        )
        .then(throwBrowserError(user.type));
      for (const chunk of chunks) {
        const key = typeCommandsMap[chunk];
        if (key) {
          await page.keyboard.press(key, { delay });
        } else if (chunk === '{selectall}') {
          await el
            .evaluateHandle(
              runWithUtils((utils, el) => {
                if (
                  el instanceof HTMLInputElement ||
                  el instanceof HTMLTextAreaElement
                ) {
                  el.select();
                } else {
                  return utils.error`{selectall} command is only available for <input> and <textarea> elements, received: ${el}`;
                }
              }),
            )
            .then(throwBrowserError(user.type));
        } else {
          await page.keyboard.type(chunk, { delay });
        }
      }
    },
    async clear(el, { force = false } = {}) {
      assertElementHandle(el, () => user.clear);
      await el
        .evaluateHandle(
          runWithUtils((utils, el, force: boolean) => {
            utils.assertAttached(el);
            if (!force) utils.assertVisible(el);
            if (
              el instanceof HTMLInputElement ||
              el instanceof HTMLTextAreaElement
            ) {
              el.select();
            } else {
              return utils.error`user.clear is only available for <input> and <textarea> elements, received: ${el}`;
            }
          }),
          force,
        )
        .then(throwBrowserError(user.clear));
      await page.keyboard.press('Backspace');
    },
    async selectOptions(el, values, { force = false } = {}) {
      assertElementHandle(el, user.selectOptions);
      const valuesArray = Array.isArray(values) ? values : [values];
      for (const value of valuesArray) {
        // Make sure all values are strings or ElementHandles
        if (typeof value !== 'string') {
          assertElementHandle(
            value,
            user.selectOptions,
            'values must be a string or ElementHandle or array of either of those.',
          );
        }
      }

      const valuesArrayHandle = await el
        .evaluateHandle(
          runWithUtils(
            (
              utils,
              el,
              force: boolean,
              ...valuesArray: (string | ElementHandle)[]
            ) => {
              utils.assertAttached(el);
              if (!force) utils.assertVisible(el);
              if (!(el instanceof HTMLSelectElement))
                return utils.error`user.selectOptions is only available for <select> elements, received: ${el}`;
              if (valuesArray.length > 1 && !el.multiple)
                return utils.error`Cannot select multiple options on a <select> element without the \`multiple\` attribute:\n\n${el}`;

              const validOptions = new Set(
                [...el.options].map((el) => el.value),
              );

              return valuesArray.map((value) => {
                if (value instanceof HTMLOptionElement) {
                  if (
                    !validOptions.has(value.value) ||
                    ![...el.options].includes(value)
                  ) {
                    throw utils.error`Could not select an option ${value}, it is not one of the valid options in the <select>. Valid options are: ${JSON.stringify(
                      [...validOptions],
                    )}`;
                  }

                  return value.value;
                }

                if (!validOptions.has(value as string))
                  throw utils.error`Could not select an option ${JSON.stringify(
                    value as string,
                  )}, it is not one of the valid options in the <select>. Valid options are: ${JSON.stringify(
                    [...validOptions],
                  )}`;

                return value;
              });
            },
          ),
          force,
          ...(valuesArray as any),
        )
        .then(throwBrowserError(user.selectOptions));

      await el.select(...((await valuesArrayHandle.jsonValue()) as any));
    },
  };
  wrapWithForgotAwait(user, asyncHookTracker);
  return user;
};

// Note: command chunks are already lowercased so it is not case-sensitive
// left side: command
// right side: passed to pptr keyboard.press, full list at https://github.com/puppeteer/puppeteer/blob/main/src/common/USKeyboardLayout.ts
const typeCommandsMap: Record<string, string> = {
  '{enter}': 'Enter',
  '{arrowleft}': 'ArrowLeft',
  '{arrowright}': 'ArrowRight',
  '{arrowup}': 'ArrowLeft',
  '{arrowdown}': 'ArrowDown',
  '{tab}': 'Tab',
  '{backspace}': 'Backspace',
  '{del}': 'Delete',
};

/**
 * When code that is evaluated in the browser returns {error: ...}, this function causes an error to be thrown in Node.
 * This is better than just throwing directly from the browser code because that would cause the error to be wrapped by Puppeteer's EvaluationError, which causes a confusing stack trace.
 */
const throwBrowserError =
  (func: (...params: any) => any) => async (result: JSHandle) => {
    const resultJSON = (await result.jsonValue()) as any;
    if (resultJSON?.error) {
      let err;
      if (typeof resultJSON.error === 'string') {
        err = new Error(resultJSON.error);
      } else {
        const errorProp = await result.getProperty('error');
        const errorProperties = Object.fromEntries(
          await errorProp.getProperties(),
        );
        if (
          // eslint-disable-next-line @cloudfour/typescript-eslint/no-unnecessary-condition
          errorProperties.msgWithStringEls &&
          // eslint-disable-next-line @cloudfour/typescript-eslint/no-unnecessary-condition
          errorProperties.msgWithLiveEls
        ) {
          err = new Error(
            (await errorProperties.msgWithStringEls.jsonValue()) as any,
          );
          // @ts-expect-error messageForBrowser is a custom thing
          err.messageForBrowser = await jsHandleToArray(
            errorProperties.msgWithLiveEls,
          );
        } else {
          err = new Error((await errorProp.jsonValue()) as any);
        }
      }

      removeFuncFromStackTrace(err, func);
      throw err;
    }

    return result;
  };
