import type { Requirement, ScopeChange, SourceDocument } from '../../../src/domain/models';
import { AIRequestError, MaxPlusAIProvider, aiStatus, createAIProvider } from '../../../src/services/ai/maxplus';
import { readAIUsage, summarizeAIUsage } from '../../../src/services/ai/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const TASKS = new Set([
  'extract_requirements',
  'classify_client_message',
  'analyze_change_impact',
  'compare_requirement_pair',
  'draft_change_explanation',
  'suggest_project_structure',
]);

const recentCalls: number[] = [];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = aiStatus();
  const usage = url.searchParams.get('usage') === '1' ? summarizeAIUsage(await readAIUsage()) : undefined;
  if (url.searchParams.get('live') !== '1') return Response.json({ ...status, usage });

  const provider = createAIProvider();
  if (!(provider instanceof MaxPlusAIProvider)) {
    return Response.json({ ...status, live: false, usage });
  }
  try {
    const models = await provider.listModels();
    return Response.json({ ...status, live: true, modelAvailable: models.includes(status.model), usage });
  } catch (error) {
    return Response.json({ ...status, live: false, error: error instanceof Error ? error.message : 'Model check failed.', usage }, { status: httpStatus(error) });
  }
}

export async function POST(request: Request) {
  if (limited()) return Response.json({ error: 'Too many AI requests. Wait a moment and try again.' }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const task = typeof body?.task === 'string' ? body.task : '';
  if (!body || !TASKS.has(task)) return Response.json({ error: 'Unknown AI task.' }, { status: 400 });

  const provider = createAIProvider();
  try {
    if (task === 'extract_requirements') {
      const projectId = requiredText(body.projectId, 'projectId');
      const text = requiredText(body.text, 'text');
      const result = await provider.extractRequirements({
        userId: optionalText(body.userId),
        projectId,
        document: asDocument(body.document, projectId),
        text,
      });
      return Response.json({ task, proposalOnly: true, ...result });
    }
    if (task === 'classify_client_message') {
      const result = await provider.classifyClientChange(asChangeInput(body));
      return Response.json({ task, proposalOnly: true, ...result });
    }
    if (task === 'analyze_change_impact') {
      const result = await provider.analyzeImpact(asChangeInput(body));
      return Response.json({ task, proposalOnly: true, ...result });
    }
    if (task === 'compare_requirement_pair') {
      const result = await provider.compareRequirements({
        userId: optionalText(body.userId),
        projectId: requiredText(body.projectId, 'projectId'),
        current: asRequirements(body.current, 'current'),
        incoming: asIncoming(body.incoming),
      });
      return Response.json({ task, proposalOnly: true, ...result });
    }
    if (task === 'draft_change_explanation') {
      const result = await provider.draftClientExplanation({
        userId: optionalText(body.userId),
        change: asChange(body.change),
        existingScopeSummary: optionalText(body.existingScopeSummary),
      });
      return Response.json({ task, proposalOnly: true, ...result });
    }
    const result = await provider.suggestProjectStructure({
      userId: optionalText(body.userId),
      projectId: requiredText(body.projectId, 'projectId'),
      requirements: asRequirements(body.requirements, 'requirements'),
      members: asMembers(body.members),
    });
    return Response.json({ task, proposalOnly: true, ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'AI request failed.' }, { status: httpStatus(error) });
  }
}

function limited(): boolean {
  const now = Date.now();
  while (recentCalls.length > 0 && now - recentCalls[0] > 60_000) recentCalls.shift();
  if (recentCalls.length >= 30) return true;
  recentCalls.push(now);
  return false;
}

function httpStatus(error: unknown): number {
  if (error instanceof AIRequestError) {
    if (error.code === 'authentication_error') return 401;
    if (error.code === 'insufficient_credit') return 402;
    if (error.code === 'rate_limit_error') return 429;
    if (error.code === 'service_unavailable') return 503;
    return 502;
  }
  if (error instanceof Error && error.message.includes('not configured')) return 503;
  if (error instanceof Error && /is required|must be/.test(error.message)) return 400;
  return 422;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asDocument(value: unknown, projectId: string): SourceDocument {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const sourceType = row.sourceType === 'revision' || row.sourceType === 'client_message' || row.sourceType === 'email' || row.sourceType === 'other' ? row.sourceType : 'brief';
  return {
    id: optionalText(row.id) ?? 'DOC-001',
    projectId,
    name: optionalText(row.name) ?? 'Brief',
    version: typeof row.version === 'number' ? row.version : 1,
    sourceType,
    uploadedAt: optionalText(row.uploadedAt) ?? new Date().toISOString(),
    processingStatus: 'processing',
  };
}

function asChangeInput(body: Record<string, unknown>) {
  return {
    userId: optionalText(body.userId),
    projectId: requiredText(body.projectId, 'projectId'),
    rawRequest: requiredText(body.rawRequest, 'rawRequest'),
    currentRequirements: asRequirements(body.currentRequirements, 'currentRequirements'),
    nodes: asNodes(body.nodes),
    members: asMembers(body.members),
  };
}

function asRequirements(value: unknown, field = 'requirements'): Requirement[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Requirement ${index + 1} must be an object.`);
    const row = entry as Record<string, unknown>;
    return {
      id: requiredText(row.id, `requirements[${index}].id`),
      projectId: optionalText(row.projectId) ?? '',
      title: requiredText(row.title, `requirements[${index}].title`),
      description: requiredText(row.description, `requirements[${index}].description`),
      category: optionalText(row.category) ?? 'General',
      clarity: row.clarity === 'ambiguous' || row.clarity === 'missing_detail' || row.clarity === 'conflict' ? row.clarity : 'clear',
      evidence: Array.isArray(row.evidence) ? row.evidence.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const evidence = item as Record<string, unknown>;
        const quote = optionalText(evidence.quote);
        if (!quote) return [];
        return [{ documentId: optionalText(evidence.documentId) ?? 'DOC', page: typeof evidence.page === 'number' ? evidence.page : undefined, quote }];
      }) : [],
      suggestedRoles: [],
      approved: row.approved === true,
    };
  });
}

function asIncoming(value: unknown) {
  if (!Array.isArray(value)) throw new Error('incoming must be an array.');
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Incoming requirement ${index + 1} must be an object.`);
    const row = entry as Record<string, unknown>;
    return {
      title: requiredText(row.title, `incoming[${index}].title`),
      description: requiredText(row.description, `incoming[${index}].description`),
      category: optionalText(row.category),
      sourceQuote: optionalText(row.sourceQuote),
      page: typeof row.page === 'number' ? row.page : undefined,
    };
  });
}

