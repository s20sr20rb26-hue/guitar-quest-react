create table if not exists public.post_likes (
  post_id uuid not null references public.practice_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.practice_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists post_likes_post_id_idx
  on public.post_likes (post_id);
create index if not exists post_comments_post_id_created_at_idx
  on public.post_comments (post_id, created_at);

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "Authenticated users can view likes" on public.post_likes;
create policy "Authenticated users can view likes"
  on public.post_likes for select
  to authenticated
  using (true);

drop policy if exists "Users can add their own like" on public.post_likes;
create policy "Users can add their own like"
  on public.post_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their own like" on public.post_likes;
create policy "Users can remove their own like"
  on public.post_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can view comments" on public.post_comments;
create policy "Authenticated users can view comments"
  on public.post_comments for select
  to authenticated
  using (true);

drop policy if exists "Users can add their own comment" on public.post_comments;
create policy "Users can add their own comment"
  on public.post_comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own comment" on public.post_comments;
create policy "Users can delete their own comment"
  on public.post_comments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, delete on public.post_comments to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.post_likes;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.post_comments;
exception
  when duplicate_object then null;
end;
$$;
