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

type TargetSize = number | true | undefined;

export const assertTargetSize = (el: Element, targetSize: TargetSize) => {
  const display = getComputedStyle(el).display;

  // Per the W3C recommendation, inline elements are excluded
  // See: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  if (display === 'inline') {
    return;
  }

  const { width, height } = el.getBoundingClientRect();
  const size = getTargetSize(targetSize);

  if (width < size || height < size) {
    // Checkbox element
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      return checkboxTargetSize({ el, targetSize });
    }

    // General element
    const targetSizeMsg =
      typeof targetSize === 'number'
        ? `Target size of element is smaller than ${size}px × ${size}px`
        : 'Target size of element does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html';

    throw error`Cannot click element that is too small.
${targetSizeMsg}
Element was ${width}px × ${height}px
${el}
${customizeDocsMessage}`;
  }
};

const checkboxTargetSize = ({
  el,
  targetSize,
}: {
  el: HTMLInputElement;
  targetSize: TargetSize;
}) => {
  console.log(el.labels?.[0]?.getBoundingClientRect());

  const labelSize = el.labels?.[0]?.getBoundingClientRect();
  const { width, height } = el.getBoundingClientRect();
  const size = getTargetSize(targetSize);

  // Checkbox did not have label
  if (!labelSize) {
    const targetSizeMsg =
      typeof targetSize === 'number'
        ? `Target size of checkbox is smaller than ${size}px × ${size}px`
        : 'Target size of checkbox does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html';

    throw error`Cannot click checkbox that is too small.
${targetSizeMsg}
Element was ${width}px × ${height}px
${el}
You can increase the target size of the checkbox by adding a label that is larger than ${size}px × ${size}px
${customizeDocsMessage}`;
  }

  // If label is valid
  if (labelSize.width >= size && labelSize.height >= size) {
    console.log('ABOUT to rETURN');

    return;
  }

  console.log('NO NOT HERE');

  // Checkbox and label was too small
  const targetSizeMsg =
    typeof targetSize === 'number'
      ? `Target size of element is smaller than ${size}px × ${size}px`
      : 'Target size of element does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html';

  throw error`Cannot click checkbox that is too small.
${targetSizeMsg}
Checkbox was ${width}px × ${height}px
${el}
Label associated with the checkbox was ${labelSize.width}px × ${
    labelSize.height
  }px
${el.labels![0]}
You can increase the target size by making the label or checkbox larger than ${size}px × ${size}px.
${customizeDocsMessage}`;
};

const getTargetSize = (targetSize: TargetSize) =>
  typeof targetSize === 'number' ? targetSize : 44;

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
