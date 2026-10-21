import type { Requirement } from '../domain/models.js';
import { AIRequestError, createAIProvider } from '../services/ai/maxplus.js';
import { requireAuth, checkRateLimit, recordUsage } from '../lib/rate-limit.js';


/** Older entry point. New callers should use POST /api/ai with task=classify_client_message. */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const limit = await checkRateLimit(auth.userId);
  if (!limit.allowed) return Response.json({ error: 'Rate limit exceeded.', resetIn: limit.resetIn }, { status: 429 });
  const body = await request.json().catch(() => null) as { rawRequest?: string; projectId?: string; currentScope?: Requirement[]; currentRequirements?: Requirement[] } | null;
  if (!body?.rawRequest?.trim()) return Response.json({ error: 'rawRequest is required.' }, { status: 400 });
  await recordUsage(auth.userId, 'classify_client_message');
  const provider = createAIProvider();
  try {
    const result = await provider.classifyClientChange({
      projectId: body.projectId?.trim() || 'unassigned',
      rawRequest: body.rawRequest,
      currentRequirements: body.currentRequirements ?? body.currentScope ?? [],
    });
    return Response.json({ mode: 'provider', proposalOnly: true, ...result });
  } catch (error) {
    const status = error instanceof AIRequestError ? 502 : error instanceof Error && error.message.includes('not configured') ? 503 : 422;
    return Response.json({ error: error instanceof Error ? error.message : 'AI request failed.' }, { status });
  }
}
