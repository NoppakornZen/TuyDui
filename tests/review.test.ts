import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

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

const REVIEW = {
  id: 'r1', project_id: 'p1', change_id: 'change-1', public_token: 'tok',
  status: 'pending', raw_request: 'Add a membership system', summary: 'Membership system',
  classification: 'new_scope', client_explanation: 'This adds a new system.',
  price_thb: 8000, extra_time_text: '1 week', new_deadline: null,
  decided_at: null, client_note: '', created_at: '2026-10-08T00:00:00Z',
};

function publicFixture() {
  const state = { found: true as boolean, decided: 'ok' as 'ok' | 'already' | 'missing', decisions: [] as any[] };
  const route = moduleWithMocks('app/api/review/[token]/route.ts', {
    '../../../../src/services/review-store': {
      readReviewByToken: async () => state.found ? { review: REVIEW, projectName: 'Studio Site', clientName: 'Studio' } : null,
      decideReviewByToken: async (_token: string, decision: string, note: string) => {
        state.decisions.push({ decision, note });
        if (state.decided === 'missing') return null;
        if (state.decided === 'already') return 'already_decided';
        return { ...REVIEW, status: decision, decided_at: '2026-10-08T01:00:00Z' };
      },
    },
  });
  return { route, state };
}

const params = Promise.resolve({ token: 'tok' });

test('public review page data hides internal fields and 404s unknown tokens', async () => {
  const { route, state } = publicFixture();
  const ok = await route.GET(new Request('http://localhost/api/review/tok'), { params });
  assert.equal(ok.status, 200);
  const payload = await ok.json();
  assert.equal(payload.data.projectName, 'Studio Site');
  assert.equal(payload.data.priceThb, 8000);
  assert.equal(payload.data.projectId, undefined);
  assert.equal(payload.data.token, undefined);
  state.found = false;
  const missing = await route.GET(new Request('http://localhost/api/review/nope'), { params: Promise.resolve({ token: 'nope' }) });
  assert.equal(missing.status, 404);
});

test('client decision is recorded once and a second decision is rejected', async () => {
  const { route, state } = publicFixture();
  const bad = await route.POST(new Request('http://localhost/api/review/tok', { method: 'POST', body: JSON.stringify({ decision: 'hack' }) }), { params });
  assert.equal(bad.status, 400);
  assert.equal(state.decisions.length, 0);

  const ok = await route.POST(new Request('http://localhost/api/review/tok', { method: 'POST', body: JSON.stringify({ decision: 'approved', clientNote: 'go ahead' }) }), { params });
  assert.equal(ok.status, 200);
  assert.equal(state.decisions[0].decision, 'approved');
  assert.equal(state.decisions[0].note, 'go ahead');

  state.decided = 'already';
  const twice = await route.POST(new Request('http://localhost/api/review/tok', { method: 'POST', body: JSON.stringify({ decision: 'approved' }) }), { params });
  assert.equal(twice.status, 409);

  state.decided = 'missing';
  const gone = await route.POST(new Request('http://localhost/api/review/tok', { method: 'POST', body: JSON.stringify({ decision: 'approved' }) }), { params });
  assert.equal(gone.status, 404);
});

function publishFixture() {
  const state = { authed: true, access: true, created: [] as any[] };
  const route = moduleWithMocks('app/api/reviews/route.ts', {
    '../../../src/lib/rate-limit': {
      requireAuth: async (request: Request) => request.headers.get('authorization') === 'Bearer valid' ? { userId: 'pm-1', email: '' } : Response.json({ error: 'Unauthorized' }, { status: 401 }),
    },
    '../../../src/lib/project-access': {
      requireProjectAccess: async () => state.access ? null : Response.json({ error: 'Forbidden' }, { status: 403 }),
    },
    '../../../src/services/review-store': {
      createChangeReview: async (input: unknown) => {
        state.created.push(input);
        return { ...REVIEW, public_token: 'newtok', change_id: (input as any).changeId };
      },
      listProjectReviews: async () => [{ ...REVIEW }],
    },
  });
  return { route, state };
}

const PROJECT = '123e4567-e89b-42d3-a456-426614174000';

function authed(body: unknown, token = 'valid') {
  return new Request('http://localhost/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
}

test('publishing a client review requires auth, edit access, and an explanation', async () => {
  const { route, state } = publishFixture();
  assert.equal((await route.POST(authed({}, ''))).status, 401);
  state.access = false;
  assert.equal((await route.POST(authed({ projectId: PROJECT, rawRequest: 'x', clientExplanation: 'y' }))).status, 403);
  state.access = true;
  assert.equal((await route.POST(authed({ projectId: 'not-a-uuid', rawRequest: 'x', clientExplanation: 'y' }))).status, 400);
  assert.equal((await route.POST(authed({ projectId: PROJECT, rawRequest: 'x', clientExplanation: '' }))).status, 400);
  assert.equal((await route.POST(authed({ projectId: PROJECT, rawRequest: 'x', clientExplanation: 'y', priceThb: -5 }))).status, 400);
  assert.equal(state.created.length, 0);

  const ok = await route.POST(authed({ projectId: PROJECT, changeId: 'change-1', rawRequest: 'Add members', summary: 'Membership', classification: 'new_scope', clientExplanation: 'New system.', priceThb: 8000 }));
  assert.equal(ok.status, 200);
  const payload = await ok.json();
  assert.equal(payload.data.path, '/review/newtok');
  assert.equal(state.created.length, 1);
  assert.equal(state.created[0].createdBy, 'pm-1');
  assert.equal(state.created[0].priceThb, 8000);
});

test('listing reviews requires auth and returns status per change', async () => {
  const { route } = publishFixture();
  const denied = await route.GET(new Request(`http://localhost/api/reviews?projectId=${PROJECT}`));
  assert.equal(denied.status, 401);
  const ok = await route.GET(new Request(`http://localhost/api/reviews?projectId=${PROJECT}`, { headers: { authorization: 'Bearer valid' } }));
  assert.equal(ok.status, 200);
  const payload = await ok.json();
  assert.equal(payload.data[0].changeId, 'change-1');
  assert.equal(payload.data[0].status, 'pending');
});
