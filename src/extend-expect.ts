import { deserialize } from './serialize';
import { port } from './vite-server';

const methods = [
  'toBeInTheDOM',
  'toBeInTheDocument',
  'toBeEmpty',
  'toBeEmptyDOMElement',
  'toContainElement',
  'toContainHTML',
  'toHaveTextContent',
  'toHaveAttribute',
  'toHaveClass',
  'toHaveStyle',
  'toHaveFocus',
  'toHaveFormValues',
  'toBeVisible',
  'toBeDisabled',
  'toBeEnabled',
  'toBeRequired',
  'toBeInvalid',
  'toBeValid',
  'toHaveValue',
  'toHaveDisplayValue',
  'toBeChecked',
  'toBePartiallyChecked',
  'toHaveDescription',
];

expect.extend(
  Object.fromEntries(
    methods.map((methodName) => {
      const matcher = async function (
        this: unknown,
        elementHandle: import('puppeteer').ElementHandle,
      ) {
        const ctxString = JSON.stringify(this); // contains stuff like isNot and promise
        const result = await elementHandle.evaluateHandle(
          // using new Function to avoid babel transpiling the import
          // @ts-ignore
          new Function(
            'element',
            `return import("http://localhost:${port}/@test-mule/jest-dom").then(jestDom => {
              const context = { ...(${ctxString}), ...jestDom.jestContext }
              return jestDom.${methodName}.call(context, element)
            })`,
          ),
          elementHandle,
        );
        // @ts-expect-error it is used but for some reason ts doesn't recognize
        const message = await result
          .evaluateHandle((matcherResult) => matcherResult.message())
          .then((m) => m.jsonValue());
        const final = {
          // @ts-ignore
          ...(await result.jsonValue()),
          message: () => runJestUtilsInNode(message, this),
        };

        return final;
      };
      return [methodName, matcher];
    }),
  ),
);

// @ts-expect-error
const runJestUtilsInNode = (message: string, context: jest.MatcherContext) => {
  // handling nested JEST_UTILS calls here is the complexity
  const jestUtilsCalls = [
    ...message.matchAll(/\$\$JEST_UTILS\$\$\.([a-zA-Z_$]*)\(/g),
  ];
  const closeParenRegex = /\)/g;
  let jestUtilsCall;
  while ((jestUtilsCall = jestUtilsCalls.pop())) {
    const start = jestUtilsCall.index!;
    const methodName = jestUtilsCall[1];
    closeParenRegex.lastIndex = start;
    const closeParenIndex = closeParenRegex.exec(message)?.index;
    if (closeParenIndex !== undefined) {
      const argsString = message.slice(
        start + jestUtilsCall[0].length,
        closeParenIndex,
      );
      let parsedArgs;
      try {
        parsedArgs = deserialize(argsString);
      } catch (e) {
        console.error(
          'Error while deserializing',
          argsString,
          '\n\nin\n\n',
          message,
        );
        // throw e;
      }
      const res: string = context.utils[methodName](...parsedArgs);
      const escaped = res.replace(/"/g, '\\"');
      message =
        message.slice(0, start) + escaped + message.slice(closeParenIndex + 1);
    }
  }
  return message;
};

// These type definitions are incomplete, only including methods we've tested
// More can be added from https://unpkg.com/@types/testing-library__jest-dom/index.d.ts
// You can copy-paste and change the return types to promises
declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Check whether an element is disabled from the user's perspective.
       * https://github.com/testing-library/jest-dom#tobedisabled
       */
      toBeDisabled(): Promise<R>;
      /**
       * Check whether an element is not disabled from the user's perspective.
       * https://github.com/testing-library/jest-dom#tobeenabled
       * Same as .not.toBeDisabled()
       */
      toBeEnabled(): Promise<R>;
      /**
       * Assert whether an element has content or not.
       * https://github.com/testing-library/jest-dom#tobeemptydomelement
       */
      toBeEmptyDOMElement(): Promise<R>;
      /**
       * Assert whether an element is present in the document or not.
       * https://github.com/testing-library/jest-dom#tobeinthedocument
       */
      toBeInTheDocument(): Promise<R>;
      /**
       * Check if the value of an element is currently invalid.
       * Uses [HTML5 Constraint Validation](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation) and checks for `aria-invalid`.
       * https://github.com/testing-library/jest-dom#tobeinvalid
       */
      toBeInvalid(): Promise<R>;
      /**
       * Check if a form element is currently required.
       * https://github.com/testing-library/jest-dom#toberequired
       */
      toBeRequired(): Promise<R>;
      /**
       * Check if the value of an element is currently valid.
       * Uses [HTML5 Constraint Validation](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation) and checks for `aria-invalid`.
       * https://github.com/testing-library/jest-dom#tobevalid
       */
      toBeValid(): Promise<R>;
      /**
       * Check if an element is currently visible to the user.
       * https://github.com/testing-library/jest-dom#tobevisible
       */
      toBeVisible(): Promise<R>;
    }
  }
}
