/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ProfileTab } from "./storefront/ProfileTab";
import { ThemeTab } from "./storefront/ThemeTab";
import { EmployeesTab } from "./storefront/EmployeesTab";
import { PrinterTab } from "./storefront/PrinterTab";
import { SwotTab } from "./storefront/SwotTab";
import { MenuTab } from "./storefront/MenuTab";
import { MigrationTab } from "./storefront/MigrationTab";
import { DriveTab } from "./storefront/DriveTab";
import { useUiMode } from "../context/UiModeContext";
import { PrinterSetupModal } from "./PrinterSetupModal";
import { AppConfig, Product, RawMaterial, Recipe } from "../types";
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

interface StorefrontProfileProps {
  appConfig: AppConfig;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
  products: Product[];
  rawMaterials: RawMaterial[];
  recipes: Recipe[];
  onRefresh: () => void;
}

export default function StorefrontProfile({
  appConfig,
  onUpdateConfig,
  products,
  rawMaterials,
  recipes,
  onRefresh,
}: StorefrontProfileProps) {
  const { uiMode, toggleUIMode, translateTerm } = useUiMode();
  const [showAdvancedConfirm, setShowAdvancedConfirm] = useState(false);
  const savedStore = localStorage.getItem("aslam_ledger_current_store");
  const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";

  // Navigation active subtab: 'profil' | 'menu' | 'tema' | 'swot' | 'drive' | 'karyawan' | 'printer'
  const [activeSubTab, setActiveSubTab] = useState<
    | "profil"
    | "menu"
    | "tema"
    | "swot"
    | "drive"
    | "karyawan"
    | "printer"
    | "migration"
  >("profil");
  const [showProfileHelp, setShowProfileHelp] = useState<boolean>(false);

  // --- KARYAWAN & AUDIT SHIFT STATES ---

  // Save changes helper logs

  // 4. Google Drive Simulator states
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
    "Sistem sinkronisasi siap. Silakan hubungkan akun Google Drive Anda di panel samping.",
  ]);

  // Optimized Google Workspace states
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

  const addLogLine = (text: string) => {
    const timeStr = new Date().toLocaleTimeString("id-ID");
    setDriveLogs((prev) => [...prev, `[${timeStr}] ${text}`]);
  };

  // 3. Manajemen Menu states

  return (
    <div className="space-y-6" id="settings-master-container">
      {/* ADVANCED MODE TOGGLE */}
      <div className="bg-slate-950 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between border border-slate-800 shadow-md">
        <div>
          <h3 className="text-white font-bold text-sm">
            Mode Tampilan Aplikasi
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Gunakan Mode Lanjutan untuk fitur ekstra seperti Simulator, Audit
            Kripto, atau Midtrans.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer mt-4 md:mt-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={uiMode === "advanced"}
            onChange={(e) => {
              if (e.target.checked) setShowAdvancedConfirm(true);
              else toggleUIMode("simple");
            }}
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          <span className="ml-3 text-sm font-bold text-white uppercase tracking-wider">
            {uiMode === "advanced" ? "Lanjutan" : "Sederhana"}
          </span>
        </label>
      </div>

      {showAdvancedConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative animate-fade-in text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              <Lock size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">
              Nyalakan Mode Lanjutan?
            </h3>
            <p className="text-xs text-slate-400">
              Mode lanjutan akan menampilkan data developer seperti Terminal
              Kripto, Midtrans Simulator, dan Panel Database. Pastikan Anda
              paham teknik dasarnya.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowAdvancedConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  toggleUIMode("advanced");
                  setShowAdvancedConfirm(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-900/40"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBNAV BUTTONS BAR - Sleek grey glass bento navigations */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-wrap gap-1.5 items-center font-sans">
        <button
          onClick={() => setActiveSubTab("profil")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "profil"
              ? "bg-slate-950 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <User size={14} />
          Profil Kafe & Biodata Kasir
        </button>

        <button
          onClick={() => setActiveSubTab("menu")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "menu"
              ? "bg-slate-950 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Coffee size={14} />
          Kelola Etalase Menu ({products.length})
        </button>

        <button
          onClick={() => setActiveSubTab("tema")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "tema"
              ? "bg-slate-950 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Palette size={14} />
          Tema & Tampilan POS
        </button>

        {uiMode === "advanced" && (
          <React.Fragment>
            <button
              onClick={() => setActiveSubTab("karyawan")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "karyawan"
                  ? "bg-slate-950 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <UserCheck size={14} />
              Akses Karyawan & Audit Shift
            </button>

            <button
              onClick={() => setActiveSubTab("printer")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "printer"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-emerald-700 hover:bg-emerald-50/70"
              }`}
            >
              <Wifi
                size={14}
                className={activeSubTab === "printer" ? "animate-pulse" : ""}
              />
              WiFi & Printer Adaptif
            </button>

            <button
              onClick={() => setActiveSubTab("swot")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "swot"
                  ? "bg-slate-950 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Scale size={14} />
              Analisis Bisnis SWOT kafe
            </button>

            <button
              onClick={() => setActiveSubTab("migration")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "migration"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-amber-700 hover:bg-amber-50/70"
              }`}
            >
              <FileText size={14} />
              Migration Center
            </button>

            <button
              onClick={() => setActiveSubTab("drive")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "drive"
                  ? "bg-slate-950 text-white shadow-md"
                  : "text-indigo-600 hover:bg-indigo-50/70 hover:text-indigo-800"
              }`}
            >
              <Cloud size={14} className="text-indigo-500 animate-pulse" />
              Koneksi Google Drive (Belum Aktif — perlu OAuth)
            </button>
          </React.Fragment>
        )}
      </div>

      {/* TAB SUB-PAGES BODY */}

      {/* 1. PROFIL & BIODATA TAB */}
      {activeSubTab === "profil" && (
        <ProfileTab appConfig={appConfig} onUpdateConfig={onUpdateConfig} />
      )}
      {activeSubTab === "menu" && (
        <MenuTab
          appConfig={appConfig}
          products={products}
          rawMaterials={rawMaterials}
          recipes={recipes}
          onRefresh={onRefresh}
        />
      )}

      {activeSubTab === "tema" && (
        <ThemeTab appConfig={appConfig} onUpdateConfig={onUpdateConfig} />
      )}

      {/* 4. SWOT ANALISIS & SUBSCRIPTION */}
      {activeSubTab === "swot" && <SwotTab appConfig={appConfig} />}

      {activeSubTab === "migration" && <MigrationTab />}

      {activeSubTab === "drive" && (
        <DriveTab
          appConfig={appConfig}
          onUpdateConfig={onUpdateConfig}
          onRefresh={onRefresh}
        />
      )}
      {activeSubTab === "karyawan" && <EmployeesTab appConfig={appConfig} />}
      {activeSubTab === "printer" && (
        <PrinterTab appConfig={appConfig} onUpdateConfig={onUpdateConfig} />
      )}
    </div>
  );
}
