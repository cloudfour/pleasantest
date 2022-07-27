/**
 * Manages asynchronous calls within withBrowser.
 * If any async calls are "left over" when withBrowser finishes executing,
 * then that means the user forgot to await the async calls,
 * so we should throw an error that indicates that.
 */

import { removeFuncFromStackTrace } from './utils.js';

/**
 * Set of all active async hook trackers
 * We need to store this module-level so that jest-dom matchers and getAccessibilityTree
 * can know which withBrowser they "belong" to
 * If there are multiple active at a time, the jest-dom matchers won't include the forgot-await behavior.
 */
export const activeAsyncHookTrackers = new Set<AsyncHookTracker>();

export interface AsyncHookTracker {
  addHook<T>(
    func: () => Promise<T>,
    captureFunction: (...args: any[]) => any,
  ): Promise<T>;
  close(): Error | undefined;
}

export const createAsyncHookTracker = (): AsyncHookTracker => {
  const hooks = new Set<Error>();
  let isClosed = false;

  const addHook: AsyncHookTracker['addHook'] = async (
    func,
    captureFunction,
  ) => {
    const forgotAwaitError = new Error(
      'Cannot interact with browser after test finishes. Did you forget to await?',
    );
    removeFuncFromStackTrace(forgotAwaitError, captureFunction);
    hooks.add(forgotAwaitError);
    try {
      return await func();
    } catch (error) {
      // If we throw an error here and it _is_ closed,
      // there will be an unhandled rejection, ending the process, without a code frame.
      //
      // If it is closed, it is better to not throw an error because when close() was called,
      // we would have already noticed that there was an async hook and thrown an error there.
      // So, we only throw an error if it is open
      if (!isClosed) throw error;

      // This line has no runtime effect, it is just there to make TS OK
      // If someone forgot await and is using promise-wrapped values directly,
      // TS is already giving them useful error messages.
      // The `as never` here tells TS that we can ignore that sometimes this will return undefined
      return undefined as never;
    } finally {
      if (!isClosed) hooks.delete(forgotAwaitError);
    }
  };

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    activeAsyncHookTrackers.delete(asyncHookTracker);
    if (hooks.size > 0) return hooks[Symbol.iterator]().next().value as Error;
  };

  const asyncHookTracker: AsyncHookTracker = { addHook, close };
  activeAsyncHookTrackers.add(asyncHookTracker);
  return asyncHookTracker;
};
