export const npmPrefix = '@npm/';

export const isRelativeOrAbsoluteImport = (id: string) =>
  id === '.' ||
  id === '..' ||
  id.startsWith('./') ||
  id.startsWith('../') ||
  id.startsWith('/');

export const isBareImport = (id: string) =>
  !(
    isRelativeOrAbsoluteImport(id) ||
    id.startsWith('\0') ||
    id.startsWith(npmPrefix)
  );

export const cssExts = /\.(?:css|styl|stylus|s[ac]ss|less)$/;
export const jsExts = /\.(?:[jt]sx?|[cm]js)$/;
