import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Survey, SurveyQuestion } from "@/types/cartoquali";
import { QUESTION_DIMENSION_KEYS } from "@/lib/question-dimensions";

const surveyInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000),
  version: z.string().trim().min(1).max(30),
  status: z.enum(["Ativa", "Rascunho", "Inativa"]),
  settings: z.record(z.string(), z.boolean()).optional(),
});
const questionInput = z.object({
  id: z.string().uuid().optional(),
  surveyId: z.string().uuid(),
  text: z.string().trim().min(1).max(500),
  type: z.enum(["stars", "yes_no", "scale", "text", "single_choice", "multiple_choice"]),
  dimensionId: z.enum(QUESTION_DIMENSION_KEYS),
  order: z.number().int().min(1),
  required: z.boolean(),
  active: z.boolean(),
  options: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  condition: z
    .object({
      sourceQuestionId: z.string().uuid(),
      operator: z.enum(["lte", "equals"]),
      value: z.union([z.string(), z.number(), z.boolean()]),
    })
    .optional(),
});

async function access(context: any) {
  const { data: user } = await context.supabase
    .from("usuarios")
    .select("id,status")
    .eq("auth_user_id", context.userId)
    .maybeSingle();
  if (!user || user.status !== "ativo") throw new Error("Acesso não autorizado.");
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  return {
    canManage: (roles ?? []).some((item: { role: string }) =>
      ["PLATFORM_ADMIN", "CARTORIO_ADMIN", "GESTOR"].includes(item.role),
    ),
  };
}
const mapSurvey = (row: any): Survey => ({
  id: row.id,
  registryId: row.cartorio_id,
  name: row.nome,
  description: row.descricao ?? "",
  status: row.status === "ativa" ? "Ativa" : row.status === "rascunho" ? "Rascunho" : "Inativa",
  version: row.versao,
  versionDate: row.updated_at.slice(0, 10),
  createdAt: row.created_at.slice(0, 10),
  updatedAt: row.updated_at.slice(0, 10),
  settings: {
    allowComment: true,
    allowContactRequest: true,
    requestName: true,
    requestPhone: true,
    requestEmail: true,
    showThankYou: true,
    allowAnonymous: true,
    ...row.configuracoes,
  },
});
const mapQuestion = (row: any): SurveyQuestion => ({
  id: row.id,
  registryId: row.pesquisas.cartorio_id,
  surveyId: row.pesquisa_id,
  text: row.texto,
  type: row.tipo,
  dimensionId: row.dimensao,
  order: row.ordem,
  required: row.obrigatoria,
  active: row.ativa,
  options: (row.opcoes_resposta ?? [])
    .sort((a: any, b: any) => a.ordem - b.ordem)
    .map((item: any) => item.texto),
  ...(row.condicao ? { condition: row.condicao } : {}),
  ...(row.chave_essencial ? { essentialKey: row.chave_essencial } : {}),
});

export const listSurveys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const permission = await access(context);
    const [{ data: surveys, error }, { data: questions, error: questionError }] = await Promise.all(
      [
        context.supabase.from("pesquisas").select("*").order("updated_at", { ascending: false }),
        context.supabase
          .from("perguntas")
          .select("*, pesquisas!inner(cartorio_id), opcoes_resposta(texto,valor,ordem)")
          .order("ordem"),
      ],
    );
    if (error || questionError) throw new Error("Não foi possível carregar as pesquisas.");
    return {
      surveys: (surveys ?? []).map(mapSurvey),
      questions: (questions ?? []).map(mapQuestion),
      canManage: permission.canManage,
    };
  });

