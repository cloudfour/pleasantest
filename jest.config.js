module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^pleasantest$': '<rootDir>/dist/cjs/index.cjs',
  },
  testRunner: 'jest-circus/runner',
  watchPathIgnorePatterns: [
    '<rootDir>/.cache',
    '<rootDir>/src/.*(?<!\\.test)\\.ts',
  ],
  transform: {
    '^.+\\.[jt]sx?$': ['esbuild-jest', { sourcemap: true }],
  },
  // Don't transform node_modules, _except_ ansi-regex
  // ansi-regex is ESM and since we are using Jest in CJS mode,
  // it must be transpiled to CJS
  // transformIgnorePatterns: ['<rootDir>/node_modules/.*(?!ansi-regex)'],
  transformIgnorePatterns: [],
};
