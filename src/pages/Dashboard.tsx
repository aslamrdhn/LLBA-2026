import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatMoney } from '../lib/formatMoney';

interface HppRow {
  menuId: string;
  menuName: string;
  revenue: string;
  qty: number;
  directHpp: string;
  trueHpp: string;
  marginPercent: string;
}

export function Dashboard() {
  const [rows, setRows] = useState<HppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchHppReport() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ rows: HppRow[] }>('/reports/hpp/today');
      setRows(data.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat laporan HPP');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHppReport();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📊 Owner Business Dashboard</h1>
          <p className="text-sm text-slate-500">Laporan Akurasi HPP & Profitabilitas Riil Hari Ini</p>
        </div>
        <button
          onClick={fetchHppReport}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition cursor-pointer"
        >
          🔄 Segarkan Data
        </button>
      </header>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Memuat laporan HPP dari SSOT...</div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <p className="text-slate-500 text-base font-medium">Belum ada transaksi hari ini</p>
          <p className="text-slate-400 text-xs mt-1">Lakukan transaksi di menu POS untuk melihat kalkulasi HPP otomatis.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-4">Menu</th>
                <th className="p-4 text-center">Qty Terjual</th>
                <th className="p-4 text-right">Total Revenue</th>
                <th className="p-4 text-right">Direct HPP</th>
                <th className="p-4 text-right">True HPP (Overhead)</th>
                <th className="p-4 text-right">Margin Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.menuId} className="hover:bg-slate-50">
                  <td className="p-4 font-semibold text-slate-800">{row.menuName}</td>
                  <td className="p-4 text-center font-mono">{row.qty}</td>
                  <td className="p-4 text-right font-mono font-medium text-slate-700">{formatMoney(row.revenue)}</td>
                  <td className="p-4 text-right font-mono text-slate-600">{formatMoney(row.directHpp)}</td>
                  <td className="p-4 text-right font-mono text-amber-700 font-medium">{formatMoney(row.trueHpp)}</td>
                  <td className="p-4 text-right font-mono font-bold text-emerald-600">
                    {row.marginPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
