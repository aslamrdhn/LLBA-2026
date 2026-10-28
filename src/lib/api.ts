const TOKEN_KEY = 'ledgerline_token';

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function apiCall<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.message || errData.error || errMsg;
    } catch {
      /* ignore */
    }
    throw new Error(errMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiCall<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiCall<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => apiCall<T>('PATCH', path, body),
};
