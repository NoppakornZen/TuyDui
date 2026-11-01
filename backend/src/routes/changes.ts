import type { Requirement } from '../domain/models.js';
import { AIRequestError, createAIProvider } from '../services/ai/maxplus.js';
import { requireAuth, reserveUsage } from '../lib/rate-limit.js';
import { requireProjectAccess, hasCrossProjectData, type ProjectAccess } from '../lib/project-access.js';
import { storePdf, DocumentUploadLimitError } from '../services/documents.js';


export async function POST(request: Request) {
  // Check authentication
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const contentType = request.headers.get('content-type') ?? '';
  try {
    const form = contentType.includes('multipart/form-data') ? await request.formData() : null;
    const body = form ? JSON.parse(text(form.get('context')) || '{}') : await request.json();
    const projectId = text(body?.projectId) || text(form?.get('projectId'));
    const access = await requireProjectAccess(request, projectId);
    if (access instanceof Response) return access;
    if (hasCrossProjectData(body, access.projectId)) return Response.json({ error: 'Cross-project data is not allowed.' }, { status: 400 });
    const limited = await reserveUsage(access, 'review_change');
    if (limited) return limited;
    const incoming = form ? await fromForm(form, body, access) : fromJson(body);
    if (!incoming.text) return Response.json({ error: 'Paste a brief or send a PDF.' }, { status: 400 });

    const result = await createAIProvider().reviewChange({
      userId,
      projectId: incoming.projectId,
      rawRequest: incoming.text,
      currentRequirements: incoming.requirements,
      nodes: incoming.nodes,
      members: incoming.members,
    });
    return Response.json({ proposalOnly: true, document: incoming.document, ...result });
  } catch (error) {
    if (error instanceof DocumentUploadLimitError) return Response.json({ error: error.message, resetIn: 3600 }, { status: 429, headers: { 'Retry-After': '3600' } });
    const status = error instanceof Error && ['TimeoutError','AbortError'].includes(error.name) ? 504 : error instanceof AIRequestError ? 502 : error instanceof Error && /unavailable|not configured/.test(error.message) ? 503 : error instanceof Error && /is required|must be|JSON|PDF/.test(error.message) ? 400 : 422;
    return Response.json({ error: error instanceof Error ? error.message : 'AI request failed.' }, { status });
  }
}

function fromJson(body: Record<string, unknown> | null) {
  if (!body) throw new Error('JSON body is required.');
  return {
    projectId: text(body.projectId) || 'project',
    text: text(body.text),
    requirements: requirementsOf(body.requirements),
    nodes: nodesOf(body.nodes),
    members: membersOf(body.members),
    document: undefined,
  };
}

async function fromForm(form: FormData, context: Record<string, unknown>, access: ProjectAccess) {
  const file = form.get('file');
  let pdfText = '';
  let document: { id: string; name: string; version: number } | undefined;
  if (file instanceof File && file.size > 0) {
    const stored = await storePdf(file, access);
    pdfText = stored.text;
    document = stored.document;
  }
  const note = text(context.text);
  return {
    projectId: text(context.projectId) || 'project',
    text: [pdfText, note].filter(Boolean).join('\n\n'),
    requirements: requirementsOf(context.requirements),
    nodes: nodesOf(context.nodes),
    members: membersOf(context.members),
    document,
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function requirementsOf(value: unknown): Requirement[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (!text(row.id) || !text(row.title) || !text(row.description)) return [];
    return [{
      id: text(row.id),
      projectId: text(row.projectId),
      title: text(row.title),
      description: text(row.description),
      category: text(row.category) || 'General',
      clarity: row.clarity === 'ambiguous' || row.clarity === 'missing_detail' || row.clarity === 'conflict' ? row.clarity : 'clear',
      evidence: [],
      suggestedRoles: [],
      approved: false,
    }];
  });
}

function nodesOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (!text(row.id) || !text(row.title)) return [];
    return [{ id: text(row.id), title: text(row.title), summary: text(row.summary), requirementIds: Array.isArray(row.requirementIds) ? row.requirementIds.filter((id): id is string => typeof id === 'string') : [] }];
  });
}

function membersOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (!text(row.id) || !text(row.name)) return [];
    return [{ id: text(row.id), name: text(row.name), role: text(row.role) }];
  });
}
