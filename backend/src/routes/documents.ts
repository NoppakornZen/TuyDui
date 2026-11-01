import { AIRequestError, createAIProvider } from '../services/ai/maxplus.js';
import { requireAuth, reserveUsage } from '../lib/rate-limit.js';
import { requireProjectAccess } from '../lib/project-access.js';
import { storePdf, DocumentUploadLimitError } from '../services/documents.js';

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const form = await request.formData().catch(() => null);
  const access = await requireProjectAccess(request, form?.get('projectId'));
  if (access instanceof Response) return access;
  const file = form?.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'A PDF file is required.' }, { status: 400 });
  const limited = await reserveUsage(access, 'extract_requirements');
  if (limited) return limited;
  let document;
  try {
    const stored = await storePdf(file, access);
    document = stored.document;
    const result = await createAIProvider().extractRequirements({
      userId: auth.userId, projectId: access.projectId,
      document: { ...document, sourceType: 'brief', storagePath: stored.storagePath, processingStatus: 'ready' },
      text: stored.text,
    });
    return Response.json({ proposalOnly: true, document, pageCount: document.pageCount, ...result });
  } catch (error) {
    if (error instanceof DocumentUploadLimitError) return Response.json({ error: error.message, resetIn: 3600 }, { status: 429, headers: { 'Retry-After': '3600' } });
    const message = error instanceof Error ? error.message : 'PDF processing failed.';
    const status = error instanceof Error && ['TimeoutError','AbortError'].includes(error.name) ? 504 : error instanceof AIRequestError ? 502 : /unavailable|not configured/.test(message) ? 503 : /PDF must|Only a PDF|not a PDF/.test(message) ? 400 : 422;
    return Response.json({ error: message, document }, { status });
  }
}
