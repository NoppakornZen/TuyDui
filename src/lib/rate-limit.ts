import { supabaseAdmin } from './supabase-admin';

const AI_QUOTA = {
  FREE: { requests_per_day: 10, requests_per_hour: 5 },
  PRO: { requests_per_day: 100, requests_per_hour: 20 },
} as const;

type Plan = keyof typeof AI_QUOTA;

async function userPlan(userId: string): Promise<Plan> {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('plan').eq('user_id', userId).maybeSingle();
    if (!error && data?.plan === 'PRO') return 'PRO';
  } catch { /* A missing profile row or column means the free plan. */ }
  return 'FREE';
}

export async function checkRateLimit(userId: string, plan?: Plan): Promise<{ allowed: boolean; remaining: number; resetIn?: number }> {
  const quota = AI_QUOTA[plan ?? await userPlan(userId)];
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  let timestamps: number[];
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_usage_events')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(now - oneDay).toISOString())
      .order('created_at', { ascending: true });
    if (error) throw error;
    timestamps = (data ?? []).map((row) => new Date(row.created_at).getTime()).filter((value) => Number.isFinite(value));
  } catch (error) {
    // A quota store outage must not lock out paying users; log and allow.
    console.error('Quota check failed; allowing the request:', error);
    return { allowed: true, remaining: quota.requests_per_hour };
  }

  const hourly = timestamps.filter((value) => now - value < oneHour);
  if (hourly.length >= quota.requests_per_hour) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((hourly[0] + oneHour - now) / 1000) };
  }
  if (timestamps.length >= quota.requests_per_day) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((timestamps[0] + oneDay - now) / 1000) };
  }
  return { allowed: true, remaining: Math.min(quota.requests_per_hour - hourly.length, quota.requests_per_day - timestamps.length) };
}

// Written before the AI call so abandoned and failed requests still count.
// recordAIUsage later upgrades this row with token counts and the real model.
export async function recordUsage(userId: string, task: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('ai_usage_events').insert({
      user_id: userId,
      task_type: task,
      provider: 'server',
      model: 'quota',
    });
    if (error) console.warn('Usage record failed:', error.message);
  } catch (error) {
    console.warn('Usage record failed:', error);
  }
}

export async function requireAuth(request: Request): Promise<{ userId: string; email: string } | Response> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Please login first.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return {
    userId: user.id,
    email: user.email || ''
  };
}
