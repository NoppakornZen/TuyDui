import type { Requirement } from './models';
import type { ChangeReview } from '../services/ai/contract';

export type MapNode = { id: string; title: string; kind: 'project' | 'work_area'; owner: string; requirements: number; x: number; y: number; impacted?: boolean; requirementIds: string[]; summary?: string };
export type Edge = { id: string; from: string; to: string };
export type RequirementRow = { id: string; title: string; description: string; area: string; owner: string; source: string; status: string; quote?: string; page?: number; documentId?: string; clarity?: string };
export type ChangeRow = { id: string; title: string; type: string; detail: string; decision: string; commercialDecision?: string; explanation?: string; confidence?: string };
export type StoredDocument = { id: string; name: string; version: number; pageCount: number; uploadedAt: string };
export type ApprovedScope = { requirements: RequirementRow[]; nodes: MapNode[]; edges: Edge[] };
export type WorkspaceSnapshot = ApprovedScope & {
  changes: ChangeRow[];
  history: string[];
  nodeNotes: Record<string, string>;
  documents: StoredDocument[];
  briefProposals: RequirementRow[];
};

export function emptyWorkspace(title = 'Project', owner = 'Project team'): WorkspaceSnapshot {
  return { nodes: [{ id: 'root', title, kind: 'project', owner, requirements: 0, x: 640, y: 280, requirementIds: [] }], edges: [], requirements: [], changes: [], history: [], nodeNotes: {}, documents: [], briefProposals: [] };
}

/** Import the older browser snapshot without discarding it when an upload fails. */
export function normalizeWorkspace(value: unknown, fallback = emptyWorkspace()): WorkspaceSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved workspace.');
  const row = value as Partial<WorkspaceSnapshot>;
  const requirements = (items: unknown): RequirementRow[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') throw new Error('Invalid saved requirement.');
      return { ...item, description: item.description || item.title, area: item.area || 'General', owner: item.owner || 'Unassigned', source: item.source || 'Manual', status: item.status || 'Review' };
    });
  };
  const nodes = Array.isArray(row.nodes) && row.nodes.length ? row.nodes.map((node) => {
    if (!node || typeof node.id !== 'string' || typeof node.title !== 'string' || !Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error('Invalid saved map node.');
    return { ...node, requirementIds: Array.isArray(node.requirementIds) ? node.requirementIds : [] };
  }) : fallback.nodes;
  return {
    nodes, edges: Array.isArray(row.edges) ? row.edges : [], requirements: requirements(row.requirements),
    changes: Array.isArray(row.changes) ? row.changes : [], history: Array.isArray(row.history) ? row.history.filter((item) => typeof item === 'string') : [],
    nodeNotes: row.nodeNotes && typeof row.nodeNotes === 'object' && !Array.isArray(row.nodeNotes) ? row.nodeNotes : {},
    documents: Array.isArray(row.documents) ? row.documents : [], briefProposals: requirements(row.briefProposals),
  };
}

export function requirementForAI(row: RequirementRow, projectId: string, approved = false): Requirement {
  const clarity = row.clarity === 'ambiguous' || row.clarity === 'missing_detail' || row.clarity === 'conflict' ? row.clarity : 'clear';
  return { id: row.id, projectId, title: row.title, description: row.description, category: row.area, clarity,
    evidence: [{ documentId: row.documentId ?? 'DOC-001', page: row.page, quote: row.quote || row.description }],
    suggestedRoles: row.owner !== 'Unassigned' ? [row.owner] : [], approved };
}

/** A deliberate Apply advances the approved scope; ordinary edits only change the draft. */
export function applyReviewToScope(scope: ApprovedScope, review: ChangeReview, source: string, idPrefix: string): ApprovedScope {
  if (review.classification === 'in_scope' || review.classification === 'ambiguous') return scope;
  let requirements = [...scope.requirements];
  let nodes = scope.nodes.map((node) => ({ ...node, impacted: false, requirementIds: [...node.requirementIds] }));
  const edges = [...scope.edges];
  review.edits.forEach((edit, index) => {
    const existingNode = edit.action === 'update' ? nodes.find((node) => node.id === edit.nodeId) : undefined;
    if (edit.action === 'update' && !existingNode) throw new Error('The reviewed work area no longer exists. Review the request again.');
    // Update the linked requirement rather than keeping both old and new descriptions as approved.
    const existingRequirement = existingNode?.requirementIds.length === 1 ? requirements.find((row) => row.id === existingNode.requirementIds[0]) : requirements.find((row) => row.title.trim() === edit.title.trim());
    const id = existingRequirement?.id ?? `REQ-${idPrefix}-${index}`;
    const requirement: RequirementRow = { ...existingRequirement, id, title: edit.title, description: edit.summary, area: existingRequirement?.area ?? 'Change', owner: existingRequirement?.owner ?? 'Unassigned', source, status: 'Approved' };
    requirements = existingRequirement ? requirements.map((row) => row.id === id ? requirement : row) : [...requirements, requirement];
    if (existingNode) {
      nodes = nodes.map((node) => node.id === existingNode.id ? { ...node, title: edit.title, summary: edit.summary, impacted: true, requirementIds: [...new Set([...node.requirementIds, id])] } : node);
    } else {
      const parent = nodes.find((node) => node.id === edit.parentId) ?? nodes[0];
      const nodeId = `node-${idPrefix}-${index}`;
      const y = (parent?.y ?? 36) + 176;
      const peers = nodes.filter((node) => Math.abs(node.y - y) < 70);
      const x = peers.length ? Math.max(...peers.map((node) => node.x)) + 248 : parent?.x ?? 80;
      nodes.push({ id: nodeId, title: edit.title, summary: edit.summary, kind: 'work_area', owner: 'Unassigned', requirements: 1, x, y, impacted: true, requirementIds: [id] });
      edges.push({ id: `e-${nodeId}`, from: parent?.id ?? 'root', to: nodeId });
    }
  });
  nodes = nodes.map((node) => node.kind === 'project' ? { ...node, requirementIds: requirements.map((row) => row.id), requirements: requirements.length } : { ...node, requirements: node.requirementIds.length });
  return { requirements, nodes, edges };
}

export function mergeAppliedScope(draft: WorkspaceSnapshot, previous: ApprovedScope, next: ApprovedScope): ApprovedScope {
  const requirements = new Map(draft.requirements.map((row) => [row.id, row]));
  for (const row of next.requirements) {
    if (JSON.stringify(row) !== JSON.stringify(previous.requirements.find((item) => item.id === row.id))) requirements.set(row.id, row);
  }
  const nodes = new Map(draft.nodes.map((node) => [node.id, node]));
  for (const node of next.nodes) {
    if (!nodes.has(node.id) || node.impacted) {
      const position = nodes.get(node.id);
      nodes.set(node.id, { ...node, x: position?.x ?? node.x, y: position?.y ?? node.y });
    }
  }
  const edges = new Map(draft.edges.map((edge) => [edge.id, edge]));
  for (const edge of next.edges) edges.set(edge.id, edge);
  const rows = [...requirements.values()];
  return { requirements: rows, nodes: [...nodes.values()].map((node) => node.kind === 'project' ? { ...node, requirementIds: rows.map((row) => row.id), requirements: rows.length } : node), edges: [...edges.values()] };
}
