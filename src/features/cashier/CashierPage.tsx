import React, { useState, useEffect } from "react";
import { useDataStore } from "../../store/dataStore";
import { Product, Order } from "../../types";
import { MoneyText } from "../../components/common/MoneyText";
import { CheckCircle2, Cloud, Sparkles, RefreshCw, ShoppingCart, Search } from "lucide-react";

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  recipeVersion?: number;
}

function ProductGrid({
  products,
  category,
  searchQuery,
  setCategory,
  setSearchQuery,
  onAddToCart,
}: {
  products: CatalogProduct[];
  category: string;
  searchQuery: string;
  setCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  onAddToCart: (p: CatalogProduct) => void;
}) {
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category || "General")))];

  const filtered = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Cari menu kopi, minuman, snack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                category === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => onAddToCart(p)}
            className="group relative bg-white border border-slate-200/80 hover:border-amber-400/80 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium mb-1">
                <span className="uppercase tracking-wider">{p.category}</span>
                {p.recipeVersion && (
                  <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-sm font-mono text-[10px]">
                    v{p.recipeVersion}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-amber-800 transition line-clamp-2">
                {p.name}
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <MoneyText value={p.price} className="text-slate-900 font-bold text-base" />
              <button className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition">
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartSidebar({
  cart,
  subtotal,
  tax,
  total,
  onCheckout,
  onRemoveItem,
}: {
  cart: Array<{ product: CatalogProduct; quantity: number; notes: string }>;
  subtotal: number;
  tax: number;
  total: number;
  onCheckout: () => void;
  onRemoveItem: (index: number) => void;
}) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-slate-700" />
          <h2 className="font-bold text-slate-900 text-lg">Pesanan Aktif</h2>
        </div>
        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
          {cart.reduce((s, c) => s + c.quantity, 0)} Item
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 py-12">
            <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">Keranjang masih kosong</p>
            <p className="text-xs">Klik menu di sebelah kiri untuk menambah</p>
          </div>
        ) : (
          cart.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-slate-50/70 p-3 rounded-xl border border-slate-100"
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="font-semibold text-slate-900 text-sm truncate">
                  {c.product.name}
                </div>
                <div className="text-xs text-slate-600">
                  <MoneyText value={c.product.price} /> x {c.quantity}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MoneyText
                  value={c.product.price * c.quantity}
                  className="font-bold text-slate-900 text-sm"
                />
                <button
                  onClick={() => onRemoveItem(i)}
                  className="text-slate-600 hover:text-red-500 text-xs px-1.5 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-200 p-5 bg-slate-50/50 space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <MoneyText value={subtotal} />
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Pajak PB1 (10%):</span>
            <MoneyText value={tax} />
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 text-slate-900">
            <span>Total Tagihan:</span>
            <MoneyText value={total} className="text-xl font-black text-slate-900" />
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Proses Pembayaran
        </button>
      </div>
    </div>
  );
}

