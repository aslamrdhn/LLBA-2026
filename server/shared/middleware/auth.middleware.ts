import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../env.ts";
import { AppError } from "./error.middleware.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
    email: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];

  // Ambil token dari header Authorization atau cookie
  let token = authHeader && authHeader.split(" ")[1];
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError("Akses ditolak. Token tidak ditemukan.", 401));
  }

  try {
    const secret = env.JWT_SECRET || process.env.JWT_SECRET || "ledgerline_fallback_legacy_jwt_secret_32_chars";
    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return next(
        new AppError("Token kedaluwarsa. Silakan login kembali.", 401),
      );
    }
    return next(new AppError("Token tidak valid.", 403));
  }
};

export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User tidak terautentikasi.", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Akses ditolak. Membutuhkan role: ${allowedRoles.join(", ")}`,
          403,
        ),
      );
    }

    next();
  };
};
