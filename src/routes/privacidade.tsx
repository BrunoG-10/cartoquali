import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/cartoquali/primitives";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [
    { title: "Privacidade e uso dos dados — CartoQuali" },
    { name: "description", content: "Como os dados opcionais da avaliação são tratados no MVP CartoQuali." },
    { property: "og:title", content: "Privacidade e uso dos dados — CartoQuali" },
    { property: "og:description", content: "Informações de privacidade da avaliação CartoQuali." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <div className="min-h-screen bg-background px-4 py-10"><main className="mx-auto max-w-3xl"><Button asChild variant="ghost"><Link to="/avaliar"><ArrowLeft/>Voltar à avaliação</Link></Button><div className="mt-5"><GlassPanel><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck/></span><div><p className="text-xs font-semibold uppercase text-primary">CartoQuali</p><h1 className="font-display text-3xl font-bold">Privacidade e uso dos dados</h1></div></div><div className="mt-7 space-y-6 text-sm leading-7 text-muted-foreground"><section><h2 className="font-display text-lg font-bold text-foreground">Avaliação anônima</h2><p>A avaliação não exige cadastro, login ou identificação pessoal. Nota, respostas e comentário são usados para apoiar a melhoria do atendimento.</p></section><section><h2 className="font-display text-lg font-bold text-foreground">Solicitação de contato</h2><p>Nome, telefone e e-mail são opcionais. Esses dados só são solicitados quando você pede retorno e serão usados exclusivamente para tratar sua avaliação.</p></section><section><h2 className="font-display text-lg font-bold text-foreground">Ambiente demonstrativo</h2><p>Este MVP usa dados fictícios mantidos somente durante a sessão. Não há banco de dados, cadastro de usuários ou integração externa.</p></section><section className="rounded-md bg-muted p-4"><h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground"><LockKeyhole className="size-4"/>Responsável pelo tratamento</h2><p>Cartório Modelo de Registro Civil — identificação demonstrativa para validação do MVP.</p></section></div></GlassPanel></div></main></div>;
}