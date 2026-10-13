-- LGPD: a minimização de dados de uma avaliação também redige o texto livre do "Outro" da pergunta
-- de seleção múltipla (respostas.resposta_texto, desde 20261010010000). Antes só eram redigidas as
-- perguntas do tipo "text", e o texto do "Outro" — que pode conter dados pessoais — permanecia.

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
  'cartoquali_private.minimize_evaluation_personal_data(uuid,uuid,boolean)',
  array[
    $a$and q.tipo='text';$a$,
    $b$and q.tipo='text';
    update public.respostas r set resposta_texto='[Conteúdo redigido por solicitação de privacidade]'
    from public.perguntas q where r.avaliacao_id=_evaluation.id and r.pergunta_id=q.id
      and q.tipo='multiple_choice' and r.resposta_texto is not null;$b$
  ]
);

drop function cartoquali_private.patch_function(text, text[]);

-- Avaliações já minimizadas antes desta correção.
update public.respostas r
set resposta_texto = '[Conteúdo redigido por solicitação de privacidade]'
from public.perguntas q, public.avaliacoes a
where r.pergunta_id = q.id and a.id = r.avaliacao_id
  and a.minimized_at is not null
  and q.tipo = 'multiple_choice'
  and r.resposta_texto is not null
  and r.resposta_texto <> '[Conteúdo redigido por solicitação de privacidade]';