export const saveSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => surveyInput.parse(value))
  .handler(async ({ context, data }) => {
    const permission = await access(context);
    if (!permission.canManage) throw new Error("Você não possui permissão para alterar pesquisas.");
    const status =
      data.status === "Ativa" ? "ativa" : data.status === "Rascunho" ? "rascunho" : "inativa";
    if (data.id) {
      // The public QR Code only serves active surveys: keep the one in use from going dark.
      if (status !== "ativa") {
        const { data: inUse } = await context.supabase
          .from("pontos_avaliacao")
          .select("id")
          .eq("pesquisa_id", data.id)
          .eq("status", "ativo")
          .limit(1);
        if (inUse?.length)
          throw new Error(
            "Esta pesquisa está em uso no QR Code ativo. Troque a pesquisa do QR Code antes de desativá-la.",
          );
      }
      const { data: row, error } = await context.supabase
        .from("pesquisas")
        .update({
          nome: data.name,
          descricao: data.description || null,
          versao: data.version,
          status,
          configuracoes: data.settings ?? {},
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error("Não foi possível atualizar a pesquisa.");
      return mapSurvey(row);
    }
    const { data: profile } = await context.supabase
      .from("usuarios")
      .select("cartorio_id")
      .eq("auth_user_id", context.userId)
      .single();
    if (!profile) throw new Error("Perfil não encontrado.");
    const { data: row, error } = await context.supabase
      .from("pesquisas")
      .insert({
        cartorio_id: profile.cartorio_id,
        nome: data.name,
        descricao: data.description || null,
        versao: data.version,
        status,
        configuracoes: data.settings ?? {},
      })
      .select("*")
      .single();
    if (error) throw new Error("Não foi possível criar a pesquisa.");
    return mapSurvey(row);
  });

export const saveSurveyQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => questionInput.parse(value))
  .handler(async ({ context, data }) => {
    const permission = await access(context);
    if (!permission.canManage) throw new Error("Você não possui permissão para alterar perguntas.");
    if (data.id) {
      // Essential questions keep their structure and options; only the text can change.
      const { data: current } = await context.supabase
        .from("perguntas")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if ((current as { chave_essencial?: string | null } | null)?.chave_essencial) {
        const { error } = await context.supabase
          .from("perguntas")
          .update({ texto: data.text })
          .eq("id", data.id);
        if (error) throw new Error("Não foi possível salvar a pergunta.");
        return { id: data.id };
      }
    }
    const payload = {
      pesquisa_id: data.surveyId,
      texto: data.text,
      tipo: data.type,
      dimensao: data.dimensionId,
      ordem: data.order,
      // Comments (free text) are always optional for the citizen.
      obrigatoria: data.type === "text" ? false : data.required,
      ativa: data.active,
      condicao: data.condition ?? null,
    };
    const result = data.id
      ? await context.supabase
          .from("perguntas")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : await context.supabase.from("perguntas").insert(payload).select("id").single();
    if (result.error) throw new Error("Não foi possível salvar a pergunta.");
    const questionId = result.data.id;
    if (data.id) {
      const { error } = await context.supabase
        .from("opcoes_resposta")
        .delete()
        .eq("pergunta_id", questionId);
      if (error) throw new Error("Não foi possível atualizar as opções.");
    }
    if (data.options?.length) {
      const { error } = await context.supabase.from("opcoes_resposta").insert(
        data.options.map((text, index) => ({
          pergunta_id: questionId,
          texto: text,
          valor: text,
          ordem: index + 1,
        })),
      );
      if (error) throw new Error("Não foi possível salvar as opções.");
    }
    return { id: questionId };
  });

export const deactivateSurveyQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ context, data }) => {
    const permission = await access(context);
    if (!permission.canManage) throw new Error("Você não possui permissão para alterar perguntas.");
    const { error } = await context.supabase
      .from("perguntas")
      .update({ ativa: false })
      .eq("id", data.id);
    if (error)
      throw new Error(
        error.message.includes("essential_question_locked")
          ? "Esta pergunta é essencial para os indicadores e não pode ser desativada."
          : "Não foi possível desativar a pergunta.",
      );
    return { ok: true };
  });
