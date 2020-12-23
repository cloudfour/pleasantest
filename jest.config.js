module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    'test-mule': '<rootDir>/dist/cjs/index.cjs',
  },
  testRunner: 'jest-circus/runner',
};
