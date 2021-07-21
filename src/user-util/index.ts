export { printElement } from '../serialize';

export const assertAttached = (el: Element) => {
  if (!el.isConnected) {
    throw error`Cannot perform action on element that is not attached to the DOM:
${el}`;
  }
};

// Element is visible if all:
// - it is attached to the DOM
// - it has a rendered size (its rendered width and height are not zero)
// - Computed opacity (product of opacity of ancestors) is non-zero
// - is not display: none or visibility: hidden
export const assertVisible = (el: Element) => {
  assertAttached(el);

  // GetComputedStyle allows inherited properties to be seen correctly
  const style = getComputedStyle(el);

  if (style.visibility === 'hidden') {
    throw error`Cannot perform action on element that is not visible (it has visibility:hidden):
${el}`;
  }

  // The opacity of a parent element affects the rendering of a child element,
  // but the opacity property is not inherited, so this computes the rendered opacity
  // by walking up the tree and multiplying the opacities.
  let opacity = Number(style.opacity);
  let opacityEl: Element | null = el;
  while (opacity && (opacityEl = opacityEl.parentElement)) {
    opacity *= getComputedStyle(opacityEl).opacity as any as number;
  }

  if (opacity < 0.05) {
    throw error`Cannot perform action on element that is not visible (it is near zero opacity):
${el}`;
  }

  const rect = el.getBoundingClientRect();
  // Handles: rendered width is zero or rendered height is zero or display:none
  if (rect.width * rect.height === 0) {
    throw error`Cannot perform action on element that is not visible (it was not rendered or has a size of zero):
${el}`;
  }
};

// This is used to generate the arrays that are used
// to produce messages with live elements in the browser,
// and stringified elements in node
// example usage:
// error`something bad happened: ${el}`
// returns { error: ['something bad happened', el]}
export const error = (
  literals: TemplateStringsArray,
  ...placeholders: (Element | string)[]
) => ({
  error: literals.reduce((acc, val, i) => {
    if (i !== 0) acc.push(placeholders[i - 1]);
    if (val !== '') acc.push(val);
    return acc;
  }, [] as (string | Element)[]),
});
