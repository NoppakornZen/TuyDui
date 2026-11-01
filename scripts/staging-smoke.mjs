import assert from 'node:assert/strict';
const required = ['STAGING_FRONTEND_URL','STAGING_BACKEND_URL','STAGING_OWNER_TOKEN','STAGING_OUTSIDER_TOKEN','STAGING_PROJECT_ID'];
for (const name of required) if (!process.env[name]) throw new Error(`BLOCKED: ${name} is required; this check never silently skips live tests.`);
const front = new URL(process.env.STAGING_FRONTEND_URL);
const back = new URL(process.env.STAGING_BACKEND_URL);
for (const url of [front, back]) if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Staging origins must be HTTPS origins.');
if (front.hostname === 'tuydui.vercel.app') throw new Error('This workflow is staging-only.');
async function get(url, token) {
  return fetch(url, { headers: token ? {Authorization:`Bearer ${token}`} : {}, signal:AbortSignal.timeout(30_000) });
}
for (const origin of [front.origin, back.origin]) {
  const health = await get(origin+'/api/health'); assert.equal(health.status,200);
  assert.match(health.headers.get('content-type'),/application\/json/);
  assert.equal((await health.json()).service,'tuydui-backend');
}
for (const route of ['/','/login','/tutorial']) assert.equal((await get(front.origin+route)).status,200,route);
const path = `/api/workspace?projectId=${encodeURIComponent(process.env.STAGING_PROJECT_ID)}`;
assert.equal((await get(back.origin+path)).status,401);
assert.equal((await get(back.origin+path,'invalid')).status,401);
assert.equal((await get(back.origin+path,process.env.STAGING_OUTSIDER_TOKEN)).status,403);
const workspace = await get(back.origin+path,process.env.STAGING_OWNER_TOKEN);
assert.equal(workspace.status,200); const payload=await workspace.json();
assert.ok(payload.snapshot && payload.revision > 0,'Seeded test workspace is required');
const proxy=await get(front.origin+path,process.env.STAGING_OWNER_TOKEN);
assert.equal(proxy.status,200); assert.deepEqual(await proxy.json(),payload);
console.log('PASS: live JSON health, critical routes, caller auth, outsider rejection, seeded workspace and proxy compatibility. No data mutations performed.');
