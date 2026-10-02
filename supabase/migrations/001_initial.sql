-- BriefDiff MVP schema. Baselines and approvals are represented by immutable snapshots.
create extension if not exists pgcrypto;

create type public.document_type as enum ('brief', 'revision', 'client_message', 'email', 'other');
create type public.processing_status as enum ('queued', 'processing', 'ready', 'failed');
create type public.requirement_clarity as enum ('clear', 'ambiguous', 'missing_detail', 'conflict');
create type public.node_type as enum ('project', 'work_area', 'requirement_group', 'milestone');
create type public.node_status as enum ('planned', 'in_progress', 'done');
create type public.change_classification as enum ('in_scope', 'modified', 'new_scope', 'ambiguous');
create type public.change_decision as enum ('pending', 'included', 'charge_extra', 'needs_discussion', 'approved');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_name text not null,
  description text not null default '',
  deadline date,
  baseline_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  role text not null,
  created_at timestamptz not null default now()
);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  document_type public.document_type not null,
  storage_path text,
  uploaded_at timestamptz not null default now(),
  processing_status public.processing_status not null default 'queued',
  unique (project_id, version)
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Uncategorized',
  clarity public.requirement_clarity not null default 'clear',
  suggested_roles text[] not null default '{}',
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requirement_evidence (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  document_id uuid not null references public.source_documents(id) on delete cascade,
  page integer,
  quote text not null,
  created_at timestamptz not null default now()
);

create table public.project_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  node_type public.node_type not null default 'work_area',
  parent_id uuid references public.project_nodes(id) on delete set null,
  assignee_id uuid references public.team_members(id) on delete set null,
  status public.node_status not null default 'planned',
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.node_requirements (
  node_id uuid not null references public.project_nodes(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  primary key (node_id, requirement_id)
);

create table public.project_edges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_node_id uuid not null references public.project_nodes(id) on delete cascade,
  target_node_id uuid not null references public.project_nodes(id) on delete cascade,
  relationship text not null default 'related_to',
  created_at timestamptz not null default now(),
  check (source_node_id <> target_node_id),
  unique (project_id, source_node_id, target_node_id)
);

create table public.scope_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_document_id uuid references public.source_documents(id) on delete set null,
  raw_request text not null,
  summary text not null default '',
  classification public.change_classification not null default 'ambiguous',
  decision public.change_decision not null default 'pending',
  price numeric,
  additional_days integer,
  new_deadline date,
  ai_confidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.change_impacts (
  change_id uuid not null references public.scope_changes(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete cascade,
  node_id uuid references public.project_nodes(id) on delete cascade,
  member_id uuid references public.team_members(id) on delete cascade,
  primary key (change_id, requirement_id, node_id, member_id)
);

create table public.baseline_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null default 1,
  snapshot jsonb not null,
  confirmed_by uuid not null references auth.users(id),
  confirmed_at timestamptz not null default now(),
  unique (project_id, version)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_type text not null,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  provider_cost numeric,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.team_members enable row level security;
alter table public.source_documents enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_evidence enable row level security;
alter table public.project_nodes enable row level security;
alter table public.node_requirements enable row level security;
alter table public.project_edges enable row level security;
alter table public.scope_changes enable row level security;
alter table public.change_impacts enable row level security;
alter table public.baseline_snapshots enable row level security;
alter table public.audit_events enable row level security;
alter table public.ai_usage_events enable row level security;

create or replace function public.owns_project(project_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects where id = project_uuid and owner_id = auth.uid());
$$;

create policy "owners can manage projects" on public.projects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners can manage team" on public.team_members for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "owners can manage documents" on public.source_documents for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "owners can manage requirements" on public.requirements for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "owners can manage evidence" on public.requirement_evidence for all using (exists (select 1 from public.requirements r where r.id = requirement_id and public.owns_project(r.project_id))) with check (exists (select 1 from public.requirements r where r.id = requirement_id and public.owns_project(r.project_id)));
create policy "owners can manage nodes" on public.project_nodes for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "owners can manage node links" on public.node_requirements for all using (exists (select 1 from public.project_nodes n where n.id = node_id and public.owns_project(n.project_id))) with check (exists (select 1 from public.project_nodes n where n.id = node_id and public.owns_project(n.project_id)));
create policy "owners can manage edges" on public.project_edges for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "owners can manage changes" on public.scope_changes for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "owners can manage impacts" on public.change_impacts for all using (exists (select 1 from public.scope_changes c where c.id = change_id and public.owns_project(c.project_id))) with check (exists (select 1 from public.scope_changes c where c.id = change_id and public.owns_project(c.project_id)));
create policy "owners can read baselines" on public.baseline_snapshots for select using (public.owns_project(project_id));
create policy "owners can create baselines" on public.baseline_snapshots for insert with check (public.owns_project(project_id) and confirmed_by = auth.uid());
create policy "owners can read audit" on public.audit_events for select using (public.owns_project(project_id));
create policy "owners can create audit" on public.audit_events for insert with check (public.owns_project(project_id) and actor_id = auth.uid());
create policy "users can read own usage" on public.ai_usage_events for select using (user_id = auth.uid());
