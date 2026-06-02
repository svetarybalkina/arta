create table if not exists public.profiles (
  user_id uuid primary key,
  generations_left integer not null default 0,
  promo_applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  style_id text not null,
  result_url text not null,
  storage_path text,
  hall_consent boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null,
  image_url text not null,
  storage_path text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.hall_of_fame enable row level security;
