import React, { useState, useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { useDataStore } from "../../store/dataStore";
import { Product } from "../../types";
import { Package, X, Upload } from "lucide-react";
import { getMenuItemImage } from "../../utils/menuImages";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  productToEdit?: Product | null;
}

export function AddProductModal({
  isOpen,
  onClose,
  onRefresh,
  productToEdit,
}: Props) {
  const { triggerToast } = useUiStore();
  const { addProduct, updateProduct } = useDataStore();
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Product["category"]>("Coffee");
  const [price, setPrice] = useState(20000);
  const [costPrice, setCostPrice] = useState(10000);
  const [stock, setStock] = useState(50);
  const [warningLimit, setWarningLimit] = useState(10);
  const [barcode, setBarcode] = useState("");
  const [komposisi, setKomposisi] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setCategory((productToEdit.category || "Coffee") as Product["category"]);
      setPrice(productToEdit.price || 0);
      setCostPrice(productToEdit.costPrice || 0);
      setStock(productToEdit.stock ?? 50);
      setWarningLimit(productToEdit.warningLimit ?? 10);
      setBarcode(productToEdit.barcode || "");
      setKomposisi(productToEdit.komposisi || "");
      setImageUrl(productToEdit.imageUrl || "");
    } else {
      setName("");
      setCategory("Coffee");
      setPrice(25000);
      setCostPrice(9000);
      setStock(50);
      setWarningLimit(10);
      setBarcode("899" + Math.floor(1000 + Math.random() * 9000));
      setKomposisi("");
      setImageUrl("");
    }
  }, [productToEdit, isOpen]);

  // Keyboard shortcut listener: close modal with Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        triggerToast("Gambar terlalu besar! Maksimum ukuran file adalah 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast("Nama menu tidak boleh kosong!");
      return;
    }

    setIsSaving(true);
    const finalImageUrl = imageUrl || getMenuItemImage({ name, category });

    const payload: Product = {
      id: productToEdit ? productToEdit.id : `prod-${Date.now()}`,
      name: name.trim(),
      category,
      price: Number(price),
      costPrice: Number(costPrice),
      stock: Number(stock),
      warningLimit: Number(warningLimit),
      barcode: barcode || "899" + Math.floor(1000 + Math.random() * 9000),
      komposisi: komposisi || undefined,
      imageUrl: finalImageUrl,
      supplierName: productToEdit?.supplierName || "Internal Roastery",
      supplierContact: productToEdit?.supplierContact || "-",
    };

    try {
      if (productToEdit) {
        updateProduct(payload);
        triggerToast(`Selesai: Menu "${name}" berhasil diperbarui!`);
      } else {
        addProduct(payload);
        triggerToast(`Selesai: Menu "${name}" berhasil ditambahkan!`);
      }

      // Try server sync
      try {
        const savedStore = localStorage.getItem("aslam_ledger_current_store");
        const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";
        const endpoint = productToEdit
          ? `/api/products/${productToEdit.id}`
          : "/api/products";
        const method = productToEdit ? "PUT" : "POST";

        await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-Id": tenantId,
          },
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        // Offline-first grace
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      triggerToast("Gagal menyimpan menu: " + err.message);
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
        className="bg-white p-6 rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
            <Package size={20} className="text-amber-500" />
            {productToEdit ? "Edit Menu / Produk Jual" : "Tambah Menu Jual Baru"}
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
              Nama Menu / Minuman
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-hidden focus:border-slate-400"
              placeholder="Contoh: Cappuccino Caramel Macchiato"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Product["category"])}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-hidden"
              >
                <option value="Coffee">Coffee</option>
                <option value="Non-Coffee">Non-Coffee</option>
                <option value="Heavy Meals">Heavy Meals</option>
                <option value="Snacks">Snacks</option>
                <option value="Desserts">Desserts</option>
                <option value="Beans">Beans</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Barcode / SKU
              </label>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono focus:outline-hidden"
                placeholder="Auto atau scan barcode"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Harga Jual (Rp)
              </label>
              <input
                type="number"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono font-bold text-slate-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Modal Dasar HPP (Rp)
              </label>
              <input
                type="number"
                required
                min={0}
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono text-slate-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stok Fisik Tersedia
              </label>
              <input
                type="number"
                required
                min={0}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batas Peringatan Minimum
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Komposisi / Resep Singkat
            </label>
            <input
              value={komposisi}
              onChange={(e) => setKomposisi(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-hidden"
              placeholder="Contoh: Double shot espresso + 180ml fresh milk"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Foto Menu Produk
            </label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                <img
                  src={imageUrl || getMenuItemImage({ name, category })}
                  alt="Preview Menu"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL Foto (https://...) atau unggah berkas"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-mono focus:outline-hidden"
                />
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition">
                  <Upload size={12} />
                  <span>Unggah dari Komputer (Maks 2MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
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
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {isSaving
                ? "Menyimpan..."
                : productToEdit
                  ? "Simpan Perubahan"
                  : "+ Tambah Menu Jual"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
