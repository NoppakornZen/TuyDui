-- Fix collaboration access. Safe to re-run after 002_collaboration.sql.
--
-- The previous policies rejected the project owner (42501) because they
-- required an accepted project_members row, and projects created before the
-- trigger never got one. They also let any signed-in user read every live
-- invite. Ownership now comes from projects.owner_id, and invite links are
-- opened through security-definer functions that return one code at a time.

create or replace function public.is_project_owner(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = project_uuid
      and owner_id = auth.uid()
  );
$$;

create or replace function public.is_project_member(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_project_owner(project_uuid)
    or exists (
      select 1
      from public.project_members
      where project_id = project_uuid
        and user_id = auth.uid()
        and accepted_at is not null
    );
$$;

create or replace function public.can_edit_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_project_owner(project_uuid)
    or exists (
      select 1
      from public.project_members
      where project_id = project_uuid
        and user_id = auth.uid()
        and role in ('owner', 'editor')
        and accepted_at is not null
    );
$$;

-- Projects created before the trigger have no owner row.
insert into public.project_members (project_id, user_id, role, accepted_at)
select p.id, p.owner_id, 'owner', coalesce(p.created_at, now())
from public.projects p
where not exists (
  select 1
  from public.project_members m
  where m.project_id = p.id
    and m.user_id = p.owner_id
)
on conflict (project_id, user_id) do nothing;

-- One invite, looked up by its code. Does not expose the invite table.
create or replace function public.lookup_invite(invite_code_input text)
returns table (
  id uuid,
  project_id uuid,
  role text,
  expires_at timestamptz,
  use_count integer,
  max_uses integer,
  project_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.project_id, i.role, i.expires_at, i.use_count, i.max_uses, p.name
  from public.project_invites i
  join public.projects p on p.id = i.project_id
  where i.invite_code = invite_code_input
    and i.expires_at > now();
$$;

-- Join and count the use in one transaction, so a visitor cannot insert
-- themselves under a different role than the link they were given.
create or replace function public.accept_project_invite(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_invite public.project_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into found_invite
  from public.project_invites
  where invite_code = invite_code_input
    and expires_at > now()
  for update;

  if not found then
    raise exception 'This invite link is invalid or has expired';
  end if;

  if found_invite.max_uses is not null and found_invite.use_count >= found_invite.max_uses then
    raise exception 'This invite link has reached its usage limit';
  end if;

  -- Opening the link again, or the owner opening their own link, just returns.
  if exists (
    select 1
    from public.project_members
    where project_id = found_invite.project_id
      and user_id = auth.uid()
  ) then
    return found_invite.project_id;
  end if;

  insert into public.project_members (project_id, user_id, role, invited_by, accepted_at)
  values (found_invite.project_id, auth.uid(), found_invite.role, found_invite.created_by, now());

  update public.project_invites
  set use_count = use_count + 1
  where id = found_invite.id;

  return found_invite.project_id;
end;
$$;

revoke all on function public.lookup_invite(text) from public;
revoke all on function public.accept_project_invite(text) from public;
grant execute on function public.lookup_invite(text) to authenticated;
grant execute on function public.accept_project_invite(text) to authenticated;

-- project_members -----------------------------------------------------------

alter table public.project_members enable row level security;

drop policy if exists "members can view members" on public.project_members;
drop policy if exists "owners can manage members" on public.project_members;
drop policy if exists "users can accept invites" on public.project_members;
drop policy if exists "Users can read members of their projects" on public.project_members;
drop policy if exists "Owners can add members" on public.project_members;
drop policy if exists "Owners can update member roles" on public.project_members;
drop policy if exists "Owners can remove members" on public.project_members;
drop policy if exists "invitees can join" on public.project_members;
drop policy if exists "owners manage members" on public.project_members;
drop policy if exists "owners remove members" on public.project_members;

create policy "members can view members"
on public.project_members
for select
using (public.is_project_member(project_id) or user_id = auth.uid());

create policy "owners manage members"
on public.project_members
for update
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

create policy "owners remove members"
on public.project_members
for delete
using (public.is_project_owner(project_id) and user_id <> auth.uid());

-- project_invites -----------------------------------------------------------

alter table public.project_invites enable row level security;

drop policy if exists "members can view invites" on public.project_invites;
drop policy if exists "editors can create invites" on public.project_invites;
drop policy if exists "creators can delete invites" on public.project_invites;
drop policy if exists "Users can create invites for their projects" on public.project_invites;
drop policy if exists "Anyone can read active invites" on public.project_invites;
drop policy if exists "Creators can delete their invites" on public.project_invites;
drop policy if exists "owners create invites" on public.project_invites;
drop policy if exists "read invites" on public.project_invites;
drop policy if exists "owners revoke invites" on public.project_invites;
drop policy if exists "members record invite use" on public.project_invites;

create policy "owners create invites"
on public.project_invites
for insert
with check (
  created_by = auth.uid()
  and public.is_project_owner(project_id)
);

create policy "members read invites"
on public.project_invites
for select
using (public.is_project_member(project_id));

create policy "owners revoke invites"
on public.project_invites
for delete
using (public.is_project_owner(project_id));
