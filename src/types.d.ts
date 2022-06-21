// These dependencies have type declarations that aren't compatable with TS moduleResolution: node16
// The -original-types fake dependencies are defined in tsconfig.json

declare module 'svelte-preprocess' {
  export * from 'svelte-preprocess-original-types';
  import * as mod from 'svelte-preprocess-original-types';
  export default mod.default;
}

declare module 'rollup-plugin-vue' {
  export * from 'rollup-plugin-vue-original-types';
  import mod from 'rollup-plugin-vue-original-types';
  export default mod.default;
}

declare module 'rollup-plugin-svelte' {
  export * from 'rollup-plugin-svelte-original-types';
  import mod from 'rollup-plugin-svelte-original-types';
  export default mod.default;
}

declare module '@rollup/plugin-alias' {
  export * from 'rollup-plugin-alias-original-types';
  import mod from 'rollup-plugin-alias-original-types';
  export default mod.default;
}

declare module 'rollup-plugin-postcss' {
  export * from 'rollup-plugin-postcss-original-types';
  import mod from 'rollup-plugin-postcss-original-types';
  export default mod.default;
}

declare module 'magic-string' {
  export * from 'magic-string-original-types';
  import mod from 'magic-string-original-types';
  export default mod.default;
}

declare module '@ampproject/remapping' {
  export * from 'amp-remapping-original-types';
  import mod from 'amp-remapping-original-types';
  export default mod.default;
}

declare module '@rollup/plugin-commonjs' {
  export * from 'rollup-commonjs-original-types';
  import mod from 'rollup-commonjs-original-types';
  export default mod.default;
}
