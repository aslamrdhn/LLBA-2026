import { Decimal } from "decimal.js";

// Configure Decimal globally for money operations
// We use 20 significant digits and rounding to half up, which is standard for currency
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/**
 * Rounds a Decimal to 2 decimal places using standard financial rounding (ROUND_HALF_UP).
 * This ensures exact penny precision before inserting into the database.
 */
export function roundMoney(amount: Decimal | string | number): Decimal {
  const dec = new Decimal(amount);
  return dec.toDecimalPlaces(2);
}

/**
 * Balances an array of journal lines by adjusting penny rounding differences
 * on the credit or debit side to ensure totalDebit == totalCredit.
 */
export function balanceJournalLines<
  T extends { debit: Decimal; credit: Decimal },
>(lines: T[]): T[] {
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  for (const line of lines) {
    totalDebit = totalDebit.plus(line.debit);
    totalCredit = totalCredit.plus(line.credit);
  }

  const diff = roundMoney(totalDebit.minus(totalCredit));
  if (!diff.isZero()) {
    // If debit > credit (diff > 0), add diff to credit
    // If credit > debit (diff < 0), add diff.abs() to debit
    const targetCreditLine = lines.find((l) => l.credit.greaterThan(0));
    if (targetCreditLine && diff.greaterThan(0)) {
      targetCreditLine.credit = targetCreditLine.credit.plus(diff);
    } else {
      const targetDebitLine = lines.find((l) => l.debit.greaterThan(0));
      if (targetDebitLine && diff.lessThan(0)) {
        targetDebitLine.debit = targetDebitLine.debit.plus(diff.abs());
      }
    }
  }

  return lines;
}
