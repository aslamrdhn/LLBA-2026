import React, { useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { AlertTriangle, X } from "lucide-react";
import { RawMaterial } from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  wasteMaterial: RawMaterial | null;
}

export function WasteModal({
  isOpen,
  onClose,
  onRefresh,
  wasteMaterial,
}: Props) {
  const { triggerToast } = useUiStore();
  const [isSaving, setIsSaving] = useState(false);

  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("Kedaluwarsa / Rusak (Expired)");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteMaterial) return;

    setIsSaving(true);
    try {
      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";

      const res = await fetch("/api/inventory/waste", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
        },
        body: JSON.stringify({
          itemId: wasteMaterial.id,
          quantity: amount,
          reason,
          date: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        triggerToast(`Kerugian stok berhasil dicatat.`);
        onRefresh();
        onClose();
      } else {
        triggerToast("Gagal mencatat waste.");
      }
    } catch (err) {
      triggerToast("Gagal menghubungi server.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !wasteMaterial) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Catat
            Kerugian (Waste)
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
          <p className="text-xs text-amber-800">
            Anda akan memotong stok <strong>{wasteMaterial.name}</strong> tanpa
            transaksi penjualan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Jumlah Dibuang ({wasteMaterial.stockUnit})
            </label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-2 border rounded-xl bg-slate-50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Alasan
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded-xl bg-slate-50 text-sm"
            >
              <option value="Kedaluwarsa / Rusak (Expired)">
                Kedaluwarsa / Rusak
              </option>
              <option value="Tumpah / Kecelakaan (Spilled)">
                Tumpah / Kecelakaan
              </option>
              <option value="Sampel / Tester (Sample)">Sampel / Tester</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-rose-600 rounded-xl text-sm font-bold text-white shadow-md shadow-rose-200"
            >
              {isSaving ? "Menyimpan..." : "Laporkan Kerugian"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
