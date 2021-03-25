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
    const serializedType = typeof value === 'object' && value?.__objType;
    return (
      (serializedType &&
        handlers
          .find((h) => h.name === serializedType)
          ?.fromObj(value.value)) ||
      value
    );
  });
};

export const printElement = (el: Element | Document, depth = 3) => {
  if (el instanceof Document) return '#document';
  let contents = '';
  const attrs = [...el.attributes];
  const splitAttrs = attrs.length > 2;
  if (depth > 0 && el.childNodes.length <= 3) {
    const singleLine =
      !splitAttrs &&
      (el.childNodes.length === 0 ||
        (el.childNodes.length === 1 && el.childNodes[0] instanceof Text));
    for (const child of el.childNodes) {
      if (child instanceof Element) {
        contents += `\n  ${printElement(child, depth - 1).replace(
          /\n/g,
          '\n  ',
        )}`;
      } else if (child instanceof Text) {
        contents += (singleLine ? '' : '\n  ') + child.textContent;
      }
    }

    if (!singleLine) contents += '\n';
  } else {
    contents = '[...]';
  }

  const tagName = el.tagName.toLowerCase();
  const selfClosing = el.childNodes.length === 0;
  return `<${tagName}${
    attrs.length === 0 ? '' : splitAttrs ? '\n  ' : ' '
  }${attrs
    .map((attr) => {
      // @ts-expect-error
      if (attr.value === '' && typeof el[attr.name] === 'boolean')
        return attr.name;
      return `${attr.name}="${attr.value}"`;
    })
    .join(splitAttrs ? '\n  ' : ' ')}${
    selfClosing ? `${splitAttrs ? '\n' : ' '}/` : splitAttrs ? '\n' : ''
  }>${selfClosing ? '' : `${contents}</${tagName}>`}`;
};
