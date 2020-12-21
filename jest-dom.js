let _exports = string => {
  const match = string.match(/^[ \t]*(?=\S)/gm);

  if (!match) {
    return 0;
  }

  return match.reduce((r, a) => Math.min(r, a.length), Infinity);
};

let _exports$1 = string => {
  const indent = _exports(string);

  if (indent === 0) {
    return string;
  }

  const regex = new RegExp(`^[ \\t]{${indent}}`, 'gm');
  return string.replace(regex, '');
};

let _exports$2 = (string, count = 1, options) => {
  options = {
    indent: ' ',
    includeEmptyLines: false,
    ...options
  };

  if (typeof string !== 'string') {
    throw new TypeError(`Expected \`input\` to be a \`string\`, got \`${typeof string}\``);
  }

  if (typeof count !== 'number') {
    throw new TypeError(`Expected \`count\` to be a \`number\`, got \`${typeof count}\``);
  }

  if (typeof options.indent !== 'string') {
    throw new TypeError(`Expected \`options.indent\` to be a \`string\`, got \`${typeof options.indent}\``);
  }

  if (count === 0) {
    return string;
  }

  const regex = options.includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
  return string.replace(regex, options.indent.repeat(count));
};

let _exports$3 = (string, count = 0, options) => _exports$2(_exports$1(string), count, options);

/**
 * Sort objects by object properties
 */
/**
 * Shallowly compare to values
 */

function isEqual(a, b) {
  if (a === null || b === null) {
    return a === b;
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  } else if (a instanceof RegExp && b instanceof RegExp) {
    return "" + a === "" + b;
  } else if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;

    for (const v of a.values()) {
      if (!b.has(v)) return false;
    }

    return true;
  } else if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;

    for (const [k, v] of a.entries()) {
      if (!b.has(k)) return false;
      if (b.get(k) !== v) return false;
    }

    return true;
  } else if (a instanceof Date && b instanceof Date) {
    return +a === +b;
  } else if (typeof a === "object" && typeof b === "object") {
    for (const i in a) if (!(i in b)) return false;

    for (const i in b) if (a[i] !== b[i]) return false;

    return true;
  }

  return a === b;
}

class HtmlElementTypeError extends Error {
  constructor(received, matcherFn, context) {
    super();
    /* istanbul ignore next */

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, matcherFn);
    }

    let withType = '';

    try {
      withType = context.utils.printWithType('Received', received, context.utils.printReceived);
    } catch (e) {// Can throw for Document:
      // https://github.com/jsdom/jsdom/issues/2304
    }

    this.message = [context.utils.matcherHint(`${context.isNot ? '.not' : ''}.${matcherFn.name}`, 'received', ''), '', // eslint-disable-next-line babel/new-cap
    `${context.utils.RECEIVED_COLOR('received')} value must be an HTMLElement or an SVGElement.`, withType].join('\n');
  }

}

function checkHasWindow(htmlElement, ...args) {
  if (!htmlElement || !htmlElement.ownerDocument || !htmlElement.ownerDocument.defaultView) {
    throw new HtmlElementTypeError(htmlElement, ...args);
  }
}

function checkHtmlElement(htmlElement, ...args) {
  checkHasWindow(htmlElement, ...args);
  const window = htmlElement.ownerDocument.defaultView;

  if (!(htmlElement instanceof window.HTMLElement) && !(htmlElement instanceof window.SVGElement)) {
    throw new HtmlElementTypeError(htmlElement, ...args);
  }
}

function display(context, value) {
  return typeof value === 'string' ? value : context.utils.stringify(value);
}

function getMessage(context, matcher, expectedLabel, expectedValue, receivedLabel, receivedValue) {
  return [`${matcher}\n`, // eslint-disable-next-line babel/new-cap
  `${expectedLabel}:\n${context.utils.EXPECTED_COLOR(_exports$3(display(context, expectedValue), 2))}`, // eslint-disable-next-line babel/new-cap
  `${receivedLabel}:\n${context.utils.RECEIVED_COLOR(_exports$3(display(context, receivedValue), 2))}`].join('\n');
}

function matches(textToMatch, matcher) {
  if (matcher instanceof RegExp) {
    return matcher.test(textToMatch);
  } else {
    return textToMatch.includes(String(matcher));
  }
}

