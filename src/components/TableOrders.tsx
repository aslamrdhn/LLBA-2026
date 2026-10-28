/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { CoffeeTable, Product } from "../types";
import {
  QrCode,
  Smartphone,
  ChevronRight,
  Utensils,
  CheckCircle2,
  ShoppingBag,
  PlusCircle,
  Minus,
  Sparkles,
  Info,
  BookOpen,
  Printer,
  RefreshCw,
  Search,
  Check,
  CreditCard,
  Wifi,
  MapPin,
  Trash2,
} from "lucide-react";

interface TableOrdersProps {
  tables: CoffeeTable[];
  products: Product[];
  orders: any[];
  appConfig: any;
  onRefresh: () => void;
}

export default function TableOrders({
  tables,
  products,
  orders,
  appConfig,
  onRefresh,
}: TableOrdersProps) {
  // UI Panels and controls
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [activeSegment, setActiveSegment] = useState<"ordering" | "kds">(
    "ordering",
  );
  const [customerModeActive, setCustomerModeActive] = useState<boolean>(false);
  const [showTableHelp, setShowTableHelp] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Custom Table Generator counts
  const [inputTableCount, setInputTableCount] = useState<string>("10");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState<string | null>(
    null,
  );

  // Guest-side simulator states
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [customerCart, setCustomerCart] = useState<
    { product: Product; quantity: number; notes: string }[]
  >([]);
  const [customerSuccessOrder, setCustomerSuccessOrder] = useState<any | null>(
    null,
  );
  const [isCheckoutProcessing, setIsCheckoutProcessing] =
    useState<boolean>(false);
  const [orderError, setOrderError] = useState<string>("");
  const [guestNotes, setGuestNotes] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scanningCompleted, setScanningCompleted] = useState<boolean>(false);

  // Synchronize initial selected table
  React.useEffect(() => {
    if (tables && tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0]);
    }
  }, [tables, selectedTable]);

  // Dynamic tenant retrieval
  const tenantId = useMemo(() => {
    const savedStore = localStorage.getItem("aslam_ledger_current_store");
    return savedStore ? JSON.parse(savedStore).id : "aslam-brew";
  }, []);

  // Map products for fast resolution speed
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Categories list excluding raw ingredients
  const categories = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category !== "Beans") {
        list.add(p.category);
      }
    });
    return ["All", ...Array.from(list)];
  }, [products]);

  // Filtered products list for visitor kiosk
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.category === "Beans" || p.stock <= 0) return false;
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Segment orders for Barista KDS display
  const pendingOrders = useMemo(() => {
    // Orders waiting queue
    return orders
      .filter(
        (o) =>
          !o.prepStatus ||
          o.prepStatus === "Pending" ||
          o.prepStatus === "Waiting Payment",
      )
      .slice(-50);
  }, [orders]);

  const preparingOrders = useMemo(() => {
    return orders.filter((o) => o.prepStatus === "Preparing").slice(-50);
  }, [orders]);

  const servicedOrders = useMemo(() => {
    return orders
      .filter((o) => o.prepStatus === "Ready" || o.prepStatus === "Completed")
      .slice(-30); // limit ready/completed to save Ram
  }, [orders]);

  const readyOrdersLength = useMemo(() => {
    return orders.filter((o) => o.prepStatus === "Ready").length;
  }, [orders]);

  // Resolve active simulated live state
  const activeSimulatedOrder = useMemo(() => {
    if (!customerSuccessOrder) return null;
    return (
      orders.find((o) => o.id === customerSuccessOrder.id) ||
      customerSuccessOrder
    );
  }, [orders, customerSuccessOrder]);

  // Cart operations
  const addCustomerItem = (p: Product) => {
    const existing = customerCart.find((item) => item.product.id === p.id);
    if (existing) {
      setCustomerCart(
        customerCart.map((item) =>
          item.product.id === p.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCustomerCart([
        ...customerCart,
        { product: p, quantity: 1, notes: "" },
      ]);
    }
  };

  const removeCustomerQty = (pId: string) => {
    const target = customerCart.find((item) => item.product.id === pId);
    if (!target) return;
    if (target.quantity === 1) {
      setCustomerCart(customerCart.filter((item) => item.product.id !== pId));
    } else {
      setCustomerCart(
        customerCart.map((item) =>
          item.product.id === pId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      );
    }
  };

  const updateCustomerNotes = (pId: string, notes: string) => {
    setCustomerCart(
      customerCart.map((item) =>
        item.product.id === pId ? { ...item, notes } : item,
      ),
    );
  };

  const customerSubtotal = customerCart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const customerTax = Math.round(customerSubtotal * 0.11); // Standard PB1 (11%)
  const customerTotal = customerSubtotal + customerTax;

  // lokal generation trigger
  const handleBulkGenerateTables = async () => {
    const count = parseInt(inputTableCount);
    if (isNaN(count) || count <= 0 || count > 50) {
      alert("Masukkan jumlah meja antara 1 sampai 50.");
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin melakukan bulk-regenerate ${count} meja baru? Seluruh meja lama milik tenant Anda akan dihapus.`,
      )
    ) {
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/tables/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
        },
        body: JSON.stringify({ count }),
      });
      const resData = await response.json();
      if (resData.success) {
        onRefresh();
        alert(`Sukses mendaftarkan ${count} coffee table baru ke database!`);
        if (resData.tables && resData.tables.length > 0) {
          setSelectedTable(resData.tables[0]);
        }
      } else {
        alert("Gagal membuat tabel secara bulk.");
      }
    } catch (err: any) {
      alert("Error saat menghubungi server: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Cashier lokal confirmaiton
  const handleConfirmOrderPayment = async (orderId: string) => {
    setIsConfirmingPayment(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
        },
      });
      const resData = await response.json();
      if (resData.success) {
        // Automatically set prepStatus to Preparing right after payment is received
        await fetch(`/api/orders/${orderId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-Id": tenantId,
          },
          body: JSON.stringify({ prepStatus: "Preparing" }),
        });
        onRefresh();
      } else {
        alert("Gagal mengonfirmasi pembayaran: " + resData.message);
      }
    } catch (err: any) {
      alert("Gagal menghubungi kasir: " + err.message);
    } finally {
      setIsConfirmingPayment(null);
    }
  };

  // Submit visitor order
  const submitGuestOrderKiosk = async () => {
    if (customerCart.length === 0 || isCheckoutProcessing) return;
    setIsCheckoutProcessing(true);
    setOrderError("");

    const formattedItems = customerCart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      notes: item.notes || undefined,
    }));

    const orderPayload = {
      orderTime: new Date().toISOString(),
      tableNumber: selectedTable ? selectedTable.name : "Meja Mandiri",
      items: formattedItems,
      notes: guestNotes || undefined,
    };

    try {
      const response = await fetch("/api/table-public/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          orderData: orderPayload,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCustomerSuccessOrder(data.order);
        setCustomerCart([]);
        setScanningCompleted(true);
        setGuestNotes("");
        onRefresh();
      } else {
        setOrderError(data.message || "Gagal mengirim pesanan sanddi.");
      }
    } catch (err) {
      setOrderError("Gagal terhubung ke POS Central.");
    } finally {
      setIsCheckoutProcessing(false);
    }
  };

  const handleKdsStatusChange = async (
    orderId: string,
    nextPrepStatus: string,
  ) => {
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
        },
        body: JSON.stringify({ prepStatus: nextPrepStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="space-y-6 text-slate-800 font-sans"
      id="ledgerline-smarttable-evolution"
    >
      {/* SEGMENT BOARD SWITCHER */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 inline-flex gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSegment("ordering")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSegment === "ordering"
              ? "bg-amber-800 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Smartphone size={13} />
          LedgerLine Smart Table Control & Simulator
        </button>
        <button
          type="button"
          onClick={() => setActiveSegment("kds")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer relative ${
            activeSegment === "kds"
              ? "bg-amber-800 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Utensils size={13} />
          Monitor KDS Barista & Koki
          {orders.filter(
            (o) =>
              !o.prepStatus ||
              o.prepStatus === "Pending" ||
              o.prepStatus === "Preparing" ||
              o.prepStatus === "Waiting Payment",
          ).length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 font-mono text-[9px] font-black text-white animate-bounce">
              {
                orders.filter(
                  (o) =>
                    !o.prepStatus ||
                    o.prepStatus === "Pending" ||
                    o.prepStatus === "Preparing" ||
                    o.prepStatus === "Waiting Payment",
                ).length
              }
            </span>
          )}
        </button>
      </div>

      {activeSegment === "ordering" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: TABLE OPERATIONS FOR OWNERS */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="bg-amber-100 text-amber-900 border border-amber-250 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded">
                OWNER PANEL
              </span>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-2">
                <QrCode className="text-amber-800" size={20} />
                LedgerLine Smart Table Hub
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Generate token lunas unik, kelola status meja terisi, serta
                unduh label tag barcode modern per meja.
              </p>
            </div>

            {/* BULK GENERATOR FORM */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-150 space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Bulk Generator Pengaturan Meja
              </p>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={inputTableCount}
                    onChange={(e) => setInputTableCount(e.target.value)}
                    placeholder="Contoh: 10"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 focus:outline-hidden"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] uppercase font-bold text-slate-400">
                    Meja
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleBulkGenerateTables}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all whitespace-nowrap"
                >
                  {isGenerating ? "Generating..." : "Buat Meja"}
                </button>
              </div>
              <p className="text-[9.5px] text-slate-400 leading-normal">
                ⚠️ Men-generate meja baru otomatis menghasilkan string token
                unik untuk melumpuhkan fraud manipulasi harga produk di sisi
                browser.
              </p>
            </div>

            {/* SELECTION TABLE LIST */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                List Meja Kafe Terdaftar ({tables.length})
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setSelectedTable(table);
                      setCustomerSuccessOrder(null);
                    }}
                    className={`p-3 text-left rounded-xl border text-xs font-bold flex flex-col justify-between transition-all cursor-pointer ${
                      selectedTable && selectedTable.id === table.id
                        ? "bg-amber-950 text-white border-amber-800 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{table.name}</span>
                    <div className="flex justify-between items-center w-full mt-3">
                      <span className="text-[9.5px] font-mono text-slate-400 font-medium">
                        #{table.publicToken || table.id}
                      </span>
                      <span
                        className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${
                          selectedTable && selectedTable.id === table.id
                            ? "bg-white/20 text-white"
                            : table.status === "Empty"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {table.status || "Active"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* TABLE SUMMARY DETAILS CONTAINER */}
            {selectedTable && (
              <div
                className="p-4 bg-[#FDFBF7] rounded-xl border border-amber-100 space-y-4 shadow-sm"
                id="manager-table-summary"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-amber-950 text-sm">
                      {selectedTable.name}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-mono">
                      Token: {selectedTable.publicToken || "EMPTY_TOKEN"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-850 hover:bg-amber-900 text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    <Printer size={12} />
                    Cetak Tag Meja
                  </button>
                </div>

                <div className="border-t border-dashed border-amber-200/50 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Endpoint URL (Secure Link):
                    </span>
                    <span className="font-mono text-slate-700 font-semibold truncate max-w-[200px]">
                      /table/{selectedTable.publicToken || selectedTable.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hubungi Barista:</span>
                    <span className="text-slate-700 font-semibold">
                      {appConfig.storePhone || "0812-4455-6677"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: LIVE SMART TABLE QR PUBLIC URL */}
          <div
            className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative flex flex-col justify-center min-h-[660px]"
            id="customer-live-qr-panel"
          >
            {selectedTable ? (
              <div className="text-center space-y-6">
                <div className="inline-block bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.origin}/m/${selectedTable.publicToken}`}
                      alt="QR Smart Table"
                      className="w-48 h-48 mx-auto"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800">
                    Scan untuk Pesan di {selectedTable.name}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Pelanggan dapat memindai barcode ini langsung dari kamera HP
                    mereka untuk membuka menu digital tanpa saveeksport
                    aplikasi.
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 max-w-sm mx-auto text-left break-all">
                  <p className="text-[10px] font-black uppercase text-amber-800 mb-1 tracking-wider">
                    Tautan Live Akses Publik (URL):
                  </p>
                  <a
                    href={`/m/${selectedTable.publicToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-amber-700 hover:underline"
                  >
                    {window.location.origin}/m/{selectedTable.publicToken}
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 space-y-4">
                <QrCode size={48} className="mx-auto text-slate-300" />
                <p>
                  Pilih meja di sebelah kiri untuk melihat QR Code dan Link
                  pemesanan Live.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PROFESSIONAL KITCHEN DISPLAY MONITOR (KDS) */
        <div
          className="space-y-6 text-slate-800 animate-fade-in"
          id="kds-kanban-board"
        >
          {/* STATS COUNT */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-left">
            <div className="bg-white p-3.5 rounded-xl border border-slate-150 flex flex-col justify-between shadow-xs">
              <span className="text-[10px] uppercase font-black text-slate-400">
                Total KDS Antrean
              </span>
              <span className="text-lg font-mono font-black text-slate-800 mt-1">
                {orders.length} Tiket
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-150 flex flex-col justify-between shadow-xs">
              <span className="text-[10px] uppercase font-black text-[#D97706]">
                Belum Lunas (Pending)
              </span>
              <span className="text-lg font-mono font-black text-[#D97706] mt-1">
                {
                  orders.filter(
                    (o) =>
                      o.paymentStatus === "Pending" ||
                      o.paymentStatus === "Waiting Payment",
                  ).length
                }{" "}
                Antrean
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-150 flex flex-col justify-between shadow-xs">
              <span className="text-[10px] uppercase font-black text-amber-800">
                Diseduh (Preparing)
              </span>
              <span className="text-lg font-mono font-black text-amber-800 mt-1">
                {preparingOrders.length} Gelas
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-150 flex flex-col justify-between shadow-xs">
              <span className="text-[10px] uppercase font-black text-emerald-600">
                Siap Saji (Ready)
              </span>
              <span className="text-lg font-mono font-black text-emerald-600 mt-1">
                {readyOrdersLength} Porsi
              </span>
            </div>
          </div>

          {/* KANBAN COLS BAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: LIVE WAITING QUEUE */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-xs font-black flex items-center gap-1.5 uppercase bg-red-100 text-[#991B1B] px-2.5 py-1 rounded-full">
                  ⚠️ Antrean Masuk ({pendingOrders.length})
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              </div>

              {pendingOrders.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {pendingOrders.map((order) => {
                    const isUnpaid =
                      order.paymentStatus === "Pending" ||
                      order.paymentStatus === "Waiting Payment";
                    const isSmartTable =
                      order.notes &&
                      typeof order.notes === "string" &&
                      order.notes.includes("[Smart Table");

                    return (
                      <div
                        key={order.id}
                        className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3.5"
                      >
                        <div className="flex justify-between items-start">
                          <div className="text-left">
                            <div className="flex gap-1.5 items-center">
                              <span className="text-[9.5px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                Meja: {order.tableNumber || "Kasir"}
                              </span>
                              {isSmartTable && (
                                <span className="bg-amber-100 text-amber-900 text-[8.5px] font-bold px-1.5 py-0.5 rounded-sm border border-amber-250">
                                  Smart Table
                                </span>
                              )}
                            </div>
                            <h4 className="font-mono font-black text-slate-800 text-[10.5px] mt-2">
                              {order.id}
                            </h4>
                          </div>
                          <span className="text-[10px] text-slate-450 font-bold font-mono">
                            {new Date(order.orderTime).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </div>

                        {/* WARNING TAG FOR UNPAID SYSTEM TICKETS */}
                        {isUnpaid && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] rounded-lg text-center font-semibold">
                            ⏳ Menunggu Konfirmasi Bayar (BYO QRIS)
                          </div>
                        )}

                        <div className="border-t border-dashed border-slate-150 pt-2.5 space-y-1.5 text-slate-700 text-xs text-left font-semibold">
                          {order.items.map((item: any, i: number) => {
                            const p = productsMap.get(item.productId);
                            return (
                              <div key={i} className="text-[11px]">
                                • {item.quantity}x {p?.name || "Item"}
                                {item.notes && (
                                  <span className="block text-[10px] text-rose-600 italic pl-3 leading-normal font-sans">
                                    Catatan: {item.notes}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {isUnpaid ? (
                          <button
                            type="button"
                            disabled={isConfirmingPayment === order.id}
                            onClick={() => handleConfirmOrderPayment(order.id)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-[10.5px] uppercase rounded-lg cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <Check size={11} />
                            {isConfirmingPayment === order.id
                              ? "Mengonfirmasi..."
                              : "💸 Konfirmasi Bayar Lunas"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleKdsStatusChange(order.id, "Preparing")
                            }
                            className="w-full py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-[10.5px] uppercase rounded-lg cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1 shadow-2xs"
                          >
                            ☕ Mulai Brewing (Brew)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11.5px] text-slate-400 italic text-center py-8">
                  Dapur santai. Tidak ada antrean minuman masuk.
                </p>
              )}
            </div>

            {/* COLUMN 2: ACTIVE BREWING PROCESS */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-xs font-black flex items-center gap-1.5 uppercase bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-full">
                  🌀 Sedang Diseduh ({preparingOrders.length})
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              </div>

              {preparingOrders.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {preparingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3.5"
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <span className="text-[9.5px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            Meja: {order.tableNumber || "Kasir"}
                          </span>
                          <h4 className="font-mono font-black text-slate-800 text-[10.5px] mt-2">
                            {order.id}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-450 font-bold font-mono">
                          {new Date(order.orderTime).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-slate-150 pt-2.5 space-y-1.5 text-slate-700 text-xs text-left font-semibold">
                        {order.items.map((item: any, i: number) => {
                          const p = productsMap.get(item.productId);
                          return (
                            <div key={i} className="text-[11px]">
                              • {item.quantity}x {p?.name || "Item"}
                              {item.notes && (
                                <span className="block text-[10px] text-indigo-600 italic pl-3 leading-normal font-sans">
                                  Catatan: {item.notes}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleKdsStatusChange(order.id, "Ready")}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase rounded-lg cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1 shadow-2xs"
                      >
                        🛎️ Set Siap Saji (Ready)
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11.5px] text-slate-400 italic text-center py-8">
                  Belum ada portafilter dipasang di bawah gilingan kopi.
                </p>
              )}
            </div>

            {/* COLUMN 3: READY & HIGHLIGHT COMPLETED */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-xs font-black flex items-center gap-1.5 uppercase bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full">
                  ✅ Siap Saji / Serviced ({servicedOrders.length})
                </span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              </div>

              {servicedOrders.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {servicedOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`p-4.5 rounded-xl border shadow-sm space-y-3.5 transition-colors ${
                        order.prepStatus === "Completed"
                          ? "bg-emerald-50/20 border-emerald-100 opacity-60"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <span
                            className={`text-[9.5px] font-black uppercase ${
                              order.prepStatus === "Completed"
                                ? "text-slate-400"
                                : "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"
                            }`}
                          >
                            Meja: {order.tableNumber || "Kasir"} •{" "}
                            {order.prepStatus === "Completed"
                              ? "Selesai"
                              : "Siap Saji"}
                          </span>
                          <h4 className="font-mono font-black text-slate-800 text-[10.5px] mt-2">
                            {order.id}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-450 font-bold font-mono">
                          {new Date(order.orderTime).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-slate-150 pt-2.5 space-y-1.5 text-slate-700 text-xs text-left font-semibold">
                        {order.items.map((item: any, i: number) => {
                          const p = productsMap.get(item.productId);
                          return (
                            <div key={i} className="text-[11px]">
                              • {item.quantity}x {p?.name || "Item"}
                              {item.notes && (
                                <span className="block text-[10px] text-slate-500 italic pl-3 leading-normal font-sans">
                                  ({item.notes})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {order.prepStatus !== "Completed" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleKdsStatusChange(order.id, "Completed")
                          }
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase rounded-lg cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1 shadow-2xs"
                        >
                          ✔ Selesaikan Pelayanan (Done)
                        </button>
                      ) : (
                        <div className="text-center font-bold text-[10px] text-emerald-600 bg-emerald-50 py-1.5 rounded-lg border border-emerald-150">
                          Serviced Securely
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11.5px] text-slate-400 italic text-center py-8">
                  Belum ada gelas kosong yang siap dihantar.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAILED SMART TABLE OPERATIONAL SYSTEM FOOTER */}
      <div
        className="col-span-1 md:col-span-12 bg-slate-50 p-6 rounded-2xl border border-slate-200/85 space-y-4 shadow-3xs"
        id="table-barcode-info"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="text-[#543A20] shrink-0" size={20} />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Panduan Operasional LedgerLine Smart Table
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Bimbingan tata kelola QR code meja, pembayaran BYO QRIS, serta
                fungsionalitas pengamanan margin.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTableHelp(!showTableHelp)}
            className="text-xs font-bold text-amber-900 hover:text-white hover:bg-amber-950 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            {showTableHelp ? "Sembunyikan" : "Tampilkan Detail Panduan"}
          </button>
        </div>

        {showTableHelp && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in text-xs font-sans font-semibold text-slate-600 leading-relaxed">
            <div className="bg-white p-4.5 rounded-xl border border-slate-150 space-y-2">
              <span className="font-extrabold text-amber-950">
                📱 1. Filosofi Bring Your Own QRIS
              </span>
              <p className="text-[11px] leading-relaxed">
                Anda tidak perlu membayar biaya transfer per transaksi e-payment
                ke perbankan atau integrator pihak ketiga. Cukup tempel label
                stiker QRIS milik Anda (Bank Mandiri, BCA, ShopeePay, GPN, dll.)
                di laci konfig, pelanggan Smart Table memindai m-banking mereka
                seperti biasa, dan kasir barista Anda mengonfirmasi lunas di KDS
                sekali klik.
              </p>
            </div>
            <div className="bg-white p-4.5 rounded-xl border border-slate-150 space-y-2">
              <span className="font-extrabold text-amber-950">
                🛡️ 2. Pengamanan Manipulasi Harga (Security)
              </span>
              <p className="text-[11px] leading-relaxed">
                Pembeli tidak bisa menyabotase database harga dari browser
                inspect element. Sistem kami menetapkan string tokens acak 8
                karakter lurus ke database, mengabaikan input harga palsu dari
                frontend, mendata ulang subtotal dari record murni server, dan
                melacak detail pembayaran secara ketat di Security Audit Trail.
              </p>
            </div>
            <div className="bg-white p-4.5 rounded-xl border border-slate-150 space-y-2">
              <span className="font-extrabold text-amber-950">
                📦 3. Proteksi Pengurangan Stok Buku-Besar
              </span>
              <p className="text-[11px] leading-relaxed">
                Bahan baku penting seperti biji kopi Arabika Sumatra Gayo dan
                Susu Greenfields tidak akan terpotong secara konyol ketika
                pengunjung baru sekadar iseng mengirim pesanan. Depresiasi stok
                dan kalkulasi HPP harian hanya disusutkan secara tegas ketika
                kasir Anda menekan tombol lunas konfirmasi bayar.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PRINT DIALOG / TAG TEMPLATE MODAL (HIGH ART MODERN COFFEE LAB DESIGN) */}
      {showPrintModal && selectedTable && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          id="print-tag-dialog-modal"
          onClick={() => setShowPrintModal(false)}
        >
          <div
            className="bg-white max-w-sm w-full rounded-2xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-6 text-center space-y-5"
              id="printable-area-tag-coffee"
            >
              {/* STYLIZED LABEL ACCORDING TO BRAND BOOK ARCHITECTURE */}
              <div className="border-[5px] border-amber-950/20 p-5 rounded-xl bg-[#FAF9F5] space-y-5 relative">
                {/* Visual accents */}
                <div className="absolute top-2 left-2 right-2 flex justify-between text-[6px] text-slate-400 font-mono tracking-widest uppercase">
                  <span>LEDGERLINE SMART TABLE</span>
                  <span>EST. 2026</span>
                </div>

                <div className="text-center pt-2">
                  <span className="text-[8px] font-mono tracking-widest text-amber-800 uppercase font-black">
                    COFFEE OPERATING SYSTEM
                  </span>
                  <h3 className="text-base font-black tracking-tight text-amber-950 mt-1 uppercase">
                    {appConfig.storeName || "CRAFT COFFEE LAB"}
                  </h3>
                  <div className="w-10 h-0.5 bg-amber-850 mx-auto mt-2" />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-[#B45309] font-black">
                    SELAMAT DATANG DI MEJA
                  </p>
                  <h1 className="text-3xl font-black text-amber-950 tracking-tightest uppercase">
                    {selectedTable.name}
                  </h1>
                </div>

                {/* VISITOR INSTRUCTIONS */}
                <div className="bg-white/80 backdrop-blur-xs p-3.5 border border-amber-100 rounded-lg text-left text-[9px] text-[#543A20] leading-snug space-y-1">
                  <p className="font-extrabold uppercase border-b border-amber-150 pb-1 mb-1 tracking-wider text-amber-950">
                    💡 LANGKAH E-ORDER MANDIRI:
                  </p>
                  <p>1. Scan Barcode QR di bawah dengan Kamera HP Anda.</p>
                  <p>2. Telusuri variasi Menu Segar & pilih porsi Anda.</p>
                  <p>3. Checkout instan dengan scan m-banking / e-wallet.</p>
                </div>

                {/* DYNAMIC QR CODE FOR SCANNABLE MEJA */}
                <div className="bg-white p-3 border-2 border-amber-950/10 rounded-lg inline-block shadow-3xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + "/table/" + (selectedTable.publicToken || selectedTable.id))}`}
                    alt={`Scannable QR Meja ${selectedTable.id}`}
                    referrerPolicy="no-referrer"
                    className="w-40 h-40"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://placehold.co/400x400/f8fafc/94a3b8?text=Produk+Tanpa+Foto";
                    }}
                  />
                </div>

                <div className="text-center space-y-1 pt-1 font-mono">
                  <p className="text-[7.5px] uppercase tracking-wider text-slate-400 font-medium">
                    TAUTAN SCAN PEMESANAN AMAN:
                  </p>
                  <p className="text-[8.5px] font-bold text-slate-600 truncate">
                    /table/{selectedTable.publicToken || selectedTable.id}
                  </p>
                </div>

                {/* BRAND FOOTER ACCENT */}
                <div className="text-center pt-2">
                  <p className="text-[7.5px] font-sans font-extrabold text-amber-950/60 uppercase">
                    Terima Kasih • Pembayaran Aman Terintegrasi Mandiri
                  </p>
                </div>
              </div>
            </div>

            {/* MODAL CONTROL BOTTOM ACTIONS */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-2.5">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#451A03] hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer size={13} />
                Cetak Tag Label
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
