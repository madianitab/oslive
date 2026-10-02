-- ============================================================
-- OSLive: perfis de usuário (admin, professor, aluno)
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run.
-- Pode ser rodado de novo sem problema (é idempotente).
-- ============================================================

-- 1. Tabela de perfis (um por usuário do Supabase Auth)
create table if not exists public.perfis (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  nome      text,
  papel     text not null default 'aluno'
            check (papel in ('admin', 'professor', 'aluno')),
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;
revoke all on public.perfis from anon;

-- 2. E-mail da administradora (troque aqui se for usar outra conta Google)
create or replace function public.email_admin()
returns text language sql immutable as $$
  select 'madianitab@gmail.com'::text
$$;

-- 3. Todo usuário novo vira "aluno" (ou "admin", se for o e-mail acima)
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email, nome, papel)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    case when lower(new.email) = public.email_admin() then 'admin' else 'aluno' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Usuários que já existiam antes deste script
insert into public.perfis (id, email, nome, papel)
select id, email,
       coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
       case when lower(email) = public.email_admin() then 'admin' else 'aluno' end
from auth.users
on conflict (id) do nothing;

-- 4. Papel de quem está logado (usado nas regras abaixo)
create or replace function public.meu_papel()
returns text language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid()
$$;

-- 5. Leitura: cada um vê o próprio perfil; professor e admin veem todos
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.meu_papel() in ('admin', 'professor'));

-- Não há políticas de insert/update/delete: ninguém altera a tabela
-- diretamente. Só o gatilho acima e a função abaixo.

-- 6. Só a administradora muda papéis (aluno ↔ professor)
create or replace function public.definir_papel(alvo uuid, novo_papel text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.meu_papel() is distinct from 'admin' then
    raise exception 'Apenas a administradora pode alterar papéis';
  end if;
  if novo_papel not in ('professor', 'aluno') then
    raise exception 'Papel inválido: %', novo_papel;
  end if;
  update public.perfis set papel = novo_papel
   where id = alvo and papel <> 'admin';
end $$;

revoke all on function public.definir_papel(uuid, text) from public, anon;
grant execute on function public.definir_papel(uuid, text) to authenticated;
