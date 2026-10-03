import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const statusLabels = { nova: "Nova", em_analise: "Em análise", respondida: "Respondida" } as const;
const resolutionLabels = { sim: "Sim", parcialmente: "Parcialmente", nao: "Não" } as const;
const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(50).default(10),
  search: z.string().trim().max(120).default(""),
  pointId: z.string().uuid().optional(),
  surveyId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  status: z.enum(["nova", "em_analise", "respondida"]).optional(),
  classification: z.enum(["satisfeita", "atencao"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

type EvaluationRow = {
  id: string; cartorio_id: string; ponto_id: string; pesquisa_id: string; nota_geral: number;
  atendimento_resolvido: string | null; comentario: string | null; motivo_insatisfacao: string | null;
  deseja_contato: boolean; anonymous: boolean; status: string; created_at: string;
  nome_contato: string | null; telefone_contato: string | null; email_contato: string | null;
};

function classification(rating: number) { return rating >= 4 ? "Satisfeita" : "Atenção"; }
function summary(row: EvaluationRow, pointName: string, surveyName: string) {
  return { id: row.id, pointId: row.ponto_id, pointName, surveyId: row.pesquisa_id, surveyName, rating: row.nota_geral, classification: classification(row.nota_geral), status: statusLabels[row.status as keyof typeof statusLabels] ?? row.status, statusValue: row.status, comment: row.comentario ?? "", anonymous: row.anonymous, createdAt: row.created_at };
}

export const listEvaluations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ context, data }) => {
    const from = (data.page - 1) * data.pageSize;
    let query = context.supabase.from("avaliacoes").select("id, cartorio_id, ponto_id, pesquisa_id, nota_geral, atendimento_resolvido, comentario, motivo_insatisfacao, deseja_contato, anonymous, status, created_at, nome_contato, telefone_contato, email_contato", { count: "exact" });
    if (data.search) query = query.ilike("comentario", `%${data.search}%`);
    if (data.pointId) query = query.eq("ponto_id", data.pointId);
    if (data.surveyId) query = query.eq("pesquisa_id", data.surveyId);
    if (data.rating) query = query.eq("nota_geral", data.rating);
    if (data.status) query = query.eq("status", data.status);
    if (data.classification === "satisfeita") query = query.gte("nota_geral", 4);
    if (data.classification === "atencao") query = query.lte("nota_geral", 3);
    if (data.startDate) query = query.gte("created_at", data.startDate);
    if (data.endDate) query = query.lte("created_at", data.endDate);
    const { data: rows, error, count } = await query.order("created_at", { ascending: false }).range(from, from + data.pageSize - 1);
    if (error) throw new Error("Não foi possível carregar as avaliações.");
    const pointIds = [...new Set((rows ?? []).map((row) => row.ponto_id))];
    const surveyIds = [...new Set((rows ?? []).map((row) => row.pesquisa_id))];
    const [{ data: points }, { data: surveys }, { data: pointFilters }, { data: surveyFilters }] = await Promise.all([
      pointIds.length ? context.supabase.from("pontos_avaliacao").select("id, nome").in("id", pointIds) : Promise.resolve({ data: [] }),
      surveyIds.length ? context.supabase.from("pesquisas").select("id, nome").in("id", surveyIds) : Promise.resolve({ data: [] }),
      context.supabase.from("pontos_avaliacao").select("id, nome").order("nome"),
      context.supabase.from("pesquisas").select("id, nome").order("nome"),
    ]);
    const pointMap = new Map((points ?? []).map((item) => [item.id, item.nome]));
    const surveyMap = new Map((surveys ?? []).map((item) => [item.id, item.nome]));
    return { items: (rows ?? []).map((row) => summary(row, pointMap.get(row.ponto_id) ?? "Ponto indisponível", surveyMap.get(row.pesquisa_id) ?? "Pesquisa indisponível")), total: count ?? 0, page: data.page, pageSize: data.pageSize, points: pointFilters ?? [], surveys: surveyFilters ?? [] };
  });

export const getEvaluationDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("avaliacoes").select("id, cartorio_id, ponto_id, pesquisa_id, nota_geral, atendimento_resolvido, comentario, motivo_insatisfacao, deseja_contato, anonymous, status, created_at, nome_contato, telefone_contato, email_contato").eq("id", data.id).maybeSingle();
    if (error) throw new Error("Não foi possível carregar a avaliação.");
    if (!row) return null;
    const [{ data: point }, { data: survey }, { data: answers }, { data: profile }] = await Promise.all([
      context.supabase.from("pontos_avaliacao").select("id, nome").eq("id", row.ponto_id).maybeSingle(),
      context.supabase.from("pesquisas").select("id, nome").eq("id", row.pesquisa_id).maybeSingle(),
      context.supabase.from("respostas").select("id, pergunta_id, valor, resposta_texto, created_at").eq("avaliacao_id", row.id).order("created_at"),
      context.supabase.from("usuarios").select("id").eq("auth_user_id", context.userId).maybeSingle(),
    ]);
    const questionIds = [...new Set((answers ?? []).map((answer) => answer.pergunta_id))];
    const [{ data: questions }, { data: options }, { data: roles }] = await Promise.all([
      questionIds.length ? context.supabase.from("perguntas").select("id, texto, tipo, dimensao, ordem").in("id", questionIds).eq("pesquisa_id", row.pesquisa_id) : Promise.resolve({ data: [] }),
      questionIds.length ? context.supabase.from("opcoes_resposta").select("id, pergunta_id, texto, valor, ordem").in("pergunta_id", questionIds).order("ordem") : Promise.resolve({ data: [] }),
      profile ? context.supabase.from("user_roles").select("role").eq("user_id", profile.id) : Promise.resolve({ data: [] }),
    ]);
    const questionMap = new Map((questions ?? []).map((question) => [question.id, question]));
    const optionRows = options ?? [];
    const canViewContact = (roles ?? []).some((role) => ["CARTORIO_ADMIN", "GESTOR"].includes(role.role));
    return {
      ...summary(row, point?.nome ?? "Ponto indisponível", survey?.nome ?? "Pesquisa indisponível"),
      resolution: row.atendimento_resolvido ? resolutionLabels[row.atendimento_resolvido as keyof typeof resolutionLabels] ?? row.atendimento_resolvido : null,
      dissatisfactionReason: row.motivo_insatisfacao,
      answers: (answers ?? []).map((answer) => {
        const question = questionMap.get(answer.pergunta_id);
        const rawValue = answer.valor as Json | null;
        const values = Array.isArray(rawValue) ? rawValue.map(String) : rawValue === null ? [] : [String(rawValue)];
        const labels = values.map((value) => optionRows.find((option) => option.pergunta_id === answer.pergunta_id && option.valor === value)?.texto ?? value);
        return { id: answer.id, questionId: answer.pergunta_id, question: question?.texto ?? "Pergunta indisponível", type: question?.tipo ?? "", dimension: question?.dimensao ?? "", order: question?.ordem ?? 999, value: labels, text: answer.resposta_texto };
      }).sort((a, b) => a.order - b.order),
      contact: canViewContact && row.deseja_contato ? { name: row.nome_contato, phone: row.telefone_contato, email: row.email_contato } : null,
      contactRestricted: row.deseja_contato && !canViewContact,
    };
  });