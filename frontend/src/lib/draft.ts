export type ProjectDraft = {
  name: string;
  clientName: string;
  brief: string;
};

export const DRAFT_STORAGE_KEY = 'tuydui-prelogin-draft';

export function readProjectDraft(): ProjectDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ProjectDraft>;
    if (typeof value.name !== 'string' && typeof value.clientName !== 'string' && typeof value.brief !== 'string') {
      return null;
    }
    return {
      name: value.name ?? '',
      clientName: value.clientName ?? '',
      brief: value.brief ?? '',
    };
  } catch {
    return null;
  }
}

export function saveProjectDraft(draft: ProjectDraft) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearProjectDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}
