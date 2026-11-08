-- Cartaz do QR Code configurado pelo cartório. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261109010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _admin uuid;
  _operator uuid;
  _cartorio uuid;
  _result jsonb;
  _blocked boolean;
begin
  select u.auth_user_id, u.cartorio_id into _admin, _cartorio
  from public.usuarios u join public.user_roles r on r.user_id = u.id join public.cartorios c on c.id = u.cartorio_id
  where r.role = 'CARTORIO_ADMIN' and u.status = 'ativo' and c.status = 'ativo' and u.auth_user_id is not null
    and cartoquali_private.registry_trial_expired(c.id) is false
  limit 1;
  if _admin is null then raise exception 'FALHA pré: nenhum administrador de cartório ativo'; end if;
  select u.auth_user_id into _operator
  from public.usuarios u join public.user_roles r on r.user_id = u.id
  where u.cartorio_id = _cartorio and r.role = 'OPERADOR' and u.status = 'ativo' and u.auth_user_id is not null
    and not exists (select 1 from public.user_roles x where x.user_id = u.id and x.role <> 'OPERADOR')
  limit 1;

  -- a) sem configuração: só razão social e CNPJ do cadastro
  delete from public.cartaz_qr_cartorio where cartorio_id = _cartorio;
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin)::text, true);
  execute 'set local role authenticated';
  _result := public.get_qr_poster_settings();
  if (_result->>'customized')::boolean or _result->>'holder' <> '' or _result->>'phone' <> ''
     or _result->>'cnpj' = '' then
    raise exception 'FALHA a: padrão deveria trazer só razão social e CNPJ: %', _result;
  end if;

  -- b) o administrador grava os campos; CNPJ inválido é recusado
  _result := public.set_qr_poster_settings('dados', 'Razão Teste', 'Ana Souza', '', 'Rua A, 10', '(86) 3222-0000', '');
  if not (_result->>'customized')::boolean or _result->>'holder' <> 'Ana Souza' or _result->>'cnpj' <> '' then
    raise exception 'FALHA b: %', _result;
  end if;
  _blocked := false;
  begin
    perform public.set_qr_poster_settings('dados', '', '', '11.222.333/0001-82', '', '', '');
  exception when sqlstate '22023' then _blocked := true;
  end;
  if not _blocked then raise exception 'FALHA b: CNPJ inválido aceito'; end if;

  -- c) imagem: só PNG/JPEG em data URL; remover volta ao modo de dados
  _result := public.set_qr_poster_image('data:image/jpeg;base64,AAAA');
  if _result->>'mode' <> 'imagem' or not (_result->>'hasImage')::boolean then raise exception 'FALHA c: %', _result; end if;
  if public.get_qr_poster_image() <> 'data:image/jpeg;base64,AAAA' then raise exception 'FALHA c: imagem não lida'; end if;
  _blocked := false;
  begin
    perform public.set_qr_poster_image('data:image/svg+xml;base64,AAAA');
  exception when sqlstate '22023' then _blocked := true;
  end;
  if not _blocked then raise exception 'FALHA c: SVG aceito'; end if;
  _result := public.set_qr_poster_image(null);
  if _result->>'mode' <> 'dados' or (_result->>'hasImage')::boolean then raise exception 'FALHA c: remoção %', _result; end if;
  execute 'reset role';

  -- d) operador lê, mas não altera
  if _operator is not null then
    perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_operator)::text, true);
    execute 'set local role authenticated';
    perform public.get_qr_poster_settings();
    _blocked := false;
    begin
      perform public.set_qr_poster_settings('dados', 'X', '', '', '', '', '');
    exception when insufficient_privilege then _blocked := true;
    end;
    execute 'reset role';
    if not _blocked then raise exception 'FALHA d: operador alterou o cartaz'; end if;
  end if;

  -- e) a tabela não é lida diretamente pelo cliente
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin)::text, true);
  execute 'set local role authenticated';
  _blocked := false;
  begin
    perform 1 from public.cartaz_qr_cartorio;
  exception when insufficient_privilege then _blocked := true;
  end;
  execute 'reset role';
  if not _blocked then raise exception 'FALHA e: tabela do cartaz exposta'; end if;

  raise exception 'DRY_RUN_OK';
end $$;
