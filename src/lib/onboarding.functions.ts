import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const registryInput = z.object({
  clientRequestId: z.string().uuid(), officialName: z.string().trim().min(1).max(200), tradeName: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().min(11).max(30), serviceType: z.string().trim().min(1).max(120), city: z.string().trim().min(1).max(120),
  state: z.string().trim().length(2), manager: z.string().trim().min(1).max(160), email: z.string().trim().email().max(255).or(z.literal("")), phone: z.string().trim().max(30),
});
const idInput = z.object({ registryId: z.string().uuid() });
const surveyInput = idInput.extend({ name: z.string().trim().min(1).max(140), description: z.string().trim().max(1000), useTemplate: z.boolean() });
const pointInput = idInput.extend({ name: z.string().trim().min(1).max(120), location: z.string().trim().min(1).max(160), description: z.string().trim().max(500) });

export type OnboardingStatus = "IN_PROGRESS" | "READY_FOR_TEST" | "ACTIVE" | "BLOCKED";
export type OnboardingChecklist = { registry:boolean; administrator:boolean; survey:boolean; questions:boolean; point:boolean; qr:boolean; test:boolean; complete:boolean };
export type OnboardingItem = { id:string; registryId:string; status:OnboardingStatus; currentStep:number; surveyId:string|null; pointId:string|null; testEvaluationId:string|null; createdAt:string; updatedAt:string; activatedAt:string|null; registry:{ officialName:string; tradeName:string; cnpj:string; city:string; state:string; operationalStatus:string }; administrator:{ name:string; email:string; status:string; hasAuthAccess:boolean }|null; survey:{ name:string; description:string; status:string; questionCount:number }|null; point:{ name:string; location:string; code:string; status:string }|null; checklist:OnboardingChecklist };

async function platformAccess(context: { supabase:any; userId:string }) {
  const { data: user } = await context.supabase.from("usuarios").select("id,status").eq("auth_user_id",context.userId).maybeSingle();
  if (!user || user.status !== "ativo") throw new Error("Acesso não autorizado.");
  const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id",user.id);
  if (!(roles ?? []).some((item:{role:string}) => item.role === "PLATFORM_ADMIN")) throw new Error("Somente o administrador da plataforma pode iniciar implantações.");
  return user.id as string;
}

async function privateRpc<T>(name:string,args:Record<string,unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.schema("cartoquali_private").rpc(name as never,args as never) as {data:T|null;error:{message:string;code?:string}|null};
  return result;
}

function friendly(error:{message:string}|null,fallback:string) {
  const message=error?.message??"";
  if(message.includes("duplicate_registry")) return "Já existe um cartório com este CNPJ.";
  if(message.includes("duplicate_user")) return "Este e-mail já possui acesso.";
  if(message.includes("incomplete_survey")) return "A pesquisa precisa de pergunta obrigatória e opções válidas antes da publicação.";
  if(message.includes("incomplete_onboarding")) return "Conclua todos os itens obrigatórios antes de ativar o cartório.";
  if(message.includes("forbidden")) return "Você não possui permissão para esta ação.";
  return fallback;
}

export const listOnboardings = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  await platformAccess(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const {data:rows,error}=await supabaseAdmin.from("cartorio_onboarding").select("id,cartorio_id,status,current_step,survey_id,point_id,test_evaluation_id,created_at,updated_at,activated_at,cartorios!inner(razao_social,nome_fantasia,cnpj,cidade,estado,status),pesquisas(nome,descricao,status),pontos_avaliacao(nome,localizacao,codigo,status)").order("updated_at",{ascending:false});
  if(error) throw new Error("Não foi possível carregar as implantações.");
  return Promise.all((rows??[]).map(async(row:any)=>{
    const [{data:admins},{data:check}]=await Promise.all([
      supabaseAdmin.from("usuarios").select("nome,email,status,auth_user_id,user_roles!inner(role)").eq("cartorio_id",row.cartorio_id).eq("user_roles.role","CARTORIO_ADMIN").limit(1),
      privateRpc<OnboardingChecklist>("get_onboarding_checklist",{_cartorio_id:row.cartorio_id}),
    ]);
    const admin=admins?.[0]; const registry=Array.isArray(row.cartorios)?row.cartorios[0]:row.cartorios; const survey=Array.isArray(row.pesquisas)?row.pesquisas[0]:row.pesquisas; const point=Array.isArray(row.pontos_avaliacao)?row.pontos_avaliacao[0]:row.pontos_avaliacao;
    let questionCount=0; if(row.survey_id){const {count}=await supabaseAdmin.from("perguntas").select("id",{count:"exact",head:true}).eq("pesquisa_id",row.survey_id).eq("ativa",true);questionCount=count??0;}
    return {id:row.id,registryId:row.cartorio_id,status:row.status,currentStep:row.current_step,surveyId:row.survey_id,pointId:row.point_id,testEvaluationId:row.test_evaluation_id,createdAt:row.created_at,updatedAt:row.updated_at,activatedAt:row.activated_at,registry:{officialName:registry.razao_social,tradeName:registry.nome_fantasia,cnpj:registry.cnpj,city:registry.cidade,state:registry.estado,operationalStatus:registry.status},administrator:admin?{name:admin.nome,email:admin.email,status:admin.status,hasAuthAccess:Boolean(admin.auth_user_id)}:null,survey:survey?{name:survey.nome,description:survey.descricao??"",status:survey.status,questionCount}:null,point:point?{name:point.nome,location:point.localizacao,code:point.codigo,status:point.status}:null,checklist:check??{registry:false,administrator:false,survey:false,questions:false,point:false,qr:false,test:false,complete:false}} as OnboardingItem;
  }));
});

