import React, { useState, useEffect } from "react";
import {
  PackageCheck,
  LogOut,
  CheckCircle,
  Clock,
  PlusCircle,
  List,
  CreditCard,
  Building2,
} from "lucide-react";

export default function SupplierPortal({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<
    "requests" | "products" | "subscription"
  >("requests");
  const [supplierData, setSupplierData] = useState<any>(null);

  // Login / Reg state
  const [isLoginHover, setIsLoginHover] = useState(true);
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    company_name: "",
    phone: "",
  });
  const [authError, setAuthError] = useState("");

  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    category: "Beans",
    price_offer: "",
    unit: "kg",
  });
  const [errorInfo, setErrorInfo] = useState("");

  useEffect(() => {
    const data = localStorage.getItem("aslam_ledger_supplier_session");
    if (data) {
      const parsed = JSON.parse(data);
      setSupplierData(parsed);
      fetchData(parsed.token || parsed.id);
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const endpoint = isLoginHover
        ? "/api/supplier/login"
        : "/api/supplier/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (isLoginHover) {
          const supSession = { ...data.supplier, token: data.token };
          localStorage.setItem(
            "aslam_ledger_supplier_session",
            JSON.stringify(supSession),
          );
          setSupplierData(supSession);
          fetchData(supSession.token);
        } else {
          setAuthError(
            "Pendaftaran sukses. Menunggu verifikasi superadmin. Silahkan Login jika disetujui.",
          );
          setIsLoginHover(true);
        }
      } else {
        setAuthError(data.message || "Gagal autentikasi");
      }
    } catch (err) {
      setAuthError("Network error");
    }
  };

  const fetchData = async (supToken: string) => {
    try {
      const res = await fetch("/api/supplier/purchase-requests", {
        headers: { Authorization: `Bearer ${supToken}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setPurchaseRequests(data);

      const resProducts = await fetch("/api/supplier/products", {
        headers: { Authorization: `Bearer ${supToken}` },
      });
      const pData = await resProducts.json();
      if (Array.isArray(pData)) setProducts(pData);
    } catch (err) {}
  };

  const handleLogout = () => {
    localStorage.removeItem("aslam_ledger_supplier_session");
    onLogout();
  };

  // Auth View
  if (!supplierData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
              <Building2 size={24} />
            </div>
            <h1 className="text-2xl font-black text-slate-800">
              Supply Hub Partner
            </h1>
            <p className="text-sm text-slate-500">
              Portal Agregator & Distribusi B2B LedgerLine
            </p>
          </div>

          {authError && (
            <div className="p-3 mb-4 bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 rounded">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isLoginHover ? (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Email Perusahaan
                  </label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, email: e.target.value })
                    }
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, password: e.target.value })
                    }
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Nama Perusahaan / Merek
                  </label>
                  <input
                    type="text"
                    required
                    value={authForm.company_name}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, company_name: e.target.value })
                    }
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Telepon (WA)
                  </label>
                  <input
                    type="text"
                    required
                    value={authForm.phone}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, phone: e.target.value })
                    }
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Email Utama
                  </label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, email: e.target.value })
                    }
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Password Akun
                  </label>
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, password: e.target.value })
                    }
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-sm"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm"
            >
              {isLoginHover ? "Masuk ke Portal" : "Daftar Kemitraan"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsLoginHover(!isLoginHover)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              {isLoginHover
                ? "Atau Daftar Kemitraan Baru"
                : "Sudah Punya Akun? Masuk"}
            </button>
            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center gap-1 mt-2"
            >
              <LogOut size={12} /> Kembali ke Menu POS
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/supplier/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supplierData.token}`,
        },
        body: JSON.stringify(newProduct),
      });
      const d = await res.json();
      if (!res.ok || !d.success) {
        setErrorInfo(d.message || "Gagal mengajukan produk");
        return;
      }
      setShowAddProduct(false);
      setNewProduct({
        product_name: "",
        category: "Beans",
        price_offer: "",
        unit: "kg",
      });
      fetchData(supplierData.token);
    } catch (err) {
      setErrorInfo("Network error");
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await fetch(`/api/supplier/purchase-requests/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supplierData.token}`,
        },
        body: JSON.stringify({ action }),
      });
      fetchData(supplierData.token);
    } catch (err) {}
  };

  if (!supplierData) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              Portal Supplier Kemitraan
            </h1>
            <p className="text-sm text-slate-500">
              Selamat datang, {supplierData.companyName || supplierData.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center text-rose-500 hover:text-rose-700"
          >
            <LogOut size={24} />
            <span className="text-[10px] font-bold">Keluar</span>
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 font-bold text-sm rounded-lg ${activeTab === "requests" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            Pesanan Langsung
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 font-bold text-sm rounded-lg ${activeTab === "products" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            Katalog Produk
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-4 py-2 font-bold text-sm rounded-lg ${activeTab === "subscription" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            Langganan & Status
          </button>
        </div>

        {activeTab === "requests" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PackageCheck size={20} className="text-indigo-600" /> Permintaan
              Pasokan (Purchase Requests)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Pemesan (Toko)</th>
                    <th className="p-3">Permintaan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 text-center text-slate-400"
                      >
                        Belum ada Purchase Request dari kedai kopi mitra.
                      </td>
                    </tr>
                  ) : (
                    purchaseRequests.map((pr) => (
                      <tr key={pr.id}>
                        <td className="p-3 font-mono">
                          {new Date(pr.created_at).toLocaleDateString("id-ID")}
                        </td>
                        <td className="p-3 max-w-[200px] truncate">
                          <div className="font-bold">{pr.storeName}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {pr.storeAddress}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-indigo-700">
                            {pr.quantity} {pr.unit} {pr.product_name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            Catatan: {pr.notes || "-"}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs font-bold rounded-lg ${pr.status === "SENT" ? "bg-amber-100 text-amber-700" : pr.status === "READ" ? "bg-blue-100 text-blue-700" : pr.status === "FULFILLED" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                          >
                            {pr.status}
                          </span>
                        </td>
                        <td className="p-3 space-x-2">
                          {pr.status === "SENT" && (
                            <button
                              onClick={() => handleAction(pr.id, "FULFILL")}
                              className="px-3 py-1 bg-emerald-600 text-white rounded font-bold text-xs hover:bg-emerald-700"
                            >
                              Tandai Sedang Diproses/Selesai
                            </button>
                          )}
                          {(pr.status === "SENT" || pr.status === "READ") && (
                            <button
                              onClick={() => handleAction(pr.id, "CANCEL")}
                              className="px-3 py-1 bg-rose-100 text-rose-700 rounded font-bold text-xs mt-1 hover:bg-rose-200"
                            >
                              Tolak/Batal
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <List size={20} className="text-indigo-600" /> Katalog Penjualan
                Anda
              </h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-indigo-700"
              >
                <PlusCircle size={16} /> Ajukan Produk Baru
              </button>
            </div>

            {errorInfo && (
              <div className="p-3 mb-4 rounded bg-rose-50 text-rose-600 text-sm">
                {errorInfo}
              </div>
            )}

            {showAddProduct && (
              <form
                onSubmit={handleAddProduct}
                className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Produk
                    </label>
                    <input
                      required
                      type="text"
                      value={newProduct.product_name}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          product_name: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Contoh: Biji Kopi Arabica Gayo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Harga Offer (Rp)
                    </label>
                    <input
                      required
                      type="number"
                      value={newProduct.price_offer}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          price_offer: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                      placeholder="150000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Satuan
                    </label>
                    <input
                      required
                      type="text"
                      value={newProduct.unit}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, unit: e.target.value })
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="kg atau liter"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kategori
                    </label>
                    <select
                      value={newProduct.category}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          category: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option>Beans</option>
                      <option>Susu & Dairy</option>
                      <option>Sirup & Flavour</option>
                      <option>Packaging</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-amber-600">
                  Produk yang diajukan akan direview oleh Super Admin LedgerLine
                  sebelum tayang di Coffee Shop.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Ajukan Produk
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  Belum ada produk di katalog Anda.
                </p>
              ) : (
                products.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 border border-slate-200 rounded-xl relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800">
                        {p.product_name}
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.approval_status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : p.approval_status === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}
                      >
                        {p.approval_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 block">
                      Kategori: {p.category}
                    </p>
                    <p className="text-sm font-mono font-bold text-emerald-600">
                      Rp {(p.price_offer || 0).toLocaleString("id-ID")}{" "}
                      <span className="text-xs text-slate-400 font-sans font-normal">
                        / {p.unit}
                      </span>
                    </p>
                    {p.rejection_reason && (
                      <div className="mt-2 text-xs text-rose-600 bg-rose-50 p-2 rounded">
                        Ditolak karena: {p.rejection_reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "subscription" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-lg">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <CreditCard size={20} className="text-indigo-600" /> Subscription
              & Visibility
            </h2>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-4 text-slate-600">
              <p>
                <strong>Status Akun:</strong>{" "}
                <span
                  className={
                    supplierData.status === "ACTIVE"
                      ? "text-emerald-600 font-bold"
                      : "text-amber-600 font-bold"
                  }
                >
                  {supplierData.status || "PENDING"}
                </span>
              </p>
              <p>
                Supplier yang belum melakukan perpanjangan Subscription bulanan
                (Rp 25.000) tidak akan dipromosikan (Hidden) pada halaman{" "}
                <strong>Smart Restock Recommendation</strong> milik Coffee Shop.
              </p>

              <button
                disabled
                className="w-full bg-slate-800 text-slate-400 font-bold text-xs py-2.5 rounded-lg border border-slate-700 mt-4 cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span>Perpanjang Langganan</span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  Belum Aktif — perlu konfigurasi Payment Gateway
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
