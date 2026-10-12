import { POST as runAuthenticatedAI } from '../route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Older entry point. New callers should use POST /api/ai with task=classify_client_message. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  return runAuthenticatedAI(new Request(request.url, {
    method: 'POST', headers: request.headers,
    body: JSON.stringify({ ...body, task: 'classify_client_message', currentRequirements: body?.currentRequirements ?? body?.currentScope ?? [] }),
  }));
}
