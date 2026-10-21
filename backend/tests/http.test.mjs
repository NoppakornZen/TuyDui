import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import { createApiServer } from '../dist/http.js';

let server;
let base;
before(async () => {
  server = createApiServer(1024);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint works without provider credentials', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'tuydui-backend' });
});

test('unknown routes and unsupported methods return JSON errors', async () => {
  const missing = await fetch(`${base}/api/missing`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'Not found.');
  const method = await fetch(`${base}/api/documents`);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST');
});

test('all AI write endpoints require a bearer token for JSON and multipart', async () => {
  for (const path of ['/api/ai', '/api/documents', '/api/changes', '/api/ai/analyze-change']) {
    const json = await fetch(base + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(json.status, 401, path);
    assert.match((await json.json()).error, /Unauthorized/);
  }
  const form = new FormData();
  form.set('file', new File(['%PDF-test'], 'brief.pdf', { type: 'application/pdf' }));
  const response = await fetch(`${base}/api/documents`, { method: 'POST', body: form });
  assert.equal(response.status, 401);
});

test('rejects oversized declared and chunked bodies', async () => {
  const declared = await fetch(`${base}/api/ai`, { method: 'POST', body: 'x'.repeat(1025) });
  assert.equal(declared.status, 413);
  const chunked = await fetch(`${base}/api/changes`, {
    method: 'POST', duplex: 'half',
    body: (async function* () { yield 'x'.repeat(800); yield 'x'.repeat(800); })(),
  });
  assert.equal(chunked.status, 413);
  const healthy = await fetch(`${base}/api/health`);
  assert.equal(healthy.status, 200);
});
