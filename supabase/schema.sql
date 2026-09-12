create table if not exists public.live_state (
  id integer primary key default 1 check (id = 1),
  song_id text,
  status text not null default 'idle' check (status in ('idle', 'playing', 'paused')),
  position_ms bigint not null default 0 check (position_ms >= 0),
  started_at_ms bigint,
  effective_at_ms bigint not null default 0,
  duration_ms bigint check (duration_ms is null or duration_ms > 0),
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.live_state
add column if not exists duration_ms bigint;

insert into public.live_state (id)
values (1)
on conflict (id) do nothing;

alter table public.live_state replica identity full;
alter table public.live_state enable row level security;

drop policy if exists "Public can read live state" on public.live_state;
create policy "Public can read live state"
on public.live_state for select
to anon, authenticated
using (true);

-- Trình duyệt chỉ được đọc; mọi lệnh điều khiển đi qua API dùng service-role key.
revoke insert, update, delete on public.live_state from anon, authenticated;
grant select on public.live_state to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_state'
  ) then
    alter publication supabase_realtime add table public.live_state;
  end if;
end $$;
