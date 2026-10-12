import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { applyReviewToScope, emptyWorkspace, mergeAppliedScope } from '../src/domain/workspace';
import { WorkspaceSaveQueue } from '../src/services/workspace-store';

const owner = '11111111-1111-4111-8111-111111111111';
const editor = '22222222-2222-4222-8222-222222222222';
const viewer = '33333333-3333-4333-8333-333333333333';
const outsider = '44444444-4444-4444-8444-444444444444';
const project = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const workspace = emptyWorkspace('Test project');
workspace.requirements.push({ id: 'REQ-1', title: 'Login', description: 'Email login', area: 'Auth', owner: 'Unassigned', source: 'Brief', status: 'Review' });
workspace.nodes.push({ id: 'auth', title: 'Login', kind: 'work_area', owner: 'Unassigned', requirements: 1, requirementIds: ['REQ-1'], x: 100, y: 400 });
workspace.edges.push({ id: 'edge-auth', from: 'root', to: 'auth' });

async function database() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;
    grant usage on schema auth, public, storage to authenticated, anon, service_role;
    grant execute on function auth.uid() to authenticated, anon, service_role;
    alter default privileges in schema public grant all on tables to authenticated, anon, service_role;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
    grant all on storage.objects to authenticated, anon, service_role;
    insert into auth.users(id) values ('${owner}'), ('${editor}'), ('${viewer}'), ('${outsider}');
  `);
  for (const name of ['001_initial', '002_collaboration', '003_rls_policies', '004_profiles', '005_workspace_persistence']) {
    const sql = (await readFile(`supabase/migrations/${name}.sql`, 'utf8')).replace('create extension if not exists pgcrypto;', '');
    await db.exec(sql);
  }
  await db.exec(`insert into public.projects(id, owner_id, name, client_name) values ('${project}', '${owner}', 'Test project', 'Test client');
    insert into public.project_members(project_id, user_id, role, accepted_at) values ('${project}', '${editor}', 'editor', now()), ('${project}', '${viewer}', 'viewer', now());`);
  return db;
}

async function asUser(db: PGlite, id: string) {
  await db.exec('reset role; set role authenticated;');
  await db.query("select set_config('test.user_id', $1, false)", [id]);
}

test('database persistence, permissions, immutable baseline, approved scope and conflicts', async () => {
  const db = await database();
  try {
    // Migration is repeatable after the initial installation.
    await db.exec(await readFile('supabase/migrations/005_workspace_persistence.sql', 'utf8'));
    await asUser(db, owner);
    const save = await db.query<{ version: number }>('select version from public.save_project_workspace($1, $2, 0)', [project, workspace]);
    assert.equal(save.rows[0].version, 1);
    await assert.rejects(db.query('select public.save_project_workspace($1, $2, 0)', [project, workspace]), /WORKSPACE_CONFLICT/);
    const confirmed = await db.query<{ version: number }>('select version from public.confirm_project_baseline($1, 1)', [project]);
    assert.equal(confirmed.rows[0].version, 2);
    await db.query('select public.confirm_project_baseline($1, 2)', [project]);
    const baseline = await db.query<{ snapshot: typeof workspace }>('select snapshot from public.baseline_snapshots where project_id = $1', [project]);
    assert.equal(baseline.rows.length, 1);
    assert.equal(baseline.rows[0].snapshot.requirements[0].description, 'Email login');
    await assert.rejects(db.query("update public.projects set baseline_confirmed_at = null where id = $1", [project]), /confirm_project_baseline/);
    await assert.rejects(db.query("update public.baseline_snapshots set snapshot = '{}' where project_id = $1", [project]), /permission denied/);
    await assert.rejects(db.query('delete from public.baseline_snapshots where project_id = $1', [project]), /permission denied/);

    await asUser(db, editor);
    const draft = structuredClone(workspace);
    draft.requirements[0].description = 'Unapproved draft login';
    await db.query('select public.save_project_workspace($1, $2, 2)', [project, draft]);
    const saved = await db.query<{ snapshot: typeof workspace; approved_scope: typeof workspace }>('select snapshot, approved_scope from public.project_workspaces where project_id = $1', [project]);
    assert.equal(saved.rows[0].snapshot.requirements[0].description, 'Unapproved draft login');
    assert.equal(saved.rows[0].approved_scope.requirements[0].description, 'Email login');
    await assert.rejects(db.query('select public.confirm_project_baseline($1, 3)', [project]), /WORKSPACE_FORBIDDEN/);

    await asUser(db, viewer);
    assert.equal((await db.query('select * from public.project_workspaces where project_id = $1', [project])).rows.length, 1);
    await assert.rejects(db.query('select public.save_project_workspace($1, $2, 3)', [project, draft]), /WORKSPACE_FORBIDDEN/);
    await assert.rejects(db.query('select public.approve_project_change($1, $2, $3, $4, 3)', [project, draft, workspace, {}]), /WORKSPACE_FORBIDDEN/);
    await asUser(db, outsider);
    assert.equal((await db.query('select * from public.project_workspaces where project_id = $1', [project])).rows.length, 0);
    await assert.rejects(db.query('select public.save_project_workspace($1, $2, 3)', [project, draft]), /WORKSPACE_FORBIDDEN/);

    await asUser(db, owner);
    const scope = { requirements: [{ ...workspace.requirements[0], description: 'Email and Google login' }], nodes: workspace.nodes, edges: workspace.edges };
    const applied = { ...draft, requirements: scope.requirements };
    await db.query('select public.approve_project_change($1, $2, $3, $4, 3)', [project, applied, scope, { classification: 'modified' }]);
    const approved = await db.query<{ approved_scope: typeof scope }>('select approved_scope from public.project_workspaces where project_id = $1', [project]);
    assert.equal(approved.rows[0].approved_scope.requirements[0].description, 'Email and Google login');
    const immutable = await db.query<{ snapshot: typeof workspace }>('select snapshot from public.baseline_snapshots where project_id = $1', [project]);
    assert.equal(immutable.rows[0].snapshot.requirements[0].description, 'Email login');
    await assert.rejects(db.query('select public.save_project_workspace($1, $2, 3)', [project, workspace]), /WORKSPACE_CONFLICT/);
    await db.exec('reset role');
    await assert.rejects(db.query("update public.baseline_snapshots set snapshot = '{}' where project_id = $1", [project]), /cannot be changed/);
    await assert.rejects(db.query('delete from public.baseline_snapshots where project_id = $1', [project]), /cannot be changed/);

    await db.exec('set role service_role');
    for (const expected of [1, 2]) {
      const registered = await db.query<{ version: number }>('select version from public.register_project_document($1, $2, $3, $4, 1, $5)', [project, owner, crypto.randomUUID(), 'brief.pdf', 'brief']);
      assert.equal(registered.rows[0].version, expected);
    }
    await db.exec('reset role');
    // Deleting a whole project must still cascade its baseline; only standalone deletion is blocked.
    await db.query('delete from public.projects where id = $1', [project]);
    assert.equal((await db.query('select * from public.baseline_snapshots')).rows.length, 0);
  } finally { await db.close(); }
});

test('review updates one linked requirement without changing the original baseline or unrelated drafts', () => {
  const baseline = structuredClone(workspace);
  const updated = applyReviewToScope(baseline, { classification: 'modified', magnitude: 'small', summary: 'Google login', explanation: 'Add Google', clientMessage: null, edits: [{ action: 'update', nodeId: 'auth', title: 'Login', summary: 'Email and Google login' }] }, 'Client change', 'change-1');
  assert.equal(updated.requirements.length, 1);
  assert.equal(updated.requirements[0].description, 'Email and Google login');
  assert.equal(baseline.requirements[0].description, 'Email login');
  const draft = structuredClone(workspace);
  draft.requirements.push({ ...draft.requirements[0], id: 'DRAFT', title: 'Unapproved feature' });
  const merged = mergeAppliedScope(draft, baseline, updated);
  assert.equal(merged.requirements.length, 2);
  assert.equal(updated.requirements.length, 1);
});

test('save queue serializes revisions, retains failed work and retries with the right version', async () => {
  const versions: number[] = [];
  let release!: () => void;
  let fail = false;
  const firstRequest = new Promise<void>((resolve) => { release = resolve; });
  const queue = new WorkspaceSaveQueue(1, async (snapshot, version) => {
    versions.push(version);
    if (versions.length === 1) await firstRequest;
    if (fail) throw new Error('Offline');
    return { project_id: project, snapshot, approved_scope: null, version: version + 1, updated_at: '' };
  });
  queue.enqueue(workspace);
  const first = queue.flush();
  queue.enqueue({ ...workspace, history: ['New edit'] });
  assert.equal(queue.flush(), first);
  release(); await first;
  assert.deepEqual(versions, [1, 2]);
  fail = true; queue.enqueue({ ...workspace, history: ['Offline edit'] });
  await assert.rejects(queue.flush(), /Offline/);
  assert.equal(queue.version, 3);
  fail = false; await queue.flush();
  assert.equal(queue.version, 4);
});
