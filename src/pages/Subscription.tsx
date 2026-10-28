import { useState } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function Subscription() {
  const [paymentProof, setPaymentProof] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentProof.trim()) return;

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.post('/subscription/request', {
        targetPlan: 'business',
        paymentProof,
      });
      setSuccessMsg('✅ Request submitted. Menunggu review admin.');
      setPaymentProof('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim permohonan upgrade');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">⭐ Upgrade Subscription</h1>
        <p className="text-slate-500 text-sm mb-6">
          Tingkatkan outlet Anda ke paket <strong>Business Enterprise</strong> untuk multi-cabang, kalkulasi margin otomatis, dan integrasi KDS tanpa batas.
        </p>

        {successMsg && (
          <div className="p-4 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              URL Bukti Pembayaran / Transfer
            </label>
            <Input
              type="url"
              placeholder="https://drive.google.com/... atau https://..."
              value={paymentProof}
              onChange={(e) => setPaymentProof(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading || !paymentProof.trim()} className="w-full">
            {loading ? 'Mengirim Bukti...' : 'Ajukan Upgrade ke Business Plan'}
          </Button>
        </form>
      </div>
    </div>
  );
}
