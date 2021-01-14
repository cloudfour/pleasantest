module.exports = (api) => {
  const isTest = api.env('test');

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: { node: isTest ? 'current' : '12' },
          loose: true,
        },
      ],
      '@babel/preset-typescript',
    ],
    plugins: isTest ? [] : ['babel-plugin-un-cjs'],
  };
};
