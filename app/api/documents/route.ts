import { AIRequestError, createAIProvider } from '../../../src/services/ai/maxplus';
import { storeProjectPdf } from '../../../src/services/document-store';
import { requireAuth, checkRateLimit, recordUsage } from '../../../src/lib/rate-limit';
import { requireProjectAccess } from '../../../src/lib/project-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const rateLimit = await checkRateLimit(auth.userId);
  if (!rateLimit.allowed) return Response.json({ error: `Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.`, resetIn: rateLimit.resetIn }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'A PDF file is required.' }, { status: 400 });
  const projectId = typeof form?.get('projectId') === 'string' ? String(form.get('projectId')).trim() : '';
  const access = await requireProjectAccess(auth.userId, projectId, true);
  if (access) return access;
  let stored: Awaited<ReturnType<typeof storeProjectPdf>>;
  try { stored = await storeProjectPdf(file, projectId, auth.userId, 'brief'); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Could not read the PDF.' }, { status: 422 }); }
  const { document, text, storagePath } = stored;
  await recordUsage(auth.userId, 'extract_requirements');
  try {
    const result = await createAIProvider().extractRequirements({
      userId: auth.userId, projectId,
      document: { id: document.id, projectId, name: document.name, version: document.version, sourceType: 'brief', storagePath, uploadedAt: document.uploadedAt, processingStatus: 'ready' }, text,
    });
    return Response.json({ proposalOnly: true, document, pageCount: document.pageCount, ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'AI request failed.', document }, { status: error instanceof AIRequestError ? 502 : 422 });
  }
}
