export * from '@testing-library/dom/dist/queries';
import { configure } from '@testing-library/dom/dist/config';

// DTL uses string interpolation with elements
// That doesn't work well when we have live references to elements that we can log
// This map holds entries like { 123412398 => HTMLElement }
// So then when we are about to log them we can replace with the pointers to the real elements
const elementStringsMap = new Map();

const randomNum = () => Math.floor(Math.random() * 100000000);

configure({
  getElementError(message, container) {
    if (!message) {
      const num = randomNum();
      elementStringsMap.set(num, container);
      return {
        message: `$$DTL_ELEMENT$$${num}$`,
      };
    }
    const error = new Error(message);
    error.container = container;
    error.name = 'TestingLibraryElementError';
    return error;
  },
});

/**
 * @param {string} input
 * replaces back the $$DTL_ELEMENT$$ items with real elements
 */
export const __deserialize = (input) => {
  const a = input.split('$$DTL_ELEMENT$$').reduce((outArr, segment, i) => {
    if (i === 0) return outArr.concat(segment);
    const [_, number, rest] = /^([0-9]*)\$([\w\W]*)$/g.exec(segment);
    return outArr.concat([elementStringsMap.get(Number(number)), rest]);
  }, []);
  return a;
};

/** @param {Element} el */
export const __elementToString = (el, printChildren = true) => {
  let contents = '';
  if (printChildren && el.childNodes.length <= 3) {
    const singleLine =
      el.childNodes.length === 1 && el.childNodes[0] instanceof Text;
    if (!singleLine) contents += '\n';
    for (const child of el.childNodes) {
      if (child instanceof Element) {
        contents += '  ' + elementToString(child).split('\n').join('  \n');
      } else if (child instanceof Text) {
        contents += child.wholeText;
      }
    }
    if (!singleLine) contents += '\n';
  } else {
    contents = '[...]';
  }
  return el.outerHTML.replace(el.innerHTML, contents);
};
