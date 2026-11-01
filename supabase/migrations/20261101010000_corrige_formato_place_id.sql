-- Corrige o formato do place_id do Google: o PostgreSQL só aceita repetição de até 255 em
-- expressão regular, e '{10,300}' fazia qualquer gravação com perfil do Google falhar
-- ("invalid repetition count"). O tamanho passa a ser conferido por char_length.

alter table public.configuracoes_cartorio drop constraint if exists configuracoes_google_place_id_formato;
alter table public.configuracoes_cartorio
  add constraint configuracoes_google_place_id_formato
    check (google_place_id is null
      or (google_place_id ~ '^[A-Za-z0-9_-]+$' and char_length(google_place_id) between 10 and 300));

create or replace function public.set_registry_public_settings(
  _cartorio_id uuid,
  _thank_you text,
  _allow_contact boolean,
  _privacy_channel text,
  _privacy_version text,
  _place_id text,
  _place_name text,
  _invite_active boolean)
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _place text := nullif(btrim(coalesce(_place_id, '')), '');
  _channel text := nullif(btrim(coalesce(_privacy_channel, '')), '');
begin
  perform cartoquali_private.require_platform_admin();
  if not exists (select 1 from public.cartorios where id = _cartorio_id) then
    raise exception 'registry_not_found' using errcode = 'P0002';
  end if;
  if char_length(btrim(coalesce(_thank_you, ''))) not between 1 and 500
     or char_length(btrim(coalesce(_privacy_version, ''))) not between 1 and 30
     or (_channel is not null and char_length(_channel) not between 3 and 255)
     or (_place is not null and (_place !~ '^[A-Za-z0-9_-]+$' or char_length(_place) not between 10 and 300))
     or char_length(coalesce(_place_name, '')) > 300
     or (coalesce(_invite_active, false) and _place is null) then
    raise exception 'invalid_settings' using errcode = '22023';
  end if;
  insert into public.configuracoes_cartorio as c (
    cartorio_id, nome_exibicao, mensagem_agradecimento, permite_contato, privacy_contact_channel,
    privacy_notice_version, google_place_id, google_place_nome, google_convite_ativo)
  select ct.id, coalesce(ct.nome_fantasia, 'CartoQuali'), btrim(_thank_you), coalesce(_allow_contact, true), _channel,
         btrim(_privacy_version), _place, case when _place is null then null else nullif(btrim(_place_name), '') end,
         coalesce(_invite_active, false)
  from public.cartorios ct where ct.id = _cartorio_id
  on conflict (cartorio_id) do update set
    mensagem_agradecimento = excluded.mensagem_agradecimento,
    permite_contato = excluded.permite_contato,
    privacy_contact_channel = excluded.privacy_contact_channel,
    privacy_notice_version = excluded.privacy_notice_version,
    google_place_id = excluded.google_place_id,
    google_place_nome = excluded.google_place_nome,
    google_convite_ativo = excluded.google_convite_ativo,
    updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
