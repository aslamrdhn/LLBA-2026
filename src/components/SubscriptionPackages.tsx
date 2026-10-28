import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";

interface Entitlement {
  id: string;
  featureKey: string;
  featureValue: string;
}

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  entitlements: Entitlement[];
}

interface CurrentSubscription {
  id: string;
  planId: string;
  status: string;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: SubscriptionPlan;
}

export default function SubscriptionPackages() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("GROWTH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch available plans
      const plansRes = await fetch("/api/subscriptions/plans", { credentials: "include" });
      const plansData = await plansRes.json();
      if (plansData.success && Array.isArray(plansData.data)) {
        setPlans(plansData.data);
      }

      // 2. Fetch current tenant subscription
      const subRes = await fetch("/api/subscriptions/current", { credentials: "include" });
      const subData = await subRes.json();
      if (subData.success && subData.data) {
        setCurrentSub(subData.data);
        if (subData.data.plan?.code) {
          setSelectedPlanCode(subData.data.plan.code);
        }
      }
    } catch (err: any) {
      setErrorMsg("Gagal memuat informasi paket langganan. Memuat paket standar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const handleSubscribe = async (planCode: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/subscriptions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planCode,
          billingCycle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Berhasil mengaktifkan ${planCode}!`);
        await fetchSubscriptionData();
      } else {
        setErrorMsg(data.message || "Gagal memproses langganan.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Fallback plans if server returned empty
  const displayPlans = plans.length > 0 ? plans : [
    {
      id: "p-core",
      code: "CORE",
      name: "Paket Core POS & True Cost",
      description: "Untuk kedai kopi 1 outlet yang membutuhkan sistem kasir offline-first dan penentuan HPP sejati.",
      priceMonthly: 149000,
      priceYearly: 1490000,
      currency: "IDR",
      entitlements: [
        { id: "e1", featureKey: "MAX_OUTLETS", featureValue: "1" },
        { id: "e2", featureKey: "MAX_USERS", featureValue: "2" },
        { id: "e3", featureKey: "MAX_DEVICES", featureValue: "2" },
      ],
    },
    {
      id: "p-growth",
      code: "GROWTH",
      name: "Paket Growth & Multi-Gudang",
      description: "Untuk kedai bertumbuh dengan manajemen resep bertingkat, multi-gudang, dan alokasi True Cost otomatis.",
      priceMonthly: 399000,
      priceYearly: 3990000,
      currency: "IDR",
      entitlements: [
        { id: "e4", featureKey: "MAX_OUTLETS", featureValue: "3" },
        { id: "e5", featureKey: "MAX_USERS", featureValue: "5" },
        { id: "e6", featureKey: "MAX_DEVICES", featureValue: "5" },
      ],
    },
    {
      id: "p-ent",
      code: "ENTERPRISE",
      name: "Paket Enterprise All-System",
      description: "Akses lengkap tak terbatas: multi-cabang, digital auditor AI, backup Google Drive, dan dukungan 24/7.",
      priceMonthly: 999000,
      priceYearly: 9990000,
      currency: "IDR",
      entitlements: [
        { id: "e7", featureKey: "MAX_OUTLETS", featureValue: "99" },
        { id: "e8", featureKey: "MAX_USERS", featureValue: "99" },
        { id: "e9", featureKey: "MAX_DEVICES", featureValue: "99" },
      ],
    },
  ];

  const getFeatureList = (code: string) => {
    switch (code) {
      case "CORE":
        return [
          "Mesin Kasir POS Offline-First",
          "Kalkulasi HPP FIFO & Average Cost",
          "Maksimal 1 Outlet & 2 Perangkat POS",
          "Manajemen Resep & Stok Bahan Baku",
          "Laporan Keuangan & Arus Kas Harian",
          "Buku Besar Append-Only Double Entry",
        ];
      case "GROWTH":
        return [
          "Semua Fitur Paket Core",
          "Maksimal 3 Outlet & 5 Perangkat POS",
          "Multi-Gudang & Transfer Stok Antar-Cabang",
          "Alokasi Biaya Overhead (Capacity Absorption)",
          "Sinkronisasi Cloud Backup Otomatis",
          "Persetujuan Void & Refund Bertingkat",
          "Barcode Meja QR & Self-Order Pelanggan",
        ];
      case "ENTERPRISE":
        return [
          "Semua Fitur Paket Growth",
          "Unlimited Outlet & Unlimited Kasir",
          "Digital Auditor AI & Deteksi Anomali Margin",
          "Integrasi Google Drive & Ekspor Excel Audit",
          "Supply Analytics & Pemesanan PO B2B Otomatis",
          "Akses API Integrasi Akuntansi Pihak Ketiga",
          "Prioritas Bantuan Teknis & Dedicated Support 24/7",
        ];
      default:
        return [
          "Kasir POS Standar",
          "Manajemen Stok Bahan Baku",
          "Laporan Keuangan Dasar",
        ];
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-slate-400 font-medium">Memuat paket langganan dan status lisensi...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-900 text-white p-6 md:p-10 overflow-y-auto font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} /> Paket Langganan Resmi LedgerLine
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Pilih Paket Sistem Operasi Kedai Anda
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
            Transparan, tanpa biaya tersembunyi. Setiap paket terhubung langsung dengan mesin deterministik True Cost dan sistem pencatatan buku besar append-only.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center pt-4">
            <div className="bg-slate-800 p-1 rounded-2xl border border-slate-700 flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Tahunan <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] border border-emerald-500/30">Hemat 2 Bulan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Current Active Plan Status Banner */}
        {currentSub && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Langganan Saat Ini:</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
                    currentSub.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  }`}>
                    {currentSub.status === "TRIALING" ? "Masa Uji Coba (Trial)" : currentSub.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {currentSub.plan?.name || "Paket Standard"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <Clock size={12} />
                  Periode aktif hingga:{" "}
                  <strong className="text-slate-200">
                    {new Date(currentSub.currentPeriodEnd).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">ID Langganan:</span>
              <p className="text-xs font-mono text-slate-300">{currentSub.id.slice(0, 16)}...</p>
            </div>
          </div>
        )}

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {displayPlans.map((plan) => {
            const isSelected = selectedPlanCode === plan.code;
            const isCurrentActive = currentSub?.plan?.code === plan.code;
            const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
            const features = getFeatureList(plan.code);
            const isPopular = plan.code === "GROWTH";

            return (
              <div
                key={plan.id || plan.code}
                onClick={() => setSelectedPlanCode(plan.code)}
                className={`relative rounded-3xl p-6 md:p-8 flex flex-col justify-between transition-all cursor-pointer border-2 ${
                  isPopular
                    ? "bg-slate-800/90 border-amber-500 shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500/40"
                    : isSelected
                    ? "bg-slate-800/70 border-amber-500/70 shadow-xl"
                    : "bg-slate-800/40 border-slate-700/80 hover:border-slate-600 shadow-md"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black px-4 py-1 rounded-full shadow-md tracking-widest uppercase">
                    Paling Direkomendasikan
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {isCurrentActive && (
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-6 min-h-[36px] leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="pb-6 mb-6 border-b border-slate-700/60">
                    <div className="text-3xl font-black text-white">
                      {formatRupiah(price)}
                    </div>
                    <span className="text-xs text-slate-400">
                      / {billingCycle === "yearly" ? "tahun (ditagih tahunan)" : "bulan"}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscribe(plan.code);
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isCurrentActive
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      : isPopular
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
                      : "bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white"
                  }`}
                >
                  {isSubmitting ? (
                    "Memproses..."
                  ) : isCurrentActive ? (
                    "Perpanjang Paket Ini"
                  ) : (
                    <>
                      Pilih & Upgrade Paket <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Enterprise Security & Compliance Guarantee */}
        <div className="mt-12 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-slate-400 text-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={32} className="text-amber-500 shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm">Garansi Integritas Finansial & Keamanan Data</h4>
              <p className="mt-0.5">
                Semua transaksi langganan dicatat secara otomatis dalam tabel faktur buku besar dan dilindungi sistem isolasi multi-tenant level database.
              </p>
            </div>
          </div>
          <div className="text-slate-500 shrink-0 text-center md:text-right">
            Metode Pembayaran: <strong className="text-slate-300">QRIS / Transfer Bank</strong>
          </div>
        </div>

      </div>
    </div>
  );
}
