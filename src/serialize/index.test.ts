/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require"]}
 */
import { deserialize, printElement, serialize } from './index.js';

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
    expect(printElement(document, false)).toMatchInlineSnapshot(`"#document"`);
  });
  it('formats an empty element', () => {
    const outerEl = document.createElement('div');
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(`"<div />"`);
  });
  it('formats an element with a single text node', () => {
    const outerEl = document.createElement('div');
    outerEl.innerHTML = 'asdf';
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(
      `"<div>asdf</div>"`,
    );
  });
  it('formats an element with multiple text nodes', () => {
    const outerEl = document.createElement('div');
    outerEl.append(
      document.createTextNode('first'),
      document.createTextNode('second'),
    );
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(
      `"<div>firstsecond</div>"`,
    );
  });
  it('formats consecutive whitespace as single space except when white-space is set in CSS', () => {
    const outerEl = document.createElement('div');
    outerEl.append(
      document.createTextNode('first\n\n  '),
      document.createTextNode('\n second  third\n '),
    );
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(
      `"<div>first second third </div>"`,
    );
    outerEl.style.whiteSpace = 'pre';
    // eslint-disable-next-line @cloudfour/unicorn/template-indent
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(`
      "<div style=\\"white-space: pre;\\">
        first
        
          
         second  third
         
      </div>"
    `);
    outerEl.style.whiteSpace = 'pre-line';
    // eslint-disable-next-line @cloudfour/unicorn/template-indent
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(`
      "<div style=\\"white-space: pre-line;\\">
        first
        
         
         second third
         
      </div>"
    `);
  });
  it('Removes whitespace-only text nodes when printing elements across multiple lines', () => {
    const outerEl = document.createElement('div');
    outerEl.innerHTML = `
      
      <h1> Hi </h1>

      <h2>Hi  </h2>
    `;
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(`
      "<div>
        <h1> Hi </h1>
        <h2>Hi </h2>
      </div>"
    `);
  });
  it('formats an element with nested children', () => {
    const outerEl = document.createElement('div');
    outerEl.innerHTML = '<strong><a>Hi</a></strong>';
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(`
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
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(`
      "<div>
        <input />
        <img />
      </div>"
    `);
  });
  it('formats attributes on one line', () => {
    const outerEl = document.createElement('div');
    outerEl.dataset.asdf = 'foo';
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(
      `"<div data-asdf=\\"foo\\" />"`,
    );
  });
  it('formats > 2 attributes on multiple lines', () => {
    const outerEl = document.createElement('div');
    outerEl.dataset.asdf = 'foo';
    outerEl.setAttribute('class', 'class');
    outerEl.setAttribute('style', 'background: green');
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(`
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
    outerEl.dataset.asdf = 'foo';
    outerEl.setAttribute('class', 'class');
    outerEl.setAttribute('style', 'background: green');
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(`
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
    expect(printElement(outerEl, false)).toMatchInlineSnapshot(
      `"<input required value=\\"\\" />"`,
    );
  });
  it('truncates long attributes', () => {
    const el = document.createElement('a');
    el.setAttribute(
      'href',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(printElement(el, false)).toMatchInlineSnapshot(
      `"<a href=\\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[...]\\" />"`,
    );
  });
  it('truncates <path d="..." /> very short', () => {
    const el = document.createElement('path');
    el.setAttribute('d', 'svgsvgsvgsvgsvgsvgsvgsvgsvgsvgsvgsvgsvgsvgsvgsvgsvg');
    expect(printElement(el, false)).toMatchInlineSnapshot(
      `"<path d=\\"svgsvgsvgsvgsvgsvgsvgsvgsvgsvg[...]\\" />"`,
    );
  });
});
