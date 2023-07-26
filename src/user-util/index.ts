export { printElement } from '../serialize/index.js';

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

export const assertTargetSize = (
  el: Element,
  targetSize: number | true | undefined,
) => {
  // Per W3C recommendation, inline elements are excluded from a min target size
  // See: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  if (getComputedStyle(el).display === 'inline') {
    return;
  }

  const { width, height } = el.getBoundingClientRect();
  const minSize = typeof targetSize === 'number' ? targetSize : 44;

  const elDescriptor =
    el instanceof HTMLInputElement ? `${el.type} input` : 'element';

  // Why is this hardcoded?
  //   So that the snapshots do not fail when a new version is released and all the error messages change
  // Why is this not pointing to `main`?
  //   So that if the docs are moved around or renamed in the future, the links in previous PT versions still work
  // Does this need to be updated before every release?
  //   No, only when the docs are changed
  const docsVersion = 'v2.0.0';

  const targetSizeError = (suggestion: string | InterpolableIntoError[] = '') =>
    error`Cannot click element that is too small.
Target size of ${elDescriptor} is smaller than ${
      typeof targetSize === 'number'
        ? `configured minimum of ${minSize}px × ${minSize}px`
        : 'W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html'
    }
${capitalizeText(elDescriptor)} was ${width}px × ${height}px
${el}${suggestion}
You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/${docsVersion}/docs/errors/target-size.md`;

  if (width < minSize || height < minSize) {
    // Custom messaging for inputs that should have labels (e.g. type="radio").
    //
    // Inputs that aren't expected to have labels (e.g. type="submit")
    // are checked by the general element check.
    //
    // MDN <input> docs were referenced
    // and the following were assumed to not have labels:
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
      const labelSize = el.labels?.[0]?.getBoundingClientRect();

      // Element did not have label
      if (!labelSize) {
        throw targetSizeError(`
You can increase the target size of the ${elDescriptor} by adding a label that is larger than ${minSize}px × ${minSize}px`);
      }

      // If label is valid
      if (labelSize.width >= minSize && labelSize.height >= minSize) return;

      // Element and label was too small
      throw targetSizeError(
        // The error template tag is used here
        // so that the interpolated element (label name) does not get stringified.
        error`
Label associated with the ${elDescriptor} was ${labelSize.width}px × ${
          labelSize.height
        }px
${el.labels![0]}
You can increase the target size by making the label or ${elDescriptor} larger than ${minSize}px × ${minSize}px.`
          .error,
      );
    }

    // General element messaging
    throw targetSizeError();
  }
};

type InterpolableIntoError = Element | string | number | boolean;

// This is used to generate the arrays that are used
// to produce messages with live elements in the browser,
// and stringified elements in node
// example usage:
// error`something bad happened: ${el}`
// returns { error: ['something bad happened', el]}
export const error = (
  literals: TemplateStringsArray,
  ...placeholders: (InterpolableIntoError | InterpolableIntoError[])[]
) => ({
  error: literals.reduce(
    (acc, val, i) => {
      if (i !== 0) {
        const item = placeholders[i - 1];
        if (Array.isArray(item)) acc.push(...item);
        else acc.push(item);
      }
      if (val !== '') acc.push(val);
      return acc;
    },
    [] as (string | Element | number | boolean)[],
  ),
});

const capitalizeText = (text: string) => text[0].toUpperCase() + text.slice(1);
