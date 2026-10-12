-- Workspace ids from the existing map are strings, so retain them in JSON instead
-- of replacing them with UUIDs and breaking links to requirements and documents.
begin;
create table if not exists public.project_workspaces (
  project_id uuid primary key references public.projects(id) on delete cascade,
  snapshot jsonb not null,
  approved_scope jsonb,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(snapshot) = 'object'),
  check (approved_scope is null or jsonb_typeof(approved_scope) = 'object')
);
alter table public.project_workspaces enable row level security;
drop policy if exists "members read workspace" on public.project_workspaces;
create policy "members read workspace" on public.project_workspaces
  for select to authenticated using (public.is_project_member(project_id));
revoke all on public.project_workspaces from anon, authenticated;
grant select on public.project_workspaces to authenticated;

create or replace function public.valid_workspace_snapshot(value jsonb)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(jsonb_typeof(value) = 'object'
    and pg_column_size(value) <= 2097152
    and jsonb_typeof(value->'nodes') = 'array' and jsonb_array_length(value->'nodes') > 0
    and jsonb_typeof(value->'edges') = 'array'
    and jsonb_typeof(value->'requirements') = 'array'
    and jsonb_typeof(value->'changes') = 'array'
    and jsonb_typeof(value->'history') = 'array'
    and jsonb_typeof(value->'nodeNotes') = 'object'
    and jsonb_typeof(value->'documents') = 'array', false);
$$;

create or replace function public.save_project_workspace(project_uuid uuid, snapshot_input jsonb, expected_version integer)
returns public.project_workspaces language plpgsql security definer set search_path = public as $$
declare current_workspace public.project_workspaces;
begin
  if auth.uid() is null or not public.can_edit_project(project_uuid) then raise exception 'WORKSPACE_FORBIDDEN'; end if;
  if expected_version is null or expected_version < 0 then raise exception 'WORKSPACE_CONFLICT'; end if;
  if not public.valid_workspace_snapshot(snapshot_input) then raise exception 'Invalid workspace snapshot'; end if;
  perform 1 from public.projects where id = project_uuid for update;
  select * into current_workspace from public.project_workspaces where project_id = project_uuid;
  if not found then
    if expected_version <> 0 then raise exception 'WORKSPACE_CONFLICT'; end if;
    insert into public.project_workspaces(project_id, snapshot, approved_scope)
      values (project_uuid, snapshot_input, (select jsonb_build_object('requirements', snapshot->'requirements', 'nodes', snapshot->'nodes', 'edges', snapshot->'edges')
        from public.baseline_snapshots where project_id = project_uuid and version = 1)) returning * into current_workspace;
  else
    if current_workspace.version <> expected_version then raise exception 'WORKSPACE_CONFLICT'; end if;
    update public.project_workspaces set snapshot = snapshot_input, version = version + 1, updated_at = now()
      where project_id = project_uuid returning * into current_workspace;
  end if;
  update public.projects set updated_at = now() where id = project_uuid;
  return current_workspace;
end;
$$;

-- Only the dedicated confirmation transaction can create baseline V1.
drop policy if exists "owners can create baselines" on public.baseline_snapshots;
drop policy if exists "owners can read baselines" on public.baseline_snapshots;
drop policy if exists "members read baselines" on public.baseline_snapshots;
create policy "members read baselines" on public.baseline_snapshots for select to authenticated using (public.is_project_member(project_id));
revoke insert, update, delete on public.baseline_snapshots from anon, authenticated;
grant select on public.baseline_snapshots to authenticated;

create or replace function public.keep_baseline_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.projects where id = old.project_id) then return old; end if;
  raise exception 'Confirmed baseline snapshots cannot be changed';
end;
$$;
drop trigger if exists baseline_immutable on public.baseline_snapshots;
create trigger baseline_immutable before update or delete on public.baseline_snapshots
  for each row execute function public.keep_baseline_immutable();

create or replace function public.confirm_project_baseline(project_uuid uuid, expected_version integer)
returns public.project_workspaces language plpgsql security definer set search_path = public as $$
declare current_workspace public.project_workspaces; confirmation_time timestamptz;
begin
  if auth.uid() is null or not public.is_project_owner(project_uuid) then raise exception 'WORKSPACE_FORBIDDEN'; end if;
  if expected_version is null or expected_version < 0 then raise exception 'WORKSPACE_CONFLICT'; end if;
  perform 1 from public.projects where id = project_uuid for update;
  select * into current_workspace from public.project_workspaces where project_id = project_uuid;
  if not found then raise exception 'Save the workspace before confirming the baseline'; end if;
  if exists (select 1 from public.baseline_snapshots where project_id = project_uuid and version = 1) then return current_workspace; end if;
  if current_workspace.version <> expected_version then raise exception 'WORKSPACE_CONFLICT'; end if;
  if jsonb_array_length(current_workspace.snapshot->'requirements') = 0 then raise exception 'Add requirements before confirming the baseline'; end if;
  confirmation_time := now();
  insert into public.baseline_snapshots(project_id, version, snapshot, confirmed_by, confirmed_at)
    values (project_uuid, 1, current_workspace.snapshot, auth.uid(), confirmation_time);
  update public.projects set baseline_confirmed_at = confirmation_time, updated_at = confirmation_time where id = project_uuid;
  update public.project_workspaces set
    approved_scope = jsonb_build_object('requirements', snapshot->'requirements', 'nodes', snapshot->'nodes', 'edges', snapshot->'edges'),
    snapshot = jsonb_set(snapshot, '{history}', jsonb_build_array('Baseline V1 confirmed · ' || confirmation_time::text) || (snapshot->'history')),
    version = version + 1, updated_at = confirmation_time
    where project_id = project_uuid returning * into current_workspace;
  insert into public.audit_events(project_id, actor_id, event_type, payload)
    values (project_uuid, auth.uid(), 'baseline_confirmed', jsonb_build_object('version', 1));
  return current_workspace;
