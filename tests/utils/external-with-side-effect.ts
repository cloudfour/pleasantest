declare global {
  interface Window {
    foo: string;
  }
}

window.foo = 'hi';
