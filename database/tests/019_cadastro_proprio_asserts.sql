-- Cadastro próprio pela página comercial. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261108010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _auth uuid := gen_random_uuid();
  _request uuid := gen_random_uuid();
  _hash text := repeat('a', 64);
  _result jsonb;
  _again jsonb;
  _cartorio uuid;
  _n int;
  _blocked boolean;
begin
  -- a) CNPJ: dígitos verificadores
  if not cartoquali_private.valid_cnpj('11.222.333/0001-81') then raise exception 'FALHA a: CNPJ válido recusado'; end if;
  if cartoquali_private.valid_cnpj('11.222.333/0001-82') then raise exception 'FALHA a: CNPJ inválido aceito'; end if;
  if cartoquali_private.valid_cnpj('11111111111111') then raise exception 'FALHA a: CNPJ repetido aceito'; end if;

  -- b) só o servidor (service_role) cadastra
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  _blocked := false;
  begin
    perform public.create_self_signup_registry(_request, _auth, _hash, 'Maria Teste', 'Titular', 'Cartório Ensaio',
      '11.222.333/0001-81', 'Teresina', 'PI', array['notas'], '(86) 99999-0000', 'ensaio-cadastro@example.com');
  exception when insufficient_privilege then _blocked := true;
  end;
  if not _blocked then raise exception 'FALHA b: chamada sem service_role cadastrou'; end if;

  perform set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  insert into auth.users(id, email, aud, role) values (_auth, 'ensaio-cadastro@example.com', 'authenticated', 'authenticated');
  delete from public.cartorios where regexp_replace(cnpj, '[^0-9]', '', 'g') = '11222333000181';

  -- c) cadastro completo: cartório ativo, administrador, pesquisa publicada e ponto ativo
  _result := public.create_self_signup_registry(_request, _auth, _hash, 'Maria Teste', 'Titular', 'Cartório Ensaio',
    '11.222.333/0001-81', 'Teresina', 'pi', array['notas','protesto','notas'], '(86) 99999-0000', 'Ensaio-Cadastro@example.com',
    'instagram', 'hero');
  _cartorio := (_result->>'id')::uuid;
  if _cartorio is null or (_result->>'duplicate')::boolean then raise exception 'FALHA c: %', _result; end if;
  if not exists (select 1 from public.cartorios where id = _cartorio and status = 'ativo' and estado = 'PI'
                 and atribuicoes = array['notas','protesto'] and environment_kind = 'real') then
    raise exception 'FALHA c: cartório não ficou ativo com as atribuições';
  end if;
  if not exists (select 1 from public.usuarios u join public.user_roles r on r.user_id = u.id
                 where u.cartorio_id = _cartorio and u.auth_user_id = _auth and r.role = 'CARTORIO_ADMIN'
                   and u.email = 'ensaio-cadastro@example.com') then
    raise exception 'FALHA c: administrador não criado';
  end if;
  select count(*) into _n from public.perguntas q join public.pesquisas p on p.id = q.pesquisa_id
  where p.cartorio_id = _cartorio and p.status = 'ativa' and q.chave_essencial is not null;
  if _n <> 6 then raise exception 'FALHA c: pesquisa sem as 6 essenciais (%)', _n; end if;
  if not exists (select 1 from public.pontos_avaliacao where cartorio_id = _cartorio and status = 'ativo'
                 and public_slug = lower(_result->>'pointCode')) then
    raise exception 'FALHA c: ponto não ficou ativo';
  end if;
  if not exists (select 1 from public.cartorio_onboarding where cartorio_id = _cartorio and status = 'ACTIVE'
                 and origem = 'cadastro_proprio') then
    raise exception 'FALHA c: implantação não marcada como cadastro próprio';
  end if;
  if not exists (select 1 from public.periodo_teste_cartorio where cartorio_id = _cartorio and aplicavel and iniciado_em is null) then
    raise exception 'FALHA c: teste deveria começar só no primeiro login';
  end if;
  if not exists (select 1 from public.servicos_cartorio where cartorio_id = _cartorio) then
    raise exception 'FALHA c: serviços das atribuições não criados';
  end if;

  -- d) o mesmo pedido de novo devolve o mesmo cartório
  _again := public.create_self_signup_registry(_request, _auth, _hash, 'Maria Teste', 'Titular', 'Cartório Ensaio',
    '11.222.333/0001-81', 'Teresina', 'PI', array['notas'], '(86) 99999-0000', 'ensaio-cadastro@example.com');
  if not (_again->>'duplicate')::boolean or (_again->>'id')::uuid <> _cartorio then
    raise exception 'FALHA d: pedido repetido não foi idempotente: %', _again;
  end if;

  -- e) o mesmo CNPJ não ganha um segundo teste
  _blocked := false;
  begin
    perform public.check_self_signup(gen_random_uuid(), '11222333000181', 'outro@example.com', repeat('b', 64));
  exception when unique_violation then _blocked := true;
  end;
  if not _blocked then raise exception 'FALHA e: CNPJ repetido aceito'; end if;

  raise exception 'DRY_RUN_OK';
end $$;
