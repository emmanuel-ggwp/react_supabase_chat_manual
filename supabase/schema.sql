begin;

create extension if not exists "pgcrypto";

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.search_rooms_by_name(p_search text)
returns table (
  id uuid,
  name text,
  description text,
  created_by uuid,
  created_at timestamptz,
  is_public boolean
)
language sql
stable
as $$
  select
    r.id,
    r.name,
    r.description,
    r.created_by,
    r.created_at,
    r.is_public
  from public.rooms r
  where r.name ilike '%' || coalesce(p_search, '') || '%'
  order by lower(r.name) asc, r.created_at desc;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  is_public boolean not null default true
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  message_type text not null default 'text',
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));
create index if not exists rooms_is_public_created_at_idx on public.rooms (is_public, created_at desc);
create index if not exists rooms_name_idx on public.rooms (lower(name));
create index if not exists messages_room_id_created_at_idx on public.messages (room_id, created_at desc);
create index if not exists messages_user_id_idx on public.messages (user_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;

create policy "Profiles are readable by authenticated users"
  on public.profiles
  for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles
  for delete
  using (auth.uid() = id);

create policy "Public rooms are readable"
  on public.rooms
  for select
  using (is_public or auth.uid() = created_by);

create policy "Users can create rooms"
  on public.rooms
  for insert
  with check (auth.uid() = created_by);

create policy "Users can update rooms they created"
  on public.rooms
  for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Users can delete rooms they created"
  on public.rooms
  for delete
  using (auth.uid() = created_by);

create policy "Messages readable to room members"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.rooms r
      where r.id = room_id
        and (r.is_public or r.created_by = auth.uid() or user_id = auth.uid())
    )
  );

create policy "Users can insert their own messages"
  on public.messages
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.rooms r
      where r.id = room_id
        and (r.is_public or r.created_by = auth.uid())
    )
  );

create policy "Users can update their own messages"
  on public.messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own messages"
  on public.messages
  for delete
  using (auth.uid() = user_id);

commit;
