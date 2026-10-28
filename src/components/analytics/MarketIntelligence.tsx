import React, { useState, useEffect } from "react";
import { Product, RawMaterial } from "../../types";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Building2,
  PhoneCall,
  Mail,
  Send,
  Loader2,
  PlusCircle,
  Lock,
} from "lucide-react";

interface MarketIntelligenceProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  appConfig: any;
  onUpdateConfig: (newConfig: any) => void;
  onRefresh: () => void;
}

export default function MarketIntelligence({
  rawMaterials,
  appConfig,
}: MarketIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "supply_network">(
    "analytics",
  );

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [mySuppliers, setMySuppliers] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [supplierSubTab, setSupplierSubTab] = useState<
    "marketplace" | "mysuppliers"
  >("marketplace");
  const [showAddMySupplier, setShowAddMySupplier] = useState(false);

  const [showPrModal, setShowPrModal] = useState<any>(null);
  const [prDraft, setPrDraft] = useState({ quantity: "", notes: "" });
  const [prSubmitting, setPrSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "";
      const token = localStorage.getItem("ledgerline_jwt_token");

      const headers: any = {
        "Content-Type": "application/json",
        "X-Tenant-Id": tenantId,
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Fetch Smart Average Engine / Predictions
      const resSuggestions = await fetch("/api/procurement/smart-suggestions", {
        headers,
      });
      if (resSuggestions.ok) {
        const data = await resSuggestions.json();
        setSuggestions(Array.isArray(data) ? data : []);
      }

      // 2. Fetch Public Supplier Directory
      const resSuppliers = await fetch("/api/suppliers/public", { headers });
      if (resSuppliers.ok) {
        const data = await resSuppliers.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }

      // 2.5 Fetch My Suppliers
      const resMySuppliers = await fetch("/api/suppliers/tenant", { headers });
      if (resMySuppliers.ok) {
        const data = await resMySuppliers.json();
        setMySuppliers(Array.isArray(data) ? data : []);
      }

      // 3. Fetch My Purchase Requests
      const resPr = await fetch("/api/purchase-requests/tenant", { headers });
      if (resPr.ok) {
        const prData = await resPr.json();
        setPurchaseRequests(Array.isArray(prData) ? prData : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePurchaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrSubmitting(true);
    try {
      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "";
      const token = localStorage.getItem("ledgerline_jwt_token");

      const headers: any = {
        "Content-Type": "application/json",
        "X-Tenant-Id": tenantId,
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/purchase-request", {
        method: "POST",
        headers,
        body: JSON.stringify({
          supplierId: showPrModal.supplierId,
          productId: showPrModal.productId,
          quantity: Number(prDraft.quantity),
          notes: prDraft.notes,
        }),
      });

      if (res.ok) {
        alert(
          "Purchase Request berhasil dikirim ke Supplier. Supplier akan menghubungi Anda.",
        );
        setShowPrModal(null);
        setPrDraft({ quantity: "", notes: "" });
        fetchData();
      } else {
        const body = await res.json();
        alert(body.message || "Gagal mengirim Purchase Request");
      }
    } catch (err) {
      alert("Network error saat mengirim PR");
    } finally {
      setPrSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-max border border-slate-200">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === "analytics" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
        >
          Average Demand & Forecast
        </button>
        <button
          onClick={() => setActiveTab("supply_network")}
          className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 ${activeTab === "supply_network" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
        >
          Supply Network <PackageCheck size={16} className="text-amber-500" />
        </button>
      </div>

      {loading && (
        <div className="p-8 text-center text-slate-500 animate-pulse">
          Memuat data dari LedgerLine Intelligence Engine...
        </div>
      )}

      {activeTab === "analytics" && !loading && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={24} className="text-indigo-600" />
              Inventory Intelligence
            </h2>
            <p className="text-sm text-slate-500">
              Prediksi sisa stok berdasarkan True Average Consumption harian
              dari transaksi riil Point of Sale Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${item.isCritical ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}
              >
                <h3 className="font-bold text-slate-800">
                  {item.materialName}
                </h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stok Saat Ini:</span>
                    <span className="font-bold text-slate-800">
                      {(Number(item.currentStock) || 0).toLocaleString("id-ID")}{" "}
                      {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rata-Rata Harian:</span>
                    <span className="font-bold text-slate-800">
                      {(Number(item.avgDailyUsage) || 0).toLocaleString(
                        "id-ID",
                        {
                          maximumFractionDigits: 1,
                        },
                      )}{" "}
                      {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200/50">
                    <span className="text-slate-500">Prediksi Habis:</span>
                    <span
                      className={`font-bold ${item.isCritical ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {item.daysUntilDepletion} Hari
                    </span>
                  </div>
                </div>
                {item.isCritical && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-100/50 p-2 rounded-lg">
                    <AlertTriangle size={14} /> Stok Kritis, Segera Restock!
                  </div>
                )}
              </div>
            ))}
            {suggestions.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Belum ada data konsumsi yang cukup untuk menghasilkan prediksi
                cerdas.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "supply_network" && !loading && (
        <div className="space-y-6">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-max border border-slate-200">
            <button
              onClick={() => setSupplierSubTab("marketplace")}
              className={`px-4 py-2 rounded-md font-bold text-sm ${supplierSubTab === "marketplace" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              Marketplace Terverifikasi
            </button>
            <button
              onClick={() => setSupplierSubTab("mysuppliers")}
              className={`px-4 py-2 rounded-md font-bold text-sm ${supplierSubTab === "mysuppliers" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              PO & Privat Supplier
            </button>
          </div>

          {supplierSubTab === "marketplace" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Building2 size={24} className="text-amber-500" />
                  LedgerLine Supply Network
                </h2>
                <p className="text-sm text-slate-500">
                  Rekomendasi pemasok bahan baku berdasarkan data permintaan
                  nyata ekosistem. Hubungi atau kirim Purchase Request (PR)
                  langsung. Transaksi & negosiasi dilakukan di luar sistem.
                </p>
              </div>

              <div className="space-y-4">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {supplier.company_name}
                          {supplier.verification_status === "VERIFIED" && (
                            <CheckCircle2 size={16} className="text-blue-500" />
                          )}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {supplier.owner_name} • {supplier.phone} •{" "}
                          {supplier.email}
                        </p>
                        <p className="text-sm text-slate-500">
                          {supplier.address}
                        </p>
                      </div>
                    </div>

                    {supplier.listings && supplier.listings.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                          Katalog Produk Relevan
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {supplier.listings.map((prod: any) => (
                            <div
                              key={prod.id}
                              className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"
                            >
                              <div>
                                <p className="font-bold text-sm text-slate-700">
                                  {prod.product_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {prod.category} • Ref Harga: Rp
                                  {(Number(prod.price_offer) || 0).toLocaleString("id-ID")}/
                                  {prod.unit}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  setShowPrModal({
                                    supplierId: supplier.id,
                                    productId: prod.id,
                                    supplierName: supplier.company_name,
                                    productName: prod.product_name,
                                  })
                                }
                                className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs font-bold rounded-lg transition-colors"
                              >
                                Kirim PR
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {suppliers.length === 0 && (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    Belum ada supplier yang terhubung di area Anda.
                  </div>
                )}
              </div>
            </div>
          )}

          {supplierSubTab === "mysuppliers" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4 border border-slate-200 bg-slate-50 p-6 rounded-2xl">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                  <h3 className="font-sans font-bold text-sm text-slate-900">
                    Daftar Supplier Privat
                  </h3>
                  <button
                    onClick={() => setShowAddMySupplier(true)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-indigo-700"
                  >
                    <PlusCircle size={14} /> Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {mySuppliers.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center bg-white rounded-xl border border-slate-200">
                      Belum ada supplier privat terdaftar atau pesanan riwayat.
                    </p>
                  ) : (
                    mySuppliers.map((s: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm relative group"
                      >
                        <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          {s.company_name}{" "}
                          {s.verification_status === "VERIFIED" && (
                            <CheckCircle2 size={16} className="text-blue-500" />
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {s.address}
                        </p>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                          {s.listings?.map((prod: any) => (
                            <div
                              key={prod.id}
                              className="flex justify-between text-xs items-center"
                            >
                              <span className="font-bold">
                                {prod.product_name}
                              </span>
                              <span className="text-slate-500">
                                Rp{" "}
                                {(prod.price_offer || 0).toLocaleString(
                                  "id-ID",
                                )}{" "}
                                / {prod.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                          {s.phone ? (
                            <a
                              href={`https://wa.me/${s.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1"
                            >
                              <PhoneCall size={12} /> Hubungi WA
                            </a>
                          ) : (
                            <span />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">
                  Riwayat Purchase Request (PR)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-3 font-medium">Tanggal</th>
                        <th className="pb-3 font-medium">Supplier</th>
                        <th className="pb-3 font-medium">Produk</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {purchaseRequests.map((pr) => (
                        <tr key={pr.id}>
                          <td className="py-3">
                            {new Date(pr.createdAt).toLocaleDateString("id-ID")}
                          </td>
                          <td className="py-3 font-medium truncate max-w-[100px]">
                            {pr.supplier?.companyName}
                          </td>
                          <td className="py-3 truncate max-w-[100px]">
                            {pr.product?.productName}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${
                                pr.status === "SENT"
                                  ? "bg-amber-100 text-amber-700"
                                  : pr.status === "READ"
                                    ? "bg-blue-100 text-blue-700"
                                    : pr.status === "FULFILLED"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {pr.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {purchaseRequests.length === 0 && (
                    <div className="py-8 text-center text-slate-400">
                      Belum ada.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {supplierSubTab === "marketplace" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                Riwayat Purchase Request (PR)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-3 font-medium">Tanggal</th>
                      <th className="pb-3 font-medium">Supplier</th>
                      <th className="pb-3 font-medium">Produk</th>
                      <th className="pb-3 font-medium">Qty</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {purchaseRequests.map((pr) => (
                      <tr key={pr.id}>
                        <td className="py-3">
                          {new Date(pr.createdAt).toLocaleDateString("id-ID")}
                        </td>
                        <td className="py-3 font-medium">
                          {pr.supplier?.companyName}
                        </td>
                        <td className="py-3">{pr.product?.productName}</td>
                        <td className="py-3">
                          {pr.quantity} {pr.product?.unit}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${
                              pr.status === "SENT"
                                ? "bg-amber-100 text-amber-700"
                                : pr.status === "READ"
                                  ? "bg-blue-100 text-blue-700"
                                  : pr.status === "FULFILLED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {pr.status}
                          </span>
                        </td>
                        <td className="py-3 truncate max-w-xs">
                          {pr.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {purchaseRequests.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    Anda belum pernah mengirim Purchase Request ke Supplier mana
                    pun.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showPrModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                Draft Purchase Request
              </h3>
              <p className="text-sm text-slate-500">
                Kirim daftar permintaan belanja ke supplier.
              </p>
            </div>

            <form
              onSubmit={handleCreatePurchaseRequest}
              className="p-6 space-y-4"
            >
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase font-bold">
                  Supplier Tujuan
                </p>
                <p className="font-bold text-slate-800">
                  {showPrModal.supplierName}
                </p>
                <p className="text-xs text-slate-500 uppercase font-bold mt-2">
                  Permintaan Produk
                </p>
                <p className="font-medium text-slate-800">
                  {showPrModal.productName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Kuantitas Kebutuhan
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={prDraft.quantity}
                  onChange={(e) =>
                    setPrDraft({ ...prDraft, quantity: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="Misal: 50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Catatan Pengiriman / Negosiasi
                </label>
                <textarea
                  value={prDraft.notes}
                  onChange={(e) =>
                    setPrDraft({ ...prDraft, notes: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none h-24"
                  placeholder="Ceritakan detail permintaanmu (misal: pengiriman hari Selasa pagi)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPrModal(null)}
                  className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={prSubmitting}
                  className="flex-1 py-3 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {prSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Kirim PR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
