// This makes it so that errors thrown by the module server get re-thrown inside of runJS/loadJS.
// This is necessary because the network is between runJS getting called and the module server, so errors do not propagate
// By tracking which runJS/loadJS initiated the request for each file, the module server can know which runJS/loadJS needs to reject.
// When runJS finishes, it will check to see if the buildStatuses map has any errors corresponding to its buildId.
// If there are any errors, it throws the first one.

const buildStatuses = new Map<number, Error[]>();

let buildIds = 0;

/**
 * Add an error for a specific buildId.
 * If the build is already finished (resolved),
 * triggers an uncaught rejection, with the hopes that it will fail the test.
 */
export const rejectBuild = (buildId: number, error: Error) => {
  const statusArray = buildStatuses.get(buildId);
  if (statusArray) statusArray.push(error);
  // Uncaught promise rejection!
  // Hope that Jest will catch it and fail the test, otherwise it is just logged by Node
  else Promise.reject(error);
};

export const createBuildStatusTracker = () => {
  const buildId = ++buildIds;
  buildStatuses.set(buildId, []);
  return {
    buildId,
    complete() {
      const status = buildStatuses.get(buildId);
      // This should never happen
      if (!status) throw new Error('Build already completed');
      buildStatuses.delete(buildId);
      if (status.length > 0) return status;
    },
  };
};
