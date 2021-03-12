import type { ElementHandle, JSHandle } from 'puppeteer';

export const jsHandleToArray = async (arrayHandle: JSHandle) => {
  const properties = await arrayHandle.getProperties();
  const arr = new Array(properties.size);
  for (let i = 0; i < properties.size; i++) {
    const valHandle = properties.get(String(i));
    if (valHandle) {
      // Change primitives to live values rather than JSHandles
      const val = await valHandle.jsonValue();
      arr[i] = typeof val === 'object' ? valHandle : val;
    }
  }
  return arr;
};

export const assertElementHandle: (
  input: unknown,
  fn: (...params: any[]) => any,
  signature: string,
  varName: string,
) => asserts input is ElementHandle = (input, fn, signature, varName) => {
  const type =
    input === null
      ? 'null'
      : typeof input === 'object' && Promise.resolve(input) === input // https://stackoverflow.com/questions/27746304/how-do-i-tell-if-an-object-is-a-promise/38339199#38339199
      ? 'Promise'
      : typeof input;

  const messageStart = `${signature}

${varName} must be an ElementHandle\n\n`;
  if (type === 'Promise') {
    throw removeFuncFromStackTrace(
      new Error(messageStart + 'Received Promise. Did you forget await?'),
      fn,
    );
  }
  if (type !== 'object' || input === null || !(input as any).asElement) {
    throw removeFuncFromStackTrace(
      new Error(messageStart + `Received ${type}`),
      fn,
    );
  }
  // returns null if it is a JSHandle that does not point to an element
  const el = (input as JSHandle).asElement();
  if (!el) {
    throw removeFuncFromStackTrace(
      new Error(
        messageStart + 'Received a JSHandle that did not point to an element',
      ),
      fn,
    );
  }
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
  Error.captureStackTrace?.(error, fn);
  return error;
};
