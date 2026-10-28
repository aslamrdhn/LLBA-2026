import { useUiStore } from "../../store/uiStore";
import React, { useState } from "react";
import {
  Palette,
  Sparkles,
  FileText,
  CheckCircle,
  LayoutGrid,
  Check,
} from "lucide-react";
import { AppConfig } from "../../types";

interface ThemeTabProps {
  appConfig: AppConfig;
  onUpdateConfig: (cfg: Partial<AppConfig>) => void;
}

export function ThemeTab({ appConfig, onUpdateConfig }: ThemeTabProps) {
  const {
    triggerToast,
    logAuditActivity,
    auditLogs,
    setAuditLogs,
    clearAuditLogs,
  } = useUiStore();

  const [currentTheme, setCurrentTheme] = useState<
    | "slate"
    | "espresso"
    | "midnight"
    | "matcha"
    | "royal"
    | "crimson"
    | "ocean"
    | "forest"
    | "custom"
  >(appConfig.theme || "slate");
  const [currentLayout, setCurrentLayout] = useState<"grid" | "list">(
    appConfig.layoutMode || "grid",
  );

  const handleUpdateThemeAndLayout = (
    themeName:
      | "slate"
      | "espresso"
      | "midnight"
      | "matcha"
      | "royal"
      | "crimson"
      | "ocean"
      | "forest"
      | "custom",
    layoutType: "grid" | "list",
  ) => {
    setCurrentTheme(themeName);
    setCurrentLayout(layoutType);
    onUpdateConfig({
      theme: themeName,
      layoutMode: layoutType,
    });
    triggerToast(
      `Tampilan berubah! Tema: ${themeName.toUpperCase()}, Mode: ${layoutType.toUpperCase()}`,
    );
  };

  return (
    <>
      <div
        className="bg-white p-6 rounded-3xl border border-slate-150 border-slate-200/50 shadow-sm space-y-6 animate-fade-in"
        id="theme-config-panel"
      >
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Palette size={16} />
            Kustomisasi Visual & Tema Fleksibel
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ubah skema warna aplikasi secara total dan sinkronisasikan untuk
            layar HP pemilik kedai kustom.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Theme Card 1: Slate Enterprise */}
          <div
            onClick={() => handleUpdateThemeAndLayout("slate", currentLayout)}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "slate"
                ? "border-blue-500 bg-blue-50/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider font-mono">
                Slate Standard
              </span>
              {currentTheme === "slate" && (
                <CheckCircle
                  size={12}
                  className="text-blue-500 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-slate-900 border border-slate-800 p-1.5 flex flex-col justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <div className="w-6 h-1.5 rounded bg-slate-700" />
              </div>
              <div className="w-8 h-1.5 rounded bg-slate-800" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-medium">
              Enterprise Slate. Tema formal, tegas & profesional.
            </p>
          </div>

          {/* Theme Card 2: Espresso Warmth */}
          <div
            onClick={() =>
              handleUpdateThemeAndLayout("espresso", currentLayout)
            }
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "espresso"
                ? "border-amber-700 bg-amber-50/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider font-mono">
                Espresso Warm
              </span>
              {currentTheme === "espresso" && (
                <CheckCircle
                  size={12}
                  className="text-amber-700 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-[#2A1810] border border-[#3D251A] p-1.5 flex flex-col justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <div className="w-6 h-1.5 rounded bg-[#3D251A]" />
              </div>
              <div className="w-8 h-1.5 rounded bg-[#4F3526]" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-medium">
              Espresso Baru. Kehangatan barista kayu kalsik.
            </p>
          </div>

          {/* Theme Card 3: Midnight Techno */}
          <div
            onClick={() =>
              handleUpdateThemeAndLayout("midnight", currentLayout)
            }
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "midnight"
                ? "border-indigo-500 bg-indigo-50/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider font-mono">
                Midnight Techno
              </span>
              {currentTheme === "midnight" && (
                <CheckCircle
                  size={12}
                  className="text-indigo-500 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-[#090D16] border border-slate-800 p-1.5 flex flex-col justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <div className="w-6 h-1.5 rounded bg-slate-800" />
              </div>
              <div className="w-8 h-1.5 rounded bg-indigo-950/40" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-medium">
              Cyberpunk. Pelindung mata radiasi shift malam.
            </p>
          </div>

          {/* Theme Card 4: Matcha Zen */}
          <div
            onClick={() => handleUpdateThemeAndLayout("matcha", currentLayout)}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "matcha"
                ? "border-emerald-600 bg-emerald-50/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider font-mono">
                Matcha Zen
              </span>
              {currentTheme === "matcha" && (
                <CheckCircle
                  size={12}
                  className="text-emerald-600 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-[#122216] border border-emerald-950 p-1.5 flex flex-col justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="w-6 h-1.5 rounded bg-[#1C3221]" />
              </div>
              <div className="w-8 h-1.5 rounded bg-[#1C3221]" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-medium">
              Kebun Matcha. Menyejukkan emosi antrean.
            </p>
          </div>

          {/* Theme Card 5: Royal Velvet */}
          <div
            onClick={() => handleUpdateThemeAndLayout("royal", currentLayout)}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "royal"
                ? "border-purple-600 bg-purple-50/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider font-mono">
                Royal Premium
              </span>
              {currentTheme === "royal" && (
                <CheckCircle
                  size={12}
                  className="text-purple-600 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-[#1B112B] border border-purple-900/30 p-1.5 flex flex-col justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <div className="w-6 h-1.5 rounded bg-purple-950" />
              </div>
              <div className="w-8 h-1.5 rounded bg-purple-900/40" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-medium">
              Lavender Royal. Sentuhan eksklusif & elegan.
            </p>
          </div>

          {/* Theme Card 6: Crimson Velvet */}
          <div
            onClick={() => handleUpdateThemeAndLayout("crimson", currentLayout)}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "crimson"
                ? "border-rose-600 bg-rose-50/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-rose-850 tracking-wider font-mono">
                Crimson Velvet
              </span>
              {currentTheme === "crimson" && (
                <CheckCircle
                  size={12}
                  className="text-rose-600 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-[#220B0F] border border-rose-950/40 p-1.5 flex flex-col justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <div className="w-6 h-1.5 rounded bg-[#3A141A]" />
              </div>
              <div className="w-8 h-1.5 rounded bg-rose-900/40" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-medium">
              Velvet Cherry. Kopi artisan penuh gairah.
            </p>
          </div>

          {/* Theme Card 7: Ocean Blue */}
          <div
            onClick={() => handleUpdateThemeAndLayout("ocean", currentLayout)}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "ocean"
                ? "border-sky-600 bg-sky-50/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider font-mono">
                Deep Ocean
              </span>
              {currentTheme === "ocean" && (
                <CheckCircle
                  size={12}
                  className="text-sky-600 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-[#0C1B26] border border-sky-950/30 p-1.5 flex flex-col justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <div className="w-6 h-1.5 rounded bg-[#132A39]" />
              </div>
              <div className="w-8 h-1.5 rounded bg-sky-900/40" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-medium">
              Lautan Ice Blue. Rileks, tenang & minimalis.
            </p>
          </div>

          {/* Theme Card 8: Cedar Forest */}
          <div
            onClick={() => handleUpdateThemeAndLayout("forest", currentLayout)}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "forest"
                ? "border-emerald-600 bg-emerald-50/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-850 tracking-wider font-mono">
                Cedar Forest
              </span>
              {currentTheme === "forest" && (
                <CheckCircle
                  size={12}
                  className="text-emerald-500 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-[#0D1E12] border border-emerald-950/35 p-1.5 flex flex-col justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="w-6 h-1.5 rounded bg-[#16301C]" />
              </div>
              <div className="w-8 h-1.5 rounded bg-emerald-900" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-medium">
              Hutan Pine Wood. Bernuansa daun herbal natural.
            </p>
          </div>

          {/* Theme Card 9: CUSTOM BRAND CREATOR */}
          <div
            onClick={() => handleUpdateThemeAndLayout("custom", currentLayout)}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
              currentTheme === "custom"
                ? "border-violet-600 bg-violet-50/10 shadow-md ring-1 ring-violet-200"
                : "border-dashed border-slate-300 bg-slate-50/30 hover:bg-slate-50"
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-violet-750 tracking-wider font-mono flex items-center gap-1">
                <Sparkles size={11} className="text-violet-500 animate-pulse" />
                KUSTOM DIY
              </span>
              {currentTheme === "custom" && (
                <CheckCircle
                  size={12}
                  className="text-violet-600 animate-bounce"
                />
              )}
            </div>
            <div className="h-14 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-700 to-indigo-800 p-1.5 flex flex-col justify-between border border-violet-500 shadow-sm">
              <div className="flex justify-end">
                <span className="text-[7.5px] font-black text-white bg-black/45 px-1 py-0.2 rounded font-mono uppercase tracking-widest">
                  KUSTOM
                </span>
              </div>
              <div className="w-8 h-2 rounded bg-white/20" />
            </div>
            <p className="text-[9.5px] text-slate-500 mt-2 font-bold text-violet-750">
              Desain Palette Warna Sendiri Sesuai Brand Cafe!
            </p>
          </div>
        </div>

        {/* DYNAMIC CUSTOM THEME CONFIGURATOR BLOCK */}
        {currentTheme === "custom" && (
          <div className="p-5 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50/15 via-white to-fuchsia-50/15 space-y-4 animate-fade-in shadow-xs">
            <div className="flex items-center gap-2 border-b border-purple-50 pb-2">
              <Sparkles
                size={15}
                className="text-violet-600 animate-pulse animate-spin"
              />
              <div>
                <h4 className="text-xs font-black text-slate-800">
                  Dynamic Custom Branding Engine (Branding Hub)
                </h4>
                <p className="text-[10.5px] text-slate-500">
                  Pilih palet warna kustom untuk brand cafe Anda. Penerapan akan
                  langsung teraplikasi di seluruh halaman internal dan kasir.
                </p>
              </div>
            </div>

            {/* PALETTE PRESETS */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-violet-600 tracking-wider">
                Langkah Ringkas: Pilih Preset Palette Premium
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateConfig({
                      customThemeType: "cyberpunk",
                      customThemeAppBg: "bg-[#0D021A]",
                      customThemeAsideBg: "bg-[#1A0B2E]",
                      customThemeBorder: "border-[#3D0A4F]",
                      customThemeActiveTab:
                        "bg-pink-600/20 text-pink-400 border border-pink-500/20 font-extrabold shadow-sm",
                      customThemeInactiveTab:
                        "text-violet-300/50 hover:bg-white/5 hover:text-white",
                      customThemeHeaderBg: "bg-[#16002A] border-fuchsia-950/75",
                      customThemeHeaderText: "text-pink-400",
                      customThemeAccentText: "text-fuchsia-300",
                      customThemeAccentBtn: "bg-pink-600 hover:bg-pink-500",
                    });
                    triggerToast("Satu Klik: Tema Neon Cyberpunk Diterapkan!");
                  }}
                  className="p-2.5 rounded-xl border border-pink-100 hover:border-pink-300 bg-white hover:bg-pink-50/10 text-left cursor-pointer transition-all active:scale-95 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-extrabold text-pink-600">
                      🌆 Cyberpunk Neon
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Pink & Deep Purple (Art)
                    </p>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-pink-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateConfig({
                      customThemeType: "luxury",
                      customThemeAppBg: "bg-[#FCFCFC]",
                      customThemeAsideBg: "bg-[#141414]",
                      customThemeBorder: "border-slate-800/80",
                      customThemeActiveTab:
                        "bg-amber-500/20 text-amber-500 border border-amber-500/25 font-extrabold shadow-xs",
                      customThemeInactiveTab:
                        "text-neutral-400 hover:bg-white/5 hover:text-amber-100",
                      customThemeHeaderBg: "bg-[#FDFCFA] border-slate-200",
                      customThemeHeaderText: "text-slate-800",
                      customThemeAccentText: "text-[#D4AF37]",
                      customThemeAccentBtn: "bg-amber-600 hover:bg-amber-550",
                    });
                    triggerToast(
                      "Satu Klik: Tema Golden VIP Luxury Diterapkan!",
                    );
                  }}
                  className="p-2.5 rounded-xl border border-amber-100 hover:border-amber-300 bg-white hover:bg-amber-50/10 text-left cursor-pointer transition-all active:scale-95 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-extrabold text-[#9A7F30]">
                      👑 Golden VIP Lux
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Pure Charcoal & Gold Accent
                    </p>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-[#D4AF37] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateConfig({
                      customThemeType: "strawberry",
                      customThemeAppBg: "bg-[#FFF5F5]",
                      customThemeAsideBg: "bg-[#3F1115]",
                      customThemeBorder: "border-rose-950/45",
                      customThemeActiveTab:
                        "bg-rose-500/20 text-rose-500 border border-rose-500/25 font-bold shadow-xs",
                      customThemeInactiveTab:
                        "text-rose-200/55 hover:bg-white/5 hover:text-rose-100",
                      customThemeHeaderBg: "bg-[#FFEBEC] border-rose-200",
                      customThemeHeaderText: "text-rose-900",
                      customThemeAccentText: "text-amber-300",
                      customThemeAccentBtn: "bg-rose-600 hover:bg-rose-550",
                    });
                    triggerToast(
                      "Satu Klik: Tema Strawberry Bloom Diterapkan!",
                    );
                  }}
                  className="p-2.5 rounded-xl border border-rose-100 hover:border-rose-300 bg-white hover:bg-rose-50/10 text-left cursor-pointer transition-all active:scale-95 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-extrabold text-rose-700">
                      🍓 Strawberry Bloom
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Cute Pinkish Warm Bakery
                    </p>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateConfig({
                      customThemeType: "vintage",
                      customThemeAppBg: "bg-[#F2ECE1]",
                      customThemeAsideBg: "bg-[#3E271D]",
                      customThemeBorder: "border-[#5C3E2F]/45",
                      customThemeActiveTab:
                        "bg-[#FF8225]/20 text-[#FF8225] border border-[#FF8225]/25 font-extrabold shadow-xs",
                      customThemeInactiveTab:
                        "text-[#D0B195] hover:bg-white/5 hover:text-white",
                      customThemeHeaderBg: "bg-[#EBDCC7] border-[#8D6E63]/30",
                      customThemeHeaderText: "text-[#3E271D]",
                      customThemeAccentText: "text-[#FF8225]",
                      customThemeAccentBtn: "bg-[#A0522D] hover:bg-[#8B4513]",
                    });
                    triggerToast("Satu Klik: Tema Woodcraft Retro Diterapkan!");
                  }}
                  className="p-2.5 rounded-xl border border-[#AA7755]/20 hover:border-[#AA7755] bg-white hover:bg-[#FEFCFB] text-left cursor-pointer transition-all active:scale-95 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-extrabold text-[#8D6E63]">
                      🪵 Retro Woodcraft
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Classic Roasted Café Board
                    </p>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-amber-800 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT SETTING - GRID vs LIST */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <LayoutGrid size={15} />
              Mode Tampilan Katalog Produk di POS Kasir
            </p>
            <p className="text-[11px] text-slate-450 mt-1">
              Ubah orientasi barang di kasir agar transaksi memicu pencarian
              secepat kilat hibrida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Grid View */}
            <div
              onClick={() => handleUpdateThemeAndLayout(currentTheme, "grid")}
              className={`p-4 rounded-xl border-2 cursor-pointer bg-white flex justify-between items-center ${
                currentLayout === "grid"
                  ? "border-slate-900 ring-2 ring-slate-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">
                    Grid Card View (Katalog Kompak)
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tampilan kartu grid box untuk menu bergambar.
                  </p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border flex items-center justify-center">
                {currentLayout === "grid" && (
                  <div className="w-2.5 h-2.5 bg-slate-950 rounded-full" />
                )}
              </div>
            </div>

            {/* Option 2: List View */}
            <div
              onClick={() => handleUpdateThemeAndLayout(currentTheme, "list")}
              className={`p-4 rounded-xl border-2 cursor-pointer bg-white flex justify-between items-center ${
                currentLayout === "list"
                  ? "border-slate-900 ring-2 ring-slate-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700">
                  <FileText size={20} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">
                    List Row View (Tabel Ultra-Padat)
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Bagus untuk daftar menu super banyak tanpa scroll
                    berlebihan.
                  </p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border flex items-center justify-center">
                {currentLayout === "list" && (
                  <div className="w-2.5 h-2.5 bg-slate-950 rounded-full" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
