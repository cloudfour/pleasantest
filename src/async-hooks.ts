/**
 * Manages asynchronous calls within withBrowser.
 * If any async calls are "left over" when withBrowser finishes executing,
 * then that means the user forgot to await the async calls,
 * so we should throw an error that indicates that.
 */

import { removeFuncFromStackTrace } from './utils';

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
  ): Promise<T | undefined>;
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
      if (!isClosed) throw error;
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
