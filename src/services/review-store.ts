import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../lib/supabase-admin';

export type ChangeReviewRecord = {
  id: string;
  project_id: string;
  change_id: string;
  public_token: string;
  status: 'pending' | 'approved' | 'needs_discussion';
  raw_request: string;
  summary: string;
  classification: string;
  client_explanation: string;
  price_thb: number | null;
  extra_time_text: string;
  new_deadline: string | null;
  decided_at: string | null;
  client_note: string;
  created_at: string;
};

export type CreateReviewInput = {
  projectId: string;
  changeId: string;
  rawRequest: string;
  summary: string;
  classification: string;
  clientExplanation: string;
  priceThb: number | null;
  extraTimeText: string;
  newDeadline: string | null;
  createdBy: string;
};

/** 192 bits of entropy; the link is the only capability a client ever gets. */
function generateToken() {
  return randomBytes(24).toString('base64url');
}

export async function createChangeReview(input: CreateReviewInput): Promise<ChangeReviewRecord> {
  const { data, error } = await supabaseAdmin
    .from('change_reviews')
    .insert({
      project_id: input.projectId,
      change_id: input.changeId,
      public_token: generateToken(),
      raw_request: input.rawRequest,
      summary: input.summary,
      classification: input.classification,
      client_explanation: input.clientExplanation,
      price_thb: input.priceThb,
      extra_time_text: input.extraTimeText,
      new_deadline: input.newDeadline,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || 'Could not create the client review.');
  return data as ChangeReviewRecord;
}

export async function listProjectReviews(projectId: string): Promise<ChangeReviewRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('change_reviews')
    .select('id, project_id, change_id, public_token, status, summary, price_thb, decided_at, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Could not load client reviews.');
  return (data ?? []) as ChangeReviewRecord[];
}

export async function readReviewByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('change_reviews')
    .select('*, projects(name, client_name)')
    .eq('public_token', token)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not load the review.');
  if (!data) return null;
  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  const { projects: _omit, ...review } = data as Record<string, unknown>;
  return { review: review as unknown as ChangeReviewRecord, projectName: String(project?.name ?? ''), clientName: String(project?.client_name ?? '') };
}

export async function decideReviewByToken(token: string, decision: 'approved' | 'needs_discussion', clientNote: string): Promise<ChangeReviewRecord | 'already_decided' | null> {
  const { data, error } = await supabaseAdmin
    .from('change_reviews')
    .update({ status: decision, client_note: clientNote, decided_at: new Date().toISOString() })
    .eq('public_token', token)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not record the decision.');
  if (!data) {
    const existing = await readReviewByToken(token);
    return existing ? 'already_decided' : null;
  }
  const review = data as ChangeReviewRecord;
  await supabaseAdmin.from('audit_events').insert({
    project_id: review.project_id,
    actor_id: null,
    event_type: 'client_review_decided',
    payload: { reviewId: review.id, changeId: review.change_id, decision },
  });
  return review;
}