function deprecate(name, replacementText) {
  // Notify user that they are using deprecated functionality.
  // eslint-disable-next-line no-console
  console.warn(`Warning: ${name} has been deprecated and will be removed in future updates.`, replacementText);
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function getTag(element) {
  return element.tagName && element.tagName.toLowerCase();
}

function getSelectValue({
  multiple,
  options
}) {
  const selectedOptions = [...options].filter(option => option.selected);

  if (multiple) {
    return [...selectedOptions].map(opt => opt.value);
  }
  /* istanbul ignore if */


  if (selectedOptions.length === 0) {
    return undefined; // Couldn't make this happen, but just in case
  }

  return selectedOptions[0].value;
}

function getInputValue(inputElement) {
  switch (inputElement.type) {
    case 'number':
      return inputElement.value === '' ? null : Number(inputElement.value);

    case 'checkbox':
      return inputElement.checked;

    default:
      return inputElement.value;
  }
}

function getSingleElementValue(element) {
  /* istanbul ignore if */
  if (!element) {
    return undefined;
  }

  switch (element.tagName.toLowerCase()) {
    case 'input':
      return getInputValue(element);

    case 'select':
      return getSelectValue(element);

    default:
      return element.value;
  }
}

function compareArraysAsSet(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return isEqual(new Set(a), new Set(b));
  }

  return undefined;
}

function toSentence(array, {
  wordConnector = ', ',
  lastWordConnector = ' and '
} = {}) {
  return [array.slice(0, -1).join(wordConnector), array[array.length - 1]].join(array.length > 1 ? lastWordConnector : '');
}

function toBeInTheDOM(element, container) {
  deprecate('toBeInTheDOM', 'Please use toBeInTheDocument for searching the entire document and toContainElement for searching a specific container.');

  if (element) {
    checkHtmlElement(element, toBeInTheDOM, this);
  }

  if (container) {
    checkHtmlElement(container, toBeInTheDOM, this);
  }

  return {
    pass: container ? container.contains(element) : !!element,
    message: () => {
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeInTheDOM`, 'element', ''), '', 'Received:', `  ${this.utils.printReceived(element ? element.cloneNode(false) : element)}`].join('\n');
    }
  };
}

function toBeInTheDocument(element) {
  if (element !== null || !this.isNot) {
    checkHtmlElement(element, toBeInTheDocument, this);
  }

  const pass = element === null ? false : element.ownerDocument === element.getRootNode({
    composed: true
  });

  const errorFound = () => {
    return `expected document not to contain element, found ${this.utils.stringify(element.cloneNode(true))} instead`;
  };

  const errorNotFound = () => {
    return `element could not be found in the document`;
  };

  return {
    pass,
    message: () => {
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeInTheDocument`, 'element', ''), '', // eslint-disable-next-line babel/new-cap
      this.utils.RECEIVED_COLOR(this.isNot ? errorFound() : errorNotFound())].join('\n');
    }
  };
}

function toBeEmpty(element) {
  deprecate('toBeEmpty', 'Please use instead toBeEmptyDOMElement for finding empty nodes in the DOM.');

  checkHtmlElement(element, toBeEmpty, this);

  return {
    pass: element.innerHTML === '',
    message: () => {
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeEmpty`, 'element', ''), '', 'Received:', `  ${this.utils.printReceived(element.innerHTML)}`].join('\n');
    }
  };
}

function toBeEmptyDOMElement(element) {
  checkHtmlElement(element, toBeEmptyDOMElement, this);

  return {
    pass: element.innerHTML === '',
    message: () => {
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeEmptyDOMElement`, 'element', ''), '', 'Received:', `  ${this.utils.printReceived(element.innerHTML)}`].join('\n');
    }
  };
}

function toContainElement(container, element) {
  checkHtmlElement(container, toContainElement, this);

  if (element !== null) {
    checkHtmlElement(element, toContainElement, this);
  }

  return {
    pass: container.contains(element),
    message: () => {
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toContainElement`, 'element', 'element'), '', // eslint-disable-next-line babel/new-cap
      this.utils.RECEIVED_COLOR(`${this.utils.stringify(container.cloneNode(false))} ${this.isNot ? 'contains:' : 'does not contain:'} ${this.utils.stringify(element ? element.cloneNode(false) : element)}
        `)].join('\n');
    }
  };
}

function toContainHTML(container, htmlText) {
  checkHtmlElement(container, toContainHTML, this);

  return {
    pass: container.outerHTML.includes(htmlText),
    message: () => {
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toContainHTML`, 'element', ''), '', 'Received:', `  ${this.utils.printReceived(container.cloneNode(true))}`].join('\n');
    }
  };
}

