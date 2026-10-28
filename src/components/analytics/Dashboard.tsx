/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Product, RawMaterial, FinanceLog, AppConfig, Order } from "../../types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  AlertTriangle,
  Phone,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Clock,
  Coins,
  Search,
  BookOpen,
  HelpCircle,
  Network,
  ArrowRight,
  Lock,
  ShieldCheck,
} from "lucide-react";

interface DashboardProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  financeLogs: FinanceLog[];
  orders?: Order[];
  appConfig: any;
  onRefresh: () => void;
  onNavigate?: (
    tab:
      | "dashboard"
      | "kasir"
      | "stok"
      | "meja"
      | "laporan"
      | "pengaturan"
      | "intelligence",
  ) => void;
}

const formatRupiah = (val: any): string => {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toLocaleString("id-ID");
};

function SystemClock() {
  const [time, setTime] = React.useState<string>("");

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " WIB",
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-sm font-mono font-medium text-slate-700">
      {time || "Loading..."}
    </p>
  );
}

export default function Dashboard({
  products,
  rawMaterials,
  financeLogs,
  orders = [],
  appConfig,
  onRefresh,
  onNavigate,
}: DashboardProps) {
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [showGlossary, setShowGlossary] = useState<boolean>(true);
  const [activeGlossaryTab, setActiveGlossaryTab] = useState<
    | "income"
    | "expense"
    | "net_profit"
    | "profit_margin"
    | "stock_warning"
    | "gemini_ai"
  >("income");
  const [detailedGlossaryModal, setDetailedGlossaryModal] =
    useState<boolean>(false);

  // States untuk Analisis Pricing & Profit Margin Menu
  const [profitSearch, setProfitSearch] = useState<string>("");
  const [selectedProfitCat, setSelectedProfitCat] = useState<string>("All");

  // State copy PO Draft supplier
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const handleCopyPODraft = (
    id: string,
    itemName: string,
    warningLimit: number,
    currentStock: number,
    unit: string,
    supplierName: string,
  ) => {
    const draftText = `SURAT PESANAN PEMBELIAN (PURCHASE ORDER)
========================================
Pemasok : ${supplierName}
Pemesan : ${appConfig?.storeName || "Kedai"}
Tanggal : ${new Date().toLocaleDateString("id-ID")}

Dengan hormat, persediaan kami telah mencapai batas kritis:
- Bahan/Menu : ${itemName}
- Sisa Stok  : ${currentStock} ${unit}
- Batas Warn : ${warningLimit} ${unit}

Kami ingin memesan kembali bahan baku tersebut di atas. Mohon infokan penawaran harga & ketersediaan pengiriman. Terima kasih.`;

    try {
      navigator.clipboard.writeText(draftText);
      setCopiedItemId(id);
      setTimeout(() => setCopiedItemId(null), 2500);
    } catch (e) {
      // Fallback
    }
  };

  // Hitung total pemasukan: gabungan pesanan POS + catatan log keuangan
  const totalIncome = React.useMemo(() => {
    const fromLogs = (financeLogs || [])
      .filter((log) => log && log.type === "income")
      .reduce((sum, log) => sum + (Number(log?.amount) || 0), 0);
    const fromOrders = (orders || [])
      .filter((o) => o.paymentStatus === "Success")
      .reduce((sum, o) => sum + (Number(o?.totalPrice) || 0), 0);
    return fromLogs + fromOrders;
  }, [financeLogs, orders]);

  const totalExpense = React.useMemo(() => {
    return (financeLogs || [])
      .filter((log) => log && log.type === "expense")
      .reduce((sum, log) => sum + (Number(log?.amount) || 0), 0);
  }, [financeLogs]);

  const netProfit = React.useMemo(
    () => (Number(totalIncome) || 0) - (Number(totalExpense) || 0),
    [totalIncome, totalExpense],
  );
  const marginPercentage = React.useMemo(
    () =>
      totalIncome > 0
        ? Math.round(((Number(netProfit) || 0) / totalIncome) * 100)
        : 0,
    [totalIncome, netProfit],
  );

  // Deteksi bahan baku kritis & produk kritis - DIOPTIMALKAN DENGAN MEMOISASI
  const lowMaterialsAll = React.useMemo(
    () =>
      (rawMaterials || []).filter((m) => {
        const qty = Number(m.stockQuantity ?? (m as any).stock ?? 0);
        const limit = Number(m.warningLimit ?? (m as any).minStock ?? 0);
        return qty <= limit;
      }),
    [rawMaterials],
  );
  const lowProductsAll = React.useMemo(
    () =>
      (products || []).filter((p) => {
        const stock = Number(p.stock ?? (p as any).stockQuantity ?? 0);
        const limit = Number(p.warningLimit ?? (p as any).minStock ?? 0);
        return stock <= limit;
      }),
    [products],
  );
  const lowMaterials = React.useMemo(
    () => lowMaterialsAll.slice(0, 5),
    [lowMaterialsAll],
  );
  const lowProducts = React.useMemo(
    () => lowProductsAll.slice(0, 5),
    [lowProductsAll],
  );
  const totalWarnings = React.useMemo(
    () => lowMaterialsAll.length + lowProductsAll.length,
    [lowMaterialsAll, lowProductsAll],
  );

  const triggerAiAnalysis = async () => {
    const savedStore = localStorage.getItem("aslam_ledger_current_store");
    const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";

    setLoadingAi(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAiInsight(data.insight);
      } else {
        setAiInsight(data.message || "Gagal memanggil model pintar.");
      }
    } catch (err) {
      setAiInsight(
        "Error menghubungi server untuk analisis AI. Pastikan server aktif dan kunci API valid.",
      );
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Header Dashboard & Core Architecture Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                Product Vision & Positioning
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-300">Multi-Outlet Coffee & Resto OS</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              LedgerLine by Aslam
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Know Where Your Profit Really Goes · From Counter to Ledger
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                WAKTU SISTEM
              </p>
              <div className="text-amber-400 font-mono text-xs font-bold">
                <SystemClock />
              </div>
            </div>
            <button
              id="refresh-state-btn"
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700"
            >
              <RefreshCw size={14} />
              Segarkan Data
            </button>
          </div>
        </div>

        {/* The Three Engines Core Architecture Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider mb-1">
              1. TRANSACTION ENGINE
            </div>
            <div className="text-xs font-bold text-white">Input Layer Lapangan</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Menangkap interaksi kasir POS, order meja QR, penerimaan barang (receiving), dan beban harian.
            </p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
              2. LEDGER ENGINE (Source of Truth)
            </div>
            <div className="text-xs font-bold text-white">Event-Ledger Kronologis</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Tidak menyimpan saldo statis. Setiap gram biji kopi & rupiah dicatat berurutan secara permanen dengan Average Costing.
            </p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
              3. PROFIT ENGINE
            </div>
            <div className="text-xs font-bold text-white">Analytical Layer (Kebenaran Laba)</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Theoretical vs Actual Variance (kebocoran dirupiahkan) dan Kontribusi Margin per Channel (Dine-in vs Ojol).
            </p>
          </div>
        </div>
      </div>

      {/* Grid Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Pemasukan */}
        <div
          className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden"
          id="stat-income"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Total Pemasukan
              </p>
              <h3 className="text-2xl font-bold font-mono text-emerald-950 mt-2">
                Rp {formatRupiah(totalIncome)}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <TrendingUp size={22} />
            </div>
          </div>
          <p className="text-xs text-emerald-600 mt-4 flex items-center gap-1">
            <span>● Kas, Debit, QRIS terintegrasi aman</span>
          </p>
        </div>

        {/* Card Pengeluaran */}
        <div
          className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-2xl border border-rose-100 shadow-xs relative overflow-hidden"
          id="stat-expense"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Total Pengeluaran
              </p>
              <h3 className="text-2xl font-bold font-mono text-rose-950 mt-2">
                Rp {formatRupiah(totalExpense)}
              </h3>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
              <TrendingDown size={22} />
            </div>
          </div>
          <p className="text-xs text-rose-500 mt-4">
            Operasional & restok bahan baku
          </p>
        </div>

        {/* Card Laba Bersih */}
        <div
          className="bg-gradient-to-br from-sky-50 to-white p-6 rounded-2xl border border-sky-100 shadow-xs relative overflow-hidden"
          id="stat-profit"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
                Laba Bersih
              </p>
              <h3 className="text-2xl font-bold font-mono text-sky-950 mt-2">
                Rp {formatRupiah(netProfit)}
              </h3>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-700">
              <DollarSign size={22} />
            </div>
          </div>
          <p className="text-xs text-sky-600 mt-4">
            Keuntungan bersih usaha Anda
          </p>
        </div>

        {/* Card Margin */}
        <div
          className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/60 shadow-xs relative overflow-hidden"
          id="stat-margin"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Rasio Profit Margin
              </p>
              <h3 className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {marginPercentage}%
              </h3>
            </div>
            <div className="p-3 bg-slate-200 rounded-xl text-slate-700">
              <Percent size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Tingkat efisiensi biaya menu
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Kiri: Notifikasi Bahan Baku Kritis */}
        <div
          className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs"
          id="critical-stock-module"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="text-amber-500 animate-pulse"
                size={20}
              />
              <h2 className="text-base font-bold text-slate-900">
                Peringatan Stok & Bahan Baku Kritis
              </h2>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold font-mono bg-amber-50 text-amber-700 rounded-lg">
              {totalWarnings} Butuh Restok
            </span>
          </div>

          {totalWarnings === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ShoppingBag className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-sm font-medium text-slate-600">
                Seluruh persediaan aman!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Stok produk dan bahan baku berada di atas ambang minimum.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {/* List Bahan Baku Kritis */}
              {lowMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-semibold text-slate-900">
                        {mat.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Sisa:{" "}
                      <strong className="text-rose-600 font-mono">
                        {formatRupiah(mat.stockQuantity ?? (mat as any).stock)}{" "}
                        {mat.stockUnit || (mat as any).unit || "pcs"}
                      </strong>{" "}
                      (Minimum:{" "}
                      {formatRupiah(mat.warningLimit ?? (mat as any).minStock)}{" "}
                      {mat.stockUnit || (mat as any).unit || "pcs"})
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600">
                      <p className="text-[10px] text-slate-400 font-medium">
                        SUPPLIER
                      </p>
                      <p className="font-semibold text-slate-700">
                        {mat.supplierName || "-"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyPODraft(
                          mat.id,
                          mat.name,
                          mat.warningLimit ?? 0,
                          mat.stockQuantity ?? 0,
                          mat.stockUnit || "pcs",
                          mat.supplierName || "-",
                        )
                      }
                      className={`px-3 py-2 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer border ${
                        copiedItemId === mat.id
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {copiedItemId === mat.id
                        ? "Tersalin !"
                        : "Salin Draft PO"}
                    </button>
                    <a
                      href={`https://wa.me/${(mat.supplierContact || "").replace(/[^0-9]/g, "")}?text=Halo%20${encodeURIComponent(mat.supplierName || "Supplier")},%20kami%20ingin%20memesan%20kembali%20${encodeURIComponent(mat.name)}%20untuk%20${encodeURIComponent(appConfig?.storeName || "Kedai")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg transition-all font-sans font-semibold"
                    >
                      <Phone size={14} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}

              {/* List Produk Jadi Kritis */}
              {lowProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="font-semibold text-slate-900">
                        {prod.name} ({prod.category})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Sisa:{" "}
                      <strong className="text-rose-600 font-mono">
                        {formatRupiah(prod.stock ?? (prod as any).stockQuantity)}{" "}
                        Porsi
                      </strong>{" "}
                      (Minimum:{" "}
                      {formatRupiah(prod.warningLimit ?? (prod as any).minStock)})
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600">
                      <p className="text-[10px] text-slate-400 font-medium font-semibold">
                        SUPPLIER
                      </p>
                      <p className="font-semibold text-slate-700">
                        {prod.supplierName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyPODraft(
                          prod.id,
                          prod.name,
                          prod.warningLimit,
                          prod.stock,
                          "Porsi",
                          prod.supplierName,
                        )
                      }
                      className={`px-3 py-2 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer border ${
                        copiedItemId === prod.id
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {copiedItemId === prod.id
                        ? "Tersalin !"
                        : "Salin Draft PO"}
                    </button>
                    <a
                      href={`https://wa.me/${(prod.supplierContact || "").replace(/[^0-9]/g, "")}?text=Halo%20${encodeURIComponent(prod.supplierName)},%20kami%20ingin%20memesan%20kembali%20${encodeURIComponent(prod.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-all font-sans font-semibold"
                    >
                      <Phone size={14} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Kecerdasan Buatan AI Insights */}
        <div
          className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between min-h-[350px]"
          id="insight-ai-module"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-505/20 text-indigo-400 rounded-lg">
                  <Sparkles size={18} className="animate-spin-slow" />
                </div>
                <h3 className="text-sm font-bold tracking-tight text-slate-50 uppercase">
                  Kecerdasan Buatan AI
                </h3>
              </div>
              <span className="bg-indigo-500/10 text-indigo-300 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">
                Gemini 3.5
              </span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight mt-1">
              Analisis Pintar Coffee Shop
            </h2>
            <p className="text-slate-300 text-xs mt-1">
              Dapatkan strategi instan menangani stok menipis dan target
              penjualan bulanan.
            </p>

            <div className="mt-4 text-xs leading-relaxed text-slate-200 bg-white/5 p-4 rounded-xl border border-white/10 max-h-[220px] overflow-y-auto font-sans">
              {loadingAi ? (
                <div
                  className="flex flex-col items-center justify-center py-8 gap-3"
                  id="ai-loading"
                >
                  <RefreshCw
                    className="animate-spin text-slate-400"
                    size={24}
                  />
                  <p className="text-slate-400 text-center animate-pulse">
                    Konsultan AI senior sedang merancang ulasan keuangan dan
                    stok...
                  </p>
                </div>
              ) : aiInsight ? (
                <div
                  className="whitespace-pre-line text-slate-100"
                  id="ai-response-box"
                >
                  {aiInsight}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-6">
                  Klik tombol di bawah ini untuk menghasilkan ulasan bisnis
                  khusus berdasarkan kondisi keuangan, stok bahan baku, dan
                  supplier Anda secara otomatis.
                </p>
              )}
            </div>
          </div>

          <button
            id="generate-ai-insight-btn"
            disabled={loadingAi}
            onClick={triggerAiAnalysis}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700/50 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer hover:shadow-indigo-500/20"
          >
            <Sparkles size={16} />
            {aiInsight
              ? "Hubungkan AI & Analisis Lagi"
              : "Hasilkan Rekomendasi Bisnis"}
          </button>
        </div>
      </div>

      {/* HOOK WIDGET: TREN HARGA KOMODITAS PASAR (PERSAINGAN SEHAT) */}
      <div
        className="bg-gradient-to-br from-slate-50 to-indigo-50/20 p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4"
        id="mkt-intelligence-dashboard-hook"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1 text-left">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
              <Network size={11} /> FREE MARKET MONITOR
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              Tren Harga Pokok Komoditas Regional (Yogyakarta & DIY)
            </h3>
            <p className="text-xs text-slate-500">
              Hasil pooling transaksi riil dienkripsi dari ratusan kafe mitra
              Ledger Line.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate("intelligence")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Bandingkan Harga & Cari Supplier <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left font-sans">
          {[
            {
              label: "House Blend (per Kg)",
              avg: "Rp 215.000",
              trend: "Stabil",
              col: "text-slate-650 bg-slate-50",
              bg: "bg-white",
            },
            {
              label: "Fresh Milk (per Ltr)",
              avg: "Rp 17.200",
              trend: "Naik +4.5%",
              col: "text-rose-600 bg-rose-50 font-bold",
              bg: "bg-white",
            },
            {
              label: "Gula Aren (per Ltr)",
              avg: "Rp 24.500",
              trend: "Stabil",
              col: "text-slate-650 bg-slate-50",
              bg: "bg-white",
            },
            {
              label: "Premium Matcha (per Kg)",
              avg: "Rp 730.000",
              trend: "Turun -1.2%",
              col: "text-emerald-600 bg-emerald-50 font-bold",
              bg: "bg-white",
            },
          ].map((c, i) => (
            <div
              key={i}
              className={`${c.bg} p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5`}
            >
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none">
                {c.label}
              </p>
              <p className="text-[15.5px] font-mono font-black text-slate-800 tracking-tight leading-none mt-1">
                {c.avg}
              </p>
              <span
                className={`inline-block text-[9px] px-1.5 py-0.5 rounded-md ${c.col} mt-1`}
              >
                Indeks {c.trend}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SEKSI BARU: ANALISIS PROFITABILITAS MENU & OPTIMISASI PRICING KAFE */}
      <div
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4"
        id="menu-profitability-block"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Coins className="text-amber-500 animate-pulse" size={18} />
              Analisis Kontribusi Margin & Profitabilitas Menu
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Analisis HPP (Cost of Goods Sold), harga jual, dan rasio margin
              laba bersih produk aktif untuk keputusan harga ideal.
            </p>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-[#EBF5FF] text-blue-800 border border-blue-100 rounded-lg uppercase tracking-wider">
            Siklus Margin Aktif
          </span>
        </div>

        {/* Filter & Bar Pencarian */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari nama menu kopi/makanan..."
              value={profitSearch}
              onChange={(e) => setProfitSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-hidden transition-all placeholder:text-slate-400 font-sans"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto font-sans">
            {["All", "Kopi", "Non-Kopi", "Makanan"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedProfitCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedProfitCat === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "All" ? "Semua Kategori" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Spreadsheet Table Look */}
        <div className="overflow-x-auto border border-slate-150 rounded-xl">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead className="bg-slate-50 border-b border-slate-150 font-semibold text-slate-500 font-mono text-[10px] uppercase">
              <tr>
                <th className="p-3">Nama Menu / Produk Jadi</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Harga HPP (Modal Rp)</th>
                <th className="p-3 text-right">Harga Jual (Porsi Rp)</th>
                <th className="p-3 text-right">Laba / Porsi (Rp)</th>
                <th className="p-3 text-right">Margin Laba (%)</th>
                <th className="p-3 text-center">
                  Status Tier & Rekomendasi Pricing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(() => {
                const filtered = products.filter((p) => {
                  const matchSearch = p.name
                    .toLowerCase()
                    .includes(profitSearch.toLowerCase());
                  const matchCat =
                    selectedProfitCat === "All" ||
                    p.category === selectedProfitCat;
                  return matchSearch && matchCat;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-slate-400 font-medium font-sans"
                      >
                        Tidak ada menu yang cocok dengan kriteria pencarian ini.
                      </td>
                    </tr>
                  );
                }

                return (filtered || []).map((p) => {
                  const costPrice = Number(p.costPrice ?? (p as any).cogs ?? 0);
                  const price = Number(p.price ?? 0);
                  const profitVal = price - costPrice;
                  const marginPct =
                    price > 0 ? Math.round((profitVal / price) * 100) : 0;

                  let tierLabel = "Steady";
                  let tierColor = "bg-blue-50 text-blue-700 border-blue-100";
                  let recText = "Harga pasar stabil dan margin aman.";

                  if (marginPct >= 65) {
                    tierLabel = "Sangat Sehat";
                    tierColor =
                      "bg-emerald-50 text-emerald-700 border-emerald-100";
                    recText =
                      "Sangat profitable! Pertahankan kualitas bahan baku tetap premium.";
                  } else if (marginPct < 40) {
                    tierLabel = "Margin Rendah";
                    tierColor = "bg-rose-50 text-rose-700 border-rose-100";
                    const idealPrice =
                      Math.ceil((costPrice * 2) / 1000) * 1000;
                    recText = `Saran: Naikkan harga ke Rp ${formatRupiah(idealPrice)} untuk mencapai ideal margin 50%!`;
                  }

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${marginPct < 40 ? "bg-rose-500 animate-pulse" : marginPct >= 65 ? "bg-emerald-500" : "bg-blue-500"}`}
                          />
                          {p.name}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500">{p.category}</td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        Rp {formatRupiah(costPrice)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        Rp {formatRupiah(price)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        Rp {formatRupiah(profitVal)}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`font-mono font-black ${marginPct >= 65 ? "text-emerald-600" : marginPct < 40 ? "text-rose-600 font-extrabold" : "text-blue-600"}`}
                        >
                          {marginPct}%
                        </span>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${tierColor}`}
                          >
                            {tierLabel}
                          </span>
                          <span className="text-[10.5px] text-slate-400 italic leading-tight">
                            {recText}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED FOOTER AT THE BOTTOM OF THE DASHBOARD */}
      <div
        className="bg-slate-50/60 p-6 rounded-2xl border border-slate-250/80 space-y-5 shadow-xs"
        id="dashboard-help-glossary"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <BookOpen className="animate-pulse" size={18} />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-slate-800 tracking-tight">
                  Pusat Informasi & Glosarium Interaktif
                </h2>
                <span className="px-1.5 py-0.5 bg-slate-250 text-slate-600 text-[8.5px] font-mono font-bold rounded-md">
                  CONSOLE v2.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Navigasi cepat istilah finansial, ambang kritis operasional, dan
                mesin asisten kecerdasan buatan Gemini AI.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGlossary(!showGlossary)}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 transition-all cursor-pointer active:scale-95 whitespace-nowrap font-sans"
          >
            {showGlossary ? "Sembunyikan Terminal" : "Buka Terminal Informasi"}
          </button>
        </div>{" "}
        {showGlossary && (
          <div className="animate-fade-in font-sans">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3.5">
              Klik Kontrol Metrik untuk Petunjuk Lengkap (Interactive Bento):
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {[
                {
                  id: "income",
                  title: "Total Pemasukan",
                  subtitle: "Gross Profit Inflow",
                  color: "text-emerald-500 bg-emerald-50/50 border-emerald-100",
                  icon: TrendingUp,
                  metric: `Rp ${formatRupiah(totalIncome)}`,
                },
                {
                  id: "expense",
                  title: "Total Pengeluaran",
                  subtitle: "Operating Expense",
                  color: "text-rose-500 bg-rose-50/50 border-rose-100",
                  icon: TrendingDown,
                  metric: `Rp ${formatRupiah(totalExpense)}`,
                },
                {
                  id: "net_profit",
                  title: "Laba Bersih",
                  subtitle: "True Net Earnings",
                  color: "text-sky-600 bg-sky-50/50 border-sky-100",
                  icon: DollarSign,
                  metric: `Rp ${formatRupiah(netProfit)}`,
                },
                {
                  id: "profit_margin",
                  title: "Profit Margin",
                  subtitle: "Efficiency Ratio",
                  color: "text-indigo-600 bg-indigo-50/50 border-indigo-100",
                  icon: Percent,
                  metric: `${marginPercentage}%`,
                },
                {
                  id: "stock_warning",
                  title: "Stok Kritis",
                  subtitle: "Restock PO Alerts",
                  color: "text-amber-500 bg-amber-50/50 border-amber-100",
                  icon: AlertTriangle,
                  metric: `${lowMaterials.length} Item`,
                },
                {
                  id: "gemini_ai",
                  title: "Gemini AI Hub",
                  subtitle: "Automated Insight",
                  color: "text-violet-600 bg-violet-50/50 border-violet-100",
                  icon: Sparkles,
                  metric: "Aktif V1.5",
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setActiveGlossaryTab(card.id as any);
                      setDetailedGlossaryModal(true);
                    }}
                    className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all cursor-pointer flex flex-col justify-between text-left group hover:scale-[1.03] hover:shadow-md active:scale-95 shadow-2xs"
                    style={{ minHeight: "130px" }}
                  >
                    <div className="space-y-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.color}`}
                      >
                        <Icon size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                          {card.title}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-mono tracking-tight">
                          {card.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-between items-center w-full">
                      <span className="text-[10px] font-mono font-extrabold text-slate-700 leading-none">
                        {card.metric}
                      </span>
                      <span className="text-[8px] text-indigo-500 font-bold tracking-widest font-sans uppercase">
                        TINJAU
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* DETAILED GLOSSARY OVERLAY DI TENGAH LAYAR (FUTURISTIK & SEPERTI TERMINAL) */}
        {detailedGlossaryModal && (
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fade-in"
            style={{ zIndex: 9999 }}
            id="detailed-glossary-overlay"
          >
            <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-in flex flex-col gap-5 overflow-hidden text-slate-700">
              {/* Top ambient glowing bar */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-violet-600 to-pink-500" />

              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mt-2">
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-widest text-[#4f46e5] font-black leading-none">
                    Console Metrik Buku-Kas
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5 uppercase">
                    📘 Detail Metrik:{" "}
                    {activeGlossaryTab === "income"
                      ? "Total Pemasukan"
                      : activeGlossaryTab === "expense"
                        ? "Total Pengeluaran"
                        : activeGlossaryTab === "net_profit"
                          ? "Laba Bersih Akhir"
                          : activeGlossaryTab === "profit_margin"
                            ? "Rasio Profit Margin"
                            : activeGlossaryTab === "stock_warning"
                              ? "Sistem Peringatan Stok"
                              : "Asisten Pintar Gemini AI"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailedGlossaryModal(false)}
                  className="text-slate-400 hover:text-slate-700 font-extrabold text-xs bg-slate-50 hover:bg-slate-100 p-2 rounded-lg transition-all"
                >
                  ✕ Tutup
                </button>
              </div>

              {/* Dynamic Content */}
              <div className="space-y-4 text-xs font-sans">
                {activeGlossaryTab === "income" && (
                  <div className="space-y-3.5">
                    <p className="text-slate-500 leading-relaxed font-semibold">
                      Akumulasi seluruh uang yang masuk dari transaksi penjualan
                      di kasir POS. Angka ini mencakup semua jenis metode
                      pembayaran (Tunai, QRIS Dinamis, Kartu Debit, dan
                      Integrasi Midtrans) yang telah tuntas terbayar oleh
                      konsumen sebelum dikurangi pajak daerah PB1 (10%) maupun
                      harga pokok bahan baku (HPP).
                    </p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-[11px] space-y-1">
                      <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider font-sans leading-none">
                        Formula Pencatatan Buku-Kas:
                      </p>
                      <p className="font-extrabold text-slate-800 mt-1">
                        ∑ (Porsi Jual × Jumlah Terjual) = Pendapatan Kotor
                      </p>
                    </div>
                    <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
                        <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider">
                          Pemasukan Riil Saat Ini
                        </span>
                      </div>
                      <strong className="text-sm font-mono font-black text-emerald-600">
                        Rp {formatRupiah(totalIncome)}
                      </strong>
                    </div>
                  </div>
                )}

                {activeGlossaryTab === "expense" && (
                  <div className="space-y-3.5">
                    <p className="text-slate-500 leading-relaxed font-semibold">
                      Akumulasi seluruh biaya operasional ruko yang dicatat
                      secara berkala (seperti sewa lokasi, internet ruko, bonus
                      barista, es batu harian), ditambah dengan nominal
                      pembelanjaan / restock suplai bahan baku kopi dari
                      supplier yang terdaftar pada sistem.
                    </p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-[11px] space-y-1">
                      <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider font-sans leading-none">
                        Formula Komponen Pengeluaran:
                      </p>
                      <p className="font-extrabold text-slate-800 mt-1">
                        Kas Belanja Bahan Baku + Biaya Operasional / Utilitas
                      </p>
                    </div>
                    <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block mr-1.5 animate-pulse" />
                        <span className="text-[10px] text-rose-800 font-extrabold uppercase tracking-wider">
                          Pengeluaran Riil Saat Ini
                        </span>
                      </div>
                      <strong className="text-sm font-mono font-black text-rose-600">
                        Rp {formatRupiah(totalExpense)}
                      </strong>
                    </div>
                  </div>
                )}

                {activeGlossaryTab === "net_profit" && (
                  <div className="space-y-3.5">
                    <p className="text-slate-500 leading-relaxed font-semibold">
                      Keuntungan bersih aktual yang dibawa pulang oleh pemilik
                      kedai (Owner). Jika nilainya positif, tandanya kafe Anda
                      sehat finansial; jika negatif, tandanya kedai Anda
                      mengalami kebocoran anggaran harian. Dihitung langsung
                      dari sirkulasi pendapatan dikurangi belanja bahan baku
                      ruko & pengeluaran utilitas flat.
                    </p>
                    <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2 font-mono text-[10.5px]">
                      <div className="flex justify-between items-center text-slate-450 text-[8.5px] uppercase font-bold tracking-widest font-sans border-b border-slate-800 pb-1.5 leading-none">
                        <span>LIVE FORMULA SIMULATION</span>
                        <span
                          className={
                            netProfit >= 0
                              ? "text-emerald-400"
                              : "text-rose-450"
                          }
                        >
                          {netProfit >= 0 ? "● STATUS SEHAT" : "● RISIKO RUGI"}
                        </span>
                      </div>
                      <p className="text-slate-400">
                        Laba Bersih = Pemasukan - Pengeluaran
                      </p>
                      <p className="font-extrabold text-white tracking-wider border-t border-slate-850 pt-2 flex flex-wrap gap-1 leading-none mt-1">
                        <span>Rp {formatRupiah(totalIncome)}</span>
                        <span className="text-rose-450">-</span>
                        <span>Rp {formatRupiah(totalExpense)}</span>
                        <span className="text-blue-400">=</span>
                        <span
                          className={
                            netProfit >= 0
                              ? "text-emerald-400 font-black"
                              : "text-rose-400 font-black"
                          }
                        >
                          Rp {formatRupiah(netProfit)}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {activeGlossaryTab === "profit_margin" && (
                  <div className="space-y-3.5">
                    <p className="text-slate-500 leading-relaxed font-semibold">
                      Persentase efisiensi usaha dalam menghasilkan laba dari
                      setiap rupiah pendapatan. Dihitung otomatis dengan membagi
                      Laba Bersih dengan Total Pemasukan kemudian dikalikan 100.
                      Semakin tinggi rasionya, semakin kuat pertahanan finansial
                      ruko kedai Anda menghadapi inflasi bahan baku.
                    </p>
                    <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2 font-mono text-[10.5px]">
                      <div className="flex justify-between items-center text-slate-405 text-[8.5px] uppercase font-bold tracking-widest font-sans border-b border-slate-800 pb-1.5 leading-none">
                        <span>LIVE RATIO CALCULATION</span>
                        <span className="text-indigo-400 font-sans font-bold">
                          {marginPercentage >= 40
                            ? "IDEAL MARGIN (>40%)"
                            : "MARGIN TERTANAM"}
                        </span>
                      </div>
                      <p className="text-slate-400">
                        Profit Margin = (Laba Bersih / Total Pemasukan) × 100%
                      </p>
                      <p className="font-extrabold text-white tracking-wider border-t border-slate-850 pt-2 flex flex-wrap gap-1 leading-none mt-1">
                        <span>(Rp {formatRupiah(netProfit)}</span>
                        <span className="text-slate-500">/</span>
                        <span>Rp {formatRupiah(totalIncome)})</span>
                        <span className="text-indigo-400">× 100%</span>
                        <span className="text-blue-450">=</span>
                        <span className="text-indigo-400 font-black">
                          {marginPercentage}%
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {activeGlossaryTab === "stock_warning" && (
                  <div className="space-y-3.5">
                    <p className="text-slate-500 leading-relaxed font-semibold">
                      Modul cerdas yang memantau sisa stok susu, cup paper, gula
                      cair, atau biji kopi di bawah batas kritis aman (warning
                      limit) yang telah disetel. Jika terlewati, sistem akan
                      menyalakan alarm merah dan menyiapkan tombol salin
                      Purchase Order otomatis untuk supplier.
                    </p>
                    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-center gap-3.5">
                      <AlertTriangle
                        className="text-amber-500 shrink-0"
                        size={24}
                      />
                      <div className="space-y-0.5 text-xs text-amber-950 font-semibold">
                        <strong className="block text-amber-900 font-bold text-xs uppercase tracking-wide">
                          Ringkasan Darurat Stok Riil
                        </strong>
                        <span className="text-amber-850 text-[11px] leading-relaxed block font-medium mt-0.5">
                          Terdapat{" "}
                          <strong className="font-bold text-rose-700 font-mono">
                            {lowMaterials.length} bahan baku
                          </strong>{" "}
                          dan{" "}
                          <strong className="font-bold text-rose-700 font-mono">
                            {lowProducts.length} produk jadi
                          </strong>{" "}
                          berada di bawah batas kritis.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeGlossaryTab === "gemini_ai" && (
                  <div className="space-y-3.5">
                    <p className="text-slate-500 leading-relaxed font-semibold">
                      Sebelah modul stok rill adalah asisten audit otomatis yang
                      ditenagai oleh model{" "}
                      <strong className="text-violet-600 font-bold">
                        Google Gemini AI
                      </strong>
                      . Menekan tombol "Hasilkan Rekomendasi" akan secara instan
                      membaca kondisi riil pengeluaran, HPP, margin keuntungan,
                      dan restock supplier, memberikan taktik terarah tanpa
                      perhitungan lokal.
                    </p>
                    <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                        <div>
                          <p className="font-bold text-white text-[11.5px]">
                            Google Gemini SDK Integration
                          </p>
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider leading-none mt-0.5">
                            Server-Side Security Shield Shield Active
                          </p>
                        </div>
                      </div>
                      <span className="text-indigo-400 font-extrabold text-[10px]">
                        READY (1.5 Flash)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDetailedGlossaryModal(false)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/10 cursor-pointer active:scale-95 transition-all w-full text-center sm:w-auto"
                >
                  Siap, Saya Paham
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
