-- Verificações do progresso do guia de uso (spec 2026-10-07-guia-de-uso). Rodar SEMPRE dentro de
-- uma transação: begin; [<migração 20261009010000> se ainda não aplicada]; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _admin_auth uuid := 'd92c734a-9305-4b68-b7cc-67419eb52337';
  _admin uuid := (select id from public.usuarios where auth_user_id = 'd92c734a-9305-4b68-b7cc-67419eb52337');
  _other_auth uuid := (
    select u.auth_user_id from public.usuarios u
    where u.cartorio_id = '10000000-0000-4000-8000-000000000001' and u.status = 'ativo'
      and u.auth_user_id is not null and u.auth_user_id <> 'd92c734a-9305-4b68-b7cc-67419eb52337'
    limit 1);
  _r jsonb; _n int; _done timestamptz;
begin
  if _admin is null then raise exception 'FALHA pré: admin DEMO não encontrado'; end if;
  if _other_auth is null then raise exception 'FALHA pré: falta um segundo usuário ativo no DEMO'; end if;
  delete from public.guia_progresso where usuario_id = _admin;

  -- Daqui em diante, como um cliente logado (o grant de execute para authenticated é testado).
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  execute 'set local role authenticated';

  -- a) salvar etapa sem concluir
  _r := public.save_my_guide_progress(3, false);
  if (_r ->> 'step')::int <> 3 or _r ->> 'completedAt' is not null then raise exception 'FALHA a: %', _r; end if;

  -- b) concluir preenche concluido_em
  _r := public.save_my_guide_progress(17, true);
  if _r ->> 'completedAt' is null then raise exception 'FALHA b: conclusão não gravada'; end if;
  _done := (_r ->> 'completedAt')::timestamptz;

  -- c) salvar depois sem concluir não apaga a conclusão
  _r := public.save_my_guide_progress(1, false);
  if (_r ->> 'completedAt')::timestamptz is distinct from _done then raise exception 'FALHA c: concluido_em mudou'; end if;

  -- d) etapa negativa é recusada pelo motivo certo
  begin
    perform public.save_my_guide_progress(-1, false);
    raise exception 'FALHA d: aceitou etapa negativa';
  exception when others then
    if sqlerrm not like '%invalid_step%' then raise exception 'FALHA d: erro inesperado: %', sqlerrm; end if;
  end;

  -- e) cliente autenticado não escreve direto na tabela
  begin
    insert into public.guia_progresso(usuario_id, etapa) values (_admin, 5)
      on conflict (usuario_id) do update set etapa = 5;
    raise exception 'FALHA e: escrita direta permitida';
  exception when insufficient_privilege then null;
  end;

  -- f) outro usuário não lê a linha alheia
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_other_auth)::text, true);
  select count(*) into _n from public.guia_progresso where usuario_id = _admin;
  if _n <> 0 then raise exception 'FALHA f: leu progresso de outro usuário'; end if;

  -- g) o próprio usuário lê a sua linha
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  select count(*) into _n from public.guia_progresso where usuario_id = _admin;
  if _n <> 1 then raise exception 'FALHA g: não leu o próprio progresso'; end if;

  -- h) sem sessão, a RPC recusa pelo motivo certo
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.save_my_guide_progress(2, false);
    raise exception 'FALHA h: gravou sem sessão';
  exception when others then
    if sqlerrm not like '%forbidden%' then raise exception 'FALHA h: erro inesperado: %', sqlerrm; end if;
  end;
  execute 'reset role';

  raise exception 'DRY_RUN_OK: guia_progresso (a-h passaram, nada foi gravado)';
end $$;
