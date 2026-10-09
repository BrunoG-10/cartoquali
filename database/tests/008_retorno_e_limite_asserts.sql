-- Verificações da situação da avaliação e do limite por cartório. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261013010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _admin_auth uuid := 'd92c734a-9305-4b68-b7cc-67419eb52337';
  _admin uuid := (select id from public.usuarios where auth_user_id = 'd92c734a-9305-4b68-b7cc-67419eb52337');
  _eval uuid;
  _old text;
  _r jsonb;
  _n int;
  _ans jsonb;
  _base public.avaliacoes;
begin
  if _admin is null then raise exception 'FALHA pré: administrador DEMO não encontrado'; end if;
  select id, status into _eval, _old from public.avaliacoes
  where cartorio_id = _demo and not is_test order by created_at desc limit 1;
  if _eval is null then raise exception 'FALHA pré: DEMO sem avaliação real'; end if;

  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  execute 'set local role authenticated';

  -- a) muda a situação e registra na auditoria
  _r := public.set_evaluation_status(_eval, case when _old = 'respondida' then 'em_analise' else 'respondida' end);
  if not (_r ->> 'changed')::boolean then raise exception 'FALHA a: não mudou: %', _r; end if;

  -- b) mesma situação não gera nova auditoria
  _r := public.set_evaluation_status(_eval, _r ->> 'status');
  if (_r ->> 'changed')::boolean then raise exception 'FALHA b: mudou de novo'; end if;

  -- c) situação inválida
  begin
    perform public.set_evaluation_status(_eval, 'apagada');
    raise exception 'FALHA c: aceitou situação inválida';
  exception when others then
    if sqlerrm <> 'invalid_status' then raise exception 'FALHA c: erro inesperado: %', sqlerrm; end if;
  end;

  -- d) avaliação inexistente ou de outro cartório
  begin
    perform public.set_evaluation_status(gen_random_uuid(), 'respondida');
    raise exception 'FALHA d: aceitou avaliação inexistente';
  exception when others then
    if sqlerrm <> 'evaluation_not_found' then raise exception 'FALHA d: erro inesperado: %', sqlerrm; end if;
  end;

  -- e) alteração direta da tabela continua bloqueada
  begin
    update public.avaliacoes set nota_geral = 5 where id = _eval;
    raise exception 'FALHA e: alteração direta permitida';
  exception when insufficient_privilege then null;
  end;

  execute 'reset role';
  select count(*) into _n from public.audit_logs
  where entity_id = _eval and action = 'evaluation_status_changed' and created_at >= now() - interval '1 minute';
  if _n <> 1 then raise exception 'FALHA a2: registros de auditoria = %', _n; end if;

  -- f) operador não muda a situação
  delete from public.user_roles where user_id = _admin;
  insert into public.user_roles (user_id, role) values (_admin, 'OPERADOR');
  execute 'set local role authenticated';
  begin
    perform public.set_evaluation_status(_eval, 'nova');
    raise exception 'FALHA f: operador mudou a situação';
  exception when others then
    if sqlerrm not like '%forbidden%' then raise exception 'FALHA f: erro inesperado: %', sqlerrm; end if;
  end;
  execute 'reset role';

  -- g) limite por cartório: com 30 avaliações reais nos últimos 10 minutos, a próxima é recusada
  perform set_config('request.jwt.claims', '', true);
  select jsonb_object_agg(q.id::text,
           case when q.tipo in ('stars', 'scale') then to_jsonb(5) else to_jsonb('sim'::text) end)
    into _ans
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.ativa and q.tipo in ('stars', 'scale', 'yes_no');
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans, '{}'::jsonb, null, false);
  select * into _base from public.avaliacoes where cartorio_id = _demo and not is_test order by created_at desc limit 1;
  select count(*) into _n from public.avaliacoes where cartorio_id = _demo and not is_test and created_at > now() - interval '10 minutes';
  insert into public.avaliacoes (cartorio_id, ponto_id, pesquisa_id, nota_geral, anonymous, status)
  select _demo, _base.ponto_id, _base.pesquisa_id, 5, true, 'nova' from generate_series(1, greatest(30 - _n, 0));
  begin
    perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
      _ans, '{}'::jsonb, null, false);
    raise exception 'FALHA g: aceitou a 31ª avaliação em 10 minutos';
  exception when others then
    if sqlerrm <> 'registry_busy' then raise exception 'FALHA g: erro inesperado: %', sqlerrm; end if;
  end;

  raise exception 'DRY_RUN_OK: retorno e limite (a-g passaram, nada foi gravado)';
end $$;
