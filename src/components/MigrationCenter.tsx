import React, { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  Download,
  Info,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";
import { useDataStore } from "../store/dataStore";
import { useUiStore } from "../store/uiStore";
import { Product, RawMaterial, Recipe } from "../types";

interface MappingState {
  name: string;
  category: string;
  price: string;
  costPrice: string;
  stock: string;
  barcode: string;
}

export default function MigrationCenter() {
  const { setProducts, setRawMaterials, setRecipes, addLedgerEvent, products } = useDataStore();
  const { triggerToast } = useUiStore();

  const [activePreset, setActivePreset] = useState<"Moka" | "Majoo" | "Pawoon" | "Custom">("Moka");
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<MappingState>({
    name: "Item Name",
    category: "Category",
    price: "Price",
    costPrice: "Cost Price (HPP)",
    stock: "Current Stock",
    barcode: "SKU / Barcode",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);

  // Sample data presets from existing Indonesian POS
  const loadPresetData = (preset: "Moka" | "Majoo" | "Pawoon") => {
    setActivePreset(preset);
    setImportSuccess(null);

    if (preset === "Moka") {
      const mokaHeaders = ["Item Name", "Category", "Price", "Cost Price (HPP)", "Current Stock", "SKU / Barcode"];
      const mokaRows = [
        { "Item Name": "Kopi Susu Gula Aren", Category: "Coffee", Price: "22000", "Cost Price (HPP)": "7500", "Current Stock": "80", "SKU / Barcode": "899201" },
        { "Item Name": "Avocado Coffee Float", Category: "Coffee", Price: "32000", "Cost Price (HPP)": "12000", "Current Stock": "40", "SKU / Barcode": "899202" },
        { "Item Name": "Iced Earl Grey Milk Tea", Category: "Non-Coffee", Price: "26000", "Cost Price (HPP)": "9500", "Current Stock": "50", "SKU / Barcode": "899203" },
        { "Item Name": "Almond Croissant", Category: "Snacks", Price: "28000", "Cost Price (HPP)": "13000", "Current Stock": "25", "SKU / Barcode": "899204" },
        { "Item Name": "V60 Filter Coffee Ethiopia", Category: "Coffee", Price: "35000", "Cost Price (HPP)": "14000", "Current Stock": "30", "SKU / Barcode": "899205" },
      ];
      setHeaders(mokaHeaders);
      setCsvRows(mokaRows);
      setMapping({
        name: "Item Name",
        category: "Category",
        price: "Price",
        costPrice: "Cost Price (HPP)",
        stock: "Current Stock",
        barcode: "SKU / Barcode",
      });
    } else if (preset === "Majoo") {
      const majooHeaders = ["Nama Menu", "Kelompok Kategori", "Harga Jual", "Harga Pokok Modal", "Stok Tersedia", "Kode Produk"];
      const majooRows = [
        { "Nama Menu": "Americano Ice Bold", "Kelompok Kategori": "Coffee", "Harga Jual": "24000", "Harga Pokok Modal": "6000", "Stok Tersedia": "60", "Kode Produk": "MJ-001" },
        { "Nama Menu": "Cafe Latte Hot", "Kelompok Kategori": "Coffee", "Harga Jual": "28000", "Harga Pokok Modal": "9500", "Stok Tersedia": "45", "Kode Produk": "MJ-002" },
        { "Nama Menu": "Red Velvet Latte", "Kelompok Kategori": "Non-Coffee", "Harga Jual": "30000", "Harga Pokok Modal": "10500", "Stok Tersedia": "35", "Kode Produk": "MJ-003" },
        { "Nama Menu": "Beef Pastry Roll", "Kelompok Kategori": "Snacks", "Harga Jual": "32000", "Harga Pokok Modal": "15000", "Stok Tersedia": "20", "Kode Produk": "MJ-004" },
      ];
      setHeaders(majooHeaders);
      setCsvRows(majooRows);
      setMapping({
        name: "Nama Menu",
        category: "Kelompok Kategori",
        price: "Harga Jual",
        costPrice: "Harga Pokok Modal",
        stock: "Stok Tersedia",
        barcode: "Kode Produk",
      });
    } else {
      const pawoonHeaders = ["Produk", "Kategori", "Harga", "Modal HPP", "Qty Stok", "Barcode"];
      const pawoonRows = [
        { Produk: "Manual Brew Kalita", Kategori: "Coffee", Harga: "30000", "Modal HPP": "11000", "Qty Stok": "40", Barcode: "PW-101" },
        { Produk: "Taro Blended Cream", Kategori: "Non-Coffee", Harga: "29000", "Modal HPP": "10000", "Qty Stok": "30", Barcode: "PW-102" },
      ];
      setHeaders(pawoonHeaders);
      setCsvRows(pawoonRows);
      setMapping({
        name: "Produk",
        category: "Kategori",
        price: "Harga",
        costPrice: "Modal HPP",
        stock: "Qty Stok",
        barcode: "Barcode",
      });
    }
  };

  // Handle custom CSV upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActivePreset("Custom");
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const fileHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        setHeaders(fileHeaders);

        const parsedRows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const obj: any = {};
          fileHeaders.forEach((h, idx) => {
            obj[h] = values[idx] || "";
          });
          parsedRows.push(obj);
        }
        setCsvRows(parsedRows);

        // Auto guess mapping
        setMapping({
          name: fileHeaders.find((h) => /name|nama|item|produk/i.test(h)) || fileHeaders[0] || "",
          category: fileHeaders.find((h) => /cat|kategori/i.test(h)) || fileHeaders[1] || "",
          price: fileHeaders.find((h) => /price|harga|jual/i.test(h)) || fileHeaders[2] || "",
          costPrice: fileHeaders.find((h) => /cost|modal|hpp/i.test(h)) || fileHeaders[3] || "",
          stock: fileHeaders.find((h) => /stock|stok|qty/i.test(h)) || fileHeaders[4] || "",
          barcode: fileHeaders.find((h) => /barcode|sku|kode/i.test(h)) || fileHeaders[5] || "",
        });
      }
    };
    reader.readAsText(file);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (!mapping.name || !mapping.price) {
      alert("Kolom Nama Menu dan Harga Jual wajib dipetakan.");
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const newProducts: Product[] = [];
      const newRawMaterials: RawMaterial[] = [];
      const newRecipes: Recipe[] = [];
      const now = new Date();
      const businessDate = now.toISOString().split("T")[0];

      csvRows.forEach((row, idx) => {
        const name = String(row[mapping.name] || "").trim();
        if (!name) return;

        const price = parseFloat(String(row[mapping.price]).replace(/[^0-9.]/g, "")) || 20000;
        const costPrice = parseFloat(String(row[mapping.costPrice] || "").replace(/[^0-9.]/g, "")) || Math.round(price * 0.35);
        const stock = parseInt(String(row[mapping.stock] || "").replace(/[^0-9]/g, "")) || 50;
        const barcode = String(row[mapping.barcode] || `MIG-${idx + 100}`).trim();
        const category = (row[mapping.category] || "Coffee") as any;

        const prodId = `mig-prod-${Date.now()}-${idx}`;
        const matId = `mig-mat-${Date.now()}-${idx}`;

        newProducts.push({
          id: prodId,
          name,
          category,
          price,
          costPrice,
          stock,
          warningLimit: 10,
          barcode,
          supplierName: "Supplier Migrasi",
          supplierContact: "-",
        });

        // Create initial corresponding raw material baseline
        newRawMaterials.push({
          id: matId,
          name: `Bahan ${name}`,
          stockQuantity: stock * 20, // initial stock in grams/units
          stockUnit: "g",
          warningLimit: 500,
          unitCost: Math.round(costPrice / 18),
          supplierName: "Supplier Migrasi",
          supplierContact: "-",
        });

        // Link initial recipe BOM
        newRecipes.push({
          productId: prodId,
          ingredients: [{ materialId: matId, amount: 18 }],
          notes: `Migrated from ${activePreset}`,
        });

        // Record Initial Baseline into Chronological Event Ledger
        addLedgerEvent({
          businessDate,
          itemId: matId,
          itemName: `Bahan ${name}`,
          movementType: "MIGRATION_BASELINE",
          referenceType: "MIGRATION",
          referenceId: `MIG-${activePreset.toUpperCase()}-${idx + 1}`,
          qtyChange: stock * 20,
          unitCost: Math.round(costPrice / 18),
          totalCostImpact: stock * costPrice,
          balanceAfter: stock * 20,
          unit: "g",
          operatorRole: "Owner",
          operatorName: "Migrasi Onboarding",
          notes: `Saldo awal migrasi data dari ${activePreset} POS`,
          isImmutable: true,
        });
      });

      // Update data store with migrated data
      setProducts([...newProducts, ...products]);
      setImportSuccess(newProducts.length);
      setIsProcessing(false);
      triggerToast(`✅ Berhasil mengimpor ${newProducts.length} menu dari ${activePreset} ke LedgerLine!`);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Onboarding Engine · Migration Center
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300">Pusat Migrasi Data F&B</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Konversi Data Massal POS Lama ke LedgerLine
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Pindah dari Moka POS, Majoo, Pawoon, Olsera, atau spreadsheet Excel tanpa repot ketik ulang.
            Sistem otomatis memetakan menu, harga jual, estimasi HPP, dan membuat saldo awal Event-Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <Database className="text-amber-400" size={24} />
          <div className="text-xs">
            <div className="font-bold text-white">Zero Data Loss</div>
            <div className="text-slate-400">Jejak audit tersimpan rapi</div>
          </div>
        </div>
      </div>

      {/* Preset Selector & File Upload */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            1. Pilih Sumber Data POS Lama:
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {[
              { id: "Moka", label: "Moka POS (CSV)", desc: "Export Produk & HPP" },
              { id: "Majoo", label: "Majoo POS (Excel/CSV)", desc: "Katalog & Bahan" },
              { id: "Pawoon", label: "Pawoon POS (CSV)", desc: "Export Menu" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => loadPresetData(p.id as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activePreset === p.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    activePreset === p.id ? "text-amber-400" : "text-slate-400"
                  }`}
                >
                  {p.desc}
                </div>
              </button>
            ))}

            <label className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer flex flex-col justify-center text-left">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UploadCloud size={14} className="text-indigo-600" />
                Upload CSV Sendiri
              </span>
              <span className="text-[10px] text-slate-400">File format .csv Anda</span>
            </label>
          </div>
        </div>

        {/* Column Mapping Section */}
        {headers.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              2. Pemetaan Kolom (Column Mapping):
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Cocokkan kolom dari file sumber Anda dengan field standar LedgerLine:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: "name", label: "Nama Menu *" },
                { key: "category", label: "Kategori" },
                { key: "price", label: "Harga Jual *" },
                { key: "costPrice", label: "Modal / HPP" },
                { key: "stock", label: "Stok Barang Jadi" },
                { key: "barcode", label: "SKU / Barcode" },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    {field.label}
                  </label>
                  <select
                    value={(mapping as any)[field.key]}
                    onChange={(e) =>
                      setMapping({ ...mapping, [field.key]: e.target.value })
                    }
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800"
                  >
                    <option value="">-- Lewati Kolom --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Preview Table */}
        {csvRows.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Pratinjau Data ({csvRows.length} Baris Siap Diimpor)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Data berikut akan dimasukkan ke katalog produk dan Event-Ledger awal:
                </p>
              </div>

              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Mengonversi Data...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Eksekusi Impor ke LedgerLine
                  </>
                )}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Nama Menu</th>
                    <th className="px-3.5 py-2.5">Kategori</th>
                    <th className="px-3.5 py-2.5 text-right">Harga Jual</th>
                    <th className="px-3.5 py-2.5 text-right">HPP Modal</th>
                    <th className="px-3.5 py-2.5 text-right">Stok</th>
                    <th className="px-3.5 py-2.5">Barcode / SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="px-3.5 py-2 font-semibold text-slate-900">
                        {row[mapping.name] || "-"}
                      </td>
                      <td className="px-3.5 py-2 text-slate-600">
                        {row[mapping.category] || "General"}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-medium text-slate-800">
                        Rp {Number(String(row[mapping.price] || "0").replace(/[^0-9]/g, "")).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-slate-600">
                        Rp {Number(String(row[mapping.costPrice] || "0").replace(/[^0-9]/g, "")).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-slate-700">
                        {row[mapping.stock] || 0}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-slate-500 text-[11px]">
                        {row[mapping.barcode] || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {importSuccess !== null && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>
                <strong>Migrasi Berhasil!</strong> {importSuccess} menu berhasil dikonversi dan
                dicatat ke dalam Event-Ledger baseline toko Anda.
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-700 font-bold">
              Ledger Baseline Seeded
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
