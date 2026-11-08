-- Cartaz do QR Code configurado pelo próprio cartório. Antes o cabeçalho saía dos dados do cadastro
-- (responsável, telefone e e-mail), que no cadastro próprio são dados pessoais de quem se cadastrou.
-- Agora o cartório escolhe o que aparece: razão social, titular, CNPJ, endereço, telefone e e-mail,
-- ou uma imagem própria com o QR Code no centro. Sem configuração, o cartaz traz só razão social e
-- CNPJ do cadastro. Quem gerencia o QR Code (administrador do cartório e gestor) pode alterar.

create table if not exists public.cartaz_qr_cartorio (
  cartorio_id uuid primary key references public.cartorios(id) on delete cascade,
  modo text not null default 'dados' check (modo in ('dados', 'imagem')),
  razao_social text check (razao_social is null or char_length(razao_social) between 1 and 200),
  titular text check (titular is null or char_length(titular) between 1 and 160),
  cnpj text check (cnpj is null or char_length(cnpj) between 1 and 20),
  endereco text check (endereco is null or char_length(endereco) between 1 and 300),
  telefone text check (telefone is null or char_length(telefone) between 1 and 40),
  email text check (email is null or char_length(email) between 3 and 255),
  -- Imagem já reduzida no navegador para A4 a 200 dpi; até ~2,5 MB em base64.
  imagem text check (imagem is null or (char_length(imagem) <= 3500000
                                        and imagem ~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$')),
  updated_at timestamptz not null default now()
);
alter table public.cartaz_qr_cartorio enable row level security;
revoke all on table public.cartaz_qr_cartorio from public, anon, authenticated;
grant all on table public.cartaz_qr_cartorio to service_role;

-- Cartórios implantados pela plataforma mantêm o cartaz que já tinham (dados oficiais do cadastro).
insert into public.cartaz_qr_cartorio (cartorio_id, razao_social, titular, cnpj, endereco, telefone, email)
select c.id,
       nullif(btrim(c.razao_social), ''),
       nullif(btrim(c.responsavel), ''),
       nullif(btrim(c.cnpj), ''),
       nullif(concat_ws(' - ',
         nullif(concat_ws(' - ',
           nullif(concat_ws(', ', nullif(btrim(c.endereco), ''), nullif(btrim(c.numero), '')), ''),
           nullif(btrim(c.complemento), ''), nullif(btrim(c.bairro), '')), ''),
         nullif(concat_ws('/', nullif(btrim(c.cidade), ''), nullif(btrim(c.estado), '')), ''),
         case when nullif(btrim(c.cep), '') is not null then 'CEP ' || btrim(c.cep) end), ''),
       nullif(btrim(c.telefone), ''),
       nullif(btrim(c.email), '')
from public.cartorios c
where not exists (select 1 from public.cadastros_proprios sp where sp.cartorio_id = c.id)
on conflict (cartorio_id) do nothing;

create or replace function cartoquali_private.qr_poster_json(_cartorio uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customized', p.cartorio_id is not null,
    'mode', coalesce(p.modo, 'dados'),
    'officialName', case when p.cartorio_id is null then c.razao_social else coalesce(p.razao_social, '') end,
    'holder', coalesce(p.titular, ''),
    'cnpj', case when p.cartorio_id is null then c.cnpj else coalesce(p.cnpj, '') end,
    'address', coalesce(p.endereco, ''),
    'phone', coalesce(p.telefone, ''),
    'email', coalesce(p.email, ''),
    'hasImage', p.imagem is not null,
    'fallbackName', c.razao_social)
  from public.cartorios c
  left join public.cartaz_qr_cartorio p on p.cartorio_id = c.id
  where c.id = _cartorio
$$;
revoke all on function cartoquali_private.qr_poster_json(uuid) from public, anon, authenticated;

-- Leitura: qualquer usuário ativo do cartório (o cartaz é público quando impresso).
create or replace function public.get_qr_poster_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare _cartorio uuid := cartoquali_private.current_cartorio_id();
begin
  if _cartorio is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return cartoquali_private.qr_poster_json(_cartorio);
end $$;
revoke all on function public.get_qr_poster_settings() from public, anon;
grant execute on function public.get_qr_poster_settings() to authenticated;

-- A imagem só é baixada quando o cartaz é gerado.
create or replace function public.get_qr_poster_image()
returns text language plpgsql stable security definer set search_path = '' as $$
declare _cartorio uuid := cartoquali_private.current_cartorio_id();
begin
  if _cartorio is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select imagem from public.cartaz_qr_cartorio where cartorio_id = _cartorio);
end $$;
revoke all on function public.get_qr_poster_image() from public, anon;
grant execute on function public.get_qr_poster_image() to authenticated;

create or replace function public.set_qr_poster_settings(
  _modo text, _razao_social text, _titular text, _cnpj text, _endereco text, _telefone text, _email text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare _cartorio uuid := cartoquali_private.current_cartorio_id();
begin
  if _cartorio is null or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if _modo not in ('dados', 'imagem') then raise exception 'invalid_request' using errcode = '22023'; end if;
  if nullif(btrim(_email), '') is not null and btrim(_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if nullif(btrim(_cnpj), '') is not null and not cartoquali_private.valid_cnpj(_cnpj) then
    raise exception 'invalid_cnpj' using errcode = '22023';
  end if;
  insert into public.cartaz_qr_cartorio as p (cartorio_id, modo, razao_social, titular, cnpj, endereco, telefone, email, updated_at)
  values (_cartorio, _modo, nullif(btrim(_razao_social), ''), nullif(btrim(_titular), ''),
          nullif(regexp_replace(coalesce(_cnpj, ''), '[^0-9]', '', 'g'), ''), nullif(btrim(_endereco), ''),
          nullif(btrim(_telefone), ''), nullif(lower(btrim(_email)), ''), now())
  on conflict (cartorio_id) do update set
    modo = excluded.modo, razao_social = excluded.razao_social, titular = excluded.titular,
    cnpj = excluded.cnpj, endereco = excluded.endereco, telefone = excluded.telefone,
    email = excluded.email, updated_at = now();
  insert into public.audit_logs(cartorio_id, user_id, action, entity, entity_id, metadata)
  values (_cartorio, cartoquali_private.current_user_id(), 'qr_poster_updated', 'registry', _cartorio,
          jsonb_build_object('mode', _modo));
  return cartoquali_private.qr_poster_json(_cartorio);
end $$;
revoke all on function public.set_qr_poster_settings(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.set_qr_poster_settings(text, text, text, text, text, text, text) to authenticated;

-- _imagem nulo remove a imagem (e volta o cartaz para o modo de dados).
create or replace function public.set_qr_poster_image(_imagem text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare _cartorio uuid := cartoquali_private.current_cartorio_id();
begin
  if _cartorio is null or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if _imagem is not null and (char_length(_imagem) > 3500000
     or _imagem !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$') then
    raise exception 'invalid_image' using errcode = '22023';
  end if;
  -- Primeira configuração parte do padrão: razão social e CNPJ do cadastro.
  insert into public.cartaz_qr_cartorio (cartorio_id, razao_social, cnpj)
  select c.id, c.razao_social, c.cnpj from public.cartorios c where c.id = _cartorio
  on conflict (cartorio_id) do nothing;
  update public.cartaz_qr_cartorio
     set imagem = _imagem,
         modo = case when _imagem is null then 'dados' else 'imagem' end,
         updated_at = now()
   where cartorio_id = _cartorio;
  insert into public.audit_logs(cartorio_id, user_id, action, entity, entity_id, metadata)
  values (_cartorio, cartoquali_private.current_user_id(),
          case when _imagem is null then 'qr_poster_image_removed' else 'qr_poster_image_updated' end,
          'registry', _cartorio, '{}');
  return cartoquali_private.qr_poster_json(_cartorio);
end $$;
revoke all on function public.set_qr_poster_image(text) from public, anon;
grant execute on function public.set_qr_poster_image(text) to authenticated;
