import React from "react";
import { Product } from "../../types";
import { Edit, Trash2, Package } from "lucide-react";
import { getMenuItemImage } from "../../utils/menuImages";

interface Props {
  products: Product[];
  onDelete: (id: string) => void;
  onEdit: (product: Product) => void;
  onAdd: () => void;
}

export function InventoryProducts({
  products,
  onDelete,
  onEdit,
  onAdd,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-800">
            Menu Jual (Produk)
          </h2>
          <p className="text-xs text-slate-500">
            Kelola daftar menu yang dijual ke pelanggan
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-indigo-700"
        >
          + Tambah Produk
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={getMenuItemImage(p)}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = getMenuItemImage({ name: p.name, category: p.category });
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Rp {(p.price ?? 0).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(p)}
                  className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => onDelete(p.id)}
                  className="p-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex justify-between text-xs bg-slate-50 p-2 rounded-lg">
              <span className="text-slate-500">Stok:</span>
              <span
                className={`font-bold ${(p.stock ?? 0) <= (p.warningLimit || 0) ? "text-rose-600" : "text-slate-700"}`}
              >
                {p.stock ?? 0} porsi
              </span>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 border-dashed">
            Belum ada produk.
          </div>
        )}
      </div>
    </div>
  );
}
