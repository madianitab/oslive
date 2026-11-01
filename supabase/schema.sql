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

-- ============================================================
-- 7. Sugestões (botão "Sugestão" em todas as páginas)
--    Quem está logado envia; só a administradora lê e marca como lida.
-- ============================================================
create table if not exists public.sugestoes (
  id         bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo       text not null default 'sugestao'
             check (tipo in ('sugestao', 'erro', 'duvida')),
  pagina     text check (char_length(pagina) <= 200),
  texto      text not null check (char_length(btrim(texto)) between 5 and 2000),
  lida       boolean not null default false,
  criado_em  timestamptz not null default now()
);

alter table public.sugestoes enable row level security;
revoke all on public.sugestoes from anon, authenticated;

-- o cliente só informa tipo, página e texto; autor, data e "lida" vêm do banco
grant insert (tipo, pagina, texto) on public.sugestoes to authenticated;
grant select on public.sugestoes to authenticated;
grant update (lida) on public.sugestoes to authenticated;

drop policy if exists sugestoes_insert on public.sugestoes;
create policy sugestoes_insert on public.sugestoes
  for insert to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists sugestoes_select on public.sugestoes;
create policy sugestoes_select on public.sugestoes
  for select to authenticated
  using (usuario_id = auth.uid() or public.meu_papel() = 'admin');

drop policy if exists sugestoes_update on public.sugestoes;
create policy sugestoes_update on public.sugestoes
  for update to authenticated
  using (public.meu_papel() = 'admin')
  with check (public.meu_papel() = 'admin');

-- limite contra abuso: no máximo 5 sugestões por hora por usuário
create or replace function public.limitar_sugestoes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.sugestoes
       where usuario_id = new.usuario_id
         and criado_em > now() - interval '1 hour') >= 5 then
    raise exception 'Limite de 5 sugestões por hora atingido. Tente mais tarde.';
  end if;
  return new;
end $$;

drop trigger if exists antes_de_sugestao on public.sugestoes;
create trigger antes_de_sugestao
  before insert on public.sugestoes
  for each row execute function public.limitar_sugestoes();

-- e-mail e nome de quem enviou, só para a administradora
create or replace function public.listar_sugestoes()
returns table (id bigint, tipo text, pagina text, texto text, lida boolean,
               criado_em timestamptz, email text, nome text)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.meu_papel() is distinct from 'admin' then
    raise exception 'Apenas a administradora pode ver as sugestões';
  end if;
  return query
    select s.id, s.tipo, s.pagina, s.texto, s.lida, s.criado_em, p.email, p.nome
      from public.sugestoes s left join public.perfis p on p.id = s.usuario_id
     order by s.lida, s.criado_em desc;
end $$;

revoke all on function public.listar_sugestoes() from public, anon;
grant execute on function public.listar_sugestoes() to authenticated;

-- ============================================================
-- 8. Turmas e matrícula por e-mail (avaliações)
--    Professor (ou a admin) cria a turma e cola os e-mails dos alunos.
--    O aluno vê só as turmas em que o e-mail da conta Google dele está.
--    Ninguém altera as tabelas diretamente: só pelas funções abaixo.
-- ============================================================
create table if not exists public.turmas (
  id           bigint generated always as identity primary key,
  nome         text not null check (char_length(btrim(nome)) between 2 and 120),
  professor_id uuid not null references auth.users(id) on delete cascade,
  criado_em    timestamptz not null default now()
);

create table if not exists public.turma_alunos (
  turma_id    bigint not null references public.turmas(id) on delete cascade,
  email       text not null
              check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                     and char_length(email) <= 254),
  incluido_em timestamptz not null default now(),
  primary key (turma_id, email)
);
create index if not exists turma_alunos_email on public.turma_alunos (email);

alter table public.turmas enable row level security;
alter table public.turma_alunos enable row level security;
revoke all on public.turmas, public.turma_alunos from anon, authenticated;
grant select on public.turmas, public.turma_alunos to authenticated;

-- e-mail de quem está logado (vem de auth.users, pelo perfil)
create or replace function public.meu_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(email) from public.perfis where id = auth.uid()
$$;

