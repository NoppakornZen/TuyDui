export type NodeKind = 'project' | 'work_area';
export type MapNode = { id: string; title: string; kind: NodeKind; owner: string; requirements: number; x: number; y: number; impacted?: boolean; requirementIds: string[]; summary?: string };
export type Edge = { id: string; from: string; to: string };
export type RequirementRow = { id: string; title: string; description: string; area: string; owner: string; source: string; status: string; quote?: string; page?: number; documentId?: string; clarity?: string };
export type ChangeRow = { id: string; title: string; type: string; detail: string; decision: string; explanation?: string; confidence?: string };
export type StoredDocument = { id: string; name: string; version: number; pageCount: number; uploadedAt: string };
export type WorkspaceState = {
  nodes: MapNode[]; edges: Edge[]; requirements: RequirementRow[]; changes: ChangeRow[];
  history: string[]; nodeNotes: Record<string, string>; documents: StoredDocument[];
  zoom: number; pan: { x: number; y: number }; baselineConfirmed: boolean;
};

export function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== 'object') return false;
  const s = value as WorkspaceState;
  const textFields = (row: unknown, fields: string[]) => !!row && typeof row === 'object' && fields.every((key) => typeof (row as Record<string, unknown>)[key] === 'string');
  return Array.isArray(s.nodes) && s.nodes.length > 0
    && s.nodes.some((n) => n?.id === 'root' && n.kind === 'project')
    && s.nodes.every((n) => textFields(n, ['id','title','owner']) && ['project','work_area'].includes(n.kind) && Number.isFinite(n.x) && Number.isFinite(n.y) && Array.isArray(n.requirementIds) && n.requirementIds.every((id) => typeof id === 'string'))
    && ['edges', 'requirements', 'changes', 'history', 'documents'].every((key) => Array.isArray(s[key as keyof WorkspaceState]))
    && s.edges.every((row) => textFields(row,['id','from','to']))
    && s.requirements.every((row) => textFields(row,['id','title','description','area','owner','source','status']))
    && s.changes.every((row) => textFields(row,['id','title','type','detail','decision']))
    && s.documents.every((row) => textFields(row,['id','name','uploadedAt']) && Number.isFinite(row.version) && Number.isFinite(row.pageCount))
    && s.history.every((row) => typeof row === 'string')
    && !!s.nodeNotes && typeof s.nodeNotes === 'object' && !Array.isArray(s.nodeNotes) && Object.values(s.nodeNotes).every((note) => typeof note === 'string')
    && Number.isFinite(s.zoom) && s.zoom > 0 && !!s.pan && Number.isFinite(s.pan.x) && Number.isFinite(s.pan.y) && typeof s.baselineConfirmed === 'boolean';
}
