export {};

declare global {
  interface Window {
    __putElementInStringMap: (el: Element) => string;
  }
}
