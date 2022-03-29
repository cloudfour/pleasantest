import {
  getRole,
  computeAccessibleName,
  computeAccessibleDescription,
} from 'dom-accessibility-api';
// @ts-expect-error This is a fake file that triggers a rollup plugin
import requiredOwnedElementsMap from 'generated:requiredOwnedElements';
import type { AccessibilityTreeOptions } from '.';

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
    computedStyle.display === 'none'
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
    let name = computeAccessibleName(element);
    if (
      element === document.documentElement &&
      role === 'document' &&
      !name &&
      document.title
    ) {
      name = document.title;
    }
    if (name) text += ` "${name}"`;
    if (document.activeElement === element) text += ` (focused)`;
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
      const trimmedText = node.nodeValue?.trim();
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
