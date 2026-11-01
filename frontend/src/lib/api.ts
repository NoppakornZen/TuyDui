import { supabase } from './supabase';

export async function apiFetch(path: `/api/${string}`, init: RequestInit = {}) {
  if (!path.startsWith('/api/') || path.includes('://')) throw new Error('Only same-origin API paths are allowed.');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  const headers = new Headers(init.headers);
  if (!session?.access_token) throw new Error('Please sign in before calling the API.');
  headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(path, { ...init, headers, cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(260_000) });
}
