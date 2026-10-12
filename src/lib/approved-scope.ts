import { supabaseAdmin } from './supabase-admin';
import type { ApprovedScope } from '../domain/workspace';

/** Call after checking membership. Reviews always use the saved approved scope. */
export async function readApprovedWorkspace(projectId: string): Promise<{ scope: ApprovedScope; version: number } | Response> {
  const { data, error } = await supabaseAdmin.from('project_workspaces').select('approved_scope, version').eq('project_id', projectId).maybeSingle();
  if (error) return Response.json({ error: 'Could not load the approved scope. Check that workspace migration 005 has been applied.' }, { status: 503 });
  if (!data?.approved_scope) return Response.json({ error: 'Confirm the baseline before reviewing a change.' }, { status: 409 });
  return { scope: data.approved_scope as ApprovedScope, version: data.version as number };
}
