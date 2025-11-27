begin;

create extension if not exists "pgcrypto";

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
  is_public boolean not null default true,
  is_direct boolean not null default false
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  message_type text not null default 'text',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  is_secret boolean default false
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  created_at timestamptz not null default timezone('utc', now())
);

-- 1. Tabla para almacenar el contenido secreto separado de los mensajes públicos
create table if not exists public.message_secrets (
    message_id uuid primary key references public.messages (id) on delete cascade,
    secret_content text not null,
    created_at timestamptz not null default timezone('utc', now())
);

-- Tabla para registrar qué usuarios ya revelaron el secreto
create table if not exists public.secret_views (
    id uuid primary key default gen_random_uuid(),
    message_id uuid references public.messages (id) on delete cascade,
    user_id uuid references public.profiles (id) on delete cascade,
    viewed_at timestamptz not null default timezone('utc', now()),
    unique(message_id, user_id) -- Candado: Un usuario solo puede tener un registro por mensaje
);

create extension if not exists pg_cron;

select cron.schedule(
  'delete-expired-messages',
  '*/10 * * * *',           
  $$ delete from public.messages where expires_at < now() $$
);

-- Limpiar secretos huérfanos o viejos cada hora
select cron.schedule(
  'cleanup-secrets',
  '0 * * * *', -- Cada hora
  $$ 
    delete from public.message_secrets 
    where created_at < (now() - interval '24 hours') 
  $$
);

do $$
begin
  -- Remove orphaned rows before enforcing FK constraints
  delete from public.room_members rm
  where not exists (
    select 1
    from public.profiles p
    where p.id = rm.user_id
  );

  delete from public.messages m
  where not exists (
    select 1
    from public.profiles p
    where p.id = m.user_id
  );

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'room_members_user_id_fkey'
      and table_name = 'room_members'
      and table_schema = 'public'
  ) then
    alter table public.room_members
      add constraint room_members_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'messages_user_id_fkey'
      and table_name = 'messages'
      and table_schema = 'public'
  ) then
    alter table public.messages
      add constraint messages_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end$$;

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

create or replace function is_user_room_member(room_id uuid, user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.room_members 
    where room_members.room_id = $1 
      and room_members.user_id = $2
  );
end;
$$ language plpgsql security definer;


create unique index if not exists room_members_room_user_key on public.room_members (room_id, user_id);
create index if not exists room_members_user_id_idx on public.room_members (user_id);
create index if not exists room_members_room_id_idx on public.room_members (room_id);

