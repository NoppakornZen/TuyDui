-- Additive storage: preserve existing IDs and normalized tables. Apply to staging first.
create table public.project_workspaces (
  project_id uuid primary key references public.projects(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.project_workspaces enable row level security;
create policy "members read workspace" on public.project_workspaces for select to authenticated
  using (public.is_project_member(project_id));
revoke all on public.project_workspaces from anon, authenticated;
grant select on public.project_workspaces to authenticated;

create or replace function public.save_project_workspace(project_uuid uuid, expected_revision bigint, workspace_snapshot jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare current_revision bigint; next_revision bigint;
begin
  -- Lock parent even for first save; prevents simultaneous first inserts and baseline races.
  perform 1 from public.projects where id = project_uuid for update;
  if auth.uid() is null or not public.can_edit_project(project_uuid) then raise exception 'permission_denied'; end if;
  if jsonb_typeof(workspace_snapshot) is distinct from 'object'
    or jsonb_typeof(workspace_snapshot->'nodes') is distinct from 'array'
    or jsonb_array_length(workspace_snapshot->'nodes') = 0
    or jsonb_typeof(workspace_snapshot->'requirements') is distinct from 'array'
    or jsonb_typeof(workspace_snapshot->'edges') is distinct from 'array'
    or jsonb_typeof(workspace_snapshot->'changes') is distinct from 'array'
    or jsonb_typeof(workspace_snapshot->'documents') is distinct from 'array'
    or jsonb_typeof(workspace_snapshot->'history') is distinct from 'array'
    or jsonb_typeof(workspace_snapshot->'nodeNotes') is distinct from 'object'
    or jsonb_typeof(workspace_snapshot->'baselineConfirmed') is distinct from 'boolean'
    or octet_length(workspace_snapshot::text) > 4194304 then raise exception 'invalid_workspace'; end if;
  select revision into current_revision from public.project_workspaces where project_id = project_uuid;
  if expected_revision is distinct from coalesce(current_revision, 0) then raise exception 'workspace_conflict'; end if;
  next_revision := coalesce(current_revision, 0) + 1;
  if exists(select 1 from public.baseline_snapshots where project_id = project_uuid) then
    workspace_snapshot := jsonb_set(workspace_snapshot, '{baselineConfirmed}', 'true'::jsonb);
  end if;
  insert into public.project_workspaces(project_id, snapshot, revision, updated_by)
  values(project_uuid, workspace_snapshot, next_revision, auth.uid())
  on conflict (project_id) do update set snapshot = excluded.snapshot, revision = excluded.revision,
    updated_by = excluded.updated_by, updated_at = now();
  if workspace_snapshot->>'baselineConfirmed' = 'true' and not exists (
    select 1 from public.baseline_snapshots where project_id = project_uuid
  ) then
    insert into public.baseline_snapshots(project_id, version, snapshot, confirmed_by)
    values(project_uuid, 1, workspace_snapshot, auth.uid());
    update public.projects set baseline_confirmed_at = coalesce(baseline_confirmed_at, now()) where id = project_uuid;
  end if;
  update public.projects set updated_at = now() where id = project_uuid;
  return next_revision;
end;
$$;
revoke all on function public.save_project_workspace(uuid, bigint, jsonb) from public;
grant execute on function public.save_project_workspace(uuid, bigint, jsonb) to authenticated;

create table public.ai_request_reservations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task text not null,
  created_at timestamptz not null default now()
);
create index ai_request_user_time on public.ai_request_reservations(user_id, created_at);
alter table public.ai_request_reservations enable row level security;
revoke all on public.ai_request_reservations from anon, authenticated;

create or replace function public.reserve_ai_request(project_uuid uuid, task_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare hour_count integer; day_count integer; oldest timestamptz;
begin
  if auth.uid() is null or not public.can_edit_project(project_uuid) then raise exception 'permission_denied'; end if;
  if task_name not in ('extract_requirements','classify_client_message','analyze_change_impact','compare_requirement_pair','draft_change_explanation','suggest_project_structure','review_change') then raise exception 'invalid_task'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ai:' || auth.uid()::text, 0));
  select count(*) filter(where created_at > now() - interval '1 hour'), count(*)
    into hour_count, day_count from public.ai_request_reservations
    where user_id = auth.uid() and task <> 'upload_pdf' and created_at > now() - interval '1 day';
  if hour_count >= 5 or day_count >= 10 then
    select min(created_at) into oldest from public.ai_request_reservations where user_id = auth.uid()
      and created_at > now() - case when hour_count >= 5 then interval '1 hour' else interval '1 day' end;
    return jsonb_build_object('allowed', false, 'resetIn', ceil(extract(epoch from
      (oldest + case when hour_count >= 5 then interval '1 hour' else interval '1 day' end - now()))));
  end if;
  insert into public.ai_request_reservations(user_id, project_id, task) values(auth.uid(), project_uuid, task_name);
  return jsonb_build_object('allowed', true);
end;
$$;
revoke all on function public.reserve_ai_request(uuid, text) from public;
grant execute on function public.reserve_ai_request(uuid, text) to authenticated;

create table public.project_documents (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  version integer not null,
  page_count integer not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  unique(project_id, version)
);
alter table public.project_documents enable row level security;
create policy "members read document manifest" on public.project_documents for select to authenticated using(public.is_project_member(project_id));
create policy "editors remove failed manifest" on public.project_documents for delete to authenticated using(public.can_edit_project(project_id));
revoke all on public.project_documents from anon, authenticated;
grant select, delete on public.project_documents to authenticated;

create or replace function public.reserve_project_document(project_uuid uuid, document_id uuid, document_name text, page_count integer, object_path text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result public.project_documents%rowtype; next_version integer; hour_uploads integer; day_uploads integer;
begin
  perform 1 from public.projects where id = project_uuid for update;
  if auth.uid() is null or not public.can_edit_project(project_uuid) then raise exception 'permission_denied'; end if;
  if object_path <> project_uuid::text || '/' || document_id::text || '.pdf' then raise exception 'invalid_path'; end if;
  -- Enforce storage quota inside the public RPC too; deleting a manifest cannot reset it.
  perform pg_advisory_xact_lock(hashtextextended('ai:' || auth.uid()::text, 0));
  select count(*) filter(where created_at > now() - interval '1 hour'), count(*)
    into hour_uploads, day_uploads from public.ai_request_reservations
    where user_id = auth.uid() and task = 'upload_pdf' and created_at > now() - interval '1 day';
  if hour_uploads >= 5 or day_uploads >= 10 then raise exception 'document_upload_limit'; end if;
  insert into public.ai_request_reservations(user_id,project_id,task) values(auth.uid(),project_uuid,'upload_pdf');
  select coalesce(max(version), 0) + 1 into next_version from public.project_documents where project_id = project_uuid;
  insert into public.project_documents(id, project_id, name, version, page_count, storage_path)
    values(document_id, project_uuid, document_name, next_version, page_count, object_path) returning * into result;
  return to_jsonb(result);
end;
$$;
revoke all on function public.reserve_project_document(uuid, uuid, text, integer, text) from public;
grant execute on function public.reserve_project_document(uuid, uuid, text, integer, text) to authenticated;
