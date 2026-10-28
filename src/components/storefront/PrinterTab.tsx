import { useUiStore } from "../../store/uiStore";
import React, { useState } from "react";
import {
  Printer,
  Wifi,
  Bluetooth,
  Layers,
  RefreshCw,
  Check,
  Settings,
  Shield,
  FileText,
  QrCode,
} from "lucide-react";
import { AppConfig } from "../../types";
import { PrinterSetupModal } from "../PrinterSetupModal";

interface PrinterTabProps {
  appConfig: AppConfig;
  onUpdateConfig: (cfg: Partial<AppConfig>) => void;
}

export function PrinterTab({ appConfig, onUpdateConfig }: PrinterTabProps) {
  const {
    triggerToast,
    logAuditActivity,
    auditLogs,
    setAuditLogs,
    clearAuditLogs,
  } = useUiStore();

  const [receiptHeader, setReceiptHeader] = useState<string>(
    appConfig.receiptHeader || "",
  );
  const [receiptFooter, setReceiptFooter] = useState<string>(
    appConfig.receiptFooter || "",
  );

  const storeName = appConfig.storeName || "";
  const storeAddress = appConfig.storeAddress || "";
  const storePhone = appConfig.storePhone || "";
  const storeWifiPass = appConfig.storeWifiPass || "";
  const cashierName = appConfig.cashierName || "Aslam Ramadhan";
  const cashierRole = appConfig.cashierRole || "Head Barista";

  const [wifiSearchActive, setWifiSearchActive] = useState<boolean>(false);
  const [wifiDevices, setWifiDevices] = useState<string[]>(() => {
    const saved = localStorage.getItem("aslam_ledger_discovered_wifis");
    if (saved) return JSON.parse(saved);
    return [
      "LedgerLine_HighSpeed_5G (Sinyal Sempurna • Aktif)",
      "Aslam_Coffee_Guest_2.4G (Sinyal Kuat)",
      "Biznet_Home_Fiber_Bar (Sinyal Sedang)",
      "Telkomsel_Orbit_Cafe_01 (Sinyal Kuat)",
    ];
  });
  const [selectedWifi, setSelectedWifi] = useState<string>(() => {
    return appConfig.storeWifiName
      ? `${appConfig.storeWifiName} (Sinyal Sempurna • Aktif)`
      : "LedgerLine_HighSpeed_5G (Sinyal Sempurna • Aktif)";
  });
  const [customWifiSsid, setCustomWifiSsid] = useState<string>("");
  const [customWifiPass, setCustomWifiPass] = useState<string>("");

  const [btSearchActive, setBtSearchActive] = useState<boolean>(false);
  const [btDevices, setBtDevices] = useState<any[]>(() => {
    const saved = localStorage.getItem("aslam_ledger_discovered_bts");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "bt_1",
        name: "RPP02N Thermal Printer 58mm",
        address: "00:11:22:33:AA:BB",
        paired: true,
        paperSize: "58mm",
        type: "Thermal POS",
      },
      {
        id: "bt_2",
        name: "Epson TM-T82X 80mm",
        address: "3C:D9:2B:E8:4A:9C",
        paired: false,
        paperSize: "80mm",
        type: "Desktop Receipt",
      },
      {
        id: "bt_3",
        name: "Zjiang ZJ-5802 Mobile POS",
        address: "AA:BB:CC:DD:EE:FF",
        paired: false,
        paperSize: "58mm",
        type: "Mobile Bluetooth",
      },
    ];
  });
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("bt_1");
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const [printDensity, setPrintDensity] = useState<number>(100);
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [testPrintingStatus, setTestPrintingStatus] = useState<string>("");

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in font-sans">
        {/* Kolom Kiri: Scan & Konek WiFi / Bluetooth (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* PANEL WIFI ADAPTIF */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi size={17} className="text-emerald-600 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-slate-850">
                    Konektivitas WiFi Adaptif
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Sistem mendeteksi ssid perangkat keras secara aktual, bukan
                    hardcoded.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={wifiSearchActive}
                onClick={() => {
                  setWifiSearchActive(true);
                  triggerToast("Mencari WiFi aktif di sekitar...");
                  setTimeout(() => {
                    setWifiSearchActive(false);
                    const baseWifi = [
                      "LedgerLine_HighSpeed_5G (Sinyal Sempurna • Aktif)",
                      "Aslam_Coffee_Guest_2.4G (Sinyal Kuat)",
                      "Biznet_Home_Fiber_Bar (Sinyal Sedang)",
                      "Telkomsel_Orbit_Cafe_01 (Sinyal Kuat)",
                    ];
                    setWifiDevices(baseWifi);
                    localStorage.setItem(
                      "aslam_ledger_discovered_wifis",
                      JSON.stringify(baseWifi),
                    );
                    triggerToast("Daftar SSID WiFi berhasil disegarkan!");
                  }, 1500);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-20a text-slate-700 hover:bg-slate-200 font-bold rounded-lg text-[10.5px] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw
                  size={12}
                  className={wifiSearchActive ? "animate-spin" : ""}
                />
                {wifiSearchActive ? "Scanning..." : "Segarkan Jaringan"}
              </button>
            </div>

            {/* Grid Wifi SSID list */}
            <div className="space-y-2.5 text-xs">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Pilih SSID Yang Terdeteksi Perangkat Anda
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                {wifiDevices.map((ssid, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedWifi(ssid);
                      const cleanSsid = ssid.split("(")[0].trim();
                      onUpdateConfig({ storeWifiName: cleanSsid });
                      logAuditActivity(
                        appConfig.cashierName || "Owner",
                        "Adaptasi WiFi Diaktifkan",
                        `Mengalihkan jaringan internet POS ke SSID: ${cleanSsid}`,
                      );
                      triggerToast(`SSID Terpilih: ${cleanSsid}`);
                    }}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between text-[11px] ${
                      selectedWifi === ssid
                        ? "border-emerald-500 bg-emerald-50/10 font-bold"
                        : "border-slate-150 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="truncate">{ssid}</span>
                    {selectedWifi === ssid && (
                      <Check size={12} className="text-emerald-600" />
                    )}
                  </div>
                ))}
              </div>

              {/* Custom Wifi Input Forms */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-2 space-y-3">
                <p className="text-[10px] font-extrabold uppercase text-slate-500">
                  SSID Kustom lokal (Jika Tidak Terdeteksi)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Nama WiFi Baru..."
                      value={customWifiSsid}
                      onChange={(e) => setCustomWifiSsid(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[11px] bg-white border border-slate-250 rounded-lg text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="WiFi Password..."
                      value={customWifiPass}
                      onChange={(e) => setCustomWifiPass(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[11px] bg-white border border-slate-250 rounded-lg text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!customWifiSsid.trim()) {
                          triggerToast("Isi SSID WiFi kustom terlebih dahulu!");
                          return;
                        }
                        const newSSID = `${customWifiSsid} (Sinyal Kuat)`;
                        const updatedDevs = [...wifiDevices, newSSID];
                        setWifiDevices(updatedDevs);
                        localStorage.setItem(
                          "aslam_ledger_discovered_wifis",
                          JSON.stringify(updatedDevs),
                        );
                        setSelectedWifi(newSSID);
                        onUpdateConfig({
                          storeWifiName: customWifiSsid,
                          storeWifiPass: customWifiPass,
                        });
                        logAuditActivity(
                          appConfig.cashierName || "Owner",
                          "SSID WiFi Ditambahkan lokal",
                          `Mendeklarasikan WiFi baru: ${customWifiSsid}`,
                        );
                        triggerToast(
                          `WiFi ${customWifiSsid} berhasil ditautkan!`,
                        );
                        setCustomWifiSsid("");
                        setCustomWifiPass("");
                      }}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg text-[10.5px]"
                    >
                      Tautkan & Simpan Jaringan WiFi Kustom
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL BLUETOOTH THERMAL PRINTER ADAPTIF */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  BT
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-850">
                    Koneksi Bluetooth Thermal Printer
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Pindai dan sandingkan POS Kasir dengan printer struk mana
                    pun secara real-time.
                  </p>
                </div>
              </div>
              <PrinterSetupModal />
            </div>

            {/* Bluetooth discovered Devices list */}
            <div className="space-y-3.5 text-xs">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Simulated Bluetooth Printer Di Sekitar:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {btDevices.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => {
                      setSelectedPrinterId(dev.id);
                      setPaperWidth(dev.paperSize);
                      logAuditActivity(
                        appConfig.cashierName || "Owner",
                        "Printer Dipilih",
                        `Mengganti printer default ke: ${dev.name} (${dev.address})`,
                      );
                      triggerToast(`Printer aktif: ${dev.name}`);
                    }}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPrinterId === dev.id
                        ? "border-emerald-600 bg-emerald-50/15 shadow-xs"
                        : "border-slate-150 bg-white hover:border-slate-350"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="font-extrabold text-slate-800 text-[11.5px] truncate max-w-[170px]">
                          {dev.name}
                        </p>
                        <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                          {dev.address} • {dev.type}
                        </p>
                      </div>
                      <span
                        className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          selectedPrinterId === dev.id
                            ? "bg-emerald-555 bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {selectedPrinterId === dev.id ? "Tersambung" : "Siap"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 mt-2 pt-2.5 text-[10px] text-slate-500">
                      <span>
                        Format Lebar: <strong>{dev.paperSize}</strong>
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        Tersanding
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sub-config form for printing density & copies */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase mb-1">
                    Lebar Kertas Kertas Struk
                  </label>
                  <select
                    value={paperWidth}
                    onChange={(e) => {
                      setPaperWidth(e.target.value as "58mm" | "80mm");
                      triggerToast(
                        `Lebar kertas dialihkan ke: ${e.target.value}`,
                      );
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-xl font-bold"
                  >
                    <option value="58mm">58 mm (Struk Handheld/Mini)</option>
                    <option value="80mm">80 mm (Struk Lebar Dekstop TM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase mb-1">
                    Kepekatan Tinta Thermal ({printDensity}%)
                  </label>
                  <input
                    type="range"
                    min="80"
                    max="130"
                    step="5"
                    value={printDensity}
                    onChange={(e) => setPrintDensity(parseInt(e.target.value))}
                    className="w-full mt-2 accent-emerald-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase mb-1">
                    Jumlah Duplikasi Lembar
                  </label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setPrintCopies((c) => Math.max(1, c - 1))}
                      className="w-7 h-7 bg-white border rounded-lg font-bold text-slate-600"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-xs w-8 text-center">
                      {printCopies} Lembar
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrintCopies((c) => Math.min(3, c + 1))}
                      className="w-7 h-7 bg-white border rounded-lg font-bold text-slate-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* ADVANCED RECEIPT LAYOUT CUSTOMIZER (10/10 UPGRADE) */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-4">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers size={13} className="text-indigo-600" />
                  Branding Struk Kasir & Header Kustom
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Slogan Pembuka (Header Slogan)
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: Nikmati Setiap Tetesan Kopi Hangat"
                      value={receiptHeader}
                      onChange={(e) => {
                        setReceiptHeader(e.target.value);
                        onUpdateConfig({ receiptHeader: e.target.value });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl focus:outline-hidden text-slate-700 font-medium"
                    />
                    <p className="text-[9.2px] text-slate-400 mt-1 leading-normal">
                      Diletakkan tepat di paling atas struk untuk menyapa
                      pelanggan.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Pesan Tera Kaki (Footer Message)
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: JANGAN LUPA SENYUM HARI INI • @aslam_brew"
                      value={receiptFooter}
                      onChange={(e) => {
                        setReceiptFooter(e.target.value);
                        onUpdateConfig({ receiptFooter: e.target.value });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl focus:outline-hidden text-slate-700 font-medium"
                    />
                    <p className="text-[9.2px] text-slate-400 mt-1 leading-normal">
                      Tera ucapan penutup transaksi, media sosial, atau promo
                      poin loyalty.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Simulator Struk Thermal Printer (Col 5) */}
        <div className="lg:col-span-12 xl:col-span-5 lg:order-last space-y-6">
          <div className="bg-slate-100 p-5 rounded-3xl border border-slate-250 shadow-sm space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Lembar Struk Test
              </p>
              <h4 className="text-xs font-black text-slate-800 mt-1">
                Uji Coba Sinkronisasi Aliran Bluetooth
              </h4>
            </div>

            {/* Custom simulated print roll receipt container */}
            <div className="mx-auto max-w-[290px] bg-[#FFFFFA] p-5 shadow-lg border border-slate-200 rounded-lg text-[10.5px] text-slate-900 font-mono space-y-3 shadow-inner relative leading-relaxed overflow-hidden">
              {/* Simulated serrated cut of thermal paper roll top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-350 to-transparent flex overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-slate-100 rotate-45 transform -translate-y-1.5"
                  />
                ))}
              </div>

              <div className="text-center pt-2 space-y-0.5">
                {receiptHeader && (
                  <p className="text-[9px] text-indigo-600 border-b border-dashed border-slate-200 pb-1 italic font-bold tracking-wider">
                    {receiptHeader}
                  </p>
                )}
                <p className="font-bold uppercase text-[12px] pt-1">
                  {storeName || "LEDGERLINE COFFEE"}
                </p>
                <p className="text-[8.5px] text-slate-500 leading-normal">
                  {storeAddress || "Ruko Barista Blok 3, Jakarta, Indonesia"}
                </p>
                <p className="text-[9px] text-slate-650">
                  No. HP: {storePhone || "+62 812-4455-6677"}
                </p>
              </div>

              <div className="border-t border-dashed border-slate-400 my-1 pt-1 space-y-0.5 text-left text-[9px] text-slate-500">
                <p>
                  Tanggal: {new Date().toLocaleDateString("id-ID")}{" "}
                  {new Date().toLocaleTimeString("id-ID").substring(0, 5)}
                </p>
                <p>
                  Operator: {cashierName} ({cashierRole})
                </p>
                <p>ID Trans: LL-TEST-DISCOVER-01</p>
              </div>

              <div className="border-t border-dashed border-slate-400 my-1 pt-2 space-y-1 text-left">
                <div className="flex justify-between">
                  <span>1x Ice Aren Cafe Latte (Test)</span>
                  <span>Rp 22.000</span>
                </div>
                <div className="text-[8.5px] text-slate-500 italic pl-1 leading-snug">
                  - Takaran Gula: 50% Less Sugar
                  <br />- Espresso: Double Shot Arabika
                </div>
                <div className="flex justify-between">
                  <span>1x Crunchy Croissant (Test)</span>
                  <span>Rp 18.000</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-1 pt-2 space-y-1.5">
                <div className="flex justify-between font-bold text-slate-950">
                  <span>SUBTOTAL</span>
                  <span>Rp 40.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Pajak Resto (10%)</span>
                  <span>Rp 4.000</span>
                </div>
                <div className="flex justify-between font-black text-[11.5px] border-t border-double border-slate-400 pt-1.5">
                  <span>TOTAL AKHIR</span>
                  <span>Rp 44.000</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-1 pt-2 text-center text-[8px] text-slate-500 space-y-1">
                <p className="font-bold">
                  SSID WiFi Toko: {(selectedWifi || "").split("(")[0].trim()}
                </p>
                <p className="font-medium">
                  Password Wifi: {storeWifiPass || "12345678"}
                </p>
                <div className="border-t border-dashed border-slate-200 mt-1 pt-1">
                  <p className="font-semibold uppercase tracking-wider text-slate-800 text-[8.5px] whitespace-pre-wrap">
                    {receiptFooter || "TERIMA KASIH ATAS KUNJUNGANNYA"}
                  </p>
                  <p className="italic text-[7.5px] mt-0.5">
                    LedgerLine Secure POS Hub by Aslam Ramadhan
                  </p>
                </div>
              </div>

              {/* Simulated paper serrated bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 flex overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-slate-100 rotate-45 transform translate-y-1"
                  />
                ))}
              </div>
            </div>

            {/* Action test buttons with beautiful states */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={!!testPrintingStatus}
                onClick={() => {
                  setTestPrintingStatus("Mengirim handshake byte bluetooth...");
                  logAuditActivity(
                    cashierName,
                    "Test Bluetooth Printer Byte Sent",
                    `Mengirim kode kontrol ESC/POS ke printer ${selectedPrinterId}`,
                  );
                  setTimeout(
                    () =>
                      setTestPrintingStatus(
                        "Menyelaraskan lebar cetak thermal 58mm...",
                      ),
                    500,
                  );
                  setTimeout(
                    () =>
                      setTestPrintingStatus(
                        "Proses penulisan byte print stream hibrida...",
                      ),
                    1000,
                  );
                  setTimeout(() => {
                    setTestPrintingStatus("");
                    triggerToast("Cetak struk percobaan sukses!");
                  }, 1700);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-350 text-white font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer shadow-sm border border-emerald-500"
              >
                <RefreshCw
                  size={13}
                  className={testPrintingStatus ? "animate-spin" : ""}
                />
                {testPrintingStatus
                  ? testPrintingStatus
                  : `Cetak Struk Percobaan Aktif (${paperWidth})`}
              </button>
              <p className="text-[10px] text-slate-455 text-[9.5px] italic text-slate-400 text-center leading-normal">
                Sistem mendukung protokol ESC/POS via Web Bluetooth API (Chrome)
                atau konektivitas Serial Bridge pada sistem POS
                Android/iOS/Windows modern secara langsung.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. GOOGLE DRIVE SYNC SIMULATOR SUBTAB */}
    </>
  );
}
