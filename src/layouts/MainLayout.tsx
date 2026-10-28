import React, { useState } from "react";
import { useUiStore } from "../store/uiStore";
import { useDataStore } from "../store/dataStore";
import { CheckCircle, X, ShieldCheck, Lock, Scale } from "lucide-react";
import DeterministicClosingModal from "../components/closing/DeterministicClosingModal";
import AuthorityMatrixModal from "../components/common/AuthorityMatrixModal";

import {
  Calculator,
  Layers,
  QrCode,
  FileBarChart2,
  Building2,
  LayoutDashboard,
  ShoppingCart,
  Network,
  Package,
  LogOut,
} from "lucide-react";
import { useUiMode } from "../context/UiModeContext";

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentStore: any;
  appConfig: any;
  demoTimeRemaining: string;
  handleLogoutStore: () => void;
  isKasir: boolean;
}

export function MainLayout({
  children,
  activeTab,
  setActiveTab,
  currentStore,
  appConfig,
  demoTimeRemaining,
  handleLogoutStore,
  isKasir,
}: MainLayoutProps) {
  const { uiMode } = useUiMode();
  const { activeRole } = useDataStore();
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showAuthorityModal, setShowAuthorityModal] = useState(false);

  const currentTheme = appConfig.theme || "slate";
  const themes: Record<string, any> = {
    slate: {
      appBg: "bg-[#F8FAFC]",
      asideBg: "bg-[#1E293B]",
      border: "border-slate-800/80",
      activeTab:
        "bg-blue-600/20 text-blue-450 border border-blue-500/20 font-extrabold shadow-sm",
      inactiveTab: "text-slate-400 hover:bg-white/5 hover:text-white",
      headerBg: "bg-white border-slate-200",
      headerText: "text-slate-700",
      accentText: "text-amber-400",
      accentBtn: "bg-emerald-500 hover:bg-emerald-600",
    },
  };
  const theme = themes[currentTheme] || themes.slate;

  const menuItems =
    uiMode === "simple"
      ? [
          { id: "tab-kasir", tab: "kasir", name: "Kasir POS", icon: Calculator },
          { id: "tab-stok", tab: "stok", name: "Stok & Ledger", icon: Layers },
          {
            id: "tab-laporan",
            tab: "laporan",
            name: "Laporan & Profit",
            icon: FileBarChart2,
          },
          {
            id: "tab-pengaturan",
            tab: "pengaturan",
            name: "Pengaturan",
            icon: Building2,
          },
        ]
      : [
          {
            id: "tab-dashboard",
            tab: "dashboard",
            name: "Dashboard Overview",
            icon: LayoutDashboard,
          },
          {
            id: "tab-kasir",
            tab: "kasir",
            name: "Mesin Kasir POS",
            icon: Calculator,
          },
          {
            id: "tab-stok",
            tab: "stok",
            name: "Stok & Event-Ledger",
            icon: Layers,
          },
          ...(["TIER_2", "TIER_3"].includes(
            appConfig?.subscriptionTier || "TIER_1",
          )
            ? [
                {
                  id: "tab-meja",
                  tab: "meja",
                  name: "Barcode Meja QR",
                  icon: QrCode,
                },
              ]
            : []),
          {
            id: "tab-laporan",
            tab: "laporan",
            name: "Kebenaran Laba (P&L)",
            icon: FileBarChart2,
          },
          {
            id: "tab-suplierhub",
            tab: "suplierhub",
            name: "Pengadaan Bahan (B2B PO)",
            icon: ShoppingCart,
          },
          {
            id: "tab-migrasi",
            tab: "migrasi",
            name: "Pusat Migrasi POS",
            icon: Network,
          },
          {
            id: "tab-intelligence",
            tab: "intelligence",
            name: "Market Intelligence",
            icon: Network,
          },
          {
            id: "tab-auditor",
            tab: "auditor",
            name: "Business Auditor",
            icon: FileBarChart2,
          },
          {
            id: "tab-paket",
            tab: "paket",
            name: "Langganan & Lisensi",
            icon: Package,
          },
          {
            id: "tab-pengaturan",
            tab: "pengaturan",
            name: "Profil & Toko",
            icon: Building2,
          },
        ];

  const serverUser = currentStore?.user;
  const verifiedRole = (serverUser?.role || currentStore?.cashierRole || "OWNER").toUpperCase();
  const activeOutletName = currentStore?.activeOutlet?.name || "Outlet Utama";

  const allMenuItems = menuItems;

  const filteredMenu = allMenuItems.filter(({ tab }) => {
    if (verifiedRole === "KASIR") {
      return ["kasir", "meja"].includes(tab as string);
    }
    if (verifiedRole === "BARISTA") {
      return ["kasir", "stok"].includes(tab as string);
    }
    return true;
  });

  return (
    <div
      className={`min-h-screen ${theme.appBg} font-sans flex flex-col md:flex-row`}
      id="app-container"
    >
      <aside
        className={`hidden md:flex w-20 lg:w-64 shrink-0 ${theme.asideBg} text-slate-300 flex-col border-r ${theme.border}`}
        id="sidebar"
      >
        <div
          className={`p-4 lg:p-5 flex flex-col items-center text-center gap-2 border-b ${theme.border} bg-slate-950/30 relative overflow-hidden group`}
        >
          <div className="flex items-center gap-2.5 w-full justify-center lg:justify-start">
            <div className="relative w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-950/40 border border-amber-300/30 shrink-0">
              <span className="text-slate-950 font-black text-xl">L</span>
            </div>

            <div className="min-w-0 text-left hidden lg:block">
              <h1 className="text-sm font-black tracking-tight text-white leading-tight">
                LedgerLine
              </h1>
              <p className="text-[10px] text-amber-400 font-medium leading-none">
                by Aslam · Coffee OS
              </p>
            </div>
          </div>

          <div className="w-full hidden lg:block mt-1 pt-2 border-t border-white/5 text-left">
            <div className="text-[11px] font-bold text-slate-200 truncate">
              {currentStore?.name || currentStore?.storeName || appConfig?.storeName || "LedgerLine Roastery"}
            </div>
            <div className="text-[10px] font-mono text-amber-300 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeOutletName}</span>
            </div>
          </div>
        </div>

        <div className="p-3 lg:p-4 flex-1 space-y-1.5 overflow-y-auto flex flex-col items-center lg:items-stretch">
          {demoTimeRemaining && (
            <div className="w-full p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1 shadow-inner relative z-20">
              <p className="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest leading-none">
                SESI AKTIF
              </p>
              <p className="text-[12px] text-white font-mono font-black leading-none">
                {demoTimeRemaining}
              </p>
            </div>
          )}

          <p className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-sans text-center lg:text-left truncate w-full">
            MODUL OPERASIONAL
          </p>

          {filteredMenu.map(({ id, tab, name, icon: Icon }) => (
            <button
              key={tab}
              id={id}
              onClick={() => setActiveTab(tab)}
              className={`w-full px-2 lg:px-3 py-2.5 rounded-xl justify-center lg:justify-start text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
              title={name}
            >
              <Icon size={16} className={`shrink-0`} />
              <span className="hidden lg:inline truncate">{name}</span>
            </button>
          ))}
        </div>

        {/* User Profile & Logout Box */}
        <div className={`p-3 border-t ${theme.border} bg-slate-950/20`}>
          <div className="hidden lg:flex items-center gap-2.5 mb-2 px-1">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-amber-400">
              {serverUser?.fullName?.charAt(0) || verifiedRole.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-200 truncate">
                {serverUser?.fullName || "Pengguna"}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {serverUser?.email || verifiedRole}
              </div>
            </div>
          </div>

          <button
            id="logout-store-session-btn"
            onClick={handleLogoutStore}
            className="w-full px-2 lg:px-3 py-2 rounded-xl justify-center lg:justify-start text-xs font-bold font-sans flex items-center gap-2.5 transition-colors text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 border border-transparent cursor-pointer"
            title="Keluar Sesi Toko"
          >
            <LogOut size={15} className="shrink-0" />
            <span className="hidden lg:inline truncate">Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 ${theme.asideBg} border-t ${theme.border} p-2 flex justify-around items-center z-40 pb-safe`}
      >
        {filteredMenu.slice(0, 5).map(({ tab, name, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
              activeTab === tab ? "text-amber-400 font-bold" : "text-slate-400"
            }`}
          >
            <Icon size={18} />
            <span className="text-[9px] font-bold">{name.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 flex flex-col relative h-screen overflow-hidden pb-[60px] md:pb-0">
        {/* TOP OPERATIONAL BAR */}
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-30">
          {/* Brand & Engines Pipeline */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 text-xs tracking-tight">
                  LedgerLine by Aslam
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  Ledger-first Coffee & Resto OS
                </span>
              </div>
            </div>

            {/* Three Engines Pipeline Status */}
            <div className="hidden xl:flex items-center gap-1 text-[10px] font-mono font-semibold">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                1. Transaction Engine
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                2. Event-Ledger
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                3. Profit Engine
              </span>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            {/* AI Boundaries Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>AI-Assisted · Ledger-Controlled</span>
            </div>

            {/* Server-Verified Role & Authority Button */}
            <button
              onClick={() => setShowAuthorityModal(true)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                verifiedRole === "KASIR"
                  ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                  : verifiedRole === "SUPER_ADMIN"
                  ? "bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100"
                  : verifiedRole === "OWNER"
                  ? "bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100"
                  : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
              }`}
              title="Lihat Matriks Otoritas Persetujuan & Batas Nominal Sesuai PRD V1"
            >
              <Scale size={13} className="shrink-0" />
              <span>
                Peran: {verifiedRole} {verifiedRole === "KASIR" ? "(Zero Cost)" : ""}
              </span>
            </button>

            {/* Deterministic Closing Button */}
            <button
              onClick={() => setShowClosingModal(true)}
              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Lock size={12} className="text-amber-400" />
              <span>Tutup Kasir / Closing</span>
            </button>
          </div>
        </header>

        {/* Content View Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>

        {/* MODALS */}
        <DeterministicClosingModal
          isOpen={showClosingModal}
          onClose={() => setShowClosingModal(false)}
        />
        <AuthorityMatrixModal
          isOpen={showAuthorityModal}
          onClose={() => setShowAuthorityModal(false)}
        />

        {/* GLOBAL TOAST CONTAINER */}
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {useUiStore((s) => s.toasts).map((t) => (
            <div
              key={t.id}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in pointer-events-auto"
            >
              <CheckCircle className="text-emerald-400 shrink-0" size={16} />
              <span className="text-xs font-bold font-sans">{t.message}</span>
              <button
                onClick={() => useUiStore.getState().removeToast(t.id)}
                className="ml-2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
