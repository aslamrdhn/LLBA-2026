import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Decimal from 'decimal.js';
import { calculateReceipt, ReceiptCalculationError } from '../domain/pos/receipt.js';

describe('Fase 2: Deterministic Receipt Calculation & Double-Entry Invariants (§8.9a, Fixture A18)', () => {
  it('Fixture A18 (Exclusive Tax + SC included in tax base)', () => {
    // 2 x Kopi @ 25.000, diskon baris 10%, cart discount 5.000, SC 10%, PB1 10%, isTaxInclusive=false, taxServiceChargeIncluded=true, tip 5.000
    const result = calculateReceipt({
      items: [
        {
          menuId: 'menu-kopi',
          menuName: 'Kopi Susu Gula Aren',
          unitPrice: 25000,
          qty: 2,
          manualDiscount: {
            type: 'PERCENT',
            value: 10, // 10%
          },
        },
      ],
      cartDiscount: {
        type: 'AMOUNT',
        value: 5000,
      },
      tenantSettings: {
        isTaxInclusive: false,
        taxServiceChargeIncluded: true,
        serviceChargeRate: 0.1,
        taxRate: 0.1,
      },
      tipAmount: 5000,
    });

    // Verifikasi aljabar A18:
    // lineBase = 2 * 25.000 = 50.000
    // lineDiscount = 10% * 50.000 = 5.000
    // lineNet = 45.000
    // subtotal = 45.000
    // cartDiscountAmount = 5.000
    // netAfterDiscount = 40.000
    // serviceChargeAmount = 40.000 * 10% = 4.000
    // taxBase = 40.000 + 4.000 = 44.000
    // taxAmount = 44.000 * 10% = 4.400
    // grossAmount = 44.000 + 4.400 = 48.400
    // total = 48.400 + 5.000 = 53.400

    assert.equal(result.subtotal.toString(), '45000');
    assert.equal(result.cartDiscountAmount.toString(), '5000');
    assert.equal(result.netAfterDiscount.toString(), '40000');
    assert.equal(result.serviceChargeAmount.toString(), '4000');
    assert.equal(result.taxBase.toString(), '44000');
    assert.equal(result.taxAmount.toString(), '4400');
    assert.equal(result.grossAmount.toString(), '48400');
    assert.equal(result.tipAmount.toString(), '5000');
    assert.equal(result.total.toString(), '53400');

    // Prorata HPP Base
    assert.equal(result.lines[0].lineHppBase.toString(), '40000');

    // Balance check: Debit Kas = Kredit Pendapatan + Kredit SC + Kredit Pajak + Kredit Tip
    const debitKas = result.journalLines.find((j) => j.accountCode === '1000')!.debit;
    const kreditPendapatan = result.journalLines.find((j) => j.accountCode === '4000')!.credit;
    const kreditSC = result.journalLines.find((j) => j.accountCode === '4020')!.credit;
    const kreditPajak = result.journalLines.find((j) => j.accountCode === '2010')!.credit;
    const kreditTip = result.journalLines.find((j) => j.accountCode === '2020')!.credit;

    assert.equal(debitKas.toString(), '53400');
    assert.equal(kreditPendapatan.toString(), '40000');
    assert.equal(kreditSC.toString(), '4000');
    assert.equal(kreditPajak.toString(), '4400');
    assert.equal(kreditTip.toString(), '5000');

    const totalKredit = kreditPendapatan.plus(kreditSC).plus(kreditPajak).plus(kreditTip);
    assert.equal(debitKas.equals(totalKredit), true, 'Debit Kas harus persis sama dengan Total Kredit');
  });

  it('Fixture A18 (Exclusive Tax + SC excluded from tax base - Rekonsiliasi Dokumen Teks Baru)', () => {
    // Mode non-Jakarta: SC tidak masuk dasar pajak
    const result = calculateReceipt({
      items: [
        {
          menuId: 'menu-kopi',
          menuName: 'Kopi Susu Gula Aren',
          unitPrice: 25000,
          qty: 2,
          manualDiscount: {
            type: 'PERCENT',
            value: 10,
          },
        },
      ],
      cartDiscount: {
        type: 'AMOUNT',
        value: 5000,
      },
      tenantSettings: {
        isTaxInclusive: false,
        taxServiceChargeIncluded: false, // SC excluded
        serviceChargeRate: 0.1,
        taxRate: 0.1,
      },
      tipAmount: 5000,
    });

    // netAfterDiscount = 40.000
    // serviceChargeAmount = 40.000 * 10% = 4.000
    // taxBase = 40.000 (SC excluded)
    // taxAmount = 40.000 * 10% = 4.000
    // grossAmount = 40.000 + 4.000 (SC) + 4.000 (Tax) = 48.000
    // total = 48.000 + 5.000 (Tip) = 53.000

    assert.equal(result.taxBase.toString(), '40000');
    assert.equal(result.taxAmount.toString(), '4000');
    assert.equal(result.grossAmount.toString(), '48000');
    assert.equal(result.total.toString(), '53000');

    // Balance check
    const totalDebit = result.journalLines.reduce((s, j) => s.plus(j.debit), new Decimal(0));
    const totalCredit = result.journalLines.reduce((s, j) => s.plus(j.credit), new Decimal(0));
    assert.equal(totalDebit.equals(totalCredit), true, 'Jurnal wajib 100% seimbang');
    assert.equal(totalDebit.toString(), '53000');
  });

  it('Fixture A18 (Tax Inclusive Mode)', () => {
    // Mode Inklusif: Harga menu sudah memuat pajak
    const result = calculateReceipt({
      items: [
        {
          menuId: 'menu-kopi',
          menuName: 'Kopi Susu Gula Aren',
          unitPrice: 25000,
          qty: 2,
          manualDiscount: {
            type: 'PERCENT',
            value: 10,
          },
        },
      ],
      cartDiscount: {
        type: 'AMOUNT',
        value: 5000,
      },
      tenantSettings: {
        isTaxInclusive: true,
        taxServiceChargeIncluded: true,
        serviceChargeRate: 0.1,
        taxRate: 0.1,
      },
      tipAmount: 5000,
    });

    // netAfterDiscount = 40.000
    // serviceChargeAmount = 4.000
    // customerCharge = 44.000
    // taxBase = 44.000
    // taxAmount = 44.000 * 0.1 / 1.1 = 4.000
    // grossAmount = 44.000
    // total = 44.000 + 5.000 = 49.000
    // netSalesRevenue = 44.000 - 4.000 (SC) - 4.000 (Tax) = 36.000

    assert.equal(result.grossAmount.toString(), '44000');
    assert.equal(result.taxAmount.toString(), '4000');
    assert.equal(result.total.toString(), '49000');
    assert.equal(result.netSalesRevenue.toString(), '36000');

    const totalDebit = result.journalLines.reduce((s, j) => s.plus(j.debit), new Decimal(0));
    const totalCredit = result.journalLines.reduce((s, j) => s.plus(j.credit), new Decimal(0));
    assert.equal(totalDebit.equals(totalCredit), true);
    assert.equal(totalDebit.toString(), '49000');
  });

  it('Prorating Cart Discount with Largest Remainder Method across 3 items', () => {
    // 3 items with fractional discount split
    const result = calculateReceipt({
      items: [
        { menuId: 'item-A', menuName: 'Latte', unitPrice: 20000, qty: 1 }, // 20.000
        { menuId: 'item-B', menuName: 'Croissant', unitPrice: 30000, qty: 1 }, // 30.000
        { menuId: 'item-C', menuName: 'Espresso', unitPrice: 15000, qty: 1 }, // 15.000
      ],
      cartDiscount: {
        type: 'AMOUNT',
        value: 10000, // 10.000 dibagi ke 65.000
      },
      tenantSettings: {
        isTaxInclusive: false,
        taxServiceChargeIncluded: true,
        serviceChargeRate: 0,
        taxRate: 0,
      },
    });

    assert.equal(result.subtotal.toString(), '65000');
    assert.equal(result.cartDiscountAmount.toString(), '10000');
    assert.equal(result.netAfterDiscount.toString(), '55000');

    // Sum of prorata discounts must exactly equal 10.000
    const totalProrata = result.lines.reduce((s, l) => s.plus(l.prorataCartDiscount), new Decimal(0));
    assert.equal(totalProrata.toString(), '10000');

    // Sum of lineHppBase must exactly equal netAfterDiscount (55.000)
    const sumLineHppBase = result.lines.reduce((s, l) => s.plus(l.lineHppBase), new Decimal(0));
    assert.equal(sumLineHppBase.toString(), '55000');
  });

  it('Rejects line discount exceeding line base (BIZ-011)', () => {
    assert.throws(
      () => {
        calculateReceipt({
          items: [
            {
              menuId: 'item-1',
              menuName: 'Americano',
              unitPrice: 20000,
              qty: 1,
              manualDiscount: {
                type: 'AMOUNT',
                value: 25000, // 25.000 > 20.000
              },
            },
          ],
          tenantSettings: {
            isTaxInclusive: false,
            taxServiceChargeIncluded: true,
            serviceChargeRate: 0,
            taxRate: 0,
          },
        });
      },
      (err: Error) => {
        return err instanceof ReceiptCalculationError && err.code === 'BIZ-011';
      }
    );
  });

  it('Rejects cart discount exceeding 90% subtotal floor (BIZ-011)', () => {
    assert.throws(
      () => {
        calculateReceipt({
          items: [
            {
              menuId: 'item-1',
              menuName: 'Cappuccino',
              unitPrice: 50000,
              qty: 1,
            },
          ],
          cartDiscount: {
            type: 'AMOUNT',
            value: 48000, // 48.000 / 50.000 = 96% > 90%
          },
          tenantSettings: {
            isTaxInclusive: false,
            taxServiceChargeIncluded: true,
            serviceChargeRate: 0,
            taxRate: 0,
          },
        });
      },
      (err: Error) => {
        return err instanceof ReceiptCalculationError && err.code === 'BIZ-011';
      }
    );
  });
});
