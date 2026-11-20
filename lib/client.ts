export class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError('Could not connect to TrueDeal. Check your connection and that the local server is running.');
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('The server returned an unexpected response. Check that you opened the TrueDeal address.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError('The server returned an unexpected response.');
  }
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong.');
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
