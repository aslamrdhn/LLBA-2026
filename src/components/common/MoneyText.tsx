import React from "react";
import Decimal from "decimal.js";

interface MoneyTextProps {
  value: string | number | Decimal | null | undefined;
  currency?: boolean;
  accountingNegative?: boolean;
  className?: string;
}

/**
 * MoneyText Component
 * Format mata uang Rupiah presisi tinggi berbasis decimal.js.
 * Kebijakan: Dilarang keras menghasilkan NaN, floating point drift, atau format rancu.
 */
export const MoneyText: React.FC<MoneyTextProps> = ({
  value,
  currency = true,
  accountingNegative = false,
  className = "",
}) => {
  let decimalVal: Decimal;

  try {
    if (value === null || value === undefined || value === "") {
      decimalVal = new Decimal(0);
    } else if (value instanceof Decimal) {
      decimalVal = value;
    } else if (typeof value === "number") {
      decimalVal = isNaN(value) ? new Decimal(0) : new Decimal(value);
    } else {
      const cleanStr = String(value).replace(/[^0-9.-]/g, "");
      decimalVal = cleanStr ? new Decimal(cleanStr) : new Decimal(0);
    }
  } catch {
    decimalVal = new Decimal(0);
  }

  // Rupiah bulat (Decimal 18,0)
  const rounded = decimalVal.round();
  const isNegative = rounded.isNegative();
  const absValue = rounded.abs();

  // Format ribuan dengan titik (ID locale standard)
  const parts = absValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const prefix = currency ? "Rp " : "";

  if (isNegative) {
    if (accountingNegative) {
      return <span className={`font-mono text-rose-600 ${className}`}>({prefix}{parts})</span>;
    }
    return <span className={`font-mono text-rose-600 ${className}`}>-{prefix}{parts}</span>;
  }

  return <span className={`font-mono ${className}`}>{prefix}{parts}</span>;
};

export default MoneyText;
