-- Add project_members table for collaboration (extends existing schema)

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (project_id, user_id)
);

create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invite_code text not null unique,
  role text not null check (role in ('editor', 'viewer')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses integer default null,
  use_count integer not null default 0
);

alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;

-- Function to check if user is a member
create or replace function public.is_project_member(project_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = project_uuid
    and user_id = auth.uid()
    and accepted_at is not null
  );
$$;

-- Function to check if user is owner or editor
create or replace function public.can_edit_project(project_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = project_uuid
    and user_id = auth.uid()
    and role in ('owner', 'editor')
    and accepted_at is not null
  );
$$;

-- Update existing policies to include members
drop policy if exists "owners can manage projects" on public.projects;
create policy "members can view projects" on public.projects
  for select using (
    owner_id = auth.uid() or public.is_project_member(id)
  );

create policy "owners can update projects" on public.projects
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners can delete projects" on public.projects
  for delete using (owner_id = auth.uid());

create policy "anyone can create projects" on public.projects
  for insert with check (owner_id = auth.uid());

-- Project members policies
create policy "members can view members" on public.project_members
  for select using (public.is_project_member(project_id));

create policy "owners can manage members" on public.project_members
  for all using (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

create policy "users can accept invites" on public.project_members
  for update using (user_id = auth.uid());

-- Invite policies
create policy "members can view invites" on public.project_invites
  for select using (public.is_project_member(project_id));

create policy "editors can create invites" on public.project_invites
  for insert with check (public.can_edit_project(project_id));

create policy "creators can delete invites" on public.project_invites
  for delete using (created_by = auth.uid());

-- Update other table policies to respect member access
drop policy if exists "owners can manage team" on public.team_members;
create policy "members can view team" on public.team_members
  for select using (public.is_project_member(project_id));
create policy "editors can manage team" on public.team_members
  for all using (public.can_edit_project(project_id));

drop policy if exists "owners can manage documents" on public.source_documents;
create policy "members can view documents" on public.source_documents
  for select using (public.is_project_member(project_id));
create policy "editors can manage documents" on public.source_documents
  for all using (public.can_edit_project(project_id));

drop policy if exists "owners can manage requirements" on public.requirements;
create policy "members can view requirements" on public.requirements
  for select using (public.is_project_member(project_id));
create policy "editors can manage requirements" on public.requirements
  for all using (public.can_edit_project(project_id));

drop policy if exists "owners can manage nodes" on public.project_nodes;
create policy "members can view nodes" on public.project_nodes
  for select using (public.is_project_member(project_id));
create policy "editors can manage nodes" on public.project_nodes
  for all using (public.can_edit_project(project_id));

drop policy if exists "owners can manage edges" on public.project_edges;
create policy "members can view edges" on public.project_edges
  for select using (public.is_project_member(project_id));
create policy "editors can manage edges" on public.project_edges
  for all using (public.can_edit_project(project_id));

drop policy if exists "owners can manage changes" on public.scope_changes;
create policy "members can view changes" on public.scope_changes
  for select using (public.is_project_member(project_id));
create policy "editors can manage changes" on public.scope_changes
  for all using (public.can_edit_project(project_id));

-- Auto-add owner as member when project is created
create or replace function public.auto_add_owner_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role, accepted_at)
  values (new.id, new.owner_id, 'owner', now());
  return new;
end;
$$;

create trigger auto_add_owner_as_member_trigger
  after insert on public.projects
  for each row execute function public.auto_add_owner_as_member();
