do $$
declare ddl text;
begin
  select pg_get_functiondef('public.submit_public_evaluation(text,uuid,text,jsonb,jsonb)'::regprocedure) into ddl;
  ddl:=replace(ddl,'jsonb_object_length(_answers)>50','(select count(*) from jsonb_object_keys(_answers))>50');
  execute ddl;
end $$;