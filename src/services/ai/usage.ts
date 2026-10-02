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

export async function recordAIUsage(event: AIUsageEvent): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await appendFile(FILE, `${JSON.stringify(event)}\n`, 'utf8');
}

export async function readAIUsage(): Promise<AIUsageEvent[]> {
  try {
    const raw = await readFile(FILE, 'utf8');
    return raw.split('\n').filter(Boolean).map((line) => JSON.parse(line) as AIUsageEvent);
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
