import { Application, Express, Request, Response } from "express";
import listEndpoints from "express-list-endpoints";

interface Endpoint {
  path: string;
  methods: string[];
  middlewares: string[];
}

export const apiRoutes = (app: Application): void => {
  app.get("/api", (req: Request, res: Response): void => {
    const endpoints: Endpoint[] = listEndpoints(app).filter(
      (e: Endpoint) => e.path !== "/"
    );

    const formattedRoutes: string = endpoints
      .map((route: Endpoint) =>
        route.methods
          .map(
            (method: string) =>
              `<li><strong>${method}</strong>: ${route.path}</li>`
          )
          .join("")
      )
      .join("");

    res.send(`
      <html><body>
        <h2>Available API Routes</h2>
        <ul>${formattedRoutes}</ul>
      </body></html>
    `);
  });
};
