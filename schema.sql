-- ============================================================
-- FINANÇAS DO CASAL — Schema Supabase
-- Cole isso no SQL Editor do seu projeto Supabase
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_initials text not null default 'EU',
  partner_id uuid references profiles(id) on delete set null,
  couple_code text unique,
  created_at timestamptz default now()
);

create table if not exists boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  bank text not null check (bank in ('Nubank', 'Itaú')),
  current_amount numeric(12,2) default 0,
  goal_amount numeric(12,2) not null,
  color text default 'teal',
  is_couple_goal boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null,
  category text not null check (category in (
    'Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Vestuário','Outros'
  )),
  is_shared boolean default false,
  expense_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  month int not null,
  year int not null,
  created_at timestamptz default now(),
  unique(user_id, month, year)
);

-- ============================================================
-- RLS
-- ============================================================
alter table profiles enable row level security;
alter table boxes enable row level security;
alter table expenses enable row level security;
alter table income enable row level security;

create policy "profiles_select" on profiles for select
  using (id = auth.uid() or id = (
    select partner_id from profiles where id = auth.uid()
  ));
create policy "profiles_insert" on profiles for insert
  with check (id = auth.uid());
create policy "profiles_update" on profiles for update
  using (id = auth.uid());

create policy "boxes_select" on boxes for select
  using (
    user_id = auth.uid() or
    user_id = (select partner_id from profiles where id = auth.uid())
  );
create policy "boxes_insert" on boxes for insert
  with check (user_id = auth.uid());
create policy "boxes_update" on boxes for update
  using (user_id = auth.uid());
create policy "boxes_delete" on boxes for delete
  using (user_id = auth.uid());

create policy "expenses_select" on expenses for select
  using (
    user_id = auth.uid() or
    user_id = (select partner_id from profiles where id = auth.uid())
  );
create policy "expenses_insert" on expenses for insert
  with check (user_id = auth.uid());
create policy "expenses_update" on expenses for update
  using (user_id = auth.uid());
create policy "expenses_delete" on expenses for delete
  using (user_id = auth.uid());

create policy "income_select" on income for select
  using (
    user_id = auth.uid() or
    user_id = (select partner_id from profiles where id = auth.uid())
  );
create policy "income_insert" on income for insert
  with check (user_id = auth.uid());
create policy "income_update" on income for update
  using (user_id = auth.uid());

-- ============================================================
-- Função para vincular parceiros via código
-- ============================================================
create or replace function link_partner(code text)
returns json language plpgsql security definer as $$
declare
  partner_profile profiles%rowtype;
  my_profile profiles%rowtype;
begin
  select * into my_profile from profiles where id = auth.uid();
  select * into partner_profile from profiles where couple_code = code and id != auth.uid();

  if partner_profile.id is null then
    return json_build_object('error', 'Código inválido ou não encontrado');
  end if;
  if my_profile.partner_id is not null then
    return json_build_object('error', 'Você já tem um parceiro vinculado');
  end if;

  update profiles set partner_id = partner_profile.id where id = auth.uid();
  update profiles set partner_id = auth.uid() where id = partner_profile.id;

  return json_build_object('success', true, 'partner_name', partner_profile.name);
end;
$$;
