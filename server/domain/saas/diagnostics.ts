/**
 * Pure Domain Instant Tenant Diagnostics & Recommendations Engine
 * Provides deterministic health inspection of financial and operational integrity
 */

export interface TenantDiagnosticInput {
  unclosedShiftsCount: number;
  pendingOfflineTxCount: number;
  unbalancedJournalsCount: number;
  negativeStockItemsCount: number;
  failedReconciliationCount: number;
  isBackupHealthy: boolean;
  googleSyncError: boolean;
}

export interface DiagnosticCheckResult {
  code: string;
  name: string;
  severity: "HEALTHY" | "WARNING" | "CRITICAL";
  message: string;
  recommendation: string;
}

export interface TenantDiagnosticReport {
  overallHealth: "HEALTHY" | "WARNING" | "CRITICAL";
  score: number; // 0 - 100
  checks: DiagnosticCheckResult[];
  criticalCount: number;
  warningCount: number;
}

export class TenantDiagnosticsRules {
  static evaluate(input: TenantDiagnosticInput): TenantDiagnosticReport {
    const checks: DiagnosticCheckResult[] = [];
    let score = 100;
    let criticalCount = 0;
    let warningCount = 0;

    // 1. Accounting Double-Entry Balance
    if (input.unbalancedJournalsCount > 0) {
      score -= 30;
      criticalCount++;
      checks.push({
        code: "DIAG-ACC-001",
        name: "Integritas Buku Besar Double-Entry",
        severity: "CRITICAL",
        message: `Ditemukan ${input.unbalancedJournalsCount} jurnal dengan Debit != Credit.`,
        recommendation: "Posting jurnal koreksi pembalik (reversing entry) segera melalui menu Penyesuaian Akun.",
      });
    } else {
      checks.push({
        code: "DIAG-ACC-001",
        name: "Integritas Buku Besar Double-Entry",
        severity: "HEALTHY",
        message: "Seluruh posting jurnal akuntansi seimbang (Debit == Credit).",
        recommendation: "Pertahankan kepatuhan penutupan shift harian.",
      });
    }

    // 2. R1-R8 Financial Reconciliations
    if (input.failedReconciliationCount > 0) {
      score -= 25;
      criticalCount++;
      checks.push({
        code: "DIAG-FIN-002",
        name: "Rekonsiliasi Finansial R1–R8",
        severity: "CRITICAL",
        message: `${input.failedReconciliationCount} aturan rekonsiliasi mengalami deviasi selisih.`,
        recommendation: "Investigasi transaksi struk yang tidak tertagih atau void tidak seimbang.",
      });
    } else {
      checks.push({
        code: "DIAG-FIN-002",
        name: "Rekonsiliasi Finansial R1–R8",
        severity: "HEALTHY",
        message: "Semua 8 aturan rekonsiliasi finansial valid 100%.",
        recommendation: "Tidak ada tindakan koreksi diperlukan.",
      });
    }

    // 3. Physical Stock Non-Negative Invariant
    if (input.negativeStockItemsCount > 0) {
      score -= 20;
      criticalCount++;
      checks.push({
        code: "DIAG-STK-003",
        name: "Invarian Stok Fisik Positif",
        severity: "CRITICAL",
        message: `Terdapat ${input.negativeStockItemsCount} bahan baku dengan kuantitas fisik negatif.`,
        recommendation: "Lakukan Stock Opname buta (blind opname) dan input receiving faktur pembelian yang belum dicatat.",
      });
    } else {
      checks.push({
        code: "DIAG-STK-003",
        name: "Invarian Stok Fisik Positif",
        severity: "HEALTHY",
        message: "Tidak ada stok fisik bernilai negatif.",
        recommendation: "Kuantitas inventori konsisten dengan penerimaan gudang.",
      });
    }

    // 4. Shift Closing Hygiene
    if (input.unclosedShiftsCount > 1) {
      score -= 15;
      warningCount++;
      checks.push({
        code: "DIAG-OPS-004",
        name: "Disiplin Penutupan Shift Kasir",
        severity: "WARNING",
        message: `Ada ${input.unclosedShiftsCount} shift yang masih berstatus OPEN lebih dari 24 jam.`,
        recommendation: "Instruksikan manajer outlet untuk melakukan closing kasir dengan perhitungan blind cash count.",
      });
    } else {
      checks.push({
        code: "DIAG-OPS-004",
        name: "Disiplin Penutupan Shift Kasir",
        severity: "HEALTHY",
        message: "Siklus shift kasir berjalan tertib dan teratur.",
        recommendation: "Lanjutkan jadwal pergantian shift normal.",
      });
    }

    // 5. Offline Queue Lag
    if (input.pendingOfflineTxCount > 10) {
      score -= 10;
      warningCount++;
      checks.push({
        code: "DIAG-OFF-005",
        name: "Antrean Sinkronisasi POS Offline",
        severity: "WARNING",
        message: `${input.pendingOfflineTxCount} transaksi kasir offline tertunda sinkronisasi.`,
        recommendation: "Periksa kestabilan jaringan internet pada tablet kasir POS terkait.",
      });
    } else {
      checks.push({
        code: "DIAG-OFF-005",
        name: "Antrean Sinkronisasi POS Offline",
        severity: "HEALTHY",
        message: "Antrean transaksi kasir offline tersinkronisasi lancar.",
        recommendation: "Tidak ada transaksi offline tertahan.",
      });
    }

    // 6. Automated Backup Verification
    if (!input.isBackupHealthy) {
      score -= 20;
      criticalCount++;
      checks.push({
        code: "DIAG-BAK-006",
        name: "Verifikasi Cadangan Database (RPO/RTO)",
        severity: "CRITICAL",
        message: "Snapshot backup database belum terverifikasi dalam 24 jam terakhir.",
        recommendation: "Jalankan job verifikasi backup darurat (scripts/backup-verify.ts).",
      });
    } else {
      checks.push({
        code: "DIAG-BAK-006",
        name: "Verifikasi Cadangan Database (RPO/RTO)",
        severity: "HEALTHY",
        message: "Cadangan data terverifikasi dan memenuhi target RPO < 1 jam & RTO < 4 jam.",
        recommendation: "Pertahankan jadwal snapshot harian otomatis.",
      });
    }

    // 7. Google Sheets Sync Integration
    if (input.googleSyncError) {
      score -= 10;
      warningCount++;
      checks.push({
        code: "DIAG-INT-007",
        name: "Koneksi Google Sheets Sync",
        severity: "WARNING",
        message: "Terdeteksi kegagalan sinkronisasi Google Sheets (token expired atau rate limit).",
        recommendation: "Lakukan re-koneksi OAuth Google pada Pengaturan Integrasi Toko.",
      });
    } else {
      checks.push({
        code: "DIAG-INT-007",
        name: "Koneksi Google Sheets Sync",
        severity: "HEALTHY",
        message: "Integrasi eksternal beroperasi normal tanpa galat.",
        recommendation: "Tidak ada intervensi koneksi diperlukan.",
      });
    }

    const finalScore = Math.max(0, Math.min(100, score));
    const overallHealth =
      criticalCount > 0 ? "CRITICAL" : warningCount > 0 ? "WARNING" : "HEALTHY";

    return {
      overallHealth,
      score: finalScore,
      checks,
      criticalCount,
      warningCount,
    };
  }
}
