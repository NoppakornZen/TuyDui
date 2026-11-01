import { requireProjectAccess } from '../lib/project-access.js';

export async function GET(request: Request) {
  const access = await requireProjectAccess(request, new URL(request.url).searchParams.get('projectId'), false);
  if (access instanceof Response) return access;
  const { data, error } = await access.client.from('project_workspaces').select('snapshot, revision').eq('project_id', access.projectId).maybeSingle();
  if (error) return Response.json({ error: 'Workspace could not be loaded.' }, { status: 503 });
  return Response.json(data ?? { snapshot: null, revision: 0 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const access = await requireProjectAccess(request, body?.projectId);
  if (access instanceof Response) return access;
  if (!Number.isSafeInteger(body.revision) || body.revision < 0 || !validSnapshot(body.snapshot)) {
    return Response.json({ error: 'A valid snapshot and revision are required.' }, { status: 400 });
  }
  const { data, error } = await access.client.rpc('save_project_workspace', {
    project_uuid: access.projectId, expected_revision: body.revision, workspace_snapshot: body.snapshot,
  });
  if (error) {
    const status = error.message.includes('workspace_conflict') ? 409 : error.message.includes('permission_denied') ? 403 : error.message.includes('invalid_workspace') ? 400 : 503;
    return Response.json({ error: status === 409 ? 'Workspace changed on another device. Reload before saving; your local copy is retained.' : 'Workspace could not be saved.' }, { status });
  }
  return Response.json({ revision: data });
}

export function validSnapshot(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const textFields = (entry: unknown, fields: string[]) => !!entry && typeof entry === 'object' && fields.every((key) => typeof (entry as Record<string, unknown>)[key] === 'string');
  if (!Array.isArray(row.nodes) || row.nodes.length === 0 || !row.nodes.some((n) => n?.id === 'root' && n.kind === 'project' && Array.isArray(n.requirementIds))) return false;
  for (const key of ['nodes', 'edges', 'requirements', 'changes', 'history', 'documents']) if (!Array.isArray(row[key])) return false;
  if (row.nodes.some((n) => !textFields(n,['id','title','owner']) || !['project','work_area'].includes(n.kind) || !Number.isFinite(n.x) || !Number.isFinite(n.y) || !Array.isArray(n.requirementIds) || !n.requirementIds.every((id: unknown) => typeof id === 'string'))) return false;
  if (!row.nodeNotes || typeof row.nodeNotes !== 'object' || Array.isArray(row.nodeNotes)) return false;
  const edges = row.edges as unknown[]; const requirements = row.requirements as unknown[]; const changes = row.changes as unknown[];
  const documents = row.documents as Array<Record<string, unknown>>;
  const pan = row.pan as Record<string, unknown> | null;
  return edges.every((entry) => textFields(entry,['id','from','to']))
    && requirements.every((entry) => textFields(entry,['id','title','description','area','owner','source','status']))
    && changes.every((entry) => textFields(entry,['id','title','type','detail','decision']))
    && documents.every((entry) => textFields(entry,['id','name','uploadedAt']) && Number.isFinite(entry.version) && Number.isFinite(entry.pageCount))
    && (row.history as unknown[]).every((entry) => typeof entry === 'string')
    && Object.values(row.nodeNotes).every((note) => typeof note === 'string')
    && Number.isFinite(row.zoom) && (row.zoom as number) > 0 && !!pan && Number.isFinite(pan.x) && Number.isFinite(pan.y) && typeof row.baselineConfirmed === 'boolean';
}
