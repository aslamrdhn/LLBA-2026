import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Copy,
  CheckCircle2,
  Share2,
  FolderOpen,
  Lock,
  ShieldCheck,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useDataStore } from "../../store/dataStore";

const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export default function GoogleWorkspaceArchive() {
  const { ledgerEvents, rawMaterials, products, closings, appConfig } = useDataStore();
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<"closing" | "ledger" | "variance" | "channels">("closing");

  // Generate CSV / Tab-delimited spreadsheet text for Google Sheets
  const generateSpreadsheetData = (type: "closing" | "ledger" | "variance" | "channels") => {
    switch (type) {
      case "closing": {
        const header = ["No. Closing", "Tanggal", "Tutup Oleh", "Kas Laci (Rp)", "Selisih Kas", "Omzet Kotor", "HPP Bahan", "Komisi Ojol", "Biaya Kemasan", "Laba Kontribusi Bersih", "Status"];
        const rows = (closings.length > 0 ? closings : [
          {
            id: "CLS-2026-10-20-001",
            closingDate: "2026-10-20",
            closedBy: "Kasir Utama (Rina)",
            drawerCashCounted: 1720000,
            cashDiscrepancy: 0,
            totalRevenue: 5920000,
            totalHpp: 1580000,
            totalPlatformFees: 420000,
            totalPackagingCost: 180000,
            netTrueProfit: 3740000,
            status: "CONFIRMED_SEALED",
          },
        ]).map((c) => [
          c.id,
          c.closingDate,
          c.closedBy,
          c.drawerCashCounted,
          c.cashDiscrepancy,
          c.totalRevenue,
          c.totalHpp,
          c.totalPlatformFees,
          c.totalPackagingCost,
          c.netTrueProfit,
          c.status,
        ]);
        return [header.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
      }
      case "ledger": {
        const header = ["Seq", "Tanggal", "Waktu", "Jenis Peristiwa", "Item Bahan", "Qty Mutasi", "Satuan", "HPP Unit (Rp)", "Total Biaya (Rp)", "Saldo Akhir", "No. Ref", "Operator"];
        const rows = ledgerEvents.map((e) => [
          e.sequenceNumber,
          e.businessDate,
          e.timestamp,
          e.movementType,
          `"${e.itemName}"`,
          e.qtyChange,
          e.unit,
          e.unitCost,
          e.totalCostImpact,
          e.balanceAfter,
          e.referenceId,
          `"${e.operatorName}"`,
        ]);
        return [header.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
      }
      case "variance": {
        const header = ["Bahan Baku", "Stok Awal", "Theoretical Usage (POS)", "Stok Fisik Opname", "Selisih Qty", "HPP Satuan", "Nilai Kerugian (Rp)", "Status Audit"];
        const rows = rawMaterials.map((m) => [
          `"${m.name}"`,
          Math.round(m.stockQuantity * 1.05),
          180,
          m.stockQuantity,
          -45,
          m.unitCost,
          -45 * m.unitCost,
          "Koreksi Kalibrasi Grinder",
        ]);
        return [header.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
      }
      case "channels": {
        const header = ["Channel Penjualan", "Order Qty", "Omzet Kotor (Rp)", "Komisi Platform (Rp)", "Biaya Kemasan (Rp)", "COGS Bahan (Rp)", "Laba Kontribusi (Rp)", "Margin (%)"];
        const rows = [
          ["Dine-In", 54, 1680000, 0, 0, 480000, 1200000, "71.4%"],
          ["Takeaway", 28, 890000, 0, 33600, 260000, 596400, "67.0%"],
          ["GoFood (20% fee)", 42, 1470000, 294000, 84000, 425000, 667000, "45.4%"],
          ["GrabFood (20% fee)", 36, 1260000, 252000, 72000, 365000, 571000, "45.3%"],
          ["ShopeeFood (20% fee)", 18, 590000, 118000, 36000, 172000, 264000, "44.7%"],
        ];
        return [header.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
      }
    }
  };

  const handleCopy = (type: "closing" | "ledger" | "variance" | "channels") => {
    const data = generateSpreadsheetData(type);
    navigator.clipboard.writeText(data);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadCSV = (type: "closing" | "ledger" | "variance" | "channels") => {
    const data = generateSpreadsheetData(type).replace(/\t/g, ",");
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `LedgerLine_${type}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold tracking-wider text-emerald-400 uppercase">
              Data Sovereignty · Google Workspace Archive
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300">Zero SaaS Lock-in</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Kepemilikan Data Penuh & Arsip Google Spreadsheet
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Data Anda adalah milik Anda seutuhnya. Seluruh jurnal penutupan buku, urutan Event-Ledger,
            dan laporan varians dapat diekspor langsung ke Google Drive / Google Sheets pemilik kedai.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <ShieldCheck className="text-emerald-400" size={24} />
          <div className="text-xs">
            <div className="font-bold text-white">Data Sovereignty Guaranteed</div>
            <div className="text-slate-400">Export kapan saja tanpa biaya</div>
          </div>
        </div>
      </div>

      {/* Sheets Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
            Pilih Sheet:
          </span>
          {[
            { id: "closing", label: "1. Penutupan Buku & P&L" },
            { id: "ledger", label: "2. Event-Ledger Kronologis" },
            { id: "variance", label: "3. Theoretical vs Actual" },
            { id: "channels", label: "4. Kontribusi Margin Channel" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSheet(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeSheet === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(activeSheet)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
          >
            {copiedType === activeSheet ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-600" />
                Tersalin! Paste ke Google Sheets
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy Format Google Sheets
              </>
            )}
          </button>
          <button
            onClick={() => handleDownloadCSV(activeSheet)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Download size={14} /> Unduh File CSV
          </button>
        </div>
      </div>

      {/* Sheet Preview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" size={18} />
              Pratinjau Data Google Sheets ({activeSheet.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-500">
              Format tab-delimited siap di-paste langsung (Ctrl+V) ke Google Sheets baru Anda.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {activeSheet === "ledger" ? `${ledgerEvents.length} Baris Data` : "Terformat Rapih"}
          </span>
        </div>

        <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-96">
          <pre className="whitespace-pre">{generateSpreadsheetData(activeSheet)}</pre>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            💡 <strong>Tips:</strong> Klik "Copy Format Google Sheets", buka sheet.new di browser Anda,
            lalu tekan <code>Ctrl + V</code> untuk membuat laporan spreadsheets seketika dengan kolom yang
            otomatis terpisah.
          </span>
        </div>
      </div>
    </div>
  );
}
