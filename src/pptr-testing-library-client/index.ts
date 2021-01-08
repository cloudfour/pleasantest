// @ts-expect-error
export * from '@testing-library/dom/dist/queries';
// @ts-expect-error
import { configure } from '@testing-library/dom/dist/config';

// DTL uses string interpolation with elements
// That doesn't work well when we have live references to elements that we can log
// This map holds entries like { 123412398 => HTMLElement }
// So then when we are about to log them we can replace with the pointers to the real elements
const elementStringsMap = new Map();
// This gets used by the stub for pretty-dom, and also it is used in this file
window.__putElementInStringMap = (el) => {
  const num = randomNum();
  elementStringsMap.set(num, el);
  return `$$DTL_ELEMENT$$${num}$`;
};

(configure as typeof import('@testing-library/dom').configure)({
  getElementError(message, container) {
    // message is undefined sometimes, for example in the error message for "found multiple elements"
    if (!message) {
      const num = randomNum();
      elementStringsMap.set(num, container);
      return new Error(`$$DTL_ELEMENT$$${num}$`);
    }
    const error = new Error(message);
    // @ts-expect-error
    error.container = container;
    error.name = 'TestingLibraryElementError';
    return error;
  },
});

/** Replaces the $$DTL_ELEMENT$$ items back with real elements */
export const __deserialize = (input: string) => {
  const a = input.split('$$DTL_ELEMENT$$').reduce((outArr, segment, i) => {
    if (i === 0) return outArr.concat(segment);
    const [, number, rest] = /^([0-9]*)\$([\w\W]*)$/g.exec(segment)!;
    return outArr.concat([elementStringsMap.get(Number(number)), rest]);
  }, [] as string[]);
  return a;
};

const elementToString = (el: Element, printChildren = true) => {
  let contents = '';
  if (printChildren && el.childNodes.length <= 3) {
    const singleLine =
      el.childNodes.length === 1 && el.childNodes[0] instanceof Text;
    for (const child of el.childNodes) {
      if (child instanceof Element) {
        contents +=
          '\n  ' + elementToString(child, false).split('\n').join('  \n');
      } else if (child instanceof Text) {
        contents += (singleLine ? '' : '\n  ') + child.wholeText;
      }
    }
    if (!singleLine) contents += '\n';
  } else {
    contents = '[...]';
  }
  return el.outerHTML.replace(el.innerHTML, contents);
};

export { elementToString as __elementToString };

const randomNum = () => Math.floor(Math.random() * 100000000);
