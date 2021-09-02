/** @returns {import('rollup').Plugin} */
export const rollupPluginDomAccessibilityApi = () => ({
  name: 'dom-accessibility-api',
  async load(id) {
    if (!/dom-accessibility-api\//.test(id)) return;
    if (/SetLike\.[^.]*$/.test(id)) return 'export default Set';
    if (/array\.from\.[^.]*$/.test(id)) return 'export default Array.from';
  },
});
