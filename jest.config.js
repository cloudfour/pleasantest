module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    'test-mule': '<rootDir>/dist/cjs/index.cjs',
  },
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.tsx?$': ['esbuild-jest', { sourcemap: true }],
  },
};
