import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSSE } from '../hooks/useSSE';

interface OrderItem {
  menu_name: string;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
}

interface SSEPayload {
  type: string;
  orders?: Order[];
  order?: Order;
}

export function KDS({ outletId }: { outletId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const { data, connected } = useSSE<SSEPayload>(`/sse/kitchen/${outletId}`);

  useEffect(() => {
    if (!data) return;
    if (data.type === 'INIT' && Array.isArray(data.orders)) {
      setOrders(data.orders);
    } else if (data.type === 'NEW_ORDER' && data.order) {
      setOrders((prev) => [data.order!, ...prev.filter((o) => o.id !== data.order!.id)]);
    } else if (data.type === 'STATUS_UPDATE' && data.order) {
      setOrders((prev) => prev.map((o) => (o.id === data.order!.id ? data.order! : o)));
    }
  }, [data]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      await api.patch<{ id: string; status: string }>(`/kitchen/orders/${id}/status`, {
        status: newStatus,
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal mengubah status pesanan');
    }
  }

  const newOrders = orders.filter((o) => o.status === 'NEW');
  const inProgressOrders = orders.filter((o) => o.status === 'IN_PROGRESS');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🍳 Kitchen Display System (KDS)</h1>
          <p className="text-sm text-slate-500">Live order queue monitor</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-sm font-medium text-slate-600">
            {connected ? 'SSE Connected (Realtime)' : 'Connecting to Kitchen SSE...'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* NEW COLUMN */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-rose-700">🔴 Pesanan Baru ({newOrders.length})</h2>
          </div>
          <div className="space-y-3">
            {newOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono font-bold text-slate-800">{order.orderNumber}</span>
                  <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-semibold">NEW</span>
                </div>
                <ul className="text-sm text-slate-600 mb-4 space-y-1">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.menu_name}</span>
                      <span className="font-bold">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => updateStatus(order.id, 'IN_PROGRESS')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  ▶ Start Proses
                </button>
              </div>
            ))}
            {newOrders.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Tidak ada pesanan baru</p>}
          </div>
        </div>

        {/* IN PROGRESS COLUMN */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-amber-700">🟡 Sedang Diracik ({inProgressOrders.length})</h2>
          </div>
          <div className="space-y-3">
            {inProgressOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono font-bold text-slate-800">{order.orderNumber}</span>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">IN PROGRESS</span>
                </div>
                <ul className="text-sm text-slate-600 mb-4 space-y-1">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.menu_name}</span>
                      <span className="font-bold">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => updateStatus(order.id, 'READY')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  ✅ Ready Selesai
                </button>
              </div>
            ))}
            {inProgressOrders.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Tidak ada pesanan diproses</p>}
          </div>
        </div>

        {/* READY COLUMN */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-emerald-700">🟢 Siap Disajikan ({readyOrders.length})</h2>
          </div>
          <div className="space-y-3">
            {readyOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-emerald-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono font-bold text-slate-800">{order.orderNumber}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">READY</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-1">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.menu_name}</span>
                      <span className="font-bold">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {readyOrders.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Tidak ada pesanan siap</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
