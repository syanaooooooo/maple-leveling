-- 一个账号管所有 app 的共用数据表 + RLS
-- 在 Supabase 后台 → SQL Editor 里整段粘贴执行一次即可。
--
-- 为什么不叫 app_data：那个名字已经被 baby-food-tracker 的单行表占了。
-- 为什么不用共用的 snapshots 表：那张表是 anon 可读写的，
-- calendairy / klassik / fitness / bobing 都还靠它，给它开 RLS 会把那些 app 一起搞挂。

create table if not exists public.user_data (
  id         bigint      generated always as identity primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  app        text        not null,                 -- 'bh' / 'ft' / 'maple' / 'bobing' …
  name       text        not null default 'main',  -- 'main' / 'slot_1' / 'auto_2026-09-22' …
  data       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app, name)
);

create index if not exists user_data_user_app_idx on public.user_data (user_id, app);

alter table public.user_data enable row level security;

-- for all 一条策略覆盖增删改查（快照功能要用到 delete）
drop policy if exists "own rows" on public.user_data;
create policy "own rows" on public.user_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

select relrowsecurity as rls_on from pg_class where relname = 'user_data';
select policyname, cmd from pg_policies where tablename = 'user_data';
