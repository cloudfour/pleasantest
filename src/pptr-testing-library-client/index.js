export * from '@testing-library/dom/dist/queries';
import { configure } from '@testing-library/dom/dist/config';

configure({
  getElementError(message, container) {
    const error = new Error(message);
    error.container = container;
    error.name = 'TestingLibraryElementError';
    return error;
  },
});