function asNodes(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('nodes must be an array.');
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Node ${index + 1} must be an object.`);
    const row = entry as Record<string, unknown>;
    return {
      id: requiredText(row.id, `nodes[${index}].id`),
      title: requiredText(row.title, `nodes[${index}].title`),
      requirementIds: Array.isArray(row.requirementIds) ? row.requirementIds.filter((id): id is string => typeof id === 'string') : [],
    };
  });
}

function asMembers(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('members must be an array.');
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Member ${index + 1} must be an object.`);
    const row = entry as Record<string, unknown>;
    return {
      id: requiredText(row.id, `members[${index}].id`),
      name: requiredText(row.name, `members[${index}].name`),
      role: optionalText(row.role) ?? '',
    };
  });
}

function asChange(value: unknown): ScopeChange {
  if (!value || typeof value !== 'object') throw new Error('change is required.');
  const row = value as Record<string, unknown>;
  const classification = row.classification === 'in_scope' || row.classification === 'modified' || row.classification === 'new_scope' || row.classification === 'ambiguous' ? row.classification : null;
  if (!classification) throw new Error('change.classification is required.');
  return {
    id: optionalText(row.id) ?? 'CR-DRAFT',
    projectId: requiredText(row.projectId, 'change.projectId'),
    rawRequest: requiredText(row.rawRequest, 'change.rawRequest'),
    summary: requiredText(row.summary, 'change.summary'),
    classification,
    decision: 'pending',
    affectedRequirementIds: [],
    affectedNodeIds: [],
    affectedMemberIds: [],
    price: typeof row.price === 'number' ? row.price : undefined,
    additionalDays: typeof row.additionalDays === 'number' ? row.additionalDays : undefined,
    newDeadline: optionalText(row.newDeadline),
    createdAt: new Date().toISOString(),
  };
}
