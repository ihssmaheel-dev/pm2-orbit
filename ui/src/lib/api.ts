import { toast } from 'sonner';

interface ApiOptions extends RequestInit {
  silent?: boolean;
  label?: string;
}

async function api(url: string, options: ApiOptions = {}): Promise<Response> {
  const { silent, label, ...fetchOptions } = options;

  let res: Response;
  try {
    res = await fetch(url, fetchOptions);
  } catch (err) {
    if (!silent) {
      toast.error(`${label || 'Network error'}: ${err instanceof Error ? err.message : 'Request failed'}`);
    }
    throw err;
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

export { api };
