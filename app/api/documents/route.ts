import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AIRequestError, createAIProvider } from '../../../src/services/ai/maxplus';
import { extractPdfText } from '../../../src/services/pdf/extract-text';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 12 * 1024 * 1024;
const root = path.join(process.cwd(), 'data', 'documents');

interface StoredDocument {
  id: string;
  projectId: string;
  name: string;
  version: number;
  pageCount: number;
  uploadedAt: string;
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'A PDF file is required.' }, { status: 400 });
  const name = file.name.trim() || 'brief.pdf';
  if (!name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return Response.json({ error: 'Only a PDF brief can be read here.' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) return Response.json({ error: 'PDF must be 12 MB or smaller.' }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return Response.json({ error: 'That file is not a PDF.' }, { status: 400 });
  const stored = Buffer.from(bytes);

  const projectId = textField(form, 'projectId') || 'project';
  let extracted: Awaited<ReturnType<typeof extractPdfText>>;
  try {
    extracted = await extractPdfText(bytes);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not read the PDF.' }, { status: 422 });
  }

  const manifest = await readManifest();
  const version = manifest.filter((item) => item.projectId === projectId).length + 1;
  const id = `DOC-${Date.now()}`;
  const uploadedAt = new Date().toISOString();
  const document: StoredDocument = { id, projectId, name, version, pageCount: extracted.pages.length, uploadedAt };
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, `${id}.pdf`), stored);
  manifest.push(document);
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));

  try {
    const result = await createAIProvider().extractRequirements({
      projectId,
      document: {
        id,
        projectId,
        name,
        version,
        sourceType: 'brief',
        storagePath: `data/documents/${id}.pdf`,
        uploadedAt,
        processingStatus: 'ready',
      },
      text: extracted.text,
    });
    return Response.json({ proposalOnly: true, document, pageCount: extracted.pages.length, ...result });
  } catch (error) {
    const status = error instanceof AIRequestError ? 502 : 422;
    return Response.json({
      error: error instanceof Error ? error.message : 'AI request failed.',
      document,
    }, { status });
  }
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}

function textField(form: FormData | null, name: string): string {
  const value = form?.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

async function readManifest(): Promise<StoredDocument[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const row = entry as Record<string, unknown>;
      if (typeof row.id !== 'string' || typeof row.projectId !== 'string' || typeof row.name !== 'string') return [];
      return [{
        id: row.id,
        projectId: row.projectId,
        name: row.name,
        version: typeof row.version === 'number' ? row.version : 1,
        pageCount: typeof row.pageCount === 'number' ? row.pageCount : 0,
        uploadedAt: typeof row.uploadedAt === 'string' ? row.uploadedAt : '',
      }];
    });
  } catch {
    return [];
  }
}
