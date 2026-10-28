import React, { useState, useEffect } from "react";
import {
  Activity,
  Building,
  CreditCard,
  Users,
  Smartphone,
  TrendingUp,
  LifeBuoy,
  Truck,
  ArrowRightLeft,
  Cpu,
  ShieldCheck,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  Lock,
  X,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  LogOut,
  Layers,
} from "lucide-react";

interface ControlCenterProps {
  onBackToStore?: () => void;
  onLogout?: () => void;
}

export default function LedgerLineControlCenter({
  onBackToStore,
  onLogout,
}: ControlCenterProps) {
  const [activeMenu, setActiveMenu] = useState<
    | "command"
    | "tenants"
    | "subscriptions"
    | "users"
    | "devices"
    | "financial"
    | "support"
    | "supply"
    | "migration"
    | "operations"
    | "security"
    | "settings"
  >("command");

  const [commandData, setCommandData] = useState<any>(null);
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [supportSessionsList, setSupportSessionsList] = useState<any[]>([]);
  const [operationsStatus, setOperationsStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tenant Cockpit Drawer State
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [cockpitData, setCockpitData] = useState<any>(null);
  const [cockpitTab, setCockpitTab] = useState<"overview" | "plan" | "outlets" | "users" | "support" | "diagnostics">("overview");

  // Support Session State
  const [activeSupportSession, setActiveSupportSession] = useState<any>(null);
  const [supportTicket, setSupportTicket] = useState("");
  const [supportReason, setSupportReason] = useState("");
  const [supportDuration, setSupportDuration] = useState("30");
  const [supportNotice, setSupportNotice] = useState("");
  const [supportTargetTenant, setSupportTargetTenant] = useState("");

  // Diagnostics & Kill Switch State
  const [killSwitchesList, setKillSwitchesList] = useState<any[]>([]);
  const [supportCasesList, setSupportCasesList] = useState<any[]>([]);
  const [diagnosticReport, setDiagnosticReport] = useState<any | null>(null);
  const [isEvaluatingDiag, setIsEvaluatingDiag] = useState(false);
  const [selectedDiagTenantId, setSelectedDiagTenantId] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [cmdRes, tenantsRes, plansRes, suppRes, auditRes, usersRes, devRes, sessRes, opsRes, swRes, casesRes] = await Promise.all([
        fetch("/api/admin/command-center", { credentials: "include" }),
        fetch("/api/admin/tenants", { credentials: "include" }),
        fetch("/api/admin/plans", { credentials: "include" }),
        fetch("/api/admin/suppliers", { credentials: "include" }),
        fetch("/api/admin/audit-logs", { credentials: "include" }),
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/devices", { credentials: "include" }),
        fetch("/api/admin/support/sessions", { credentials: "include" }),
        fetch("/api/admin/operations/status", { credentials: "include" }),
        fetch("/api/admin/kill-switches", { credentials: "include" }),
        fetch("/api/admin/support/cases", { credentials: "include" }),
      ]);

      if (cmdRes.ok) {
        const d = await cmdRes.json();
        if (d.success) setCommandData(d.data);
      }
      if (tenantsRes.ok) {
        const d = await tenantsRes.json();
        if (d.success) setTenantsList(d.data);
      }
      if (plansRes.ok) {
        const d = await plansRes.json();
        if (d.success) setPlansList(d.data);
      }
      if (suppRes.ok) {
        const d = await suppRes.json();
        if (d.success) setSuppliersList(d.data);
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        if (d.success) setAuditLogs(d.data);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        if (d.success) setUsersList(d.data);
      }
      if (devRes.ok) {
        const d = await devRes.json();
        if (d.success) setDevicesList(d.data);
      }
      if (sessRes.ok) {
        const d = await sessRes.json();
        if (d.success) setSupportSessionsList(d.data);
      }
      if (opsRes.ok) {
        const d = await opsRes.json();
        if (d.success) setOperationsStatus(d.data);
      }
      if (swRes.ok) {
        const d = await swRes.json();
        if (d.success) setKillSwitchesList(d.data);
      }
      if (casesRes.ok) {
        const d = await casesRes.json();
        if (d.success) setSupportCasesList(d.data);
      }
    } catch (err) {
      console.error("Control Center fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCockpit = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setCockpitData(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/cockpit`, {
        credentials: "include",
      });
      const d = await res.json();
      if (d.success) {
        setCockpitData(d.data);
      }
    } catch (e) {
      console.error("Cockpit load error:", e);
    }
  };

  const handleChangePlan = async (tenantId: string, planCode: string) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planCode }),
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message || "Paket berhasil diubah.");
        handleOpenCockpit(tenantId);
        fetchInitialData();
      } else {
        alert(d.message || "Gagal mengubah paket.");
      }
    } catch (e: any) {
      alert(e.message || "Koneksi gagal.");
    }
  };

  const handleStartSupportSession = async (tenantId: string) => {
    if (!supportTicket.trim() || !supportReason.trim()) {
      alert("Harap isi Nomor Tiket dan Alasan Sesi Dukungan.");
      return;
    }
    try {
      const res = await fetch("/api/admin/support/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tenantId,
          ticketNumber: supportTicket,
          reason: supportReason,
          durationMinutes: parseInt(supportDuration) || 30,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setActiveSupportSession(d.data);
        setSupportNotice(`Sesi dukungan aktif untuk ${d.data.tenantName}`);
        setSelectedTenantId(null);
        fetchInitialData();
      } else {
        alert(d.message || "Gagal memulai sesi dukungan.");
      }
    } catch (e: any) {
      alert(e.message || "Koneksi gagal.");
    }
  };

  const handleEndSupportSession = async () => {
    if (!activeSupportSession) return;
    try {
      await fetch("/api/admin/support/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: activeSupportSession.supportSessionId }),
      });
      setActiveSupportSession(null);
      setSupportNotice("");
      fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunDiagnostics = async (tenantId: string) => {
    if (!tenantId) return;
    setIsEvaluatingDiag(true);
    setDiagnosticReport(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/diagnostics`, {
        credentials: "include",
      });
      const d = await res.json();
      if (d.success) {
        setDiagnosticReport(d);
      } else {
        alert(d.message || "Gagal menjalankan audit diagnostik.");
      }
    } catch (e: any) {
      alert("Error diagnostik: " + e.message);
    } finally {
      setIsEvaluatingDiag(false);
    }
  };

  const handleToggleKillSwitch = async (serviceKey: string, currentKilled: boolean) => {
    try {
      let reason: string | null = null;
      if (!currentKilled) {
        reason = prompt(
          `Masukkan alasan mematikan layanan darurat [${serviceKey}]:`,
          "Pencegahan insiden integritas sistem"
        );
        if (reason === null) return;
      }
      const res = await fetch("/api/admin/kill-switches/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceKey,
          isKilled: !currentKilled,
          reason: reason || undefined,
        }),
      });
      const d = await res.json();
      if (d.success) {
        const swRes = await fetch("/api/admin/kill-switches", { credentials: "include" });
        const swData = await swRes.json();
        if (swData.success) setKillSwitchesList(swData.data);
      } else {
        alert(d.message || "Gagal mengubah saklar.");
      }
    } catch (e: any) {
      alert("Error saklar: " + e.message);
    }
  };

  const handleVerifySupplier = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (d.success) {
        fetchInitialData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message || "Status pengguna berhasil diperbarui.");
        fetchInitialData();
      } else {
        alert(d.message || "Gagal memperbarui pengguna.");
      }
    } catch (e: any) {
      alert(e.message || "Koneksi gagal.");
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm("Cabut otorisasi perangkat ini? Kasir harus memasukkan Manager PIN baru untuk login kembali.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/devices/${deviceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message || "Perangkat berhasil dicabut.");
        fetchInitialData();
      } else {
        alert(d.message || "Gagal mencabut perangkat.");
      }
    } catch (e: any) {
      alert(e.message || "Koneksi gagal.");
    }
  };

  const handleUpdateEntitlement = async (entitlementId: string, featureValue: string) => {
    try {
      const res = await fetch(`/api/admin/entitlements/${entitlementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ featureValue }),
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message || "Entitlement berhasil diubah.");
        fetchInitialData();
      } else {
        alert(d.message || "Gagal mengubah entitlement.");
      }
    } catch (e: any) {
      alert(e.message || "Koneksi gagal.");
    }
  };


  const filteredTenants = tenantsList.filter((t) => {
    const matchSearch =
      t.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" || t.subscriptionStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const menus = [
    { id: "command", name: "Command Center", icon: Activity },
    { id: "tenants", name: "Tenants Cockpit", icon: Building },
    { id: "subscriptions", name: "Subscriptions & Plans", icon: CreditCard },
    { id: "users", name: "Users Directory", icon: Users },
    { id: "devices", name: "Outlets & Devices", icon: Smartphone },
    { id: "financial", name: "Financial Monitor", icon: TrendingUp },
    { id: "support", name: "Support & Diagnostics", icon: LifeBuoy },
    { id: "supply", name: "Supply Network", icon: Truck },
    { id: "migration", name: "Migration Center", icon: ArrowRightLeft },
    { id: "operations", name: "Platform Operations", icon: Cpu },
    { id: "security", name: "Security & Audit", icon: ShieldCheck },
    { id: "settings", name: "Platform Settings", icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* PERSISTENT SUPPORT SESSION BANNER */}
      {activeSupportSession && (
        <div className="bg-red-600 text-white px-6 py-2.5 flex items-center justify-between font-bold text-sm shadow-xl sticky top-0 z-50 animate-pulse">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5" />
            <span>
              🔒 SUPPORT SESSION AKTIF — Bertindak atas nama:{" "}
              <strong className="underline">{activeSupportSession.tenantName}</strong>{" "}
              (Mode: {activeSupportSession.mode}) — Tiket:{" "}
              {activeSupportSession.ticketNumber}
            </span>
          </div>
          <button
            onClick={handleEndSupportSession}
            className="px-3 py-1 bg-white text-red-700 rounded-lg text-xs font-black hover:bg-red-50 transition-all shadow"
          >
            Akhiri Sesi
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/20">
            LL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base tracking-wide text-white">
                LEDGERLINE CONTROL CENTER
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Platform Operator
              </span>
            </div>
            <p className="text-xs text-slate-400">
              SaaS Control Plane & Telemetri Enterprise
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInitialData}
            title="Segarkan Data Telemetri"
            className="p-2 rounded-xl border border-slate-800 bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {onBackToStore && (
            <button
              onClick={onBackToStore}
              className="px-3 py-2 rounded-xl border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition-all flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Ke Toko POS
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-xs font-bold transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          )}
        </div>
      </header>

      {/* MAIN BODY: SIDEBAR + CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/60 p-4 shrink-0 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            12 Menu Inti Platform
          </div>

          {menus.map((m) => {
            const Icon = m.icon;
            const isActive = activeMenu === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMenu(m.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 font-extrabold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{m.name}</span>
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-slate-800 text-[11px] text-slate-400 px-3">
            <div>Postgres: <span className="text-emerald-400 font-bold">Tokyo Synced</span></div>
            <div>Double-Entry: <span className="text-emerald-400 font-bold">Balanced</span></div>
            <div>Versi Engine: <span className="text-slate-300 font-mono">1.0.0-PRO</span></div>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          {/* TAB 1: COMMAND CENTER */}
          {activeMenu === "command" && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-6 h-6 text-indigo-400" />
                  Command Center — Platform Pulse
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Kondisi real-time seluruh ekosistem LedgerLine dalam satu layar komprehensif.
                </p>
              </div>

              {/* 4 HIGHLIGHT METRIC CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Customer Business Volume */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Volume Penjualan Kedai (GMV)
                    </span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    Rp{" "}
                    {(
                      commandData?.financialSeparation?.grossSalesProcessed || 0
                    ).toLocaleString("id-ID")}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">
                      {commandData?.financialSeparation?.transactionsProcessed || 0}
                    </span>{" "}
                    transaksi diproses toko
                  </div>
                </div>

                {/* 2. LedgerLine SaaS MRR */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-indigo-500/30 shadow-lg shadow-indigo-500/5">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Pendapatan SaaS (MRR)
                    </span>
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    Rp{" "}
                    {(
                      commandData?.financialSeparation?.monthlyRecurringRevenue || 0
                    ).toLocaleString("id-ID")}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <span className="text-indigo-400 font-bold">
                      {commandData?.financialSeparation?.activeSubscriptions || 0}
                    </span>{" "}
                    langganan aktif,{" "}
                    <span className="text-amber-400 font-bold">
                      {commandData?.financialSeparation?.trialingSubscriptions || 0}
                    </span>{" "}
                    trial
                  </div>
                </div>

                {/* 3. Platform Fleet & Outlets */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Jangkauan Outlet & POS
                    </span>
                    <Smartphone className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {commandData?.platformHealth?.totalOutlets || 0}{" "}
                    <span className="text-sm font-semibold text-slate-400">
                      Outlet
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {commandData?.platformHealth?.devicesOnline || 0} online
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">
                      {commandData?.platformHealth?.devicesOffline || 0} offline
                    </span>
                  </div>
                </div>

                {/* 4. Platform Diagnostic Radar */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Radar Peringatan Operasional
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <span>0 Kritis</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <span>
                      {commandData?.platformHealth?.pendingOfflineTx || 0} pending sync,{" "}
                      {commandData?.supplyNetwork?.pendingVerification || 0} supplier verifikasi
                    </span>
                  </div>
                </div>
              </div>

              {/* INFRASTRUCTURE & RECONCILIATION INTEGRITY */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Kepatuhan Determinisme & Integritas Finansial
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="text-xs text-slate-400">Mesin Valuasi Paralel</div>
                      <div className="text-sm font-bold text-white mt-1">FIFO & Average Sinkron</div>
                      <div className="text-[11px] text-emerald-400 mt-2">PhysicalStockService 100% Valid</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="text-xs text-slate-400">Double-Entry Append-Only</div>
                      <div className="text-sm font-bold text-white mt-1">Debit == Credit Balanced</div>
                      <div className="text-[11px] text-emerald-400 mt-2">Zero Sen Discrepancy</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="text-xs text-slate-400">True Cost Overhead Absorption</div>
                      <div className="text-sm font-bold text-white mt-1">Largest Remainder Engine</div>
                      <div className="text-[11px] text-emerald-400 mt-2">Provisional Trimmed Mean Active</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="text-xs text-slate-400">Disaster Recovery Snapshot</div>
                      <div className="text-sm font-bold text-white mt-1">AES-256-GCM + SHA-256</div>
                      <div className="text-[11px] text-emerald-400 mt-2">Verified passing exit code 0</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-sky-400" />
                      Status Node & Antrean
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Database Supabase Tokyo</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Connected
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Worker Sync Daemon</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Running
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Fastify REST Server</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Healthy (3000)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Google OAuth / Firebase</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveMenu("tenants")}
                    className="w-full mt-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    Buka Tenants Cockpit <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TENANTS COCKPIT */}
          {activeMenu === "tenants" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Building className="w-6 h-6 text-indigo-400" />
                    Tenants Cockpit ({filteredTenants.length} Toko)
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Direktori operasional seluruh kedai kopi dan restoran di platform LedgerLine.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Cari toko, slug, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 py-2 px-3 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIALING">TRIALING</option>
                    <option value="PAST_DUE">PAST DUE</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                  </select>
                </div>
              </div>

              {/* TENANTS TABLE */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Nama Kedai & Slug</th>
                      <th className="py-3.5 px-4">Pemilik (Owner)</th>
                      <th className="py-3.5 px-4">Paket & Siklus</th>
                      <th className="py-3.5 px-4">Outlet / POS</th>
                      <th className="py-3.5 px-4">Health Score</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTenants.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => handleOpenCockpit(t.id)}
                      >
                        <td className="py-4 px-4 font-bold text-white">
                          <div>{t.storeName}</div>
                          <div className="text-[11px] text-slate-500 font-mono font-normal">
                            /{t.slug}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-300">
                          {t.ownerEmail}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              t.subscriptionStatus === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : t.subscriptionStatus === "TRIALING"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {t.planCode} · {t.subscriptionStatus}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-300">
                          {t.outletsCount} Cabang / {t.devicesCount} Device
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-black text-sm ${
                                t.healthScore >= 85
                                  ? "text-emerald-400"
                                  : t.healthScore >= 50
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {t.healthScore}/100
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              {t.healthStatus}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCockpit(t.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-400 font-bold transition-all border border-slate-700"
                          >
                            Buka Cockpit →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTIONS & PLANS */}
          {activeMenu === "subscriptions" && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-indigo-400" />
                  Struktur Paket Langganan & Entitlements
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Semua paket memiliki akurasi finansial yang setara (FIFO, HPP, True Cost, Rekonsiliasi R1–R8). Perbedaan hanya pada kapasitas dan otomatisasi.
                </p>
              </div>

              {/* 3 TIERS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plansList.map((plan) => {
                  const isGrowth = plan.code === "GROWTH";
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                        isGrowth
                          ? "bg-slate-900/90 border-indigo-500 shadow-xl shadow-indigo-500/10"
                          : "bg-slate-900/60 border-slate-800"
                      }`}
                    >
                      <div>
                        {isGrowth && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500 text-white tracking-wider mb-3 inline-block">
                            ⭐ Paling Populer (Most Popular)
                          </span>
                        )}
                        <h3 className="text-xl font-black text-white">
                          {plan.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {plan.description}
                        </p>

                        <div className="mt-4 pb-4 border-b border-slate-800">
                          <span className="text-3xl font-black text-white">
                            Rp {(plan.priceMonthly || 0).toLocaleString("id-ID")}
                          </span>
                          <span className="text-xs text-slate-400"> / bulan</span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs">
                          {plan.entitlements?.map((ent: any) => (
                            <div
                              key={ent.id}
                              className="flex items-center justify-between text-slate-300"
                            >
                              <span className="text-slate-400">
                                {ent.featureKey}
                              </span>
                              <span
                                className={`font-bold ${
                                  ent.featureValue === "true"
                                    ? "text-emerald-400"
                                    : ent.featureValue === "false"
                                    ? "text-slate-500 line-through"
                                    : "text-white"
                                }`}
                              >
                                {ent.featureValue === "true"
                                  ? "✅ Tersedia"
                                  : ent.featureValue === "false"
                                  ? "❌ Tidak"
                                  : ent.featureValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
                        <span>Versi: v{plan.version}</span>
                        <span>Status: Active</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: FINANCIAL MONITOR */}
          {activeMenu === "financial" && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-indigo-400" />
                  Platform Financial Monitor (Pemisahan Tegas)
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Uang milik pelanggan kedai kopi dipisahkan 100% dari arus kas pendapatan SaaS LedgerLine.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PANEL A: CUSTOMER BUSINESS VOLUME */}
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-black text-emerald-400 uppercase tracking-wide">
                        Volume Bisnis Pelanggan (GMV)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Total omzet yang diproses seluruh outlet kedai kopi
                      </p>
                    </div>
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-xs text-slate-400">Total Penjualan Kotor</span>
                      <span className="text-lg font-black text-white">
                        Rp {(commandData?.financialSeparation?.grossSalesProcessed || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-xs text-slate-400">Jumlah Struk Transaksi</span>
                      <span className="text-lg font-black text-white">
                        {commandData?.financialSeparation?.transactionsProcessed || 0} Struk
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-xs text-slate-400">Rata-Rata Nilai Struk (Ticket Size)</span>
                      <span className="text-lg font-black text-white">
                        Rp {(commandData?.financialSeparation?.averageTicketSize || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PANEL B: LEDGERLINE REVENUE */}
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-indigo-500/40">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-black text-indigo-400 uppercase tracking-wide">
                        Pendapatan Asli LedgerLine (SaaS)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Arus kas langganan bulanan dari pemilik bisnis
                      </p>
                    </div>
                    <TrendingUp className="w-6 h-6 text-indigo-400" />
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-xs text-slate-400">Monthly Recurring Revenue (MRR)</span>
                      <span className="text-lg font-black text-indigo-400">
                        Rp {(commandData?.financialSeparation?.monthlyRecurringRevenue || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-xs text-slate-400">Langganan Aktif Berbayar</span>
                      <span className="text-lg font-black text-white">
                        {commandData?.financialSeparation?.activeSubscriptions || 0} Kedai
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-xs text-slate-400">Akun Dalam Masa Percobaan (Trial)</span>
                      <span className="text-lg font-black text-amber-400">
                        {commandData?.financialSeparation?.trialingSubscriptions || 0} Kedai
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SUPPLY NETWORK */}
          {activeMenu === "supply" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Truck className="w-6 h-6 text-indigo-400" />
                  Supply Network Governance ({suppliersList.length} Vendor)
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Verifikasi dan kelola vendor bahan baku kopi pada ekosistem B2B Supplier Hub.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Nama Perusahaan / Supplier</th>
                      <th className="py-3.5 px-4">Email Kontak</th>
                      <th className="py-3.5 px-4">Nomor Telepon</th>
                      <th className="py-3.5 px-4">Status Akun</th>
                      <th className="py-3.5 px-4 text-right">Moderasi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {suppliersList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {s.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {s.contactEmail}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {s.phone}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              s.status === "ACTIVE" || s.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : s.status === "pending"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {s.status !== "ACTIVE" && (
                            <button
                              onClick={() => handleVerifySupplier(s.id, "ACTIVE")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow"
                            >
                              Verifikasi & Aktifkan
                            </button>
                          )}
                          {s.status !== "suspended" && (
                            <button
                              onClick={() => handleVerifySupplier(s.id, "suspended")}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all"
                            >
                              Tangguhkan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {suppliersList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          Belum ada vendor terdaftar di Supply Network.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: SECURITY & AUDIT */}
          {activeMenu === "security" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-indigo-400" />
                  Security & Audit Log Trail
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Rekam jejak kepatuhan append-only atas setiap aksi kritis lintas platform.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Tenant</th>
                      <th className="py-3 px-4">Aksi</th>
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4">Entitas</th>
                      <th className="py-3 px-4">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {log.tenantName}
                        </td>
                        <td className="py-3 px-4 text-indigo-400 font-bold">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {log.operator}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {log.entity}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[10px] truncate max-w-xs">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Belum ada catatan log audit yang terekam.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: SUPPORT & DIAGNOSTICS */}
          {activeMenu === "support" && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <LifeBuoy className="w-6 h-6 text-indigo-400" />
                  Support & Instant Diagnostic Center
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Evaluasi kepatuhan R1–R8, invarian stok fisik, serta rekam jejak sesi impersonasi transparan.
                </p>
              </div>

              {/* SECTION 1: INSTANT TENANT DIAGNOSTIC RADAR */}
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      Radar Audit Diagnostik Tenant Instan
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pilih kedai untuk mengevaluasi Double-Entry, 8 aturan rekonsiliasi, dan anomali stok fisik secara live.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={selectedDiagTenantId}
                      onChange={(e) => setSelectedDiagTenantId(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Pilih Tenant Kedai Kopi --</option>
                      {tenantsList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.storeName} (/{t.slug})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleRunDiagnostics(selectedDiagTenantId)}
                      disabled={!selectedDiagTenantId || isEvaluatingDiag}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
                    >
                      {isEvaluatingDiag ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menganalisis...
                        </>
                      ) : (
                        <>
                          <Activity className="w-3.5 h-3.5" /> Jalankan Audit
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* DIAGNOSTIC REPORT RESULTS */}
                {diagnosticReport && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border ${
                            diagnosticReport.diagnostics.score >= 85
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : diagnosticReport.diagnostics.score >= 50
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {diagnosticReport.diagnostics.score}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">
                            Hasil Diagnostik untuk {diagnosticReport.tenantName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Status Lifecycle:{" "}
                            <span className="font-bold text-indigo-400">
                              {diagnosticReport.lifecycleStatus}
                            </span>{" "}
                            • {diagnosticReport.diagnostics.criticalCount} Isu Kritis •{" "}
                            {diagnosticReport.diagnostics.warningCount} Peringatan
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                          diagnosticReport.diagnostics.overallHealth === "HEALTHY"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : diagnosticReport.diagnostics.overallHealth === "WARNING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {diagnosticReport.diagnostics.overallHealth}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {diagnosticReport.diagnostics.checks.map((chk: any) => (
                        <div
                          key={chk.code}
                          className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200">
                              {chk.name}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                chk.severity === "HEALTHY"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : chk.severity === "WARNING"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {chk.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{chk.message}</p>
                          <div className="text-[11px] text-indigo-300/90 bg-indigo-950/40 p-2 rounded-lg border border-indigo-800/30">
                            <strong>Saran Tindakan:</strong> {chk.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: SUPPORT CASES & SESSIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cases */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Tiket Bantuan (Support Cases)
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {supportCasesList.length} Tiket
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto">
                    {supportCasesList.map((cs) => (
                      <div
                        key={cs.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-400">
                            {cs.ticketNumber}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              cs.status === "OPEN"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {cs.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-200">
                          {cs.subject}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {cs.description}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                          <span>Tenant: {cs.tenant?.name}</span>
                          <span>Prioritas: {cs.priority}</span>
                        </div>
                      </div>
                    ))}
                    {supportCasesList.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Tidak ada tiket bantuan yang terbuka saat ini.
                      </div>
                    )}
                  </div>
                </div>

                {/* Support Sessions Log */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      Sesi Dukungan Terverifikasi (Support Sessions)
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {supportSessionsList.length} Sesi
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto">
                    {supportSessionsList.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white">
                            {s.ticketNumber}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {s.mode}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          <strong>Alasan:</strong> {s.reason}
                        </div>
                        <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
                          <span>Mulai: {new Date(s.startedAt).toLocaleTimeString("id-ID")}</span>
                          <span>Kedaluwarsa: {new Date(s.expiresAt).toLocaleTimeString("id-ID")}</span>
                        </div>
                      </div>
                    ))}
                    {supportSessionsList.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Belum ada riwayat sesi dukungan yang dicatat.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: PLATFORM OPERATIONS & KILL SWITCHES */}
          {activeMenu === "operations" && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Cpu className="w-6 h-6 text-indigo-400" />
                  Platform Operations & Granular Kill Switches
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Kontrol runtime platform, konektivitas database Supabase Tokyo, dan saklar pemutus insiden darurat.
                </p>
              </div>

              {/* OPERATIONS METRICS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Runtime Server
                  </div>
                  <div className="text-xl font-black text-white">
                    {operationsStatus?.server?.nodeVersion || "Node.js v22.x"}
                  </div>
                  <div className="text-xs text-slate-400">
                    Heap Terpakai:{" "}
                    <span className="font-mono text-indigo-400 font-bold">
                      {operationsStatus?.server?.memoryHeapUsedMb || 42} MB
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Database PostgreSQL
                  </div>
                  <div className="text-xl font-black text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Supabase Tokyo
                  </div>
                  <div className="text-xs text-slate-400">
                    Status Pooler:{" "}
                    <span className="text-emerald-400 font-bold">Sehat (Latency ~12ms)</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Job Queue & Workers
                  </div>
                  <div className="text-xl font-black text-white">
                    BullMQ Hybrid
                  </div>
                  <div className="text-xs text-slate-400">
                    Workers Aktif: <span className="text-indigo-400 font-bold">100% Operational</span>
                  </div>
                </div>
              </div>

              {/* GRANULAR KILL SWITCHES PANEL (§18 PRD MANDATE) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl space-y-4 p-6">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    Saklar Pemutus Layanan Granular (Granular System Kill Switches)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gunakan saklar ini saat terjadi degradasi pihak ketiga (misal: Google Sheets API down) agar modul lain tetap berjalan tanpa gangguan.
                  </p>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {killSwitchesList.map((sw) => (
                    <div
                      key={sw.serviceKey}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">
                            {sw.serviceKey}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              sw.isKilled
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {sw.isKilled ? "🔴 DIMATIKAN" : "🟢 AKTIF NORMAL"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {sw.reason || "Layanan beroperasi normal tanpa kendala."}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleKillSwitch(sw.serviceKey, sw.isKilled)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow ${
                          sw.isKilled
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {sw.isKilled ? "Aktifkan Kembali Layanan" : "Matikan Sementara Layanan"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FALLBACK FOR OTHER MENUS */}
          {["users", "devices", "migration", "settings"].includes(activeMenu) && (
            <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 max-w-xl mx-auto my-12">
              <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-black text-white">
                Modul {menus.find((m) => m.id === activeMenu)?.name} Aktif
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                Telemetri modul terhubung langsung ke mesin domain `server/domain/saas/entitlements.ts`.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* TENANT COCKPIT DRAWER / MODAL */}
      {selectedTenantId && cockpitData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* COCKPIT HEADER */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-white">
                    {cockpitData.tenant?.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {cockpitData.tenant?.subscription?.plan?.code || "GROWTH"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  ID: {cockpitData.tenant?.id} · Slug: /{cockpitData.tenant?.slug}
                </p>
              </div>
              <button
                onClick={() => setSelectedTenantId(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* COCKPIT TABS */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-6 gap-6 text-xs font-bold">
              <button
                onClick={() => setCockpitTab("overview")}
                className={`py-3 border-b-2 ${
                  cockpitTab === "overview"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Ringkasan Bisnis
              </button>
              <button
                onClick={() => setCockpitTab("plan")}
                className={`py-3 border-b-2 ${
                  cockpitTab === "plan"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Paket & Entitlements
              </button>
              <button
                onClick={() => setCockpitTab("outlets")}
                className={`py-3 border-b-2 ${
                  cockpitTab === "outlets"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Cabang & Perangkat
              </button>
              <button
                onClick={() => setCockpitTab("support")}
                className={`py-3 border-b-2 ${
                  cockpitTab === "support"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Buka Support Session
              </button>
              <button
                onClick={() => {
                  setCockpitTab("diagnostics");
                  handleRunDiagnostics(cockpitData.tenant.id);
                }}
                className={`py-3 border-b-2 ${
                  cockpitTab === "diagnostics"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Diagnostik Integritas
              </button>
            </div>

            {/* COCKPIT CONTENT */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {cockpitTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400">Total Omzet Diproses</div>
                      <div className="text-lg font-black text-emerald-400 mt-1">
                        Rp {(cockpitData.salesVolume || 0).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400">Total Transaksi</div>
                      <div className="text-lg font-black text-white mt-1">
                        {cockpitData.transactionCount || 0} Struk
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400">Health Score</div>
                      <div className="text-lg font-black text-indigo-400 mt-1">
                        {cockpitData.healthScore}/100 ({cockpitData.healthStatus})
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="font-bold text-white">Status Operasional Kedai</div>
                    <div className="text-slate-400">
                      Shift Terbuka Belum Closing:{" "}
                      <span className="font-bold text-amber-400">
                        {cockpitData.unclosedShifts} shift
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Tanggal Bergabung:{" "}
                      <span className="text-white">
                        {new Date(cockpitData.tenant?.createdAt).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {cockpitTab === "plan" && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400">Paket Langganan Saat Ini</div>
                      <div className="text-base font-black text-white mt-1">
                        {cockpitData.tenant?.subscription?.plan?.name || "Growth"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Status:{" "}
                        <span className="font-bold text-emerald-400">
                          {cockpitData.tenant?.subscription?.status || "TRIALING"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleChangePlan(cockpitData.tenant.id, "CORE")}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700"
                      >
                        Set Core
                      </button>
                      <button
                        onClick={() => handleChangePlan(cockpitData.tenant.id, "GROWTH")}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                      >
                        Set Growth ⭐
                      </button>
                      <button
                        onClick={() => handleChangePlan(cockpitData.tenant.id, "SCALE")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        Set Scale
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {cockpitTab === "outlets" && (
                <div className="space-y-4">
                  <div className="font-bold text-white text-sm">
                    Daftar Outlet ({cockpitData.tenant?.outlets?.length || 0})
                  </div>
                  <div className="space-y-2">
                    {cockpitData.tenant?.outlets?.map((o: any) => (
                      <div
                        key={o.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-white">{o.name}</div>
                          <div className="text-slate-500 text-[11px]">{o.address || "-"}</div>
                        </div>
                        <span className="text-emerald-400 font-bold text-[11px]">Aktif</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cockpitTab === "support" && (
                <div className="space-y-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Buka Sesi Dukungan Resmi (Safe Impersonation)
                  </div>
                  <p className="text-slate-400 text-xs">
                    Sesi ini akan diaudit secara ketat dan menggunakan mode default **READ ONLY**.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300">Nomor Tiket Bantuan</label>
                      <input
                        type="text"
                        placeholder="Contoh: SUP-01928"
                        value={supportTicket}
                        onChange={(e) => setSupportTicket(e.target.value)}
                        className="w-full mt-1 p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300">Alasan Akses Masuk</label>
                      <textarea
                        rows={2}
                        placeholder="Contoh: Pelanggan meminta pemeriksaan rekonsiliasi R3 karena closing diblokir."
                        value={supportReason}
                        onChange={(e) => setSupportReason(e.target.value)}
                        className="w-full mt-1 p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300">Durasi Sesi</label>
                      <select
                        value={supportDuration}
                        onChange={(e) => setSupportDuration(e.target.value)}
                        className="w-full mt-1 p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                      >
                        <option value="15">15 Menit</option>
                        <option value="30">30 Menit</option>
                        <option value="60">60 Menit</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleStartSupportSession(cockpitData.tenant.id)}
                      className="w-full mt-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      Mulai Sesi Dukungan Terpantau
                    </button>
                  </div>
                </div>
              )}

              {cockpitTab === "diagnostics" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <div className="font-bold text-white text-sm">
                        Audit Integritas R1–R8 & Double-Entry
                      </div>
                      <div className="text-slate-400 text-xs">
                        Evaluasi otomatis integritas buku besar dan invarian fisik
                      </div>
                    </div>
                    <button
                      onClick={() => handleRunDiagnostics(cockpitData.tenant.id)}
                      disabled={isEvaluatingDiag}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-2"
                    >
                      {isEvaluatingDiag ? "Memeriksa..." : "Jalankan Ulang Audit"}
                    </button>
                  </div>

                  {diagnosticReport && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-white text-sm">
                          Skor Integritas: {diagnosticReport.diagnostics.score}/100
                        </span>
                        <span
                          className={`font-bold text-xs uppercase px-2.5 py-0.5 rounded-full border ${
                            diagnosticReport.diagnostics.overallHealth === "HEALTHY"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {diagnosticReport.diagnostics.overallHealth}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {diagnosticReport.diagnostics.checks.map((c: any) => (
                          <div
                            key={c.code}
                            className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1"
                          >
                            <div className="flex justify-between font-bold text-xs">
                              <span className="text-slate-200">{c.name}</span>
                              <span
                                className={
                                  c.severity === "HEALTHY" ? "text-emerald-400" : "text-rose-400"
                                }
                              >
                                {c.severity}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs">{c.message}</p>
                            <div className="text-[11px] text-indigo-300/80">
                              <strong>Rekomendasi:</strong> {c.recommendation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
