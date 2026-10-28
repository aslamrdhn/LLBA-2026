import { useState } from 'react';
import { api, setToken } from '../lib/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const deviceId = localStorage.getItem('deviceId') || `web-${Date.now()}`;
      localStorage.setItem('deviceId', deviceId);
      const res = await api.post<{ token: string }>('/auth/pin/login', { pin, deviceId });
      setToken(res.token);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-center mb-2 text-slate-800">☕ LedgerLine</h1>
        <p className="text-center text-gray-500 mb-6">Coffee Business OS</p>
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder="PIN 6 digit"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="mb-4 text-center text-2xl tracking-widest"
        />
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <Button onClick={handleLogin} disabled={loading || pin.length !== 6} className="w-full">
          {loading ? 'Memproses...' : 'Login Kasir'}
        </Button>
        <p className="text-xs text-gray-400 text-center mt-4">Demo PIN: 123456</p>
      </div>
    </div>
  );
}
