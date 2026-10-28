import React, { useState, useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { useDataStore } from "../../store/dataStore";
import { RawMaterial } from "../../types";
import { Layers, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  materialToEdit?: RawMaterial | null;
}

export function AddMaterialModal({
  isOpen,
  onClose,
  onRefresh,
  materialToEdit,
}: Props) {
  const { triggerToast } = useUiStore();
  const { addRawMaterial, updateRawMaterial } = useDataStore();
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [stock, setStock] = useState(1000);
  const [unit, setUnit] = useState<"g" | "ml" | "pcs" | "Kg">("g");
  const [warningLimit, setWarningLimit] = useState(200);
  const [unitCost, setUnitCost] = useState(200);
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");

  useEffect(() => {
    if (materialToEdit) {
      setName(materialToEdit.name || "");
      setStock(Number(materialToEdit.stockQuantity ?? (materialToEdit as any).stock ?? 0));
      setUnit(((materialToEdit.stockUnit || (materialToEdit as any).unit || "g") as "g" | "ml" | "pcs" | "Kg"));
      setWarningLimit(Number(materialToEdit.warningLimit ?? (materialToEdit as any).minStock ?? 200));
      setUnitCost(Number(materialToEdit.unitCost ?? (materialToEdit as any).costPerUnit ?? 0));
      setSupplierName(materialToEdit.supplierName || "");
      setSupplierContact(materialToEdit.supplierContact || "");
    } else {
      setName("");
      setStock(1000);
      setUnit("g");
      setWarningLimit(200);
      setUnitCost(250);
      setSupplierName("");
      setSupplierContact("");
    }
  }, [materialToEdit, isOpen]);

  // Keyboard shortcut listener: close modal with Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast("Nama bahan baku tidak boleh kosong!");
      return;
    }

    setIsSaving(true);
    const payload: RawMaterial = {
      id: materialToEdit ? materialToEdit.id : `rm-${Date.now()}`,
      name: name.trim(),
      stockQuantity: Number(stock),
      stockUnit: unit,
      warningLimit: Number(warningLimit),
      unitCost: Number(unitCost),
      supplierName: supplierName || "Supplier Mitra",
      supplierContact: supplierContact || "-",
    };

    try {
      if (materialToEdit) {
        updateRawMaterial(payload);
        triggerToast(`Selesai: Bahan "${name}" berhasil diperbarui!`);
      } else {
        addRawMaterial(payload);
        triggerToast(`Selesai: Bahan "${name}" berhasil ditambahkan!`);
      }

      // Sync with server (§13.4)
      try {
        const endpoint = materialToEdit
          ? `/api/items/${materialToEdit.id}`
          : "/api/items";
        const method = materialToEdit ? "PATCH" : "POST";

        await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: payload.name,
            price: payload.unitCost,
            minStock: payload.warningLimit,
            category: "RAW",
          }),
        });
      } catch {
        // Offline fallback
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      triggerToast("Gagal menyimpan bahan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-sans overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
            <Layers size={18} className="text-emerald-600" />
            {materialToEdit ? "Edit Bahan Baku Mentah" : "Tambah Bahan Baku Mentah"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Bahan Baku
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-hidden focus:border-slate-400"
              placeholder="Contoh: Fresh Milk Full Cream, Biji Gayo, Sirup Caramel"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stok Fisik
              </label>
              <input
                type="number"
                required
                min={0}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono font-bold text-slate-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Satuan Ukuran
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as "g" | "ml" | "pcs" | "Kg")}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono focus:outline-hidden"
              >
                <option value="g">Gram (g)</option>
                <option value="ml">Mililiter (ml)</option>
                <option value="pcs">Pieces (pcs)</option>
                <option value="Kg">Kilogram (Kg)</option>
                <option value="Liter">Liter (L)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Biaya Satuan (Rp/unit)
              </label>
              <input
                type="number"
                required
                min={0}
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono focus:outline-hidden"
                placeholder="Contoh: 280/g"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batas Minimum Warning
              </label>
              <input
                type="number"
                required
                min={0}
                value={warningLimit}
                onChange={(e) => setWarningLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Pemasok / Supplier
              </label>
              <input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-hidden"
                placeholder="Contoh: Koperasi Tani"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kontak Supplier
              </label>
              <input
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono focus:outline-hidden"
                placeholder="0812-..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {isSaving
                ? "Menyimpan..."
                : materialToEdit
                  ? "Simpan Perubahan"
                  : "+ Tambah Bahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