function PaymentModal({
  total,
  paymentMethod,
  setPaymentMethod,
  cashGiven,
  setCashGiven,
  onClose,
  onConfirm,
  isProcessing,
}: {
  total: number;
  paymentMethod: "QRIS" | "Tunai";
  setPaymentMethod: (m: "QRIS" | "Tunai") => void;
  cashGiven: string;
  setCashGiven: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Pembayaran Struk</h2>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-600">Total Wajib Bayar:</span>
          <MoneyText value={total} className="text-2xl font-black text-slate-900" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(["QRIS", "Tunai"] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`p-3 rounded-xl border text-sm font-bold transition cursor-pointer ${
                paymentMethod === method
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {paymentMethod === "Tunai" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Uang Diterima (Rp):</label>
            <input
              type="number"
              placeholder="Contoh: 50000"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
            {Number(cashGiven) >= total && (
              <div className="text-xs text-emerald-600 font-bold flex justify-between pt-1">
                <span>Kembalian:</span>
                <MoneyText value={Number(cashGiven) - total} />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-sm rounded-xl cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing || (paymentMethod === "Tunai" && Number(cashGiven || 0) < total)}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-xs transition cursor-pointer"
          >
            {isProcessing ? "Memproses..." : "Konfirmasi & Bayar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrinterSimulator({
  result,
  onClose,
}: {
  result: { change: number; invoiceNumber?: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl border border-slate-100 space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Transaksi Berhasil!</h2>
          {result.invoiceNumber && (
            <p className="text-xs font-mono text-slate-600 mt-1">No: {result.invoiceNumber}</p>
          )}
        </div>
        {result.change > 0 && (
          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 text-sm">
            <span className="text-emerald-700 font-medium">Uang Kembalian:</span>
            <div className="text-xl font-black text-emerald-800">
              <MoneyText value={result.change} />
            </div>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          Selesai & Buka Transaksi Baru
        </button>
      </div>
    </div>
  );
}

export default function CashierPage() {
  const { products: localProducts, addOrder } = useDataStore();
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [isServerCatalog, setIsServerCatalog] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [cart, setCart] = useState<
    Array<{
      product: CatalogProduct;
      quantity: number;
      notes: string;
    }>
  >([]);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "Tunai">("QRIS");
  const [cashGiven, setCashGiven] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [checkoutResult, setCheckoutResult] = useState<{
    success: boolean;
    order: Order;
    change: number;
    invoiceNumber?: string;
  } | null>(null);

  // Fetch live server catalog (§13.4)
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      setIsLoadingCatalog(true);
      try {
        const res = await fetch("/api/pos/catalog", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.menus && json.data.menus.length > 0) {
            if (isMounted) {
              setCatalog(json.data.menus);
              setIsServerCatalog(true);
            }
            return;
          }
        }
      } catch {
        // Fallback to local
      }

      if (isMounted) {
        setCatalog(
          localProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
          }))
        );
        setIsServerCatalog(false);
      }
      setIsLoadingCatalog(false);
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [localProducts]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  const handleCheckout = async () => {
    setIsProcessing(true);

    const clientUuid = `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const idempotencyKey = `idem-${clientUuid}`;

    try {
      // Send to server checkout API
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        credentials: "include",
        body: JSON.stringify({
          clientUuid,
          outletId: "outlet-utama",
          items: cart.map((c) => ({
            menuId: c.product.id,
            quantity: c.quantity,
          })),
          payments: [
            {
              method: paymentMethod === "Tunai" ? "CASH" : "QRIS",
              amount: total,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const invoiceNumber = data.data?.sale?.invoiceNumber || clientUuid;

        const newOrder: Order = {
          id: invoiceNumber,
          orderTime: new Date().toISOString(),
          tableNumber: "Takeaway",
          items: cart.map((c) => ({
            productId: c.product.id,
            quantity: c.quantity,
            priceAtSale: c.product.price,
            costAtSale: 0,
          })),
          subtotal,
          discount: 0,
          tax,
          totalPrice: total,
          paymentMethod: paymentMethod === "Tunai" ? "Tunai" : "QRIS",
          paymentStatus: "Success",
          receiptPrinted: true,
        };

        addOrder(newOrder);
        setCheckoutResult({
          success: true,
          order: newOrder,
          change: paymentMethod === "Tunai" ? Math.max(0, Number(cashGiven || 0) - total) : 0,
          invoiceNumber,
        });
      } else {
        throw new Error("Server checkout offline");
      }
    } catch {
      // Fallback offline order recording
      const newOrder: Order = {
        id: `OFFLINE-${Date.now()}`,
        orderTime: new Date().toISOString(),
        tableNumber: "Takeaway",
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          priceAtSale: c.product.price,
          costAtSale: 0,
        })),
        subtotal,
        discount: 0,
        tax,
        totalPrice: total,
        paymentMethod: paymentMethod === "Tunai" ? "Tunai" : "QRIS",
        paymentStatus: "Success",
        receiptPrinted: false,
      };

      addOrder(newOrder);
      setCheckoutResult({
        success: true,
        order: newOrder,
        change: paymentMethod === "Tunai" ? Math.max(0, Number(cashGiven || 0) - total) : 0,
      });
    } finally {
      setIsProcessing(false);
      setIsPaymentOpen(false);
      setCart([]);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50/70 overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kasir POS</h1>
            <p className="text-xs text-slate-600 mt-0.5">Sistem Operasi True Cost &bull; LedgerLine by Aslam</p>
          </div>
          <div className="flex items-center gap-2">
            {isServerCatalog ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Katalog Server Terhubung
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Cloud className="w-3.5 h-3.5 text-amber-500" />
                Mode Lokal (Offline Ready)
              </span>
            )}
          </div>
        </div>

        <ProductGrid
          products={catalog}
          category={selectedCategory}
          searchQuery={searchQuery}
          setCategory={setSelectedCategory}
          setSearchQuery={setSearchQuery}
          onAddToCart={(p) => {
            const existing = cart.find((item) => item.product.id === p.id);
            if (existing) {
              setCart(
                cart.map((item) =>
                  item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item
                )
              );
            } else {
              setCart([...cart, { product: p, quantity: 1, notes: "" }]);
            }
          }}
        />
      </div>

      <div className="w-[380px] xl:w-[420px] h-full shadow-lg">
        <CartSidebar
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onCheckout={() => setIsPaymentOpen(true)}
          onRemoveItem={(index) => {
            setCart(cart.filter((_, i) => i !== index));
          }}
        />
      </div>

      {isPaymentOpen && (
        <PaymentModal
          total={total}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          cashGiven={cashGiven}
          setCashGiven={setCashGiven}
          onClose={() => setIsPaymentOpen(false)}
          onConfirm={handleCheckout}
          isProcessing={isProcessing}
        />
      )}

      {checkoutResult && (
        <PrinterSimulator result={checkoutResult} onClose={() => setCheckoutResult(null)} />
      )}
    </div>
  );
}
