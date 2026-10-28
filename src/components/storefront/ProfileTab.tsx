import { useUiStore } from "../../store/uiStore";
import React, { useState } from "react";
import {
  Building,
  MapPin,
  Wifi,
  Scale,
  CheckCircle,
  Award,
  User,
  Palette,
  Trash2,
  PlusCircle,
  Search,
  Image as ImageIcon,
  Tag,
  Coffee,
  Check,
  AlertTriangle,
  LayoutGrid,
  FileText,
  UserCheck,
  Edit2,
  Lock,
  Phone,
  Layers,
  Sparkles,
  ShoppingBag,
  Eye,
  Info,
  Cloud,
  Database,
  Terminal,
  ExternalLink,
  RefreshCw,
  Globe,
  Mail,
  BookOpen,
  HelpCircle,
  QrCode,
} from "lucide-react";
import { AppConfig } from "../../types";

interface ProfileTabProps {
  appConfig: AppConfig;
  onUpdateConfig: (cfg: Partial<AppConfig>) => void;
}

export function ProfileTab({ appConfig, onUpdateConfig }: ProfileTabProps) {
  const {
    triggerToast,
    logAuditActivity,
    auditLogs,
    setAuditLogs,
    clearAuditLogs,
  } = useUiStore();

  const [storeName, setStoreName] = useState<string>(appConfig.storeName || "");
  const [storeAddress, setStoreAddress] = useState<string>(
    appConfig.storeAddress || "",
  );
  const [storePhone, setStorePhone] = useState<string>(
    appConfig.storePhone || "",
  );
  const [storeWifiName, setStoreWifiName] = useState<string>(
    appConfig.storeWifiName || "",
  );
  const [storeWifiPass, setStoreWifiPass] = useState<string>(
    appConfig.storeWifiPass || "",
  );
  const [qrisMerchantName, setQrisMerchantName] = useState<string>(
    appConfig.qrisMerchantName || "",
  );
  const [qrisProvider, setQrisProvider] = useState<string>(
    appConfig.qrisProvider || "",
  );
  const [qrisBankName, setQrisBankName] = useState<string>(
    appConfig.qrisBankName || "",
  );
  const [qrisImage, setQrisImage] = useState<string>(appConfig.qrisImage || "");

  const [cashierName, setCashierName] = useState<string>(
    appConfig.cashierName || "Aslam Ramadhan",
  );
  const [cashierRole, setCashierRole] = useState<string>(
    appConfig.cashierRole || "Head Barista & Admin",
  );
  const [cashierShift, setCashierShift] = useState<string>(
    appConfig.cashierShift || "Sore (Afternoon)",
  );
  const [cashierPhone, setCashierPhone] = useState<string>(
    appConfig.cashierPhone || "+62 812-4455-6677",
  );
  const [cashierPin, setCashierPin] = useState<string>(
    appConfig.cashierPin || "1234",
  );
  const [cashierAvatar, setCashierAvatar] = useState<string>(
    appConfig.cashierAvatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
  );

  const [taxType, setTaxType] = useState<"PPN" | "PB1" | "Kustom" | "NON">(
    appConfig.taxType || "PPN",
  );
  const [taxRateCustom, setTaxRateCustom] = useState<number>(
    appConfig.taxRateCustom !== undefined ? appConfig.taxRateCustom : 11,
  );
  const [receiptHeader, setReceiptHeader] = useState<string>(
    appConfig.receiptHeader || "",
  );
  const [receiptFooter, setReceiptFooter] = useState<string>(
    appConfig.receiptFooter || "",
  );
  const [initialCapital, setInitialCapital] = useState<number>(
    appConfig.initialCapital !== undefined
      ? appConfig.initialCapital
      : 15000000,
  );
  const [cashRegisterFund, setCashRegisterFund] = useState<number>(
    appConfig.cashRegisterFund !== undefined
      ? appConfig.cashRegisterFund
      : 500000,
  );

  const avatarPresets = [
    {
      name: "Srikandi Barista",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
    },
    {
      name: "Gatotkaca Espresso",
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
    },
    {
      name: "Arimbi Matcha",
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
    },
    {
      name: "Bima Latte Art",
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop",
    },
  ];

  const handleSaveProfileAndBiodata = () => {
    onUpdateConfig({
      storeName,
      storeAddress,
      storePhone,
      storeWifiName,
      storeWifiPass,
      qrisMerchantName,
      qrisProvider,
      qrisBankName,
      qrisImage,
      cashierName,
      cashierRole,
      cashierShift,
      cashierPhone,
      cashierPin,
      cashierAvatar,
      taxType,
      taxRateCustom,
      receiptHeader,
      receiptFooter,
      initialCapital,
      cashRegisterFund,
    });
    triggerToast(
      "Profil kedai, Biodata admin, & Permodalan Neraca berhasil diperbarui!",
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        {/* PROFILE KEDAI KOPI (Col 7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-150 border-slate-200/50 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 bg-slate-100 flex items-center justify-center rounded-lg text-slate-800">
              <Building size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-none">
                Informasi Autentik Kedai Kopi
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Definisikan merek dan informasi struk pencetakan bluetooth.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Nama Kedai Kopi (Store Brand)
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 font-bold text-slate-800 rounded-xl focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Alamat Lengkap Operasional
              </label>
              <textarea
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 font-medium text-slate-700 rounded-xl h-16 resize-none focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Nomor WhatsApp Usaha
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 font-mono font-medium rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/70 flex items-start gap-2 text-[11px] text-amber-800">
              <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <p className="leading-snug">
                Data ini otomatis terpaku di struk kertas BT Bluetooth Thermal
                Printer pasca kasir checkout.
              </p>
            </div>

            {/* Wi-Fi Settings */}
            <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Wifi size={14} className="text-slate-600" />
                Kredensial Wi-Fi Pelanggan (Otomatis QR)
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Nama SSID Wifi
                  </label>
                  <input
                    type="text"
                    value={storeWifiName}
                    onChange={(e) => setStoreWifiName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-medium text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Password Wifi
                  </label>
                  <input
                    type="password"
                    value={storeWifiPass}
                    onChange={(e) => setStoreWifiPass(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-mono text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Pusat Pembayaran QRIS Mandiri (BYO QRIS Setup) */}
            <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <QrCode size={14} className="text-slate-600" />
                Pusat Pembayaran LedgerLine Smart Table (BYO QRIS)
              </p>
              <p className="text-[10.5px] text-slate-500 font-sans leading-normal">
                Konfigurasikan kanal QRIS mandiri kedai Anda. Pengunjung Smart
                Table akan memindai kode QRIS e-wallet/m-banking Anda, lalu
                kasir mengonfirmasi transaksi secara lokal.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Nama Merchant (Label Banner QRIS)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: ASLAM BREW KEMANG"
                    value={qrisMerchantName}
                    onChange={(e) => setQrisMerchantName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-medium text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Penyedia Layanan (Acquirer)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: ShopeePay, GPN, Bank BNI"
                    value={qrisProvider}
                    onChange={(e) => setQrisProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-medium text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Nama Bank Penerima
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bank Indonesia (E-Wallet)"
                    value={qrisBankName}
                    onChange={(e) => setQrisBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-medium text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    URL Scan Gambar QRIS (Upload/Tautan Digital)
                  </label>
                  <input
                    type="text"
                    placeholder="Masukan URL Gambar QRIS Toko Anda..."
                    value={qrisImage}
                    onChange={(e) => setQrisImage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-mono text-slate-800 rounded-lg focus:outline-hidden text-[10.5px]"
                  />
                </div>
              </div>
            </div>

            {/* Pajak & Fiskal Indonesia (Indonesian Fiscal Settings) */}
            <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Scale size={14} className="text-indigo-650 text-indigo-600" />
                Konfigurasi Pajak & Fiskal Usaha (Indonesia)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Skema Pajak
                  </label>
                  <select
                    value={taxType}
                    onChange={(e) => {
                      const val = e.target.value as
                        "PPN" | "PB1" | "Kustom" | "NON";
                      setTaxType(val);
                      if (val === "PPN") setTaxRateCustom(11);
                      else if (val === "PB1") setTaxRateCustom(10);
                      else if (val === "NON") setTaxRateCustom(0);
                    }}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-bold text-slate-800 rounded-lg focus:outline-hidden"
                  >
                    <option value="PPN">PPN 11% (Standar Retail & Jasa)</option>
                    <option value="PB1">
                      PB1 / Pajak Resto 10% (Standar F&B / Cafe)
                    </option>
                    <option value="Kustom">Pajak Persentase Kustom</option>
                    <option value="NON">Bebas Pajak / Tax-Free</option>
                  </select>
                </div>
                {taxType === "Kustom" && (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Tarif Pajak Kustom (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={taxRateCustom}
                      onChange={(e) =>
                        setTaxRateCustom(
                          Math.min(
                            100,
                            Math.max(0, parseInt(e.target.value) || 0),
                          ),
                        )
                      }
                      className="w-full px-3 py-2 border border-slate-250 bg-white font-mono font-bold text-slate-800 rounded-lg focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
              <p className="text-[9.5px] italic text-slate-400 leading-snug">
                * PB1 sebesar 10% direkomendasikan jika usaha Anda berbentuk
                cafe/restoran, sedangkan PPN 11% direkomendasikan jika usaha
                Anda berbadan usaha wajib pajak (PKP).
              </p>
            </div>

            {/* Kustomisasi Template Kertas Struk / thermal receipt */}
            <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText
                  size={14}
                  className="text-indigo-650 text-indigo-600"
                />
                Kustomisasi Kepala & Kaki Struk Thermal
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Kepala Struk (Header Note)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Sajian Istimewa Setiap Hari"
                    value={receiptHeader}
                    onChange={(e) => setReceiptHeader(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-medium text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Kaki Struk (Footer Note)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kritik/Saran Hub WA: 0812..."
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-medium text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>
              <p className="text-[9.5px] italic text-slate-400 leading-snug">
                * Kalimat ini akan muncul secara otomatis di struk cetak kasir
                digital maupun printer fisik thermal (Bluetooth/WiFi) setelah
                checkout pembayaran.
              </p>
            </div>

            {/* Konfigurasi Permodalan & Neraca EMKM */}
            <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Database
                  size={14}
                  className="text-indigo-650 text-indigo-605 text-indigo-600"
                />
                Konfigurasi Permodalan & Neraca Awal (Akuntansi Buku Kas)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Modal Awal Pemilik / Usaha (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: Rp 15.000.000"
                    value={initialCapital}
                    onChange={(e) =>
                      setInitialCapital(
                        Math.max(0, parseInt(e.target.value) || 0),
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-mono font-bold text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Uang Laci Kasir Awal (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: Rp 500.000"
                    value={cashRegisterFund}
                    onChange={(e) =>
                      setCashRegisterFund(
                        Math.max(0, parseInt(e.target.value) || 0),
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-250 bg-white font-mono font-bold text-slate-800 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>
              <p className="text-[9.5px] italic text-slate-400 leading-snug">
                * Porsi Modal Awal digunakan oleh Laporan Neraca (Balance Sheet)
                sebagai Pasiva Ekuitas Pemilik, sedangkan Uang Laci Kasir Awal
                melambangkan floating fund awal kasir barista untuk kembalian
                pecahan.
              </p>
            </div>
          </div>
        </div>

        {/* BIODATA / PERSONAL PROFILE KASIR (Col 5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-150 border-slate-200/50 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 bg-slate-100 flex items-center justify-center rounded-lg text-slate-800">
                <UserCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-none">
                  Biodata Barista & Kasir
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Isi identitas barista bertugas untuk audit keamanan.
                </p>
              </div>
            </div>

            {/* Avatar Picker UI with absolute cleanliness */}
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 shadow-md flex-shrink-0 bg-slate-100 relative">
                <img
                  src={cashierAvatar}
                  alt="Kasir Avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://placehold.co/400x400/f8fafc/94a3b8?text=Produk+Tanpa+Foto";
                  }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-450 uppercase leading-none">
                  Pilih Avatar Barista
                </p>
                <div className="flex gap-1.5 pt-1">
                  {avatarPresets.map((preset, index) => (
                    <button
                      key={index}
                      title={preset.name}
                      onClick={() => setCashierAvatar(preset.url)}
                      className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        cashierAvatar === preset.url
                          ? "border-blue-500 scale-110 shadow-xs"
                          : "border-slate-200 hover:scale-105"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://placehold.co/400x400/f8fafc/94a3b8?text=Produk+Tanpa+Foto";
                        }}
                      />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Atau link foto bebas..."
                  value={cashierAvatar}
                  onChange={(e) => setCashierAvatar(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-[9px] mt-1 text-slate-500"
                />
              </div>
            </div>

            {/* Cashier profile forms */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Nama Operator Barista / Kasir
                </label>
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-800 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Jabatan Kepegawaian
                  </label>
                  <input
                    type="text"
                    value={cashierRole}
                    onChange={(e) => setCashierRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 font-medium rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Shift Jadwal Kerja
                  </label>
                  <select
                    value={cashierShift}
                    onChange={(e) => setCashierShift(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 font-medium rounded-lg"
                  >
                    <option value="Pagi (Morning)">Pagi (Morning)</option>
                    <option value="Siang (Noon)">Siang (Noon)</option>
                    <option value="Sore (Afternoon)">Sore (Afternoon)</option>
                    <option value="Malam (Full Night)">
                      Malam (Full Night)
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Nomor HP Barista
                  </label>
                  <input
                    type="text"
                    value={cashierPhone}
                    onChange={(e) => setCashierPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono text-slate-800 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    PIN Rahasia POS
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={cashierPin}
                      onChange={(e) => setCashierPin(e.target.value)}
                      maxLength={4}
                      className="w-full px-3 py-2 pl-8 border border-slate-200 bg-slate-50 font-mono text-slate-805 text-slate-800 rounded-lg focus:outline-hidden"
                    />
                    <Lock
                      className="absolute left-2.5 top-2.5 text-slate-400"
                      size={12}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit all profile */}
          <button
            onClick={handleSaveProfileAndBiodata}
            className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Simpan Profil & Biodata
          </button>
        </div>
      </div>
    </>
  );
}
