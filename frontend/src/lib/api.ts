import { supabase } from './supabase';

export async function apiFetch(path: `/api/${string}`, init: RequestInit = {}) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(path, { ...init, headers });
}