function toHaveTextContent(htmlElement, checkWith, options = {
  normalizeWhitespace: true
}) {
  checkHtmlElement(htmlElement, toHaveTextContent, this);

  const textContent = options.normalizeWhitespace ? normalize(htmlElement.textContent) : htmlElement.textContent.replace(/\u00a0/g, ' '); // Replace &nbsp; with normal spaces

  const checkingWithEmptyString = textContent !== '' && checkWith === '';
  return {
    pass: !checkingWithEmptyString && matches(textContent, checkWith),
    message: () => {
      const to = this.isNot ? 'not to' : 'to';
      return getMessage(this, this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toHaveTextContent`, 'element', ''), checkingWithEmptyString ? `Checking with empty string will always match, use .toBeEmptyDOMElement() instead` : `Expected element ${to} have text content`, checkWith, 'Received', textContent);
    }
  };
}

function printAttribute(stringify, name, value) {
  return value === undefined ? name : `${name}=${stringify(value)}`;
}

function getAttributeComment(stringify, name, value) {
  return value === undefined ? `element.hasAttribute(${stringify(name)})` : `element.getAttribute(${stringify(name)}) === ${stringify(value)}`;
}

function toHaveAttribute(htmlElement, name, expectedValue) {
  checkHtmlElement(htmlElement, toHaveAttribute, this);

  const isExpectedValuePresent = expectedValue !== undefined;
  const hasAttribute = htmlElement.hasAttribute(name);
  const receivedValue = htmlElement.getAttribute(name);
  return {
    pass: isExpectedValuePresent ? hasAttribute && this.equals(receivedValue, expectedValue) : hasAttribute,
    message: () => {
      const to = this.isNot ? 'not to' : 'to';
      const receivedAttribute = hasAttribute ? printAttribute(this.utils.stringify, name, receivedValue) : null;
      const matcher = this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toHaveAttribute`, 'element', this.utils.printExpected(name), {
        secondArgument: isExpectedValuePresent ? this.utils.printExpected(expectedValue) : undefined,
        comment: getAttributeComment(this.utils.stringify, name, expectedValue)
      });
      return getMessage(this, matcher, `Expected the element ${to} have attribute`, printAttribute(this.utils.stringify, name, expectedValue), 'Received', receivedAttribute);
    }
  };
}

function getExpectedClassNamesAndOptions(params) {
  const lastParam = params.pop();
  let expectedClassNames, options;

  if (typeof lastParam === 'object') {
    expectedClassNames = params;
    options = lastParam;
  } else {
    expectedClassNames = params.concat(lastParam);
    options = {
      exact: false
    };
  }

  return {
    expectedClassNames,
    options
  };
}

function splitClassNames(str) {
  if (!str) {
    return [];
  }

  return str.split(/\s+/).filter(s => s.length > 0);
}

function isSubset(subset, superset) {
  return subset.every(item => superset.includes(item));
}

function toHaveClass(htmlElement, ...params) {
  checkHtmlElement(htmlElement, toHaveClass, this);

  const {
    expectedClassNames,
    options
  } = getExpectedClassNamesAndOptions(params);
  const received = splitClassNames(htmlElement.getAttribute('class'));
  const expected = expectedClassNames.reduce((acc, className) => acc.concat(splitClassNames(className)), []);

  if (options.exact) {
    return {
      pass: isSubset(expected, received) && expected.length === received.length,
      message: () => {
        const to = this.isNot ? 'not to' : 'to';
        return getMessage(this, `Expected the element ${to} have EXACTLY defined classes`, expected.join(' '), 'Received', received.join(' '));
      }
    };
  }

  return expected.length > 0 ? {
    pass: isSubset(expected, received),
    message: () => {
      const to = this.isNot ? 'not to' : 'to';
      return getMessage(this, this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toHaveClass`, 'element', this.utils.printExpected(expected.join(' '))), `Expected the element ${to} have class`, expected.join(' '), 'Received', received.join(' '));
    }
  } : {
    pass: this.isNot ? received.length > 0 : false,
    message: () => this.isNot ? getMessage(this, this.utils.matcherHint('.not.toHaveClass', 'element', ''), 'Expected the element to have classes', '(none)', 'Received', received.join(' ')) : [this.utils.matcherHint(`.toHaveClass`, 'element'), 'At least one expected class must be provided.'].join('\n')
  };
}

function toHaveStyle() {
  throw new Error('toHaveStyle is not implemented.');
}

function toHaveFocus(element) {
  checkHtmlElement(element, toHaveFocus, this);

  return {
    pass: element.ownerDocument.activeElement === element,
    message: () => {
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toHaveFocus`, 'element', ''), '', 'Expected element with focus:', `  ${this.utils.printExpected(element)}`, 'Received element with focus:', `  ${this.utils.printReceived(element.ownerDocument.activeElement)}`].join('\n');
    }
  };
}

