import { Router, Request, Response } from 'express';
import listEndpoints from 'express-list-endpoints';

export const apiRoutes = (app: Router) => {
  app.get('/api', (req: Request, res: Response): void => {
    const endpoints = listEndpoints(req.app).filter(endpoint => endpoint.path !== '/');
    console.log(listEndpoints(req.app))
    
    const formattedRoutes = endpoints.map((route) => {
      return route.methods.map((method) => `<li><strong>${method}</strong>: ${route.path}</li>`).join('');
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>API Routes</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="container py-5">
        <h2>Available API Routes</h2>
        <ul class="list-group">
          ${formattedRoutes}
        </ul>
      </body>
      </html>
    `;

    res.send(html);
  });
};
