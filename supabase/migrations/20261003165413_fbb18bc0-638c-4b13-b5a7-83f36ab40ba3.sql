create or replace function public.get_dashboard_indicators(
  _current_start timestamptz,
  _current_end timestamptz,
  _previous_start timestamptz,
  _previous_end timestamptz,
  _point_id uuid default null,
  _survey_id uuid default null,
  _granularity text default 'day'
)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare _result jsonb;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  if _current_start is null or _current_end is null or _previous_start is null or _previous_end is null or _current_start >= _current_end or _previous_start >= _previous_end or _granularity not in ('day','week','month') then raise exception 'invalid_request' using errcode = '22023'; end if;
  with current_evaluations as (
    select a.* from public.avaliacoes a where a.created_at >= _current_start and a.created_at < _current_end and (_point_id is null or a.ponto_id=_point_id) and (_survey_id is null or a.pesquisa_id=_survey_id)
  ), previous_evaluations as (
    select a.* from public.avaliacoes a where a.created_at >= _previous_start and a.created_at < _previous_end and (_point_id is null or a.ponto_id=_point_id) and (_survey_id is null or a.pesquisa_id=_survey_id)
  ), current_summary as (
    select count(*)::int total,round(avg(nota_geral)::numeric,2) average,round((count(*) filter(where nota_geral>=4)*100.0/nullif(count(*),0))::numeric,2) satisfaction,round((count(*) filter(where nota_geral<=3)*100.0/nullif(count(*),0))::numeric,2) negative_rate,count(*) filter(where nota_geral<=3)::int negative_count,count(*) filter(where comentario is not null and btrim(comentario)<>'')::int comments,count(*) filter(where deseja_contato)::int contact_requests,round((count(*) filter(where atendimento_resolvido='sim')*100.0/nullif(count(*) filter(where atendimento_resolvido is not null),0))::numeric,2) resolution from current_evaluations
  ), previous_summary as (
    select count(*)::int total,round(avg(nota_geral)::numeric,2) average,round((count(*) filter(where nota_geral>=4)*100.0/nullif(count(*),0))::numeric,2) satisfaction,round((count(*) filter(where nota_geral<=3)*100.0/nullif(count(*),0))::numeric,2) negative_rate,count(*) filter(where nota_geral<=3)::int negative_count,count(*) filter(where comentario is not null and btrim(comentario)<>'')::int comments,count(*) filter(where deseja_contato)::int contact_requests,round((count(*) filter(where atendimento_resolvido='sim')*100.0/nullif(count(*) filter(where atendimento_resolvido is not null),0))::numeric,2) resolution from previous_evaluations
  ), distribution as (
    select r.rating,count(c.id)::int count from generate_series(1,5) r(rating) left join current_evaluations c on c.nota_geral=r.rating group by r.rating
  ), series as (
    select date_trunc(_granularity,c.created_at at time zone 'America/Sao_Paulo') bucket,count(*)::int total,round(avg(c.nota_geral)::numeric,2) average,round((count(*) filter(where c.nota_geral>=4)*100.0/count(*))::numeric,2) satisfaction,round((count(*) filter(where c.nota_geral<=3)*100.0/count(*))::numeric,2) negative_rate,round((count(*) filter(where c.atendimento_resolvido='sim')*100.0/nullif(count(*) filter(where c.atendimento_resolvido is not null),0))::numeric,2) resolution from current_evaluations c group by 1
  ), point_performance as (
    select p.id,p.nome name,count(c.id)::int total,round(avg(c.nota_geral)::numeric,2) average,round((count(c.id) filter(where c.nota_geral>=4)*100.0/nullif(count(c.id),0))::numeric,2) satisfaction,round((count(c.id) filter(where c.nota_geral<=3)*100.0/nullif(count(c.id),0))::numeric,2) negative_rate from public.pontos_avaliacao p left join current_evaluations c on c.ponto_id=p.id where (_point_id is null or p.id=_point_id) and (_survey_id is null or p.pesquisa_id=_survey_id) group by p.id,p.nome
  ), current_dimension_values as (
    select lower(q.dimensao) dimension,case when q.tipo in ('stars','scale') and jsonb_typeof(r.valor)='number' then (r.valor#>>'{}')::numeric when q.tipo='yes_no' and lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) in ('sim','yes','true') then 5 when q.tipo='yes_no' and lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) in ('parcialmente','partial') then 3 when q.tipo='yes_no' and lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) in ('não','nao','no','false') then 1 end score from public.respostas r join current_evaluations e on e.id=r.avaliacao_id join public.perguntas q on q.id=r.pergunta_id and q.pesquisa_id=e.pesquisa_id where q.dimensao in ('service','time','clarity','resolution','structure')
  ), previous_dimension_values as (
    select lower(q.dimensao) dimension,case when q.tipo in ('stars','scale') and jsonb_typeof(r.valor)='number' then (r.valor#>>'{}')::numeric when q.tipo='yes_no' and lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) in ('sim','yes','true') then 5 when q.tipo='yes_no' and lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) in ('parcialmente','partial') then 3 when q.tipo='yes_no' and lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) in ('não','nao','no','false') then 1 end score from public.respostas r join previous_evaluations e on e.id=r.avaliacao_id join public.perguntas q on q.id=r.pergunta_id and q.pesquisa_id=e.pesquisa_id where q.dimensao in ('service','time','clarity','resolution','structure')
  ), current_dimensions as (select dimension,count(score)::int responses,round((avg(score)/5*100)::numeric,2) index from current_dimension_values where score between 1 and 5 group by dimension), previous_dimensions as (select dimension,count(score)::int responses,round((avg(score)/5*100)::numeric,2) index from previous_dimension_values where score between 1 and 5 group by dimension), dimension_keys as (select * from (values('service','Atendimento'),('time','Tempo'),('clarity','Clareza'),('resolution','Resolutividade'),('structure','Estrutura')) d(key,label)), dimensions as (
    select d.key,d.label,coalesce(c.responses,0) responses,c.index,coalesce(p.responses,0) previous_responses,p.index previous_index from dimension_keys d left join current_dimensions c on c.dimension=d.key left join previous_dimensions p on p.dimension=d.key
  ), recent as (select c.id,c.nota_geral rating,c.comentario comment,c.created_at,p.nome point_name from current_evaluations c join public.pontos_avaliacao p on p.id=c.ponto_id order by c.created_at desc limit 3), filters as (
    select (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.nome) order by p.nome),'[]') from public.pontos_avaliacao p) points,(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.nome) order by s.nome),'[]') from public.pesquisas s) surveys
  )
  select jsonb_build_object('summary',to_jsonb(cs),'previousSummary',to_jsonb(ps),'distribution',(select coalesce(jsonb_agg(to_jsonb(d) order by d.rating),'[]') from distribution d),'series',(select coalesce(jsonb_agg(to_jsonb(s) order by s.bucket),'[]') from series s),'points',(select coalesce(jsonb_agg(to_jsonb(pp) order by pp.total desc,pp.name),'[]') from point_performance pp),'dimensions',(select coalesce(jsonb_agg(to_jsonb(d) order by d.key),'[]') from dimensions d),'recent',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]') from recent r),'filters',to_jsonb(f)) into _result from current_summary cs cross join previous_summary ps cross join filters f;
  return _result;
end;$$;
revoke all on function public.get_dashboard_indicators(timestamptz,timestamptz,timestamptz,timestamptz,uuid,uuid,text) from public,anon;
grant execute on function public.get_dashboard_indicators(timestamptz,timestamptz,timestamptz,timestamptz,uuid,uuid,text) to authenticated,service_role;