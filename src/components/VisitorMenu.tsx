import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Wifi,
  MapPin,
  Sparkles,
  Minus,
  PlusCircle,
  Info,
  RefreshCw,
  QrCode,
} from "lucide-react";
import { Product } from "../types";

export default function VisitorMenu({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [cart, setCart] = useState<
    { product: Product; quantity: number; notes: string }[]
  >([]);
  const [guestNotes, setGuestNotes] = useState("");

  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const fetchMenu = async () => {
    try {
      const res = await fetch(`/api/orders/table-public/${token}`);
      const data = await res.json();
      if (data.success) {
        setStoreInfo(data.store);
        setTableInfo(data.table);
        setProducts(data.products);
      } else {
        setError(data.message || "Gagal memuat menu");
      }
    } catch (err: any) {
      setError("Kesalahan jaringan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [token]);

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (p: Product) => {
    const existing = cart.find((item) => item.product.id === p.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === p.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { product: p, quantity: 1, notes: "" }]);
    }
  };

  const removeFromCart = (pId: string) => {
    const existing = cart.find((item) => item.product.id === pId);
    if (!existing) return;
    if (existing.quantity === 1) {
      setCart(cart.filter((item) => item.product.id !== pId));
    } else {
      setCart(
        cart.map((item) =>
          item.product.id === pId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      );
    }
  };

  const updateNotes = (pId: string, notes: string) => {
    setCart(
      cart.map((item) => (item.product.id === pId ? { ...item, notes } : item)),
    );
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutProcessing(true);
    setCheckoutError("");

    const formattedItems = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      notes: item.notes || undefined,
    }));

    const orderData = {
      orderTime: new Date().toISOString(),
      tableNumber: tableInfo.name,
      items: formattedItems,
      notes: guestNotes || undefined,
    };

    try {
      const res = await fetch("/api/orders/table-public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: storeInfo.id, orderData }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveOrder(data.order);
        setCart([]);
        setGuestNotes("");
      } else {
        setCheckoutError(data.message || "Gagal mengirim pesanan");
      }
    } catch (err) {
      setCheckoutError("Terjadi kesalahan jaringan");
    } finally {
      setCheckoutProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center font-bold text-slate-500">
        Memuat Menu...
      </div>
    );
  if (error)
    return (
      <div className="p-10 text-center font-bold text-rose-500">{error}</div>
    );

  return (
    <div className="max-w-md mx-auto bg-[#FDFBF7] min-h-screen font-sans text-slate-800 flex flex-col pt-8">
      {/* Header */}
      <div className="bg-[#1e1e1e] text-white p-6 shadow-md rounded-b-[2rem] relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <QrCode size={36} className="mb-2 text-amber-500" />
          <h1 className="text-2xl font-black tracking-tight">
            {storeInfo?.storeName}
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">
            Smart Menu System
          </p>
          <div className="flex gap-4 items-center mt-4 bg-white/10 px-4 py-2 rounded-xl text-[10px] font-medium backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              <MapPin size={12} /> {tableInfo?.name}
            </span>
            <span className="w-px h-3 bg-slate-600" />
            <span className="flex items-center gap-1.5">
              <Wifi size={12} /> {storeInfo?.storeWifiName || "Guest"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col pt-6 pb-24">
        {activeOrder ? (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-2 border border-emerald-100">
                <Info size={32} />
              </div>
              <h2 className="font-extrabold text-xl text-slate-800">
                Menunggu Pembayaran
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed px-4">
                Silakan lakukan transfer menggunakan QRIS berikut, lalu
                informasikan ke kasir di konter.
              </p>
            </div>

            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm text-center">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-4">
                Code Pembayaran QRIS Anda
              </p>
              <img
                src={
                  storeInfo?.qrisImage ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LL_NMID_PAYMENT_ID_${activeOrder.id}_TOTAL_${activeOrder.totalPrice}`
                }
                alt="QRIS"
                className="w-48 h-48 mx-auto p-2 border-2 border-slate-100 rounded-2xl"
                referrerPolicy="no-referrer"
              />
              <p className="font-extrabold text-slate-800 mt-4 text-sm">
                {storeInfo?.qrisMerchantName}
              </p>
              <p className="font-mono text-xl font-black text-amber-700 mt-2">
                Rp {activeOrder.totalPrice.toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase">
                ID Pesanan: {activeOrder.id}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 py-4 bg-[#1e1e1e] text-white font-bold rounded-2xl active:scale-[0.98] transition-transform"
              >
                <RefreshCw size={16} /> Saya Sudah Bayar
              </button>
              <button
                onClick={() => setActiveOrder(null)}
                className="w-full py-4 text-slate-500 hover:text-slate-700 font-bold text-xs uppercase transition-colors"
              >
                Kembali ke Menu Utama
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Cari kopi, pastry, dll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white pl-11 pr-4 py-3.5 text-sm rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Categories */}
            <div
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-5 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === c
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {c === "All" ? "Semua Kategori" : c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredProducts.map((p) => {
                const isPromo = p.promoActive;
                const activePrice = isPromo
                  ? p.price * (1 - (p.promoDiscountPercent || 0) / 100)
                  : p.price;

                return (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <h3 className="font-extrabold text-slate-800">
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                        {p.komposisi || "Racikan rahasia"}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          Rp {activePrice.toLocaleString("id-ID")}
                        </span>
                        {isPromo && (
                          <span className="font-mono text-[10px] text-slate-400 line-through">
                            Rp {p.price.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart({ ...p, price: activePrice })}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl font-black text-xs transition-colors shrink-0"
                    >
                      Tambah
                    </button>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="text-center text-slate-400 py-10 font-bold text-sm">
                  Tidak ada produk ditemukan.
                </div>
              )}
            </div>

            {/* Note Input for the whole order */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <label className="block text-[10px] text-slate-400 uppercase font-black mb-2">
                Catatan Pesanan:
              </label>
              <input
                placeholder="Contoh: Minta disajikan serentak"
                value={guestNotes}
                onChange={(e) => setGuestNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {!activeOrder && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 rounded-t-3xl">
          <div className="space-y-4">
            {/* Cart Items Summary */}
            <div className="max-h-[150px] overflow-y-auto space-y-3 mb-4 mt-2 px-1">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between items-center bg-slate-50 p-3 rounded-xl"
                >
                  <div className="flex-1">
                    <p className="font-extrabold text-xs text-slate-800">
                      {item.product.name}
                    </p>
                    <div className="mt-1 flex gap-2 font-mono text-amber-700 font-bold text-[10px]">
                      Rp{" "}
                      {(item.product.price * item.quantity).toLocaleString(
                        "id-ID",
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-black font-mono text-slate-800 text-xs w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(item.product)}
                      className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
                    >
                      <PlusCircle size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-slate-800 font-black text-sm px-1 border-t border-slate-100 pt-3">
              <span>Total Tagihan</span>
              <span className="text-xl">
                Rp {total.toLocaleString("id-ID")}
              </span>
            </div>
            {checkoutError && (
              <div className="text-rose-600 text-[10px] font-bold text-center">
                {checkoutError}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkoutProcessing}
              className="w-full bg-[#1e1e1e] text-white font-black py-4.5 rounded-2xl flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors active:scale-[0.98] disabled:opacity-70 mt-2"
            >
              {checkoutProcessing
                ? "Memproses Pesanan..."
                : "Pesan & Bayar Sekarang"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
