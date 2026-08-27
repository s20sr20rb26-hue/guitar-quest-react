create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_name text not null check (char_length(song_name) between 1 and 160),
  artist text not null default '',
  artwork_url text,
  duration_min integer not null check (duration_min between 1 and 600),
  memo text not null default '' check (char_length(memo) <= 1000),
  focus text not null default '',
  rating integer not null default 3 check (rating between 1 and 5),
  practiced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists practice_posts_created_at_idx
  on public.practice_posts (created_at desc);
create index if not exists practice_posts_user_id_idx
  on public.practice_posts (user_id);

alter table public.profiles enable row level security;
alter table public.practice_posts enable row level security;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Authenticated users can view practice posts"
  on public.practice_posts for select
  to authenticated
  using (true);

create policy "Users can create their own practice posts"
  on public.practice_posts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own practice posts"
  on public.practice_posts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own practice posts"
  on public.practice_posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.practice_posts to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'ギタリスト'
      ),
      30
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter publication supabase_realtime add table public.practice_posts;
