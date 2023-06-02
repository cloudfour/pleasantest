module.exports = (api) => {
  const isRollup = api.caller((c) => c && c.name === '@rollup/plugin-babel');
  const isTest = api.cache(() => process.env.NODE_ENV) === 'test';

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
    plugins: isRollup && !isTest ? ['babel-plugin-un-cjs'] : [],
  };
};
