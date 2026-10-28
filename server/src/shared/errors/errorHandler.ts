import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import { logger } from "../../../logger.js"; // Fallback to existing logger for now

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    if (err.isOperational) {
      logger.warn(`[Operational Error] ${err.statusCode} - ${err.message}`);
    } else {
      logger.error(
        `[System Error] ${err.statusCode} - ${err.message}`,
        err.stack,
      );
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Fallback for unhandled errors
  logger.error(`[Unhandled Error] ${err.message || err}`, err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
};
