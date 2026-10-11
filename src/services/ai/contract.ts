import type { ChangeClassification, Requirement, RequirementClarity, ScopeChange, SourceDocument } from '../../domain/models';

/** Explicit task ids. Cost is recorded separately for each one. */
export type AITaskType =
  | 'extract_requirements'
  | 'classify_client_message'
  | 'analyze_change_impact'
  | 'compare_requirement_pair'
  | 'draft_change_explanation'
  | 'suggest_project_structure'
  | 'review_change';

export type Confidence = 'low' | 'medium' | 'high';
export type ImpactType = 'new' | 'modified' | 'removed' | 'impacted' | 'unchanged';
export type DiffState = 'added' | 'removed' | 'modified' | 'unchanged' | 'ambiguous';

export interface AIUsage {
  provider: string;
  model: string;
  taskType: AITaskType;
  inputTokens: number;
  outputTokens: number;
  providerCost: number | null;
  requestId: string | null;
}

export interface AIResult<T> {
  data: T;
  usage: AIUsage | null;
}

export interface ExtractRequirementsInput {
  userId?: string;
  projectId: string;
  document: SourceDocument;
  text: string;
}

export interface AnalyzeChangeInput {
  userId?: string;
  projectId: string;
  rawRequest: string;
  currentRequirements: Requirement[];
  nodes?: ImpactNode[];
  members?: ImpactMember[];
}

export interface ImpactNode {
  id: string;
  title: string;
  requirementIds: string[];
}

export interface ImpactMember {
  id: string;
  name: string;
  role: string;
}

export interface ChangeProposal {
  summary: string;
  classification: ChangeClassification;
  matchedRequirementIds: string[];
  affectedNodeIds: string[];
  affectedMemberIds: string[];
  explanation: string;
  confidence: Confidence;
  evidenceQuotes: string[];
}

export interface ImpactItem {
  requirementId: string | null;
  nodeIds: string[];
  memberIds: string[];
  impactType: ImpactType;
  explanation: string;
}

export interface RequirementDiff {
  state: DiffState;
  currentRequirementId?: string;
  incomingIndex?: number;
  explanation: string;
  decidedBy: 'code' | 'ai';
}

export interface IncomingRequirement {
  title: string;
  description: string;
  category?: string;
  sourceQuote?: string;
  page?: number;
}

export interface CompareRequirementsInput {
  userId?: string;
  projectId: string;
  current: Requirement[];
  incoming: IncomingRequirement[];
}

export interface CompareRequirementsResult {
  diffs: RequirementDiff[];
  /** Pairs the deterministic pass could not settle, still open if the model failed. */
  pendingSemantic: Array<{ currentRequirementId: string; incomingIndex: number }>;
  aiError?: string;
}

export interface DraftExplanationInput {
  userId?: string;
  change: ScopeChange;
  existingScopeSummary?: string;
}

export interface SuggestedNode {
  tempId: string;
  parentTempId?: string;
  title: string;
  summary: string;
  category: string;
  requirementIds: string[];
  suggestedRole?: string;
  suggestedMemberId?: string;
}

export interface MapEdit {
  action: 'add' | 'update';
  nodeId?: string;
  parentId?: string;
  title: string;
  summary: string;
}

export interface ChangeReview {
  classification: ChangeClassification;
  magnitude: 'small' | 'major';
  summary: string;
  explanation: string;
  clientMessage: string | null;
  edits: MapEdit[];
}

export interface ReviewChangeInput {
  userId?: string;
  projectId: string;
  rawRequest: string;
  currentRequirements: Requirement[];
  nodes?: ImpactNode[];
  members?: ImpactMember[];
}

export interface SuggestStructureInput {
  userId?: string;
  projectId: string;
  requirements: Requirement[];
  members?: ImpactMember[];
}

/**
 * Replaceable AI boundary. Implementations propose only.
 * They must not confirm scope, set a price, or change the baseline.
 */
export interface AIProvider {
  readonly name: string;
  extractRequirements(input: ExtractRequirementsInput): Promise<AIResult<Requirement[]>>;
  classifyClientChange(input: AnalyzeChangeInput): Promise<AIResult<ChangeProposal>>;
  analyzeImpact(input: AnalyzeChangeInput): Promise<AIResult<ImpactItem[]>>;
  compareRequirements(input: CompareRequirementsInput): Promise<AIResult<CompareRequirementsResult>>;
  draftClientExplanation(input: DraftExplanationInput): Promise<AIResult<string>>;
  suggestProjectStructure(input: SuggestStructureInput): Promise<AIResult<SuggestedNode[]>>;
  reviewChange(input: ReviewChangeInput): Promise<AIResult<ChangeReview>>;
}

export interface AIStatus {
  provider: string;
  model: string;
  pool: string;
  configured: boolean;
}

export const CLARITY_VALUES: RequirementClarity[] = ['clear', 'ambiguous', 'missing_detail', 'conflict'];
