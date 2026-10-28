import React from "react";
import { Product, RawMaterial, Recipe } from "../../types";
import { BookOpen, Coffee } from "lucide-react";

interface Props {
  products: Product[];
  rawMaterials: RawMaterial[];
  recipes: Recipe[];
}

export function InventoryRecipes({ products, rawMaterials, recipes }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-800">Resep Menu</h2>
          <p className="text-xs text-slate-500">
            Hubungkan menu dengan bahan baku untuk auto-potong stok
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {products.map((p) => {
          const recipe = recipes.find((r) => r.productId === p.id);
          return (
            <div
              key={p.id}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <Coffee size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Rp {(p.price ?? 0).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <div className="flex-1 w-full bg-slate-50 rounded-xl p-3 border border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
                  Bahan Baku (Resep)
                </h4>
                {recipe && recipe.ingredients.length > 0 ? (
                  <ul className="space-y-1">
                    {recipe.ingredients.map((ing) => {
                      const mat = rawMaterials.find(
                        (m) => m.id === ing.materialId,
                      );
                      return (
                        <li
                          key={ing.materialId}
                          className="flex justify-between text-xs text-slate-700"
                        >
                          <span>{mat ? mat.name : "Unknown Material"}</span>
                          <span className="font-mono font-bold">
                            {ing.amount} {mat ? mat.stockUnit : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada resep tersimpan.
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {products.length === 0 && (
          <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 border-dashed">
            Tambahkan produk terlebih dahulu.
          </div>
        )}
      </div>
    </div>
  );
}
