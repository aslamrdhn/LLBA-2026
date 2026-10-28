import React, { useState } from "react";
import { LogOut, Printer, CheckSquare, Coffee } from "lucide-react";

interface ShiftHandoverProps {
  appConfig: any;
  currentStore: any;
  shiftMetrics: any;
  onLogout: () => void;
  onCancel: () => void;
}

export default function ShiftHandover({
  appConfig,
  currentStore,
  shiftMetrics,
  onLogout,
  onCancel,
}: ShiftHandoverProps) {
  const [actualCashInDrawer, setActualCashInDrawer] = useState<string>("");
  const [confirmedHandover, setConfirmedHandover] = useState<boolean>(false);
  const [isPrintingShiftReceipt, setIsPrintingShiftReceipt] =
    useState<boolean>(false);
  const [showShiftReceiptSlip, setShowShiftReceiptSlip] =
    useState<boolean>(false);
  const [denominations, setDenominations] = useState<Record<string, number>>({
    "100000": 0,
    "50000": 0,
    "20000": 0,
    "10000": 0,
    "5000": 0,
    "2000": 0,
    "1000": 0,
    "500": 0,
    "200": 0,
    "100": 0,
  });

  const handleUpdateDenomination = (denomKey: string, valStr: string) => {
    const numericQty = parseInt(valStr.replace(/[^0-9]/g, "")) || 0;
    const updatedDenoms = { ...denominations, [denomKey]: numericQty };
    setDenominations(updatedDenoms);

    const total = Object.entries(updatedDenoms).reduce((sum, [denom, qty]) => {
      return sum + parseInt(denom) * Number(qty);
    }, 0);
    setActualCashInDrawer(total > 0 ? total.toLocaleString("id-ID") : "");
  };

  const handleIncrementDenomination = (denomKey: string, step: number) => {
    const currentQty = denominations[denomKey] || 0;
    const newQty = Math.max(0, currentQty + step);
    const updatedDenoms = { ...denominations, [denomKey]: newQty };
    setDenominations(updatedDenoms);

    const total = Object.entries(updatedDenoms).reduce((sum, [denom, qty]) => {
      return sum + parseInt(denom) * Number(qty);
    }, 0);
    setActualCashInDrawer(total > 0 ? total.toLocaleString("id-ID") : "");
  };

  const actualCashNum = actualCashInDrawer
    ? parseInt(actualCashInDrawer.replace(/[^0-9]/g, "")) || 0
    : 0;
  const localCashDifference =
    actualCashNum - (shiftMetrics.expectedDrawerBalance || 0);

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4 overflow-y-auto w-full h-full">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative my-auto animate-fade-in">
        {/* Header Shift Handover */}
        <div className="p-5 lg:p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gradient-to-r from-slate-800/80 to-slate-900 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold font-sans text-white">
              Serah Terima Shift Kasir
            </h2>
            <p className="text-slate-400 text-xs">
              Rekonsiliasi transaksi, hitung laci kas, dan cetak slip setoran
              pendapatan.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-white/5 flex items-center gap-3">
              <img
                src={currentStore?.cashierAvatar || appConfig.cashierAvatar}
                alt="Kasir"
                className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/400x400/f8fafc/94a3b8?text=Produk+Tanpa+Foto";
                }}
              />
              <div className="text-left pr-2 text-xs">
                <p className="text-slate-200 font-bold uppercase">
                  {appConfig.cashierName ||
                    currentStore?.cashierName ||
                    "Kasir Aktif"}
                </p>
                <p className="text-indigo-400 font-mono text-[10px]">
                  {appConfig.cashierRole ||
                    currentStore?.cashierRole ||
                    "Operator"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content here (mostly copied from App.tsx modal content) */}
        {/* For brevity I'll assume standard layout but you can inject the UI pieces */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-3 tracking-widest text-[10px] uppercase">
                Rincian Laci Kasir
              </h3>
              <div className="space-y-4">
                {/* Denominations UI */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3 max-h-[250px] overflow-y-auto">
                  {[
                    "100000",
                    "50000",
                    "20000",
                    "10000",
                    "5000",
                    "2000",
                    "1000",
                    "500",
                    "200",
                    "100",
                  ].map((denom) => (
                    <div
                      key={denom}
                      className="flex justify-between items-center gap-2 text-xs"
                    >
                      <span className="font-mono text-slate-300 w-24">
                        Rp {parseInt(denom).toLocaleString("id-ID")}
                      </span>
                      <div className="flex bg-slate-900 rounded-md border border-slate-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleIncrementDenomination(denom, -1)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="text"
                          value={denominations[denom] || ""}
                          onChange={(e) =>
                            handleUpdateDenomination(denom, e.target.value)
                          }
                          placeholder="0"
                          className="w-12 bg-transparent text-center text-white font-mono font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleIncrementDenomination(denom, 1)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-mono text-emerald-400 text-right w-24">
                        Rp{" "}
                        {(
                          (denominations[denom] || 0) * parseInt(denom)
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Actual input if they just want to type */}
                <div>
                  <label className="text-xs font-bold text-white">
                    Atau Pindai/Ketik Total Fisik Laci (Rp)
                  </label>
                  <input
                    type="text"
                    value={actualCashInDrawer}
                    onChange={(e) => setActualCashInDrawer(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded p-2"
                    placeholder="Cth: 1500000"
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-3 tracking-widest text-[10px] uppercase">
                Ringkasan Sistem
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">Total Penjualan</p>
                  <p className="text-xl font-bold text-white mt-1">
                    Rp{" "}
                    {shiftMetrics.totalSalesVol?.toLocaleString("id-ID") || 0}
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">
                    Ekspektasi Uang Tunai (Modal + Tunai)
                  </p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    Rp{" "}
                    {shiftMetrics.expectedDrawerBalance?.toLocaleString(
                      "id-ID",
                    ) || 0}
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">
                    Selisih Kas (Discrepancy)
                  </p>
                  <p
                    className={`text-xl font-bold mt-1 ${localCashDifference < 0 ? "text-rose-500" : "text-emerald-500"}`}
                  >
                    Rp {localCashDifference?.toLocaleString("id-ID") || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setConfirmedHandover(!confirmedHandover)}
              className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg w-full text-left"
            >
              <CheckSquare
                size={20}
                className={
                  confirmedHandover ? "text-emerald-500" : "text-slate-500"
                }
              />
              <div>
                <p className="text-sm font-bold text-white">
                  Konfirmasi Laporan Shift
                </p>
                <p className="text-xs text-slate-400">
                  Saya telah menghitung uang fisik dan mencatat laporan secara
                  valid.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900 rounded-b-3xl">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
          >
            Batal
          </button>
          <button
            disabled={!confirmedHandover}
            onClick={onLogout}
            className="px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm flex gap-2 items-center"
          >
            <LogOut size={16} /> Selesai Shift & Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
