import * as jestDom from '@testing-library/jest-dom/matchers';

const methods = Object.keys(jestDom);

expect.extend(
  Object.fromEntries(
    methods.map((methodName) => {
      /** @param {import('puppeteer').ElementHandle} elementHandle */
      const matcher = async function (elementHandle) {
        const ctxString = JSON.stringify(this);
        const result = await elementHandle.evaluateHandle(
          // using new Function to avoid babel transpiling the import
          // @ts-ignore
          new Function(
            'element',
            `return import("./jest-dom").then(jestDom => {
              const context = { ...(${ctxString}), ...jestDom.jestContext }
              const result = jestDom.${methodName}.call(context, element)
              if (result.pass === context.isNot) {
                window.__testMuleDebug__ = true
                const simplifiedMessage = result
                  .message()
                  .replace(/\\$\\$JEST_UTILS\\$\\$\\.([a-zA-Z]*)\\((.*?)\\)/g, '');
                console.error('matcher failed:', simplifiedMessage.trim() + '\\n', element)
              }
              return result
            })`,
          ),
          // the __testMuleDebug__ thing is a flag that is set in the browser global to keep it open, so that when the matcher fails it will mark the flag
          elementHandle,
        );
        const message = await result
          .evaluateHandle((matcherResult) => matcherResult.message())
          .then((m) => m.jsonValue());
        const final = {
          // @ts-ignore
          ...(await result.jsonValue()),
          message: () => deserialize(message, this),
        };

        return final;
      };
      return [methodName, matcher];
    }),
  ),
);

/**
 * @param {string} message
 * @param {jest.MatcherContext} context
 */
const deserialize = (message, context) => {
  return message.replace(
    /\$\$JEST_UTILS\$\$\.([a-zA-Z]*)\((.*?)\)/g,
    (_match, funcName, args) => {
      return context.utils[funcName](...JSON.parse(args, reviver));
    },
  );
};

/**
 * Called on every element in the JSON structure
 * @param {any} _key
 * @param {unknown} value
 */
function reviver(_key, value) {
  // @ts-ignore
  if (typeof value === 'object' && value.__serialized === 'HTMLElement') {
    const wrapper = document.createElement('div');
    // @ts-ignore
    wrapper.innerHTML = value.outerHTML;
    return wrapper.firstElementChild;
  }
  return value;
}
