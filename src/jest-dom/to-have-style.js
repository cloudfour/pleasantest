import { checkHtmlElement } from '@testing-library/jest-dom/dist/utils';

function getStyleDeclaration(document, css) {
  const styles = {};
  const { getComputedStyle } = document.defaultView;
  // Necessary to normalize colors
  const copy = document.createElement('div');
  // Has to be in the document for styles to be applied
  document.body.append(copy);
  for (const property of Object.keys(css)) {
    copy.style[property] = css[property];
    styles[property] = getComputedStyle(copy)[property] || css[property];
  }

  copy.remove();
  return styles;
}

function isSubset(styles, computedStyle) {
  return (
    Object.keys(styles).length > 0 &&
    Object.entries(styles).every(
      ([prop, value]) =>
        computedStyle[prop] === value ||
        computedStyle.getPropertyValue(prop.toLowerCase()) === value,
    )
  );
}

function printoutStyles(styles) {
  return Object.keys(styles)
    .sort()
    .map((prop) => `${prop}: ${styles[prop]};`)
    .join('\n');
}

/**
 * @param {HTMLElement} htmlElement
 * @param {string} css
 * @this {jest.MatcherUtils}
 */
export function toHaveStyle(htmlElement, css) {
  if (typeof css === 'string')
    throw new Error(
      `test-mule only supports specifying expected styles as objects, received ${JSON.stringify(
        css,
      )}`,
    );
  checkHtmlElement(htmlElement, toHaveStyle, this);
  const { getComputedStyle } = htmlElement.ownerDocument.defaultView;

  const expected = getStyleDeclaration(htmlElement.ownerDocument, css);
  const received = getComputedStyle(htmlElement);

  return {
    pass: isSubset(expected, received),
    message: () => {
      const matcher = `${this.isNot ? '.not' : ''}.toHaveStyle`;
      const matcherHint = this.utils.matcherHint(matcher, 'element', '');
      if (this.isNot) {
        return (
          `${matcherHint}\n\n` +
          `Expected ${this.utils.RECEIVED_COLOR(
            'element',
          )} to not have styles:` +
          `\n\n${this.utils.RECEIVED_COLOR(printoutStyles(expected))}`
        );
      }

      const receivedSubset = Object.fromEntries(
        Object.entries(received).filter(([prop]) => prop in expected),
      );
      return `${matcherHint}\n\n${this.utils.diff(
        printoutStyles(expected),
        printoutStyles(receivedSubset),
      )}`;
    },
  };
}
