-- Prazos de ocorrências e planos são datas do calendário de Brasília. As checagens usam
-- current_date (e data_abertura::date), que seguem o fuso da sessão (UTC): entre 21h e 0h em
-- Brasília o banco já está no dia seguinte e recusava "hoje" como prazo. Fixar o fuso nas funções
-- que validam o prazo resolve sem reescrever o corpo delas; timestamps continuam iguais.
alter function public.create_quality_occurrence(uuid, text, text, text, text, text, uuid, uuid, uuid, date, text)
  set timezone to 'America/Sao_Paulo';
alter function public.update_quality_occurrence(uuid, timestamptz, text, text, text, text, uuid, text, date, text)
  set timezone to 'America/Sao_Paulo';
alter function public.create_improvement_plan(uuid, uuid, text, text, text, text, uuid, text, date, text, text)
  set timezone to 'America/Sao_Paulo';
alter function cartoquali_private.validate_improvement_plan()
  set timezone to 'America/Sao_Paulo';
