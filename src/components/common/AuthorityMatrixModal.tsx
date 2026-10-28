import React, { useState } from "react";
import {
  ShieldCheck,
  UserCheck,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  KeyRound,
} from "lucide-react";
import { useDataStore } from "../../store/dataStore";
import { AuthorityRule } from "../../types";

const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AUTHORITY_RULES: Record<string, AuthorityRule> = {
  Kasir: {
    role: "Kasir",
    title: "Kasir Garis Depan (POS Operator)",
    maxPoApprovalAmount: 0,
    canVoidTransactions: false,
    canConfirmStockOpname: false,
    canExecuteClosing: false,
    canViewProfitTruth: false,
    canManageMasterData: false,
    description: "Fokus pada input transaksi kasir, pembayaran, dan pencocokan laci kas saat pergantian shift.",
  },
  Barista: {
    role: "Barista",
    title: "Barista & Gudang Operasional",
    maxPoApprovalAmount: 0,
    canVoidTransactions: false,
    canConfirmStockOpname: false,
    canExecuteClosing: false,
    canViewProfitTruth: false,
    canManageMasterData: false,
    description: "Mencatat penerimaan barang (Receiving PO), input draft opname fisik, dan log waste tumpahan.",
  },
  Manager: {
    role: "Manager",
    title: "Manager Operasional Outlet",
    maxPoApprovalAmount: 500000,
    canVoidTransactions: true,
    canConfirmStockOpname: true,
    canExecuteClosing: false,
    canViewProfitTruth: true,
    canManageMasterData: false,
    description: "Otoritas approval PO & Belanja Harian < Rp 500.000, void transaksi kasir, dan audit stok fisik mingguan.",
  },
  Owner: {
    role: "Owner",
    title: "Pemilik Bisnis (Business Owner)",
    maxPoApprovalAmount: 999999999,
    canVoidTransactions: true,
    canConfirmStockOpname: true,
    canExecuteClosing: true,
    canViewProfitTruth: true,
    canManageMasterData: true,
    description: "Otoritas absolut. Approval PO besar (> Rp 2.000.000), penyegelan penutupan buku (Closing), P&L, dan master data.",
  },
};

export default function AuthorityMatrixModal({ isOpen, onClose }: Props) {
  const { activeRole, setActiveRole } = useDataStore();
  const [testPin, setTestPin] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Keyboard shortcut listener: close modal with Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPin || testPin.length < 4) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const idempotencyKey = `matrix-pin-test-${Date.now()}`;
      const res = await fetch("/api/pos/manager-override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        credentials: "include",
        body: JSON.stringify({
          actionType: "PRICE_OVERRIDE",
          entityId: "test-auth-matrix",
          reason: "Verifikasi Otoritas PIN Matriks",
          managerPin: testPin,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `✅ Otorisasi Berhasil disetujui oleh ${data.data?.authorizedBy || "Manager/Owner"}!`,
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ ${data.message || "Otorisasi PIN ditolak"}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `❌ Gagal menghubungi server: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold tracking-wider text-indigo-600 uppercase">
                RBAC & Approval Authority Matrix
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500">Nominal-Based Governance</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Matriks Otoritas Persetujuan & Batas Nominal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Akses tidak hanya berbasis peran, tetapi dibatasi oleh ambang batas nominal rupiah dan
              hak eksekusi event akuntansi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Current Active Persona Switcher */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Pilih Peran Aktif Anda (Simulasi Persona Lapangan):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["Kasir", "Barista", "Manager", "Owner"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeRole === role
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-xs font-bold">{role}</div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    activeRole === role ? "text-amber-400 font-medium" : "text-slate-400"
                  }`}
                >
                  {role === "Owner"
                    ? "Otoritas Penuh"
                    : role === "Manager"
                      ? "Limit < 500rb"
                      : role === "Barista"
                        ? "Gudang & Bar"
                        : "POS Frontline"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Matrix Comparison Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Peran / Role</th>
                <th className="px-4 py-3">Batas Approval P.O</th>
                <th className="px-4 py-3 text-center">Void Struk</th>
                <th className="px-4 py-3 text-center">Konfirmasi Opname</th>
                <th className="px-4 py-3 text-center">Tutup Buku (Closing)</th>
                <th className="px-4 py-3 text-center">Lihat Kebenaran Laba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.values(AUTHORITY_RULES).map((rule) => {
                const isActive = activeRole === rule.role;
                return (
                  <tr
                    key={rule.role}
                    className={`transition-colors ${
                      isActive ? "bg-amber-50/60 font-medium" : "hover:bg-slate-50/50"
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {rule.role}
                        {isActive && (
                          <span className="text-[9px] font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 max-w-xs">{rule.description}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                      {rule.maxPoApprovalAmount === 0
                        ? "Rp 0 (Perlu Izin)"
                        : rule.maxPoApprovalAmount > 100000000
                          ? "Tanpa Batas (Owner)"
                          : `< ${formatRupiah(rule.maxPoApprovalAmount)}`}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {rule.canVoidTransactions ? (
                        <CheckCircle2 size={16} className="text-emerald-600 inline" />
                      ) : (
                        <XCircle size={16} className="text-slate-300 inline" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {rule.canConfirmStockOpname ? (
                        <CheckCircle2 size={16} className="text-emerald-600 inline" />
                      ) : (
                        <XCircle size={16} className="text-slate-300 inline" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {rule.canExecuteClosing ? (
                        <CheckCircle2 size={16} className="text-emerald-600 inline" />
                      ) : (
                        <XCircle size={16} className="text-slate-300 inline" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {rule.canViewProfitTruth ? (
                        <CheckCircle2 size={16} className="text-emerald-600 inline" />
                      ) : (
                        <XCircle size={16} className="text-slate-300 inline" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Manager Override PIN Live Verification Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="text-amber-600" size={16} />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Uji Coba Lapangan: Verifikasi PIN Manager Override (§2.4)
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Otorisasi transaksi void, diskon khusus, atau pembukaan laci kas darurat langsung diverifikasi
            ke backend engine dengan perlindungan lockout 15 menit jika 3x berturut-turut salah.
          </p>
          <form onSubmit={handleVerifyPin} className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              maxLength={6}
              value={testPin}
              onChange={(e) => setTestPin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Masukkan 6-digit PIN"
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono tracking-widest outline-none focus:border-amber-500 w-44"
            />
            <button
              type="submit"
              disabled={isTesting || testPin.length < 4}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
            >
              {isTesting ? "Memverifikasi..." : "Validasi PIN"}
            </button>
            {testResult && (
              <span className={`text-xs font-semibold ${testResult.success ? "text-emerald-600" : "text-rose-600"}`}>
                {testResult.message}
              </span>
            )}
          </form>
        </div>

        {/* AI Invariant Boundary Note */}
        <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex items-start gap-2.5">
          <ShieldCheck className="text-amber-400 shrink-0 mt-0.5" size={16} />
          <div className="text-slate-300">
            <strong className="text-white">AI Boundaries Enforced:</strong> AI dalam LedgerLine
            dibatasi pada lapisan intelijen analitis (membaca, mendeteksi anomali, memberikan saran
            resep). AI Dilarang memposting jurnal, mengubah inventaris, atau melakukan closing secara
            sepihak.
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
