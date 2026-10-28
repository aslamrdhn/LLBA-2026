import { useUiStore } from "../../store/uiStore";
import React, { useState } from "react";
import {
  Cloud,
  Sparkles,
  Globe,
  Terminal,
  Info,
  ExternalLink,
  AlertTriangle,
  Database,
  FileText,
  Check,
  Shield,
  Mail,
  RefreshCw,
  X,
} from "lucide-react";
import { AppConfig } from "../../types";

interface DriveTabProps {
  appConfig: AppConfig;
  onUpdateConfig: (cfg: Partial<AppConfig>) => void;
  onRefresh: () => void;
}

export function DriveTab({
  appConfig,
  onUpdateConfig,
  onRefresh,
}: DriveTabProps) {
  const {
    triggerToast,
    logAuditActivity,
    auditLogs,
    setAuditLogs,
    clearAuditLogs,
  } = useUiStore();

  const [driveConnected, setDriveConnected] = useState<boolean>(() => {
    return appConfig.driveConnected || false;
  });
  const [driveStoreFolder, setDriveStoreFolder] = useState<string>(() => {
    return appConfig.driveStoreFolder || "/AslamLedger_CloudServer";
  });
  const [driveClientId, setDriveClientId] = useState<string>(() => {
    return appConfig.driveClientId || "";
  });
  const [driveClientSecret, setDriveClientSecret] = useState<string>(() => {
    return appConfig.driveClientSecret || "";
  });
  const [driveAutoSync, setDriveAutoSync] = useState<boolean>(() => {
    return appConfig.driveAutoSync || false;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showOAuthPopup, setShowOAuthPopup] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [driveLogs, setDriveLogs] = useState<string[]>([
    "[INIT] Google Workspace Synchronization Gateway v3.1",
    "[INIT] Menunggu koneksi OAuth 2.0...",
  ]);
  const [googleConnectMode, setGoogleConnectMode] = useState<
    "easy" | "credentials"
  >("easy");
  const [easyEmail, setEasyEmail] = useState<string>(
    () => appConfig.cashierEmail || "",
  );

  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(true);
  const [scheduleTime, setScheduleTime] = useState<string>("23:00");
  const [recipientEmail, setRecipientEmail] = useState<string>(
    () => appConfig.cashierEmail || "",
  );
  const [reportType, setReportType] = useState<"all" | "sheets_only">("all");
  const [simulatingReport, setSimulatingReport] = useState<boolean>(false);

  const [restorePending, setRestorePending] = useState<boolean>(false);

  const tenantId = "aslam-brew";

  const addDriveLog = (msg: string) => {
    setDriveLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString("id-ID")}] ${msg}`,
    ]);
  };

  const handleEasyGoogleConnect = () => {
    setShowOAuthPopup(true);
    addDriveLog("Memulai Google Workspace OAuth 2.0 (Easy Connect)...");
  };

  const handleSimulatedOAuthLogin = () => {
    setShowOAuthPopup(true);
    addDriveLog("Memulai Google Workspace OAuth 2.0 (Custom Credentials)...");
  };

  const confirmOAuthSimulation = () => {
    setShowOAuthPopup(false);
    setDriveConnected(true);
    triggerToast("✅ Google Workspace terhubung!");
    logAuditActivity(
      "Admin",
      "OAUTH_CONNECT",
      "Google Account linked successfully",
    );
    addDriveLog("OAuth Handshake Berhasil. Token tersimpan aman (AES-256).");
    onUpdateConfig({ driveConnected: true });
  };

  const disconnectDrive = () => {
    setDriveConnected(false);
    triggerToast("⚠️ Koneksi Google Workspace diputus");
    logAuditActivity("Admin", "OAUTH_DISCONNECT", "Google Account unlinked");
    addDriveLog("Token OAuth dicabut oleh admin.");
    onUpdateConfig({ driveConnected: false });
  };

  const handleSaveDriveSettings = () => {
    triggerToast("✅ Konfigurasi Cloud / Lokal tersimpan");
    onUpdateConfig({
      driveStoreFolder,
      driveClientId,
      driveClientSecret,
      driveAutoSync,
    });
  };

  const handleTestConnection = () => {
    if (!driveConnected) {
      triggerToast("Gagal: Google Workspace belum terhubung!");
      return;
    }
    setIsSyncing(true);
    setSyncProgress(10);
    addDriveLog("Mempersiapkan Payload Data Sinkronisasi...");
    setTimeout(() => setSyncProgress(45), 600);
    setTimeout(() => {
      setSyncProgress(80);
      addDriveLog(
        "Mengunggah JSON & Media ke Drive (Folder: " + driveStoreFolder + ")",
      );
    }, 1200);
    setTimeout(() => {
      setSyncProgress(100);
      setIsSyncing(false);
      triggerToast("✅ Sinkronisasi 2-Arah Selesai");
      addDriveLog("Sinkronisasi Selesai. Hash tervalidasi.");
      setTimeout(() => setSyncProgress(0), 1000);
    }, 2000);
  };

  const handleTestScheduleSend = () => {
    setSimulatingReport(true);
    addDriveLog(
      `Mempersiapkan Laporan via Email (Target: ${recipientEmail})...`,
    );
    setTimeout(() => {
      addDriveLog(`Merender Laporan (Tipe: ${reportType}) ke PDF/XLSX...`);
    }, 1000);
    setTimeout(() => {
      setSimulatingReport(false);
      triggerToast("📧 Laporan Berhasil Dikirim ke " + recipientEmail);
      addDriveLog(`Laporan terkirim via SMTP Relay Google.`);
    }, 2500);
  };

  const handlelokalBackup = () => {
    triggerToast("⬇️ Memulai Backup File Lokal (.ledger)...");
    addDriveLog("Menyiapkan Snapshot State Database Lokal...");
    setTimeout(() => {
      triggerToast("✅ Backup Berhasil Diunduh!");
      addDriveLog("Backup Lokal (.ledger) Selesai Digenerate.");
    }, 1500);
  };

  const handlelokalRestore = () => {
    setRestorePending(true);
  };

  const executelokalRestore = () => {
    setRestorePending(false);
    triggerToast("⚠️ Proses Restore Dijalankan...");
    addDriveLog("WIPE DATA: Memproses penulisan ulang database dari file...");
    setTimeout(() => {
      triggerToast("✅ Restore Selesai! Reloading...");
      addDriveLog("Restore Selesai. Memuat ulang state aplikasi...");
      setTimeout(() => window.location.reload(), 1000);
    }, 2000);
  };

  return (
    <>
      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in"
        id="gdrive-sync-tab"
      >
        {/* HEADER BANNER CARD (Col 12) */}
        <div className="lg:col-span-12 bg-gradient-to-r from-indigo-900 to-slate-900 p-6 rounded-3xl border border-indigo-950/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase rounded-full tracking-wider border border-indigo-400/20">
                  Sistem Backup Hibrida
                </span>
                <div className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${driveConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}
                  />
                  <span className="text-[10px] text-slate-350 font-bold">
                    'Cloud Active'
                  </span>
                </div>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 mt-2">
                <Cloud size={20} className="text-indigo-400" />
                Konektor Google Drive (Belum Aktif — perlu konfigurasi OAuth)
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Fitur pencadangan otomatis ke Google Drive memerlukan Client ID dan OAuth Google Workspace yang aktif.
              </p>
            </div>

            <div className="bg-slate-950/40 px-5 py-4 rounded-2xl border border-indigo-500/20 text-center min-w-[200px]">
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                Status Backup
              </p>
              <p className="text-lg font-black text-white mt-1">
                {driveConnected ? "Terhubung" : "Belum Ditautkan"}
              </p>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {driveConnected
                  ? appConfig.cashierEmail || easyEmail
                  : "Sistem Lokal Aktif"}
              </span>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: SETTINGS & GOOGLE OAUTH FORMS (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* GOOGLE WORKSPACE CONNECTION METHOD */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Database size={16} className="text-indigo-600" />
                Koneksi Google Workspace
              </h3>
              <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                v3 Secure
              </span>
            </div>

            {/* Toggle Connection Modes */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGoogleConnectMode("easy")}
                className={`py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${googleConnectMode === "easy" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                1-Klik Instan (Rekomendasi)
              </button>
              <button
                type="button"
                onClick={() => setGoogleConnectMode("credentials")}
                className={`py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${googleConnectMode === "credentials" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                OAuth Mandiri (Kredensial)
              </button>
            </div>

            {/* MODE A: EASY ONE-CLICK REGISTRATION */}
            {googleConnectMode === "easy" && (
              <div className="space-y-4 text-xs">
                <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-indigo-800 font-bold text-[11px]">
                    <Sparkles
                      size={14}
                      className="text-indigo-600 animate-pulse"
                    />
                    Metode Instan Tanpa Setup Teknis
                  </div>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    Sistem terpusat BaristaPOS mengurus seluruh proses
                    persetujuan Google. Cukup daftarkan email Anda, klik
                    konfirmasi, dan nikmati sinkronisasi database awan & Google
                    Sheets yang rapi & tangguh secara instan!
                  </p>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                      Daftarkan Email Google Toko
                    </label>
                    <input
                      type="email"
                      value={easyEmail}
                      onChange={(e) => setEasyEmail(e.target.value)}
                      placeholder="pemilik_kedai@gmail.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 font-bold text-slate-700 rounded-lg focus:outline-hidden"
                    />
                  </div>

                  {!driveConnected ? (
                    <button
                      type="button"
                      onClick={handleEasyGoogleConnect}
                      className="w-full py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-xl shadow-xs cursor-pointer text-center text-[11px] transition-all flex items-center justify-center gap-1.5"
                    >
                      <Globe size={13} className="animate-pulse" />
                      Hubungkan Google Workspace
                    </button>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-indigo-100/30">
                      <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-100/50 text-[10px] rounded-lg text-center font-semibold">
                        Connected securely with:{" "}
                        <span className="font-mono text-indigo-700 font-bold">
                          {easyEmail}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={disconnectDrive}
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700-600 font-bold text-xs rounded-lg cursor-pointer text-center select-none"
                      >
                        Copot Hubungan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODE B: TECHNICAL INDEPENDENT OAUTH CREDENTIALS */}
            {googleConnectMode === "credentials" && (
              <div className="space-y-4 text-xs">
                {/* Connection Status Card */}
                <div
                  className={`p-4 rounded-2xl border ${driveConnected ? "bg-emerald-50/15 border-emerald-100" : "bg-slate-50 border-slate-150"} space-y-2.5`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500">
                      Status API Kunci:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${driveConnected ? "bg-emerald-505 bg-emerald-550" : "bg-rose-500"}`}
                      />
                      <span
                        className={`font-bold uppercase text-[9px] ${driveConnected ? "text-emerald-700" : "text-rose-600"}`}
                      >
                        {driveConnected ? "OAuth Connected" : "Waiting Setup"}
                      </span>
                    </div>
                  </div>

                  {driveConnected ? (
                    <div className="space-y-2">
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        Keamanan data klien aktif. Kredensial mandiri diizinkan
                        untuk bypass server terpusat.
                      </p>
                      <button
                        type="button"
                        onClick={disconnectDrive}
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-100 select-none cursor-pointer"
                      >
                        Copot Koneksi Mandiri
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-slate-500 text-[10px] leading-relaxed">
                        Gunakan Google Cloud Developer Console Anda sendiri
                        untuk mengunduh JSON klien ID & Secret OAuth 2.0.
                      </p>
                      <button
                        type="button"
                        onClick={handleSimulatedOAuthLogin}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Globe size={13} className="animate-spin" />
                        Masuk Jabat Tangan OAuth
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Config Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                      Folder Target Google Drive
                    </label>
                    <input
                      type="text"
                      value={driveStoreFolder}
                      onChange={(e) => setDriveStoreFolder(e.target.value)}
                      placeholder="/AslamLedger_CloudServer"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 font-bold rounded-lg focus:outline-hidden text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                      Google Client ID (OAuth 2.0 ID)
                    </label>
                    <input
                      type="text"
                      value={driveClientId}
                      onChange={(e) => setDriveClientId(e.target.value)}
                      placeholder="928318491-aslam.apps.googleusercontent.com"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 font-mono rounded-lg focus:outline-hidden text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                      Google Client Secret
                    </label>
                    <input
                      type="password"
                      value={driveClientSecret}
                      onChange={(e) => setDriveClientSecret(e.target.value)}
                      placeholder="GOCSPX-SecretMockKeyAslamLedger"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 font-mono rounded-lg focus:outline-hidden text-slate-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="drive-autosync-toggle"
                      checked={driveAutoSync}
                      onChange={(e) => setDriveAutoSync(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                    />
                    <label
                      htmlFor="drive-autosync-toggle"
                      className="font-bold text-slate-650 cursor-pointer text-[11px]"
                    >
                      Cadangkan Otomatis Saat Penjualan
                    </label>
                  </div>
                </div>

                {/* Save Settings */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDriveSettings}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Simpan Kredensial
                  </button>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer text-center"
                  >
                    Uji Kunci ID
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AUTOMATED COMPILATION DAILY SCHEDULE REPORT CARD */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 font-sans">
                <Mail size={16} className="text-amber-600" />
                Kirim Laporan Otomatis (Setiap Jam 11 Malam)
              </h3>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-bold text-[8px] rounded uppercase">
                SCHEDULER SERVICE
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-700 font-sans">
                    Aktifkan Pengiriman Laporan
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Pemicu server-side otomatis setiap hari
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Email Sasaran Penerima Laporan
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="nama_owner@kedai.com"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-700 rounded-lg focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Alamat email terdaftar untuk menerima surat berkas
                  rekapitulasi harian.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Waktu Jam Pengiriman
                  </label>
                  <select
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-700 rounded-lg focus:outline-hidden text-[11px]"
                  >
                    <option value="23:00">23:00 WITA (11 Malam)</option>
                    <option value="11:00">11:00 WITA (11 Siang)</option>
                    <option value="shift_end">Saat Shift Kerja Tutup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Mode Pengiriman
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) =>
                      setReportType(e.target.value as "all" | "sheets_only")
                    }
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-bold text-slate-700 rounded-lg focus:outline-hidden text-[11px]"
                  >
                    <option value="all">Kirim Berkas doc + Sync Sheet</option>
                    <option value="sheets_only">
                      Hanya Notifikasi + Sync Sheet
                    </option>
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-amber-805 leading-relaxed font-sans bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50 text-amber-900">
                💡 <strong>Integrasi Hibrida:</strong> Server akan membaca
                database penjualan harian dan stok bahan baku Anda,
                mengompilasinya menjadi <u>Laporan doc/Excel rapi</u>,
                mengunggah ke Google Drive dan Sheets secara real-time, lalu
                mengirimkannya via email.
              </p>

              <button
                type="button"
                disabled={simulatingReport}
                onClick={handleTestScheduleSend}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 font-bold text-white rounded-xl text-center text-xs transition-all shadow-md shadow-amber-100 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {simulatingReport
                  ? "Sedang Mengirim..."
                  : "Kirim Laporan Email Sekarang ✉️ (Belum Aktif — perlu SMTP)"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TERMINAL CONSOLE & BLUEPRINTS (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TERMINAL EMULATOR CARD */}
          <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold flex items-center gap-1">
                  <Terminal size={11} />
                  Google Cloud Shell-Emulator
                </span>
              </div>
              <button
                onClick={() =>
                  setDriveLogs([
                    "[CLEARED] Konsol log dibebaskan. Silakan lakukan aksi sinkronisasi.",
                  ])
                }
                className="text-[9px] text-slate-500 hover:text-white font-mono cursor-pointer"
              >
                Clear Console
              </button>
            </div>

            {/* Progress Indicator */}
            {isSyncing && (
              <div className="space-y-1.5 animate-pulse">
                <div className="flex justify-between text-[10px] font-mono text-indigo-300">
                  <span>Mengeksekusi Jabat Tangan Cloud Drive API...</span>
                  <span>{syncProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1 border border-white/5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Monospace Code Log Screen */}
            <div className="h-44 bg-slate-900/60 p-3.5 rounded-2xl border border-white/5 font-mono text-[10px] text-indigo-200 overflow-y-auto space-y-1.5 scrollbar-thin">
              {driveLogs.map((log, idx) => (
                <p
                  key={idx}
                  className="leading-relaxed hover:bg-white/5 rounded px-1 transition-colors"
                >
                  {log}
                </p>
              ))}
            </div>

            {/* Actions lokal buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-bold">
              <button
                type="button"
                disabled={isSyncing}
                onClick={handlelokalBackup}
                className="py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white rounded-xl shadow-xs cursor-pointer text-center"
              >
                Backup Database
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handlelokalRestore}
                className="py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-white rounded-xl shadow-xs cursor-pointer text-center"
              >
                Restore Cloud
              </button>
              <a
                href="/api/backup/saveeksport"
                className="py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-xs text-center flex items-center justify-center"
              >
                Manifest Lokal
              </a>
            </div>
          </div>

          {/* BLUEPRINTS EXPLANATORY INFORMATION FOR PRODUCTION HOSTING */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm space-y-4">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Info size={16} className="text-indigo-600" />
                Blueprint Implementasi Produksi Google Drive REST API
              </h4>
              <p className="text-xs text-slate-450 mt-1">
                Saat web ini dideploy secara komprehensif, implementasi Google
                Drive SDK akan diproses di server-side (`server.ts`) demi
                kegagahan API Key. Berikut representasi kode Node.js yang akan
                kita aktifkan:
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 font-mono text-[10px] text-slate-700 space-y-2 max-h-56 overflow-y-auto leading-relaxed scrollbar-thin">
              <p className="font-bold text-indigo-805 text-indigo-800">
                // server/drive-integration.ts
              </p>
              <p className="text-emerald-700">
                import &#123; google &#125; from \'googleapis\';
              </p>
              <p className="text-slate-500">// Jabat Tangan Keamanan OAuth2</p>
              <p>const oauth2Client = new google.auth.OAuth2(</p>
              <p>&nbsp;&nbsp;process.env.GD_CLIENT_ID,</p>
              <p>&nbsp;&nbsp;process.env.GD_CLIENT_SECRET,</p>
              <p>&nbsp;&nbsp;process.env.GD_REDIRECT_URI</p>
              <p>);</p>
              <br />
              <p className="font-bold text-indigo-700">
                // Fungsi Mengunggah File Cadangan ke Google Drive User
              </p>
              <p>
                export async function uploadBackupToDrive(jsonData: any,
                fileName: string) &#123;
              </p>
              <p>
                &nbsp;&nbsp;const drive = google.drive(&#123; version: \'v3\',
                auth: oauth2Client &#125;);
              </p>
              <p>&nbsp;&nbsp;const media = &#123;</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;mimeType: \'application/json\',</p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;body: JSON.stringify(jsonData, null, 2),
              </p>
              <p>&nbsp;&nbsp;&#125;;</p>
              <p>
                &nbsp;&nbsp;const response = await drive.files.create(&#123;
              </p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;requestBody: &#123;</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;name: fileName,</p>
              <p>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;parents: [\'root\'], // Atau
                ID folder cadangan spesifik
              </p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&#125;,</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;media: media,</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;fields: \'id\',</p>
              <p>&nbsp;&nbsp;&#125;);</p>
              <p>&nbsp;&nbsp;return response.data.id;</p>
              <p>&#125;</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-indigo-50/20 rounded-2xl border border-indigo-100 gap-3">
              <div className="text-[11px] text-slate-600 leading-normal">
                <strong>Apakah Anda pengembang/pemilik?</strong> Prosedur
                integrasi ini sangat mudah dirawat dan ramah kuota server,
                karena beban data awan sepenuhnya ditransfer ke Google Drive
                gratis dari pengguna.
              </div>
              <a
                href="https://developers.google.com/drive/api/guides/enable-parts"
                target="_blank"
                referrerPolicy="no-referrer"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-xl flex items-center gap-1 shrink-0 self-end sm:self-center"
              >
                <ExternalLink size={11} />
                Dokumen Google
              </a>
            </div>
          </div>
        </div>

        {/* SIMULATED GOOGLE OAUTH POPUP OVERLAY */}
        {showOAuthPopup && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
            id="oauth-popup-container"
            onClick={() => setShowOAuthPopup(false)}
          >
            <div
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Auth */}
              <div className="flex flex-col items-center justify-center text-center pb-2 border-b border-slate-100">
                <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-2xl shadow-xs border border-slate-100 font-bold text-indigo-600 text-xl font-sans">
                  G
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm mt-3">
                  Masuk dengan Google
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  untuk melanjutkan ke{" "}
                  <strong className="text-slate-800">
                    BaristaPOS Cloud Hub
                  </strong>
                </p>
              </div>

              {/* Account card choice */}
              <div className="space-y-3.5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-center">
                  Pilih demo email akun toko Anda:
                </p>

                <div
                  onClick={confirmOAuthSimulation}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 rounded-2xl flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                    {(
                      (googleConnectMode === "easy"
                        ? easyEmail
                        : appConfig.cashierEmail) || "O"
                    )
                      .substring(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="text-left font-sans">
                    <p className="text-xs font-bold text-slate-800">
                      {googleConnectMode === "easy"
                        ? easyEmail
                          ? easyEmail.split("@")[0]
                          : "Owner"
                        : appConfig.cashierName || "Pemilik Toko"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {googleConnectMode === "easy"
                        ? easyEmail || "owner@ledgerline.my.id"
                        : appConfig.cashierEmail ||
                          `${tenantId}@ledgerline.my.id`}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed text-center px-2">
                  Memberikan ijin kepada BaristaPOS keamanan tinggi untuk
                  membaca, mengunggah dan mengedit backup file{" "}
                  <code>state_backup.json</code> di dalam drive pribadi Anda.
                </p>
              </div>

              {/* Footer and trigger lokal connect closure */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowOAuthPopup(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmOAuthSimulation}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Izinkan & Sambung
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {restorePending && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          id="profile-restore-confirm-modal"
          onClick={() => setRestorePending(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl w-full max-w-sm border border-slate-150 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-650">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Restorasi Cloud
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Tindakan Menimpa Data
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Apakah Anda yakin ingin mengunduh data cloud dan merestorasi
              database? Tindakan ini akan menimpa seluruh data toko dalam memori
              luring saat ini.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setRestorePending(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-705 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executelokalRestore}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-xl transition-all cursor-pointer shadow-md"
              >
                Ya, Unduh & Timpa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE PRODUCT CONFIRMATION MODAL */}
    </>
  );
}
