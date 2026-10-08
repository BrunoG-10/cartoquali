import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { describeAnswer } from "@/lib/multiple-choice";

const statuses = ["nova", "em_analise", "em_tratamento", "resolvida", "encerrada"] as const;
const priorities = ["baixa", "media", "alta", "critica"] as const;
const categories = [
  "atendimento",
  "tempo",
  "clareza",
  "resolutividade",
  "estrutura",
  "processo",
  "outro",
] as const;
const origins = [
  "avaliacao_usuario",
  "indicador",
  "equipe_cartorio",
  "auditoria_interna",
  "outro",
] as const;
const managingRoles = ["PLATFORM_ADMIN", "CARTORIO_ADMIN", "GESTOR"];

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(50).default(10),
  status: z.enum(statuses).optional(),
  priority: z.enum(priorities).optional(),
  category: z.enum(categories).optional(),
  responsibleId: z.string().uuid().optional(),
  evaluationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
const createInput = z.object({
  requestId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  category: z.enum(categories),
  priority: z.enum(priorities),
  origin: z.enum(origins),
  evaluationId: z.string().uuid().optional(),
  pointId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  dueDate: z.string().date().optional(),
  observation: z.string().trim().max(4000).optional(),
});
const updateInput = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  category: z.enum(categories),
  priority: z.enum(priorities),
  responsibleId: z.string().uuid().nullable(),
  status: z.enum(statuses),
  dueDate: z.string().date().nullable(),
  observation: z.string().trim().max(4000).nullable(),
});

const occurrenceColumns =
  "id, avaliacao_id, ponto_id, titulo, categoria, descricao, prioridade, responsavel_id, status, origem, prazo, data_abertura, data_resolucao, observacao, created_at, updated_at, criado_por_id, encerrado_por_id";

async function permissions(context: { supabase: any; userId: string }) {
  const { data: profile } = await context.supabase
    .from("usuarios")
    .select("id, cartorio_id, nome, status")
    .eq("auth_user_id", context.userId)
    .maybeSingle();
  if (!profile || profile.status !== "ativo") throw new Error("Acesso não autorizado.");
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.id);
  const roleValues = (roles ?? []).map((item: { role: string }) => item.role);
  return {
    profile,
    roles: roleValues,
    canManage: roleValues.some((role: string) => managingRoles.includes(role)),
  };
}

