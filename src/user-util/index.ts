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

// Why is this hardcoded?
//   So that the snapshots do not fail when a new version is released and all the error messages change
// Why is this not pointing to `main`?
//   So that if the docs are moved around or renamed in the future, the links in previous PT versions still work
// Does this need to be updated before every release?
//   No, only when the docs are changed
const docsVersion = 'v2.0.0';
const customizeDocsMessage = `You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/${docsVersion}/docs/errors/target-size.md`;
const errorMessage = 'Cannot click element that is too small.';

type TargetSize = number | true | undefined;

export const assertTargetSize = (el: Element, targetSize: TargetSize) => {
  // Per W3C recommendation, inline elements are excluded from a min target size
  // See: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  if (getComputedStyle(el).display === 'inline') {
    return;
  }

  const { width, height } = el.getBoundingClientRect();
  const size = getTargetSize(targetSize);

  if (width < size || height < size) {
    // Custom messaging for inputs that should have labels (e.g. type="radio").
    //
    // Inputs that aren't expected to have labels (e.g. type="submit") are
    // checked by the general element check.
    //
    // MDN <input> docs were referenced and the following were assumed
    // to not have labels:
    // - type="submit"
    // - type="button"
    // - type="reset"
    //
    // @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
    if (
      el instanceof HTMLInputElement &&
      el.type !== 'submit' &&
      el.type !== 'button' &&
      el.type !== 'reset'
    ) {
      return checkInputEl({ el, targetSize });
    }

    // General element messaging
    throw error`${errorMessage}
${getTargetSizeMessage({ el, targetSize })}
${getDimensionsMessage(el)}
${el}
${customizeDocsMessage}`;
  }
};

/** Handles inputs that should have labels */
const checkInputEl = ({
  el,
  targetSize,
}: {
  el: HTMLInputElement;
  targetSize: TargetSize;
}) => {
  const labelSize = el.labels?.[0]?.getBoundingClientRect();
  const size = getTargetSize(targetSize);

  // Element did not have label
  if (!labelSize) {
    throw error`${errorMessage}
${getTargetSizeMessage({ el, targetSize })}
${getDimensionsMessage(el)}
${el}
You can increase the target size of the ${getElementDescriptor(
      el,
    )} by adding a label that is larger than ${size}px × ${size}px
${customizeDocsMessage}`;
  }

  // If label is valid
  if (labelSize.width >= size && labelSize.height >= size) {
    return;
  }

  // Element and label was too small
  throw error`${errorMessage}
${getTargetSizeMessage({ el, targetSize })}
${getDimensionsMessage(el)}
${el}
Label associated with the ${getElementDescriptor(el)} was ${
    labelSize.width
  }px × ${labelSize.height}px
${el.labels![0]}
You can increase the target size by making the label or ${getElementDescriptor(
    el,
  )} larger than ${size}px × ${size}px.
${customizeDocsMessage}`;
};

// This is used to generate the arrays that are used
// to produce messages with live elements in the browser,
// and stringified elements in node
// example usage:
// error`something bad happened: ${el}`
// returns { error: ['something bad happened', el]}
export const error = (
  literals: TemplateStringsArray,
  ...placeholders: (Element | string | number | boolean)[]
) => ({
  error: literals.reduce((acc, val, i) => {
    if (i !== 0) acc.push(placeholders[i - 1]);
    if (val !== '') acc.push(val);
    return acc;
  }, [] as (string | Element | number | boolean)[]),
});

const getTargetSizeMessage = ({
  el,
  targetSize,
}: {
  el: Element;
  targetSize: TargetSize;
}) => {
  const size = getTargetSize(targetSize);
  return typeof targetSize === 'number'
    ? `Target size of ${getElementDescriptor(
        el,
      )} is smaller than ${size}px × ${size}px`
    : `${capitalizeText(
        getElementDescriptor(el),
      )} target size does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html`;
};

const getDimensionsMessage = (el: Element) => {
  const { width, height } = el.getBoundingClientRect();
  return `${capitalizeText(
    getElementDescriptor(el),
  )} was ${width}px × ${height}px`;
};

const getTargetSize = (targetSize: TargetSize) =>
  typeof targetSize === 'number' ? targetSize : 44;

const getElementDescriptor = (el: Element) =>
  el instanceof HTMLInputElement ? `${el.type} input` : 'element';

const capitalizeText = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
