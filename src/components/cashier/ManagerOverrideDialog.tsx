import React, { useState, useEffect } from "react";
import { ShieldAlert, KeyRound, AlertTriangle, X, CheckCircle2, Lock } from "lucide-react";

export type OverrideActionType =
  | "VOID"
  | "REFUND"
  | "DISCOUNT_OVERRIDE"
  | "OPEN_DRAWER"
  | "PRICE_OVERRIDE";

interface ManagerOverrideDialogProps {
  isOpen: boolean;
  actionType: OverrideActionType;
  entityId: string;
  actionDescription: string;
  defaultReason?: string;
  onSuccess: (result: { authorizedBy: string; overrideToken: string }) => void;
  onCancel: () => void;
}

const ACTION_TITLES: Record<OverrideActionType, string> = {
  VOID: "Otorisasi Pembatalan Transaksi (Void)",
  REFUND: "Otorisasi Pengembalian Dana (Refund)",
  DISCOUNT_OVERRIDE: "Otorisasi Diskon Khusus (>10%)",
  OPEN_DRAWER: "Otorisasi Buka Laci Kasir (No-Sale)",
  PRICE_OVERRIDE: "Otorisasi Perubahan Harga Khusus",
};

const COMMON_REASONS: Record<OverrideActionType, string[]> = {
  VOID: [
    "Salah input pesanan pelanggan",
    "Pelanggan membatalkan pesanan sebelum dibuat",
    "Kendala teknis / double order",
    "Metode pembayaran salah dipilih",
  ],
  REFUND: [
    "Kualitas produk tidak sesuai standar",
    "Produk habis / tidak dapat disajikan",
    "Permintaan pelanggan atas persetujuan manajer",
  ],
  DISCOUNT_OVERRIDE: [
    "Diskon VIP / Mitra Kedai",
    "Kompensasi komplain pesanan",
    "Promo bundling offline khusus",
    "Diskon staf internal kedai",
  ],
  OPEN_DRAWER: [
    "Penukaran uang kembalian",
    "Pemeriksaan fisik laci kasir",
    "Setoran tunai parsial ke brankas",
  ],
  PRICE_OVERRIDE: [
    "Penyesuaian porsi khusus",
    "Harga promosi seasonal luar sistem",
  ],
};

export const ManagerOverrideDialog: React.FC<ManagerOverrideDialogProps> = ({
  isOpen,
  actionType,
  entityId,
  actionDescription,
  defaultReason = "",
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState(defaultReason);
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setReason(defaultReason || COMMON_REASONS[actionType]?.[0] || "");
      setCustomReason("");
      setErrorMessage(null);
    }
  }, [isOpen, actionType, defaultReason]);

  // Countdown timer if device lockout is active
  useEffect(() => {
    if (lockoutRemaining === null || lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  if (!isOpen) return null;

  const handlePinDigit = (digit: string) => {
    if (lockoutRemaining) return;
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
      setErrorMessage(null);
    }
  };

  const handleBackspace = () => {
    if (lockoutRemaining) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    if (lockoutRemaining) return;
    setPin("");
    setErrorMessage(null);
  };

  const effectiveReason = reason === "Lainnya" ? customReason : reason;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (lockoutRemaining) return;

    if (!pin || pin.length < 4) {
      setErrorMessage("PIN Manager minimal 4 digit.");
      return;
    }

    if (!effectiveReason || effectiveReason.trim().length < 3) {
      setErrorMessage("Alasan override wajib diisi minimal 3 karakter.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `mgr-override-${entityId}-${Date.now()}`;
      const response = await fetch("/api/pos/manager-override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          actionType,
          entityId,
          reason: effectiveReason,
          managerPin: pin,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 403 && data.message?.includes("terkunci")) {
          setLockoutRemaining(15 * 60); // 15 mins
        }
        throw new Error(data.message || "Otorisasi ditolak.");
      }

      // Success
      onSuccess({
        authorizedBy: data.data.authorizedBy,
        overrideToken: data.data.overrideToken,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memverifikasi PIN Manager.");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Otorisasi Manajer
              </h2>
              <p className="text-xs text-amber-400 font-medium">Satu Aksi — Audit Log Tercatat</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target Action Alert */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <p className="text-xs font-medium text-slate-400">{ACTION_TITLES[actionType]}</p>
            <p className="text-sm font-semibold text-white">{actionDescription}</p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Alasan Otorisasi</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              {COMMON_REASONS[actionType]?.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="Lainnya">Alasan Lainnya...</option>
            </select>

            {reason === "Lainnya" && (
              <input
                type="text"
                placeholder="Tuliskan alasan spesifik..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* PIN Input & Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">PIN Manajer / Owner</label>
              <span className="text-[10px] text-slate-500">Maksimal 5 percobaan / 15 mnt</span>
            </div>

            {/* Display Circles */}
            <div className="flex items-center justify-center gap-2 py-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    idx < pin.length
                      ? "bg-amber-400 shadow-sm shadow-amber-400/50 scale-110"
                      : "bg-slate-800 border border-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Error / Lockout Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {lockoutRemaining && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>
                Perangkat dikunci sementara. Silakan tunggu {Math.floor(lockoutRemaining / 60)}:
                {(lockoutRemaining % 60).toString().padStart(2, "0")} menit.
              </span>
            </div>
          )}

          {/* Touch-Friendly Numeric Keypad (Target >= 44px) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinDigit(num)}
                disabled={isLoading || !!lockoutRemaining}
                className="h-12 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-lg font-semibold text-white border border-slate-700/50 transition-all select-none disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || !!lockoutRemaining}
              className="h-12 flex items-center justify-center rounded-xl bg-slate-800/50 hover:bg-slate-800 active:scale-95 text-xs font-medium text-slate-400 border border-slate-700/50 transition-all select-none disabled:opacity-50"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handlePinDigit("0")}
              disabled={isLoading || !!lockoutRemaining}
              className="h-12 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-lg font-semibold text-white border border-slate-700/50 transition-all select-none disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={isLoading || !!lockoutRemaining}
              className="h-12 flex items-center justify-center rounded-xl bg-slate-800/50 hover:bg-slate-800 active:scale-95 text-xs font-medium text-slate-400 border border-slate-700/50 transition-all select-none disabled:opacity-50"
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading || pin.length < 4 || !!lockoutRemaining}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Otorisasi Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
