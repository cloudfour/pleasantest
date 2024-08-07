import {
  computeAccessibleDescription,
  computeAccessibleName,
  getRole,
} from 'dom-accessibility-api';
// @ts-expect-error This is a fake file that triggers a rollup plugin
import requiredOwnedElementsMap from 'generated:requiredOwnedElements';
import * as colors from 'kolorist';

import type { AccessibilityTreeOptions } from './index.js';

export * as colors from 'kolorist';
export { printElement } from '../serialize/index.js';

// We have to tell kolorist to print the colors
// because by default it won't since we are in the browser
// (the colored message gets sent to node to be printed)
colors.options.enabled = true;
colors.options.supportLevel = 1;

const indent = (text: string, indenter = '  ') =>
  indenter + text.split('\n').join(`\n${indenter}`);

// This data was extracted from the aria-query library
//  https://github.com/A11yance/aria-query/blob/main/scripts/roles.json
const rolesWithChildrenPresentation = new Set([
  'button',
  'checkbox',
  'doc-pagebreak',
  'img',
  'menuitemcheckbox',
  'menuitemradio',
  'meter',
  'option',
  'progressbar',
  'radio',
  'scrollbar',
  'separator',
  'slider',
  'switch',
  'tab',
]);

const enum AccessibilityState {
  /** This element is included in the accessibility tree and its descendents could be included */
  SelfIncludedInTree,
  /** This element is excluded from the accessibility tree, but its descendents could be included */
  SelfExcludedFromTree,
  /** Both this element and its descendents are excluded from the accessibility tree */
  SelfAndDescendentsExcludedFromTree,
}

const getElementAccessibilityState = (element: Element): AccessibilityState => {
  const computedStyle = getComputedStyle(element);
  if (
    (element as HTMLElement).hidden ||
    element.getAttribute('aria-hidden') === 'true' ||
    computedStyle.display === 'none' ||
    (element.parentElement?.tagName === 'DETAILS' &&
      !(element.parentElement as HTMLDetailsElement).open &&
      !(
        element.tagName === 'SUMMARY' &&
        element.parentElement.firstElementChild === element
      ))
  )
    return AccessibilityState.SelfAndDescendentsExcludedFromTree;

  // An element can have visibility: 'hidden' but its descendents can override visibility
  if (computedStyle.visibility === 'hidden')
    return AccessibilityState.SelfExcludedFromTree;

  return AccessibilityState.SelfIncludedInTree;
};

/** Temporarily removes the role attribute to get the implicit role */
const getImplicitRole = (el: Element) => {
  const originalRole = el.getAttribute('role');
  el.removeAttribute('role');
  const implicitRole = getRole(el);
  if (originalRole) el.setAttribute('role', originalRole);
  return implicitRole;
};

export const getAccessibilityTree = (
  element: Element,
  opts: AccessibilityTreeOptions,
  /**
   * Any elements with *implicitly set* roles in this array will be treated as role="presentation".
   * This is intended to be used when a parent element has role="presentation",
   * and its children in the accessibility tree (or descendents in the DOM tree)
   * without explicit roles need to be hidden if they are required owned elements.
   * https://www.digitala11y.com/presentation-role/
   */
  presentationalRoles: string[] = [],
): string => {
  const accessibilityState = getElementAccessibilityState(element);
  if (
    accessibilityState === AccessibilityState.SelfAndDescendentsExcludedFromTree
  )
    return '';
  const { includeDescriptions = true, includeText = true } = opts;
  const role = getRole(element);
  const selfIsInAccessibilityTree =
    role &&
    accessibilityState === AccessibilityState.SelfIncludedInTree &&
    role !== 'presentation' &&
    role !== 'none' &&
    !(
      presentationalRoles.includes(role) &&
      // Check that no explicit role is set
      !element.hasAttribute('role')
    );
  let text = (selfIsInAccessibilityTree && role) || '';
  if (selfIsInAccessibilityTree) {
    let name = computeAccessibleName(element).replace(/\s+/g, ' ');
    if (
      element === document.documentElement &&
      role === 'document' &&
      !name &&
      document.title
    ) {
      name = document.title;
    }
    if (name) text += ` "${name}"`;
    if (
      element.ariaExpanded === 'true' ||
      (element.tagName === 'SUMMARY' &&
        (element.parentElement as HTMLDetailsElement).open)
    )
      text += ` (expanded=true)`;
    if (
      element.ariaExpanded === 'false' ||
      (element.tagName === 'SUMMARY' &&
        !(element.parentElement as HTMLDetailsElement).open)
    )
      text += ` (expanded=false)`;
    if (document.activeElement === element) text += ` (focused)`;
    if (role === 'heading') {
      const level =
        element.ariaLevel ||
        (element.tagName.length === 2 &&
          element.tagName.startsWith('H') &&
          element.tagName[1]);
      if (level) {
        text +=
          Number.parseInt(level, 10).toString() === level &&
          Number.parseInt(level, 10) > 0
            ? ` (level=${level})`
            : ` (INVALID HEADING LEVEL: ${JSON.stringify(level)})`;
      } else {
        text += ` (MISSING HEADING LEVEL)`;
      }
    }
    if (includeDescriptions) {
      const description = computeAccessibleDescription(element);
      if (description) text += `\n  ↳ description: "${description}"`;
    }
  }
  const printedChildren = [];

  // Some roles have a `childrenArePresentational` attribute which means all of
  // their children should be excluded from the accessibility tree.
  // For example, a button should not have its button text displayed,
  // since it's already used as the accessible name.
  // https://www.w3.org/TR/wai-aria-1.1/#childrenArePresentational
  if (role && rolesWithChildrenPresentation.has(role)) return text;
  const requiredOwnedElements =
    role === null
      ? // Pass along the presentational roles from the parents
        presentationalRoles
      : ((role === 'none' || role === 'presentation') &&
          requiredOwnedElementsMap.get(getImplicitRole(element))) ||
        [];
  for (const node of element.childNodes) {
    let printedChild;
    if (node instanceof Element) {
      printedChild = getAccessibilityTree(node, opts, requiredOwnedElements);
    } else if (includeText && !(node instanceof Comment)) {
      // Trim whitespace from ends and normalize all whitespace to a single space
      const trimmedText = node.nodeValue?.trim().replace(/\s+/g, ' ');
      if (!trimmedText) continue;

      printedChild = `text "${trimmedText}"`;
    }
    if (printedChild) printedChildren.push(printedChild);
  }
  if (printedChildren.length > 0) {
    if (text.length > 0) text += '\n';
    text += selfIsInAccessibilityTree
      ? indent(printedChildren.join('\n'))
      : printedChildren.join('\n');
  }
  return text;
};