function toHaveFormValues() {
  throw new Error('toHaveFormValues is not implemented.');
}

function isStyleVisible(element) {
  const {
    getComputedStyle
  } = element.ownerDocument.defaultView;
  const {
    display,
    visibility,
    opacity
  } = getComputedStyle(element);
  return display !== 'none' && visibility !== 'hidden' && visibility !== 'collapse' && opacity !== '0' && opacity !== 0;
}

function isAttributeVisible(element, previousElement) {
  return !element.hasAttribute('hidden') && (element.nodeName === 'DETAILS' && previousElement.nodeName !== 'SUMMARY' ? element.hasAttribute('open') : true);
}

function isElementVisible(element, previousElement) {
  return isStyleVisible(element) && isAttributeVisible(element, previousElement) && (!element.parentElement || isElementVisible(element.parentElement, element));
}

function toBeVisible(element) {
  checkHtmlElement(element, toBeVisible, this);

  const isVisible = isElementVisible(element);
  return {
    pass: isVisible,
    message: () => {
      const is = isVisible ? 'is' : 'is not';
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeVisible`, 'element', ''), '', `Received element ${is} visible:`, `  ${this.utils.printReceived(element.cloneNode(false))}`].join('\n');
    }
  };
}

// form elements that support 'disabled'
const FORM_TAGS = ['fieldset', 'input', 'select', 'optgroup', 'option', 'button', 'textarea'];
/*
 * According to specification:
 * If <fieldset> is disabled, the form controls that are its descendants,
 * except descendants of its first optional <legend> element, are disabled
 *
 * https://html.spec.whatwg.org/multipage/form-elements.html#concept-fieldset-disabled
 *
 * This method tests whether element is first legend child of fieldset parent
 */

function isFirstLegendChildOfFieldset(element, parent) {
  return getTag(element) === 'legend' && getTag(parent) === 'fieldset' && element.isSameNode(Array.from(parent.children).find(child => getTag(child) === 'legend'));
}

function isElementDisabledByParent(element, parent) {
  return isElementDisabled(parent) && !isFirstLegendChildOfFieldset(element, parent);
}

function canElementBeDisabled(element) {
  return FORM_TAGS.includes(getTag(element));
}

function isElementDisabled(element) {
  return canElementBeDisabled(element) && element.hasAttribute('disabled');
}

function isAncestorDisabled(element) {
  const parent = element.parentElement;
  return Boolean(parent) && (isElementDisabledByParent(element, parent) || isAncestorDisabled(parent));
}

function isElementOrAncestorDisabled(element) {
  return canElementBeDisabled(element) && (isElementDisabled(element) || isAncestorDisabled(element));
}

function toBeDisabled(element) {
  checkHtmlElement(element, toBeDisabled, this);

  const isDisabled = isElementOrAncestorDisabled(element);
  return {
    pass: isDisabled,
    message: () => {
      const is = isDisabled ? 'is' : 'is not';
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeDisabled`, 'element', ''), '', `Received element ${is} disabled:`, `  ${this.utils.printReceived(element.cloneNode(false))}`].join('\n');
    }
  };
}

