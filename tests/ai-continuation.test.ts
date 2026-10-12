import assert from 'node:assert/strict';
import test from 'node:test';
import { MaxPlusAIProvider } from '../src/services/ai/maxplus';

const config = { apiKey: 'ccsk-test', model: 'test-model', messagesUrl: 'https://example.test/messages', modelsUrl: 'https://example.test/models' };

function reply(text: string, stopReason: string, round: number) {
  return new Response(JSON.stringify({
    id: `msg-${round}`,
    model: 'test-model',
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
    usage: { input_tokens: 10, output_tokens: 5 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('a reply cut off at max_tokens is continued until the JSON completes', async () => {
  const full = JSON.stringify({
    requirements: [
      { title: 'Login page', description: 'Email and password sign in.', category: 'Auth', clarity: 'clear', page: 1, quote: 'sign in', suggestedRoles: [] },
      { title: 'Dashboard', description: 'Overview of all projects.', category: 'Core', clarity: 'clear', page: 2, quote: 'dashboard', suggestedRoles: [] },
    ],
  });
  const cut = full.indexOf('"Dashboard"');
  const chunks = [full.slice(0, cut), full.slice(cut, cut + 10), full.slice(cut + 10)];
  const sent: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    const round = sent.length - 1;
    return reply(chunks[round], round < chunks.length - 1 ? 'max_tokens' : 'end_turn', round);
  }) as typeof fetch;
  try {
    const provider = new MaxPlusAIProvider(config);
    const result = await provider.extractRequirements({
      userId: 'user-1', projectId: 'project-1',
      document: { id: 'DOC-1', projectId: 'project-1', name: 'brief.pdf', version: 1, sourceType: 'brief', uploadedAt: '', processingStatus: 'ready' },
      text: 'a long brief',
    });
    assert.equal(sent.length, 3, 'expected the truncated reply to be continued twice');
    assert.equal(result.data.length, 2);
    assert.equal(result.data[1].title, 'Dashboard');
    assert.deepEqual(sent[1].messages.slice(-2).map((message) => message.role), ['assistant', 'user']);
    assert.equal(sent[1].messages.at(-2)?.content, chunks[0], 'the continuation replays the partial reply');
    assert.equal(result.usage?.outputTokens, 15, 'usage sums every round');
  } finally { globalThis.fetch = originalFetch; }
});

test('a reply that ends normally is never continued', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return reply('{"requirements":[{"title":"A","description":"B","clarity":"clear","quote":"q"}]}', 'end_turn', 0);
  }) as typeof fetch;
  try {
    const provider = new MaxPlusAIProvider(config);
    const result = await provider.extractRequirements({
      userId: 'user-1', projectId: 'project-1',
      document: { id: 'DOC-1', projectId: 'project-1', name: 'brief.pdf', version: 1, sourceType: 'brief', uploadedAt: '', processingStatus: 'ready' },
      text: 'a short brief',
    });
    assert.equal(calls, 1);
    assert.equal(result.data.length, 1);
  } finally { globalThis.fetch = originalFetch; }
});
