/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useUiStore } from "../store/uiStore";
import { useCartStore } from "../store/cartStore";
import React, { useState, useEffect } from "react";
import { Product, CoffeeTable, OrderItem, FinanceLog, Order } from "../types";

import {
  Search,
  ShoppingBag,
  PlusCircle,
  Minus,
  Trash2,
  CreditCard,
  QrCode,
  DollarSign,
  Printer,
  Wifi,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Globe,
  Building,
  ChevronLeft,
} from "lucide-react";
import { CheckoutResultPanel } from "./cashier/CheckoutResultPanel";
import { ProductCatalog } from "./cashier/ProductCatalog";
import { useDataStore } from "../store/dataStore";

interface CashierProps {
  products: Product[];
  rawMaterials?: any[];
  recipes?: any[];
  tables: CoffeeTable[];
  appConfig: any;
  onRefresh: () => void;
}

export default function Cashier({
  products,
  rawMaterials = [],
  recipes = [],
  tables,
  appConfig,
  onRefresh,
}: CashierProps) {
  const { addOrder, updateProductStock } = useDataStore();
  const {
    cart,
    tableNumber,
    customerName,
    customerPhone,
    discountPercent,
    paymentMethod,
    setTableNumber,
    setCustomerInfo,
    setDiscountPercent,
    setPaymentMethod,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
  } = useCartStore();
  const setCustomerPhone = (p: string) => setCustomerInfo(customerName, p);
  const setCustomerName = (n: string) => setCustomerInfo(n, customerPhone);

  const [showBillPopup, setShowBillPopup] = useState<boolean>(false);

  // === CUSTOMER LOYALTY PORTAL STATES ===
  const [redeemedPoints, setRedeemedPoints] = useState<number>(0);
  const [foundCustomer, setFoundCustomer] = useState<any>(null);

  const fetchCustomerByPhone = async (phoneStr: string) => {
    if (!phoneStr) return;
    try {
      const cleanPhone = phoneStr.replace(/\D/g, "");
      const token = localStorage.getItem("ledgerline_jwt_token");
      const res = await fetch(`/api/customer/${cleanPhone}/points`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && data.customer) {
        setFoundCustomer(data.customer);
        setCustomerName(data.customer.name);
      } else {
        setFoundCustomer(null);
      }
    } catch (err) {
      console.warn("Customer loyalty points lookup skipped or offline");
    }
  };

  // States untuk diskon & pajak

  // Dynamic config-driven tax parsing (98% Commercial-grade upgrade)
  const taxPercent =
    appConfig?.taxType === "NON"
      ? 0
      : appConfig?.taxType === "PB1"
        ? 10
        : appConfig?.taxType === "PPN"
          ? 11
          : appConfig?.taxType === "Kustom"
            ? (appConfig.taxRateCustom ?? 11)
            : 11;

  const taxLabel =
    appConfig?.taxType === "PB1"
      ? "Pajak Resto (10%)"
      : appConfig?.taxType === "NON"
        ? "Bebas Pajak (0%)"
        : appConfig?.taxType === "Kustom"
          ? `Pajak (${taxPercent}%)`
          : "PPN";

  // State Transaksi & Pembayaran & Offline Mode
  const [cashAmountGiven, setCashAmountGiven] = useState<string>("");

  // Thermal Printer Simulator States
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("80mm");

  const [checkoutResult, setCheckoutResult] = useState<{
    success: boolean;
    order: Order;
    change: number;
    securityHash: string;
  } | null>(null);

  const [splitCount, setSplitCount] = useState<number>(2);

  // EDC Terminal Simulator States
  const { triggerToast } = useUiStore();
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Midtrans Snap Pay Simulator States

  const triggerCashierToast = (msg: string) => {
    triggerToast(msg);
    setTimeout(() => triggerToast(""), 4500);
  };

  // Zustand-powered cart handlers
  const handleAddToCart = (product: Product) => {
    const isBeverage =
      product.category === "Coffee" || product.category === "Non-Coffee";
    addToCart({
      product,
      quantity: 1,
      notes: "",
      variant: isBeverage ? "COOL" : undefined,
      sugar: isBeverage ? "NORMAL" : undefined,
    });
  };

  const updateVariant = (id: string, variant: "HOT" | "COOL") =>
    updateCartItem(id, { variant });
  const updateSugar = (id: string, sugar: "LESS" | "NORMAL") =>
    updateCartItem(id, { sugar });
  const handleRemoveFromCart = (id: string) => removeFromCart(id);

  const updateQuantity = (id: string, delta: number, currentQty: number) => {
    const newQty = Math.max(1, currentQty + delta);
    updateCartItem(id, { quantity: newQty });
  };

  const updateNotes = (id: string, notes: string) =>
    updateCartItem(id, { notes });

  // Kalkulasi total matematika - OPTIMISASI DENGAN MEMOISASI
  const subtotal = React.useMemo(() => {
    return cart.reduce((sum, item) => {
      const isPromo = !!item.product.promoActive;
      const baseItemPrice = isPromo
        ? Math.round(
            item.product.price *
              (1 - (item.product.promoDiscountPercent || 15) / 100),
          )
        : item.product.price;
      const itemPrice = Math.max(0, baseItemPrice - (item.discountAmount || 0));
      return sum + itemPrice * item.quantity;
    }, 0);
  }, [cart]);

  const discountAmount = React.useMemo(() => {
    return Math.round((subtotal * discountPercent) / 100);
  }, [subtotal, discountPercent]);

  const taxAmount = React.useMemo(() => {
    return Math.round(((subtotal - discountAmount) * taxPercent) / 100);
  }, [subtotal, discountAmount, taxPercent]);

  const totalBill = React.useMemo(() => {
    return subtotal - discountAmount + taxAmount;
  }, [subtotal, discountAmount, taxAmount]);

  const cashGiven = parseFloat(cashAmountGiven) || 0;

  // Hitung kembalian tunai - OPTIMISASI DENGAN MEMOISASI
  const changeDue = React.useMemo(() => {
    return Math.max(0, cashGiven - totalBill);
  }, [cashGiven, totalBill]);

  // Ambil data meja yang sedang dipilih saat ini - OPTIMISASI DENGAN MEMOISASI
  const activeTableData = React.useMemo(() => {
    return tables.find(
      (t) =>
        `Meja ${t.id} (${(t.name || "").split(" ")[2] || "A"})` ===
          tableNumber || t.id === tableNumber,
    );
  }, [tables, tableNumber]);

  // Efek pengamat otomatis koneksi jaringan internet untuk mengunggah transaksi tertunda

  // Proses Checkout

  // State for Split Bill
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitPayments, setSplitPayments] = useState<
    { method: string; amount: string }[]
  >([{ method: "CASH", amount: "" }]);

  const handleCheckout = async (
    customPayments?: { method: string; amount: string }[],
  ) => {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);

    const formattedItems: OrderItem[] = cart.map((item) => {
      const isPromo = !!item.product.promoActive;
      const salePrice = isPromo
        ? Math.round(
            item.product.price *
              (1 - (item.product.promoDiscountPercent || 15) / 100),
          )
        : item.product.price;

      let finalNotes = item.notes || "";
      if (
        item.product.category === "Coffee" ||
        item.product.category === "Non-Coffee"
      ) {
        const sugarLabel =
          item.sugar === "LESS" ? "Less Sugar" : "Normal Sugar";
        const tempLabel = item.variant === "HOT" ? "HOT" : "ICE";
        finalNotes = `[${tempLabel} - ${sugarLabel}] ${finalNotes}`.trim();
      }

      return {
        productId: item.product.id,
        quantity: item.quantity,
        notes: finalNotes || undefined,
        priceAtSale: salePrice,
        variant: item.variant,
      };
    });

    const orderPayload = {
      orderTime: new Date().toISOString(),
      tableNumber,
      items: formattedItems,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      totalPrice: totalBill,
      paymentMethod,
      paymentStatus: "Success" as const,
      receiptPrinted: false,
      customerPhone: customerPhone || undefined,
      customerName: customerName || undefined,
      redeemedPoints: redeemedPoints || 0,
    };

    // Process Offline/Online
    try {
      if (!navigator.onLine) {
        throw new Error("Koneksi internet terputus (Offline)");
      }

      const savedStore = localStorage.getItem("aslam_ledger_current_store");
      const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";
      const outletId = savedStore
        ? JSON.parse(savedStore).outlets?.[0]?.id
        : "outlet-1";

      // Transform to TCheckoutPayload
      const checkoutPayload = {
        outletId,
        items: cart.map((item) => ({
          menuId: item.product.id,
          quantity: item.quantity,
          note: item.notes,
          discountAmount: item.discountAmount || 0,
          modifiers: item.variant
            ? [{ itemId: item.variant, quantity: 1, reason: "extra" }]
            : [],
        })),
        payments: customPayments
          ? customPayments.map((p) => ({
              method: p.method,
              amount: parseFloat(p.amount || "0"),
            }))
          : [
              {
                method:
                  paymentMethod === "Tunai"
                    ? "CASH"
                    : paymentMethod === "Midtrans"
                      ? "BANK_TRANSFER"
                      : paymentMethod.toUpperCase(),
                amount: totalBill,
              },
            ],
        discountPercent: discountPercent,
      };

      const response = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
          Authorization: `Bearer ${localStorage.getItem("ledgerline_jwt_token")}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        if (paymentMethod === "Midtrans") {
          // CALL REAL MIDTRANS INTEGRATION
          try {
            const tokenResponse = await fetch("/api/midtrans/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("ledgerline_jwt_token")}`,
              },
              body: JSON.stringify({
                orderId: data.order.id,
                amount: totalBill,
                customerPhone: customerPhone || undefined,
                customerName: customerName || undefined,
              }),
            });
            const tokenData = await tokenResponse.json();
            if (tokenData.success && tokenData.redirect_url) {
              window.location.href = tokenData.redirect_url;
              return; // STOP execution and redirect to Snap page
            } else {
              triggerCashierToast(
                "Gagal memuat gateway pembayaran Midtrans: " +
                  (tokenData.message || "Unknown error"),
              );
            }
          } catch (mErr: any) {
            triggerCashierToast("Koneksi Midtrans gagal: " + mErr.message);
          }
        }

        const finalOrder = data.order || data.data?.sale || data.data;
        setCheckoutResult({
          success: true,
          order: finalOrder,
          change: changeDue,
          securityHash:
            finalOrder?.secureHash ||
            finalOrder?.idempotencyKey ||
            finalOrder?.invoiceNumber ||
            `SEC-${Date.now()}`,
        });
        // Clear keranjang
        clearCart();
        setCashAmountGiven("");
        setCustomerPhone("");
        setCustomerName("");
        setRedeemedPoints(0);
        setFoundCustomer(null);
        onRefresh(); // Refresh dashboard data stok & bahan baku harian
      } else {
        triggerCashierToast("Terjadi kesalahan checkout: " + data.message);
      }
    } catch (err: any) {
      triggerCashierToast("Menyimpan transaksi offline: " + err.message);

      const simulatedHash = `offline-hash-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const offlineOrder: Order = {
        id: `TX-OFFLINE-${Date.now().toString().substring(7)}`,
        orderTime: orderPayload.orderTime,
        tableNumber: orderPayload.tableNumber,
        items: orderPayload.items as OrderItem[],
        subtotal: orderPayload.subtotal,
        discount: orderPayload.discount,
        tax: orderPayload.tax,
        totalPrice: orderPayload.totalPrice,
        paymentMethod: orderPayload.paymentMethod,
        paymentStatus: "Success",
        receiptPrinted: false,
        secureHash: simulatedHash,
      };

      // Add to indexeddb persisted store
      addOrder(offlineOrder);
      offlineOrder.items.forEach((item) => {
        updateProductStock(item.productId, item.quantity);
      });

      setCheckoutResult({
        success: true,
        order: offlineOrder,
        change: changeDue,
        securityHash: simulatedHash,
      });

      // Reset keranjang lokal
      clearCart();
      setCashAmountGiven("");
      setCustomerPhone("");
      setCustomerName("");
      setRedeemedPoints(0);
      setFoundCustomer(null);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="cashier-tab">
      <ProductCatalog
        products={products}
        rawMaterials={rawMaterials}
        recipes={recipes}
        appConfig={appConfig}
        addToCart={handleAddToCart}
        activeTableData={activeTableData}
        tables={tables}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
      />

      {/* Kolom Kanan: Keranjang & Detail Pembayaran - Col 5 */}
      <div className="col-span-1 md:col-span-6 lg:col-span-5 space-y-4">
        {/* List Struk Keranjang / Cart POS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-slate-700" size={18} />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Tagihan {tableNumber}
                </h3>
              </div>
              <span className="bg-slate-100 text-slate-700 font-bold font-mono text-[10px] px-2 py-0.5 rounded-md">
                {cart.length} Item
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <ShoppingBag
                  className="mx-auto text-slate-200 mb-3"
                  size={44}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Keranjang masih kosong.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pilihlah salah satu menu premium LedgerLine.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="text-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                          {item.product.name}
                        </span>
                        {item.product.promoActive ? (
                          <div
                            className="flex flex-wrap items-center gap-1.5 mt-0.5"
                            id={`promo-cart-badge-${item.product.id}`}
                          >
                            <span className="text-[8px] font-black font-mono tracking-wider bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase leading-none">
                              🏷️ PROMO
                            </span>
                            <span className="text-xs font-mono font-black text-rose-600">
                              Rp{" "}
                              {Math.round(
                                item.product.price *
                                  (1 -
                                    (item.product.promoDiscountPercent || 15) /
                                      100),
                              ).toLocaleString("id-ID")}
                            </span>
                            <span className="text-[10px] text-slate-405 line-through font-mono text-slate-400">
                              {item.product.price.toLocaleString("id-ID")}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs font-mono font-semibold text-slate-400">
                            Rp {item.product.price.toLocaleString("id-ID")}
                          </p>
                        )}

                        {/* Variant Selector for Beverages */}
                        {(item.product.category === "Coffee" ||
                          item.product.category === "Non-Coffee") && (
                          <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                            {/* Temperature (HOT/ICE) */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                PILIHAN SUHU:
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateVariant(item.id, "HOT")}
                                  className={`py-2 rounded-lg font-extrabold text-[10px] tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                                    (item.variant || "COOL") === "HOT"
                                      ? "bg-red-600 border-red-600 text-white shadow-xs"
                                      : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                                  }`}
                                  style={{ minHeight: "36px" }}
                                >
                                  ☕ HOT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateVariant(item.id, "COOL")}
                                  className={`py-2 rounded-lg font-extrabold text-[10px] tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                                    (item.variant || "COOL") === "COOL"
                                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                      : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                  }`}
                                  style={{ minHeight: "36px" }}
                                >
                                  ❄️ ICE
                                </button>
                              </div>
                            </div>

                            {/* Sugar Modifier (Normal/Less) */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                TAKARAN GULA (SUGAR):
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateSugar(item.id, "NORMAL")}
                                  className={`py-2 rounded-lg font-extrabold text-[10px] tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                                    (item.sugar || "NORMAL") === "NORMAL"
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                      : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  }`}
                                  style={{ minHeight: "36px" }}
                                >
                                  🍬 NORMAL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSugar(item.id, "LESS")}
                                  className={`py-2 rounded-lg font-extrabold text-[10px] tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                                    (item.sugar || "NORMAL") === "LESS"
                                      ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                                      : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                                  }`}
                                  style={{ minHeight: "36px" }}
                                >
                                  📉 LESS SUGAR
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, -1, item.quantity)
                          }
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-md"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-mono text-xs font-bold w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, 1, item.quantity)
                          }
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-md"
                        >
                          <PlusCircle size={12} />
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-md ml-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Notes detail item */}
                    <input
                      type="text"
                      placeholder="Catatan porsi (misal: Less sugar, extra ice)..."
                      value={item.notes}
                      onChange={(e) => updateNotes(item.id, e.target.value)}
                      className="w-full mt-1.5 px-2 py-1 text-[11px] border border-slate-100 hover:border-slate-200 rounded bg-slate-50 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subtotal & Kalkulator Tagihan */}
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal Menu</span>
              <span className="font-mono font-medium">
                Rp {subtotal.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/50">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  Diskon Tambahan (%)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="discount-input"
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) =>
                      setDiscountPercent(
                        Math.min(
                          100,
                          Math.max(0, parseInt(e.target.value) || 0),
                        ),
                      )
                    }
                    className="w-12 text-center border border-slate-200 py-0.5 font-mono font-bold text-xs bg-white rounded"
                  />
                  <span className="font-mono text-slate-900">
                    - Rp {discountAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {[
                  { label: "Promo 5%", val: 5 },
                  { label: "Promo 10%", val: 10 },
                  { label: "Masa Raya 15%", val: 15 },
                  { label: "Gaji Baru 20%", val: 20 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setDiscountPercent(p.val)}
                    className={`text-[9px] py-1 px-1.5 rounded border transition-all cursor-pointer font-medium text-center ${
                      discountPercent === p.val
                        ? "bg-slate-900 border-slate-900 text-white font-semibold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>
                {taxLabel} ({taxPercent}%)
              </span>
              <span className="font-mono">
                Rp {taxAmount.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-dashed border-slate-200 pt-3">
              <span>Total Tagihan</span>
              <span className="font-mono text-slate-900">
                Rp {totalBill.toLocaleString("id-ID")}
              </span>
            </div>

            {/* Metode Pembayaran Tab */}
            <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/50 mt-4">
              <button
                disabled={false}
                onClick={() => setPaymentMethod("QRIS")}
                className={`py-2 text-[10px] font-semibold rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === "QRIS"
                    ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-100"
                    : "text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                <QrCode size={13} />
                QRIS POS
              </button>
              <button
                onClick={() => setPaymentMethod("Tunai")}
                className={`py-2 text-[10px] font-semibold rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === "Tunai"
                    ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <DollarSign size={13} />
                Tunai Cash
              </button>
              <button
                onClick={() => setPaymentMethod("Debit")}
                className={`py-2 text-[10px] font-semibold rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === "Debit"
                    ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <CreditCard size={13} />
                Debit EDC
              </button>
              <button
                disabled={false}
                onClick={() => setPaymentMethod("Midtrans")}
                className={`py-2 text-[10px] font-bold rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  paymentMethod === "Midtrans"
                    ? "bg-blue-600 text-white shadow-xs ring-1 ring-blue-500"
                    : "text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                <Globe size={13} />
                Midtrans
              </button>
              <button
                disabled={false}
                onClick={() => setPaymentMethod("Split")}
                className={`py-2 text-[10px] font-bold rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  paymentMethod === "Split"
                    ? "bg-purple-600 text-white shadow-xs ring-1 ring-purple-500"
                    : "text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                <PlusCircle size={13} />
                Split
              </button>
            </div>

            {/* Panel Input Detail Tunai */}
            {paymentMethod === "Tunai" && cart.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-250 mt-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">
                  Uang Tunai Diberikan (Rp):
                </label>
                <div className="flex gap-2">
                  <input
                    id="cash-granted-input"
                    type="number"
                    placeholder="Masukkan nominal tunai..."
                    value={cashAmountGiven}
                    onChange={(e) => setCashAmountGiven(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-200 focus:outline-hidden text-xs bg-white font-mono font-bold rounded-lg text-slate-800"
                  />
                  <button
                    onClick={() => setCashAmountGiven(totalBill.toString())}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all"
                  >
                    Pas
                  </button>
                </div>
                {cashGiven > 0 && (
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-slate-500 font-semibold">
                      Uang Kembalian
                    </span>
                    <strong className="font-mono text-emerald-600 font-bold">
                      Rp {changeDue.toLocaleString("id-ID")}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Panel Tinjauan Bayar QRIS Dinamis */}
            {paymentMethod === "QRIS" && cart.length > 0 && (
              <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 flex items-center gap-3">
                <QrCode className="text-sky-600 shrink-0" size={24} />
                <p className="text-[10px] text-sky-800 leading-normal">
                  QRIS otomatis dibangkitkan senilai{" "}
                  <strong className="font-mono font-bold">
                    Rp {totalBill.toLocaleString("id-ID")}
                  </strong>
                  . Terenkripsi audit aman.
                </p>
              </div>
            )}

            {/* Panel Tinjauan Bayar Debit EDC */}
            {paymentMethod === "Debit" && cart.length > 0 && (
              <div className="p-3 bg-indigo-50/65 rounded-xl border border-indigo-100/80 flex items-center gap-3 animate-fade-in mt-2">
                <CreditCard className="text-indigo-600 shrink-0" size={24} />
                <p className="text-[10px] text-indigo-800 leading-normal">
                  Terminal EDC Ledger Line terintegrasi senilai{" "}
                  <strong className="font-mono font-bold">
                    Rp {totalBill.toLocaleString("id-ID")}
                  </strong>
                  . Gesek/masukkan kartu pada simulator setelah konfirmasi.
                </p>
              </div>
            )}

            {/* Panel Tinjauan Bayar Midtrans Gateway */}
            {paymentMethod === "Midtrans" && cart.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3 animate-fade-in mt-2">
                <Globe
                  className="text-blue-600 shrink-0 animate-pulse"
                  size={24}
                />
                <p className="text-[10px] text-blue-800 leading-normal">
                  Sandbox{" "}
                  <strong className="text-blue-700 font-bold">
                    Midtrans Snap SDK
                  </strong>{" "}
                  siap memunculkan dialog pembayaran instan untuk memproses
                  QRIS, Virtual Account, GoPay, dan Kartu Kredit senilai{" "}
                  <strong className="font-mono font-bold">
                    Rp {totalBill.toLocaleString("id-ID")}
                  </strong>
                  .
                </p>
              </div>
            )}

            {/* Panel Tinjauan Bayar Split */}
            {paymentMethod === "Split" && cart.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3 animate-fade-in mt-2">
                <PlusCircle className="text-purple-600 shrink-0" size={24} />
                <p className="text-[10px] text-purple-800 leading-normal">
                  Metode{" "}
                  <strong className="text-purple-700 font-bold">
                    Multi-Payment (Split)
                  </strong>{" "}
                  aktif. Anda dapat membagi tagihan senilai{" "}
                  <strong className="font-mono font-bold">
                    Rp {totalBill.toLocaleString("id-ID")}
                  </strong>{" "}
                  ke berbagai metode (Cash + QRIS + Debit).
                </p>
              </div>
            )}

            <button
              id="checkout-trigger-btn"
              disabled={cart.length === 0 || isCheckingOut}
              onClick={() => setShowBillPopup(true)}
              className="w-full mt-4 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/10 toggle-loading-state"
            >
              <CheckCircle2 size={18} />
              Bayar
            </button>
          </div>
        </div>

        <CheckoutResultPanel
          checkoutResult={checkoutResult}
          appConfig={appConfig}
          products={products}
          splitCount={splitCount}
          setCheckoutResult={setCheckoutResult}
          setSplitCount={setSplitCount}
        />
      </div>

      {/* CENTRAL RINGKASAN TAGIHAN POPUP (MODAL DI TENGAH LAYAR) */}
      {showBillPopup && (
        <div
          className="fixed inset-0 bg-slate-950/80 w-full h-full backdrop-blur-xs flex items-center justify-center p-4 z-100 flex-col animate-fade-in"
          style={{ zIndex: 9999 }}
          id="bill-summary-popup"
          onClick={() => setShowBillPopup(false)}
        >
          <div
            className="bg-white text-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-in flex flex-col gap-5 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient gold line */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500" />

            <div className="text-center pb-2 border-b border-slate-100 mt-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 font-extrabold">
                LEDGERLINE BY ASLAM
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1 uppercase">
                Ringkasan Tagihan Kasir
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Meja / ID Pelanggan:{" "}
                <strong className="text-slate-800 font-bold">
                  {tableNumber}
                </strong>
              </p>
            </div>

            {/* List Item Belanja */}
            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
              {cart.map((item) => {
                const isPromo = !!item.product.promoActive;
                const salePrice = isPromo
                  ? Math.round(
                      item.product.price *
                        (1 - (item.product.promoDiscountPercent || 15) / 100),
                    )
                  : item.product.price;
                const discountedPrice = Math.max(
                  0,
                  salePrice - (item.discountAmount || 0),
                );
                const totalRowPrice = discountedPrice * item.quantity;

                return (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-start gap-4 text-xs"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900">
                          {item.product.name}
                        </span>
                        {item.product.category === "Coffee" ||
                        item.product.category === "Non-Coffee" ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black font-mono tracking-wider ${
                              item.variant === "HOT"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-blue-105 bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.variant === "HOT" ? "☕ HOT" : "❄️ ICE"}
                          </span>
                        ) : null}
                        {item.sugar === "LESS" && (
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-black font-mono tracking-wider">
                            LOW SUGAR
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>
                          {item.quantity} porsi x Rp{" "}
                          {salePrice.toLocaleString("id-ID")}
                        </span>
                        {isPromo && (
                          <span className="text-[9px] font-bold text-rose-500 leading-none">
                            🏷️ Diskon Aktif
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[10px] text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/30 font-sans italic">
                          Notes: "{item.notes}"
                        </p>
                      )}
                    </div>

                    <span className="font-mono font-bold text-slate-950 text-right shrink-0">
                      Rp {totalRowPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rekapitulasi Rincian Pembayaran */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5 font-sans">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Subtotal Pesanan ({cart.length} item)</span>
                <span className="font-mono">
                  Rp {subtotal.toLocaleString("id-ID")}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-rose-600 font-semibold">
                  <span>Diskon Tambahan ({discountPercent}%)</span>
                  <span className="font-mono">
                    - Rp {discountAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Pajak Restoran & PB1 (10%)</span>
                  <span className="font-mono">
                    Rp {taxAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
                <span className="text-xs font-black text-slate-900">
                  NILAI TOTAL AKHIR:
                </span>
                <span className="text-lg font-black text-emerald-600 font-mono tracking-tight">
                  Rp {totalBill.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="text-[10.5px] border-t border-dashed border-slate-200 pt-2 flex justify-between text-slate-500">
                <span>Metode Pembayaran Pilihan:</span>
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  {paymentMethod}
                </span>
              </div>
            </div>

            {/* Tombol Konfirmasi Akhir (Bayar/Batal) - Tablet Optimized h-14 (56px) */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBillPopup(false);
                }}
                className="h-14 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center border border-slate-250 font-sans flex items-center justify-center"
              >
                ✖ Batal
              </button>

              <button
                type="button"
                disabled={isCheckingOut}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (paymentMethod === "Split") {
                    const totalPaid = splitPayments.reduce(
                      (s, p) => s + (parseFloat(p.amount) || 0),
                      0,
                    );
                    if (totalPaid < totalBill) {
                      alert(
                        `Total pembayaran (Rp ${totalPaid.toLocaleString("id-ID")}) belum mencukupi total tagihan (Rp ${totalBill.toLocaleString("id-ID")}).`,
                      );
                      return;
                    }
                    await handleCheckout(splitPayments);
                  } else {
                    await handleCheckout();
                  }
                  setShowBillPopup(false);
                }}
                className="h-14 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/15 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-sans"
              >
                {isCheckingOut ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-white animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>💳 Bayar Sekarang</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