function toBeEnabled(element) {
  checkHtmlElement(element, toBeEnabled, this);

  const isEnabled = !isElementOrAncestorDisabled(element);
  return {
    pass: isEnabled,
    message: () => {
      const is = isEnabled ? 'is' : 'is not';
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeEnabled`, 'element', ''), '', `Received element ${is} enabled:`, `  ${this.utils.printReceived(element.cloneNode(false))}`].join('\n');
    }
  };
}

// form elements that support 'required'
const FORM_TAGS$1 = ['select', 'textarea'];
const ARIA_FORM_TAGS = ['input', 'select', 'textarea'];
const UNSUPPORTED_INPUT_TYPES = ['color', 'hidden', 'range', 'submit', 'image', 'reset'];
const SUPPORTED_ARIA_ROLES = ['combobox', 'gridcell', 'radiogroup', 'spinbutton', 'tree'];

function isRequiredOnFormTagsExceptInput(element) {
  return FORM_TAGS$1.includes(getTag(element)) && element.hasAttribute('required');
}

function isRequiredOnSupportedInput(element) {
  return getTag(element) === 'input' && element.hasAttribute('required') && (element.hasAttribute('type') && !UNSUPPORTED_INPUT_TYPES.includes(element.getAttribute('type')) || !element.hasAttribute('type'));
}

function isElementRequiredByARIA(element) {
  return element.hasAttribute('aria-required') && element.getAttribute('aria-required') === 'true' && (ARIA_FORM_TAGS.includes(getTag(element)) || element.hasAttribute('role') && SUPPORTED_ARIA_ROLES.includes(element.getAttribute('role')));
}

function toBeRequired(element) {
  checkHtmlElement(element, toBeRequired, this);

  const isRequired = isRequiredOnFormTagsExceptInput(element) || isRequiredOnSupportedInput(element) || isElementRequiredByARIA(element);
  return {
    pass: isRequired,
    message: () => {
      const is = isRequired ? 'is' : 'is not';
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeRequired`, 'element', ''), '', `Received element ${is} required:`, `  ${this.utils.printReceived(element.cloneNode(false))}`].join('\n');
    }
  };
}

const FORM_TAGS$2 = ['form', 'input', 'select', 'textarea'];

function isElementHavingAriaInvalid(element) {
  return element.hasAttribute('aria-invalid') && element.getAttribute('aria-invalid') !== 'false';
}

function isSupportsValidityMethod(element) {
  return FORM_TAGS$2.includes(getTag(element));
}

function isElementInvalid(element) {
  const isHaveAriaInvalid = isElementHavingAriaInvalid(element);

  if (isSupportsValidityMethod(element)) {
    return isHaveAriaInvalid || !element.checkValidity();
  } else {
    return isHaveAriaInvalid;
  }
}

function toBeInvalid(element) {
  checkHtmlElement(element, toBeInvalid, this);

  const isInvalid = isElementInvalid(element);
  return {
    pass: isInvalid,
    message: () => {
      const is = isInvalid ? 'is' : 'is not';
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeInvalid`, 'element', ''), '', `Received element ${is} currently invalid:`, `  ${this.utils.printReceived(element.cloneNode(false))}`].join('\n');
    }
  };
}

function toBeValid(element) {
  checkHtmlElement(element, toBeValid, this);

  const isValid = !isElementInvalid(element);
  return {
    pass: isValid,
    message: () => {
      const is = isValid ? 'is' : 'is not';
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeValid`, 'element', ''), '', `Received element ${is} currently valid:`, `  ${this.utils.printReceived(element.cloneNode(false))}`].join('\n');
    }
  };
}

var _isEqualWith = (value, other, customizer) => {
      const result = customizer(value, other);
      if (result !== undefined) return result
      return isEqual(value, other)
    };

function toHaveValue(htmlElement, expectedValue) {
  checkHtmlElement(htmlElement, toHaveValue, this);

  if (htmlElement.tagName.toLowerCase() === 'input' && ['checkbox', 'radio'].includes(htmlElement.type)) {
    throw new Error('input with type=checkbox or type=radio cannot be used with .toHaveValue(). Use .toBeChecked() for type=checkbox or .toHaveFormValues() instead');
  }

  const receivedValue = getSingleElementValue(htmlElement);

  const expectsValue = expectedValue !== undefined;
  let expectedTypedValue = expectedValue;
  let receivedTypedValue = receivedValue;

  if (expectedValue == receivedValue && expectedValue !== receivedValue) {
    expectedTypedValue = `${expectedValue} (${typeof expectedValue})`;
    receivedTypedValue = `${receivedValue} (${typeof receivedValue})`;
  }

  return {
    pass: expectsValue ? _isEqualWith(receivedValue, expectedValue, compareArraysAsSet) : Boolean(receivedValue),
    message: () => {
      const to = this.isNot ? 'not to' : 'to';
      const matcher = this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toHaveValue`, 'element', expectedValue);
      return getMessage(this, matcher, `Expected the element ${to} have value`, expectsValue ? expectedTypedValue : '(any)', 'Received', receivedTypedValue);
    }
  };
}

function toHaveDisplayValue(htmlElement, expectedValue) {
  checkHtmlElement(htmlElement, toHaveDisplayValue, this);

  const tagName = htmlElement.tagName.toLowerCase();

  if (!['select', 'input', 'textarea'].includes(tagName)) {
    throw new Error('.toHaveDisplayValue() currently supports only input, textarea or select elements, try with another matcher instead.');
  }

  if (tagName === 'input' && ['radio', 'checkbox'].includes(htmlElement.type)) {
    throw new Error(`.toHaveDisplayValue() currently does not support input[type="${htmlElement.type}"], try with another matcher instead.`);
  }

  const values = getValues(tagName, htmlElement);
  const expectedValues = getExpectedValues(expectedValue);
  const numberOfMatchesWithValues = getNumberOfMatchesBetweenArrays(values, expectedValues);
  const matchedWithAllValues = numberOfMatchesWithValues === values.length;
  const matchedWithAllExpectedValues = numberOfMatchesWithValues === expectedValues.length;
  return {
    pass: matchedWithAllValues && matchedWithAllExpectedValues,
    message: () => getMessage(this, this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toHaveDisplayValue`, 'element', ''), `Expected element ${this.isNot ? 'not ' : ''}to have display value`, expectedValue, 'Received', values)
  };
}

