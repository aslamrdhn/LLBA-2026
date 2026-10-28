import { ZodSchema } from "zod";
import { LedgerError } from "./errorCodes.ts";

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new LedgerError("VAL_001", `Validation failed: ${issues}`);
  }
  return result.data;
}
