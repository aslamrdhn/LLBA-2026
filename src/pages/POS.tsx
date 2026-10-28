import { useState } from 'react';
import { api } from '../lib/api';
import { formatMoney } from '../lib/formatMoney';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Button } from '../components/Button';
import { useUIStore } from '../store/dataStore';

const DEMO_MENUS = [
  { id: 'seed-menu-americano', name: 'Americano', price: '25000.00', category: 'Coffee' },
  { id: 'seed-menu-cappuccino', name: 'Cappuccino', price: '28000.00', category: 'Coffee' },
  { id: 'seed-menu-latte', name: 'Cafe Latte', price: '30000.00', category: 'Coffee' },
  { id: 'seed-menu-croissant', name: 'Butter Croissant', price: '22000.00', category: 'Pastry' },
];

export function POS({ outletId }: { outletId: string }) {
  const isOnline = useOnlineStatus();
  const { cart, addToCart, removeFromCart, clearCart } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);

  const subtotal = cart.reduce((acc: number, item: { menuId: string; qty: number }) => {
    const menu = DEMO_MENUS.find((m) => m.id === item.menuId);
    return acc + (menu ? Number(menu.price) * item.qty : 0);
  }, 0);

  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  async function handleCheckout() {
    if (cart.length === 0) return;
    setLoading(true);
    setLastInvoice(null);

    try {
      const idempotencyKey = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
      const res = await api.post<{ invoiceNumber: string; totalAmount: string }>('/sales/checkout', {
        outletId,
        items: cart.map((i: { menuId: string; qty: number }) => ({ menuId: i.menuId, quantity: i.qty })),
        payments: [{ method: 'CASH', amount: total.toFixed(2) }],
        idempotencyKey,
      });

      setLastInvoice(res.invoiceNumber);
      clearCart();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Transaksi gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800">🔵 LedgerLine POS</h1>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-sm font-medium text-slate-600">
            {isOnline ? 'Online (SSOT Active)' : 'Offline (Local Queue)'}
          </span>
        </div>
      </header>

      {lastInvoice && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between">
          <span className="font-semibold">
            ✅ Transaksi berhasil! Nomor Invoice: <code className="font-mono bg-emerald-100 px-2 py-0.5 rounded">{lastInvoice}</code>
          </span>
          <button onClick={() => setLastInvoice(null)} className="text-emerald-600 hover:underline text-sm cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-lg font-bold mb-4 text-slate-700">Katalog Menu</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {DEMO_MENUS.map((m) => (
              <div
                key={m.id}
                onClick={() => addToCart(m.id)}
                className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{m.category}</span>
                  <h3 className="font-bold text-slate-800 mt-1">{m.name}</h3>
                </div>
                <p className="font-mono font-bold text-blue-800 mt-4">{formatMoney(m.price)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold text-slate-800">Keranjang</h2>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-rose-600 hover:underline cursor-pointer">
                  Kosongkan
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-slate-400 text-center py-12">Keranjang masih kosong</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {cart.map((item: { menuId: string; qty: number }) => {
                  const menu = DEMO_MENUS.find((m) => m.id === item.menuId);
                  if (!menu) return null;
                  return (
                    <div key={item.menuId} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">{menu.name}</p>
                        <p className="text-xs text-slate-500">{item.qty} × {formatMoney(menu.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.menuId)}
                          className="w-6 h-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono font-medium">{item.qty}</span>
                        <button
                          onClick={() => addToCart(item.menuId)}
                          className="w-6 h-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-6">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Subtotal:</span>
              <span className="font-mono">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mb-3">
              <span>PPN (11%):</span>
              <span className="font-mono">{formatMoney(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-slate-800 mb-4">
              <span>Total:</span>
              <span className="font-mono text-blue-800">{formatMoney(total)}</span>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full text-base py-3"
            >
              {loading ? 'Memproses...' : '💳 Bayar Tunai'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
