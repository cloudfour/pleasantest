module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    'test-mule': '<rootDir>/src/index.js',
  },
  testTimeout: 3 * 24 * 60 * 60 * 1000,
};