create unique index if not exists profiles_username_key on public.profiles (lower(username));
create index if not exists rooms_is_public_created_at_idx on public.rooms (is_public, created_at desc);
create index if not exists rooms_name_idx on public.rooms (lower(name));
create index if not exists messages_room_id_created_at_idx on public.messages (room_id, created_at desc);
create index if not exists messages_user_id_idx on public.messages (user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;


create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.room_members enable row level security;
alter table public.message_secrets enable row level security;
alter table public.secret_views enable row level security;

alter publication supabase_realtime add table public.messages;
alter table public.messages replica identity full;

alter publication supabase_realtime add table public.room_members;
alter table public.room_members replica identity full;

alter publication supabase_realtime add table public.rooms;
alter table public.rooms replica identity full;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;
drop policy if exists "Public rooms are readable" on public.rooms;
drop policy if exists "Users can create rooms" on public.rooms;
drop policy if exists "Users can update rooms they created" on public.rooms;
drop policy if exists "Users can delete rooms they created" on public.rooms;
drop policy if exists "Members can read private rooms" on public.rooms;
drop policy if exists "Messages readable to room members" on public.messages;
drop policy if exists "Users can insert their own messages" on public.messages;
drop policy if exists "Users can update their own messages" on public.messages;
drop policy if exists "Users can delete their own messages" on public.messages;
drop policy if exists "Room memberships readable by members" on public.room_members;
drop policy if exists "Users can join public rooms" on public.room_members;
drop policy if exists "Owners can add or update memberships" on public.room_members;
drop policy if exists "Members manage their membership" on public.room_members;
drop policy if exists "Owners manage room memberships" on public.room_members;
drop policy if exists "Members can leave rooms" on public.room_members;
drop policy if exists "Owners can remove memberships" on public.room_members;
drop policy if exists "No direct select on secrets" on public.message_secrets;
drop policy if exists "Users can insert secrets" on public.message_secrets;

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

create policy "Members can read private rooms"
on public.rooms
for select
using (
  is_public = true
  or created_by = auth.uid()
  or is_user_room_member(id, auth.uid())
);


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



create policy "Users can update their own messages"
  on public.messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own messages"
  on public.messages
  for delete
  using (auth.uid() = user_id);

  create policy "Room memberships readable by members"
  on public.room_members
  for select
  using (
    auth.uid() = user_id
    or is_user_room_member(room_id, auth.uid())
  );

create policy "Users can join public rooms"
  on public.room_members
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

create policy "Owners can add or update memberships"
  on public.room_members
  for insert
  with check (
    exists (
      select 1
      from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  );

create policy "Members manage their membership"
  on public.room_members
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owners manage room memberships"
  on public.room_members
  for update
  using (
    exists (
      select 1
      from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  )
  with check (true);

create policy "Members can leave rooms"
  on public.room_members
  for delete
  using (auth.uid() = user_id);

create policy "Owners can remove memberships"
  on public.room_members
  for delete
  using (
    exists (
      select 1
      from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  );

create policy "Messages readable to room members"
  on public.messages
  for select
  using (
    (expires_at is null or expires_at > timezone('utc', now()))
    and exists (
      select 1
      from public.rooms r
      left join public.room_members rm on rm.room_id = r.id and rm.user_id = auth.uid()
      where r.id = room_id
        and (
          r.is_public
          or r.created_by = auth.uid()
          or rm.user_id = auth.uid()
        )
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
      left join public.room_members rm on rm.room_id = r.id and rm.user_id = auth.uid()
      where r.id = room_id
        and (
          r.is_public
          or r.created_by = auth.uid()
          or rm.user_id = auth.uid()
        )
    )
  );

-- Política: Nadie puede hacer SELECT directo (se debe usar la función RPC)
create policy "No direct select on secrets" on public.message_secrets for select
using (false);

-- Política: Permitir inserción a usuarios autenticados (al enviar el mensaje)
create policy "Users can insert secrets" on public.message_secrets
for insert
with check (auth.uid() = (select user_id from public.messages where id = message_id));

-- Permitir a los usuarios consultar sus propios registros de vista
drop policy if exists "Users can see their own views" on public.secret_views;
create policy "Users can see their own views"
on public.secret_views
for select
using (auth.uid() = user_id);

-- Permitir a los remitentes ver los recibos de lectura de sus mensajes
drop policy if exists "Senders can view receipts" on public.secret_views;
create policy "Senders can view receipts"
on public.secret_views
for select
using (
  exists (
    select 1 from public.messages
    where messages.id = secret_views.message_id
    and messages.user_id = auth.uid()
  )
);

create or replace function public.read_secret_message(p_message_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_secret text;
begin
  -- 1. Verificar si el usuario ya vio este mensaje
  if exists (
    select 1 from public.secret_views 
    where message_id = p_message_id 
    and user_id = auth.uid()
  ) then
    return null;
  end if;

  -- 2. Obtener el contenido secreto
  select secret_content into v_secret
  from public.message_secrets
  where message_id = p_message_id;

  -- 3. Si existe el contenido, registrar la vista y devolverlo
  if v_secret is not null then
    insert into public.secret_views (message_id, user_id)
    values (p_message_id, auth.uid());
    
    return v_secret;
  end if;

  return null;
end;
$$;

-- Función para columna computada: determina si el mensaje ya fue "leído"
-- Para el remitente: true si ALGUIEN lo leyó.
-- Para el destinatario: true si ÉL MISMO lo leyó.
create or replace function public.is_read_by_user(message_row public.messages)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.secret_views sv
    where sv.message_id = message_row.id
    and (
      -- Si soy el remitente, me importa si alguien (el destinatario) lo vio
      (message_row.user_id = auth.uid())
      or
      -- Si soy el destinatario, me importa si YO lo vi
      (sv.user_id = auth.uid())
    )
  );
$$;

commit;
