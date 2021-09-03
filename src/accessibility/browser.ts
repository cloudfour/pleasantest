import {
  getRole,
  computeAccessibleName,
  computeAccessibleDescription,
} from 'dom-accessibility-api';
import type { AccessibilityTreeOptions } from '.';

const indent = (text: string, indenter = '  ') =>
  indenter + text.split('\n').join(`\n${indenter}`);

const enum AccessibilityState {
  /** This element is included in the accessibility tree and its descendents could be included */
  SelfIncludedInTree,
  /** This element is excluded from the accessibility tree, but its descendents could be included */
  SelfExcludedFromTree,
  /** Both this element and its descendents are excluded from the accessibility tree */
  SelfAndDescendentsExcludedFromTree,
}

// TODO in PR: what about role="presentation" or role="none"? Should they be excluded?
const getElementAccessibilityState = (element: Element): AccessibilityState => {
  const computedStyle = getComputedStyle(element);
  if (
    (element as HTMLElement).hidden ||
    element.getAttribute('aria-hidden') === 'true' ||
    computedStyle.display === 'none'
  )
    return AccessibilityState.SelfAndDescendentsExcludedFromTree;

  // An element can have visibility: 'hidden' but its descendents can override visibility
  if (computedStyle.visibility === 'hidden')
    return AccessibilityState.SelfExcludedFromTree;

  return AccessibilityState.SelfIncludedInTree;
};

export const getAccessibilityTree = (
  element: Element,
  opts: AccessibilityTreeOptions,
): string => {
  const accessibilityState = getElementAccessibilityState(element);
  if (
    accessibilityState === AccessibilityState.SelfAndDescendentsExcludedFromTree
  )
    return '';
  const { includeDescriptions = true, includeText = false } = opts;
  const role = getRole(element);
  const printSelf =
    role && accessibilityState === AccessibilityState.SelfIncludedInTree;
  let text = (printSelf && role) || '';
  if (printSelf) {
    const name = computeAccessibleName(element);
    if (name) text += ` "${name}"`;
    if (document.activeElement === element) text += ` (focused)`;
    if (includeDescriptions) {
      const description = computeAccessibleDescription(element);
      if (description) text += `\n  ↳ description: "${description}"`;
    }
  }
  const printedChildren = [];
  for (const node of element.childNodes) {
    let printedChild;
    if (node instanceof Element) {
      printedChild = getAccessibilityTree(node, opts);
    } else if (includeText) {
      const trimmedText = node.nodeValue?.trim();
      if (!trimmedText) continue;
      printedChild = `text "${trimmedText}"`;
    }
    if (printedChild) printedChildren.push(printedChild);
  }
  if (printedChildren.length > 0) {
    if (text.length > 0) text += '\n';
    text += printSelf
      ? indent(printedChildren.join('\n'))
      : printedChildren.join('\n');
  }
  return text;
};
