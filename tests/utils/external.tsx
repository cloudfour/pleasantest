import { h, render as preactRender } from 'preact';

/** @jsx h */

const App = () => <h1>Hi</h1>;

export const render = () => {
  preactRender(<App />, document.body);
};

const ThrowComponent = () => {
  throw new Error('you have rendered the death component');
};

export const renderThrow = () => {
  preactRender(<ThrowComponent />, document.body);
};
