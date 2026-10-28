import { useEffect, useState } from 'react';
import { getToken } from '../lib/api';

export function useSSE<T = unknown>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const API_BASE = import.meta.env.VITE_API_URL || '';
    const url = `${API_BASE}${path}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        setData(JSON.parse(e.data) as T);
      } catch {
        /* ignore */
      }
    };

    return () => es.close();
  }, [path]);

  return { data, connected };
}
