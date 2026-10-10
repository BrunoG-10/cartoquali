import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { untypedDb } from "@/lib/untyped-db";

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
  classification: z.enum(["satisfeita", "atencao", "ruim"]).optional(),
  /** Só avaliações em que a pessoa pediu retorno. */
  contactRequested: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

type EvaluationRow = {
  id: string;
  cartorio_id: string;
  ponto_id: string;
  pesquisa_id: string;
  nota_geral: number;
  atendimento_resolvido: string | null;
  comentario: string | null;
  motivo_insatisfacao: string | null;
  deseja_contato: boolean;
  anonymous: boolean;
  status: string;
  created_at: string;
};

function classification(rating: number) {
  return rating >= 4 ? "Satisfeita" : "Atenção";
}
function summary(row: EvaluationRow, pointName: string, surveyName: string) {
  return {
    id: row.id,
    pointId: row.ponto_id,
    pointName,
    surveyId: row.pesquisa_id,
    surveyName,
    rating: row.nota_geral,
    classification: classification(row.nota_geral),
    status: statusLabels[row.status as keyof typeof statusLabels] ?? row.status,
    statusValue: row.status,
    comment: row.comentario ?? "",
    anonymous: row.anonymous,
    contactRequested: row.deseja_contato,
    createdAt: row.created_at,
  };
}

// Service chosen by the citizen (QR Code único). "Outro serviço" when flagged; null when skipped.
async function loadServiceNames(client: unknown, evaluationIds: string[]) {
  const names = new Map<string, string>();
  if (!evaluationIds.length) return names;
  const db = untypedDb(client);
  const { data } = await db
    .from("avaliacoes")
    .select("id, servico_id, servico_outro")
    .in("id", evaluationIds);
  const serviceIds = [...new Set((data ?? []).map((row) => row.servico_id).filter(Boolean))];
  const { data: services } = serviceIds.length
    ? await db.from("servicos_cartorio").select("id, nome").in("id", serviceIds)
    : { data: [] };
  const serviceMap = new Map((services ?? []).map((item) => [item.id, String(item.nome)]));
  for (const row of data ?? []) {
    if (row.servico_id && serviceMap.has(row.servico_id))
      names.set(row.id, serviceMap.get(row.servico_id)!);
    else if (row.servico_outro) names.set(row.id, "Outro serviço");
  }
  return names;
}

