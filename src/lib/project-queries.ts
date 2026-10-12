import type { SupabaseClient } from '@supabase/supabase-js';

export type ProjectAccess = 'owner' | 'shared';

export type ProjectListItem = {
  id: string;
  name: string;
  client_name: string;
  description: string;
  baseline_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  access: ProjectAccess;
};

type ProjectRow = Omit<ProjectListItem, 'access'> & { owner_id?: string };

export class ProjectQueryError extends Error {
  constructor(
    public readonly phase: 'owned' | 'shared' | 'verify',
    cause: unknown,
  ) {
    const message = cause instanceof Error ? cause.message : String((cause as { message?: unknown })?.message || cause);
    super(message || `Project ${phase} query failed`);
    this.name = 'ProjectQueryError';
  }
}

export class ProjectVisibilityError extends Error {
  constructor() {
    super('The created project could not be read back by the current user.');
    this.name = 'ProjectVisibilityError';
  }
}

export function combineProjectRows(owned: ProjectRow[], shared: ProjectRow[]): ProjectListItem[] {
  const ownedIds = new Set(owned.map((project) => project.id));
  return [
    ...owned.map((project) => ({ ...project, access: 'owner' as const })),
    ...shared
      .filter((project) => !ownedIds.has(project.id))
      .map((project) => ({ ...project, access: 'shared' as const })),
  ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function shouldShowQuotaEmptyState(quotaRejected: boolean, visibleProjectCount: number) {
  return quotaRejected && visibleProjectCount === 0;
}

export async function loadProjectList(client: SupabaseClient, userId: string) {
  const { data: owned, error: ownedError } = await client
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });

  if (ownedError) throw new ProjectQueryError('owned', ownedError);

  const ownedRows = (owned ?? []) as ProjectRow[];
  let sharedRows: ProjectRow[] = [];
  let sharedLoadWarning = false;

  try {
    // Keep this query separate from owned projects. A missing collaboration
    // migration or an RLS issue must not hide projects the user owns.
    const { data: memberships, error: memberError } = await client
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .not('accepted_at', 'is', null);

    if (memberError) throw memberError;

    const sharedIds = [...new Set((memberships ?? []).map((row) => row.project_id).filter(Boolean))]
      .filter((id) => !ownedRows.some((project) => project.id === id));

    if (sharedIds.length > 0) {
      const { data: shared, error: sharedError } = await client
        .from('projects')
        .select('*')
        .in('id', sharedIds);

      if (sharedError) throw sharedError;
      sharedRows = (shared ?? []) as ProjectRow[];
    }
  } catch (error) {
    console.warn('Shared project query unavailable; owned projects remain visible.', error);
    sharedLoadWarning = true;
  }

  return {
    projects: combineProjectRows(ownedRows, sharedRows),
    ownerProjectCount: ownedRows.length,
    sharedLoadWarning,
  };
}

export async function verifyCreatedProject(client: SupabaseClient, userId: string, projectId: string) {
  const { data, error } = await client
    .from('projects')
    .select('id, owner_id, name, client_name, description, baseline_confirmed_at, created_at, updated_at')
    .eq('id', projectId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw new ProjectQueryError('verify', error);
  if (!data) throw new ProjectVisibilityError();
  return data as ProjectRow;
}

export function projectCreateErrorMessage(error: unknown, fallback: string) {
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown } | null;
  const text = [candidate?.code, candidate?.message, candidate?.details]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  if (text.includes('pgrst202') || text.includes('create_project_with_free_limit')) {
    return 'ระบบสร้างโปรเจกต์ยังไม่พร้อมใน environment นี้ กรุณาให้ทีม Dev ตรวจสอบฟังก์ชัน quota ก่อนลองใหม่';
  }
  if (text.includes('not_authenticated') || text.includes('jwt')) {
    return 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่ก่อนสร้างโปรเจกต์';
  }
  if (text.includes('projects') && (text.includes('schema cache') || text.includes('pgrst205'))) {
    return 'ระบบโปรเจกต์ยังเชื่อมต่อฐานข้อมูลไม่ครบ กรุณาให้ทีม Dev ตรวจสอบ schema และ RLS';
  }
  return fallback;
}
