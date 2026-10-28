import { LedgerError } from "./errorCodes.ts";

export function assertInvariant(
  condition: boolean,
  code: string,
  message: string,
): asserts condition {
  if (!condition) {
    throw new LedgerError(code, message);
  }
}
