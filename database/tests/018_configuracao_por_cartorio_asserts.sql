-- Configuração por cartório pelo painel da plataforma. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261031010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
begin
  perform set_config('request.jwt.claims', '', true);

  -- a) sem sessão de administrador global, leitura e escrita são recusadas
  begin
    perform public.get_registry_public_settings(_demo);
    raise exception 'FALHA a: leitura sem administrador global';
  exception when others then
    if sqlerrm <> 'forbidden' then raise exception 'FALHA a: erro inesperado: %', sqlerrm; end if;
  end;
  begin
    perform public.set_registry_public_settings(_demo, 'Obrigado', true, null, '1.0', null, null, false);
    raise exception 'FALHA a2: escrita sem administrador global';
  exception when others then
    if sqlerrm <> 'forbidden' then raise exception 'FALHA a2: erro inesperado: %', sqlerrm; end if;
  end;

  -- b) visitante anônimo não executa as funções
  if has_function_privilege('anon', 'public.get_registry_public_settings(uuid)', 'execute')
     or has_function_privilege('anon', 'public.set_registry_public_settings(uuid,text,boolean,text,text,text,text,boolean)', 'execute') then
    raise exception 'FALHA b: funções liberadas ao anônimo';
  end if;

  raise exception 'DRY_RUN_OK: configuração por cartório (a-b passaram, nada foi gravado)';
end $$;
