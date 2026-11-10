import { toast } from './ui.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

const K_ACCESS = 'accessToken';
const K_REFRESH = 'refreshToken';
const K_USER = 'user';

export const session = {
  get access() {
    return localStorage.getItem(K_ACCESS);
  },
  get refresh() {
    return localStorage.getItem(K_REFRESH);
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem(K_USER));
    } catch {
      return null;
    }
  },
  get active() {
    return !!(this.access && this.refresh);
  },
  saveLogin({ accessToken, refreshToken, user }) {
    localStorage.setItem(K_ACCESS, accessToken);
    localStorage.setItem(K_REFRESH, refreshToken);
    localStorage.setItem(K_USER, JSON.stringify(user));
  },
  saveTokens({ accessToken, refreshToken }) {
    localStorage.setItem(K_ACCESS, accessToken);
    localStorage.setItem(K_REFRESH, refreshToken);
  },
  clear() {
    localStorage.removeItem(K_ACCESS);
    localStorage.removeItem(K_REFRESH);
    localStorage.removeItem(K_USER);
  },
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let onExpire = () => {};
export const setOnExpire = (fn) => {
  onExpire = fn;
};

let refreshPromise = null;

function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = session.refresh;
      if (!refreshToken) throw new Error('Sem refresh token');
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh inválido');
      session.saveTokens(await res.json());
      console.info('[auth] access token renovado automaticamente');
      toast('Sessão renovada automaticamente', 'info');
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function api(path, { method = 'GET', body, auth = true } = {}, isRetry = false) {
  const tokenUsed = session.access;
  const headers = { 'Content-Type': 'application/json' };
  if (auth && tokenUsed) headers.Authorization = `Bearer ${tokenUsed}`;

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API. Ela está rodando?', 0);
  }

  if (res.status === 401 && auth && !isRetry) {

    if (session.access === tokenUsed) {
      try {
        await refreshTokens();
      } catch {
        session.clear();
        onExpire();
        throw new ApiError('Sessão expirada. Faça login novamente.', 401);
      }
    }
    return api(path, { method, body, auth }, true);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || `Erro ${res.status}`, res.status, data);
  return data;
}

export function accessTokenSecondsLeft() {
  const token = session.access;
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Math.max(0, Math.round(payload.exp - Date.now() / 1000));
  } catch {
    return null;
  }
}
