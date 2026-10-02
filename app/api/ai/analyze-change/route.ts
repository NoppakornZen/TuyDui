import type { Requirement } from '../../../../src/domain/models';
import { AIRequestError, createAIProvider } from '../../../../src/services/ai/maxplus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Older entry point. New callers should use POST /api/ai with task=classify_client_message. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { rawRequest?: string; projectId?: string; currentScope?: Requirement[]; currentRequirements?: Requirement[] } | null;
  if (!body?.rawRequest?.trim()) return Response.json({ error: 'rawRequest is required.' }, { status: 400 });
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
