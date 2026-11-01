import { isWorkspaceState, type WorkspaceState } from './workspace-state';

type Transport = (path: `/api/${string}`, init?: RequestInit) => Promise<Response>;
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
}

/** All server saves are serialized and use compare-and-swap revisions. No silent merge. */
export class WorkspaceRepository {
  private revision = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private stopped = false;
  private lastSaved = '';
  readonly localKey: string;
  readonly recoveryKey: string;
  constructor(readonly projectId: string, readonly userId: string, private transport: Transport, private storage: Storage) {
    this.localKey = `briefdiff-project-${projectId}`;
    this.recoveryKey = `briefdiff-recovery-${userId}-${projectId}`;
  }

  async load(): Promise<{ snapshot: WorkspaceState | null; recovery: string | null }> {
    const response = await this.transport(`/api/workspace?projectId=${encodeURIComponent(this.projectId)}`);
    if (!response.ok) throw new Error('Cannot load the shared workspace. Local data is retained; retry after the backend is available.');
    const remote = await response.json() as { snapshot: unknown; revision: number };
    if (!Number.isSafeInteger(remote.revision) || remote.revision < 0) throw new Error('Invalid workspace response.');
    this.revision = remote.revision;
    const local = this.storage.getItem(this.localKey);
    let recovery = this.storage.getItem(this.recoveryKey);
    if (remote.snapshot !== null) {
      if (!isWorkspaceState(remote.snapshot)) throw new Error('The server workspace needs recovery. No data was overwritten.');
      // Archive legacy/offline data before autosave can touch the old key.
      let localCanonical = local;
      try { if (local) localCanonical = canonicalJson(JSON.parse(local)); } catch { /* Preserve malformed legacy data verbatim. */ }
      if (local && localCanonical !== canonicalJson(remote.snapshot)) {
        if (recovery && recovery !== local) this.storage.setItem(`${this.recoveryKey}-${Date.now()}`, recovery);
        this.storage.setItem(this.recoveryKey, local);
        recovery = local;
      }
      this.lastSaved = canonicalJson(remote.snapshot);
      return { snapshot: remote.snapshot, recovery };
    }
    if (!local) return { snapshot: null, recovery };
    try {
      const snapshot = JSON.parse(local);
      // Legacy saves predate baseline persistence and may omit several arrays.
      const normalized = { edges: [], changes: [], history: [], nodeNotes: {}, documents: [], zoom: 1, pan: { x: 0, y: 0 }, baselineConfirmed: false,
        ...snapshot, nodes: snapshot.nodes?.map((n: WorkspaceState['nodes'][number]) => ({ ...n, requirementIds: n.requirementIds ?? [] })),
        requirements: snapshot.requirements?.map((row: WorkspaceState['requirements'][number]) => ({ ...row, description: row.description || row.title })) ?? [] };
      if (!isWorkspaceState(normalized)) throw new Error('invalid local workspace');
      this.storage.setItem(this.recoveryKey, local);
      return { snapshot: normalized, recovery: local };
    } catch {
      throw new Error('Local workspace data needs recovery. It has been retained; export it before continuing.');
    }
  }

  save(snapshot: WorkspaceState): Promise<void> {
    const json = canonicalJson(snapshot);
    // Retain every edit even if a previous server save failed.
    this.storage.setItem(this.localKey, json);
    const pending = this.queue.then(async () => {
      if (this.stopped) throw new Error('Server sync stopped after an error. Reload to reconcile; local edits are retained.');
      if (json === this.lastSaved) return;
      const response = await this.transport('/api/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: this.projectId, revision: this.revision, snapshot }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Workspace could not be saved. Local copy retained.');
      if (!Number.isSafeInteger(payload.revision) || payload.revision !== this.revision + 1) throw new Error('Invalid save revision. Reload to reconcile.');
      this.revision = payload.revision;
      this.lastSaved = json;
    });
    this.queue = pending.catch(() => { this.stopped = true; });
    return pending;
  }
}
