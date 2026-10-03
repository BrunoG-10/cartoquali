import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/cartoquali/primitives";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [
    { title: "Termos de uso — CartoQuali" },
    { name: "description", content: "Condições operacionais de uso do CartoQuali, sujeitas a revisão jurídica." },
    { property: "og:title", content: "Termos de uso — CartoQuali" },
    { property: "og:description", content: "Condições operacionais de uso do CartoQuali, sujeitas a revisão jurídica." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TermsPage,
});

function TermsPage() {
  return <div className="min-h-screen bg-background px-4 py-10"><main className="mx-auto max-w-3xl"><Button asChild variant="ghost"><Link to="/avaliar"><ArrowLeft/>Voltar à avaliação</Link></Button><div className="mt-5"><GlassPanel><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileCheck2/></span><div><p className="text-xs font-semibold uppercase text-primary">CartoQuali</p><h1 className="font-display text-3xl font-bold">Termos de uso</h1></div></div><div className="mt-7 space-y-6 text-sm leading-7 text-muted-foreground"><section><h2 className="font-display text-lg font-bold text-foreground">Finalidade</h2><p>O CartoQuali apoia a coleta de avaliações e a gestão da qualidade dos serviços do cartório. O envio de uma avaliação deve refletir uma experiência real.</p></section><section><h2 className="font-display text-lg font-bold text-foreground">Uso responsável</h2><p>Não envie conteúdo ilícito, ofensivo ou dados pessoais de terceiros nos campos de texto livre. Os recursos administrativos devem ser usados somente por pessoas autorizadas.</p></section><section><h2 className="font-display text-lg font-bold text-foreground">Disponibilidade</h2><p>O serviço pode passar por manutenção e não substitui canais oficiais, judiciais ou de atendimento urgente.</p></section><section><h2 className="font-display text-lg font-bold text-foreground">Privacidade</h2><p>O tratamento de informações é descrito no <Link to="/privacidade" className="font-semibold text-primary underline">Aviso de Privacidade</Link>. A autorização para contato é separada e opcional.</p></section><section className="rounded-md bg-muted p-4"><h2 className="font-display text-lg font-bold text-foreground">Revisão jurídica pendente</h2><p>Este texto é uma base operacional e precisa de revisão jurídica antes da publicação comercial. Responsabilidades, foro, nível de serviço e dados formais das partes ainda dependem de definição contratual.</p></section></div></GlassPanel></div></main></div>;
}