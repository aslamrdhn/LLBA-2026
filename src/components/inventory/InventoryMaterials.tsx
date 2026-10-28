import React from "react";
import { RawMaterial } from "../../types";
import { Edit, Trash2, Layers, AlertTriangle } from "lucide-react";

interface Props {
  materials: RawMaterial[];
  onDelete: (id: string) => void;
  onEdit: (material: RawMaterial) => void;
  onAdd: () => void;
  onWaste: (material: RawMaterial) => void;
}

export function InventoryMaterials({
  materials,
  onDelete,
  onEdit,
  onAdd,
  onWaste,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-800">
            Bahan Baku Mentah
          </h2>
          <p className="text-xs text-slate-500">
            Kelola stok bahan baku untuk resep
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-emerald-700"
        >
          + Tambah Bahan Baku
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((m) => {
          const currentStock = Number(m.stockQuantity ?? (m as any).stock ?? 0);
          const warningLimit = Number(m.warningLimit ?? (m as any).minStock ?? 0);
          const unit = m.stockUnit || (m as any).unit || "pcs";
          const isLowStock = currentStock <= warningLimit;
          const displayId = m.id ? m.id.split("-").pop() : "RM";

          return (
            <div
              key={m.id}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight">
                      {m.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      ID: {displayId}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onWaste(m)}
                    className="p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"
                    title="Catat Waste/Kerugian"
                  >
                    <AlertTriangle size={14} />
                  </button>
                  <button
                    onClick={() => onEdit(m)}
                    className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(m.id)}
                    className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Sisa Stok:</span>
                <span
                  className={`font-mono font-bold text-sm ${isLowStock ? "text-rose-600" : "text-slate-700"}`}
                >
                  {currentStock.toLocaleString("id-ID")} {unit}
                </span>
              </div>

              {isLowStock && (
                <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertTriangle size={10} /> Stok Menipis!
                </p>
              )}
            </div>
          );
        })}

        {materials.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 border-dashed">
            Belum ada bahan baku terdaftar.
          </div>
        )}
      </div>
    </div>
  );
}
