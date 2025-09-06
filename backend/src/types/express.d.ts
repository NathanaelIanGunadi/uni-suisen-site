// backend/src/types/express.d.ts
declare namespace Express {
  export interface Request {
    user?: {
      id: number;
      role: string;
    };
  }
}
