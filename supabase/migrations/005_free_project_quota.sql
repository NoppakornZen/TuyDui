-- V2.2 free trial project quota.
--
-- The browser must call this function instead of inserting into public.projects
-- directly. The per-user advisory lock makes the count-and-insert decision
-- atomic when two create requests arrive at the same time.

create or replace function public.create_project_with_free_limit(
  project_name text,
  project_client_name text,
  project_description text default ''
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  created_project public.projects%rowtype;
begin
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  if nullif(trim(project_name), '') is null then
    raise exception 'project_name_required';
  end if;

  if nullif(trim(project_client_name), '') is null then
    raise exception 'project_client_name_required';
  end if;

  -- Serialize project creation per account. Shared projects do not count:
  -- only rows where the caller is owner_id are included below.
  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));

  if (
    select count(*)
    from public.projects
    where owner_id = caller_id
  ) >= 1 then
    raise exception 'free_project_limit_reached'
      using detail = 'The free trial allows one owned project per account.';
  end if;

  insert into public.projects (owner_id, name, client_name, description)
  values (caller_id, trim(project_name), trim(project_client_name), coalesce(trim(project_description), ''))
  returning * into created_project;

  return created_project;
end;
$$;

revoke all on function public.create_project_with_free_limit(text, text, text) from public;
grant execute on function public.create_project_with_free_limit(text, text, text) to authenticated;

-- Prevent authenticated clients from bypassing the function with a direct
-- insert. The security-definer function above remains the only create path.
drop policy if exists "anyone can create projects" on public.projects;
