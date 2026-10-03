import { z } from "zod";

const requiredText = (label: string, max = 160) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

export const registrySchema = z.object({
  officialName: requiredText("a razão social"),
  tradeName: requiredText("o nome fantasia"),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  phone: requiredText("o telefone", 30),
});

export const userSchema = z.object({
  name: requiredText("o nome", 100),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  phone: z.string().trim().max(30),
  role: z.enum(["platform_admin", "registry_admin", "manager", "operator"], {
    required_error: "Selecione um perfil.",
  }),
});

export const surveySchema = z.object({
  name: requiredText("o nome da pesquisa", 120),
  description: z.string().trim().max(500),
  version: requiredText("a versão", 20),
});
export const questionSchema = z.object({
  text: requiredText("o texto da pergunta", 500),
  type: z.string().min(1, "Selecione o tipo."),
  dimensionId: z.string().min(1, "Selecione a dimensão."),
});
export const pointSchema = z.object({
  name: requiredText("o nome do ponto de avaliação", 120),
  location: requiredText("a localização", 160),
  description: z.string().trim().max(500, "A descrição deve ter no máximo 500 caracteres."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/, "Use 3 a 40 letras, números ou hífens no código."),
  surveyId: z.string().min(1, "Selecione uma pesquisa."),
});

export function firstValidationError(result: z.SafeParseReturnType<unknown, unknown>) {
  return result.success ? undefined : result.error.issues[0]?.message;
}

export function validatePeriod(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return "Informe as datas inicial e final.";
  return startDate <= endDate
    ? undefined
    : "A data final deve ser igual ou posterior à data inicial.";
}

export function validateContact(name: string, phone: string, email: string, consent: boolean) {
  if (name.trim().length < 2) return "Informe seu nome para solicitar contato.";
  if (!phone.trim() && !email.trim()) return "Informe um telefone ou e-mail.";
  if (email.trim() && !z.string().email().safeParse(email.trim()).success)
    return "Informe um e-mail válido.";
  if (phone.trim() && phone.replace(/\D/g, "").length < 8) return "Informe um telefone válido.";
  if (!consent) return "Confirme o uso dos dados para retorno sobre esta avaliação.";
  return undefined;
}
