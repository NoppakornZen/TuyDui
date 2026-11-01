import type { Requirement } from '../domain/models.js';
import { AIRequestError, createAIProvider } from '../services/ai/maxplus.js';
import { requireAuth, reserveUsage } from '../lib/rate-limit.js';
import { hasCrossProjectData, requireProjectAccess } from '../lib/project-access.js';


/** Older entry point. New callers should use POST /api/ai with task=classify_client_message. */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const body = await request.json().catch(() => null) as { rawRequest?: string; projectId?: string; currentScope?: Requirement[]; currentRequirements?: Requirement[] } | null;
  if (typeof body?.rawRequest !== 'string' || !body.rawRequest.trim()) return Response.json({ error: 'rawRequest is required.' }, { status: 400 });
  const access = await requireProjectAccess(request, body.projectId);
  if (access instanceof Response) return access;
  if (hasCrossProjectData(body, access.projectId)) return Response.json({ error: 'Cross-project data is not allowed.' }, { status: 400 });
  const limited = await reserveUsage(access, 'classify_client_message');
  if (limited) return limited;
  const provider = createAIProvider();
  try {
    const result = await provider.classifyClientChange({
      userId: auth.userId,
      projectId: access.projectId,
      rawRequest: body.rawRequest,
      currentRequirements: body.currentRequirements ?? body.currentScope ?? [],
    });
    return Response.json({ mode: 'provider', proposalOnly: true, ...result });
  } catch (error) {
    const status = error instanceof Error && ['TimeoutError','AbortError'].includes(error.name) ? 504 : error instanceof AIRequestError ? 502 : error instanceof Error && error.message.includes('not configured') ? 503 : 422;
    return Response.json({ error: error instanceof Error ? error.message : 'AI request failed.' }, { status });
  }
}
