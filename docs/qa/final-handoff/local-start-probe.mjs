// Reproduce the documented local start commands without credentials or live data.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createWriteStream, writeFileSync } from 'node:fs';

const evidence = new URL('./', import.meta.url);
const frontendPort = Number(process.env.HANDOFF_FRONTEND_PORT || 3000);
if (!Number.isInteger(frontendPort) || frontendPort < 1024 || frontendPort > 65535) throw new Error('Invalid probe port');
const children = [];
const logs = [];
const results = [];
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1',
  BACKEND_URL: 'http://127.0.0.1:4000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:4401',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-test-public-key',
  SUPABASE_URL: 'http://127.0.0.1:4401', SUPABASE_ANON_KEY: 'local-test-public-key',
  AI_PROVIDER: 'unconfigured', MAXPLUSAI_API_KEY: '', PORT: '4000', HOST: '127.0.0.1' };
for (const port of [frontendPort, 4000]) {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(port, '127.0.0.1', () => socket.close(resolve));
  });
}
async function waitFor(url) {
  const deadline = Date.now() + 55_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (response.ok) return response;
    } catch { /* Wait for the processes started by this probe only. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Local start timed out: ${url}`);
}
try {
  for (const name of ['dev:backend', 'dev:frontend']) {
    const stream = createWriteStream(new URL(name.replace(':', '-') + `-${frontendPort}.txt`, evidence));
    logs.push(stream);
    const childEnv = { ...env, PORT: name === 'dev:backend' ? '4000' : String(frontendPort) };
    const child = process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', `npm run ${name}`], { env: childEnv, windowsHide: true })
      : spawn('npm', ['run', name], { env: childEnv, detached: true });
    child.stdout.pipe(stream, { end: false });
    child.stderr.pipe(stream, { end: false });
    children.push(child);
  }
  for (const url of ['http://127.0.0.1:4000/api/health',
    `http://127.0.0.1:${frontendPort}/api/health`, `http://127.0.0.1:${frontendPort}/tutorial`]) {
    const response = await waitFor(url);
    const text = await response.text();
    let backendJson = null;
    if (url.endsWith('/api/health')) {
      try { backendJson = JSON.parse(text).service === 'tuydui-backend'; }
      catch { backendJson = false; }
    }
    results.push({ url, status: response.status, contentType: response.headers.get('content-type'), backendJson });
    if (backendJson === false) throw new Error('Local frontend URL returned HTML or non-backend JSON; possible port routing conflict');
  }
  const result = { checkedAt: new Date().toISOString(), status: 'PASS',
    commands: ['npm run dev:backend', 'npm run dev:frontend'],
    limits: 'Local process/proxy connectivity only. Fake public configuration; no authenticated/live Supabase or AI test.', results };
  writeFileSync(new URL(`local-start-${frontendPort}.json`, evidence), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} catch (error) {
  const result = { checkedAt: new Date().toISOString(), status: 'FAIL', error: error.message, results };
  writeFileSync(new URL(`local-start-${frontendPort}.json`, evidence), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  process.exitCode = 1;
} finally {
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
    else { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  }
  await Promise.all(logs.map(stream => new Promise(resolve => stream.end(resolve))));
}
