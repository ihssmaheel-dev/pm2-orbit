import { toast } from 'sonner';

interface ApiOptions extends RequestInit {
  silent?: boolean;
  label?: string;
}

let cachedToken: string = '';
let tokenReady = false;
let tokenFetchPromise: Promise<void> | null = null;

async function ensureToken(): Promise<string> {
  if (tokenReady) return cachedToken;
  if (tokenFetchPromise) {
    await tokenFetchPromise;
    return cachedToken;
  }

  tokenFetchPromise = fetch('/api/settings')
    .then((r) => r.json())
    .then((data) => {
      cachedToken = String(data.authToken || '');
      tokenReady = true;
    })
    .catch(() => {
      cachedToken = '';
      tokenReady = true;
    });

  await tokenFetchPromise;
  return cachedToken;
}

function invalidateToken() {
  cachedToken = '';
  tokenReady = false;
  tokenFetchPromise = null;
}

async function api(url: string, options: ApiOptions = {}): Promise<Response> {
  const { silent, label, ...fetchOptions } = options;

  const exemptPaths = ['/api/health', '/api/ping', '/api/settings'];
  const isExempt = exemptPaths.some((p) => url.startsWith(p));

  // Build headers as plain object
  const headers: Record<string, string> = {};
  if (fetchOptions.headers) {
    if (fetchOptions.headers instanceof Headers) {
      fetchOptions.headers.forEach((v, k) => { headers[k] = v; });
    } else {
      Object.entries(fetchOptions.headers).forEach(([k, v]) => {
        if (typeof v === 'string') headers[k] = v;
      });
    }
  }

  if (!isExempt) {
    const token = await ensureToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, { ...fetchOptions, headers });
  } catch (err) {
    if (!silent) {
      toast.error(`${label || 'Network error'}: ${err instanceof Error ? err.message : 'Request failed'}`);
    }
    throw err;
  }

  // If 401, invalidate and retry once
  if (res.status === 401 && !isExempt) {
    invalidateToken();
    const token = await ensureToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
      try {
        res = await fetch(url, { ...fetchOptions, headers });
      } catch (err) {
        if (!silent) {
          toast.error(`${label || 'Network error'}: ${err instanceof Error ? err.message : 'Request failed'}`);
        }
        throw err;
      }
    }
  }

  if (!res.ok && !silent) {
    const body = await res.text().catch(() => '');
    const msg = body || res.statusText || 'Unknown error';
    toast.error(`${label || 'API error'} (${res.status}): ${msg}`);
  }

  return res;
}

export async function apiJson<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const res = await api(url, options);
  return res.json();
}

export { api, invalidateToken, ensureToken };
