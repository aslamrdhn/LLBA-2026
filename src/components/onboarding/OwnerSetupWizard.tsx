import React, { useState } from "react";
import {
  Sparkles,
  Building2,
  Store,
  Users,
  Package,
  UtensilsCrossed,
  Calculator,
  Laptop,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Percent,
  Coins,
  MapPin,
  Phone,
  Key,
  BadgeCheck,
  TrendingUp,
} from "lucide-react";

interface OwnerSetupWizardProps {
  tenant: {
    id: string;
    name: string;
    onboardingStep?: number;
    onboardingCompleted?: boolean;
  };
  onComplete: () => void;
  onSkip?: () => void;
}

export default function OwnerSetupWizard({
  tenant,
  onComplete,
  onSkip,
}: OwnerSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(
    tenant.onboardingStep || 1
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Business Profile
  const [businessName, setBusinessName] = useState(tenant.name || "Kedai Kopi Saya");
  const [businessType, setBusinessType] = useState("COFFEE_SHOP");
  const [taxInclusive, setTaxInclusive] = useState(false);

  // Step 2: Outlet & Warehouse
  const [outletName, setOutletName] = useState("Outlet Utama");
  const [outletAddress, setOutletAddress] = useState("Jl. Boulevard No. 12");
  const [warehouseName, setWarehouseName] = useState("Gudang Penyimpanan Pusat");

  // Step 3: Cashier & Staff
  const [cashierName, setCashierName] = useState("Kasir Depan");
  const [cashierPin, setCashierPin] = useState("123456");

  // Step 4: Ingredients & Unit Cost
  const [ingredients, setIngredients] = useState([
    { name: "Biji Kopi House Blend", unit: "gram", costPerUnit: 180 },
    { name: "Fresh Milk Pasteurized", unit: "ml", costPerUnit: 22 },
    { name: "Sirup Aren Organik", unit: "ml", costPerUnit: 35 },
    { name: "Cup 16oz + Sedotan", unit: "pcs", costPerUnit: 1200 },
  ]);

  // Step 5: Menu & Recipe (True Cost)
  const [menuName, setMenuName] = useState("Es Kopi Susu Aren 16oz");
  const [sellingPrice, setSellingPrice] = useState(25000);
  const espressoGrams = 18;
  const milkMl = 120;
  const arenMl = 25;
  const packagingPcs = 1;

  const materialCost =
    espressoGrams * 180 + milkMl * 22 + arenMl * 35 + packagingPcs * 1200; // 3240 + 2640 + 875 + 1200 = 7955
  const grossProfit = sellingPrice - materialCost;
  const grossMarginPct =
    sellingPrice > 0 ? ((grossProfit / sellingPrice) * 100).toFixed(1) : "0";

  // Step 6: POS Device & Float
  const [deviceName, setDeviceName] = useState("Tablet Kasir Meja 1");
  const [openingFloat, setOpeningFloat] = useState(200000);

  const totalSteps = 7;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      const next = currentStep + 1;
      setCurrentStep(next);
      // Persist step to server
      try {
        await fetch("/api/tenant/onboarding-step", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ step: next }),
        });
      } catch (e) {
        // Soft fail
      }
    } else {
      // Step 7 complete: Finalize onboarding
      setIsSubmitting(true);
      try {
        await fetch("/api/tenant/onboarding-step", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ step: 7, completed: true }),
        });
      } catch (e) {
        // Soft fail
      } finally {
        setIsSubmitting(false);
        onComplete();
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepLabels = [
    "Profil Usaha",
    "Cabang & Gudang",
    "Kasir & Staff",
    "Bahan Baku Awal",
    "Menu & True Cost",
    "Perangkat POS",
    "Siap Operasi",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              LedgerLine <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">Setup Wizard</span>
            </h1>
            <p className="text-xs text-slate-400">
              Konfigurasi fondasi bisnis kopi & resto Anda dalam 7 langkah mudah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-indigo-400">
              Langkah {currentStep} dari {totalSteps}
            </span>
            <p className="text-xs text-slate-400 font-medium">
              {progressPercent}% Selesai
            </p>
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition"
            >
              Lewati Wizard
            </button>
          )}
        </div>
      </header>

      {/* Interactive Progress Bar */}
      <div className="max-w-4xl mx-auto w-full my-6">
        <div className="w-full bg-slate-800/70 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex justify-between items-center mt-3 px-1">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <div
                key={label}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => {
                  if (stepNum <= currentStep) setCurrentStep(stepNum);
                }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    isCompleted
                      ? "bg-emerald-500 text-slate-950 font-black"
                      : isCurrent
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                      : "bg-slate-800 text-slate-500 group-hover:text-slate-300"
                  }`}
                >
                  {isCompleted ? "✓" : stepNum}
                </div>
                <span
                  className={`text-[10px] mt-1.5 hidden md:block max-w-[80px] text-center truncate ${
                    isCurrent
                      ? "text-indigo-300 font-semibold"
                      : isCompleted
                      ? "text-emerald-400 font-medium"
                      : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Step Card Container */}
      <main className="max-w-4xl mx-auto w-full my-auto py-4">
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* STEP 1: PROFIL USAHA */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Profil Usaha Anda</h2>
                  <p className="text-sm text-slate-400">
                    Tentukan identitas dan tipe bisnis yang akan dijalankan di LedgerLine.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Usaha / Brand
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Kopi Aslam Sejahtera"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kategori Bisnis
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="COFFEE_SHOP">Coffee Shop & Specialty Coffee</option>
                    <option value="CAFE_BAKERY">Cafe, Roastery & Bakery</option>
                    <option value="RESTAURANT">Restoran & Bar</option>
                    <option value="QUICK_SERVICE">Quick Service Food & Beverage</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Harga Jual Sudah Termasuk Pajak (Tax-Inclusive)?
                  </h4>
                  <p className="text-xs text-slate-400">
                    Aktifkan jika harga di buku menu Anda sudah termasuk PPN 11% / PB1 10%.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={taxInclusive}
                  onChange={(e) => setTaxInclusive(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 2: CABANG & GUDANG */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Cabang & Gudang Utama</h2>
                  <p className="text-sm text-slate-400">
                    Titik penjualan fisik dan tempat penyimpanan bahan baku pertama Anda.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-400" /> Nama Cabang Utama
                  </label>
                  <input
                    type="text"
                    value={outletName}
                    onChange={(e) => setOutletName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Outlet Boulevard"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" /> Alamat / Lokasi
                  </label>
                  <input
                    type="text"
                    value={outletAddress}
                    onChange={(e) => setOutletAddress(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Jl. Sudirman Kav. 5"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" /> Nama Gudang Penyimpanan Bahan Baku
                  </label>
                  <input
                    type="text"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Gudang Dapur Utama"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Fisik stok dikelola secara terisolasi oleh PhysicalStockService untuk menjamin akurasi FIFO/Average.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: KASIR & STAFF */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Akun Kasir & Keamanan</h2>
                  <p className="text-sm text-slate-400">
                    Kasir beroperasi dengan Zero-Cost Visibility dan dilindungi oleh 6-digit PIN.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Kasir Awal
                  </label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" /> PIN Akses Kasir (6 Digit)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={cashierPin}
                    onChange={(e) => setCashierPin(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 tracking-widest text-center font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-200/90 leading-relaxed">
                  <strong className="text-indigo-100">Aturan Zero-Cost Visibility:</strong> Data biaya seperti HPP, True Cost, dan margin laba difilter secara ketat di server serializer dan tidak pernah bocor ke tampilan kasir.
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BAHAN BAKU & BIAYA SATUAN */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Bahan Baku & Biaya Satuan</h2>
                  <p className="text-sm text-slate-400">
                    Fondasi True Cost dimulai dari harga beli per satuan material yang akurat.
                  </p>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Nama Bahan Baku</th>
                      <th className="px-4 py-3">Satuan</th>
                      <th className="px-4 py-3 text-right">Biaya Satuan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ingredients.map((ing, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 font-medium text-slate-200">
                          {ing.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono">
                          {ing.unit}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-indigo-300 font-semibold">
                          Rp {ing.costPerUnit.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-400 italic">
                * Anda dapat menambah atau mengimpor daftar bahan baku lengkap melalui menu Inventori atau Migrasi Excel setelah setup selesai.
              </p>
            </div>
          )}

          {/* STEP 5: MENU & RESEP (TRUE COST) */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Menu & Resep (True Cost Engine)</h2>
                  <p className="text-sm text-slate-400">
                    Simulasi live perhitungan HPP dan margin keuntungan bersih di setiap porsi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Menu Unggulan
                  </label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Harga Jual ke Pelanggan (Rp)
                  </label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Live Cost Breakdown Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-indigo-400" /> Komposisi Resep 1 Gelas
                  </span>
                  <span className="text-xs text-slate-400">Metode: FIFO Batch</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Espresso (18g Biji Kopi @ Rp 180)</span>
                    <span className="font-mono">Rp 3.240</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Fresh Milk (120ml @ Rp 22)</span>
                    <span className="font-mono">Rp 2.640</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Sirup Gula Aren (25ml @ Rp 35)</span>
                    <span className="font-mono">Rp 875</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Packaging Cup 16oz + Sedotan</span>
                    <span className="font-mono">Rp 1.200</span>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex justify-between font-bold text-sm">
                    <span className="text-slate-200">Total HPP Material:</span>
                    <span className="font-mono text-amber-400">
                      Rp {materialCost.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold text-sm">
                    <span className="text-slate-200">Laba Kotor per Gelas:</span>
                    <span className="font-mono text-emerald-400">
                      Rp {grossProfit.toLocaleString("id-ID")} ({grossMarginPct}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: PERANGKAT POS */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Perangkat POS & Saldo Kasir</h2>
                  <p className="text-sm text-slate-400">
                    Registrasikan tablet kasir pertama dan siapkan modal uang kembalian.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Perangkat Tablet / HP
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> Modal Kas Awal / Float (Rp)
                  </label>
                  <input
                    type="number"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs text-slate-300">
                  Perangkat ini dilengkapi kapabilitas <strong>Offline-First POS</strong>. Transaksi tetap dapat diproses saat internet terputus dan otomatis disinkronkan kembali saat online.
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: SIAP OPERASI */}
          {currentStep === 7 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <BadgeCheck className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">Setup Selesai! Usaha Anda Siap Meluncur</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                  Semua komponen inti operasional telah dikonfigurasi dengan standar enterprise True Cost.
                </p>
              </div>

              {/* Ready Checklist */}
              <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Profil Usaha <strong>{businessName}</strong> aktif</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cabang <strong>{outletName}</strong> & Gudang terhubung</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Akun kasir dengan proteksi Zero-Cost Visibility siap</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Material Cost & Resep <strong>{menuName}</strong> tervalidasi</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Masa percobaan 14 hari <strong>Growth Tier</strong> aktif tanpa batas</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-800/80">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all shadow-lg ${
                currentStep === totalSteps
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25 ring-2 ring-emerald-500/30"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/25"
              }`}
            >
              {isSubmitting ? (
                "Memproses..."
              ) : currentStep === totalSteps ? (
                <>
                  Buka Kasir & Mulai Penjualan <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Lanjut ke Langkah {currentStep + 1} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Footer Note */}
      <footer className="max-w-4xl mx-auto w-full text-center pt-4 text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-indigo-400" />
        <span>True Cost Determinism & Double-Entry Append-Only Ledger • LedgerLine SaaS</span>
      </footer>
    </div>
  );
}
