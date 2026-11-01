-- Defense in depth if insert grants/policies are accidentally restored later.
create or replace function public.enforce_free_project_quota()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));
  if exists(select 1 from public.projects where owner_id = new.owner_id and id <> new.id) then
    raise exception 'free_project_limit_reached';
  end if;
  return new;
end;
$$;
create trigger enforce_free_project_quota before insert on public.projects for each row execute function public.enforce_free_project_quota();
revoke insert on public.projects from anon, authenticated;
revoke update on public.projects from anon, authenticated;
grant update(name, client_name, description, deadline, updated_at) on public.projects to authenticated;

-- Never let clients rewrite a confirmed baseline or edit another project through a child FK.
create or replace function public.prevent_baseline_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and not exists(select 1 from public.projects where id = old.project_id) then return old; end if;
  raise exception 'baseline_is_immutable';
end; $$;
create trigger immutable_baseline before update or delete on public.baseline_snapshots
  for each row execute function public.prevent_baseline_mutation();

alter table public.requirements add constraint requirements_project_key unique(id, project_id);
alter table public.project_nodes add constraint nodes_project_key unique(id, project_id);
alter table public.team_members add constraint team_project_key unique(id, project_id);
alter table public.source_documents add constraint documents_project_key unique(id, project_id);
alter table public.project_nodes add constraint parent_same_project foreign key(parent_id, project_id) references public.project_nodes(id, project_id);
alter table public.project_nodes add constraint assignee_same_project foreign key(assignee_id, project_id) references public.team_members(id, project_id);
alter table public.project_edges add constraint edge_source_same_project foreign key(source_node_id, project_id) references public.project_nodes(id, project_id);
alter table public.project_edges add constraint edge_target_same_project foreign key(target_node_id, project_id) references public.project_nodes(id, project_id);
alter table public.scope_changes add constraint change_document_same_project foreign key(source_document_id, project_id) references public.source_documents(id, project_id);

create or replace function public.check_project_relationship()
returns trigger language plpgsql security definer set search_path = public as $$
declare p uuid;
begin
  if tg_table_name = 'node_requirements' then
    select project_id into p from public.project_nodes where id = new.node_id;
    if not exists(select 1 from public.requirements where id = new.requirement_id and project_id = p) then raise exception 'cross_project_relationship'; end if;
  elsif tg_table_name = 'requirement_evidence' then
    select project_id into p from public.requirements where id = new.requirement_id;
    if not exists(select 1 from public.source_documents where id = new.document_id and project_id = p) then raise exception 'cross_project_relationship'; end if;
  else
    select project_id into p from public.scope_changes where id = new.change_id;
    if (new.requirement_id is not null and not exists(select 1 from public.requirements where id = new.requirement_id and project_id = p))
      or (new.node_id is not null and not exists(select 1 from public.project_nodes where id = new.node_id and project_id = p))
      or (new.member_id is not null and not exists(select 1 from public.team_members where id = new.member_id and project_id = p)) then raise exception 'cross_project_relationship'; end if;
  end if;
  return new;
end;
$$;
create trigger validate_node_requirements before insert or update on public.node_requirements for each row execute function public.check_project_relationship();
create trigger validate_evidence before insert or update on public.requirement_evidence for each row execute function public.check_project_relationship();
create trigger validate_impacts before insert or update on public.change_impacts for each row execute function public.check_project_relationship();

-- Shared users can read immutable baselines; all writes go through the workspace RPC.
drop policy if exists "owners can create baselines" on public.baseline_snapshots;
drop policy if exists "owners can read baselines" on public.baseline_snapshots;
create policy "members read baselines" on public.baseline_snapshots for select to authenticated using(public.is_project_member(project_id));
revoke insert, update, delete on public.baseline_snapshots from anon, authenticated;
