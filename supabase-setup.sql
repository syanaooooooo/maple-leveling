-- maple-leveling 的云端数据表 + RLS
-- 在 Supabase 后台 → SQL Editor 里整段粘贴执行一次即可。
-- 为什么不用共用的 snapshots 表：那张表是 anon 可读写的，
-- fitness-tracker / bobing 都靠它，给它开 RLS 会把那几个 app 一起搞挂。

-- 1) 建表：一个账号一行
create table if not exists public.maple_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) 打开行级安全。不开的话下面的策略等于没写
alter table public.maple_data enable row level security;

-- 3) 只能碰自己那一行。auth.uid() 是 Supabase 从 JWT 里解出来的当前用户
drop policy if exists "own row select" on public.maple_data;
drop policy if exists "own row insert" on public.maple_data;
drop policy if exists "own row update" on public.maple_data;

create policy "own row select" on public.maple_data
  for select using (auth.uid() = user_id);

create policy "own row insert" on public.maple_data
  for insert with check (auth.uid() = user_id);

create policy "own row update" on public.maple_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) 验一下：应该看到 rowsecurity = true，以及 3 条策略
select relrowsecurity as rls_on from pg_class where relname = 'maple_data';
select policyname, cmd from pg_policies where tablename = 'maple_data';
