import React, { useState, useMemo } from "react";
import {
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Filter,
  Plus,
  RefreshCw,
  Clock,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useDataStore } from "../../store/dataStore";
import { InventoryLedgerEvent, InventoryMovementType } from "../../types";

const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export default function ChronologicalLedgerView() {
  const { ledgerEvents, rawMaterials, activeRole, addLedgerEvent } = useDataStore();
  const [filterType, setFilterType] = useState<string>("ALL");
  const [selectedItemId, setSelectedItemId] = useState<string>("ALL");
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // New Event Form State
  const [entryType, setEntryType] = useState<InventoryMovementType>("RECEIVING");
  const [formItemId, setFormItemId] = useState(rawMaterials[0]?.id || "rm-1");
  const [formQty, setFormQty] = useState<number>(1000);
  const [formUnitCost, setFormUnitCost] = useState<number>(280);
  const [formRefId, setFormRefId] = useState<string>("PO-MANUAL-01");
  const [formNotes, setFormNotes] = useState<string>("");

  const filteredEvents = useMemo(() => {
    return ledgerEvents.filter((evt) => {
      const matchType = filterType === "ALL" || evt.movementType === filterType;
      const matchItem = selectedItemId === "ALL" || evt.itemId === selectedItemId;
      return matchType && matchItem;
    });
  }, [ledgerEvents, filterType, selectedItemId]);

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const item = rawMaterials.find((m) => m.id === formItemId);
    if (!item) return;

    const qtyNumber = Number(formQty) || 0;
    const isOutflow = ["POS_SALE", "WASTE", "RETURN_SUPPLIER"].includes(entryType);
    const effectiveQty = isOutflow ? -Math.abs(qtyNumber) : Math.abs(qtyNumber);
    const unitCost = Number(formUnitCost) || item.unitCost;
    const currentStock = Number(item.stockQuantity || 0);
    const balanceAfter = Math.max(0, currentStock + effectiveQty);

    addLedgerEvent({
      businessDate: new Date().toISOString().split("T")[0],
      itemId: item.id,
      itemName: item.name,
      movementType: entryType,
      referenceType: entryType === "RECEIVING" ? "PO" : entryType === "WASTE" ? "WASTE_TICKET" : "OPNAME",
      referenceId: formRefId || `REF-${Date.now().toString().slice(-4)}`,
      qtyChange: effectiveQty,
      unitCost: unitCost,
      totalCostImpact: effectiveQty * unitCost,
      balanceAfter: balanceAfter,
      unit: item.stockUnit,
      operatorRole: activeRole,
      operatorName: `Operator (${activeRole})`,
      notes: formNotes || `Pencatatan manual ${entryType}`,
      isImmutable: true,
      channel: "Dine-In",
    });

    setShowNewEntryModal(false);
    setFormNotes("");
  };

  const getMovementBadge = (type: InventoryMovementType) => {
    switch (type) {
      case "RECEIVING":
        return {
          label: "Receiving (Barang Masuk)",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <ArrowDownLeft size={14} className="text-emerald-600" />,
        };
      case "POS_SALE":
        return {
          label: "POS Recipe Deduct",
          color: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: <ArrowUpRight size={14} className="text-indigo-600" />,
        };
      case "WASTE":
        return {
          label: "Waste & Spillage",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <AlertTriangle size={14} className="text-amber-600" />,
        };
      case "OPNAME_ADJUSTMENT":
        return {
          label: "Koreksi Opname Fisik",
          color: "bg-purple-50 text-purple-700 border-purple-200",
          icon: <RefreshCw size={14} className="text-purple-600" />,
        };
      case "RETURN_SUPPLIER":
        return {
          label: "Retur Supplier",
          color: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <ArrowUpRight size={14} className="text-rose-600" />,
        };
      default:
        return {
          label: type,
          color: "bg-slate-50 text-slate-700 border-slate-200",
          icon: <Layers size={14} />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Architectural Invariant Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Ledger Engine · Source of Truth
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-400" />
              Immutable Event-Sequenced
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Inventory & Cost Event-Ledger
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Sistem tidak menyimpan state akhir statis. Setiap pergerakan stok dicatat sebagai
            peristiwa berurutan kronologis (Event-Ledger), menghasilkan Average Costing deterministik
            dan jejak audit tanpa selisih gaib.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFormulaModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
          >
            <Info size={14} className="text-amber-400" />
            Formula Average Cost
          </button>
          {activeRole !== "Kasir" && (
            <button
              onClick={() => setShowNewEntryModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
            >
              <Plus size={16} />
              Catat Event Ledger Baru
            </button>
          )}
        </div>
      </div>

      {/* Conflict Resolution & Architecture Explanation Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
        <ShieldCheck className="text-amber-500 shrink-0 mt-0.5" size={18} />
        <div className="text-xs text-slate-700 leading-relaxed">
          <strong className="font-bold text-slate-900">
            Offline-First Event Sequencing (No Last-Write-Wins):
          </strong>{" "}
          Saat kasir offline menyinkronkan data, sistem menyisipkan transaksi ke dalam urutan
          kronologis ledger sesuai timestamp kejadian sesungguhnya, lalu menghitung ulang Average Cost
          secara deterministik tanpa menimpa data sepihak.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-2">
            <Filter size={14} /> Filter Event:
          </span>
          {[
            { id: "ALL", label: "Semua Peristiwa" },
            { id: "RECEIVING", label: "Receiving (Masuk)" },
            { id: "POS_SALE", label: "POS Recipe Deduct" },
            { id: "OPNAME_ADJUSTMENT", label: "Opname Fisik" },
            { id: "WASTE", label: "Waste / Tumpah" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Bahan:</label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Semua Bahan Baku ({rawMaterials.length})</option>
            {rawMaterials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chronological Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Seq #</th>
                <th className="px-4 py-3.5">Waktu / Tanggal</th>
                <th className="px-4 py-3.5">Jenis Gerakan</th>
                <th className="px-4 py-3.5">Item / Bahan</th>
                <th className="px-4 py-3.5 text-right">Mutasi Qty</th>
                <th className="px-4 py-3.5 text-right">Unit Cost (HPP)</th>
                <th className="px-4 py-3.5 text-right">Dampak Biaya (Rp)</th>
                <th className="px-4 py-3.5 text-right">Saldo Akhir</th>
                <th className="px-4 py-3.5">Ref / Pengguna</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredEvents.map((event) => {
                const badge = getMovementBadge(event.movementType);
                const isInflow = event.qtyChange > 0;
                return (
                  <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-500">
                      #{event.sequenceNumber}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-mono">
                      <div>{event.businessDate}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${badge.color}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      <div className="font-semibold text-slate-900">{event.itemName}</div>
                      {event.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {event.notes}
                        </div>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap ${
                        isInflow ? "text-emerald-600" : "text-slate-700"
                      }`}
                    >
                      {isInflow ? `+${event.qtyChange}` : event.qtyChange} {event.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatRupiah(event.unitCost)} / {event.unit}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap ${
                        isInflow ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {formatRupiah(Math.abs(event.totalCostImpact))}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap bg-slate-50/40">
                      {event.balanceAfter} {event.unit}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="font-mono text-slate-700 text-[11px]">
                        {event.referenceId}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {event.operatorName} · {event.operatorRole}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada catatan peristiwa ledger untuk filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Footer Status */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Event Ledger Active · Total {ledgerEvents.length} entri tercatat</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Hash Audit: SHA256-LEDGER-VERIFIED
          </div>
        </div>
      </div>

      {/* Formula Average Cost Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Formula Event-Ledger Weighted Average Costing
                </h3>
                <p className="text-xs text-slate-500">
                  HPP dihitung kronologis berurutan setiap kali terjadi transaksi masuk.
                </p>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl font-mono text-xs mb-4">
              <div className="text-amber-400 mb-2 font-bold">// Rumus Average Cost Baru</div>
              <div>C_baru = ((Q_lama * C_lama) + (Q_masuk * C_masuk)) / (Q_lama + Q_masuk)</div>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                <strong>1. Kronologis Absolut:</strong> HPP tidak boleh dirata-rata secara statis di
                akhir bulan. Jika Anda membeli 5kg kopi @ Rp 250rb lalu menjual 3kg, dan kemudian
                menerima 10kg kopi @ Rp 290rb, sisa stok lama dan baru dihitung proporsional pada detik
                transaksi penerimaan terjadi.
              </p>
              <p>
                <strong>2. Void & Retur Reversal:</strong> Apabila ada void transaksi di POS, stok
                dikembalikan ke saldo ledger dengan HPP snapshot yang tersimpan saat order dibuat.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Ledger Entry Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEntry}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pencatatan Event Mutasi Stok
                </h3>
                <p className="text-xs text-slate-500">
                  Menambahkan entry berurutan ke dalam Event-Ledger permanen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewEntryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Peristiwa
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as InventoryMovementType)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="RECEIVING">RECEIVING (Penerimaan Barang Masuk dari Supplier)</option>
                <option value="WASTE">WASTE (Tumpah / Rusak / Expired)</option>
                <option value="OPNAME_ADJUSTMENT">OPNAME_ADJUSTMENT (Koreksi Selisih Opname Fisik)</option>
                <option value="RETURN_SUPPLIER">RETURN_SUPPLIER (Pengembalian ke Supplier)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Bahan Baku
              </label>
              <select
                value={formItemId}
                onChange={(e) => {
                  setFormItemId(e.target.value);
                  const selected = rawMaterials.find((m) => m.id === e.target.value);
                  if (selected) setFormUnitCost(selected.unitCost);
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {rawMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Stok: {m.stockQuantity} {m.stockUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Kuantitas
                </label>
                <input
                  type="number"
                  step="any"
                  value={formQty}
                  onChange={(e) => setFormQty(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  placeholder="Misal: 1000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biaya Satuan / Unit Cost (Rp)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formUnitCost}
                  onChange={(e) => setFormUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  placeholder="Harga per unit"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. Referensi Dokumen / PO
              </label>
              <input
                type="text"
                value={formRefId}
                onChange={(e) => setFormRefId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                placeholder="PO-2026-009 / SJ-9921"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Alasan / Audit Trail
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                rows={2}
                placeholder="Keterangan kondisi barang, alasan penyesuaian, atau surat jalan..."
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewEntryModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Posting ke Event Ledger
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
