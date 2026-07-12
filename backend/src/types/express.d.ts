import type { UserRole } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};