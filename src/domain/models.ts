export type RequirementClarity = 'clear' | 'ambiguous' | 'missing_detail' | 'conflict';
export type NodeStatus = 'planned' | 'in_progress' | 'done';
export type ChangeClassification = 'in_scope' | 'modified' | 'new_scope' | 'ambiguous';
export type ChangeDecision = 'pending' | 'included' | 'charge_extra' | 'needs_discussion' | 'approved';

export interface SourceEvidence {
  documentId: string;
  page?: number;
  quote: string;
}

export interface SourceDocument {
  id: string;
  projectId: string;
  name: string;
  version: number;
  sourceType: 'brief' | 'revision' | 'client_message' | 'email' | 'other';
  storagePath?: string;
  uploadedAt: string;
  processingStatus: 'queued' | 'processing' | 'ready' | 'failed';
}

export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  clarity: RequirementClarity;
  evidence: SourceEvidence[];
  suggestedRoles: string[];
  approved: boolean;
}

export interface ProjectNode {
  id: string;
  projectId: string;
  title: string;
  nodeType: 'project' | 'work_area' | 'requirement_group' | 'milestone';
  parentId?: string;
  assigneeId?: string;
  status: NodeStatus;
  position: { x: number; y: number };
  requirementIds: string[];
  notes?: string;
}

export interface ProjectEdge {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: 'depends_on' | 'related_to' | 'contains';
}

export interface TeamMember {
  id: string;
  projectId: string;
  name: string;
  role: string;
}

export interface ScopeChange {
  id: string;
  projectId: string;
  sourceDocumentId?: string;
  rawRequest: string;
  summary: string;
  classification: ChangeClassification;
  decision: ChangeDecision;
  affectedRequirementIds: string[];
  affectedNodeIds: string[];
  affectedMemberIds: string[];
  price?: number;
  additionalDays?: number;
  newDeadline?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  deadline?: string;
  baselineConfirmedAt?: string;
  createdAt: string;
}
