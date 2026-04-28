create table if not exists public.telegram_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_user_id_idx
  on public.telegram_link_tokens (user_id);

create index if not exists telegram_link_tokens_expires_at_idx
  on public.telegram_link_tokens (expires_at);

alter table public.telegram_link_tokens enable row level security;

revoke all on public.telegram_link_tokens from anon, authenticated;
