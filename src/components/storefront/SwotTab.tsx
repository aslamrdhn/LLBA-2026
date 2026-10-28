import React from "react";
import { Award, AlertTriangle, Scale, CheckCircle } from "lucide-react";

interface SwotTabProps {
  appConfig: any;
}
export function SwotTab({ appConfig }: SwotTabProps) {
  return (
    <>
      <div className="space-y-6 animate-fade-in" id="swot-billing-panel">
        {/* SAAS ACCOUNT STATUS */}
        <div className="bg-gradient-to-tr from-sky-900 to-slate-900 text-white p-6 rounded-3xl border border-sky-850 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-sky-400">
              <Award className="animate-spin-slow" size={18} />
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                STATUS KONTRAK SAAS KAFE
              </span>
            </div>
            <span className="bg-emerald-500 text-white font-mono font-bold text-[10px] uppercase px-3 py-1 rounded-full">
              Premium Active
            </span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Aslam LedgerPOS Premium Enterprise
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed mt-1">
                Server cloud database sinkron dilindungi sandbox hibrida.
                Lisensi aktif untuk mendukung bisnis mikro UMKM lokal Indonesia.
              </p>
            </div>

            <div className="bg-white/10 px-5 py-3 rounded-2xl text-center border border-white/10 shadow-md">
              <span className="text-[9px] text-sky-305 font-bold uppercase tracking-wider block text-sky-300">
                Biaya Langganan
              </span>
              <strong className="text-2xl font-black font-mono text-emerald-400">
                Rp 49.000
              </strong>
              <span className="text-[9px] text-slate-400 block font-normal text-slate-300 mt-0.5">
                / bulan (Net)
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="font-bold text-white">Kode Serial POS</p>
              <p className="text-slate-400 font-mono text-[10px] mt-0.5">
                {appConfig.licenseKey || "LL-ASLAM-SECURE-2026"}
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="font-bold text-white">Server Ping</p>
              <p className="text-emerald-400 font-mono text-[10px] mt-0.5">
                ● 14ms (Sangat Cepat)
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="font-bold text-white">Metode Database</p>
              <p className="text-indigo-300 font-mono text-[10px] mt-0.5">
                Dual RAM Memory & Local File
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="font-bold text-white">Batas Menu Jual</p>
              <p className="text-slate-300 font-mono text-[10px] mt-0.5">
                Tak Terbatas (Infinit)
              </p>
            </div>
          </div>
        </div>

        {/* SWOT ANALISIS RE-polish */}
        <div className="bg-white p-6 rounded-3xl border border-slate-150 border-slate-200/50 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Scale size={18} />
              Analisis SWOT Usaha (Strengths, Weaknesses, Opportunities,
              Threats)
            </h2>
            <p className="text-xs text-slate-405 mt-1">
              Laporan audit SWOT teknis dan komersial untuk kelangsungan daya
              saing produk di pasar digital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-emerald-50/10 p-4 rounded-2xl border border-emerald-100/70 space-y-2">
              <p className="font-bold text-emerald-800 flex items-center gap-1.5 text-sm">
                <CheckCircle size={15} className="text-emerald-600" />
                Kelebihan Sistem (Strengths)
              </p>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside leading-relaxed text-[11px]">
                <li>
                  <strong>Laporan Margin Otomatis:</strong> Integrasi cost modal
                  pokok memicu pelaporan rugi laba bersih real-time.
                </li>
                <li>
                  <strong>Sinkronisasi QR Meja:</strong> Pembuat etalase meja
                  pengunjung memotong antrean lokal kasir.
                </li>
                <li>
                  <strong>SaaS Paling Terjangkau:</strong> Skenario harga sewa
                  bulanan 49 ribu mengesampingkan biaya hardware mahal.
                </li>
                <li>
                  <strong>Kompatibilitas Komplit:</strong> Siap dibungkus murni
                  Capacitor Android/iOS tanpa rombakan script.
                </li>
              </ul>
            </div>

            <div className="bg-rose-50/10 p-4 rounded-2xl border border-rose-100/70 space-y-2">
              <p className="font-bold text-rose-800 flex items-center gap-1.5 text-sm">
                <AlertTriangle size={15} className="text-rose-600" />
                Tantangan & Solusi (Weaknesses)
              </p>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside leading-relaxed text-[11px]">
                <li>
                  <strong>Web Bluetooth Printing:</strong> Batasan Chrome API
                  menghambat pengiriman raw ESC/POS.{" "}
                  <span className="text-rose-600 font-semibold">Solusi:</span>{" "}
                  Sediakan ekspor doc struk lokal.
                </li>
                <li>
                  <strong>Integrasi QRIS Statis:</strong> Tidak adanya webhook
                  memicu konfirmasi lokal keuangan.{" "}
                  <span className="text-rose-500 font-semibold">Solusi:</span>{" "}
                  Terapkan konfirmasi lokal PIN supervisor.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
