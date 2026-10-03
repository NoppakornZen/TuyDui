import { getSession } from './auth';
import { supabaseAdmin } from './supabase';

const AI_QUOTA = {
  FREE: { requests_per_day: 10, requests_per_hour: 5 },
  PRO: { requests_per_day: 100, requests_per_hour: 20 },
};

interface UsageRecord {
  user_id: string;
  timestamp: number;
  task: string;
}

// In-memory store for demo (will move to database later)
const usageStore = new Map<string, UsageRecord[]>();

export async function checkRateLimit(userId: string, plan: 'FREE' | 'PRO' = 'FREE'): Promise<{ allowed: boolean; remaining: number; resetIn?: number }> {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  // Get user's usage
  let usage = usageStore.get(userId) || [];

  // Clean old records
  usage = usage.filter(r => now - r.timestamp < oneDay);
  usageStore.set(userId, usage);

  const hourlyUsage = usage.filter(r => now - r.timestamp < oneHour);
  const dailyUsage = usage;

  const quota = AI_QUOTA[plan];

  if (hourlyUsage.length >= quota.requests_per_hour) {
    const oldestInHour = Math.min(...hourlyUsage.map(r => r.timestamp));
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((oldestInHour + oneHour - now) / 1000)
    };
  }

  if (dailyUsage.length >= quota.requests_per_day) {
    const oldestInDay = Math.min(...dailyUsage.map(r => r.timestamp));
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((oldestInDay + oneDay - now) / 1000)
    };
  }

  return {
    allowed: true,
    remaining: Math.min(
      quota.requests_per_hour - hourlyUsage.length,
      quota.requests_per_day - dailyUsage.length
    )
  };
}

export async function recordUsage(userId: string, task: string): Promise<void> {
  const usage = usageStore.get(userId) || [];
  usage.push({
    user_id: userId,
    timestamp: Date.now(),
    task
  });
  usageStore.set(userId, usage);
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
