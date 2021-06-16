import type { Polka } from 'polka';
import polka from 'polka';

interface ServerOpts {
  middleware: polka.Middleware[];
}

export const createServer = ({ middleware }: ServerOpts) =>
  new Promise<Polka>((resolve) => {
    // TODO: use different port if port is taken
    const port = 3000;
    const server = polka({});
    if (middleware.length > 0) server.use(...middleware);
    server.listen(port, undefined, () => resolve(server));
  });
