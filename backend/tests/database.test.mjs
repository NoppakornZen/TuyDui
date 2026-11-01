import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const E = '33333333-3333-4333-8333-333333333333';
const V = '44444444-4444-4444-8444-444444444444';
const snapshot = { nodes: [{ id: 'root', requirementIds: [] }], edges: [], requirements: [], changes: [], documents: [], history: [], nodeNotes: {}, baselineConfirmed: false };

test('real SQL migrations enforce quota, RLS, persistence, baseline, invites, storage and rate limits (local PostgreSQL)', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      alter default privileges in schema public grant all on tables to authenticated;
      alter default privileges in schema public grant all on sequences to authenticated;
      create schema storage;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
      grant usage on schema storage to authenticated;
      grant all on storage.objects to authenticated;
    `);
    const directory = new URL('../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) {
      const sql = (await readFile(new URL(file, directory), 'utf8')).replace('create extension if not exists pgcrypto;', '');
      await db.exec(sql);
    }
    await db.exec(`insert into auth.users values('${A}'),('${B}'),('${E}'),('${V}')`);
    const asUser = async (id) => { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false)`); };
    await asUser(A);
    const created = await db.query(`select (public.create_project_with_free_limit('Project A', 'Client', '')).id`);
    const pa = created.rows[0].id;
    await assert.rejects(db.query(`select public.create_project_with_free_limit('Second', 'Client', '')`), /free_project_limit/);
    await assert.rejects(db.query(`insert into public.projects(owner_id, name, client_name) values($1,'Bypass','Client')`, [A]), /permission denied/);
    await db.query(`update public.projects set description='Still editable' where id=$1`, [pa]);
    assert.equal((await db.query(`select description from public.projects where id=$1`, [pa])).rows[0].description, 'Still editable');
    await asUser(B);
    const pb = (await db.query(`select (public.create_project_with_free_limit('Project B', 'Client', '')).id`)).rows[0].id;
    assert.equal((await db.query('select * from public.projects where id=$1', [pa])).rows.length, 0);
    await db.exec('reset role');
    const nodeA=(await db.query(`insert into public.project_nodes(project_id,title) values($1,'Node A') returning id`,[pa])).rows[0].id;
    const nodeB=(await db.query(`insert into public.project_nodes(project_id,title) values($1,'Node B') returning id`,[pb])).rows[0].id;
    const reqB=(await db.query(`insert into public.requirements(project_id,title) values($1,'Requirement B') returning id`,[pb])).rows[0].id;
    await asUser(A);
    await assert.rejects(db.query(`insert into public.node_requirements(node_id,requirement_id) values($1,$2)`,[nodeA,reqB]),/cross_project_relationship/);
    await assert.rejects(db.query(`insert into public.project_edges(project_id,source_node_id,target_node_id) values($1,$2,$3)`,[pa,nodeA,nodeB]),/foreign key/);
    await asUser(B);
    await assert.rejects(db.query('select public.save_project_workspace($1,0,$2)', [pa, snapshot]), /permission_denied/);
    await asUser(A);
    assert.equal((await db.query('select public.save_project_workspace($1,0,$2) revision', [pa, snapshot])).rows[0].revision, 1);
    await assert.rejects(db.query('select public.save_project_workspace($1,0,$2)', [pa, snapshot]), /workspace_conflict/);
    const confirmed = { ...snapshot, baselineConfirmed: true, history: ['Confirmed'] };
    await db.query('select public.save_project_workspace($1,1,$2)', [pa, confirmed]);
    assert.equal((await db.query('select snapshot from public.project_workspaces where project_id=$1', [pa])).rows[0].snapshot.baselineConfirmed, true);
    assert.equal((await db.query('select count(*)::int n from public.baseline_snapshots where project_id=$1', [pa])).rows[0].n, 1);
    await assert.rejects(db.query('update public.baseline_snapshots set snapshot=$1', [snapshot]), /permission denied/);
    await assert.rejects(db.query('update public.projects set baseline_confirmed_at=null where id=$1', [pa]), /permission denied/);
    const invite = 'TEST-EDITOR-INVITE';
    await db.query(`insert into public.project_invites(project_id,invite_code,role,created_by,max_uses) values($1,$2,'editor',$3,1)`, [pa, invite, A]);
    await asUser(E);
    assert.equal((await db.query('select public.accept_project_invite($1) id', [invite])).rows[0].id, pa);
    assert.equal((await db.query('select public.can_edit_project($1) ok', [pa])).rows[0].ok, true);
    await db.query('select public.save_project_workspace($1,2,$2)', [pa, confirmed]);
    await asUser(V);
    await assert.rejects(db.query('select public.accept_project_invite($1)', [invite]), /usage limit/);
    await db.exec('reset role');
    await db.query(`insert into public.project_members(project_id,user_id,role,accepted_at) values($1,$2,'viewer',now())`, [pa, V]);
    await asUser(V);
    assert.equal((await db.query('select public.is_project_member($1) ok', [pa])).rows[0].ok, true);
    assert.equal((await db.query('select snapshot from public.project_workspaces where project_id=$1', [pa])).rows.length, 1);
    await assert.rejects(db.query('select public.save_project_workspace($1,3,$2)', [pa, snapshot]), /permission_denied/);
    await assert.rejects(db.query('select public.reserve_ai_request($1,$2)', [pa, 'extract_requirements']), /permission_denied/);
    await db.query(`update public.project_members set role='owner' where project_id=$1 and user_id=$2`,[pa,V]);
    assert.equal((await db.query('select public.can_edit_project($1) ok',[pa])).rows[0].ok,false);
    await assert.rejects(db.query(`insert into public.project_invites(project_id,invite_code,role,created_by) values($1,'VIEWER-ESCALATION','editor',$2)`,[pa,V]),/row-level security/);
    await asUser(A);
    const reservations = await Promise.all(Array.from({ length: 6 }, () => db.query('select public.reserve_ai_request($1,$2) result', [pa, 'extract_requirements'])));
    assert.equal(reservations.filter((r) => r.rows[0].result.allowed).length, 5);
    const doc = '55555555-5555-4555-8555-555555555555';
    await db.query('select public.reserve_project_document($1,$2,$3,1,$4)', [pa, doc, 'brief.pdf', `${pa}/${doc}.pdf`]);
    await db.query(`insert into storage.objects(bucket_id,name) values('project-documents',$1)`, [`${pa}/${doc}.pdf`]);
    for(let i=0;i<4;i++){
      const id=crypto.randomUUID();
      await db.query('select public.reserve_project_document($1,$2,$3,1,$4)',[pa,id,'qa.pdf',`${pa}/${id}.pdf`]);
      await db.query('delete from public.project_documents where id=$1',[id]);
    }
    const blockedId=crypto.randomUUID();
    await assert.rejects(db.query('select public.reserve_project_document($1,$2,$3,1,$4)',[pa,blockedId,'qa.pdf',`${pa}/${blockedId}.pdf`]),/document_upload_limit/);
    await assert.rejects(db.query(`insert into storage.objects(bucket_id,name) values('project-documents',$1)`, [`${pb}/fake.pdf`]), /row-level security/);
    await asUser(B);
    assert.equal((await db.query(`select * from storage.objects where bucket_id='project-documents'`)).rows.length, 0);
    await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub','',false)`);
    await assert.rejects(db.query('select public.save_project_workspace($1,3,$2)', [pa, snapshot]), /permission denied/);
    await db.exec('reset role');
    await assert.rejects(db.query(`insert into public.projects(owner_id,name,client_name) values($1,'Direct privileged bypass','Client')`, [A]), /free_project_limit/);
    // These calls are concurrent requests to the same local PostgreSQL engine; live multi-session lock testing is a separate staging gate.
    const concurrent = await Promise.allSettled(Array.from({ length: 2 }, () => db.query(`select set_config('request.jwt.claim.sub',$1,false), public.create_project_with_free_limit('Concurrent','Client','')`, [V])));
    assert.equal(concurrent.filter((r) => r.status === 'fulfilled').length, 1);
    await db.query('delete from public.projects where id=$1',[pa]);
    assert.equal((await db.query(`select count(*)::int n from public.ai_request_reservations where user_id=$1 and task='upload_pdf'`,[A])).rows[0].n,5,'Project deletion must not reset account upload quota');
  } finally { await db.close(); }
});
