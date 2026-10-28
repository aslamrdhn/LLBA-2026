import React, { useState } from "react";
import {
  Search,
  AlertCircle,
  ShoppingBag,
  PlusCircle,
  Minus,
  Trash2,
  Tag,
} from "lucide-react";
import { Product } from "../../types";
import { getMenuItemImage } from "../../utils/menuImages";

interface ProductCatalogProps {
  activeTableData: any;
  tables: any[];
  tableNumber: string;
  setTableNumber: (val: string) => void;
  products: Product[];
  rawMaterials: any[];
  recipes: any[];
  appConfig: any;
  addToCart: (p: Product) => void;
}

export function ProductCatalog({
  products,
  rawMaterials,
  recipes,
  appConfig,
  addToCart,
  activeTableData,
  tables,
  tableNumber,
  setTableNumber,
}: ProductCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Precomputed recipe ingredient status map for fast, memoized lookups to eliminate POS scroll/click lag
  const ingredientStatusMap = React.useMemo(() => {
    const map: Record<string, "ok" | "empty" | "warning"> = {};
    if (!recipes || !rawMaterials || recipes.length === 0) {
      return map;
    }

    // Index raw materials by ID for O(1) lookup
    const rawMaterialsMap = new Map<string, (typeof rawMaterials)[0]>();
    rawMaterials.forEach((m) => rawMaterialsMap.set(m.id, m));

    recipes.forEach((recipe) => {
      if (
        !recipe.productId ||
        !recipe.ingredients ||
        recipe.ingredients.length === 0
      ) {
        return;
      }
      let hasEmpty = false;
      let hasWarning = false;

      for (const ing of recipe.ingredients) {
        const mat = rawMaterialsMap.get(ing.materialId);
        if (!mat) continue;

        if (mat.stockQuantity < ing.amount) {
          hasEmpty = true;
          break;
        }
        if (mat.stockQuantity <= mat.warningLimit) {
          hasWarning = true;
        }
      }

      if (hasEmpty) {
        map[recipe.productId] = "empty";
      } else if (hasWarning) {
        map[recipe.productId] = "warning";
      } else {
        map[recipe.productId] = "ok";
      }
    });

    return map;
  }, [recipes, rawMaterials]);

  // Dynamic raw material recipe validation for POS Checkout - O(1) lookup speed
  const checkIngredientStatus = (productId: string) => {
    return ingredientStatusMap[productId] || "ok";
  };

  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, selectedCategory, searchQuery]);

  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  return (
    <>
      {/* Kolom Kiri: Pilih Menu & Barcode (Katalog) - Col 7 */}
      <div className="md:col-span-12 space-y-4">
        {/* DOUBLE BOOKING / COLLISION WARNING PANEL */}
        {activeTableData && activeTableData.status !== "Empty" && (
          <div
            className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fade-in shrink-0"
            id="table-conflict-banner"
          >
            <div className="flex items-center gap-3 text-amber-850">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-amber-900">
                  🚨 Peringatan Meja Sedang Aktif ({activeTableData.name})
                </p>
                <p className="text-amber-700 font-medium">
                  Pengunjung saat ini masih menempati meja ini secara fisik atau
                  memiliki pesanan berjalan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[10px] font-mono font-bold uppercase py-1 px-2.5 rounded-md bg-amber-200 text-amber-800 animate-pulse">
                Meja Terkunci
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Kolom Kiri: Pilih Menu & Barcode (Katalog) - Col 7 */}
      <div className="col-span-1 md:col-span-6 lg:col-span-7 space-y-4">
        {/* Kontrol Cari & Filter Meja */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Input Cari */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-slate-400"
                size={18}
              />
              <input
                id="search-menu"
                type="text"
                placeholder="Cari Menu / Scan Barcode Produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden text-sm bg-slate-50 rounded-xl"
              />
            </div>
            {/* Pemilihan Meja */}
            <div className="w-full sm:w-48">
              <select
                id="table-selector"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden text-sm bg-slate-50 font-medium rounded-xl text-slate-700"
              >
                <option value="Kasir Utama">Kasir Utama</option>
                {tables.map((table) => (
                  <option
                    key={table.id}
                    value={`Meja ${table.id} (${(table.name || "").split(" ")[2] || "A"})`}
                  >
                    {table.name} (
                    {table.status === "Empty" ? "Kosong" : "Isi - Terkunci"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigasi Kategori Menu */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {[
              "All",
              "Coffee",
              "Non-Coffee",
              "Heavy Meals",
              "Snacks",
              "Desserts",
              "Beans",
            ].map((cat) => (
              <button
                key={cat}
                id={`cat-filter-${cat.toLowerCase().replace(" ", "-")}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800"
                }`}
              >
                {cat === "All" ? "Semua Menu" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Menu */}
        <div
          className={
            appConfig?.layoutMode === "list"
              ? "flex flex-col gap-2.5 max-h-[640px] overflow-y-auto pr-1"
              : "grid grid-cols-2 lg:grid-cols-3 gap-4 max-h-[640px] overflow-y-auto pr-1"
          }
          id="products-catalog-grid"
        >
          {filteredProducts.map((p) => {
            const ingStatus = checkIngredientStatus(p.id);
            const isOutOfStock = p.stock === 0 || ingStatus === "empty";

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`bg-white rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-200 ease-out transform active:scale-95 flex ${
                  appConfig?.layoutMode === "list"
                    ? "flex-row items-center justify-between"
                    : "flex-col justify-between"
                } cursor-pointer group shrink-0 overflow-hidden ${
                  isOutOfStock
                    ? "opacity-50 cursor-not-allowed bg-slate-50"
                    : ""
                }`}
                style={{ contentVisibility: "auto" }}
              >
                {appConfig?.layoutMode === "list" ? (
                  // HORIZONTAL LIST CARD VIEW
                  <div className="flex items-center gap-3 p-2.5 w-full">
                    {/* Left image or icon */}
                    <div className="w-12 h-12 bg-slate-50 flex-shrink-0 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center">
                      <img
                        src={getMenuItemImage(p)}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = getMenuItemImage({ name: p.name, category: p.category });
                        }}
                      />
                    </div>
                    {/* Middle details */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-100 text-[8px] font-mono font-black px-1.5 py-0.5 rounded text-slate-500 uppercase leading-none">
                          {p.category}
                        </span>
                        {p.stock <= p.warningLimit && p.stock > 0 && (
                          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded animate-pulse leading-none">
                            Sisa Sedikit
                          </span>
                        )}
                        {ingStatus === "empty" && (
                          <span className="text-[8px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded leading-none border border-rose-100 animate-pulse">
                            Bahan Baku Habis 🚫
                          </span>
                        )}
                        {ingStatus === "warning" && (
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded leading-none border border-amber-100 animate-pulse">
                            Bahan Kritis ⚠️
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm mt-1 truncate leading-tight group-hover:text-slate-950">
                        {p.name}
                      </h4>
                      {p.komposisi && (
                        <p className="text-[9px] text-slate-400 font-sans italic truncate">
                          🌱 {p.komposisi}
                        </p>
                      )}
                    </div>
                    {/* Right numbers */}
                    <div className="text-right shrink-0">
                      {p.promoActive ? (
                        <div className="space-y-0.5">
                          <span className="text-[7px] font-black tracking-wider bg-rose-500 text-white px-1 ml-auto block w-fit rounded-sm uppercase leading-none mb-1">
                            PROMO
                          </span>
                          <p className="text-rose-600 font-extrabold text-xs sm:text-sm font-mono leading-none">
                            Rp{" "}
                            {Math.round(
                              p.price *
                                (1 - (p.promoDiscountPercent || 15) / 100),
                            ).toLocaleString("id-ID")}
                          </p>
                          <p className="text-[10px] line-through text-slate-400 font-mono leading-none">
                            Rp {p.price.toLocaleString("id-ID")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-900 font-extrabold text-xs sm:text-sm font-mono leading-none">
                          Rp {p.price.toLocaleString("id-ID")}
                        </p>
                      )}
                      <span
                        className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded inline-block mt-1 leading-none ${
                          isOutOfStock
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : p.stock <= p.warningLimit
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                        }`}
                      >
                        {isOutOfStock
                          ? ingStatus === "empty"
                            ? "Bahan Habis"
                            : "Habis"
                          : `Stok: ${p.stock}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  // DEFAULT GRID CARD VIEW
                  <>
                    {/* Product Thumbnail Image */}
                    <div className="relative h-28 w-full overflow-hidden bg-slate-50 border-b border-slate-100">
                      <img
                        src={getMenuItemImage(p)}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          e.currentTarget.src = getMenuItemImage({ name: p.name, category: p.category });
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-60" />
                    </div>

                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center gap-1">
                          <span className="bg-slate-100 text-[8px] font-mono tracking-wider font-extrabold px-1.5 py-0.5 rounded text-slate-500 uppercase">
                            {p.category}
                          </span>
                          {p.promoActive && (
                            <span className="bg-rose-500 text-[8px] font-mono tracking-wider font-extrabold px-1.5 py-0.5 rounded text-white uppercase animate-pulse leading-none shadow-xs">
                              🔥 PROMO {p.promoDiscountPercent || 15}%
                            </span>
                          )}
                          {p.stock <= p.warningLimit &&
                            p.stock > 0 &&
                            !p.promoActive && (
                              <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded animate-pulse">
                                Sisa Sedikit
                              </span>
                            )}
                        </div>

                        <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm mt-1.5 line-clamp-2 leading-tight group-hover:text-slate-950">
                          {p.name}
                        </h4>
                        {p.komposisi && (
                          <p className="text-[9px] text-slate-500 font-sans mt-1 italic line-clamp-2 leading-tight">
                            🌱 Komposisi: {p.komposisi}
                          </p>
                        )}

                        <div className="flex gap-1 flex-wrap mt-1">
                          {ingStatus === "empty" && (
                            <span className="text-[8px] scale-95 font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase animate-pulse">
                              Bahan Baku Habis 🚫
                            </span>
                          )}
                          {ingStatus === "warning" && (
                            <span className="text-[8px] scale-95 font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase">
                              Bahan Kritis ⚠️
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] text-slate-400 font-mono leading-none mb-1">
                              {p.barcode}
                            </p>
                            {p.promoActive ? (
                              <div className="space-y-0.5">
                                <p className="text-rose-600 font-black text-xs sm:text-sm leading-none">
                                  Rp{" "}
                                  {Math.round(
                                    p.price *
                                      (1 -
                                        (p.promoDiscountPercent || 15) / 100),
                                  ).toLocaleString("id-ID")}
                                </p>
                                <p className="text-[10px] line-through text-slate-400 font-mono leading-none">
                                  Rp {p.price.toLocaleString("id-ID")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-900 font-extrabold text-xs sm:text-sm">
                                Rp {p.price.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>

                          <span
                            className={`text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded ${
                              isOutOfStock
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : p.stock <= p.warningLimit
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                            }`}
                          >
                            {isOutOfStock
                              ? ingStatus === "empty"
                                ? "Bahan Habis"
                                : "Habis"
                              : `Stok: ${p.stock}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
