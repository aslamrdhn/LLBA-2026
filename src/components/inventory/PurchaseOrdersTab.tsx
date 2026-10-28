import React, { useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { useDataStore } from "../../store/dataStore";
import { RawMaterial } from "../../types";
import {
  ShoppingCart,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  FileText,
  DollarSign,
  Scale,
  X,
} from "lucide-react";

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplierName: string;
  supplierContact: string;
  status: "DRAFT" | "APPROVED" | "RECEIVED";
  approvedBy?: string;
  receivedDate?: string;
  notes?: string;
}

const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: "po-101",
    poNumber: "PO-2026-101",
    orderDate: "2026-10-20",
    materialId: "rm-1",
    materialName: "Arabica Gayo Special Roast (Biji Kopi)",
    quantity: 5000,
    unit: "g",
    unitCost: 280,
    totalCost: 1400000,
    supplierName: "Koperasi Tani Gayo",
    supplierContact: "0812-1111-2222",
    status: "RECEIVED",
    approvedBy: "Owner",
    receivedDate: "2026-10-20 07:15",
    notes: "Batch roast A-grade cupping score 85+",
  },
  {
    id: "po-102",
    poNumber: "PO-2026-102",
    orderDate: "2026-10-20",
    materialId: "rm-2",
    materialName: "Fresh Milk Full Cream Greenfields",
    quantity: 15000,
    unit: "ml",
    unitCost: 22,
    totalCost: 330000,
    supplierName: "PT Susu Segar Nusantara",
    supplierContact: "0812-3333-4444",
    status: "RECEIVED",
    approvedBy: "Manager",
    receivedDate: "2026-10-20 07:25",
    notes: "Delivery dingin pagi chiller",
  },
  {
    id: "po-103",
    poNumber: "PO-2026-103",
    orderDate: "2026-10-20",
    materialId: "rm-3",
    materialName: "Caramel Artisan Syrup Monin",
    quantity: 2000,
    unit: "ml",
    unitCost: 180,
    totalCost: 360000,
    supplierName: "Flavor House Indonesia",
    supplierContact: "0812-5555-6666",
    status: "APPROVED",
    approvedBy: "Manager",
    notes: "Restock sirup untuk menu Caramel Macchiato",
  },
  {
    id: "po-104",
    poNumber: "PO-2026-104",
    orderDate: "2026-10-20",
    materialId: "rm-1",
    materialName: "Arabica Gayo Special Roast (Biji Kopi)",
    quantity: 10000,
    unit: "g",
    unitCost: 280,
    totalCost: 2800000,
    supplierName: "Koperasi Tani Gayo",
    supplierContact: "0812-1111-2222",
    status: "DRAFT",
    notes: "Perencanaan stok akhir pekan (> Rp 2 Juta - Butuh Otoritas Owner)",
  },
];

interface Props {
  materials: RawMaterial[];
  onRefresh?: () => void;
}

