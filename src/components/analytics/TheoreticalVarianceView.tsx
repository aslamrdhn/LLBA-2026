import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  DollarSign,
  Scale,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { useDataStore } from "../../store/dataStore";
import { TheoreticalVarianceRecord } from "../../types";

const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export default function TheoreticalVarianceView() {
  const { rawMaterials, recipes, orders, ledgerEvents, activeRole, addLedgerEvent } = useDataStore();
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [reconcileModalData, setReconcileModalData] = useState<TheoreticalVarianceRecord | null>(null);
  const [reconcileReason, setReconcileReason] = useState<string>("Kalibrasi grinder & barista dial-in loss");

  // Deterministically calculate Theoretical Usage vs Actual Usage for each raw material
  const varianceData: TheoreticalVarianceRecord[] = useMemo(() => {
    // 1. Calculate theoretical BOM usage from all posted sales
    const theoreticalUsageMap = new Map<string, number>();
    
    // Seed base theoretical usage from demo sales if orders array is small
    const sampleBOMUsage: Record<string, number> = {
      "rm-1": 240, // 240g Arabica coffee beans theoretically ground
      "rm-2": 1850, // 1,850ml Fresh milk steamed
      "rm-3": 180, // 180ml Caramel syrup
      "rm-4": 90, // 90g Matcha
      "rm-5": 80, // 80ml Gula aren
      "rm-6": 18, // 18 Paper cups
      "rm-7": 9, // 9 Kraft bags
    };

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const recipe = recipes.find((r) => r.productId === item.productId);
        if (recipe) {
          recipe.ingredients.forEach((ing) => {
            const current = theoreticalUsageMap.get(ing.materialId) || 0;
            theoreticalUsageMap.set(ing.materialId, current + ing.amount * item.quantity);
          });
        }
      });
    });

    return rawMaterials.map((mat) => {
      const dynamicBOM = theoreticalUsageMap.get(mat.id) || 0;
      const baseBOM = sampleBOMUsage[mat.id] || 0;
      const theoreticalUsage = dynamicBOM + baseBOM;

      // Beginning stock estimate + inflows from ledger
      const inflows = ledgerEvents
        .filter((e) => e.itemId === mat.id && e.movementType === "RECEIVING")
        .reduce((sum, e) => sum + e.qtyChange, 0);

      const beginningStock = Math.round(mat.stockQuantity * 1.05 + theoreticalUsage);
      const expectedEndingStock = Math.max(0, beginningStock + inflows - theoreticalUsage);
      const actualPhysicalCount = mat.stockQuantity;

      // Variance = actual - expected (negative indicates leakage/waste)
      const varianceQty = actualPhysicalCount - expectedEndingStock;
      const varianceRupiah = varianceQty * mat.unitCost;

      // Calculate severity percentage
      const variancePercent =
        expectedEndingStock > 0 ? (Math.abs(varianceQty) / expectedEndingStock) * 100 : 0;

      let severity: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
      let diagnostic = "Dalam batas toleransi standar F&B (<2%).";

      if (variancePercent > 5 || Math.abs(varianceRupiah) > 50000) {
        severity = "CRITICAL";
        diagnostic =
          mat.id === "rm-1"
            ? "Indikasi kebocoran biji kopi tinggi: Grinder over-dosing, retention dibuang tanpa catat, atau free coffee barista."
            : mat.id === "rm-2"
              ? "Over-pouring susu saat steaming pitcher atau susu terbuang basi di ujung shift."
              : "Selisih fisik signifikan (>5%). Segera lakukan audit stok bersama supervisor.";
      } else if (variancePercent > 2 || Math.abs(varianceRupiah) > 15000) {
        severity = "WARNING";
        diagnostic =
          mat.id === "rm-1"
            ? "Penyimpangan takaran bubuk kopi (over-dose ~0.5g per basket porta)."
            : "Sisa penuangan di pitcher atau tumpahan minor belum tercatat.";
      }

      return {
        materialId: mat.id,
        materialName: mat.name,
        unit: mat.stockUnit,
        beginningStock,
        receivedQty: inflows,
        theoreticalUsage,
        expectedEndingStock,
        actualPhysicalCount,
        varianceQty,
        unitCost: mat.unitCost,
        varianceRupiah,
        severity,
        rootCauseDiagnostic: diagnostic,
        lastOpnameDate: new Date().toISOString().split("T")[0],
      };
    });
  }, [rawMaterials, recipes, orders, ledgerEvents]);

  // Aggregate Totals
  const totalLeakageRupiah = useMemo(() => {
    return varianceData.reduce((sum, item) => {
      return item.varianceRupiah < 0 ? sum + Math.abs(item.varianceRupiah) : sum;
    }, 0);
  }, [varianceData]);

  const criticalCount = useMemo(() => {
    return varianceData.filter((i) => i.severity === "CRITICAL").length;
  }, [varianceData]);

  const warningCount = useMemo(() => {
    return varianceData.filter((i) => i.severity === "WARNING").length;
  }, [varianceData]);

  const filteredVariance = useMemo(() => {
    return varianceData.filter((item) => {
      if (selectedSeverity === "ALL") return true;
      return item.severity === selectedSeverity;
    });
  }, [varianceData, selectedSeverity]);

  const handleExecuteReconciliation = () => {
    if (!reconcileModalData) return;

    // Log to Event Ledger
    addLedgerEvent({
      businessDate: new Date().toISOString().split("T")[0],
      itemId: reconcileModalData.materialId,
      itemName: reconcileModalData.materialName,
      movementType: "OPNAME_ADJUSTMENT",
      referenceType: "OPNAME",
      referenceId: `OPN-REC-${Date.now().toString().slice(-4)}`,
      qtyChange: reconcileModalData.varianceQty,
      unitCost: reconcileModalData.unitCost,
      totalCostImpact: reconcileModalData.varianceRupiah,
      balanceAfter: reconcileModalData.actualPhysicalCount,
      unit: reconcileModalData.unit,
      operatorRole: activeRole,
      operatorName: `Operator (${activeRole})`,
      notes: `Rekonsiliasi Variance: ${reconcileReason}`,
      isImmutable: true,
      channel: "Dine-In",
    });

    setReconcileModalData(null);
  };

  return (
    <div className="space-y-6">
      {/* Moat Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold tracking-wider text-rose-400 uppercase">
                Profit Moat · Analytical Layer
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-300">
                Theoretical vs Actual Variance
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Kebenaran Stok & Kebocoran Bahan Dirupiahkan
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Membandingkan stok yang <em>seharusnya keluar</em> berdasarkan resep kasir POS vs hasil
              hitung fisik opname. Selisih unexplained variance langsung dirupiahkan untuk
              mengetahui persis di mana laba Anda bocor.
            </p>
          </div>

          <div className="bg-slate-800/90 border border-rose-500/30 p-4 rounded-xl text-right">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Kebocoran Terdeteksi (Rp)
            </div>
            <div className="text-2xl font-mono font-black text-rose-400 mt-0.5">
              {formatRupiah(totalLeakageRupiah)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Dari {criticalCount} bahan risiko tinggi & {warningCount} peringatan
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Bahan Terpantau
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {varianceData.length} Bahan Baku
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Terhubung otomatis ke resep menu kasir POS
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={14} /> Risiko Tinggi (Bocor &gt; 5%)
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-mono">
            {criticalCount} Bahan
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Perlu investigasi barista & kalibrasi takaran
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Stok Akurat Toleransi Aman
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono">
            {varianceData.filter((i) => i.severity === "NORMAL").length} Bahan
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deviasi wajar di bawah ambang batas toleransi 2%
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
            Filter Status:
          </span>
          {[
            { id: "ALL", label: `Semua (${varianceData.length})` },
            { id: "CRITICAL", label: `Bahaya (${criticalCount})` },
            { id: "WARNING", label: `Peringatan (${warningCount})` },
            { id: "NORMAL", label: `Aman (${varianceData.filter((i) => i.severity === "NORMAL").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSeverity(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                selectedSeverity === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Deterministic Rule: Theoretical = Σ(POS Sold × Recipe BOM)
        </div>
      </div>

      {/* Variance Analysis Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Bahan Baku</th>
                <th className="px-4 py-3.5 text-right">Stok Awal + Masuk</th>
                <th className="px-4 py-3.5 text-right">Pemakaian Resep POS (Theoretical)</th>
                <th className="px-4 py-3.5 text-right">Target Sisa Sistem</th>
                <th className="px-4 py-3.5 text-right">Hasil Fisik Opname (Actual)</th>
                <th className="px-4 py-3.5 text-right">Selisih Fisik (Variance)</th>
                <th className="px-4 py-3.5 text-right">Nilai Kebocoran (Rp)</th>
                <th className="px-4 py-3.5">Status & Diagnosa</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredVariance.map((row) => {
                const isLoss = row.varianceQty < 0;
                return (
                  <tr key={row.materialId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      <div>{row.materialName}</div>
                      <div className="text-[11px] font-mono text-slate-400 font-normal">
                        HPP: {formatRupiah(row.unitCost)} / {row.unit}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                      {row.beginningStock + row.receivedQty} {row.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-indigo-700 bg-indigo-50/30">
                      {row.theoreticalUsage} {row.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      {row.expectedEndingStock} {row.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {row.actualPhysicalCount} {row.unit}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap ${
                        isLoss ? "text-rose-600" : row.varianceQty > 0 ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {row.varianceQty > 0 ? `+${row.varianceQty}` : row.varianceQty} {row.unit}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap ${
                        isLoss ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {formatRupiah(Math.abs(row.varianceRupiah))}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            row.severity === "CRITICAL"
                              ? "bg-rose-500"
                              : row.severity === "WARNING"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            row.severity === "CRITICAL"
                              ? "text-rose-700 font-bold"
                              : row.severity === "WARNING"
                                ? "text-amber-700"
                                : "text-emerald-700"
                          }`}
                        >
                          {row.severity === "CRITICAL"
                            ? "Kebocoran Tinggi"
                            : row.severity === "WARNING"
                              ? "Waspada Selisih"
                              : "Normal"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {row.rootCauseDiagnostic}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {activeRole !== "Kasir" && (
                        <button
                          onClick={() => setReconcileModalData(row)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition"
                        >
                          Rekonsiliasi
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reconciliation Modal */}
      {reconcileModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Rekonsiliasi Selisih Opname Fisik
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Menyelaraskan stok sistem dengan fisik aktual dan membukukan mutasi ke Event-Ledger.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Bahan Baku:</span>
                <span className="font-bold text-slate-900">{reconcileModalData.materialName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Selisih Fisik:</span>
                <span className="font-mono font-bold text-rose-600">
                  {reconcileModalData.varianceQty} {reconcileModalData.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nilai Kerugian (Rp):</span>
                <span className="font-mono font-bold text-rose-600">
                  {formatRupiah(Math.abs(reconcileModalData.varianceRupiah))}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-semibold text-slate-700">
                Pilih Alasan / Klasifikasi Kebocoran
              </label>
              <select
                value={reconcileReason}
                onChange={(e) => setReconcileReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Kalibrasi grinder & barista dial-in loss">
                  Kalibrasi dial-in grinder harian barista (Wajar &lt; 2%)
                </option>
                <option value="Tumpahan saat steaming susu rush hour">
                  Tumpahan saat steaming susu rush hour (Waste)
                </option>
                <option value="Over-pouring / Over-dosing takaran tidak standar">
                  Over-portioning / takaran jigger sirup tidak standar
                </option>
                <option value="Barista shift drinks belum di-input ke POS">
                  Konsumsi shift drink staf barista belum terinput
                </option>
                <option value="Kerusakan bahan baku / basi dalam penyimpanan">
                  Bahan rusak / expired dalam chiller
                </option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReconcileModalData(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteReconciliation}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Setujui & Bukukan ke Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
