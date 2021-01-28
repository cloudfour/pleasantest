/**
 * @jest-environment jsdom
 */
import { printElement, deserialize, serialize } from '.';

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

describe('printElement', () => {
  it('formats a document correctly', () => {
    expect(printElement(document)).toMatchInlineSnapshot(`"#document"`);
  });
  it('formats an empty element', () => {
    const outerEl = document.createElement('div');
    expect(printElement(outerEl)).toMatchInlineSnapshot(`"<div />"`);
  });
  it('formats an element with a single text node', () => {
    const outerEl = document.createElement('div');
    outerEl.innerHTML = 'asdf';
    expect(printElement(outerEl)).toMatchInlineSnapshot(`"<div>asdf</div>"`);
  });
  it('formats an element with multiple text nodes', () => {
    const outerEl = document.createElement('div');
    outerEl.append(
      document.createTextNode('first'),
      document.createTextNode('second'),
    );
    expect(printElement(outerEl)).toMatchInlineSnapshot(`
      "<div>
        first
        second
      </div>"
    `);
  });
  it('formats an element with nested children', () => {
    const outerEl = document.createElement('div');
    outerEl.innerHTML = '<strong><a>Hi</a></strong>';
    expect(printElement(outerEl)).toMatchInlineSnapshot(`
      "<div>
        <strong>
          <a>Hi</a>
        </strong>
      </div>"
    `);
  });
  it('formats self-closing element', () => {
    const outerEl = document.createElement('div');
    outerEl.innerHTML = '<input><img>';
    expect(printElement(outerEl)).toMatchInlineSnapshot(`
      "<div>
        <input />
        <img />
      </div>"
    `);
  });
  it('formats attributes on one line', () => {
    const outerEl = document.createElement('div');
    outerEl.setAttribute('data-asdf', 'foo');
    expect(printElement(outerEl)).toMatchInlineSnapshot(
      `"<div data-asdf=\\"foo\\" />"`,
    );
  });
  it('formats > 2 attributes on multiple lines', () => {
    const outerEl = document.createElement('div');
    outerEl.setAttribute('data-asdf', 'foo');
    outerEl.setAttribute('class', 'class');
    outerEl.setAttribute('style', 'background: green');
    expect(printElement(outerEl)).toMatchInlineSnapshot(`
      "<div
        data-asdf=\\"foo\\"
        class=\\"class\\"
        style=\\"background: green\\"
      />"
    `);
  });
  it('splits children when attributes are split', () => {
    const outerEl = document.createElement('div');
    outerEl.innerHTML = 'content';
    outerEl.setAttribute('data-asdf', 'foo');
    outerEl.setAttribute('class', 'class');
    outerEl.setAttribute('style', 'background: green');
    expect(printElement(outerEl)).toMatchInlineSnapshot(`
      "<div
        data-asdf=\\"foo\\"
        class=\\"class\\"
        style=\\"background: green\\"
      >
        content
      </div>"
    `);
  });
  it('is smart about which attributes are booleans and which are not', () => {
    const outerEl = document.createElement('input');
    outerEl.setAttribute('required', '');
    outerEl.setAttribute('value', '');
    expect(printElement(outerEl)).toMatchInlineSnapshot(
      `"<input required value=\\"\\" />"`,
    );
  });
});
