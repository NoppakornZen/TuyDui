import { supabase } from '../lib/supabase';
import { normalizeWorkspace, type ApprovedScope, type WorkspaceSnapshot } from '../domain/workspace';

export type WorkspaceRecord = { project_id: string; snapshot: WorkspaceSnapshot; approved_scope: ApprovedScope | null; version: number; updated_at: string };
export class WorkspaceConflictError extends Error {
  constructor() { super('This project was saved in another window. Reload the latest version before continuing.'); }
}

function databaseError(error: { code?: string; message: string }): Error {
  if (error.message.includes('WORKSPACE_CONFLICT')) return new WorkspaceConflictError();
  if (error.code === 'PGRST205' || error.code === 'PGRST202') return new Error('Online saving is not available yet. Please contact the project administrator.');
  if (error.message.includes('WORKSPACE_FORBIDDEN')) return new Error('You do not have permission to save or confirm the scope of this project.');
  return new Error(error.message);
}

function record(value: unknown): WorkspaceRecord {
  const row = (Array.isArray(value) ? value[0] : value) as WorkspaceRecord;
  if (!row || typeof row.version !== 'number') throw new Error('The server returned an invalid workspace.');
  return { ...row, snapshot: normalizeWorkspace(row.snapshot) };
}

export async function loadWorkspace(projectId: string): Promise<WorkspaceRecord | null> {
  const { data, error } = await supabase.from('project_workspaces').select('project_id, snapshot, approved_scope, version, updated_at').eq('project_id', projectId).maybeSingle();
  if (error) throw databaseError(error);
  return data ? record(data) : null;
}

export async function saveWorkspace(projectId: string, snapshot: WorkspaceSnapshot, expectedVersion: number): Promise<WorkspaceRecord> {
  const { data, error } = await supabase.rpc('save_project_workspace', { project_uuid: projectId, snapshot_input: snapshot, expected_version: expectedVersion });
  if (error) throw databaseError(error);
  return record(data);
}

export async function confirmWorkspaceBaseline(projectId: string, expectedVersion: number): Promise<WorkspaceRecord> {
  const { data, error } = await supabase.rpc('confirm_project_baseline', { project_uuid: projectId, expected_version: expectedVersion });
  if (error) throw databaseError(error);
  return record(data);
}

export async function approveWorkspaceChange(projectId: string, snapshot: WorkspaceSnapshot, scope: ApprovedScope, review: unknown, expectedVersion: number): Promise<WorkspaceRecord> {
  const { data, error } = await supabase.rpc('approve_project_change', { project_uuid: projectId, snapshot_input: snapshot, scope_input: scope, review_input: review, expected_version: expectedVersion });
  if (error) throw databaseError(error);
  return record(data);
}

/** Serialize saves and keep the last pending edit on failure. Never overwrite a newer revision. */
export class WorkspaceSaveQueue {
  private pending: WorkspaceSnapshot | null = null;
  private running: Promise<void> | null = null;
  constructor(public version: number, private readonly write: (snapshot: WorkspaceSnapshot, version: number) => Promise<WorkspaceRecord>) {}
  enqueue(snapshot: WorkspaceSnapshot) { this.pending = snapshot; }
  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }
  private async drain() {
    while (this.pending) {
      const snapshot = this.pending;
      this.pending = null;
      try { this.version = (await this.write(snapshot, this.version)).version; }
      catch (error) { this.pending ??= snapshot; throw error; }
    }
  }
}
