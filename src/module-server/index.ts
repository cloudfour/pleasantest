import type polka from 'polka';
import { indexHTMLMiddleware } from './middleware/index-html';
import { jsMiddleware } from './middleware/js';
import { createServer } from './server';

interface ModuleServerOpts {
  root?: string;
}

export const createModuleServer = async ({
  root = process.cwd(),
}: ModuleServerOpts = {}) => {
  const middleware: polka.Middleware[] = [
    indexHTMLMiddleware,
    jsMiddleware({ root }),
  ];
  const server = await createServer({ middleware });
};
