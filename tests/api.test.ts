import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { emptyWorkspace, requirementForAI } from '../src/domain/workspace';

function moduleWithMocks(file: string, imports: Record<string, unknown>) {
  const source = readFileSync(file, 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} as Record<string, (...args: any[]) => any> };
  const requireMock = (id: string) => {
    if (Object.hasOwn(imports, id)) return imports[id];
    throw new Error(`Unexpected dependency: ${id}`);
  };
  new Function('require', 'module', 'exports', javascript)(requireMock, module, module.exports);
  return module.exports;
}

function apiFixture() {
  const scope = emptyWorkspace();
  scope.requirements.push({ id: 'SAVED', title: 'Saved scope', description: 'Saved approved requirement', area: 'General', owner: 'Unassigned', source: 'Brief', status: 'Approved' });
  const state = { allowed: true, access: true, confirmed: true, calls: [] as any[], usage: [] as string[] };
  const limiter = {
    requireAuth: async (request: Request) => request.headers.get('authorization') === 'Bearer valid' ? { userId: 'real-user', email: '' } : Response.json({ error: 'Unauthorized' }, { status: 401 }),
    checkRateLimit: async () => ({ allowed: state.allowed, resetIn: 60 }),
    recordUsage: async (userId: string) => { state.usage.push(userId); },
  };
  const access = { requireProjectAccess: async () => state.access ? null : Response.json({ error: 'Forbidden' }, { status: 403 }) };
  const approved = { readApprovedWorkspace: async () => state.confirmed ? { scope, version: 7 } : Response.json({ error: 'Confirm baseline' }, { status: 409 }) };
  const ai = {
    AIRequestError: class extends Error {}, MaxPlusAIProvider: class {}, aiStatus: () => ({ configured: true }),
    createAIProvider: () => ({
      reviewChange: async (input: unknown) => { state.calls.push(input); return { data: { classification: 'in_scope', edits: [] }, usage: null }; },
      classifyClientChange: async (input: unknown) => { state.calls.push(input); return { data: { classification: 'in_scope' }, usage: null }; },
      extractRequirements: async (input: unknown) => { state.calls.push(input); return { data: [], usage: null }; },
    }),
  };
  const files = { storeProjectPdf: async () => ({ document: { id: 'pdf', name: 'brief.pdf', version: 2, pageCount: 1, uploadedAt: '' }, text: 'PDF text', storagePath: 'project/pdf.pdf' }) };
  const main = moduleWithMocks('app/api/ai/route.ts', {
    '../../../src/services/ai/maxplus': ai,
    '../../../src/services/ai/usage': { readAIUsage: async () => [], summarizeAIUsage: () => ({}) },
    '../../../src/lib/rate-limit': limiter,
    '../../../src/lib/project-access': access,
    '../../../src/lib/approved-scope': approved,
    '../../../src/domain/workspace': { requirementForAI },
  });
  const changes = moduleWithMocks('app/api/changes/route.ts', {
    '../../../src/services/ai/maxplus': ai,
    '../../../src/services/document-store': files,
    '../../../src/lib/rate-limit': limiter,
    '../../../src/lib/project-access': access,
    '../../../src/lib/approved-scope': approved,
    '../../../src/domain/workspace': { requirementForAI },
  });
  const documents = moduleWithMocks('app/api/documents/route.ts', {
    '../../../src/services/ai/maxplus': ai,
    '../../../src/services/document-store': files,
    '../../../src/lib/rate-limit': limiter,
    '../../../src/lib/project-access': access,
  });
  const legacy = moduleWithMocks('app/api/ai/analyze-change/route.ts', { '../route': main });
  return { state, main, changes, documents, legacy };
}

function request(body: unknown, token = 'valid') {
  return new Request('http://localhost/api/test', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
}

test('all AI POST routes reject anonymous and expired sessions before invoking AI', async () => {
  const fixture = apiFixture();
  for (const route of [fixture.main, fixture.changes, fixture.documents, fixture.legacy]) {
    for (const token of ['', 'expired']) {
      assert.equal((await route.POST(request({ task: 'classify_client_message', projectId: 'project', rawRequest: 'Change', text: 'Change' }, token))).status, 401);
    }
  }
  assert.equal(fixture.state.calls.length, 0);
  assert.equal(fixture.state.usage.length, 0);
});

test('legacy route observes the same quota and project authorization as the main route', async () => {
  const fixture = apiFixture();
  fixture.state.allowed = false;
  assert.equal((await fixture.legacy.POST(request({ rawRequest: 'Change', projectId: 'project' }))).status, 429);
  fixture.state.allowed = true; fixture.state.access = false;
  assert.equal((await fixture.legacy.POST(request({ rawRequest: 'Change', projectId: 'project' }))).status, 403);
  assert.equal(fixture.state.calls.length, 0);
});

test('JSON and PDF changes use the saved approved scope and the authenticated user', async () => {
  const fixture = apiFixture();
  const response = await fixture.changes.POST(request({ projectId: 'project', text: 'New request', userId: 'spoofed', requirements: [{ id: 'SPOOFED' }] }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).workspaceVersion, 7);
  const form = new FormData();
  form.set('context', JSON.stringify({ projectId: 'project', text: 'Extra note' }));
  form.set('file', new File(['%PDF-stub'], 'change.pdf', { type: 'application/pdf' }));
  assert.equal((await fixture.changes.POST(new Request('http://localhost/api/changes', { method: 'POST', headers: { authorization: 'Bearer valid' }, body: form }))).status, 200);
  assert.equal(fixture.state.calls.length, 2);
  for (const call of fixture.state.calls) {
    assert.equal(call.userId, 'real-user');
    assert.equal(call.currentRequirements[0].id, 'SAVED');
    assert.equal(call.currentRequirements[0].approved, true);
  }
  assert.equal(fixture.state.calls[1].rawRequest, 'PDF text\n\nExtra note');
  fixture.state.confirmed = false;
  assert.equal((await fixture.changes.POST(request({ projectId: 'project', text: 'New request' }))).status, 409);
});

test('legacy classification ignores spoofed scope and user ids', async () => {
  const fixture = apiFixture();
  const response = await fixture.legacy.POST(request({ projectId: 'project', rawRequest: 'Change', userId: 'spoofed', currentScope: [{ id: 'SPOOFED' }] }));
  assert.equal(response.status, 200);
  assert.equal(fixture.state.calls[0].userId, 'real-user');
  assert.equal(fixture.state.calls[0].currentRequirements[0].id, 'SAVED');
});

test('authenticated fetch attaches the bearer token for both JSON and FormData', async () => {
  const originalFetch = globalThis.fetch;
  let token: string | null = 'valid';
  const requests: RequestInit[] = [];
  globalThis.fetch = (async (_input: unknown, init: RequestInit) => { requests.push(init); return new Response('{}'); }) as typeof fetch;
  try {
    const client = moduleWithMocks('src/lib/authenticated-fetch.ts', { './supabase': { supabase: { auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null }, error: null }) } } } });
    await client.authenticatedFetch('/api/changes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    await client.authenticatedFetch('/api/changes', { method: 'POST', body: new FormData() });
    assert.equal(new Headers(requests[0].headers).get('authorization'), 'Bearer valid');
    assert.equal(new Headers(requests[0].headers).get('content-type'), 'application/json');
    assert.equal(new Headers(requests[1].headers).get('authorization'), 'Bearer valid');
    assert.equal(new Headers(requests[1].headers).get('content-type'), null);
    token = null;
    await assert.rejects(client.authenticatedFetch('/api/changes'), /sign in again/);
    assert.equal(requests.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});
