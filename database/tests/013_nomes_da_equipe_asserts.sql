-- Nomes da equipe para gestor e operador. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261018010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _auth uuid;
  _cartorio uuid;
  _total bigint;
  _n bigint;
  _anon_ok boolean := false;
  _seen uuid[];
begin
  -- um usuário ativo SEM perfil de administrador, num cartório com mais de um usuário
  select u.auth_user_id, u.cartorio_id into _auth, _cartorio
  from public.usuarios u
  where u.status = 'ativo' and u.auth_user_id is not null
    and not exists (select 1 from public.user_roles r where r.user_id = u.id
                    and r.role in ('CARTORIO_ADMIN', 'PLATFORM_ADMIN'))
    and (select count(*) from public.usuarios o where o.cartorio_id = u.cartorio_id) > 1
  limit 1;
  if _auth is null then
    raise exception 'FALHA pré: nenhum gestor/operador ativo em cartório com mais de um usuário';
  end if;
  select count(*) into _total from public.usuarios where cartorio_id = _cartorio;

  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_auth)::text, true);
  execute 'set local role authenticated';

  -- a) vê o nome de todos os colegas do próprio cartório (antes: só o próprio)
  select count(*) into _n from public.list_team_members();
  if _n <> _total then raise exception 'FALHA a: viu % de % usuários do cartório', _n, _total; end if;

  -- b) nenhum id de outro cartório
  select array_agg(t.id) into _seen from public.list_team_members() t;
  execute 'reset role';
  select count(*) into _n from public.usuarios u where u.id = any(_seen) and u.cartorio_id <> _cartorio;
  if _n > 0 then raise exception 'FALHA b: % usuários de outro cartório', _n; end if;

  -- c) a tabela usuarios continua restrita (gestor/operador só lê o próprio cadastro)
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_auth)::text, true);
  execute 'set local role authenticated';
  select count(*) into _n from public.usuarios;
  if _n <> 1 then raise exception 'FALHA c: a RLS de usuarios mudou (lê % linhas)', _n; end if;

  -- d) visitante anônimo não executa a função
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  execute 'set local role anon';
  begin
    perform public.list_team_members();
  exception when insufficient_privilege then _anon_ok := true;
  end;
  execute 'reset role';
  if not _anon_ok then raise exception 'FALHA d: anônimo executou list_team_members'; end if;

  raise exception 'DRY_RUN_OK: nomes da equipe (a-d passaram, nada foi gravado)';
end $$;
