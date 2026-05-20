
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index threads_user_idx on public.threads(user_id, updated_at desc);

alter table public.threads enable row level security;

create policy "Users select own threads" on public.threads for select using (auth.uid() = user_id);
create policy "Users insert own threads" on public.threads for insert with check (auth.uid() = user_id);
create policy "Users update own threads" on public.threads for update using (auth.uid() = user_id);
create policy "Users delete own threads" on public.threads for delete using (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  parts jsonb not null,
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages(thread_id, created_at);

alter table public.messages enable row level security;

create policy "Users select own messages" on public.messages for select
  using (exists (select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "Users insert own messages" on public.messages for insert
  with check (exists (select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "Users delete own messages" on public.messages for delete
  using (exists (select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()));
