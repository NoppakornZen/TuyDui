-- Client-facing change reviews: the money loop.
-- A PM publishes a review link for one change request. The client opens the
-- public page (no account), reads the explanation and price, and decides.
-- A decided review is immutable; a new decision requires a new review link.
begin;
create table if not exists public.change_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  change_id text not null default '',
  public_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_discussion')),
  raw_request text not null,
  summary text not null default '',
  classification text not null default '',
  client_explanation text not null,
  price_thb numeric check (price_thb is null or price_thb >= 0),
  extra_time_text text not null default '',
  new_deadline date,
  decided_at timestamptz,
  client_note text not null default '',
  decision_snapshot jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists change_reviews_project_idx on public.change_reviews(project_id, created_at desc);

alter table public.change_reviews enable row level security;
-- No policies: browsers never touch this table. API routes use the service
-- role after validating the PM's session or the client's unguessable token.
revoke all on public.change_reviews from anon, authenticated;

create or replace function public.keep_decided_review_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status <> 'pending' then
    raise exception 'A decided client review cannot be changed';
  end if;
  if tg_op = 'UPDATE' and new.status <> 'pending' then
    new.decision_snapshot := jsonb_build_object(
      'rawRequest', old.raw_request,
      'summary', old.summary,
      'classification', old.classification,
      'clientExplanation', old.client_explanation,
      'priceThb', old.price_thb,
      'extraTimeText', old.extra_time_text,
      'newDeadline', old.new_deadline,
      'decision', new.status,
      'clientNote', new.client_note,
      'decidedAt', new.decided_at
    );
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists change_review_immutable on public.change_reviews;
create trigger change_review_immutable before update or delete on public.change_reviews
  for each row execute function public.keep_decided_review_immutable();

-- The PM plan lives on the profile so quota checks survive serverless restarts.
-- Upgrade to PRO manually after a PromptPay payment clears.
alter table public.profiles add column if not exists plan text not null default 'FREE' check (plan in ('FREE', 'PRO'));
commit;
