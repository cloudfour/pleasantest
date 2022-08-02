import type polka from 'polka';

export const defaultHTML = (bodyContent: string) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:;base64,=" />
    <title>pleasantest</title>
  </head>
  <body>${bodyContent}</body>
</html>
`;

export const indexHTMLMiddleware: polka.Middleware = (req, res, next) => {
  if (req.url !== '/') {
    next();
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.write(
    defaultHTML(`<h1 style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)">
        Your test will run here
      </h1>`),
  );
  res.end();
};
