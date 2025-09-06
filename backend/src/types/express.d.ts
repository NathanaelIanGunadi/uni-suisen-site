declare module "express-list-endpoints";

declare namespace Express {
  export interface Request {
    user?: {
      id: number;
      role: string;
    };
  }
}
