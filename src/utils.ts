import * as kolorist from 'kolorist';
import type { ElementHandle, JSHandle } from 'puppeteer';

type Promisify<T> = T extends Promise<any> ? T : Promise<T>;
type JSHandleify<T> = T extends JSHandle<any> ? T : JSHandle<T>;

/**
 * Wraps a JSHandle that points to a function in a browser,
 * with a node function that calls the corresponding browser function,
 * passing along the parameters,
 * and returning the return value wrapped in `Promise<JSHandle<T>>`
 */
export const makeCallableJSHandle = <
  BrowserFunction extends (...args: any[]) => any,
>(
  browserFunction: JSHandle<BrowserFunction>,
): ((
  ...args: Parameters<BrowserFunction>
) => Promisify<JSHandleify<ReturnType<BrowserFunction>>>) => {
  return (...args) =>
    browserFunction.evaluateHandle(
      (browserFn, ...args) => browserFn(...args),
      ...args,
    ) as any;
};

export const jsHandleToArray = async (arrayHandle: JSHandle) => {
  const properties = await arrayHandle.getProperties();
  const arr = Array.from({ length: properties.size });
  for (const [i, valHandle] of properties.entries()) {
    // Change primitives to live values rather than JSHandles
    const val = await valHandle.jsonValue().catch(() => valHandle);
    arr[Number(i)] = typeof val === 'object' ? valHandle : val;
  }

  return arr;
};

export const isPromise = <T>(
  input: unknown | Promise<T>,
): input is Promise<T> => Promise.resolve(input) === input; // https://stackoverflow.com/questions/27746304/how-do-i-tell-if-an-object-is-a-promise/38339199#38339199

export const isElementHandle = (input: unknown): input is ElementHandle => {
  if (typeof input !== 'object' || !input) return false;
  return (input as any).asElement?.() === input;
};

export const isJSHandle = (input: unknown): input is JSHandle => {
  if (typeof input !== 'object' || !input) return false;
  return 'asElement' in input;
};

export const assertElementHandle: (
  input: unknown,
  fn: (...params: any[]) => any,
  messageStart?: string,
) => asserts input is ElementHandle = (
  input,
  fn,
  messageStart = `element parameter must be an ElementHandle\n\n`,
) => {
  const type =
    input === null ? 'null' : isPromise(input) ? 'Promise' : typeof input;

  if (type === 'Promise') {
    throw removeFuncFromStackTrace(
      new Error(`${messageStart}Received Promise. Did you forget await?`),
      fn,
    );
  }

  if (!isElementHandle(input)) {
    // If it is a JSHandle, that points to something _other_ than an element
    if (isJSHandle(input)) {
      throw removeFuncFromStackTrace(
        new Error(
          `${messageStart}Received a JSHandle that did not point to an element`,
        ),
        fn,
      );
    }

    throw removeFuncFromStackTrace(
      new Error(`${messageStart}Received ${type}`),
      fn,
    );
  }
};

export const changeErrorMessage = (
  error: Error,
  changeMessage: (originalMessage: string) => string,
) => {
  const newMessage = changeMessage(error.message);
  if (error.stack) error.stack = error.stack.replace(error.message, newMessage);
  error.message = newMessage;
  return error;
};

/**
 * Manipulate the stack trace and remove fn from it
 * That way jest will show a code frame from the user's code, not ours
 * https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
 */
export const removeFuncFromStackTrace = (
  error: Error,
  fn: (...params: any) => any,
) => {
  Error.captureStackTrace(error, fn);
  return error;
};

export const printStackLine = (
  path: string,
  line: number,
  column: number,
  fnName?: string,
) => {
  const location = fnName
    ? `${fnName} (${path}:${line}:${column})`
    : `${path}:${line}:${column}`;
  return `    at ${location}`;
};

export const printColorsInErrorMessages =
  // The PLEASANTEST_TESTING_ITSELF environment variable (set in jest.setup.ts)
  // allows us to detect whether PT is running in the context of its own tests
  // We use it to disable syntax-highlighting in printed HTML in error messages
  // so that the snapshots are more readable.
  // When PT is used outside of its own tests, the environment variable will not be set,
  // so the error messages will have syntax-highlighted HTML
  kolorist.options.enabled && process.env.PLEASANTEST_TESTING_ITSELF !== 'true';
