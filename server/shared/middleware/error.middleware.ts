import { Request, Response, NextFunction } from "express";
import { env } from "../../env.ts";
import { logger } from "../../logger.js";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Error yang sudah diantisipasi
    Error.captureStackTrace(this, this.constructor);
  }
}

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (env.NODE_ENV === "development") {
    logger.error(`[ERROR] ${err.message}`, { stack: err.stack });
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Production Mode: Jangan bocorkan stack trace
    if (err.isOperational) {
      // Error terpercaya
      res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
      });
    } else {
      // Programming atau unknown error
      logger.error(`[CRITICAL ERROR] 💥`, err);
      res.status(500).json({
        success: false,
        status: "error",
        message: "Something went very wrong!",
      });
    }
  }
};
