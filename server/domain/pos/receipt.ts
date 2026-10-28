import Decimal from 'decimal.js';

// Set standard precision for financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface ReceiptItemInput {
  menuId: string;
  menuName: string;
  unitPrice: Decimal.Value;
  qty: Decimal.Value;
  presetDiscount?: {
    id: string;
    name: string;
    type: 'PERCENT' | 'AMOUNT';
    value: Decimal.Value;
    versionHash?: string;
  };
  manualDiscount?: {
    type: 'PERCENT' | 'AMOUNT';
    value: Decimal.Value;
    reason?: string;
  };
}

export interface ReceiptTenantSettings {
  isTaxInclusive: boolean;
  taxServiceChargeIncluded: boolean;
  serviceChargeRate: Decimal.Value;
  taxRate: Decimal.Value;
}

export interface ReceiptCartDiscountInput {
  presetId?: string;
  type: 'PERCENT' | 'AMOUNT';
  value: Decimal.Value;
  versionHash?: string;
}

export interface ReceiptCalculationInput {
  items: ReceiptItemInput[];
  cartDiscount?: ReceiptCartDiscountInput;
  tenantSettings: ReceiptTenantSettings;
  tipAmount?: Decimal.Value;
}

export interface CalculatedReceiptLine {
  menuId: string;
  menuName: string;
  unitPrice: Decimal;
  quantity: Decimal;
  lineBase: Decimal;
  presetDiscountAmount: Decimal;
  manualDiscountAmount: Decimal;
  lineDiscount: Decimal;
  lineNet: Decimal;
  prorataCartDiscount: Decimal;
  lineHppBase: Decimal;
  appliedDiscountPresetId?: string;
  appliedManualDiscount?: Decimal;
}

export interface JournalLineEntry {
  accountCode: string;
  accountName: string;
  debit: Decimal;
  credit: Decimal;
}

export interface ReceiptCalculationResult {
  lines: CalculatedReceiptLine[];
  subtotal: Decimal;
  totalLineDiscount: Decimal;
  cartDiscountAmount: Decimal;
  cartDiscountPresetId?: string;
  netAfterDiscount: Decimal;
  serviceChargeRate: Decimal;
  serviceChargeAmount: Decimal;
  taxRate: Decimal;
  taxBase: Decimal;
  taxAmount: Decimal;
  grossAmount: Decimal;
  tipAmount: Decimal;
  total: Decimal;
  isTaxInclusive: boolean;
  taxServiceChargeIncluded: boolean;
  netSalesRevenue: Decimal; // Akun 4000
  journalLines: JournalLineEntry[];
}

export class ReceiptCalculationError extends Error {
  constructor(public code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'ReceiptCalculationError';
  }
}

/**
 * Deterministic 7-step receipt calculation engine with Double-Entry balance verification (§8.9a, §8.12)
 */
