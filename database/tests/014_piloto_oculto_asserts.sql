-- Piloto do ensaio oculto. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261019010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _pilot uuid := '2f2d4ea2-422c-4203-b96f-ce45d12aec21';
  _overview jsonb;
begin
  -- a) marcado como oculto, sem apagar nada
  if not exists (select 1 from public.cartorios where id = _pilot and oculto) then
    raise exception 'FALHA a: piloto não ficou oculto';
  end if;
  if not exists (select 1 from public.avaliacoes where cartorio_id = _pilot) then
    raise exception 'FALHA a2: avaliações do piloto sumiram';
  end if;

  -- b) o painel da plataforma não lista mais o piloto
  perform set_config('request.jwt.claims',
    json_build_object('role','authenticated','sub','d92c734a-9305-4b68-b7cc-67419eb52337')::text, true);
  execute 'set local role authenticated';
  _overview := public.get_platform_overview();
  execute 'reset role';
  if exists (select 1 from jsonb_array_elements(_overview->'registries') r where r->>'id' = _pilot::text) then
    raise exception 'FALHA b: piloto ainda aparece no painel';
  end if;

  raise exception 'DRY_RUN_OK: piloto oculto (a-b passaram, nada foi gravado)';
end $$;
