import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Requirement } from '../../../src/domain/models';
import { AIRequestError, createAIProvider } from '../../../src/services/ai/maxplus';
import { extractPdfText } from '../../../src/services/pdf/extract-text';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_BYTES = 12 * 1024 * 1024;
const root = path.join(process.cwd(), 'data', 'documents');

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  try {
    const incoming = contentType.includes('multipart/form-data') ? await fromForm(request) : await fromJson(request);
    if (!incoming.text) return Response.json({ error: 'Paste a brief or send a PDF.' }, { status: 400 });
    const result = await createAIProvider().reviewChange({
      projectId: incoming.projectId,
      rawRequest: incoming.text,
      currentRequirements: incoming.requirements,
      nodes: incoming.nodes,
      members: incoming.members,
    });
    return Response.json({ proposalOnly: true, document: incoming.document, ...result });
  } catch (error) {
    const status = error instanceof AIRequestError ? 502 : error instanceof Error && /is required|must be|JSON/.test(error.message) ? 400 : 422;
    return Response.json({ error: error instanceof Error ? error.message : 'AI request failed.' }, { status });
  }
}

async function fromJson(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
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

async function fromForm(request: Request) {
  const form = await request.formData();
  const context = JSON.parse(text(form.get('context')) || '{}') as Record<string, unknown>;
  const file = form.get('file');
  let pdfText = '';
  let document: { id: string; name: string; version: number } | undefined;
  if (file instanceof File && file.size > 0) {
    const stored = await storePdf(file, text(context.projectId) || 'project');
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

async function storePdf(file: File, projectId: string) {
  const name = file.name.trim() || 'change.pdf';
  if (!name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') throw new Error('Only a PDF brief can be read here.');
  if (file.size > MAX_BYTES) throw new Error('PDF must be 12 MB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('That file is not a PDF.');
  const extracted = await extractPdfText(bytes);
  const manifest = await readManifest();
  const version = manifest.filter((item) => item.projectId === projectId).length + 1;
  const id = `DOC-${Date.now()}`;
  const document = { id, projectId, name, version, pageCount: extracted.pages.length, uploadedAt: new Date().toISOString() };
  try {
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, `${id}.pdf`), Buffer.from(bytes));
    await writeFile(path.join(root, 'manifest.json'), JSON.stringify([...manifest, document], null, 2));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EROFS' && (error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
  }
  return { text: extracted.text, document: { id, name, version } };
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

async function readManifest(): Promise<Array<{ projectId: string }>> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') as Array<{ projectId: string }> : [];
  } catch {
    return [];
  }
}
