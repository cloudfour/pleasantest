module.exports = {
  // See https://jestjs.io/docs/configuration/#prettierpath-string -> "Prettier version 3 is not supported!"
  // Blocked by https://github.com/prettier/prettier-synchronized/issues/4#issuecomment-1649355749
  // and https://github.com/jestjs/jest/pull/14311#issuecomment-1649358074
  prettierPath: null,
  testEnvironment: 'node',
  moduleNameMapper: {
    '^pleasantest$': '<rootDir>/dist/cjs/index.cjs',
    // Since TS requires that relative imports to .ts files use the .js extension in the import,
    // this line is needed to tell Jest that when a .js file is imported,
    // it may need to look for the corresponding .ts file on disk.
    '^(.+)\\.js$': ['$1.js', '$1.ts'],
  },
  testRunner: 'jest-circus/runner',
  watchPathIgnorePatterns: [
    '<rootDir>/.cache',
    '<rootDir>/src/.*(?<!\\.test)\\.ts',
  ],
  transform: {
    '^.+\\.[jt]sx?$': 'es-jest',
  },
  // Don't transform node_modules, _except_ ansi-regex
  // ansi-regex is ESM and since we are using Jest in CJS mode,
  // it must be transpiled to CJS
  transformIgnorePatterns: [
    '<rootDir>/node_modules/\\.pnpm/(?!ansi-regex)',
    '<rootDir>/node_modules/(?!(\\.pnpm|ansi-regex))',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 10_000,
};
