import { useUiStore } from "../../store/uiStore";
import React, { useState } from "react";
import {
  Layers,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  Tag,
  Check,
  X,
  CheckCircle,
  Save,
  ImageIcon,
  Info,
  Coffee,
} from "lucide-react";
import { Product, AppConfig, RawMaterial, Recipe } from "../../types";
import { getMenuItemImage } from "../../utils/menuImages";

interface MenuTabProps {
  appConfig: AppConfig;
  products: Product[];
  rawMaterials: RawMaterial[];
  recipes: Recipe[];
  onRefresh: () => void;
}

export function MenuTab({
  appConfig,
  products,
  rawMaterials,
  recipes,
  onRefresh,
}: MenuTabProps) {
  const {
    triggerToast,
    logAuditActivity,
    auditLogs,
    setAuditLogs,
    clearAuditLogs,
  } = useUiStore();

  const [menuSearch, setMenuSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showAddMenuModal, setShowAddMenuModal] = useState<boolean>(false);
  const [showEditMenuModal, setShowEditMenuModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [prodName, setProdName] = useState<string>("");
  const [prodCategory, setProdCategory] = useState<
    "Coffee" | "Non-Coffee" | "Heavy Meals" | "Snacks" | "Desserts" | "Beans"
  >("Coffee");
  const [prodPrice, setProdPrice] = useState<number>(18000);
  const [prodCostPrice, setProdCostPrice] = useState<number>(8000);
  const [prodStock, setProdStock] = useState<number>(50);
  const [prodWarningLimit, setProdWarningLimit] = useState<number>(5);
  const [prodBarcode, setProdBarcode] = useState<string>("");
  const [prodKomposisi, setProdKomposisi] = useState<string>("");
  const [prodImageUrl, setProdImageUrl] = useState<string>("");
  const [prodSupplierName, setProdSupplierName] =
    useState<string>("Supplier Utama");
  const [prodSupplierContact, setProdSupplierContact] =
    useState<string>("0812-3456-7890");

  const [recipeIngredients, setRecipeIngredients] = useState<
    { materialId: string; amount: number }[]
  >([]);
  const [tempMaterialId, setTempMaterialId] = useState<string>("");
  const [tempAmount, setTempAmount] = useState<number>(0);

  const [restorePending, setRestorePending] = useState<boolean>(false);
  const [deleteProductPending, setDeleteProductPending] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [quickName, setQuickName] = useState<string>("");
  const [quickCategory, setQuickCategory] = useState<
    "Coffee" | "Non-Coffee" | "Heavy Meals" | "Snacks" | "Desserts" | "Beans"
  >("Coffee");
  const [quickPrice, setQuickPrice] = useState<number>(18000);
  const [quickStock, setQuickStock] = useState<number>(100);

  // Keyboard shortcut listener: close any active modal with Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAddMenuModal) setShowAddMenuModal(false);
        if (showEditMenuModal) {
          setShowEditMenuModal(false);
          setEditingProduct(null);
        }
        if (deleteProductPending) setDeleteProductPending(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddMenuModal, showEditMenuModal, deleteProductPending]);

  const generateRandomBarcode = () => {
    const code = "PROD" + Math.floor(1000 + Math.random() * 9000);
    setProdBarcode(code);
  };

  const handleLocalImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEditMode: boolean = false,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEditMode) {
          setProdImageUrl(reader.result as string);
        } else {
          setProdImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      triggerToast("Nama produk tidak boleh kosong");
      return;
    }
    try {
      const payload = {
        name: prodName,
        category: prodCategory,
        price: Number(prodPrice),
        costPrice: Number(prodCostPrice),
        stock: Number(prodStock),
        warningLimit: Number(prodWarningLimit),
        barcode:
          prodBarcode || "PROD" + Math.floor(1000 + Math.random() * 9000),
        supplierName: prodSupplierName,
        supplierContact: prodSupplierContact,
        imageUrl: prodImageUrl || undefined,
        komposisi: prodKomposisi || undefined,
      };

      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          product: payload,
          recipes:
            recipeIngredients.length > 0
              ? {
                  productId: "will_be_set_by_server",
                  ingredients: recipeIngredients,
                  totalCost: recipeIngredients.reduce(
                    (sum, ing) =>
                      sum +
                      ing.amount *
                        (rawMaterials.find((m) => m.id === ing.materialId)
                          ?.unitCost || 0),
                    0,
                  ),
                }
              : undefined,
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        triggerToast(`Sukses menambahkan menu baru: ${prodName}`);
        setShowAddMenuModal(false);
        resetProductForm();
        onRefresh();
      }
    } catch (err) {
      triggerToast("Gagal menambahkan produk baru.");
    }
  };

  const startEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdCategory(p.category as any);
    setProdPrice(p.price);
    setProdCostPrice(p.costPrice || 0);
    setProdStock(p.stock);
    setProdWarningLimit(p.warningLimit);
    setProdBarcode(p.barcode || "");
    setProdSupplierName(p.supplierName || "");
    setProdSupplierContact(p.supplierContact || "");
    setProdImageUrl(p.imageUrl || "");
    setProdKomposisi(p.komposisi || "");

    const foundRecipe = recipes.find((r) => r.productId === p.id);
    if (foundRecipe && foundRecipe.ingredients) {
      setRecipeIngredients(foundRecipe.ingredients);
    } else {
      setRecipeIngredients([]);
    }

    setShowEditMenuModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const payload = {
        name: prodName,
        category: prodCategory,
        price: Number(prodPrice),
        costPrice: Number(prodCostPrice),
        stock: Number(prodStock),
        warningLimit: Number(prodWarningLimit),
        barcode: prodBarcode,
        supplierName: prodSupplierName,
        supplierContact: prodSupplierContact,
        imageUrl: prodImageUrl || undefined,
        komposisi: prodKomposisi || undefined,
      };

      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";

      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          product: payload,
          recipes:
            recipeIngredients.length > 0
              ? {
                  productId: editingProduct.id,
                  ingredients: recipeIngredients,
                  totalCost: recipeIngredients.reduce(
                    (sum, ing) =>
                      sum +
                      ing.amount *
                        (rawMaterials.find((m) => m.id === ing.materialId)
                          ?.unitCost || 0),
                    0,
                  ),
                }
              : undefined,
        }),
      });

      if (response.ok) {
        triggerToast(`Sukses memperbarui menu: ${prodName}`);
        setShowEditMenuModal(false);
        setEditingProduct(null);
        resetProductForm();
        onRefresh();
      }
    } catch (err) {
      triggerToast("Gagal memperbarui menu.");
    }
  };

  const handleDeleteProduct = (pId: string, pName: string) => {
    setDeleteProductPending({ id: pId, name: pName });
  };

  const executeDeleteProduct = async () => {
    if (!deleteProductPending) return;
    const { id, name } = deleteProductPending;
    try {
      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          "x-tenant-id": tenantId,
        },
      });
      if (response.ok) {
        triggerToast(`Sukses menghapus menu: ${name}`);
        setDeleteProductPending(null);
        onRefresh();
      }
    } catch (err) {
      triggerToast("Gagal menghapus produk.");
    }
  };

  const handleQuickStockChange = async (p: any, delta: number) => {
    const newStock = Math.max(0, p.stock + delta);
    const payload = {
      stock: newStock,
    };
    try {
      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";
      const response = await fetch(`/api/products/${p.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ product: payload }),
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      triggerToast("Nama menu wajib diisi.");
      return;
    }

    try {
      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";
      const calculatedCost = Math.round(quickPrice * 0.45);
      const generatedBarcode =
        "LL-" + Math.floor(Math.random() * 90000 + 10000);

      const payload = {
        name: quickName.trim(),
        category: quickCategory,
        price: quickPrice,
        costPrice: calculatedCost,
        stock: quickStock,
        warningLimit: 5,
        barcode: generatedBarcode,
        supplierName: "General Supplier",
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ product: payload }),
      });

      if (response.ok) {
        triggerToast(`Menu "${quickName}" berhasil ditambahkan.`);
        setQuickName("");
        setQuickPrice(18000);
        setQuickStock(100);
        onRefresh();
      }
    } catch (err) {
      triggerToast("Gagal menambah menu via Quick Add.");
    }
  };

  const resetProductForm = () => {
    setProdName("");
    setProdCategory("Coffee");
    setProdPrice(18000);
    setProdCostPrice(8000);
    setProdStock(50);
    setProdWarningLimit(5);
    setProdBarcode("");
    setProdKomposisi("");
    setProdImageUrl("");
    setRecipeIngredients([]);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(menuSearch.toLowerCase()));
    const matchesCat =
      selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <>
      <div
        className="bg-white p-6 rounded-3xl border border-slate-150 border-slate-200/50 shadow-sm space-y-4 animate-fade-in"
        id="inventory-config-panel"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} />
              Manajemen Basis Data Menu Jual
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Unggah menu dan gambar baru, sunting harga bahan baku, atau hapus
              item etalase.
            </p>
          </div>

          {/* Custom Add Menu Trigger Button */}
          <button
            onClick={() => {
              resetProductForm();
              generateRandomBarcode();
              setShowAddMenuModal(true);
            }}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <PlusCircle size={14} />
            Unggah Menu Baru
          </button>
        </div>

        {/* QUICK INSERT BAR - EASIER MENU ADDITION */}
        <form
          onSubmit={handleQuickAddSubmit}
          className="bg-gradient-to-r from-amber-500/5 via-amber-50 to-indigo-50/50 p-5 rounded-2xl border border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-center"
          id="quick-add-menu-form"
        >
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <p className="text-[9px] text-amber-700 uppercase tracking-widest font-black leading-none mb-1">
              Tambah Menu Kilat
            </p>
            <h4 className="text-xs font-extrabold text-slate-800 leading-none">
              Tanpa Buka Dialog Modal
            </h4>
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <input
              type="text"
              required
              placeholder="Nama menu (misal: Ice Matcha Latte)"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-amber-500 placeholder-slate-400"
            />
          </div>

          <div className="col-span-1 sm:col-span-1 lg:col-span-2">
            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-amber-500"
            >
              {[
                "Coffee",
                "Non-Coffee",
                "Heavy Meals",
                "Snacks",
                "Desserts",
                "Beans",
              ].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 sm:col-span-1 lg:col-span-2">
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                required
                placeholder="Harga"
                value={quickPrice || ""}
                onChange={(e) => setQuickPrice(parseInt(e.target.value) || 0)}
                className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-amber-500 font-mono font-bold placeholder-slate-400"
              />
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                required
                placeholder="Stok"
                value={quickStock || ""}
                onChange={(e) => setQuickStock(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 text-center focus:outline-hidden focus:border-amber-500 font-mono font-bold placeholder-slate-400"
                title="Stok awal porsi"
              />
              <span className="absolute right-2 top-2.5 text-[8px] font-bold text-slate-400 uppercase">
                Stk
              </span>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
            >
              <PlusCircle size={14} className="stroke-[3]" />
            </button>
          </div>
        </form>

        {/* Search bar and categories filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Cari nama menu / kode barcode..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white text-xs rounded-xl focus:outline-hidden"
            />
          </div>

          {/* Category horizontal filters */}
          <div className="flex items-center gap-1 overflow-x-auto shrink-0 py-0.5 scrollbar-none">
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
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-white hover:bg-slate-200 text-slate-650 text-slate-600"
                }`}
              >
                {cat === "All" ? "Semua Menu" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE OF PRODUCTS LIST */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-bold text-[9px] tracking-wider">
                <th className="p-4 rounded-tl-2xl">Menu & Foto</th>
                <th className="p-4">Kategori</th>
                <th className="p-4 text-right">Modal Pokok</th>
                <th className="p-4 text-right">Harga Jual</th>
                <th className="p-4 text-center">Profit Estimasi</th>
                <th className="p-4 text-center">Stok / Alarm</th>
                <th className="p-4 text-right rounded-tr-2xl w-40">
                  Aksi Operasi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-400 italic"
                  >
                    Menu tidak ditemukan. Silakan tambahkan menu baru.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  // Calculate profit analysis
                  const cost = p.costPrice || Math.round(p.price * 0.45);
                  const grossProfit = p.price - cost;
                  const marginPercent = Math.round(
                    (grossProfit / p.price) * 100,
                  );

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/60 font-sans"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* Product Thumbnail image preview */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shadow-xs flex-shrink-0 flex items-center justify-center">
                            <img
                              src={getMenuItemImage(p)}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = getMenuItemImage({ name: p.name, category: p.category });
                              }}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 text-xs sm:text-sm">
                              {p.name}
                            </p>
                            {p.komposisi ? (
                              <p
                                className="text-[10px] text-slate-400 italic truncate max-w-[200px]"
                                title={p.komposisi}
                              >
                                🌱 {p.komposisi}
                              </p>
                            ) : (
                              <p className="text-[9px] text-slate-400 italic font-mono">
                                {p.barcode}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="bg-slate-100/80 border border-slate-200/50 text-slate-650 text-slate-600 font-bold px-2 py-0.5 rounded text-[9px] uppercase font-sans">
                          {p.category}
                        </span>
                      </td>

                      <td className="p-4 text-right font-mono font-medium text-slate-500">
                        Rp {cost.toLocaleString("id-ID")}
                      </td>

                      <td className="p-4 text-right font-mono font-extrabold text-slate-900">
                        Rp {p.price.toLocaleString("id-ID")}
                      </td>

                      <td className="p-4 text-center">
                        <div className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md font-mono text-[10px]">
                          Rp {grossProfit.toLocaleString("id-ID")} (
                          {marginPercent}%)
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickStockChange(p, -5)}
                            className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-rose-50 hover:text-rose-605 hover:text-rose-600 flex items-center justify-center text-xs transition-colors cursor-pointer border border-slate-200"
                            title="Kurangi stok (-5 porsi)"
                          >
                            -
                          </button>
                          <span
                            className={`font-mono text-xs font-bold shrink-0 min-w-[50px] ${p.stock <= p.warningLimit ? "text-amber-600 font-black animate-pulse" : "text-slate-800"}`}
                          >
                            {p.stock} porsi
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickStockChange(p, 5)}
                            className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center text-xs transition-colors cursor-pointer border border-slate-200"
                            title="Tambah stok (+5 porsi)"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono block mt-1">
                          (Limit Alarm: {p.warningLimit})
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => startEditProduct(p)}
                            className="p-1 px-2.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-transparent hover:border-blue-200"
                            title="Sunting Menu"
                          >
                            <Edit2 size={10} />
                            Sunting
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1 px-2.5 bg-slate-100 hover:bg-rose-50 text-slate-605 text-slate-500 hover:text-rose-600 hover:border-rose-100 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-transparent"
                            title="Hapus Menu"
                          >
                            <Trash2 size={10} />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showAddMenuModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto"
          id="add-menu-modal"
          onClick={() => setShowAddMenuModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl my-auto max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header with prominent close button */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <PlusCircle size={18} className="text-emerald-500" />
                Unggah Menu & Gambar Baru Ke Etalase
              </h4>
              <button
                type="button"
                onClick={() => setShowAddMenuModal(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
                title="Tutup (Esc)"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateProduct}
              className="space-y-4 text-xs p-6 overflow-y-auto flex-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Nama Menu Jual
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Kopi Susu Aren Gembira"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-bold rounded-lg focus:outline-hidden focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Kategori Menu
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-medium rounded-lg"
                  >
                    <option value="Coffee">☕ Coffee</option>
                    <option value="Non-Coffee">🥤 Non-Coffee</option>
                    <option value="Heavy Meals">🍛 Heavy Meals</option>
                    <option value="Snacks">🍟 Snacks</option>
                    <option value="Desserts">🍰 Desserts</option>
                    <option value="Beans">🫘 Beans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Kode Barcode Menu / SKU
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="PROD1234"
                      required
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono rounded-lg focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={generateRandomBarcode}
                      className="px-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black cursor-pointer uppercase font-sans"
                    >
                      Acak
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Modal Pokok (Cost Price IDR)
                  </label>
                  <input
                    type="number"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono font-bold rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Harga Jual (Retail Sell IDR)
                  </label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono font-bold rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Stok Porsi Jadi (Awal)
                  </label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Batas Minimum (Limit Warning)
                  </label>
                  <input
                    type="number"
                    value={prodWarningLimit}
                    onChange={(e) =>
                      setProdWarningLimit(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Catatan Racikan & Instruksi Seduh
                </label>
                <textarea
                  placeholder="Deskripsi porsi saji, rasa, atau cara pembuatan (Misal: Espresso 30ml, Fresh Milk 120ml, Aren 20ml)..."
                  value={prodKomposisi}
                  onChange={(e) => setProdKomposisi(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg h-12 resize-none"
                />
              </div>

              {/* INTEGRATED DYNAMIC COGS RECIPE BUILDER */}
              <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase flex items-center gap-1">
                    <Layers
                      size={11}
                      className="text-indigo-500 animate-pulse"
                    />
                    Koneksi Resep & Kalkulator HPP Real-time
                  </label>
                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    Bahan Baku POS
                  </span>
                </div>

                {/* Ingredient list */}
                {recipeIngredients.length > 0 ? (
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {recipeIngredients.map((ing, idx) => {
                      const mat = rawMaterials.find(
                        (m) => m.id === ing.materialId,
                      );
                      const costValue = mat ? ing.amount * mat.unitCost : 0;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded-lg shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="font-bold text-slate-700 text-[11px] truncate max-w-[150px]">
                              {mat?.name || "Bahan Baku"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({ing.amount} {mat?.stockUnit || "unit"})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-600 text-[10px]">
                              Rp {costValue.toLocaleString("id-ID")}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRecipeIngredients(
                                  recipeIngredients.filter((_, i) => i !== idx),
                                );
                              }}
                              className="text-red-500 hover:text-red-700 font-extrabold text-[10px] hover:underline cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center py-2.5 bg-white rounded-lg border border-slate-100">
                    Belum ada bahan baku terhubung. Tambahkan bahan di bawah
                    ini.
                  </p>
                )}

                {/* Add new ingredient item row */}
                <div className="bg-white p-2 rounded-xl border border-slate-100 flex gap-2 items-center">
                  <select
                    value={tempMaterialId}
                    onChange={(e) => setTempMaterialId(e.target.value)}
                    className="flex-1 px-2 py-1 border border-slate-200 bg-slate-50 rounded text-[10.5px] font-medium focus:outline-hidden"
                  >
                    <option value="">-- Pilih Bahan Baku --</option>
                    {rawMaterials.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.name} ({mat.stockUnit})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      placeholder="Vol"
                      value={tempAmount === 0 ? "" : tempAmount}
                      onChange={(e) => setTempAmount(Number(e.target.value))}
                      className="w-12 px-1.5 py-1 border border-slate-200 rounded text-[10.5px] text-center font-bold font-mono focus:outline-hidden"
                    />
                    <span className="text-[9.5px] text-slate-400 font-bold font-mono min-w-[20px]">
                      {rawMaterials.find((m) => m.id === tempMaterialId)
                        ?.stockUnit || ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!tempMaterialId)
                        return alert("Pilih bahan baku terlebih dahulu!");
                      if (tempAmount <= 0)
                        return alert(
                          "Jumlah pemanduan bahan harus lebih besar dari 0!",
                        );
                      const existIdx = recipeIngredients.findIndex(
                        (r) => r.materialId === tempMaterialId,
                      );
                      if (existIdx !== -1) {
                        const updated = [...recipeIngredients];
                        updated[existIdx].amount += tempAmount;
                        setRecipeIngredients(updated);
                      } else {
                        setRecipeIngredients([
                          ...recipeIngredients,
                          { materialId: tempMaterialId, amount: tempAmount },
                        ]);
                      }
                      setTempMaterialId("");
                      setTempAmount(0);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10.5px] font-black cursor-pointer transition-all active:scale-95 text-center shrink-0 uppercase"
                  >
                    + Hubung
                  </button>
                </div>

                {/* Real-time calculated margins & recommendation tracker */}
                {(() => {
                  const calculatedHPP = recipeIngredients.reduce(
                    (total, ing) => {
                      const mat = rawMaterials.find(
                        (m) => m.id === ing.materialId,
                      );
                      return total + (mat ? ing.amount * mat.unitCost : 0);
                    },
                    0,
                  );

                  const marginPct =
                    Number(prodPrice) > 0
                      ? ((Number(prodPrice) - calculatedHPP) /
                          Number(prodPrice)) *
                        100
                      : 0;

                  return (
                    <div className="p-2 bg-indigo-50/40 rounded-xl border border-indigo-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-bold">
                            HPP Resep:
                          </span>
                          <span className="font-mono font-black text-indigo-700 text-[10.5px]">
                            Rp {calculatedHPP.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400 font-medium">
                            Margin Jual:
                          </span>
                          <span
                            className={`text-[10px] font-extrabold ${
                              marginPct >= 70
                                ? "text-blue-600"
                                : marginPct >= 40
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                            }`}
                          >
                            {marginPct.toFixed(1)}%{" "}
                            {marginPct >= 70
                              ? "🟢 (Maksimum)"
                              : marginPct >= 40
                                ? "🟢 (Sehat)"
                                : "🔴 (Rendah)"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setProdCostPrice(Math.round(calculatedHPP))
                        }
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white font-extrabold rounded-lg cursor-pointer transition-all active:scale-95 text-center"
                      >
                        🔄 Sinkron Modal HPP
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* IMAGE UPLOADER SECURE PREVIEW IN ADD FORM */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Gambar Thumbnail Menu
                </label>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div className="col-span-2 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLocalImage(e, false)}
                      className="hidden"
                      id="add-image-uploader"
                    />
                    <label
                      htmlFor="add-image-uploader"
                      className="block px-3 py-2 border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg text-center cursor-pointer font-bold transition-all text-[11px]"
                    >
                      📁 Unggah File dari Hp / Laptop
                    </label>
                    <input
                      type="text"
                      placeholder="Atau tempel URL Link foto internet..."
                      value={prodImageUrl}
                      onChange={(e) => setProdImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-[10px]"
                    />
                  </div>
                  <div className="h-16 w-full rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden relative">
                    {prodImageUrl ? (
                      <>
                        <img
                          src={prodImageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/400x400/f8fafc/94a3b8?text=Produk+Tanpa+Foto";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setProdImageUrl("")}
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[9px] font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-medium italic text-center leading-tight">
                        Belum Ada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-4 justify-end border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Batal (Esc)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-850 font-bold text-white rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Unggah Menu Baru ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MENU MODAL FORM --- */}
      {showEditMenuModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto"
          id="edit-menu-modal"
          onClick={() => {
            setShowEditMenuModal(false);
            setEditingProduct(null);
          }}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl my-auto max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header with prominent close button */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Edit2 size={18} className="text-blue-500" />
                Sunting data & Gambar Menu Jual
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowEditMenuModal(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
                title="Tutup (Esc)"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleUpdateProduct}
              className="space-y-4 text-xs p-6 overflow-y-auto flex-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Nama Menu Jual
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-bold rounded-lg focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Kategori Menu
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-medium rounded-lg"
                  >
                    <option value="Coffee">☕ Coffee</option>
                    <option value="Non-Coffee">🥤 Non-Coffee</option>
                    <option value="Heavy Meals">🍛 Heavy Meals</option>
                    <option value="Snacks">🍟 Snacks</option>
                    <option value="Desserts">🍰 Desserts</option>
                    <option value="Beans">🫘 Beans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    SKU / Kode Barcode Meja
                  </label>
                  <input
                    type="text"
                    required
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Modal Pokok (Cost IDR)
                  </label>
                  <input
                    type="number"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Harga Jual (Sell IDR)
                  </label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Stok Tersedia
                  </label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Batas Minimum Peringatan
                  </label>
                  <input
                    type="number"
                    value={prodWarningLimit}
                    onChange={(e) =>
                      setProdWarningLimit(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Catatan Racikan & Instruksi Seduh
                </label>
                <textarea
                  placeholder="Deskripsi porsi saji, rasa, atau cara pembuatan (Misal: Espresso 30ml, Fresh Milk 120ml, Aren 20ml)..."
                  value={prodKomposisi}
                  onChange={(e) => setProdKomposisi(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg h-12 resize-none"
                />
              </div>

              {/* INTEGRATED DYNAMIC COGS RECIPE BUILDER */}
              <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase flex items-center gap-1">
                    <Layers
                      size={11}
                      className="text-indigo-500 animate-pulse"
                    />
                    Koneksi Resep & Kalkulator HPP Real-time
                  </label>
                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    Bahan Baku POS
                  </span>
                </div>

                {/* Ingredient list */}
                {recipeIngredients.length > 0 ? (
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {recipeIngredients.map((ing, idx) => {
                      const mat = rawMaterials.find(
                        (m) => m.id === ing.materialId,
                      );
                      const costValue = mat ? ing.amount * mat.unitCost : 0;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded-lg shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="font-bold text-slate-700 text-[11px] truncate max-w-[150px]">
                              {mat?.name || "Bahan Baku"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({ing.amount} {mat?.stockUnit || "unit"})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-600 text-[10px]">
                              Rp {costValue.toLocaleString("id-ID")}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRecipeIngredients(
                                  recipeIngredients.filter((_, i) => i !== idx),
                                );
                              }}
                              className="text-red-500 hover:text-red-700 font-extrabold text-[10px] hover:underline cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center py-2.5 bg-white rounded-lg border border-slate-100">
                    Belum ada bahan baku terhubung. Tambahkan bahan di bawah
                    ini.
                  </p>
                )}

                {/* Add new ingredient item row */}
                <div className="bg-white p-2 rounded-xl border border-slate-100 flex gap-2 items-center">
                  <select
                    value={tempMaterialId}
                    onChange={(e) => setTempMaterialId(e.target.value)}
                    className="flex-1 px-2 py-1 border border-slate-200 bg-slate-50 rounded text-[10.5px] font-medium focus:outline-hidden"
                  >
                    <option value="">-- Pilih Bahan Baku --</option>
                    {rawMaterials.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.name} ({mat.stockUnit})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      placeholder="Vol"
                      value={tempAmount === 0 ? "" : tempAmount}
                      onChange={(e) => setTempAmount(Number(e.target.value))}
                      className="w-12 px-1.5 py-1 border border-slate-200 rounded text-[10.5px] text-center font-bold font-mono focus:outline-hidden"
                    />
                    <span className="text-[9.5px] text-slate-400 font-bold font-mono min-w-[20px]">
                      {rawMaterials.find((m) => m.id === tempMaterialId)
                        ?.stockUnit || ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!tempMaterialId)
                        return alert("Pilih bahan baku terlebih dahulu!");
                      if (tempAmount <= 0)
                        return alert(
                          "Jumlah pemanduan bahan harus lebih besar dari 0!",
                        );
                      const existIdx = recipeIngredients.findIndex(
                        (r) => r.materialId === tempMaterialId,
                      );
                      if (existIdx !== -1) {
                        const updated = [...recipeIngredients];
                        updated[existIdx].amount += tempAmount;
                        setRecipeIngredients(updated);
                      } else {
                        setRecipeIngredients([
                          ...recipeIngredients,
                          { materialId: tempMaterialId, amount: tempAmount },
                        ]);
                      }
                      setTempMaterialId("");
                      setTempAmount(0);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10.5px] font-black cursor-pointer transition-all active:scale-95 text-center shrink-0 uppercase"
                  >
                    + Hubung
                  </button>
                </div>

                {/* Real-time calculated margins & recommendation tracker */}
                {(() => {
                  const calculatedHPP = recipeIngredients.reduce(
                    (total, ing) => {
                      const mat = rawMaterials.find(
                        (m) => m.id === ing.materialId,
                      );
                      return total + (mat ? ing.amount * mat.unitCost : 0);
                    },
                    0,
                  );

                  const marginPct =
                    Number(prodPrice) > 0
                      ? ((Number(prodPrice) - calculatedHPP) /
                          Number(prodPrice)) *
                        100
                      : 0;

                  return (
                    <div className="p-2 bg-indigo-50/40 rounded-xl border border-indigo-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-bold">
                            HPP Resep:
                          </span>
                          <span className="font-mono font-black text-indigo-700 text-[10.5px]">
                            Rp {calculatedHPP.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400 font-medium">
                            Margin Jual:
                          </span>
                          <span
                            className={`text-[10px] font-extrabold ${
                              marginPct >= 70
                                ? "text-blue-600"
                                : marginPct >= 40
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                            }`}
                          >
                            {marginPct.toFixed(1)}%{" "}
                            {marginPct >= 70
                              ? "🟢 (Maksimum)"
                              : marginPct >= 40
                                ? "🟢 (Sehat)"
                                : "🔴 (Rendah)"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setProdCostPrice(Math.round(calculatedHPP))
                        }
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white font-extrabold rounded-lg cursor-pointer transition-all active:scale-95 text-center"
                      >
                        🔄 Sinkron Modal HPP
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* IMAGE UPLOADER PREVIEW SECURE IN EDIT FORM */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Gambar Thumbnail Menu
                </label>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div className="col-span-2 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLocalImage(e, true)}
                      className="hidden"
                      id="edit-image-uploader"
                    />
                    <label
                      htmlFor="edit-image-uploader"
                      className="block px-3 py-2 border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg text-center cursor-pointer font-bold transition-all text-[11px]"
                    >
                      📁 Ganti Gambar dari File
                    </label>
                    <input
                      type="text"
                      placeholder="Atau ganti URL Link baru..."
                      value={prodImageUrl}
                      onChange={(e) => setProdImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-[10px]"
                    />
                  </div>
                  <div className="h-16 w-full rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden relative">
                    {prodImageUrl ? (
                      <>
                        <img
                          src={prodImageUrl}
                          alt="Pratinjau Edit"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/400x400/f8fafc/94a3b8?text=Produk+Tanpa+Foto";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setProdImageUrl("")}
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[9px] font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-medium italic text-center px-1">
                        Belum Ada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-4 justify-end border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditMenuModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Batal (Esc)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-850 font-bold text-white rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Simpan Perubahan Menu ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM GOOGLE DRIVE RESTORE CONFIRMATION MODAL */}
      {deleteProductPending && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          id="profile-delete-menu-confirm-modal"
          onClick={() => setDeleteProductPending(null)}
        >
          <div
            className="bg-white p-6 rounded-3xl w-full max-w-sm border border-slate-150 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-sans">
                    Hapus Menu
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Tindakan Destruktif
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteProductPending(null)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Apakah Anda yakin ingin menghapus menu{" "}
              <strong className="text-slate-900 font-semibold">
                "{deleteProductPending.name}"
              </strong>{" "}
              beserta seluruh gambarnya? Bahan racikan resep yang bersangkutan
              akan dilepas.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-50 text-xs font-sans">
              <button
                type="button"
                onClick={() => setDeleteProductPending(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-705 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteProduct}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 font-bold text-white rounded-xl transition-all cursor-pointer shadow-md shadow-rose-100"
              >
                Ya, Hapus Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