export const listEvaluations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => listInput.parse(input))
  .handler(async ({ context, data }) => {
    const from = (data.page - 1) * data.pageSize;
    let query = context.supabase
      .from("avaliacoes")
      .select(
        "id, cartorio_id, ponto_id, pesquisa_id, nota_geral, atendimento_resolvido, comentario, motivo_insatisfacao, deseja_contato, anonymous, status, created_at",
        { count: "exact" },
      )
      .eq("is_test", false);
    if (data.search) query = query.ilike("comentario", `%${data.search}%`);
    if (data.pointId) query = query.eq("ponto_id", data.pointId);
    if (data.surveyId) query = query.eq("pesquisa_id", data.surveyId);
    if (data.rating) query = query.eq("nota_geral", data.rating);
    if (data.status) query = query.eq("status", data.status);
    if (data.classification === "satisfeita") query = query.gte("nota_geral", 4);
    if (data.classification === "atencao") query = query.lte("nota_geral", 3);
    if (data.classification === "ruim") query = query.lte("nota_geral", 2);
    if (data.contactRequested) query = query.eq("deseja_contato", true);
    if (data.startDate) query = query.gte("created_at", data.startDate);
    if (data.endDate) query = query.lte("created_at", data.endDate);
    const {
      data: rows,
      error,
      count,
    } = await query.order("created_at", { ascending: false }).range(from, from + data.pageSize - 1);
    if (error) throw new Error("Não foi possível carregar as avaliações.");
    const pointIds = [...new Set((rows ?? []).map((row) => row.ponto_id))];
    const surveyIds = [...new Set((rows ?? []).map((row) => row.pesquisa_id))];
    const [{ data: points }, { data: surveys }, { data: pointFilters }, { data: surveyFilters }] =
      await Promise.all([
        pointIds.length
          ? context.supabase.from("pontos_avaliacao").select("id, nome").in("id", pointIds)
          : Promise.resolve({ data: [] }),
        surveyIds.length
          ? context.supabase.from("pesquisas").select("id, nome").in("id", surveyIds)
          : Promise.resolve({ data: [] }),
        context.supabase.from("pontos_avaliacao").select("id, nome").order("nome"),
        context.supabase.from("pesquisas").select("id, nome").order("nome"),
      ]);
    const pointMap = new Map((points ?? []).map((item) => [item.id, item.nome]));
    const surveyMap = new Map((surveys ?? []).map((item) => [item.id, item.nome]));
    const serviceNames = await loadServiceNames(
      context.supabase,
      (rows ?? []).map((row) => row.id),
    );
    return {
      items: (rows ?? []).map((row) => ({
        ...summary(
          row,
          pointMap.get(row.ponto_id) ?? "Ponto indisponível",
          surveyMap.get(row.pesquisa_id) ?? "Pesquisa indisponível",
        ),
        serviceName: serviceNames.get(row.id) ?? null,
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      points: pointFilters ?? [],
      surveys: surveyFilters ?? [],
    };
  });

export const getEvaluationDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("avaliacoes")
      .select(
        "id, cartorio_id, ponto_id, pesquisa_id, nota_geral, atendimento_resolvido, comentario, motivo_insatisfacao, deseja_contato, anonymous, status, created_at",
      )
      .eq("id", data.id)
      .eq("is_test", false)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a avaliação.");
    if (!row) return null;
    const [{ data: point }, { data: survey }, { data: answers }, { data: profile }] =
      await Promise.all([
        context.supabase
          .from("pontos_avaliacao")
          .select("id, nome")
          .eq("id", row.ponto_id)
          .maybeSingle(),
        context.supabase
          .from("pesquisas")
          .select("id, nome")
          .eq("id", row.pesquisa_id)
          .maybeSingle(),
        context.supabase
          .from("respostas")
          .select("id, pergunta_id, valor, resposta_texto, created_at")
          .eq("avaliacao_id", row.id)
          .order("created_at"),
        context.supabase
          .from("usuarios")
          .select("id")
          .eq("auth_user_id", context.userId)
          .maybeSingle(),
      ]);
    const questionIds = [...new Set((answers ?? []).map((answer) => answer.pergunta_id))];
    const [{ data: questions }, { data: options }, { data: roles }] = await Promise.all([
      questionIds.length
        ? context.supabase
            .from("perguntas")
            .select("id, texto, tipo, dimensao, ordem")
            .in("id", questionIds)
            .eq("pesquisa_id", row.pesquisa_id)
        : Promise.resolve({ data: [] }),
      questionIds.length
        ? context.supabase
            .from("opcoes_resposta")
            .select("id, pergunta_id, texto, valor, ordem")
            .in("pergunta_id", questionIds)
            .order("ordem")
        : Promise.resolve({ data: [] }),
      profile
        ? context.supabase.from("user_roles").select("role").eq("user_id", profile.id)
        : Promise.resolve({ data: [] }),
    ]);
    const questionMap = new Map((questions ?? []).map((question) => [question.id, question]));
    const optionRows = options ?? [];
    const canViewContact = (roles ?? []).some((role) =>
      ["PLATFORM_ADMIN", "CARTORIO_ADMIN"].includes(role.role),
    );
    const { data: contact } =
      canViewContact && row.deseja_contato
        ? await context.supabase
            .from("evaluation_contacts")
            .select("name,phone,email")
            .eq("evaluation_id", row.id)
            .maybeSingle()
        : { data: null };
    if (contact)
      await context.supabase.rpc("log_privacy_event", {
        _action: "restricted_contact_viewed",
        _entity: "evaluation",
        _entity_id: row.id,
        _metadata: { surface: "evaluation_detail" },
      });
    const serviceNames = await loadServiceNames(context.supabase, [row.id]);
    return {
      ...summary(row, point?.nome ?? "Ponto indisponível", survey?.nome ?? "Pesquisa indisponível"),
      serviceName: serviceNames.get(row.id) ?? null,
      resolution: row.atendimento_resolvido
        ? (resolutionLabels[row.atendimento_resolvido as keyof typeof resolutionLabels] ??
          row.atendimento_resolvido)
        : null,
      dissatisfactionReason: row.motivo_insatisfacao,
      answers: (answers ?? [])
        .map((answer) => {
          const question = questionMap.get(answer.pergunta_id);
          const rawValue = answer.valor as Json | null;
          const values = Array.isArray(rawValue)
            ? rawValue.map(String)
            : rawValue === null
              ? []
              : [String(rawValue)];
          const labels = values.map(
            (value) =>
              optionRows.find(
                (option) => option.pergunta_id === answer.pergunta_id && option.valor === value,
              )?.texto ?? value,
          );
          return {
            id: answer.id,
            questionId: answer.pergunta_id,
            question: question?.texto ?? "Pergunta indisponível",
            type: question?.tipo ?? "",
            dimension: question?.dimensao ?? "",
            order: question?.ordem ?? 999,
            value: labels,
            text: answer.resposta_texto,
          };
        })
        .sort((a, b) => a.order - b.order),
      contact: contact ? { name: contact.name, phone: contact.phone, email: contact.email } : null,
      contactRestricted: row.deseja_contato && !canViewContact,
    };
  });

// Pendências que pedem ação da equipe (RLS limita ao cartório da sessão):
// pedidos de retorno não respondidos e avaliações com nota 1 ou 2 ainda "Nova".
export const getAttentionCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const base = () =>
      context.supabase
        .from("avaliacoes")
        .select("id", { count: "exact", head: true })
        .eq("is_test", false);
    const [contacts, lowRatings] = await Promise.all([
      base().eq("deseja_contato", true).neq("status", "respondida"),
      base().lte("nota_geral", 2).eq("status", "nova"),
    ]);
    if (contacts.error || lowRatings.error)
      throw new Error("Não foi possível carregar as pendências.");
    return { pendingContacts: contacts.count ?? 0, lowRatings: lowRatings.count ?? 0 };
  });

// A avaliação é imutável; a RPC muda só a situação, no cartório da sessão, e audita a troca.
export const updateEvaluationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["nova", "em_analise", "respondida"]) })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await untypedDb(context.supabase).rpc("set_evaluation_status", {
      _id: data.id,
      _status: data.status,
    });
    if (error) {
      if (error.message?.includes("forbidden"))
        throw new Error("Seu perfil pode consultar, mas não alterar a situação da avaliação.");
      throw new Error("Não foi possível alterar a situação da avaliação.");
    }
    return { ok: true };
  });
