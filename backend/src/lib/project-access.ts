import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAuth } from './rate-limit.js';

export type ProjectAccess = { userId: string; projectId: string; client: SupabaseClient };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Use the caller's JWT for every database operation, so RLS remains authoritative. */
export async function requireProjectAccess(request: Request, projectId: unknown, edit = true): Promise<ProjectAccess | Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (typeof projectId !== 'string' || !uuid.test(projectId)) {
    return Response.json({ error: 'A valid projectId is required.' }, { status: 400 });
  }
  const { client } = auth;
  try {
    const { data: allowed, error: accessError } = await client.rpc(edit ? 'can_edit_project' : 'is_project_member', { project_uuid: projectId });
    if (accessError) return Response.json({ error: 'Project authorization is unavailable.' }, { status: 503 });
    if (allowed !== true) return Response.json({ error: 'Project access denied.' }, { status: 403 });
    return { userId: auth.userId, projectId, client };
  } catch {
    return Response.json({ error: 'Authentication service is unavailable.' }, { status: 503 });
  }
}

/** Reject inconsistent nested IDs; never trust caller-supplied user identity. */
export function hasCrossProjectData(value: unknown, projectId: string): boolean {
  if (Array.isArray(value)) return value.some((item) => hasCrossProjectData(item, projectId));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) =>
    (key === 'projectId' || key === 'project_id') && item !== undefined && item !== '' && item !== projectId
    || hasCrossProjectData(item, projectId));
}