function getValues(tagName, htmlElement) {
  return tagName === 'select' ? Array.from(htmlElement).filter(option => option.selected).map(option => option.textContent) : [htmlElement.value];
}

function getExpectedValues(expectedValue) {
  return expectedValue instanceof Array ? expectedValue : [expectedValue];
}

function getNumberOfMatchesBetweenArrays(arrayBase, array) {
  return array.filter(expected => arrayBase.filter(value => matches(value, expected)).length).length;
}

const roles = {
      'get': () => ({ props: { 'aria-checked': true } })
    };

function toBeChecked(element) {
  checkHtmlElement(element, toBeChecked, this);

  const isValidInput = () => {
    return element.tagName.toLowerCase() === 'input' && ['checkbox', 'radio'].includes(element.type);
  };

  if (!isValidInput() && !(() => {
    return roleSupportsChecked(element.getAttribute('role')) && ['true', 'false'].includes(element.getAttribute('aria-checked'));
  })()) {
    return {
      pass: false,
      message: () => `only inputs with type="checkbox" or type="radio" or elements with ${supportedRolesSentence()} and a valid aria-checked attribute can be used with .toBeChecked(). Use .toHaveValue() instead`
    };
  }

  const isChecked = () => {
    if (isValidInput()) return element.checked;
    return element.getAttribute('aria-checked') === 'true';
  };

  return {
    pass: isChecked(),
    message: () => {
      const is = isChecked() ? 'is' : 'is not';
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBeChecked`, 'element', ''), '', `Received element ${is} checked:`, `  ${this.utils.printReceived(element.cloneNode(false))}`].join('\n');
    }
  };
}

function supportedRolesSentence() {
  return toSentence(supportedRoles().map(role => `role="${role}"`), {
    lastWordConnector: ' or '
  });
}

function supportedRoles() {
  return Array.from(roles.keys()).filter(roleSupportsChecked);
}

function roleSupportsChecked(role) {
  var _roles$get;

  return ((_roles$get = roles.get(role)) == null ? void 0 : _roles$get.props['aria-checked']) !== undefined;
}

function toBePartiallyChecked(element) {
  checkHtmlElement(element, toBePartiallyChecked, this);

  const isValidInput = () => {
    return element.tagName.toLowerCase() === 'input' && element.type === 'checkbox';
  };

  if (!isValidInput() && !(() => {
    return element.getAttribute('role') === 'checkbox';
  })()) {
    return {
      pass: false,
      message: () => 'only inputs with type="checkbox" or elements with role="checkbox" and a valid aria-checked attribute can be used with .toBePartiallyChecked(). Use .toHaveValue() instead'
    };
  }

  const isPartiallyChecked = () => {
    const isAriaMixed = element.getAttribute('aria-checked') === 'mixed';

    if (isValidInput()) {
      return element.indeterminate || isAriaMixed;
    }

    return isAriaMixed;
  };

  return {
    pass: isPartiallyChecked(),
    message: () => {
      const is = isPartiallyChecked() ? 'is' : 'is not';
      return [this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toBePartiallyChecked`, 'element', ''), '', `Received element ${is} partially checked:`, `  ${this.utils.printReceived(element.cloneNode(false))}`].join('\n');
    }
  };
}

