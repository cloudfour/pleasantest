import { withBrowser } from 'pleasantest';

test.todo('loads from .ts file with transpiling');
test(
  'if the file throws an error the error is source mapped',
  withBrowser(async ({ utils }) => {
    await utils.loadJS('./external-throwing.ts');
  }),
);

test(
  'if the file has a syntax error the location is source mapped',
  withBrowser(async ({ utils }) => {
    await utils.loadJS('./external-with-syntax-error.ts');
  }),
);
