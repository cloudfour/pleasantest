import { withBrowser } from 'test-mule';

test(
  'toBeEmptyDOMElement',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <div data-testid="notempty">
      <div data-testid="empty"></div>
    </div>
  `);
    const empty = await screen.getByTestId('empty');
    const notempty = await screen.getByTestId('notempty');
    await expect(empty).toBeEmptyDOMElement();
    await expect(notempty).not.toBeEmptyDOMElement();
    await expect(expect(notempty).toBeEmptyDOMElement()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toBeEmptyDOMElement()[22m

            Received:
              [31m<div data-testid=\\"notempty\\">
              
                  
              <div data-testid=\\"empty\\" />
              
                
            </div>[39m"
          `);
  }),
);
