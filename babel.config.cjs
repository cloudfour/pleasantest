module.exports = (api) => {
  const isTest = api.env('test');

  const isRollup = api.caller((c) => c && c.name === '@rollup/plugin-babel');

  if (isTest)
    return {
      plugins: [
        '@babel/transform-modules-commonjs',
        // TODO: remove when node 12 is dropped
        '@babel/plugin-proposal-optional-chaining',
      ],
      // not using preset-env here because it slows down the tests a lot
      presets: ['@babel/preset-typescript'],
    };

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: { node: 12 },
          loose: true,
        },
      ],
      '@babel/preset-typescript',
    ],
    plugins: isRollup ? ['babel-plugin-un-cjs'] : [],
  };
};
