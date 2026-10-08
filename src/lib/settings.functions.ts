import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const optionalDays = z.union([z.number().int().min(1).max(36500), z.null()]);
const settingsInput = z.object({
  displayName: z.string().trim().min(1).max(120),
  language: z.string().trim().min(2).max(20),
  dateFormat: z.string().trim().min(1).max(30),
  timezone: z.string().trim().min(1).max(80),
  thankYouMessage: z.string().trim().min(1).max(500),
  defaultSurveyId: z.string().uuid().nullable(),
  anonymousEvaluations: z.boolean(),
  allowComments: z.boolean(),
  allowContact: z.boolean(),
  activeMethodology: z.string().trim().min(1).max(120),
  privacyContactChannel: z.string().trim().max(500).nullable(),
  privacyNoticeVersion: z.string().trim().min(1).max(30),
  evaluationRetentionDays: optionalDays,
  contactRetentionDays: optionalDays,
  auditRetentionDays: optionalDays,
});
async function admin(context: any) {
  const { data: user } = await context.supabase
    .from("usuarios")
    .select("id,cartorio_id,status")
    .eq("auth_user_id", context.userId)
    .maybeSingle();
  if (!user || user.status !== "ativo") throw new Error("Acesso não autorizado.");
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (
    !roles?.some((item: { role: string }) =>
      ["PLATFORM_ADMIN", "CARTORIO_ADMIN"].includes(item.role),
    )
  )
    throw new Error("Você não possui permissão para acessar configurações.");
  return user;
}
export const getRegistrySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await admin(context);
    const [{ data: settings, error }, { data: surveys }] = await Promise.all([
      context.supabase.from("configuracoes_cartorio").select("*").single(),
      context.supabase.from("pesquisas").select("id,nome,status").order("nome"),
    ]);
    if (error) throw new Error("Não foi possível carregar as configurações.");
    return {
      settings: {
        displayName: settings.nome_exibicao,
        language: settings.idioma,
        dateFormat: settings.formato_data,
        timezone: settings.fuso_horario,
        thankYouMessage: settings.mensagem_agradecimento,
        defaultSurveyId: settings.pesquisa_padrao_id,
        anonymousEvaluations: settings.permite_avaliacao_anonima,
        allowComments: settings.permite_comentarios,
        allowContact: settings.permite_contato,
        activeMethodology: settings.metodologia_ativa,
        privacyContactChannel: settings.privacy_contact_channel,
        privacyNoticeVersion: settings.privacy_notice_version,
        evaluationRetentionDays: settings.evaluation_retention_days,
        contactRetentionDays: settings.contact_retention_days,
        auditRetentionDays: settings.audit_retention_days,
      },
      surveys: surveys ?? [],
    };
  });
export const saveRegistrySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => settingsInput.parse(value))
  .handler(async ({ context, data }) => {
    const user = await admin(context);
    const { error } = await context.supabase
      .from("configuracoes_cartorio")
      .update({
        nome_exibicao: data.displayName,
        idioma: data.language,
        formato_data: data.dateFormat,
        fuso_horario: data.timezone,
        mensagem_agradecimento: data.thankYouMessage,
        pesquisa_padrao_id: data.defaultSurveyId,
        permite_avaliacao_anonima: data.anonymousEvaluations,
        permite_comentarios: data.allowComments,
        permite_contato: data.allowContact,
        metodologia_ativa: data.activeMethodology,
        privacy_contact_channel: data.privacyContactChannel,
        privacy_notice_version: data.privacyNoticeVersion,
        evaluation_retention_days: data.evaluationRetentionDays,
        contact_retention_days: data.contactRetentionDays,
        audit_retention_days: data.auditRetentionDays,
      })
      .eq("cartorio_id", user.cartorio_id);
    if (error) throw new Error("Não foi possível salvar as configurações.");
    return { ok: true };
  });