export function PurchaseOrdersTab({ materials, onRefresh }: Props) {
  const { triggerToast } = useUiStore();
  const { activeRole, receivePurchaseOrder } = useDataStore();

  const [purchaseOrders, setPurchaseOrders] =
    useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New PO form state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(
    materials[0]?.id || "",
  );
  const [poQty, setPoQty] = useState<number>(1000);
  const [poUnitCost, setPoUnitCost] = useState<number>(
    materials[0]?.unitCost || 200,
  );
  const [poSupplierName, setPoSupplierName] = useState<string>(
    materials[0]?.supplierName || "",
  );
  const [poNotes, setPoNotes] = useState<string>("");

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);
  const totalCost = (poQty || 0) * (poUnitCost || 0);

  // Authority rule evaluation
  const getRequiredRole = (amount: number): "Barista" | "Manager" | "Owner" => {
    if (amount <= 500000) return "Barista";
    if (amount <= 2000000) return "Manager";
    return "Owner";
  };

  const requiredRole = getRequiredRole(totalCost);

  const canApprove = (amount: number): boolean => {
    if (activeRole === "Owner") return true;
    if (activeRole === "Manager" && amount <= 2000000) return true;
    if (activeRole === "Barista" && amount <= 500000) return true;
    return false;
  };

  const handleSelectMaterial = (id: string) => {
    setSelectedMaterialId(id);
    const m = materials.find((item) => item.id === id);
    if (m) {
      setPoUnitCost(m.unitCost || 200);
      setPoSupplierName(m.supplierName || "");
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    const nextPoNum = `PO-2026-${100 + purchaseOrders.length + 1}`;
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: nextPoNum,
      orderDate: new Date().toISOString().split("T")[0],
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      quantity: Number(poQty),
      unit: selectedMaterial.stockUnit,
      unitCost: Number(poUnitCost),
      totalCost,
      supplierName: poSupplierName || selectedMaterial.supplierName || "Supplier",
      supplierContact: selectedMaterial.supplierContact || "-",
      status: "DRAFT",
      notes: poNotes,
    };

    // Synchronize to backend procurement system
    try {
      await fetch("/api/procurement/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: [
            {
              catalogId: selectedMaterial.id,
              quantity: Number(poQty),
              unitPrice: Number(poUnitCost),
              notes: poNotes,
            },
          ],
          notes: poNotes,
        }),
      });
    } catch {
      // Retain offline local resilience
    }

    setPurchaseOrders([newPO, ...purchaseOrders]);
    setShowCreateModal(false);
    triggerToast(`Surat Pesanan ${nextPoNum} berhasil dibuat (Status: DRAFT)!`);
  };

  const handleApprovePO = (po: PurchaseOrder) => {
    if (!canApprove(po.totalCost)) {
      triggerToast(
        `Ditolak Matriks Otoritas: Nominal Rp ${po.totalCost.toLocaleString(
          "id-ID",
        )} butuh persetujuan level "${getRequiredRole(po.totalCost)}". Peran Anda saat ini: "${activeRole}".`,
      );
      return;
    }

    setPurchaseOrders(
      purchaseOrders.map((item) =>
        item.id === po.id
          ? { ...item, status: "APPROVED", approvedBy: activeRole }
          : item,
      ),
    );
    triggerToast(
      `Persetujuan Sukses: ${po.poNumber} disetujui oleh ${activeRole}!`,
    );
  };

  const handleReceiveGoods = async (po: PurchaseOrder) => {
    receivePurchaseOrder({
      poNumber: po.poNumber,
      materialId: po.materialId,
      quantity: po.quantity,
      unitCost: po.unitCost,
      supplierName: po.supplierName,
      notes: po.notes,
    });

    // Synchronize to backend QC Receiving system
    try {
      await fetch("/api/procurement/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          purchaseOrderId: po.id,
          items: [
            {
              catalogId: po.materialId,
              itemId: po.materialId,
              quantityReceived: po.quantity,
              unitCost: po.unitCost,
            },
          ],
          notes: po.notes,
        }),
      });
    } catch {
      // Retain offline local resilience
    }

    setPurchaseOrders(
      purchaseOrders.map((item) =>
        item.id === po.id
          ? {
              ...item,
              status: "RECEIVED",
              receivedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
            }
          : item,
      ),
    );

    triggerToast(
      `Penerimaan Sukses: ${po.quantity} ${po.unit} ${po.materialName} masuk ke Event-Ledger & stok bertambah!`,
    );
    if (onRefresh) onRefresh();
  };

  const filteredOrders = purchaseOrders.filter((po) => {
    if (filterStatus === "ALL") return true;
    return po.status === filterStatus;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner & Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Procurement & Receiving Engine
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-medium">
              Approval Authority Matrix: Aktif ({activeRole})
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-indigo-600" />
            Purchase Order (PO) & Penerimaan Barang
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemesanan bahan baku terkontrol, matriks otorisasi nominal, dan
            penerimaan langsung terposting ke Event-Ledger.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
        >
          <PlusCircle size={15} />
          <span>Buat P.O Baru</span>
        </button>
      </div>

      {/* Authority Matrix Rules Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
            ≤ 500k
          </div>
          <div>
            <p className="font-bold text-slate-800">Otoritas Barista / SPV</p>
            <p className="text-[10px] text-slate-500">Restock harian mendesak (susu, es batu, sirup)</p>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 font-bold">
            ≤ 2 Juta
          </div>
          <div>
            <p className="font-bold text-slate-800">Otoritas Manager</p>
            <p className="text-[10px] text-slate-500">Restock mingguan biji kopi & packaging cup</p>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-850 flex items-center justify-center shrink-0 font-bold">
            &gt; 2 Juta
          </div>
          <div>
            <p className="font-bold text-slate-800">Wajib Otoritas Owner</p>
            <p className="text-[10px] text-slate-500">Pembelian bulk green beans / sparepart mesin</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {["ALL", "DRAFT", "APPROVED", "RECEIVED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStatus === st
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            {st === "ALL"
              ? "Semua Status"
              : st === "DRAFT"
                ? "Menunggu Otorisasi"
                : st === "APPROVED"
                  ? "Disetujui (Menunggu Pengiriman)"
                  : "Diterima (Di Ledger)"}
          </button>
        ))}
      </div>

      {/* PO Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrders.map((po) => {
          const reqRole = getRequiredRole(po.totalCost);
          const isUserAuthorized = canApprove(po.totalCost);

          return (
            <div
              key={po.id}
              className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {po.poNumber}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {po.orderDate}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-base mt-1">
                      {po.materialName}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold font-mono uppercase ${
                      po.status === "RECEIVED"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : po.status === "APPROVED"
                          ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                          : "bg-amber-50 text-amber-850 border border-amber-200 animate-pulse"
                    }`}
                  >
                    {po.status === "RECEIVED"
                      ? "✓ Diterima di Gudang"
                      : po.status === "APPROVED"
                        ? "✓ Disetujui"
                        : "⏳ Butuh Otorisasi"}
                  </span>
                </div>

                {po.notes && (
                  <p className="text-xs text-slate-500 italic mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    "{po.notes}"
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Volume Pesanan:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {po.quantity.toLocaleString("id-ID")} {po.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Harga Satuan:</span>
                    <span className="font-mono font-bold text-slate-700">
                      Rp {po.unitCost.toLocaleString("id-ID")}/{po.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Pemasok / Supplier:</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {po.supplierName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Nilai PO:</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm">
                      Rp {po.totalCost.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-500 flex items-center gap-1 font-medium">
                    <Scale size={12} className="text-indigo-600" />
                    Ambang Otoritas:
                  </span>
                  <span className="font-bold text-slate-800">
                    Level {reqRole}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {po.status === "DRAFT" && (
                  <>
                    <span className="text-[10px] text-slate-400">
                      Peran aktif: <strong>{activeRole}</strong>
                    </span>
                    <button
                      onClick={() => handleApprovePO(po)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isUserAuthorized
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                          : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                      }`}
                      title={
                        isUserAuthorized
                          ? "Setujui PO ini"
                          : `Peran ${activeRole} tidak mencukupi untuk nominal ini`
                      }
                    >
                      <ShieldCheck size={13} />
                      <span>Setujui P.O</span>
                    </button>
                  </>
                )}

                {po.status === "APPROVED" && (
                  <button
                    onClick={() => handleReceiveGoods(po)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <PackageCheck size={15} />
                    <span>Terima Barang & Catat ke Event-Ledger</span>
                  </button>
                )}

                {po.status === "RECEIVED" && (
                  <div className="w-full flex justify-between items-center text-[11px] text-slate-500">
                    <span>
                      Diterima: <strong>{po.receivedDate}</strong>
                    </span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Tercatat di Event-Ledger
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE PO MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white p-6 rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-600" />
                Buat Surat Pesanan Pembelian (P.O)
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Bahan Baku yang Dipesan
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => handleSelectMaterial(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-hidden"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Sisa: {m.stockQuantity} {m.stockUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Pesanan ({selectedMaterial?.stockUnit || "unit"})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={poQty}
                    onChange={(e) => setPoQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono font-bold text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Satuan PO (Rp/{selectedMaterial?.stockUnit || "unit"})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={poUnitCost}
                    onChange={(e) => setPoUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Supplier / Pemasok
                </label>
                <input
                  required
                  value={poSupplierName}
                  onChange={(e) => setPoSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-hidden"
                  placeholder="Nama supplier bahan baku"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan Batch
                </label>
                <input
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-hidden"
                  placeholder="Contoh: Pengiriman batch Sabtu pagi"
                />
              </div>

              {/* Dynamic Authority preview */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Total Estimasi Nilai PO:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    Rp {totalCost.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Syarat Otoritas:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      requiredRole === "Owner"
                        ? "bg-amber-100 text-amber-900"
                        : requiredRole === "Manager"
                          ? "bg-indigo-100 text-indigo-900"
                          : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    Level {requiredRole}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  Simpan P.O
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