// See algoritm: https://www.w3.org/TR/accname-1.1/#mapping_additional_nd_description
function toHaveDescription(htmlElement, checkWith) {
  checkHtmlElement(htmlElement, toHaveDescription, this);

  const expectsDescription = checkWith !== undefined;
  const descriptionIDRaw = htmlElement.getAttribute('aria-describedby') || '';
  const descriptionIDs = descriptionIDRaw.split(/\s+/).filter(Boolean);
  let description = '';

  if (descriptionIDs.length > 0) {
    const document = htmlElement.ownerDocument;
    const descriptionEls = descriptionIDs.map(descriptionID => document.getElementById(descriptionID)).filter(Boolean);
    description = normalize(descriptionEls.map(el => el.textContent).join(' '));
  }

  return {
    pass: expectsDescription ? checkWith instanceof RegExp ? checkWith.test(description) : this.equals(description, checkWith) : Boolean(description),
    message: () => {
      const to = this.isNot ? 'not to' : 'to';
      return getMessage(this, this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toHaveDescription`, 'element', ''), `Expected the element ${to} have description`, this.utils.printExpected(checkWith), 'Received', this.utils.printReceived(description));
    }
  };
}

const toBeInTheDOM$1 = toBeInTheDOM;
const toBeInTheDocument$1 = toBeInTheDocument;
const toBeEmpty$1 = toBeEmpty;
const toBeEmptyDOMElement$1 = toBeEmptyDOMElement;
const toContainElement$1 = toContainElement;
const toContainHTML$1 = toContainHTML;
const toHaveTextContent$1 = toHaveTextContent;
const toHaveAttribute$1 = toHaveAttribute;
const toHaveClass$1 = toHaveClass;
const toHaveStyle$1 = toHaveStyle;
const toHaveFocus$1 = toHaveFocus;
const toHaveFormValues$1 = toHaveFormValues;
const toBeVisible$1 = toBeVisible;
const toBeDisabled$1 = toBeDisabled;
const toBeEnabled$1 = toBeEnabled;
const toBeRequired$1 = toBeRequired;
const toBeInvalid$1 = toBeInvalid;
const toBeValid$1 = toBeValid;
const toHaveValue$1 = toHaveValue;
const toHaveDisplayValue$1 = toHaveDisplayValue;
const toBeChecked$1 = toBeChecked;
const toBePartiallyChecked$1 = toBePartiallyChecked;
const toHaveDescription$1 = toHaveDescription;

/** @type {{utils: Partial<jest.MatcherUtils['utils']>}} */

const jestContext = {
  utils: {
    matcherHint(...args) {
      return `$$JEST_UTILS$$.matcherHint(${JSON.stringify(args, serialize)})`;
    },

    printReceived(...args) {
      return `$$JEST_UTILS$$.printReceived(${JSON.stringify(args, serialize)})`;
    }

  }
};
/**
 * Converts a parameter to something that can be JSON-serialized
 * @param {any} _key
 * @param {unknown} value
 */

const serialize = (_key, value) => {
  if (value instanceof HTMLElement) {
    return {
      __serialized: 'HTMLElement',
      outerHTML: value.outerHTML
    };
  }

  return value;
};

export { jestContext, toBeChecked$1 as toBeChecked, toBeDisabled$1 as toBeDisabled, toBeEmpty$1 as toBeEmpty, toBeEmptyDOMElement$1 as toBeEmptyDOMElement, toBeEnabled$1 as toBeEnabled, toBeInTheDOM$1 as toBeInTheDOM, toBeInTheDocument$1 as toBeInTheDocument, toBeInvalid$1 as toBeInvalid, toBePartiallyChecked$1 as toBePartiallyChecked, toBeRequired$1 as toBeRequired, toBeValid$1 as toBeValid, toBeVisible$1 as toBeVisible, toContainElement$1 as toContainElement, toContainHTML$1 as toContainHTML, toHaveAttribute$1 as toHaveAttribute, toHaveClass$1 as toHaveClass, toHaveDescription$1 as toHaveDescription, toHaveDisplayValue$1 as toHaveDisplayValue, toHaveFocus$1 as toHaveFocus, toHaveFormValues$1 as toHaveFormValues, toHaveStyle$1 as toHaveStyle, toHaveTextContent$1 as toHaveTextContent, toHaveValue$1 as toHaveValue };
