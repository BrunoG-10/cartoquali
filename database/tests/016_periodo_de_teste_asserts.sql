-- Período de teste de 7 dias. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261021010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _auth uuid;
  _cartorio uuid;
  _result jsonb;
  _n int;
  _read_blocked boolean;
begin
  -- usuário ativo de um cartório ativo, sem perfil de plataforma
  select u.auth_user_id, u.cartorio_id into _auth, _cartorio
  from public.usuarios u join public.cartorios c on c.id = u.cartorio_id
  where u.status = 'ativo' and c.status = 'ativo' and u.auth_user_id is not null
    and not exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'PLATFORM_ADMIN')
  limit 1;
  if _auth is null then raise exception 'FALHA pré: nenhum usuário de cartório sem plataforma'; end if;

  -- a) cartórios já existentes ficam isentos
  if exists (select 1 from public.periodo_teste_cartorio where aplicavel) then
    raise exception 'FALHA a: cartório existente entrou em período de teste';
  end if;

  -- simula um cartório novo: sem linha de teste e sem cobrança ativa
  delete from public.periodo_teste_cartorio where cartorio_id = _cartorio;
  update public.cobranca_cartorio set ativo = false where cartorio_id = _cartorio;

  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_auth)::text, true);
  execute 'set local role authenticated';

  -- b) o primeiro login inicia o teste e libera o acesso
  _result := public.start_registry_trial();
  if (_result->>'expired')::boolean or _result->>'endsAt' is null then
    raise exception 'FALHA b: primeiro login não iniciou o teste: %', _result;
  end if;
  if cartoquali_private.current_cartorio_id() is distinct from _cartorio then
    raise exception 'FALHA b: acesso bloqueado durante o teste';
  end if;

  -- c) o cartório não lê nem altera a própria linha de teste
  _read_blocked := false;
  begin
    perform 1 from public.periodo_teste_cartorio;
  exception when insufficient_privilege then _read_blocked := true;
  end;
  if not _read_blocked then raise exception 'FALHA c: cartório leu o período de teste'; end if;
  execute 'reset role';

  -- d) um segundo login não reinicia a contagem
  update public.periodo_teste_cartorio set iniciado_em = now() - interval '3 days' where cartorio_id = _cartorio;
  execute 'set local role authenticated';
  perform public.start_registry_trial();
  execute 'reset role';
  select count(*) into _n from public.periodo_teste_cartorio
  where cartorio_id = _cartorio and iniciado_em < now() - interval '2 days';
  if _n <> 1 then raise exception 'FALHA d: novo login reiniciou o período de teste'; end if;

  -- e) após 7 dias corridos sem cobrança, o acesso fecha
  update public.periodo_teste_cartorio set iniciado_em = now() - interval '7 days 1 minute' where cartorio_id = _cartorio;
  execute 'set local role authenticated';
  _result := public.start_registry_trial();
  if not (_result->>'expired')::boolean then raise exception 'FALHA e: teste vencido não bloqueou: %', _result; end if;
  if cartoquali_private.current_cartorio_id() is not null then
    raise exception 'FALHA e: RLS continuou liberada após o teste';
  end if;
  select count(*) into _n from public.usuarios;
  if _n <> 0 then raise exception 'FALHA e: usuário bloqueado ainda lê dados do cartório'; end if;
  execute 'reset role';

  -- f) com cobrança ativa configurada pela plataforma, o acesso volta
  insert into public.cobranca_cartorio (cartorio_id, valor_mensal, dia_vencimento, inicio, ativo)
  values (_cartorio, 100, 10, date_trunc('month', now())::date, true)
  on conflict (cartorio_id) do update set ativo = true;
  execute 'set local role authenticated';
  _result := public.start_registry_trial();
  if (_result->>'expired')::boolean then raise exception 'FALHA f: cobrança ativa não liberou'; end if;
  if cartoquali_private.current_cartorio_id() is distinct from _cartorio then
    raise exception 'FALHA f: RLS não reabriu com cobrança ativa';
  end if;
  execute 'reset role';

  raise exception 'DRY_RUN_OK: período de teste (a-f passaram, nada foi gravado)';
end $$;
