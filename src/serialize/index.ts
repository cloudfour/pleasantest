interface Handler<T, Serialized extends {}> {
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
  let match,
    out = [],
    lastFoundIndex = 0;
  const rgx = /\$\$STRINGIFIED_ELEMENT_([0-9]*)\$\$/g;
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
) => {
  return JSON.stringify(input, (_key, _value) => {
    const value = visitor ? visitor(_value) : _value;
    const handler = handlers.find((h) => h.detect(value));
    if (handler)
      return { __objType: handler.name, value: handler.toObj(value) };
    return value;
  });
};

export const deserialize = (input: string) => {
  return JSON.parse(input, (_key, value) => {
    const serializedType = value.__objType;
    return (
      (serializedType &&
        handlers
          .find((h) => h.name === serializedType)
          ?.fromObj(value.value)) ||
      value
    );
  });
};

export const printElement = (el: Element, printChildren = true) => {
  let contents = '';
  if (printChildren && el.childNodes.length <= 3) {
    const singleLine =
      el.childNodes.length === 1 && el.childNodes[0] instanceof Text;
    for (const child of el.childNodes) {
      if (child instanceof Element) {
        contents +=
          '\n  ' + printElement(child, false).split('\n').join('  \n');
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