end;
$$;

-- Ordinary autosaves cannot alter approved_scope. Apply is a separate, explicit decision.
create or replace function public.approve_project_change(project_uuid uuid, snapshot_input jsonb, scope_input jsonb, review_input jsonb, expected_version integer)
returns public.project_workspaces language plpgsql security definer set search_path = public as $$
declare current_workspace public.project_workspaces; previous_scope jsonb;
begin
  if auth.uid() is null or not public.can_edit_project(project_uuid) then raise exception 'WORKSPACE_FORBIDDEN'; end if;
  if expected_version is null or expected_version < 0 then raise exception 'WORKSPACE_CONFLICT'; end if;
  if not public.valid_workspace_snapshot(snapshot_input)
    or jsonb_typeof(scope_input->'requirements') is distinct from 'array'
    or jsonb_typeof(scope_input->'nodes') is distinct from 'array'
    or jsonb_typeof(scope_input->'edges') is distinct from 'array'
    or pg_column_size(scope_input) > 2097152 then raise exception 'Invalid approved scope'; end if;
  perform 1 from public.projects where id = project_uuid for update;
  select * into current_workspace from public.project_workspaces where project_id = project_uuid;
  if not found or current_workspace.approved_scope is null then raise exception 'Confirm the baseline before applying a change'; end if;
  if current_workspace.version <> expected_version then raise exception 'WORKSPACE_CONFLICT'; end if;
  previous_scope := current_workspace.approved_scope;
  update public.project_workspaces set snapshot = snapshot_input, approved_scope = scope_input, version = version + 1, updated_at = now()
    where project_id = project_uuid returning * into current_workspace;
  update public.projects set updated_at = now() where id = project_uuid;
  insert into public.audit_events(project_id, actor_id, event_type, payload)
    values (project_uuid, auth.uid(), 'scope_change_applied', jsonb_build_object('review', review_input, 'previousScope', previous_scope, 'approvedScope', scope_input));
  return current_workspace;
end;
$$;

create or replace function public.check_project_baseline_timestamp()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.baseline_confirmed_at is distinct from old.baseline_confirmed_at
    and not exists (select 1 from public.baseline_snapshots where project_id = new.id and version = 1 and confirmed_at = new.baseline_confirmed_at)
    then raise exception 'Confirm the baseline through confirm_project_baseline'; end if;
  return new;
end;
$$;
drop trigger if exists project_baseline_timestamp on public.projects;
create trigger project_baseline_timestamp before update of baseline_confirmed_at on public.projects
  for each row execute function public.check_project_baseline_timestamp();

revoke all on function public.save_project_workspace(uuid, jsonb, integer) from public, anon;
revoke all on function public.confirm_project_baseline(uuid, integer) from public, anon;
revoke all on function public.approve_project_change(uuid, jsonb, jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_project_workspace(uuid, jsonb, integer) to authenticated;
grant execute on function public.confirm_project_baseline(uuid, integer) to authenticated;
grant execute on function public.approve_project_change(uuid, jsonb, jsonb, jsonb, integer) to authenticated;

-- Original PDFs and version numbers also live online, outside a serverless disk.
alter table public.source_documents add column if not exists page_count integer not null default 0;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('project-briefs', 'project-briefs', false, 12582912, array['application/pdf'])
  on conflict (id) do update set public = false;
drop policy if exists "members read brief PDFs" on storage.objects;
create policy "members read brief PDFs" on storage.objects for select to authenticated
  using (bucket_id = 'project-briefs' and case
    when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.is_project_member(split_part(name, '/', 1)::uuid) else false end);

create or replace function public.register_project_document(project_uuid uuid, actor_uuid uuid, document_uuid uuid, document_name text, document_pages integer, source_type public.document_type)
returns public.source_documents language plpgsql security definer set search_path = public as $$
declare registered public.source_documents; next_version integer;
begin
  if actor_uuid is null or not exists (select 1 from public.projects where id = project_uuid and owner_id = actor_uuid)
    and not exists (select 1 from public.project_members where project_id = project_uuid and user_id = actor_uuid and accepted_at is not null and role in ('owner', 'editor'))
    then raise exception 'WORKSPACE_FORBIDDEN'; end if;
  if source_type not in ('brief', 'revision') or document_pages < 1 then raise exception 'Invalid project document'; end if;
  perform 1 from public.projects where id = project_uuid for update;
  select greatest(
    coalesce((select max(version) from public.source_documents where project_id = project_uuid), 0),
    coalesce((select max((document->>'version')::integer)
      from public.project_workspaces w, jsonb_array_elements(w.snapshot->'documents') document
      where w.project_id = project_uuid and document->>'version' ~ '^[0-9]+$'), 0)
  ) + 1 into next_version;
  insert into public.source_documents(id, project_id, name, version, document_type, storage_path, processing_status, page_count)
    values (document_uuid, project_uuid, document_name, next_version, source_type, project_uuid::text || '/' || document_uuid::text || '.pdf', 'ready', document_pages)
    returning * into registered;
  return registered;
end;
$$;
-- This function is called only by an API after validating the caller's token.
revoke all on function public.register_project_document(uuid, uuid, uuid, text, integer, public.document_type) from public, anon, authenticated;
grant execute on function public.register_project_document(uuid, uuid, uuid, text, integer, public.document_type) to service_role;
commit;
