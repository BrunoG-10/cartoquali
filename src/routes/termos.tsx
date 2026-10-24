import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/cartoquali/primitives";
import { indexableMeta, publicPageUrl } from "@/lib/seo";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — CartoQuali" },
      {
        name: "description",
        content: "Condições de uso da plataforma CartoQuali de avaliação e gestão da qualidade.",
      },
      { property: "og:title", content: "Termos de uso — CartoQuali" },
      {
        property: "og:description",
        content: "Condições de uso da plataforma CartoQuali de avaliação e gestão da qualidade.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: publicPageUrl("/termos") },
      { name: "twitter:card", content: "summary_large_image" },
      indexableMeta,
    ],
    links: [{ rel: "canonical", href: publicPageUrl("/termos") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <main className="mx-auto max-w-3xl">
        <Button asChild variant="ghost">
          <Link to="/">
            <ArrowLeft />
            Início
          </Link>
        </Button>
        <div className="mt-5">
          <GlassPanel>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileCheck2 />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-primary">CartoQuali</p>
                <h1 className="font-display text-3xl font-bold">Termos de uso</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Versão 1.1 · atualizado em outubro de 2026
                </p>
              </div>
            </div>
            <div className="mt-7 space-y-6 text-sm leading-7 text-muted-foreground">
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Finalidade</h2>
                <p>
                  O CartoQuali apoia a coleta de avaliações e a gestão da qualidade dos serviços do
                  cartório. O envio de uma avaliação deve refletir uma experiência real.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Uso responsável</h2>
                <p>
                  Não envie conteúdo ilícito, ofensivo ou dados pessoais de terceiros nos campos de
                  texto livre. Os recursos administrativos devem ser usados somente por pessoas
                  autorizadas.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Contas e acesso da equipe
                </h2>
                <p>
                  O cartório cadastra as pessoas da equipe e define o perfil de cada uma. Cada
                  acesso é pessoal: não compartilhe senha nem convite. O cartório responde pelo uso
                  feito pelas contas que criou e deve remover o acesso de quem deixar a equipe.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Suspensão de acesso
                </h2>
                <p>
                  O CartoQuali pode bloquear uma conta ou o envio de avaliações em caso de uso
                  indevido, tentativa de invasão, envio automatizado em massa ou risco à segurança
                  de outros usuários. Sempre que possível, o cartório é avisado antes, com o motivo.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Disponibilidade</h2>
                <p>
                  O serviço pode passar por manutenção e não substitui canais oficiais, judiciais ou
                  de atendimento urgente. Manutenções planejadas são feitas, sempre que possível, em
                  horários de menor uso.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Limites de responsabilidade
                </h2>
                <p>
                  Os indicadores refletem as respostas recebidas e servem de apoio à gestão; as
                  decisões tomadas a partir deles cabem ao cartório. O CartoQuali não responde pelo
                  conteúdo escrito por quem avalia nem por falhas de conexão, de aparelhos ou de
                  serviços de terceiros fora do seu controle.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Propriedade intelectual
                </h2>
                <p>
                  A plataforma, a marca CartoQuali, o código e o visual pertencem ao CartoQuali. O
                  cartório recebe uma licença de uso enquanto a contratação estiver ativa. As
                  avaliações, respostas e dados cadastrados pertencem ao cartório.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Privacidade</h2>
                <p>
                  O tratamento de informações é descrito no{" "}
                  <Link to="/privacidade" className="font-semibold text-primary underline">
                    Aviso de Privacidade
                  </Link>
                  , conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). O cartório é o
                  controlador dos dados e o CartoQuali atua como operador, seguindo as instruções do
                  cartório. A autorização para contato é separada e opcional.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Contato</h2>
                <p>
                  Dúvidas sobre estes termos ou sobre dados pessoais:{" "}
                  <a
                    href="mailto:cartoquali@gmail.com"
                    className="font-semibold text-primary underline"
                  >
                    cartoquali@gmail.com
                  </a>
                  .
                </p>
              </section>
              <section className="rounded-md bg-muted p-4">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Condições contratuais
                </h2>
                <p>
                  Responsabilidades, foro, nível de serviço e dados formais das partes são definidos
                  no contrato firmado entre o CartoQuali e cada cartório, que também regula o
                  tratamento de dados feito pelo CartoQuali como operador.
                </p>
              </section>
            </div>
          </GlassPanel>
        </div>
      </main>
    </div>
  );
}
