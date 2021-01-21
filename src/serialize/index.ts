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
