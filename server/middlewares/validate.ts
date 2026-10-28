import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { securityLogger } from "../logger.js";

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as any;
      // Replace with validated and type-cast data
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        securityLogger.warn(
          `[VALIDATION FAILED] Validation failed on ${req.method} ${req.originalUrl}: ${error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        );
        return res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: error.issues,
        });
      }
      next(error);
    }
  };
};
