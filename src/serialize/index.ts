import * as colors from 'kolorist';
interface Handler<T, Serialized> {
  name: string;
  toObj(input: T): Serialized;
  fromObj(input: Serialized): T;
  detect(input: unknown): boolean;
}

const regexHandler: Handler<RegExp, { source: string; flags: string }> = {
  name: 'RegExp',
  detect: (input) => input instanceof RegExp,
  toObj: (input) => ({ source: input.source, flags: input.flags }),
  fromObj: (input) => new RegExp(input.source, input.flags),
};

const handlers = [regexHandler];

/** Stores element references to be reused when logging in the browser */
const ELEMENT_CACHE: Element[] = [];
export const addToElementCache = (el: Element) => {
  const index = ELEMENT_CACHE.push(el) - 1;
  return `$$STRINGIFIED_ELEMENT_${index}$$`;
};

/** Replaces stringified elements with live elements in a string */
export const reviveElementsInString = (str: string) => {
  const out = [];
  let match;
  let lastFoundIndex = 0;
  const rgx = /\$\$STRINGIFIED_ELEMENT_(\d*)\$\$/g;
  while ((match = rgx.exec(str))) {
    out.push(str.slice(lastFoundIndex, match.index));
    const elId = match[1];
    out.push(ELEMENT_CACHE[Number(elId)]);
    lastFoundIndex = match.index + match[0].length;
  }

  out.push(str.slice(lastFoundIndex));
  return out;
};

/**
 * @param input The data to serialize
 * @param visitor Function gets called on every value before serialization. Return the value unchanged, or modify and return it.
 */
export const serialize = (
  input: unknown,
  visitor?: (val: unknown) => unknown,
) =>
  JSON.stringify(input, (_key, _value) => {
    const value = visitor ? visitor(_value) : _value;
    const handler = handlers.find((h) => h.detect(value));
    if (handler)
      return { __objType: handler.name, value: handler.toObj(value) };
    return value;
  });

export const deserialize = (input: string) =>
  JSON.parse(input, (_key, value) => {
    const serializedType = typeof value === 'object' && value?.__objType;
    return (
      (serializedType &&
        handlers
          .find((h) => h.name === serializedType)
          ?.fromObj(value.value)) ||
      value
    );
  });

const noColor = (input: string) => input;
const indent = (input: string) => `  ${input.split('\n').join('\n  ')}`;

export const printElement = (
  el: Element | Document,
  printColors = true,
  depth = 3,
) => {
  if (el instanceof Document) return '#document';
  let contents = '';
  const attrs = [...el.attributes];
  const splitAttrs = attrs.length > 2;
  let needsMultipleLines = false;
  if (depth > 0 && el.childNodes.length <= 5) {
    const whiteSpaceSetting = getComputedStyle(el).whiteSpace;
    const printedChildren: string[] = [];
    let child = el.firstChild;
    while (child) {
      if (child instanceof Element) {
        needsMultipleLines = true;
        printedChildren.push(printElement(child, printColors, depth - 1));
      } else if (child instanceof Text) {
        // Merge consecutive text nodes together so their text can be collapsed
        let consecutiveMergedText = child.textContent || '';
        while (child.nextSibling instanceof Text) {
          // We are collecting the consecutive siblings' text here
          // so we are also skipping those siblings from being used by the outer loop
          child = child.nextSibling;
          consecutiveMergedText += child.textContent || '';
        }
        printedChildren.push(
          whiteSpaceSetting === '' ||
            whiteSpaceSetting === 'normal' ||
            whiteSpaceSetting === 'nowrap' ||
            whiteSpaceSetting === 'pre-line'
            ? consecutiveMergedText.replace(
                // Pre-line should collapse whitespace _except_ newlines
                whiteSpaceSetting === 'pre-line' ? /[^\S\n]+/g : /\s+/g,
                ' ',
              )
            : consecutiveMergedText,
        );
      }
      child = child.nextSibling;
    }
    if (!needsMultipleLines)
      needsMultipleLines =
        splitAttrs || printedChildren.some((c) => c.includes('\n'));

    contents += needsMultipleLines
      ? `\n${printedChildren
          .filter((c) => c.trim() !== '')
          .map((c) => indent(c))
          .join('\n')}\n`
      : printedChildren.join('');
  } else {
    contents = '[...]';
  }

  const tagName = el.tagName.toLowerCase();
  const selfClosing = el.childNodes.length === 0;
  // We haver to tell kolorist to print the colors
  // beacuse by default it won't since we are in the browser
  // (the colored message gets sent to node to be printed)
  colors.options.enabled = true;
  colors.options.supportLevel = 1;

  // Syntax highlighting groups
  const highlight = {
    bracket: printColors ? colors.cyan : noColor,
    tagName: printColors ? colors.red : noColor,
    equals: printColors ? colors.cyan : noColor,
    attribute: printColors ? colors.blue : noColor,
    string: printColors ? colors.green : noColor,
  };
  return `${highlight.bracket('<')}${highlight.tagName(tagName)}${
    attrs.length === 0 ? '' : splitAttrs ? '\n  ' : ' '
  }${attrs
    .map((attr) => {
      if (
        attr.value === '' &&
        typeof el[attr.name as keyof Element] === 'boolean'
      )
        return highlight.attribute(attr.name);
      return `${highlight.attribute(attr.name)}${highlight.equals(
        '=',
      )}${highlight.string(`"${attr.value}"`)}`;
    })
    .join(splitAttrs ? '\n  ' : ' ')}${
    selfClosing
      ? highlight.bracket(`${splitAttrs ? '\n' : ' '}/`)
      : splitAttrs
      ? '\n'
      : ''
  }${highlight.bracket('>')}${
    selfClosing
      ? ''
      : `${contents}${highlight.bracket('</')}${highlight.tagName(
          tagName,
        )}${highlight.bracket('>')}`
  }`;
};
