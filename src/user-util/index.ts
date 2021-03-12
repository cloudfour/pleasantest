export { printElement } from '../serialize';

export const assertAttached = (el: Element) => {
  if (!el.isConnected) {
    throw error`Cannot perform action on element that is not attached to the DOM:
${el}`;
  }
};

// example usage:
// error`something bad happened: ${el}`
// returns { error: ['something bad happened', el]}
// this is used to generate the arrays that are used
// to produce messages with live elements in the browser,
// and stringified elements in node
export const error = (
  literals: TemplateStringsArray,
  ...placeholders: Element[]
) => {
  return {
    error: literals.reduce((acc, val, i) => {
      if (i !== 0) acc.push(placeholders[i - 1]);
      if (val !== '') acc.push(val);
      return acc;
    }, [] as (string | Element)[]),
  };
};
