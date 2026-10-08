-- Verificações do progresso do guia de uso (spec 2026-10-07-guia-de-uso). Rodar SEMPRE dentro do
-- dry run: begin; <migração 20261009010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _admin_auth uuid := 'd92c734a-9305-4b68-b7cc-67419eb52337';
  _admin uuid := (select id from public.usuarios where auth_user_id = 'd92c734a-9305-4b68-b7cc-67419eb52337');
  _other_auth uuid := (
    select u.auth_user_id from public.usuarios u
    where u.cartorio_id = '10000000-0000-4000-8000-000000000001' and u.status = 'ativo'
      and u.auth_user_id is not null and u.auth_user_id <> 'd92c734a-9305-4b68-b7cc-67419eb52337'
    limit 1);
  _r jsonb; _n int; _done timestamptz;
begin
  delete from public.guia_progresso where usuario_id = _admin;

  -- a) salvar etapa sem concluir
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  _r := public.save_my_guide_progress(3, false);
  if (_r ->> 'step')::int <> 3 or _r ->> 'completedAt' is not null then raise exception 'FALHA a: %', _r; end if;

  -- b) concluir preenche concluido_em
  _r := public.save_my_guide_progress(17, true);
  if _r ->> 'completedAt' is null then raise exception 'FALHA b: conclusão não gravada'; end if;
  select concluido_em into _done from public.guia_progresso where usuario_id = _admin;

  -- c) salvar depois sem concluir não apaga a conclusão
  _r := public.save_my_guide_progress(1, false);
  if (select concluido_em from public.guia_progresso where usuario_id = _admin) is distinct from _done then
    raise exception 'FALHA c: concluido_em mudou';
  end if;

  -- d) etapa negativa é recusada
  begin
    perform public.save_my_guide_progress(-1, false);
    raise exception 'FALHA d: aceitou etapa negativa';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- e) cliente autenticado não escreve direto na tabela
  execute 'set local role authenticated';
  begin
    insert into public.guia_progresso(usuario_id, etapa) values (_admin, 5)
      on conflict (usuario_id) do update set etapa = 5;
    raise exception 'FALHA e: escrita direta permitida';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- f) outro usuário não lê a linha alheia
  if _other_auth is not null then
    perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_other_auth)::text, true);
    select count(*) into _n from public.guia_progresso where usuario_id = _admin;
    if _n <> 0 then raise exception 'FALHA f: leu progresso de outro usuário'; end if;
  end if;

  -- g) o próprio usuário lê a sua linha
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  select count(*) into _n from public.guia_progresso where usuario_id = _admin;
  if _n <> 1 then raise exception 'FALHA g: não leu o próprio progresso'; end if;
  execute 'reset role';

  -- h) sem sessão, a RPC recusa
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.save_my_guide_progress(2, false);
    raise exception 'FALHA h: gravou sem sessão';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  raise exception 'DRY_RUN_OK: guia_progresso (a-h passaram, nada foi gravado)';
end $$;
