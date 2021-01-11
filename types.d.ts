export {};

declare global {
  interface Window {
    __testMuleDebug__?: boolean;
    __putElementInStringMap: (el: Element) => string;
  }
}
