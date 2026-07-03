import { toast } from 'sonner';

interface ApiOptions extends RequestInit {
  silent?: boolean;
  label?: string;
}

let cachedToken: string = '';
let tokenFetchPromise: Promise<string> | null = null;

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (tokenFetchPromise) return tokenFetchPromise;

  tokenFetchPromise = fetch('/api/settings')
    .then((r) => r.json())
    .then((data) => {
      cachedToken = data.authToken || '';
      return cachedToken;
    })
    .catch(() => {
      cachedToken = '';
      return '';
    });

  return tokenFetchPromise;
}

function invalidateToken() {
  cachedToken = '';
  tokenFetchPromise = null;
}

async function api(url: string, options: ApiOptions = {}): Promise<Response> {
  const { silent, label, ...fetchOptions } = options;

  // Skip auth for exempt endpoints
  const exemptPaths = ['/api/health', '/api/ping', '/api/settings'];
  const isExempt = exemptPaths.some((p) => url.startsWith(p));

  let headers: Record<string, string> = {};
  if (fetchOptions.headers) {
    if (fetchOptions.headers instanceof Headers) {
      fetchOptions.headers.forEach((v, k) => { headers[k] = v; });
    } else {
      headers = { ...fetchOptions.headers as Record<string, string> };
    }
  }

  if (!isExempt) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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

  // If 401, token might be stale — invalidate and retry once
  if (res.status === 401 && !isExempt) {
    invalidateToken();
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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

export { api, invalidateToken };
