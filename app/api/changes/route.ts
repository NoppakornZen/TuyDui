import { AIRequestError, createAIProvider } from '../../../src/services/ai/maxplus';
import { storeProjectPdf } from '../../../src/services/document-store';
import { requireAuth, checkRateLimit, recordUsage } from '../../../src/lib/rate-limit';
import { requireProjectAccess } from '../../../src/lib/project-access';
import { readApprovedWorkspace } from '../../../src/lib/approved-scope';
import { requirementForAI, type StoredDocument } from '../../../src/domain/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const rateLimit = await checkRateLimit(auth.userId);
  if (!rateLimit.allowed) return Response.json({ error: `Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.`, resetIn: rateLimit.resetIn }, { status: 429 });

  try {
    const incoming = await readInput(request);
    const access = await requireProjectAccess(auth.userId, incoming.projectId, true);
    if (access) return access;
    const approved = await readApprovedWorkspace(incoming.projectId);
    if (approved instanceof Response) return approved;
    let document: StoredDocument | undefined;
    let pdfText = '';
    if (incoming.file) {
      const stored = await storeProjectPdf(incoming.file, incoming.projectId, auth.userId, 'revision');
      document = stored.document; pdfText = stored.text;
    }
    const text = [pdfText, incoming.text].filter(Boolean).join('\n\n');
    if (!text) return Response.json({ error: 'Paste a brief or send a PDF.' }, { status: 400 });
    await recordUsage(auth.userId, 'review_change');
    const result = await createAIProvider().reviewChange({
      userId: auth.userId, projectId: incoming.projectId, rawRequest: text,
      currentRequirements: approved.scope.requirements.map((row) => requirementForAI(row, incoming.projectId, true)),
      nodes: approved.scope.nodes, members: incoming.members,
    });
    return Response.json({ proposalOnly: true, document, workspaceVersion: approved.version, ...result });
  } catch (error) {
    const status = error instanceof AIRequestError ? 502 : error instanceof Error && /is required|must be|JSON|Only a PDF|not a PDF/.test(error.message) ? 400 : 422;
    return Response.json({ error: error instanceof Error ? error.message : 'AI request failed.' }, { status });
  }
}

async function readInput(request: Request) {
  let body: Record<string, unknown> | null;
  let file: File | undefined;
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    const form = await request.formData();
    body = JSON.parse(textOf(form.get('context')) || '{}') as Record<string, unknown>;
    const uploaded = form.get('file');
    if (uploaded instanceof File && uploaded.size > 0) file = uploaded;
  } else body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('JSON body is required.');
  const projectId = textOf(body.projectId);
  if (!projectId) throw new Error('projectId is required.');
  const members = Array.isArray(body.members) ? body.members.flatMap((item) => {
    if (!item || typeof item !== 'object' || !textOf(item.id) || !textOf(item.name)) return [];
    return [{ id: textOf(item.id), name: textOf(item.name), role: textOf(item.role) }];
  }) : [];
  return { projectId, text: textOf(body.text), file, members };
}

function textOf(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
