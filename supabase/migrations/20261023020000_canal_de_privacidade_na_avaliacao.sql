-- LGPD art. 41, §1º: a identidade e o contato do encarregado do cartório (controlador) devem
-- estar publicamente disponíveis. O "Canal público de privacidade" das Configurações passa a ir
-- junto com a pesquisa pública, para aparecer na tela da avaliação. Troca exata sobre a definição
-- atual das funções (falha se o trecho não existir, em vez de aplicar algo parcial).
create or replace function cartoquali_private.patch_function(_signature text, _pairs text[])
returns void language plpgsql set search_path = pg_catalog, public as $$
declare
  _ddl text := pg_get_functiondef(_signature::regprocedure);
  _i int;
begin
  for _i in 1 .. array_length(_pairs, 1) / 2 loop
    if position(_pairs[_i * 2 - 1] in _ddl) = 0 then
      raise exception 'patch_anchor_not_found: % (#%)', _signature, _i;
    end if;
    _ddl := replace(_ddl, _pairs[_i * 2 - 1], _pairs[_i * 2]);
  end loop;
  execute _ddl;
end $$;

select cartoquali_private.patch_function(
  'public.get_public_evaluation_context(text)',
  array[
    $a$'privacyNoticeVersion',coalesce(_settings.privacy_notice_version,'1.0'))$a$,
    $b$'privacyNoticeVersion',coalesce(_settings.privacy_notice_version,'1.0'),'privacyContactChannel',_settings.privacy_contact_channel)$b$
  ]
);

select cartoquali_private.patch_function(
  'public.get_onboarding_test_context(text,uuid)',
  array[
    $a$'privacyNoticeVersion',coalesce(_settings.privacy_notice_version,'1.0'))$a$,
    $b$'privacyNoticeVersion',coalesce(_settings.privacy_notice_version,'1.0'),'privacyContactChannel',_settings.privacy_contact_channel)$b$
  ]
);

drop function cartoquali_private.patch_function(text, text[]);
