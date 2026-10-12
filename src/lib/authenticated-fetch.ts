import { supabase } from './supabase';

/** OAuth sessions live in the browser, so every server request needs its bearer token. */
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Please sign in again before continuing.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}