export function calculateReceipt(input: ReceiptCalculationInput): ReceiptCalculationResult {
  if (!input.items || input.items.length === 0) {
    throw new ReceiptCalculationError('EMPTY_CART', 'Transaksi harus memuat minimal satu item.');
  }

  const isTaxInclusive = Boolean(input.tenantSettings.isTaxInclusive);
  const taxServiceChargeIncluded = Boolean(input.tenantSettings.taxServiceChargeIncluded);
  const serviceChargeRate = new Decimal(input.tenantSettings.serviceChargeRate || 0);
  const taxRate = new Decimal(input.tenantSettings.taxRate || 0);
  const tipAmount = new Decimal(input.tipAmount || 0).round();

  if (serviceChargeRate.isNegative() || taxRate.isNegative() || tipAmount.isNegative()) {
    throw new ReceiptCalculationError('INVALID_RATE', 'Tarif pajak, service charge, dan tip tidak boleh bernilai negatif.');
  }

  // 1. Calculate per-line base, discounts, and lineNet
  let totalBaseAmount = new Decimal(0);
  let totalLineDiscount = new Decimal(0);
  let subtotal = new Decimal(0);

  const calculatedLines: Array<Omit<CalculatedReceiptLine, 'prorataCartDiscount' | 'lineHppBase'>> = [];

  for (const item of input.items) {
    const unitPrice = new Decimal(item.unitPrice).round();
    const qty = new Decimal(item.qty);

    if (unitPrice.isNegative() || qty.isNegative() || qty.isZero()) {
      throw new ReceiptCalculationError('INVALID_ITEM_VALUES', `Harga atau kuantitas item ${item.menuName} tidak valid.`);
    }

    const lineBase = unitPrice.mul(qty).round();
    totalBaseAmount = totalBaseAmount.plus(lineBase);

    // Calculate line discounts (§8.12: max 1 preset + max 1 manual)
    let presetDiscountAmount = new Decimal(0);
    if (item.presetDiscount) {
      if (item.presetDiscount.type === 'PERCENT') {
        const pct = new Decimal(item.presetDiscount.value).div(100);
        presetDiscountAmount = lineBase.mul(pct).round();
      } else {
        presetDiscountAmount = new Decimal(item.presetDiscount.value).round();
      }
    }

    let manualDiscountAmount = new Decimal(0);
    if (item.manualDiscount) {
      if (item.manualDiscount.type === 'PERCENT') {
        const pct = new Decimal(item.manualDiscount.value).div(100);
        manualDiscountAmount = lineBase.mul(pct).round();
      } else {
        manualDiscountAmount = new Decimal(item.manualDiscount.value).round();
      }
    }

    const lineDiscount = presetDiscountAmount.plus(manualDiscountAmount);

    // Rule: lineDiscount <= lineBase (BIZ-011)
    if (lineDiscount.greaterThan(lineBase)) {
      throw new ReceiptCalculationError(
        'BIZ-011',
        `Diskon pada baris "${item.menuName}" (Rp ${lineDiscount.toString()}) melebihi nilai dasar (Rp ${lineBase.toString()}).`
      );
    }

    const lineNet = lineBase.minus(lineDiscount);
    totalLineDiscount = totalLineDiscount.plus(lineDiscount);
    subtotal = subtotal.plus(lineNet);

    calculatedLines.push({
      menuId: item.menuId,
      menuName: item.menuName,
      unitPrice,
      quantity: qty,
      lineBase,
      presetDiscountAmount,
      manualDiscountAmount,
      lineDiscount,
      lineNet,
      appliedDiscountPresetId: item.presetDiscount?.id,
      appliedManualDiscount: manualDiscountAmount.isZero() ? undefined : manualDiscountAmount,
    });
  }

  // 2. Cart Discount calculation and clamping
  let cartDiscountAmount = new Decimal(0);
  if (input.cartDiscount) {
    if (input.cartDiscount.type === 'PERCENT') {
      const pct = new Decimal(input.cartDiscount.value).div(100);
      cartDiscountAmount = subtotal.mul(pct).round();
    } else {
      cartDiscountAmount = new Decimal(input.cartDiscount.value).round();
    }
    // Clamp to Subtotal
    if (cartDiscountAmount.greaterThan(subtotal)) {
      cartDiscountAmount = subtotal;
    }
  }

  // Rule: Safety floor 10% (BIZ-011)
  // Total transaction discount cannot exceed 90% of subtotal/totalBase
  const maxDiscountFloor = subtotal.mul(0.9).round();
  if (totalBaseAmount.greaterThan(0) && subtotal.greaterThan(0) && cartDiscountAmount.greaterThan(maxDiscountFloor)) {
    throw new ReceiptCalculationError(
      'BIZ-011',
      `Total diskon nota melebihi ambang batas keamanan 90% dari subtotal.`
    );
  }

  // 3. NetAfterDiscount
  const netAfterDiscount = subtotal.minus(cartDiscountAmount);

  // Prorating cart discount to lines with Largest Remainder Method (§8.9a Rule 3)
  const fullLines: CalculatedReceiptLine[] = [];
  if (subtotal.greaterThan(0) && cartDiscountAmount.greaterThan(0)) {
    type LineWithRemainder = {
      index: number;
      menuId: string;
      line: (typeof calculatedLines)[0];
      integerPart: Decimal;
      remainder: Decimal;
    };

    const linesWithRemainder: LineWithRemainder[] = calculatedLines.map((line, index) => {
      const exactProrata = cartDiscountAmount.mul(line.lineNet).div(subtotal);
      const integerPart = exactProrata.floor();
      const remainder = exactProrata.minus(integerPart);
      return { index, menuId: line.menuId, line, integerPart, remainder };
    });

    const allocatedSum = linesWithRemainder.reduce((sum, item) => sum.plus(item.integerPart), new Decimal(0));
    let deficit = cartDiscountAmount.minus(allocatedSum).toNumber();

    // Sort descending by remainder, tie-break by menuId ascending
    linesWithRemainder.sort((a, b) => {
      const diff = b.remainder.comparedTo(a.remainder);
      if (diff !== 0) return diff;
      return a.menuId.localeCompare(b.menuId);
    });

    const finalProrataMap = new Map<number, Decimal>();
    for (const item of linesWithRemainder) {
      let add = new Decimal(0);
      if (deficit > 0) {
        add = new Decimal(1);
        deficit--;
      }
      finalProrataMap.set(item.index, item.integerPart.plus(add));
    }

    for (let i = 0; i < calculatedLines.length; i++) {
      const line = calculatedLines[i];
      const prorata = finalProrataMap.get(i) || new Decimal(0);
      const lineHppBase = line.lineNet.minus(prorata);
      fullLines.push({
        ...line,
        prorataCartDiscount: prorata,
        lineHppBase,
      });
    }
  } else {
    for (const line of calculatedLines) {
      fullLines.push({
        ...line,
        prorataCartDiscount: new Decimal(0),
        lineHppBase: line.lineNet,
      });
    }
  }

  // Verify invariant: sum(lineHppBase) === netAfterDiscount
  const sumLineHppBase = fullLines.reduce((acc, l) => acc.plus(l.lineHppBase), new Decimal(0));
  if (!sumLineHppBase.equals(netAfterDiscount)) {
    throw new ReceiptCalculationError('INVARIANT_VIOLATION', 'Prorata diskon cart tidak cocok dengan NetAfterDiscount.');
  }

  // 4. Service Charge
  const serviceChargeAmount = netAfterDiscount.mul(serviceChargeRate).round();

  // 5. Tax Base
  let taxBase = new Decimal(0);
  let taxAmount = new Decimal(0);
  let grossAmount = new Decimal(0);
  let netSalesRevenue = new Decimal(0);

  if (!isTaxInclusive) {
    // Mode Eksklusif
    if (taxServiceChargeIncluded) {
      taxBase = netAfterDiscount.plus(serviceChargeAmount);
      taxAmount = taxBase.mul(taxRate).round();
      grossAmount = taxBase.plus(taxAmount);
    } else {
      taxBase = netAfterDiscount;
      taxAmount = taxBase.mul(taxRate).round();
      // Reconciled formula from Dokumen Teks Baru: SC must be included in gross bill!
      grossAmount = netAfterDiscount.plus(serviceChargeAmount).plus(taxAmount);
    }
    netSalesRevenue = netAfterDiscount;
  } else {
    // Mode Inklusif (Menu price includes tax)
    if (taxServiceChargeIncluded) {
      // Menu price + SC is customer charge before tip
      const customerCharge = netAfterDiscount.plus(serviceChargeAmount);
      taxBase = customerCharge;
      taxAmount = taxBase.mul(taxRate).div(new Decimal(1).plus(taxRate)).round();
      grossAmount = customerCharge;
      netSalesRevenue = grossAmount.minus(serviceChargeAmount).minus(taxAmount);
    } else {
      // SC is not subject to tax extraction
      taxBase = netAfterDiscount;
      taxAmount = taxBase.mul(taxRate).div(new Decimal(1).plus(taxRate)).round();
      grossAmount = netAfterDiscount.plus(serviceChargeAmount);
      netSalesRevenue = netAfterDiscount.minus(taxAmount);
    }
  }

  // 7. Total with Tip
  const total = grossAmount.plus(tipAmount);

  // Double-Entry Journal Lines (Debit Kas/Bank = Kredit Pendapatan + Kredit SC + Kredit Pajak + Kredit Tip)
  const journalLines: JournalLineEntry[] = [
    {
      accountCode: '1000',
      accountName: 'Kas / Bank',
      debit: total,
      credit: new Decimal(0),
    },
    {
      accountCode: '4000',
      accountName: 'Pendapatan Penjualan',
      debit: new Decimal(0),
      credit: netSalesRevenue,
    },
  ];

  if (serviceChargeAmount.greaterThan(0)) {
    journalLines.push({
      accountCode: '4020',
      accountName: 'Pendapatan Service Charge',
      debit: new Decimal(0),
      credit: serviceChargeAmount,
    });
  }

  if (taxAmount.greaterThan(0)) {
    journalLines.push({
      accountCode: '2010',
      accountName: 'Utang Pajak PB1',
      debit: new Decimal(0),
      credit: taxAmount,
    });
  }

  if (tipAmount.greaterThan(0)) {
    journalLines.push({
      accountCode: '2020',
      accountName: 'Utang Tip Karyawan',
      debit: new Decimal(0),
      credit: tipAmount,
    });
  }

  // Verify journal balance: Sum(Debits) === Sum(Credits)
  const totalDebit = journalLines.reduce((sum, j) => sum.plus(j.debit), new Decimal(0));
  const totalCredit = journalLines.reduce((sum, j) => sum.plus(j.credit), new Decimal(0));

  if (!totalDebit.equals(totalCredit)) {
    throw new ReceiptCalculationError(
      'UNBALANCED_JOURNAL',
      `Jurnal struk tidak seimbang! Total Debit (Rp ${totalDebit.toString()}) != Total Credit (Rp ${totalCredit.toString()}).`
    );
  }

  return {
    lines: fullLines,
    subtotal,
    totalLineDiscount,
    cartDiscountAmount,
    cartDiscountPresetId: input.cartDiscount?.presetId,
    netAfterDiscount,
    serviceChargeRate,
    serviceChargeAmount,
    taxRate,
    taxBase,
    taxAmount,
    grossAmount,
    tipAmount,
    total,
    isTaxInclusive,
    taxServiceChargeIncluded,
    netSalesRevenue,
    journalLines,
  };
}
