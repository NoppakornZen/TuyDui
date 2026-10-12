import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AITaskType } from './contract';

export interface AIUsageEvent {
  id: string;
  userId: string | null;
  projectId: string | null;
  provider: string;
  model: string;
  taskType: AITaskType;
  inputTokens: number;
  outputTokens: number;
  providerCost: number | null;
  requestId: string | null;
  success: boolean;
  errorCode: string | null;
  createdAt: string;
}

const FILE = path.join(process.cwd(), 'data', 'ai-usage.jsonl');

type UsageRow = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  task_type: string;
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  provider_cost: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

function rowToEvent(row: UsageRow): AIUsageEvent {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    provider: row.provider,
    model: row.model,
    taskType: row.task_type as AITaskType,
    inputTokens: row.input_tokens ?? 0,
    outputTokens: row.output_tokens ?? 0,
    providerCost: row.provider_cost,
    requestId: null,
    success: row.success,
    errorCode: row.error_message,
    createdAt: row.created_at,
  };
}

async function fileFallback(event: AIUsageEvent): Promise<void> {
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await appendFile(FILE, `${JSON.stringify(event)}\n`, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EROFS' && code !== 'EPERM') throw error;
  }
}

// Usage lives in Postgres so it survives serverless instances. The local file
// is only a fallback for development without Supabase credentials.
export async function recordAIUsage(event: AIUsageEvent): Promise<void> {
  try {
    const { supabaseAdmin } = await import('../../lib/supabase-admin');
    if (event.userId) {
      // The quota row written before the call becomes the detailed record,
      // so one request never counts twice against the quota.
      const { data: quotaRow } = await supabaseAdmin
        .from('ai_usage_events')
        .select('id')
        .eq('user_id', event.userId)
        .eq('task_type', event.taskType)
        .eq('model', 'quota')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (quotaRow) {
        const { error } = await supabaseAdmin.from('ai_usage_events').update({
          project_id: event.projectId || null,
          provider: event.provider,
          model: event.model,
          input_tokens: event.inputTokens,
          output_tokens: event.outputTokens,
          provider_cost: event.providerCost,
          success: event.success,
          error_message: event.errorCode,
        }).eq('id', quotaRow.id);
        if (!error) return;
        console.warn('AI usage update failed:', error.message);
      }
    }
    const { error } = await supabaseAdmin.from('ai_usage_events').insert({
      user_id: event.userId,
      project_id: event.projectId || null,
      task_type: event.taskType,
      provider: event.provider,
      model: event.model,
      input_tokens: event.inputTokens,
      output_tokens: event.outputTokens,
      provider_cost: event.providerCost,
      success: event.success,
      error_message: event.errorCode,
    });
    if (error) {
      console.warn('AI usage insert failed:', error.message);
      await fileFallback(event);
    }
  } catch (error) {
    console.warn('AI usage store unavailable, using the local file:', error);
    await fileFallback(event);
  }
}

export async function readAIUsage(userId?: string): Promise<AIUsageEvent[]> {
  try {
    const { supabaseAdmin } = await import('../../lib/supabase-admin');
    let query = supabaseAdmin.from('ai_usage_events').select('*').order('created_at', { ascending: false }).limit(1000);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as UsageRow[]).map(rowToEvent);
  } catch {
    // Development fallback: read the local file.
  }
  try {
    const raw = await readFile(FILE, 'utf8');
    const events = raw.split('\n').filter(Boolean).map((line) => JSON.parse(line) as AIUsageEvent);
    return userId ? events.filter((event) => event.userId === userId) : events;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export function summarizeAIUsage(events: AIUsageEvent[]) {
  const byTask: Record<string, { calls: number; inputTokens: number; outputTokens: number; providerCost: number }> = {};
  let providerCost = 0;
  let knownCostCalls = 0;
  for (const event of events) {
    const row = byTask[event.taskType] ?? { calls: 0, inputTokens: 0, outputTokens: 0, providerCost: 0 };
    row.calls += 1;
    row.inputTokens += event.inputTokens;
    row.outputTokens += event.outputTokens;
    if (event.providerCost != null) {
      row.providerCost += event.providerCost;
      providerCost += event.providerCost;
      knownCostCalls += 1;
    }
    byTask[event.taskType] = row;
  }
  return {
    calls: events.length,
    failures: events.filter((event) => !event.success).length,
    inputTokens: events.reduce((sum, event) => sum + event.inputTokens, 0),
    outputTokens: events.reduce((sum, event) => sum + event.outputTokens, 0),
    providerCostUsd: knownCostCalls === 0 ? null : providerCost,
    byTask,
  };
}
