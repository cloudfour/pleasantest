import { ASTNode, ASTPath, Transform } from 'jscodeshift';
import * as t from 'jscodeshift';
import { PatternKind } from 'ast-types/gen/kinds';

const transform: Transform = (fileInfo, api) => {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const debug = (node: ASTNode | ASTPath) => {
    console.log(j(node).toSource());
  };

  root
    .find(t.CallExpression, {
      callee: {
        type: 'Identifier',
        name: 'test',
      },
    })
    .forEach((test) => {
      // Making sure that the test is being passed a  function
      if (test.node.arguments.length < 2) return;
      const testFn: ASTPath<
        t.ArrowFunctionExpression | t.FunctionExpression
      > = test.get('arguments').get(1);
      if (
        testFn.node.type !== 'ArrowFunctionExpression' &&
        testFn.node.type !== 'FunctionExpression'
      )
        return;
      let id: PatternKind;
      j(testFn)
        .find(t.VariableDeclarator, {
          init: {
            type: 'AwaitExpression',
            argument: {
              type: 'CallExpression',
              callee: { type: 'Identifier', name: 'createTab' },
            },
          },
        })
        .forEach((varDecl) => {
          // this will be the parameter to the fn passed to withBrowser
          // This is probably object destructuring but it may also be an identifier
          id = varDecl.node.id;
          j(varDecl).remove();
        });

      if (!id) return;

      testFn.node.params = [id];
      // j(testFn.get('params')).replaceWith([id]);

      j(testFn).replaceWith(t.callExpression(withBrowserId, [testFn.node]));
    });

  root
    .find(t.ImportDeclaration, {
      source: { type: 'StringLiteral', value: 'test-mule' },
    })
    .forEach((im) => {
      const specifiers = im.node.specifiers;
      im.node.specifiers = specifiers
        .filter((s) => {
          if (s.type !== 'ImportSpecifier') return true;
          if (s.imported.type !== 'Identifier') return true;
          return (
            s.imported.name !== 'createTab' && s.imported.name !== 'withBrowser'
          );
        })
        .concat(t.importSpecifier(withBrowserId));
    });

  return root.toSource();
};

const withBrowserId = t.identifier('withBrowser');

export default transform;
