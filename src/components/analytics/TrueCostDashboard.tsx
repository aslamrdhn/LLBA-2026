import React, { useState, useEffect } from "react";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Zap,
  Users,
  Wrench,
  Percent,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface TrueCostProduct {
  menuId: string;
  name: string;
  unitsSold: number;
  hppPerUnit: number;
  allocatedOverheadPerUnit: number;
  trueCostPerUnit: number;
  sellingPrice: number;
  trueMarginAmount: number;
  trueMarginPercent: number;
}

interface CostPool {
  id: string;
  name: string;
  category: "RENT" | "UTILITIES" | "LABOR" | "DEPRECIATION" | "OTHER";
  amount: number;
  capacity: number;
}

interface TrueCostData {
  periodDaysElapsed: number;
  totalDaysInMonth: number;
  status: "PROVISIONAL" | "FINAL";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  isSpikeDetected: boolean;
  totalPoolExpenses: number;
  totalAllocatedOverhead: number;
  totalIdleCost: number;
  pools: CostPool[];
  products: TrueCostProduct[];
}

const safeFormatRupiah = (val: number | string | undefined) => {
  const num = Math.round(Number(val) || 0);
  return `Rp${num.toLocaleString("id-ID")}`;
};

interface TrueCostDashboardProps {
  products?: any[];
  tenantId?: string;
}

export default function TrueCostDashboard(_props?: TrueCostDashboardProps) {
  const [data, setData] = useState<TrueCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "pools">("products");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/true-cost", {
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat True Cost data");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "RENT":
        return <Building2 className="w-4 h-4 text-amber-400" />;
      case "UTILITIES":
        return <Zap className="w-4 h-4 text-cyan-400" />;
      case "LABOR":
        return <Users className="w-4 h-4 text-emerald-400" />;
      default:
        return <Wrench className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-slate-100">
      {/* Header with Title, Status & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                True Cost Operating Engine
              </h1>
              {data && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase border ${
                    data.status === "FINAL"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                  }`}
                >
                  {data.status}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Absorpsi kapasitas tertutup (Largest Remainder) & Isolasi Beban Menganggur (Akun 8000)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">Keyakinan:</span>
              <span
                className={`font-semibold ${
                  data.confidence === "HIGH"
                    ? "text-emerald-400"
                    : data.confidence === "MEDIUM"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {data.confidence}
              </span>
            </div>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all flex items-center gap-2 text-xs font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-1">
            <span className="text-xs font-medium text-slate-400">Total Pool Biaya Operasional</span>
            <p className="text-xl font-bold text-white tracking-tight">
              {safeFormatRupiah(data.totalPoolExpenses)}
            </p>
            <p className="text-[11px] text-slate-500">
              Bulan berjalan ({data.periodDaysElapsed}/{data.totalDaysInMonth} hari)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-1">
            <span className="text-xs font-medium text-emerald-400">Overhead Terdistribusi</span>
            <p className="text-xl font-bold text-emerald-400 tracking-tight">
              {safeFormatRupiah(data.totalAllocatedOverhead)}
            </p>
            <p className="text-[11px] text-slate-500">Terserap ke unit produk terjual</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 bg-amber-500/5 shadow-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400">Beban Kapasitas Menganggur</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                Akun 8000
              </span>
            </div>
            <p className="text-xl font-bold text-amber-400 tracking-tight">
              {safeFormatRupiah(data.totalIdleCost)}
            </p>
            <p className="text-[11px] text-amber-300/70">Biaya periode (tidak membebani margin unit)</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-1">
            <span className="text-xs font-medium text-slate-400">Menu Aktif Dianalisis</span>
            <p className="text-xl font-bold text-cyan-400 tracking-tight">
              {data.products.length} Varian
            </p>
            <p className="text-[11px] text-slate-500">Determinisme 100% berbasis resep & lot</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "products"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Peta True Cost & Margin Menu</span>
          {data && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {data.products.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("pools")}
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "pools"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Kolam Biaya & Kapasitas (4 Pools)</span>
          {data && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {data.pools.length}
            </span>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab: Products Grid */}
      {activeTab === "products" && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.products.map((item) => (
            <div
              key={item.menuId}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 hover:shadow-2xl transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">{item.name}</h3>
                  <span className="text-[11px] text-slate-400">
                    Terjual: <strong className="text-slate-200">{item.unitsSold} cup</strong>
                  </span>
                </div>
                <div
                  className={`px-2 py-1 rounded-xl text-xs font-bold ${
                    item.trueMarginPercent >= 40
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : item.trueMarginPercent >= 20
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {item.trueMarginPercent}% Margin
                </div>
              </div>

              {/* Cost Breakdown Stack */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Harga Jual Bersih</span>
                  <span className="font-semibold text-white">{safeFormatRupiah(item.sellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">HPP Bahan (Material + Kemasan)</span>
                  <span className="font-medium text-amber-300">{safeFormatRupiah(item.hppPerUnit)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Overhead Terserap / Unit</span>
                  <span className="font-medium text-cyan-300">
                    +{safeFormatRupiah(item.allocatedOverheadPerUnit)}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-xs font-bold text-white">
                  <span>True Cost Total</span>
                  <span className="text-rose-400">{safeFormatRupiah(item.trueCostPerUnit)}</span>
                </div>
              </div>

              {/* Real Margin */}
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-400">Laba Bersih Riil (True Margin)</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {safeFormatRupiah(item.trueMarginAmount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Cost Pools */}
      {activeTab === "pools" && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.pools.map((pool) => (
            <div
              key={pool.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                    {getCategoryIcon(pool.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{pool.name}</h3>
                    <p className="text-[11px] text-slate-500">Kategori: {pool.category}</p>
                  </div>
                </div>
                <span className="font-bold text-white text-sm">
                  {safeFormatRupiah(pool.amount)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex justify-between">
                <span className="text-slate-400">Kapasitas Normal Bulanan</span>
                <span className="font-semibold text-slate-200">{pool.capacity} unit</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
