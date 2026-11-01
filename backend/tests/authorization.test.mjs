import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createApiServer } from '../dist/http.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
let authServer, api, base;
before(async () => {
  authServer = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const token = req.headers.authorization?.slice(7);
    if (req.url === '/auth/v1/user') {
      if (['invalid','expired'].includes(token)) { res.writeHead(401); res.end(JSON.stringify({ message: 'Invalid JWT', code: 'bad_jwt' })); return; }
      res.end(JSON.stringify({ id: A, email: 'test@example.test', aud: 'authenticated' })); return;
    }
    let text = ''; for await (const chunk of req) text += chunk;
    const body = text ? JSON.parse(text) : {};
    if (req.url?.includes('can_edit_project') || req.url?.includes('is_project_member')) {
      res.end(JSON.stringify(body.project_uuid === A && token !== 'viewer')); return;
    }
    if (req.url?.includes('reserve_ai_request')) {
      res.end(JSON.stringify({ allowed: token !== 'limited', resetIn: 60 })); return;
    }
    res.writeHead(404); res.end('{}');
  });
  authServer.listen(0, '127.0.0.1'); await once(authServer, 'listening');
  process.env.SUPABASE_URL = `http://127.0.0.1:${authServer.address().port}`;
  process.env.SUPABASE_ANON_KEY = 'local-test-public-key';
  delete process.env.MAXPLUSAI_API_KEY; process.env.AI_PROVIDER = 'unconfigured';
  api = createApiServer(); api.listen(0, '127.0.0.1'); await once(api, 'listening');
  base = `http://127.0.0.1:${api.address().port}`;
});
after(async () => { for (const server of [api, authServer]) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); } });
const post = (path, body, token = 'owner') => fetch(base + path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('invalid and expired tokens are rejected at every AI write route', async () => {
  for (const token of ['invalid','expired']) for (const path of ['/api/ai','/api/documents','/api/changes','/api/ai/analyze-change']) {
    assert.equal((await post(path, {}, token)).status, 401, `${token}: ${path}`);
  }
});
test('every project entry point rejects another project before provider/PDF/persistence calls', async () => {
  assert.equal((await post('/api/ai', { task: 'extract_requirements', projectId: B, text: 'Client brief' })).status, 403);
  assert.equal((await post('/api/changes', { projectId: B, text: 'Change' })).status, 403);
  assert.equal((await post('/api/ai/analyze-change', { projectId: B, rawRequest: 'Change' })).status, 403);
  const form = new FormData(); form.set('projectId', B); form.set('file', new File(['%PDF-test'],'brief.pdf'));
  assert.equal((await fetch(base+'/api/documents', { method:'POST', headers: { Authorization:'Bearer owner' }, body: form })).status, 403);
  assert.equal((await fetch(base+`/api/workspace?projectId=${B}`, { headers:{ Authorization:'Bearer owner' } })).status, 403);
  assert.equal((await fetch(base+'/api/workspace', { method:'PUT', headers:{ Authorization:'Bearer owner','Content-Type':'application/json' }, body:JSON.stringify({projectId:B, revision:0,snapshot:{}}) })).status, 403);
});
test('authorized request reaches explicit unconfigured-provider failure; invalid IDs and viewer processing fail', async () => {
  assert.equal((await post('/api/ai', { task:'extract_requirements', projectId:A,text:'Client brief' })).status,503);
  assert.equal((await post('/api/ai', { task:'extract_requirements', projectId:'../../other',text:'Client brief' })).status,400);
  assert.equal((await post('/api/ai', { task:'extract_requirements', projectId:A,text:'Client brief' }, 'viewer')).status,403);
  assert.equal((await post('/api/ai', { task:'draft_change_explanation', change:{projectId:B} })).status,403);
  assert.equal((await post('/api/ai', { task:'extract_requirements', projectId:A,document:{projectId:B},text:'Client brief' })).status,400);
});
test('persistent quota returns Retry-After and AI diagnostics are protected', async () => {
  const limited = await post('/api/ai', { task:'extract_requirements',projectId:A,text:'Brief' }, 'limited');
  assert.equal(limited.status,429); assert.equal(limited.headers.get('retry-after'),'60');
  assert.equal((await fetch(base+'/api/ai?usage=1')).status,401);
  assert.equal((await fetch(base+'/api/ai?live=1', { headers:{Authorization:'Bearer owner'} })).status,403);
  const status = await fetch(base+'/api/ai', { headers:{Authorization:'Bearer owner'} });
  assert.equal(status.status,200); assert.equal((await status.json()).configured,false);
});
