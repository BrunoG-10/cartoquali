-- Verificações da cobrança dos cartórios. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261012010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _admin_auth uuid := 'd92c734a-9305-4b68-b7cc-67419eb52337';
  _admin uuid := (select id from public.usuarios where auth_user_id = 'd92c734a-9305-4b68-b7cc-67419eb52337');
  _r jsonb;
  _row jsonb;
  _payment uuid;
  _n int;
begin
  if _admin is null then raise exception 'FALHA pré: administrador DEMO não encontrado'; end if;

  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  execute 'set local role authenticated';

  -- a) configurar a cobrança e ler no painel
  perform public.set_registry_billing(_demo, 299.9, 10, '2026-08-15', true);
  select x into _row from jsonb_array_elements(public.get_platform_overview() -> 'registries') x
  where (x ->> 'id')::uuid = _demo;
  if _row -> 'billing' is null or (_row -> 'billing' ->> 'monthlyFee')::numeric <> 299.90
     or (_row -> 'billing' ->> 'dueDay')::int <> 10 or _row -> 'billing' ->> 'startMonth' <> '2026-08' then
    raise exception 'FALHA a: cobrança no painel = %', _row -> 'billing';
  end if;

  -- b) registrar pagamento (o dia do mês é normalizado para o dia 1)
  _r := public.register_registry_payment(_demo, '2026-08-20', 299.9, '2026-08-09', 'pix', '  Pago no PIX  ');
  _payment := (_r ->> 'id')::uuid;
  select x into _row from jsonb_array_elements(public.get_platform_overview() -> 'registries') x
  where (x ->> 'id')::uuid = _demo;
  if jsonb_array_length(_row -> 'payments') <> 1 or _row -> 'payments' -> 0 ->> 'month' <> '2026-08'
     or _row -> 'payments' -> 0 ->> 'note' <> 'Pago no PIX' then
    raise exception 'FALHA b: pagamentos no painel = %', _row -> 'payments';
  end if;

  -- c) o mesmo mês não é pago duas vezes
  begin
    perform public.register_registry_payment(_demo, '2026-08-01', 299.9, '2026-08-10', 'boleto');
    raise exception 'FALHA c: aceitou pagamento duplicado';
  exception when others then
    if sqlerrm <> 'duplicate_payment' then raise exception 'FALHA c: erro inesperado: %', sqlerrm; end if;
  end;

  -- d) valores inválidos são recusados
  begin
    perform public.register_registry_payment(_demo, '2026-09-01', 299.9, '2026-09-10', 'cheque');
    raise exception 'FALHA d: aceitou forma inválida';
  exception when others then
    if sqlerrm <> 'invalid_payment' then raise exception 'FALHA d: erro inesperado: %', sqlerrm; end if;
  end;
  begin
    perform public.set_registry_billing(_demo, 299.9, 29, '2026-08-01', true);
    raise exception 'FALHA d2: aceitou dia 29';
  exception when others then
    if sqlerrm <> 'invalid_billing' then raise exception 'FALHA d2: erro inesperado: %', sqlerrm; end if;
  end;

  -- e) desfazer o pagamento
  perform public.remove_registry_payment(_payment);
  begin
    perform public.remove_registry_payment(_payment);
    raise exception 'FALHA e: removeu pagamento inexistente';
  exception when others then
    if sqlerrm <> 'payment_not_found' then raise exception 'FALHA e: erro inesperado: %', sqlerrm; end if;
  end;

  -- f) cliente não lê as tabelas diretamente
  begin
    select count(*) into _n from public.pagamentos_cartorio;
    raise exception 'FALHA f: leitura direta permitida';
  exception when insufficient_privilege then null;
  end;

  -- g) auditoria no cartório de quem registrou
  execute 'reset role';
  select count(*) into _n from public.audit_logs
  where cartorio_id = _demo and user_id = _admin and entity_id in (_demo, _payment)
    and action in ('BILLING_UPDATED', 'PAYMENT_REGISTERED', 'PAYMENT_REMOVED');
  if _n <> 3 then raise exception 'FALHA g: registros de auditoria = %', _n; end if;

  -- h) administrador só do cartório é recusado
  delete from public.user_roles where user_id = _admin and role = 'PLATFORM_ADMIN';
  execute 'set local role authenticated';
  begin
    perform public.set_registry_billing(_demo, 100, 5, '2026-08-01', true);
    raise exception 'FALHA h: administrador de cartório configurou cobrança';
  exception when others then
    if sqlerrm not like '%forbidden%' then raise exception 'FALHA h: erro inesperado: %', sqlerrm; end if;
  end;
  begin
    perform public.register_registry_payment(_demo, '2026-09-01', 100, '2026-09-10', 'pix');
    raise exception 'FALHA h2: administrador de cartório registrou pagamento';
  exception when others then
    if sqlerrm not like '%forbidden%' then raise exception 'FALHA h2: erro inesperado: %', sqlerrm; end if;
  end;

  -- i) sem sessão é recusado
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.remove_registry_payment(gen_random_uuid());
    raise exception 'FALHA i: chamou sem sessão';
  exception when others then
    if sqlerrm not like '%forbidden%' then raise exception 'FALHA i: erro inesperado: %', sqlerrm; end if;
  end;
  execute 'reset role';

  raise exception 'DRY_RUN_OK: cobrança (a-i passaram, nada foi gravado)';
end $$;
