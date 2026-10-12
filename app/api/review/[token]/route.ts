import { decideReviewByToken, readReviewByToken } from '../../../../src/services/review-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public by design: the unguessable token in the URL is the only credential.
// The response carries exactly what the client approval page renders.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const found = await readReviewByToken(token);
    if (!found) return Response.json({ error: 'ไม่พบลิงก์นี้ หรือลิงก์ถูกยกเลิกแล้ว' }, { status: 404 });
    const { review, projectName, clientName } = found;
    return Response.json({
      data: {
        projectName,
        clientName,
        status: review.status,
        summary: review.summary,
        rawRequest: review.raw_request,
        explanation: review.client_explanation,
        priceThb: review.price_thb,
        extraTimeText: review.extra_time_text,
        newDeadline: review.new_deadline,
        clientNote: review.client_note,
        createdAt: review.created_at,
        decidedAt: review.decided_at,
      },
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load the review.' }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const decision = body?.decision === 'approved' || body?.decision === 'needs_discussion' ? body.decision : null;
  if (!decision) return Response.json({ error: 'decision must be approved or needs_discussion.' }, { status: 400 });
  const clientNote = typeof body?.clientNote === 'string' ? body.clientNote.trim().slice(0, 2000) : '';

  try {
    const result = await decideReviewByToken(token, decision, clientNote);
    if (!result) return Response.json({ error: 'ไม่พบลิงก์นี้ หรือลิงก์ถูกยกเลิกแล้ว' }, { status: 404 });
    if (result === 'already_decided') return Response.json({ error: 'คำขอนี้ได้รับการตอบกลับแล้ว การตัดสินใจเปลี่ยนไม่ได้', code: 'already_decided' }, { status: 409 });
    return Response.json({ data: { status: result.status, decidedAt: result.decided_at } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not record the decision.' }, { status: 503 });
  }
}