-- a admin gerencia todas as turmas; o professor, só as dele
create or replace function public.gerencia_turma(t bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.meu_papel() = 'admin'
      or (public.meu_papel() = 'professor'
          and exists (select 1 from public.turmas where id = t and professor_id = auth.uid()))
$$;

drop policy if exists turmas_select on public.turmas;
create policy turmas_select on public.turmas
  for select to authenticated
  using (public.gerencia_turma(id)
         or exists (select 1 from public.turma_alunos a
                     where a.turma_id = id and a.email = public.meu_email()));

drop policy if exists turma_alunos_select on public.turma_alunos;
create policy turma_alunos_select on public.turma_alunos
  for select to authenticated
  using (public.gerencia_turma(turma_id) or email = public.meu_email());

-- cria turma (admin ou professor); devolve o id
create or replace function public.criar_turma(nome_turma text)
returns bigint language plpgsql security definer set search_path = public as $$
declare novo bigint;
begin
  if public.meu_papel() not in ('admin', 'professor') then
    raise exception 'Apenas professores podem criar turmas';
  end if;
  insert into public.turmas (nome, professor_id) values (btrim(nome_turma), auth.uid())
  returning id into novo;
  return novo;
end $$;

create or replace function public.renomear_turma(t bigint, nome_turma text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.gerencia_turma(t) then raise exception 'Sem permissão para esta turma'; end if;
  update public.turmas set nome = btrim(nome_turma) where id = t;
end $$;

create or replace function public.excluir_turma(t bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.gerencia_turma(t) then raise exception 'Sem permissão para esta turma'; end if;
  delete from public.turmas where id = t;
end $$;

-- inclui e-mails (normaliza; ignora repetidos); devolve quantos entraram
create or replace function public.matricular(t bigint, emails text[])
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.gerencia_turma(t) then raise exception 'Sem permissão para esta turma'; end if;
  if coalesce(array_length(emails, 1), 0) > 500 then
    raise exception 'No máximo 500 e-mails por vez';
  end if;
  insert into public.turma_alunos (turma_id, email)
  select distinct t, lower(btrim(e)) from unnest(emails) e
   where lower(btrim(e)) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(btrim(e)) <= 254
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.desmatricular(t bigint, email_aluno text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.gerencia_turma(t) then raise exception 'Sem permissão para esta turma'; end if;
  delete from public.turma_alunos where turma_id = t and email = lower(btrim(email_aluno));
end $$;

-- turmas que a pessoa gerencia, com professor e número de alunos
create or replace function public.listar_turmas()
returns table (id bigint, nome text, professor_email text, alunos bigint, criado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.meu_papel() not in ('admin', 'professor') then
    raise exception 'Apenas professores podem ver as turmas';
  end if;
  return query
    select t.id, t.nome, p.email, (select count(*) from public.turma_alunos a where a.turma_id = t.id), t.criado_em
      from public.turmas t left join public.perfis p on p.id = t.professor_id
     where public.gerencia_turma(t.id)
     order by t.criado_em desc;
end $$;

-- alunos da turma; "entrou" diz se o e-mail já fez login no OSLive
create or replace function public.alunos_da_turma(t bigint)
returns table (email text, nome text, entrou boolean, incluido_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.gerencia_turma(t) then raise exception 'Sem permissão para esta turma'; end if;
  return query
    select a.email, p.nome, p.id is not null, a.incluido_em
      from public.turma_alunos a left join public.perfis p on lower(p.email) = a.email
     where a.turma_id = t
     order by a.email;
end $$;

revoke all on function public.meu_email(), public.gerencia_turma(bigint),
  public.criar_turma(text), public.renomear_turma(bigint, text), public.excluir_turma(bigint),
  public.matricular(bigint, text[]), public.desmatricular(bigint, text),
  public.listar_turmas(), public.alunos_da_turma(bigint) from public, anon;
grant execute on function public.meu_email(), public.gerencia_turma(bigint),
  public.criar_turma(text), public.renomear_turma(bigint, text), public.excluir_turma(bigint),
  public.matricular(bigint, text[]), public.desmatricular(bigint, text),
  public.listar_turmas(), public.alunos_da_turma(bigint) to authenticated;

-- ============================================================
-- 9. Avaliações (provas)
--    A professora cria a prova para uma turma: horário, duração, senha,
--    valor total e o modelo (lista de tipos de questão). Cada aluno recebe
--    as mesmas questões com valores diferentes (semente própria, secreta).
--    As questões são geradas e corrigidas na função "avaliacao" do Supabase
--    (supabase/functions/avaliacao); o gabarito nunca vai para o navegador.
--    Ninguém lê ou altera estas tabelas diretamente: só pelas funções abaixo.
-- ============================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.avaliacoes (
  id          bigint generated always as identity primary key,
  turma_id    bigint not null references public.turmas(id) on delete cascade,
  titulo      text not null check (char_length(btrim(titulo)) between 2 and 120),
  inicio      timestamptz not null,
  fim         timestamptz not null,
  duracao_min integer not null check (duracao_min between 5 and 600),
  valor_total numeric(6,2) not null check (valor_total > 0 and valor_total <= 1000),
  modelo      jsonb not null check (jsonb_typeof(modelo) = 'array'
                                    and jsonb_array_length(modelo) between 1 and 20),
  senha_hash  text not null,
  liberada    boolean not null default false,
  criado_por  uuid not null references auth.users(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  check (fim > inicio)
);

-- notas e correção para o aluno: a professora libera depois que a prova fecha (seção 11)
alter table public.avaliacoes add column if not exists notas_liberadas   boolean not null default false;
alter table public.avaliacoes add column if not exists correcao_liberada boolean not null default false;

create table if not exists public.tentativas (
  id           bigint generated always as identity primary key,
  avaliacao_id bigint not null references public.avaliacoes(id) on delete cascade,
  aluno_id     uuid not null references auth.users(id) on delete cascade,
  email        text not null,
  -- semente secreta: com ela e o código aberto dos geradores daria para calcular o gabarito
  semente      text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  iniciada_em  timestamptz not null default now(),
  prazo        timestamptz not null,
  respostas    jsonb not null default '{}'::jsonb,
  salva_em     timestamptz,
  enviada_em   timestamptz,
  envio        text check (envio in ('aluno', 'tempo')),
  nota         numeric(6,2),
  correcao     jsonb,
  ip_inicio    text check (char_length(ip_inicio) <= 100),
  ip_envio     text check (char_length(ip_envio) <= 100),
  navegador    text check (char_length(navegador) <= 300),
  unique (avaliacao_id, aluno_id)
);

create table if not exists public.senha_falhas (
  avaliacao_id bigint not null references public.avaliacoes(id) on delete cascade,
  aluno_id     uuid not null,
  em           timestamptz not null default now()
);
create index if not exists senha_falhas_idx on public.senha_falhas (avaliacao_id, aluno_id, em);

alter table public.avaliacoes enable row level security;
alter table public.tentativas enable row level security;
alter table public.senha_falhas enable row level security;
revoke all on public.avaliacoes, public.tentativas, public.senha_falhas from anon, authenticated;

-- ── professora / professor ──────────────────────────────────

-- cria (p_id nulo) ou altera uma avaliação; senha nula na alteração mantém a atual
create or replace function public.salvar_avaliacao(
  p_id bigint, p_turma bigint, p_titulo text, p_inicio timestamptz, p_fim timestamptz,
  p_duracao integer, p_valor numeric, p_modelo jsonb, p_senha text, p_liberada boolean)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  atual public.avaliacoes;
  novo_id bigint;
begin
  if not public.gerencia_turma(p_turma) then raise exception 'Sem permissão para esta turma'; end if;
  if p_senha is not null and char_length(p_senha) not between 4 and 64 then
    raise exception 'A senha deve ter de 4 a 64 caracteres';
  end if;

  if p_id is null then
    if p_senha is null then raise exception 'Informe a senha da prova'; end if;
    insert into public.avaliacoes (turma_id, titulo, inicio, fim, duracao_min, valor_total, modelo, senha_hash, liberada, criado_por)
    values (p_turma, btrim(p_titulo), p_inicio, p_fim, p_duracao, p_valor, p_modelo,
            extensions.crypt(p_senha, extensions.gen_salt('bf')), coalesce(p_liberada, false), auth.uid())
    returning id into novo_id;
    return novo_id;
  end if;

  select * into atual from public.avaliacoes where id = p_id;
  if atual.id is null or not public.gerencia_turma(atual.turma_id) then
    raise exception 'Avaliação não encontrada';
  end if;
  -- com notas ou correção liberadas, a prova não pode ser reaberta (o gabarito já está com os alunos)
  if (atual.notas_liberadas or atual.correcao_liberada) and p_fim > now() then
    raise exception 'As notas ou a correção estão liberadas: oculte-as antes de reabrir a prova';
  end if;
  -- depois que alguém começou, as questões e o valor não mudam (as notas ficariam inconsistentes)
  if exists (select 1 from public.tentativas where avaliacao_id = p_id)
     and (atual.modelo is distinct from p_modelo or atual.valor_total <> p_valor or atual.turma_id <> p_turma) then
    raise exception 'Alunos já começaram esta prova: as questões, o valor e a turma não podem mais mudar';
  end if;
  update public.avaliacoes set
    turma_id = p_turma, titulo = btrim(p_titulo), inicio = p_inicio, fim = p_fim,
    duracao_min = p_duracao, valor_total = p_valor, modelo = p_modelo, liberada = coalesce(p_liberada, liberada),
    senha_hash = case when p_senha is null then senha_hash
                      else extensions.crypt(p_senha, extensions.gen_salt('bf')) end
  where id = p_id;
  return p_id;
end $$;

create or replace function public.excluir_avaliacao(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.avaliacoes a where a.id = p_id and public.gerencia_turma(a.turma_id)) then
    raise exception 'Avaliação não encontrada';
  end if;
  delete from public.avaliacoes where id = p_id;
end $$;

drop function if exists public.listar_avaliacoes();
create or replace function public.listar_avaliacoes()
returns table (id bigint, turma_id bigint, turma text, titulo text, inicio timestamptz, fim timestamptz,
               duracao_min integer, valor_total numeric, modelo jsonb, liberada boolean,
               iniciadas bigint, enviadas bigint, notas_liberadas boolean, correcao_liberada boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.meu_papel() not in ('admin', 'professor') then
    raise exception 'Apenas professores podem ver as avaliações';
  end if;
  return query
    select a.id, a.turma_id, t.nome, a.titulo, a.inicio, a.fim, a.duracao_min, a.valor_total, a.modelo, a.liberada,
           (select count(*) from public.tentativas x where x.avaliacao_id = a.id),
           (select count(*) from public.tentativas x where x.avaliacao_id = a.id and x.enviada_em is not null),
           a.notas_liberadas, a.correcao_liberada
      from public.avaliacoes a join public.turmas t on t.id = a.turma_id
     where public.gerencia_turma(a.turma_id)
     order by a.inicio desc;
end $$;

-- ── aluno ───────────────────────────────────────────────────

-- avaliações liberadas das turmas do aluno, com a situação dele em cada uma;
-- a nota só aparece com as notas liberadas, e "correcao" diz se ele pode ver a prova corrigida
drop function if exists public.minhas_avaliacoes();
create or replace function public.minhas_avaliacoes()
returns table (id bigint, titulo text, turma text, inicio timestamptz, fim timestamptz,
               duracao_min integer, questoes integer, situacao text, prazo timestamptz,
               nota numeric, valor_total numeric, correcao boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.titulo, t.nome, a.inicio, a.fim, a.duracao_min, jsonb_array_length(a.modelo),
         case
           when x.enviada_em is not null then 'enviada'
           when x.id is not null and now() <= x.prazo then 'em_andamento'
           when x.id is not null then 'tempo_esgotado'
           when now() < a.inicio then 'em_breve'
           when now() <= a.fim then 'aberta'
           else 'encerrada'
         end,
         x.prazo,
         case when a.notas_liberadas and x.enviada_em is not null then x.nota end,
         case when a.notas_liberadas then a.valor_total end,
         a.correcao_liberada and x.enviada_em is not null and x.correcao is not null
    from public.avaliacoes a
    join public.turmas t on t.id = a.turma_id
    left join public.tentativas x on x.avaliacao_id = a.id and x.aluno_id = auth.uid()
   where a.liberada
     and exists (select 1 from public.turma_alunos m where m.turma_id = a.turma_id and m.email = public.meu_email())
   order by a.inicio desc
$$;

-- ── só a função "avaliacao" do Supabase (service_role) ──────

-- começa ou retoma a prova; confere turma, horário, senha e tentativas de senha
create or replace function public.iniciar_tentativa(
  p_avaliacao bigint, p_aluno uuid, p_senha text, p_ip text, p_navegador text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.avaliacoes;
  x public.tentativas;
  v_email text;
begin
  select lower(email) into v_email from public.perfis where id = p_aluno;
  select * into a from public.avaliacoes where id = p_avaliacao and liberada;
  if a.correcao_liberada then return jsonb_build_object('erro', 'O prazo da prova terminou.'); end if;
  if a.id is null or v_email is null
     or not exists (select 1 from public.turma_alunos m where m.turma_id = a.turma_id and m.email = v_email) then
    return jsonb_build_object('erro', 'Avaliação não encontrada.');
  end if;

  -- no máximo 5 senhas erradas a cada 10 minutos
  if (select count(*) from public.senha_falhas f
       where f.avaliacao_id = a.id and f.aluno_id = p_aluno and f.em > now() - interval '10 minutes') >= 5 then
    return jsonb_build_object('erro', 'Muitas senhas erradas. Aguarde 10 minutos.');
  end if;
  if p_senha is null or extensions.crypt(p_senha, a.senha_hash) <> a.senha_hash then
    insert into public.senha_falhas (avaliacao_id, aluno_id) values (a.id, p_aluno);
    return jsonb_build_object('erro', 'Senha incorreta.');
  end if;

  select * into x from public.tentativas where avaliacao_id = a.id and aluno_id = p_aluno;
  if x.id is not null and x.enviada_em is not null then
    return jsonb_build_object('erro', 'Você já enviou esta prova.');
  end if;
  if x.id is null then
    if now() < a.inicio then return jsonb_build_object('erro', 'A prova ainda não começou.'); end if;
    if now() > a.fim then return jsonb_build_object('erro', 'O prazo da prova terminou.'); end if;
    insert into public.tentativas (avaliacao_id, aluno_id, email, prazo, ip_inicio, navegador)
    values (a.id, p_aluno, v_email, least(now() + make_interval(mins => a.duracao_min), a.fim),
            left(p_ip, 100), left(p_navegador, 300))
    returning * into x;
  end if;

  return jsonb_build_object(
    'id', x.id, 'semente', x.semente, 'modelo', a.modelo, 'titulo', a.titulo,
    'valor_total', a.valor_total, 'prazo', x.prazo, 'agora', now(), 'respostas', x.respostas,
    'esgotado', now() > x.prazo + interval '1 minute');
end $$;

-- salva as respostas durante a prova (até 1 minuto de tolerância após o prazo)
create or replace function public.salvar_respostas(p_tentativa bigint, p_aluno uuid, p_respostas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare x public.tentativas;
begin
  select * into x from public.tentativas where id = p_tentativa and aluno_id = p_aluno;
  if x.id is null then return jsonb_build_object('erro', 'Prova não encontrada.'); end if;
  if x.enviada_em is not null then return jsonb_build_object('erro', 'A prova já foi enviada.'); end if;
  if now() > x.prazo + interval '1 minute' then return jsonb_build_object('erro', 'O tempo da prova terminou.'); end if;
  if jsonb_typeof(p_respostas) <> 'object' or pg_column_size(p_respostas) > 65536 then
    return jsonb_build_object('erro', 'Respostas inválidas.');
  end if;
  update public.tentativas set respostas = p_respostas, salva_em = now() where id = x.id;
  return jsonb_build_object('ok', true, 'salva_em', now());
end $$;

-- dados para corrigir (inclui a semente); só a função do servidor chama
create or replace function public.tentativa_para_correcao(p_tentativa bigint, p_aluno uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', x.id, 'semente', x.semente, 'modelo', a.modelo, 'valor_total', a.valor_total,
    'respostas', x.respostas, 'enviada', x.enviada_em is not null,
    'no_prazo', now() <= x.prazo + interval '1 minute')
    from public.tentativas x join public.avaliacoes a on a.id = x.avaliacao_id
   where x.id = p_tentativa and x.aluno_id = p_aluno
$$;

-- grava o envio e a nota (uma vez só)
create or replace function public.finalizar_tentativa(
  p_tentativa bigint, p_aluno uuid, p_respostas jsonb, p_nota numeric, p_correcao jsonb, p_envio text, p_ip text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_envio not in ('aluno', 'tempo') then raise exception 'Envio inválido'; end if;
  update public.tentativas set
    respostas = p_respostas, nota = p_nota, correcao = p_correcao,
    enviada_em = now(), envio = p_envio, ip_envio = left(p_ip, 100)
  where id = p_tentativa and aluno_id = p_aluno and enviada_em is null;
  if not found then return jsonb_build_object('erro', 'A prova já foi enviada.'); end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.salvar_avaliacao(bigint, bigint, text, timestamptz, timestamptz, integer, numeric, jsonb, text, boolean),
  public.excluir_avaliacao(bigint), public.listar_avaliacoes(), public.minhas_avaliacoes(),
  public.iniciar_tentativa(bigint, uuid, text, text, text), public.salvar_respostas(bigint, uuid, jsonb),
  public.tentativa_para_correcao(bigint, uuid),
  public.finalizar_tentativa(bigint, uuid, jsonb, numeric, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.salvar_avaliacao(bigint, bigint, text, timestamptz, timestamptz, integer, numeric, jsonb, text, boolean),
  public.excluir_avaliacao(bigint), public.listar_avaliacoes(), public.minhas_avaliacoes() to authenticated;
grant execute on function public.iniciar_tentativa(bigint, uuid, text, text, text), public.salvar_respostas(bigint, uuid, jsonb),
  public.tentativa_para_correcao(bigint, uuid),
  public.finalizar_tentativa(bigint, uuid, jsonb, numeric, jsonb, text, text) to service_role;

-- ============================================================
-- 10. Resultados das avaliações (professor e admin)
-- ============================================================

-- todos os alunos da turma, tenham começado ou não
drop function if exists public.resultados_avaliacao(bigint);
create or replace function public.resultados_avaliacao(p_avaliacao bigint)
returns table (tentativa bigint, email text, nome text, situacao text, iniciada_em timestamptz,
               prazo timestamptz, enviada_em timestamptz, envio text, nota numeric,
               ip_inicio text, ip_envio text, navegador text, notas_questoes jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_turma bigint;
begin
  select a.turma_id into v_turma from public.avaliacoes a where a.id = p_avaliacao;
  if v_turma is null or not public.gerencia_turma(v_turma) then raise exception 'Avaliação não encontrada'; end if;
  return query
    select x.id, m.email, p.nome,
           case when x.id is null then 'nao_iniciou'
                when x.enviada_em is not null then 'enviada'
                when now() <= x.prazo then 'em_andamento'
                else 'tempo_esgotado' end,
           x.iniciada_em, x.prazo, x.enviada_em, x.envio, x.nota, x.ip_inicio, x.ip_envio, x.navegador,
           (select jsonb_agg(q->'nota') from jsonb_array_elements(x.correcao->'questoes') q)
      from public.turma_alunos m
      left join public.tentativas x on x.avaliacao_id = p_avaliacao and x.email = m.email
      left join public.perfis p on lower(p.email) = m.email
     where m.turma_id = v_turma
    union all
    -- quem fez a prova e depois saiu da turma continua aparecendo
    select x.id, x.email, p.nome,
           case when x.enviada_em is not null then 'enviada' when now() <= x.prazo then 'em_andamento' else 'tempo_esgotado' end,
           x.iniciada_em, x.prazo, x.enviada_em, x.envio, x.nota, x.ip_inicio, x.ip_envio, x.navegador,
           (select jsonb_agg(q->'nota') from jsonb_array_elements(x.correcao->'questoes') q)
      from public.tentativas x left join public.perfis p on p.id = x.aluno_id
     where x.avaliacao_id = p_avaliacao
       and not exists (select 1 from public.turma_alunos m where m.turma_id = v_turma and m.email = x.email)
     order by 2;
end $$;

-- prova de um aluno para revisão: a semente permite gerar de novo as mesmas questões no navegador da professora
create or replace function public.tentativa_detalhe(p_tentativa bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  select jsonb_build_object(
      'id', x.id, 'email', x.email, 'semente', x.semente, 'modelo', a.modelo, 'valor_total', a.valor_total,
      'respostas', x.respostas, 'correcao', x.correcao, 'nota', x.nota, 'iniciada_em', x.iniciada_em,
      'prazo', x.prazo, 'enviada_em', x.enviada_em, 'envio', x.envio, 'turma_id', a.turma_id)
    into r
    from public.tentativas x join public.avaliacoes a on a.id = x.avaliacao_id
   where x.id = p_tentativa;
  if r is null or not public.gerencia_turma((r->>'turma_id')::bigint) then raise exception 'Prova não encontrada'; end if;
  return r - 'turma_id';
end $$;

-- encerra, com as respostas salvas, uma prova cujo tempo acabou sem envio
-- (a nota é calculada no navegador da professora com o mesmo código da função do servidor)
create or replace function public.encerrar_por_tempo(p_tentativa bigint, p_nota numeric, p_correcao jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare x public.tentativas; v_turma bigint; v_valor numeric;
begin
  select * into x from public.tentativas where id = p_tentativa;
  select a.turma_id, a.valor_total into v_turma, v_valor from public.avaliacoes a where a.id = x.avaliacao_id;
  if x.id is null or not public.gerencia_turma(v_turma) then raise exception 'Prova não encontrada'; end if;
  if x.enviada_em is not null then raise exception 'Esta prova já foi enviada'; end if;
  if now() <= x.prazo + interval '1 minute' then raise exception 'O tempo deste aluno ainda não acabou'; end if;
  if p_nota < 0 or p_nota > v_valor then raise exception 'Nota inválida'; end if;
  update public.tentativas
     set nota = p_nota, correcao = p_correcao, enviada_em = now(), envio = 'tempo'
   where id = p_tentativa and enviada_em is null;
end $$;

-- libera uma nova tentativa (ex.: problema técnico): apaga a tentativa do aluno
create or replace function public.liberar_nova_tentativa(p_tentativa bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_turma bigint; v_correcao boolean;
begin
  select a.turma_id, a.correcao_liberada into v_turma, v_correcao
    from public.tentativas x join public.avaliacoes a on a.id = x.avaliacao_id where x.id = p_tentativa;
  if v_turma is null or not public.gerencia_turma(v_turma) then raise exception 'Prova não encontrada'; end if;
  if v_correcao then raise exception 'A correção está liberada: oculte-a antes de dar nova tentativa'; end if;
  delete from public.tentativas where id = p_tentativa;
end $$;

revoke all on function public.resultados_avaliacao(bigint), public.tentativa_detalhe(bigint),
  public.encerrar_por_tempo(bigint, numeric, jsonb), public.liberar_nova_tentativa(bigint) from public, anon;
grant execute on function public.resultados_avaliacao(bigint), public.tentativa_detalhe(bigint),
  public.encerrar_por_tempo(bigint, numeric, jsonb), public.liberar_nova_tentativa(bigint) to authenticated;

-- ============================================================
-- 11. Notas e correção para o aluno
--    A professora libera (ou oculta) as notas e a correção de cada prova,
--    só depois que ela fecha (fim + 1 minuto de tolerância). Com a correção
--    liberada, o aluno vê a própria prova corrigida: recebe a semente dele e
--    gera as mesmas questões no navegador. Enquanto algo estiver liberado,
--    a prova não pode ser reaberta nem ganhar nova tentativa.
-- ============================================================

create or replace function public.liberar_resultados(p_avaliacao bigint, p_notas boolean, p_correcao boolean)
returns void language plpgsql security definer set search_path = public as $$
declare a public.avaliacoes;
begin
  select * into a from public.avaliacoes where id = p_avaliacao;
  if a.id is null or not public.gerencia_turma(a.turma_id) then raise exception 'Avaliação não encontrada'; end if;
  if (coalesce(p_notas, false) or coalesce(p_correcao, false)) and now() <= a.fim + interval '1 minute' then
    raise exception 'Só é possível liberar depois que a prova fechar';
  end if;
  update public.avaliacoes
     set notas_liberadas = coalesce(p_notas, notas_liberadas),
         correcao_liberada = coalesce(p_correcao, correcao_liberada)
   where id = p_avaliacao;
end $$;

-- prova corrigida do próprio aluno (só com a correção liberada e a prova enviada);
-- a nota e os pontos de cada questão só vêm com as notas liberadas
create or replace function public.minha_correcao(p_avaliacao bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.avaliacoes; x public.tentativas;
begin
  select * into a from public.avaliacoes where id = p_avaliacao and liberada;
  select * into x from public.tentativas where avaliacao_id = p_avaliacao and aluno_id = auth.uid();
  if a.id is null or not a.correcao_liberada or x.id is null or x.enviada_em is null or x.correcao is null then
    raise exception 'Correção não disponível';
  end if;
  return jsonb_build_object(
    'titulo', a.titulo, 'semente', x.semente, 'modelo', a.modelo, 'respostas', x.respostas,
    'nota', case when a.notas_liberadas then x.nota end,
    'valor_total', case when a.notas_liberadas then a.valor_total end,
    'questoes', (select jsonb_agg(case when a.notas_liberadas then q
                                       else jsonb_build_object('campos', q->'campos') end order by i)
                   from jsonb_array_elements(x.correcao->'questoes') with ordinality as e(q, i)));
end $$;

revoke all on function public.liberar_resultados(bigint, boolean, boolean), public.minha_correcao(bigint) from public, anon;
grant execute on function public.liberar_resultados(bigint, boolean, boolean), public.minha_correcao(bigint) to authenticated;
