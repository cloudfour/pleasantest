// @ts-expect-error types are not defined for this internal import
import { configure } from '@testing-library/dom/dist/config';

import { addToElementCache } from '../serialize/index.js';
// @ts-expect-error types are not defined for this internal import
export * from '@testing-library/dom/dist/queries';
// @ts-expect-error types are not defined for this internal import
export { waitFor } from '@testing-library/dom/dist/wait-for';

export {
  reviveElementsInString,
  printElement,
  addToElementCache,
} from '../serialize/index.js';

(configure as typeof import('@testing-library/dom').configure)({
  getElementError(message, container) {
    // Message is undefined sometimes, for example in the error message for "found multiple elements"
    if (!message) {
      return new Error(addToElementCache(container));
    }

    const error = new Error(message);
    // @ts-expect-error container property is added by DTL
    error.container = container;
    error.name = 'TestingLibraryElementError';
    return error;
  },
});
