module.exports = (api) => {
  const isRollup = api.caller((c) => c && c.name === '@rollup/plugin-babel');

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: { node: 12 },
          loose: true,
        },
      ],
      ['@babel/preset-typescript', { optimizeConstEnums: true }],
    ],
    plugins: isRollup ? ['babel-plugin-un-cjs'] : [],
  };
};
