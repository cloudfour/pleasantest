// @ts-expect-error
export * from '@testing-library/dom/dist/queries';
// @ts-expect-error
import { configure } from '@testing-library/dom/dist/config';
import { addToElementCache } from '../serialize';
export {
  reviveElementsInString,
  printElement,
  addToElementCache,
} from '../serialize';

(configure as typeof import('@testing-library/dom').configure)({
  getElementError(message, container) {
    // message is undefined sometimes, for example in the error message for "found multiple elements"
    if (!message) {
      return new Error(addToElementCache(container));
    }
    const error = new Error(message);
    // @ts-expect-error
    error.container = container;
    error.name = 'TestingLibraryElementError';
    return error;
  },
});