export const createOnboardingRegistry=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>registryInput.parse(v)).handler(async({context,data})=>{await platformAccess(context);const {data:result,error}=await privateRpc<{id:string}>("create_cartorio_onboarding",{_client_request_id:data.clientRequestId,_razao_social:data.officialName,_nome_fantasia:data.tradeName,_cnpj:data.cnpj,_tipo:data.serviceType,_cidade:data.city,_estado:data.state,_responsavel:data.manager,_email:data.email||null,_telefone:data.phone||null});if(error||!result)throw new Error(friendly(error,"Não foi possível criar o cartório."));return result;});

export const createOnboardingAdministrator=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>idInput.extend({name:z.string().trim().min(1).max(100),email:z.string().trim().email().max(255),phone:z.string().trim().max(30),redirectTo:z.string().url()}).parse(v)).handler(async({context,data})=>{await platformAccess(context);const {supabaseAdmin}=await import("@/integrations/supabase/client.server");const {data:invited,error:inviteError}=await supabaseAdmin.auth.admin.inviteUserByEmail(data.email,{redirectTo:data.redirectTo});if(inviteError||!invited.user)throw new Error(inviteError?.message.toLowerCase().includes("registered")?"Este e-mail já possui acesso.":"Não foi possível enviar o convite.");const {data:result,error}=await privateRpc<{id:string}>("create_onboarding_administrator",{_cartorio_id:data.registryId,_auth_user_id:invited.user.id,_name:data.name,_email:data.email,_phone:data.phone||null});if(error||!result){await supabaseAdmin.auth.admin.deleteUser(invited.user.id);throw new Error(friendly(error,"Não foi possível criar o administrador."));}return result;});

export const saveOnboardingSurvey=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>surveyInput.parse(v)).handler(async({context,data})=>{await platformAccess(context);const {data:result,error}=await privateRpc<{id:string}>("save_onboarding_survey",{_cartorio_id:data.registryId,_name:data.name,_description:data.description,_use_template:data.useTemplate});if(error||!result)throw new Error(friendly(error,"Não foi possível salvar a pesquisa."));return result;});
export const publishOnboardingSurvey=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>idInput.parse(v)).handler(async({context,data})=>{await platformAccess(context);const {data:result,error}=await privateRpc<{id:string}>("publish_onboarding_survey",{_cartorio_id:data.registryId});if(error||!result)throw new Error(friendly(error,"Não foi possível publicar a pesquisa."));return result;});
export const saveOnboardingPoint=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>pointInput.parse(v)).handler(async({context,data})=>{await platformAccess(context);const {data:result,error}=await privateRpc<{id:string;code:string}>("save_onboarding_point",{_cartorio_id:data.registryId,_name:data.name,_location:data.location,_description:data.description});if(error||!result)throw new Error(friendly(error,"Não foi possível salvar o ponto."));return result;});
export const prepareOnboardingTest=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>idInput.parse(v)).handler(async({context,data})=>{await platformAccess(context);const {data:result,error}=await privateRpc<{code:string;testToken:string}>("prepare_onboarding_test",{_cartorio_id:data.registryId});if(error||!result)throw new Error(friendly(error,"Não foi possível preparar o teste."));return result;});
export const setOnboardingStatus=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>idInput.extend({action:z.enum(["activate","deactivate","reactivate"])}).parse(v)).handler(async({context,data})=>{await platformAccess(context);const {data:result,error}=await privateRpc<{status:OnboardingStatus}>("set_onboarding_operational_status",{_cartorio_id:data.registryId,_action:data.action});if(error||!result)throw new Error(friendly(error,"Não foi possível alterar a situação do cartório."));return result;});