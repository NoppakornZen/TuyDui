import { requireAuth } from '../../../src/lib/rate-limit';
import { requireProjectAccess } from '../../../src/lib/project-access';
import { createChangeReview, listProjectReviews } from '../../../src/services/review-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLASSIFICATIONS = new Set(['in_scope', 'modified', 'new_scope', 'ambiguous', '']);

function text(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const projectId = new URL(request.url).searchParams.get('projectId') ?? '';
  const access = await requireProjectAccess(auth.userId, projectId, false);
  if (access) return access;
  try {
    const reviews = await listProjectReviews(projectId);
    return Response.json({
      data: reviews.map((review) => ({
        id: review.id,
        changeId: review.change_id,
        token: review.public_token,
        status: review.status,
        summary: review.summary,
        priceThb: review.price_thb,
        decidedAt: review.decided_at,
        createdAt: review.created_at,
      })),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load client reviews.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: 'Invalid request body.' }, { status: 400 });

  const projectId = text(body.projectId, 64);
  if (!UUID.test(projectId)) return Response.json({ error: 'A valid projectId is required.' }, { status: 400 });
  const access = await requireProjectAccess(auth.userId, projectId, true);
  if (access) return access;

  const rawRequest = text(body.rawRequest);
  const clientExplanation = text(body.clientExplanation, 8000);
  if (!rawRequest) return Response.json({ error: 'rawRequest is required.' }, { status: 400 });
  if (!clientExplanation) return Response.json({ error: 'An explanation for the client is required.' }, { status: 400 });

  const classification = text(body.classification, 32);
  if (!CLASSIFICATIONS.has(classification)) return Response.json({ error: 'Unknown classification.' }, { status: 400 });

  let priceThb: number | null = null;
  if (body.priceThb !== undefined && body.priceThb !== null && body.priceThb !== '') {
    const parsed = Number(body.priceThb);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000_000) {
      return Response.json({ error: 'priceThb must be a positive number.' }, { status: 400 });
    }
    priceThb = Math.round(parsed * 100) / 100;
  }
  const newDeadline = text(body.newDeadline, 10);
  if (newDeadline && !/^\d{4}-\d{2}-\d{2}$/.test(newDeadline)) {
    return Response.json({ error: 'newDeadline must be a date (YYYY-MM-DD).' }, { status: 400 });
  }

  try {
    const review = await createChangeReview({
      projectId,
      changeId: text(body.changeId, 120),
      rawRequest,
      summary: text(body.summary, 300),
      classification,
      clientExplanation,
      priceThb,
      extraTimeText: text(body.extraTimeText, 200),
      newDeadline: newDeadline || null,
      createdBy: auth.userId,
    });
    return Response.json({ data: { id: review.id, changeId: review.change_id, token: review.public_token, status: review.status, path: `/review/${review.public_token}` } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create the client review.' }, { status: 503 });
  }
}
