import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProjectAccess } from './project-access.js';

type AuthContext = { userId: string; email: string; client: SupabaseClient };
const authenticatedRequests = new WeakMap<Request, Promise<AuthContext | Response>>();
export function requireAuth(request: Request): Promise<AuthContext | Response> {
  let result = authenticatedRequests.get(request);
  if (!result) { result = authenticate(request); authenticatedRequests.set(request, result); }
  return result;
}
async function authenticate(request: Request): Promise<AuthContext | Response> {
  const header = request.headers.get('authorization');
  if (!header?.match(/^Bearer \S+$/)) return Response.json({ error: 'Unauthorized. Please login first.' }, { status: 401 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ error: 'Authentication is not configured.' }, { status: 503 });
  try {
    const client = createClient(url, key, {
      global: {
        headers: { Authorization: header },
        fetch: (url, init) => fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(30_000) }),
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error } = await client.auth.getUser(header.slice(7));
    if (error || !user) return Response.json({ error: 'Invalid or expired token.' }, { status: 401 });
    return { userId: user.id, email: user.email ?? '', client };
  } catch {
    return Response.json({ error: 'Authentication service is unavailable.' }, { status: 503 });
  }
}

/** Atomic database reservation prevents parallel requests/restarts bypassing quotas. */
export async function reserveUsage(access: ProjectAccess, task: string): Promise<Response | null> {
  const { data, error } = await access.client.rpc('reserve_ai_request', { project_uuid: access.projectId, task_name: task });
  if (error) return Response.json({ error: 'Rate limit service is unavailable.' }, { status: 503 });
  if (data?.allowed !== true) {
    const resetIn = Number.isFinite(data?.resetIn) ? Math.max(1, Math.ceil(data.resetIn)) : 3600;
    return Response.json({ error: 'Rate limit exceeded.', resetIn }, { status: 429, headers: { 'Retry-After': String(resetIn) } });
  }
  return null;
}
