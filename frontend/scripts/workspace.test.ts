import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WorkspaceRepository } from '../src/lib/workspace-repository';
import type { WorkspaceState } from '../src/lib/workspace-state';

const initial: WorkspaceState = { nodes: [{ id: 'root', kind: 'project', title: 'Real project', owner: 'Owner', requirements: 0, x: 0, y: 0, requirementIds: [] }], edges: [], requirements: [], changes: [], history: [], nodeNotes: {}, documents: [], zoom: 1, pan: { x: 0, y: 0 }, baselineConfirmed: false };
function storage() { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k,v); } }; }

test('imports legacy data once, serializes saves, and reads persisted data after a new login', async () => {
  const local = storage(); local.setItem('briefdiff-project-project-a', JSON.stringify(initial));
  let revision = 0; let snapshot: WorkspaceState | null = null;
  const transport = async (_path: string, init?: RequestInit) => {
    if (!init) return Response.json({ snapshot, revision });
    const body = JSON.parse(String(init.body));
    assert.equal(body.revision, revision); revision++; snapshot = body.snapshot;
    return Response.json({ revision });
  };
  const repo = new WorkspaceRepository('project-a', 'user-a', transport, local);
  assert.deepEqual((await repo.load()).snapshot, initial);
  await Promise.all([repo.save(initial), repo.save({ ...initial, history: ['Changed'] })]);
  assert.equal(revision, 2);
  const anotherDevice = new WorkspaceRepository('project-a', 'user-a', transport, storage());
  assert.deepEqual((await anotherDevice.load()).snapshot?.history, ['Changed']);
});

test('remote is authoritative, local data archived, conflict retained without overwrite', async () => {
  const local = storage(); local.setItem('briefdiff-project-a', JSON.stringify({ ...initial, history: ['Offline edit'] }));
  let saves = 0;
  const repo = new WorkspaceRepository('a', 'user', async (_path, init) => {
    if (!init) return Response.json({ snapshot: initial, revision: 7 });
    saves++; return Response.json({ error: 'Workspace changed on another device.' }, { status: 409 });
  }, local);
  const loaded = await repo.load();
  assert.deepEqual(loaded.snapshot, initial);
  assert.match(loaded.recovery!, /Offline edit/);
  await assert.rejects(repo.save({ ...initial, history: ['New edit'] }), /another device/);
  await assert.rejects(repo.save({ ...initial, history: ['Still editing'] }), /sync stopped/);
  assert.equal(saves, 1);
  assert.match(local.getItem(repo.localKey)!, /Still editing/);
  assert.match(local.getItem(repo.recoveryKey)!, /Offline edit/);
});

test('corrupt local data is never erased and backend failure never initializes an empty replacement', async () => {
  const local = storage(); local.setItem('briefdiff-project-a', '{corrupt');
  const repo = new WorkspaceRepository('a', 'user', async () => Response.json({ snapshot: null, revision: 0 }), local);
  await assert.rejects(repo.load(), /recovery/);
  assert.equal(local.getItem(repo.localKey), '{corrupt');
  const unavailable = new WorkspaceRepository('a', 'user', async () => Response.json({}, { status: 503 }), local);
  await assert.rejects(unavailable.load(), /Cannot load/);
  assert.equal(local.getItem(repo.localKey), '{corrupt');
});
test('JSONB object key ordering does not cause redundant saves or recovery archives',async()=>{
  const local=storage();local.setItem('briefdiff-project-a',JSON.stringify(initial));
  const reordered=Object.fromEntries(Object.entries(initial).reverse());let saves=0;
  const repo=new WorkspaceRepository('a','user',async(_path,init)=>{
    if(init){saves++;return Response.json({revision:2});}
    return Response.json({snapshot:reordered,revision:1});
  },local);
  assert.equal((await repo.load()).recovery,null);
  await repo.save(initial);assert.equal(saves,0);
});
