import { deserialize, serialize } from '.';

test('objects', () => {
  const input = { 1234: { abcd: 'abc' } };
  const serialized = serialize(input);
  expect(serialized).toEqual(expect.any(String));
  expect(deserialize(serialized)).toEqual(input);
});

test('arrays', () => {
  const input = { 1234: { abcd: ['1', 2] } };
  const serialized = serialize(input);
  expect(serialized).toEqual(expect.any(String));
  expect(deserialize(serialized)).toEqual(input);
});

test('regexes', () => {
  const input = { 1234: { abcd: /foo/gi } };
  const serialized = serialize(input);
  expect(serialized).toEqual(expect.any(String));
  expect(deserialize(serialized)).toEqual(input);
});