export const listOccurrences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => listInput.parse(input))
  .handler(async ({ context, data }) => {
    const access = await permissions(context);
    const from = (data.page - 1) * data.pageSize;
    let query = context.supabase
      .from("ocorrencias_qualidade")
      .select(occurrenceColumns, { count: "exact" });
    if (data.status) query = query.eq("status", data.status);
    if (data.priority) query = query.eq("prioridade", data.priority);
    if (data.category) query = query.eq("categoria", data.category);
    if (data.responsibleId) query = query.eq("responsavel_id", data.responsibleId);
    if (data.evaluationId) query = query.eq("avaliacao_id", data.evaluationId);
    if (data.startDate) query = query.gte("data_abertura", data.startDate);
    if (data.endDate) query = query.lte("data_abertura", data.endDate);
    const {
      data: rows,
      error,
      count,
    } = await query
      .order("data_abertura", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error("Não foi possível carregar as ocorrências.");
    const pointIds = [
      ...new Set((rows ?? []).flatMap((row: any) => (row.ponto_id ? [row.ponto_id] : []))),
    ] as string[];
    const userIds = [
      ...new Set(
        (rows ?? []).flatMap((row: any) => (row.responsavel_id ? [row.responsavel_id] : [])),
      ),
    ] as string[];
    const [{ data: points }, { data: owners }, { data: filterPoints }, { data: filterUsers }] =
      await Promise.all([
        pointIds.length
          ? context.supabase.from("pontos_avaliacao").select("id, nome").in("id", pointIds)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? context.supabase.from("usuarios").select("id, nome").in("id", userIds)
          : Promise.resolve({ data: [] }),
        context.supabase.from("pontos_avaliacao").select("id, nome").order("nome"),
        context.supabase.from("usuarios").select("id, nome").eq("status", "ativo").order("nome"),
      ]);
    const pointMap = new Map((points ?? []).map((item: any) => [item.id, item.nome]));
    const ownerMap = new Map((owners ?? []).map((item: any) => [item.id, item.nome]));
    return {
      items: (rows ?? []).map((row: any) => ({
        ...row,
        pointName: row.ponto_id ? (pointMap.get(row.ponto_id) ?? "Ponto indisponível") : null,
        responsibleName: row.responsavel_id
          ? (ownerMap.get(row.responsavel_id) ?? "Usuário indisponível")
          : null,
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      points: filterPoints ?? [],
      users: filterUsers ?? [],
      canManage: access.canManage,
      currentUserId: access.profile.id,
    };
  });

export const getOccurrenceDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const access = await permissions(context);
    const { data: row, error } = await context.supabase
      .from("ocorrencias_qualidade")
      .select(occurrenceColumns)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a ocorrência.");
    if (!row) return null;
    const [
      { data: point },
      { data: owner },
      { data: creator },
      { data: closer },
      { data: logs },
      { data: evaluation },
    ] = await Promise.all([
      row.ponto_id
        ? context.supabase
            .from("pontos_avaliacao")
            .select("id, nome")
            .eq("id", row.ponto_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      row.responsavel_id
        ? context.supabase
            .from("usuarios")
            .select("id, nome")
            .eq("id", row.responsavel_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      row.criado_por_id
        ? context.supabase
            .from("usuarios")
            .select("id, nome")
            .eq("id", row.criado_por_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      row.encerrado_por_id
        ? context.supabase
            .from("usuarios")
            .select("id, nome")
            .eq("id", row.encerrado_por_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      context.supabase
        .from("audit_logs")
        .select("id, user_id, action, metadata, created_at")
        .eq("entity", "quality_occurrence")
        .eq("entity_id", row.id)
        .order("created_at", { ascending: false }),
      row.avaliacao_id
        ? context.supabase
            .from("avaliacoes")
            .select(
              "id, ponto_id, pesquisa_id, nota_geral, comentario, deseja_contato, anonymous, created_at",
            )
            .eq("id", row.avaliacao_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    let evaluationDetail = null;
    if (evaluation) {
      const [{ data: survey }, { data: evaluationPoint }, { data: answers }] = await Promise.all([
        context.supabase
          .from("pesquisas")
          .select("id, nome")
          .eq("id", evaluation.pesquisa_id)
          .maybeSingle(),
        context.supabase
          .from("pontos_avaliacao")
          .select("id, nome")
          .eq("id", evaluation.ponto_id)
          .maybeSingle(),
        context.supabase
          .from("respostas")
          .select("id, pergunta_id, valor, resposta_texto")
          .eq("avaliacao_id", evaluation.id),
      ]);
      const questionIds = (answers ?? []).map((item: any) => item.pergunta_id);
      const { data: questions } = questionIds.length
        ? await context.supabase.from("perguntas").select("id, texto, ordem").in("id", questionIds)
        : { data: [] };
      const questionMap = new Map((questions ?? []).map((item: any) => [item.id, item]));
      const canViewContact = access.roles.some((role: string) =>
        ["PLATFORM_ADMIN", "CARTORIO_ADMIN"].includes(role),
      );
      const { data: contact } =
        canViewContact && evaluation.deseja_contato
          ? await context.supabase
              .from("evaluation_contacts")
              .select("name,phone,email")
              .eq("evaluation_id", evaluation.id)
              .maybeSingle()
          : { data: null };
      if (contact)
        await context.supabase.rpc("log_privacy_event", {
          _action: "restricted_contact_viewed",
          _entity: "evaluation",
          _entity_id: evaluation.id,
          _metadata: { surface: "occurrence_detail" },
        });
      evaluationDetail = {
        id: evaluation.id,
        rating: evaluation.nota_geral,
        createdAt: evaluation.created_at,
        pointName: evaluationPoint?.nome ?? "Ponto indisponível",
        surveyName: survey?.nome ?? "Pesquisa indisponível",
        comment: evaluation.comentario,
        anonymous: evaluation.anonymous,
        contact: contact
          ? { name: contact.name, phone: contact.phone, email: contact.email }
          : null,
        contactRestricted: evaluation.deseja_contato && !canViewContact,
        answers: (answers ?? [])
          .map((answer: any) => ({
            id: answer.id,
            question: questionMap.get(answer.pergunta_id)?.texto ?? "Pergunta indisponível",
            order: questionMap.get(answer.pergunta_id)?.ordem ?? 999,
            value: describeAnswer(
              Array.isArray(answer.valor)
                ? answer.valor.map(String)
                : answer.valor == null
                  ? []
                  : [String(answer.valor)],
              answer.resposta_texto,
            ),
          }))
          .sort((a: any, b: any) => a.order - b.order),
      };
    }
    const logUserIds = [
      ...new Set((logs ?? []).flatMap((log: any) => (log.user_id ? [log.user_id] : []))),
    ] as string[];
    const { data: logUsers } = logUserIds.length
      ? await context.supabase.from("usuarios").select("id, nome").in("id", logUserIds)
      : { data: [] };
    const logUserMap = new Map((logUsers ?? []).map((item: any) => [item.id, item.nome]));
    return {
      ...row,
      pointName: point?.nome ?? null,
      responsibleName: owner?.nome ?? null,
      creatorName: creator?.nome ?? null,
      closerName: closer?.nome ?? null,
      canManage: access.canManage,
      evaluation: evaluationDetail,
      history: (logs ?? []).map((log: any) => ({
        id: log.id,
        action: log.action,
        metadata: log.metadata as Json,
        createdAt: log.created_at,
        userName: log.user_id ? (logUserMap.get(log.user_id) ?? "Usuário indisponível") : "Sistema",
      })),
    };
  });

export const createOccurrence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => createInput.parse(input))
  .handler(async ({ context, data }) => {
    const params = {
      _client_request_id: data.requestId,
      _title: data.title,
      _description: data.description,
      _category: data.category,
      _priority: data.priority,
      _origin: data.origin,
      ...(data.evaluationId ? { _evaluation_id: data.evaluationId } : {}),
      ...(data.pointId ? { _point_id: data.pointId } : {}),
      ...(data.responsibleId ? { _responsible_id: data.responsibleId } : {}),
      ...(data.dueDate ? { _due_date: data.dueDate } : {}),
      ...(data.observation ? { _observation: data.observation } : {}),
    };
    const callRpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: Json | null; error: { message: string } | null }>;
    const { data: result, error } = await callRpc("create_quality_occurrence", params);
    if (error)
      throw new Error(
        error.message.includes("forbidden")
          ? "Você não possui permissão para criar ocorrências."
          : error.message.includes("not_found")
            ? "A avaliação, o ponto ou o responsável não pertence ao seu cartório."
            : "Não foi possível criar a ocorrência.",
      );
    return result;
  });

export const updateOccurrence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateInput.parse(input))
  .handler(async ({ context, data }) => {
    const params = {
      _id: data.id,
      _expected_updated_at: data.expectedUpdatedAt,
      _title: data.title,
      _description: data.description,
      _category: data.category,
      _priority: data.priority,
      _responsible_id: data.responsibleId,
      _status: data.status,
      _due_date: data.dueDate,
      _observation: data.observation,
    };
    const callRpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: Json | null; error: { message: string } | null }>;
    const { data: result, error } = await callRpc("update_quality_occurrence", params);
    if (error) {
      if (error.message.includes("concurrent_update"))
        throw new Error(
          "Esta ocorrência foi alterada por outra pessoa. Atualize os dados e tente novamente.",
        );
      if (error.message.includes("invalid_status_transition"))
        throw new Error("Esta transição de status não é permitida.");
      if (error.message.includes("resolution_details_required"))
        throw new Error("Informe um responsável e o tratamento antes de resolver.");
      if (error.message.includes("forbidden"))
        throw new Error("Você não possui permissão para alterar ocorrências.");
      throw new Error("Não foi possível atualizar a ocorrência.");
    }
    return result;
  });
