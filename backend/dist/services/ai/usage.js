import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const FILE = path.join(process.cwd(), 'data', 'ai-usage.jsonl');
export async function recordAIUsage(event) {
    try {
        await mkdir(path.dirname(FILE), { recursive: true });
        await appendFile(FILE, `${JSON.stringify(event)}\n`, 'utf8');
    }
    catch (error) {
        const code = error.code;
        if (code !== 'EROFS' && code !== 'EPERM')
            throw error;
    }
}
export async function readAIUsage() {
    try {
        const raw = await readFile(FILE, 'utf8');
        return raw.split('\n').filter(Boolean).map((line) => JSON.parse(line));
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return [];
        throw error;
    }
}
export function summarizeAIUsage(events) {
    const byTask = {};
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
