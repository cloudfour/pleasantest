import type polka from 'polka';

const defaultHTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:;base64,=" />
    <title>pleasantest</title>
  </head>
  <body>
    <h1 style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)">
      Your test will run here
    </h1>
  </body>
</html>
`;

export const indexHTMLMiddleware: polka.Middleware = (req, res, next) => {
  if (req.url !== '/') return next();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.write(defaultHTML);
  res.end();
};
