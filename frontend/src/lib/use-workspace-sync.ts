'use client';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from './api';
import { WorkspaceRepository } from './workspace-repository';
import type { WorkspaceState } from './workspace-state';

export function useWorkspaceSync(projectId: string, snapshot: WorkspaceState, ready: boolean) {
  const repository = useRef<WorkspaceRepository | null>(null);
  const [syncStatus, setSyncStatus] = useState('Loading shared workspace…');
  const [recovery, setRecovery] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadWorkspace(userId: string) {
    const next = new WorkspaceRepository(projectId, userId, apiFetch, window.localStorage);
    repository.current = next;
    const loaded = await next.load();
    if (repository.current !== next) return null;
    setRecovery(loaded.recovery);
    setSyncStatus(loaded.snapshot ? 'Shared workspace loaded' : 'Ready to save');
    return loaded.snapshot;
  }
  async function saveNow(next = snapshot) {
    if (timer.current) clearTimeout(timer.current);
    const repo = repository.current;
    if (!repo || repo.projectId !== projectId) throw new Error('Workspace is not loaded.');
    setSyncStatus('Saving…');
    try {
      await repo.save(next);
      if (repository.current === repo) setSyncStatus('Saved to server');
    } catch (error) {
      if (repository.current === repo) {
        setSyncStatus(error instanceof Error ? error.message : 'Save failed. Local copy retained.');
        setRecovery(window.localStorage.getItem(repo.localKey));
      }
      throw error;
    }
  }
  useEffect(() => {
    if (!ready || repository.current?.projectId !== projectId) return;
    // Keep local changes immediately; debounce only the network request.
    try { window.localStorage.setItem(repository.current.localKey, JSON.stringify(snapshot)); }
    catch { setSyncStatus('Local backup is unavailable. Keep this tab open until server save completes.'); }
    setSyncStatus('Unsaved changes — saving…');
    timer.current = setTimeout(() => { void saveNow(snapshot).catch(() => {}); }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [projectId, ready, snapshot]);
  return { loadWorkspace, saveNow, syncStatus, recovery };
}
