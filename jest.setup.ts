// The PLEASANTEST_TESTING_ITSELF environment variable (used in utils.ts)
// allows us to detect whether PT is running in the context of its own tests
// We use it to disable syntax-highlighting in printed HTML in error messages
// so that the snapshots are more readable.
// When PT is used outside of its own tests, the environment variable will not be set,
// so the error messages will ahve syntax-highlighted HTML
if (process.env.PLEASANTEST_TESTING_ITSELF === undefined)
  process.env.PLEASANTEST_TESTING_ITSELF = 'true';
