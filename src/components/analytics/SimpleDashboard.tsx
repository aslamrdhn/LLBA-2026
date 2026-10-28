import React from "react";
import { Product, RawMaterial, Order } from "../../types";
import {
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { useUiMode } from "../../context/UiModeContext";

interface SimpleDashboardProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  orders: Order[];
  onNavigate?: (
    tab:
      | "dashboard"
      | "kasir"
      | "stok"
      | "meja"
      | "laporan"
      | "pengaturan"
      | "intelligence",
  ) => void;
}

export default function SimpleDashboard({
  products,
  rawMaterials,
  orders,
  onNavigate,
}: SimpleDashboardProps) {
  const { translateTerm } = useUiMode();

  // Calculate today's sales
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  const todaysOrders = orders.filter((o) => {
    if (!o || !o.orderTime) return false;
    try {
      const timeStr = String(o.orderTime);
      if (timeStr.indexOf(today) === 0) return true;
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return false;
      return d.toLocaleDateString("en-CA") === today;
    } catch (e) {
      return false;
    }
  });
  const todaysSales = todaysOrders.reduce(
    (sum, o) => sum + (o.totalPrice || 0),
    0,
  );

  // Get Critical Stocks
  const lowMaterials = rawMaterials.filter(
    (m) => m.stockQuantity <= m.warningLimit,
  );
  const lowProducts = products.filter((p) => p.stock <= p.warningLimit);
  const combinedCriticals = [
    ...lowMaterials.map((m) => ({
      name: m.name,
      left: m.stockQuantity,
      type: "Material",
    })),
    ...lowProducts.map((p) => ({ name: p.name, left: p.stock, type: "Menu" })),
  ].slice(0, 3);

  // Get 5 recent orders
  const recentOrders = [...orders]
    .filter((o) => o && o.orderTime)
    .sort(
      (a, b) =>
        new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <h2 className="text-xl font-bold mb-4">
          {translateTerm("Ringkasan Hari Ini")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Total Penjualan */}
          <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex flex-col justify-between">
            <div className="flex items-center gap-3 text-emerald-700 mb-2">
              <DollarSign size={24} />
              <h3 className="font-bold">Total Penjualan</h3>
            </div>
            <p className="text-3xl font-black text-emerald-900">
              Rp {(Number(todaysSales) || 0).toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-100 w-max px-2 py-1 rounded">
              Dari {todaysOrders.length} transaksi
            </p>
          </div>

          {/* Card: Peringatan Stok */}
          <div className="bg-rose-50 p-6 rounded-xl border border-rose-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle size={20} />
                <h3 className="font-bold">Stok Hampir Habis</h3>
              </div>
            </div>
            <div className="space-y-2 flex-grow">
              {combinedCriticals.length > 0 ? (
                combinedCriticals.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm border-b border-rose-100 pb-1"
                  >
                    <span className="font-semibold text-rose-900">
                      {item.name}
                    </span>
                    <span className="text-rose-600 font-bold bg-white px-2 rounded box-border shadow-sm text-xs">
                      Sisa {item.left}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-rose-600 font-medium italic">
                  Semua stok aman saat ini.
                </p>
              )}
            </div>
            {onNavigate && combinedCriticals.length > 0 && (
              <button
                onClick={() => onNavigate("stok")}
                className="mt-4 text-xs font-bold text-rose-700 flex items-center gap-1 hover:text-rose-800 transition-colors w-max bg-white px-3 py-1.5 rounded-lg border border-rose-200"
              >
                Lihat Semua <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Card: Pesanan Terbaru */}
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
          <div className="bg-white p-4 border-b border-slate-200 flex items-center gap-2">
            <ShoppingCart size={18} className="text-slate-600" />
            <h3 className="font-bold text-slate-800">5 Pesanan Terakhir</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.length > 0 ? (
              recentOrders.map((order, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-4 hover:bg-white transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={10} />{" "}
                      {new Date(order.orderTime).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB • {order.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">
                      Rp {(Number(order.totalPrice) || 0).toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.items?.length || 0} item
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 italic text-sm">
                Belum ada pesanan hari ini.
              </div>
            )}
          </div>
          {onNavigate && recentOrders.length > 0 && (
            <div className="p-3 bg-white border-t border-slate-200 text-center">
              <button
                onClick={() => onNavigate("kasir")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Lihat Semua di Menu Kasir →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
