import React, { useState, useEffect } from "react";
import {
  Shield,
  Check,
  X,
  Building2,
  Package,
  Users,
  ShoppingCart,
  Key,
  Award,
  Send,
} from "lucide-react";

export default function SupplyHubAdmin({
  onLogout,
}: {
  onLogout?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "suppliers" | "products" | "migration" | "tenants" | "orders"
  >("tenants");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [migrationTickets, setMigrationTickets] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    const rootToken = localStorage.getItem("aslam_ledger_token");
    const headers = { Authorization: `Bearer ${rootToken}` };
    try {
      if (activeTab === "suppliers") {
        const resSup = await fetch("/api/admin/suppliers", { headers });
        const supData = await resSup.json();
        setSuppliers(Array.isArray(supData) ? supData : (supData?.data || []));
      } else if (activeTab === "products") {
        const resProd = await fetch("/api/admin/products/pending", { headers });
        const prodData = await resProd.json();
        setPendingProducts(Array.isArray(prodData) ? prodData : (prodData?.data || []));
      } else if (activeTab === "migration") {
        const resMig = await fetch("/api/admin/migration-tickets", { headers });
        const migData = await resMig.json();
        setMigrationTickets(Array.isArray(migData) ? migData : (migData?.data || []));
      } else if (activeTab === "tenants") {
        const res = await fetch("/api/admin/tenants", { headers });
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : (data?.data || []));
      } else if (activeTab === "orders") {
        const res = await fetch("/api/admin/purchase-requests", { headers });
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : (data?.data || []));
      }
    } catch (err) {}
  };

  const updateTenantPlan = async (
    id: string,
    subscriptionTier: string,
    tokenToAdd: number,
  ) => {
    const rootToken = localStorage.getItem("aslam_ledger_token");
    try {
      await fetch(`/api/admin/tenants/${id}/update-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${rootToken}`,
        },
        body: JSON.stringify({ subscriptionTier, tokenToAdd }),
      });
      fetchData();
    } catch (err) {}
  };

  const updateSupplierStatus = async (
    id: string,
    status: string,
    verification_status?: string,
  ) => {
    const rootToken = localStorage.getItem("aslam_ledger_token");
    try {
      await fetch(`/api/admin/suppliers/${id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${rootToken}`,
        },
        body: JSON.stringify({ status, verification_status }),
      });
      fetchData();
    } catch (err) {}
  };

  const updateProductStatus = async (
    id: string,
    status: string,
    rejection_reason?: string,
  ) => {
    const rootToken = localStorage.getItem("aslam_ledger_token");
    try {
      await fetch(`/api/admin/products/${id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${rootToken}`,
        },
        body: JSON.stringify({ status, rejection_reason }),
      });
      fetchData();
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="text-indigo-400" /> Super Admin Hub
            </h1>
            <p className="text-sm text-slate-500">
              Hybrid Curated Supply Hub Governance
            </p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 text-sm"
            >
              Dashboard Utama
            </button>
          )}
        </div>

        <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`px-4 py-2 font-bold text-sm whitespace-nowrap ${activeTab === "tenants" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-400"}`}
          >
            Manajemen Toko
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 font-bold text-sm whitespace-nowrap ${activeTab === "orders" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-400"}`}
          >
            Pesanan POS ke Supplier
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`px-4 py-2 font-bold text-sm whitespace-nowrap ${activeTab === "suppliers" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-400"}`}
          >
            Manajemen Supplier
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 font-bold text-sm whitespace-nowrap ${activeTab === "products" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-400"}`}
          >
            Persetujuan Produk
          </button>
          <button
            onClick={() => setActiveTab("migration")}
            className={`px-4 py-2 font-bold text-sm whitespace-nowrap ${activeTab === "migration" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-400"}`}
          >
            Migration Center
          </button>
        </div>

        {activeTab === "suppliers" && (
          <div className="bg-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Building2 size={18} /> Ekosistem Supplier
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="p-3">Perusahaan</th>
                    <th className="p-3">Kontak & Email</th>
                    <th className="p-3">Status Langganan</th>
                    <th className="p-3">Verifikasi</th>
                    <th className="p-3">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td className="p-3">
                        <div className="font-bold text-white">
                          {s.company_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          Owner: {s.owner_name}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono">{s.phone}</div>
                        <div className="text-xs">{s.email}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" : s.status === "PENDING" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.verification_status === "VERIFIED" ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-600/50 text-slate-300"}`}
                        >
                          {s.verification_status}
                        </span>
                      </td>
                      <td className="p-3 space-y-1">
                        {s.status === "PENDING" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                updateSupplierStatus(s.id, "ACTIVE")
                              }
                              className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-2 py-1 rounded text-xs flex items-center"
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() =>
                                updateSupplierStatus(s.id, "SUSPENDED")
                              }
                              className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-2 py-1 rounded text-xs"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                        {s.status === "ACTIVE" &&
                          s.verification_status === "STANDARD" && (
                            <button
                              onClick={() =>
                                updateSupplierStatus(s.id, "ACTIVE", "VERIFIED")
                              }
                              className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 px-2 py-1 rounded text-xs w-full"
                            >
                              Jadikan Verfied ⭐
                            </button>
                          )}
                        {s.status === "ACTIVE" &&
                          s.verification_status === "VERIFIED" && (
                            <button
                              onClick={() =>
                                updateSupplierStatus(s.id, "ACTIVE", "STANDARD")
                              }
                              className="border border-slate-600 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs w-full"
                            >
                              Turunkan Status
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div className="bg-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package size={18} /> Antrean Persetujuan Produk
            </h2>
            {pendingProducts.length === 0 ? (
              <p className="text-slate-400 text-sm p-4 text-center">
                Tidak ada produk yang perlu disetujui saat ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 relative"
                  >
                    <p className="text-xs text-indigo-400 font-bold mb-1">
                      {p.company_name}
                    </p>
                    <h3 className="font-bold text-white">{p.product_name}</h3>
                    <p className="text-xs text-slate-400 mb-2">
                      Kategori: {p.category}
                    </p>
                    <p className="text-lg font-mono font-bold text-emerald-400">
                      Rp {(p.price_offer || 0).toLocaleString("id-ID")}{" "}
                      <span className="text-xs text-slate-500">/ {p.unit}</span>
                    </p>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => updateProductStatus(p.id, "APPROVED")}
                        className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 font-bold py-1 rounded text-xs text-center border border-emerald-500/30"
                      >
                        Setujui Tayang
                      </button>
                      <button
                        onClick={() => {
                          const r = prompt("Alasan penolakan?");
                          if (r) updateProductStatus(p.id, "REJECTED", r);
                        }}
                        className="flex-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 font-bold py-1 rounded text-xs text-center border border-rose-500/30"
                      >
                        Tolak (Revisi)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "migration" && (
          <div className="bg-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
              Migration Center
            </h2>
            {migrationTickets.length === 0 ? (
              <p className="text-slate-400 text-sm p-4 text-center">
                Belum ada tiket migrasi.
              </p>
            ) : (
              <div className="space-y-4">
                {migrationTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 border border-slate-700 rounded-lg bg-slate-900/50"
                  >
                    <p className="text-sm font-bold text-indigo-400">
                      Tenant: {ticket.tenant?.storeName || ticket.tenantId}
                    </p>
                    <p className="font-bold text-white">
                      File: {ticket.fileName}
                    </p>
                    <div className="mt-2 text-sm text-slate-400 flex justify-between">
                      <span>
                        Status:{" "}
                        <span className="font-bold text-white">
                          {ticket.status}
                        </span>
                      </span>
                      <span>
                        Date: {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {ticket.notes}
                    </p>

                    {ticket.status === "PENDING" && (
                      <button
                        onClick={async () => {
                          const rootToken =
                            localStorage.getItem("aslam_ledger_token");
                          await fetch(
                            `/api/admin/migration-tickets/${ticket.id}`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${rootToken}`,
                              },
                              body: JSON.stringify({ status: "REVIEW" }),
                            },
                          );
                          fetchData();
                        }}
                        className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-4 rounded text-xs"
                      >
                        Mulai Review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tenants" && (
          <div className="bg-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={18} /> Manajemen Toko (Tenants)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="p-3">Toko</th>
                    <th className="p-3">Langganan</th>
                    <th className="p-3">Saldo Token</th>
                    <th className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td className="p-3">
                        <div className="font-bold text-white">
                          {t.storeName}{" "}
                          <span className="font-mono text-xs text-slate-500 ml-2">
                            {t.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {t.ownerEmail}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-700 text-indigo-300">
                          {t.subscriptionTier}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-400 font-mono font-bold text-lg">
                        {t.ledgerTokenBalance}
                      </td>
                      <td className="p-3 space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTenantPlan(t.id, "TIER_1", 0)}
                            className="text-[10px] px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                          >
                            Set T1
                          </button>
                          <button
                            onClick={() => updateTenantPlan(t.id, "TIER_2", 0)}
                            className="text-[10px] px-2 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500 hover:bg-indigo-500/40 rounded"
                          >
                            Set T2
                          </button>
                          <button
                            onClick={() => updateTenantPlan(t.id, "TIER_3", 0)}
                            className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500 hover:bg-purple-500/40 rounded"
                          >
                            Set T3
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const tk = prompt(
                                "Berapa token yang ingin ditambahkan?",
                              );
                              if (tk && !isNaN(Number(tk)))
                                updateTenantPlan(t.id, "", Number(tk));
                            }}
                            className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500 hover:bg-emerald-500/40 rounded flex items-center gap-1 w-full justify-center"
                          >
                            <Award size={12} /> Topup Token
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="bg-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShoppingCart size={18} /> Pemesanan dari POS ke Supplier
            </h2>
            {orders.length === 0 ? (
              <p className="text-slate-400 text-sm p-4 text-center">
                Belum ada data pesanan.
              </p>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 lg:flex items-center gap-4"
                  >
                    <div className="flex-1">
                      <p className="text-xs text-indigo-400 font-bold mb-1">
                        DARI TOKO
                      </p>
                      <h3 className="font-bold text-white text-md">
                        {o.tenant?.storeName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        {o.tenant?.ownerEmail}
                      </p>
                    </div>
                    <div className="hidden lg:block text-slate-600">
                      <Send size={24} />
                    </div>
                    <div className="flex-1 mt-4 lg:mt-0 text-right lg:text-left">
                      <p className="text-xs text-emerald-400 font-bold mb-1">
                        KE SUPPLIER (LENGKAP)
                      </p>
                      <h3 className="font-bold text-white text-md">
                        {o.supplier?.companyName}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {o.supplier?.ownerName} • {o.supplier?.contactPhone}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {o.supplier?.contactEmail}
                      </p>
                    </div>
                    <div className="flex-1 bg-slate-900 p-3 rounded-lg mt-4 lg:mt-0">
                      <p className="text-xs text-slate-400">Produk Dipesan</p>
                      <p className="text-sm font-bold text-white">
                        {o.product?.productName}
                      </p>
                      <p className="text-[10px] text-slate-500 border-b border-slate-800 pb-2 mb-2">
                        {o.product?.description?.substring(0, 50)}...
                      </p>
                      <p className="text-sm font-mono text-emerald-400">
                        {o.quantity} x Rp{" "}
                        {(o.product?.priceOffer || 0).toLocaleString("id-ID")}
                      </p>
                      <p className="text-xs mt-2">
                        Status:{" "}
                        <span className="bg-slate-700 px-2 py-0.5 rounded text-white">
                          {o.status}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
