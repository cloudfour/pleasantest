module.exports = (api) => {
  const isTest = api.env('test');

  const isRollup = api.caller((c) => c && c.name === '@rollup/plugin-babel');

  if (isTest)
    return {
      plugins: ['@babel/transform-modules-commonjs'],
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
