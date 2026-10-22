import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/cartoquali/primitives";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade e uso dos dados — CartoQuali" },
      {
        name: "description",
        content:
          "Como o CartoQuali trata avaliações, contatos opcionais e solicitações de privacidade.",
      },
      { property: "og:title", content: "Privacidade e uso dos dados — CartoQuali" },
      {
        property: "og:description",
        content: "Informações de privacidade da avaliação CartoQuali.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <main className="mx-auto max-w-3xl">
        {/* Opened in a new tab from the survey, so "back" would land on an empty /avaliar. */}
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
                <ShieldCheck />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-primary">CartoQuali</p>
                <h1 className="font-display text-3xl font-bold">Aviso de privacidade</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Versão 1.1 · atualizado em outubro de 2026 · conforme a Lei Geral de Proteção de
                  Dados (Lei nº 13.709/2018)
                </p>
              </div>
            </div>
            <div className="mt-7 space-y-6 text-sm leading-7 text-muted-foreground">
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  O que é o CartoQuali
                </h2>
                <p>
                  É uma plataforma de avaliação e gestão da qualidade usada pelo cartório
                  responsável pelo ponto de atendimento. O CartoQuali fornece a tecnologia; o
                  cartório define as finalidades e regras operacionais do tratamento.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Quem é responsável pelos seus dados
                </h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong className="text-foreground">Controlador:</strong> o cartório que prestou
                    o seu atendimento, cujo nome aparece na tela da avaliação. É ele quem decide
                    como as avaliações são usadas.
                  </li>
                  <li>
                    <strong className="text-foreground">Operador:</strong> o CartoQuali, que trata
                    os dados em nome do cartório e somente conforme as instruções dele, para operar
                    a plataforma.
                  </li>
                  <li>
                    <strong className="text-foreground">Encarregado do cartório:</strong> o nome e o
                    contato aparecem na tela inicial da avaliação. Se não aparecerem, use o contato
                    de privacidade do CartoQuali no fim desta página.
                  </li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Dados da avaliação
                </h2>
                <p>
                  São coletados nota, respostas, ponto, pesquisa, data e, quando você escrever,
                  comentário. A avaliação não exige conta ou identificação no cadastro do
                  CartoQuali. Campos de texto livre podem receber informações pessoais; evite
                  informar dados seus ou de terceiros sem necessidade.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Contato opcional</h2>
                <p>
                  Nome, telefone e e-mail são opcionais e ficam separados da resposta. Eles só são
                  coletados quando você pede retorno e marca uma autorização específica. Não
                  integram indicadores, rankings ou relatórios gerais.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Por que podemos tratar esses dados
                </h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong className="text-foreground">Avaliação:</strong> legítimo interesse do
                    cartório em conhecer a experiência de quem atende e melhorar o serviço (art. 7º,
                    IX, da LGPD).
                  </li>
                  <li>
                    <strong className="text-foreground">Contato para retorno:</strong> o seu
                    consentimento, dado ao marcar a autorização (art. 7º, I). Você pode revogá-lo a
                    qualquer momento.
                  </li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Finalidade e compartilhamento
                </h2>
                <p>
                  As respostas apoiam a melhoria do atendimento, indicadores agregados, tratamento
                  de ocorrências e planos de melhoria. O acesso administrativo é limitado por função
                  e cartório. Não há uso para marketing, CRM, disparos ou venda de dados.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Equipe do cartório
                </h2>
                <p>
                  Para quem usa o painel administrativo, tratamos nome, e-mail, telefone, perfil de
                  acesso, data do último acesso e o registro das ações feitas no sistema
                  (auditoria). A finalidade é controlar o acesso, dar segurança e manter o histórico
                  das decisões de qualidade, conforme o contrato com o cartório (art. 7º, V e IX, e
                  art. 46 da LGPD).
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Pedido de demonstração (site comercial)
                </h2>
                <p>
                  No formulário da página inicial, o CartoQuali é o controlador. Recebemos nome,
                  cartório, cidade/UF, cargo, WhatsApp e e-mail somente para responder ao pedido e
                  conduzir a conversa comercial (art. 7º, V). Os dados ficam apenas pelo tempo
                  necessário para isso, e você pode pedir a exclusão a qualquer momento pelo contato
                  abaixo. Ao enviar, a conversa continua no WhatsApp, que tem a própria política de
                  privacidade.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Fornecedores e local dos dados
                </h2>
                <p>Para funcionar, o CartoQuali usa fornecedores que tratam dados em seu nome:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong className="text-foreground">Supabase:</strong> banco de dados,
                    autenticação e envio dos e-mails de convite e de senha;
                  </li>
                  <li>
                    <strong className="text-foreground">Cloudflare e Lovable:</strong> hospedagem e
                    entrega do site, proteção contra ataques e estatísticas técnicas de acesso às
                    páginas.
                  </li>
                </ul>
                <p className="mt-2">
                  Esses fornecedores podem manter servidores fora do Brasil. Quando houver
                  transferência internacional, ela segue o art. 33 da LGPD e as regras da ANPD.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Cookies e armazenamento no navegador
                </h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong className="text-foreground">Proteção do site:</strong> um cookie técnico
                    da Cloudflare ajuda a distinguir pessoas de robôs.
                  </li>
                  <li>
                    <strong className="text-foreground">Avaliação:</strong> identificadores
                    temporários guardados na aba do navegador evitam envios duplicados e abusos.
                    Eles não identificam você e somem ao fechar a aba.
                  </li>
                  <li>
                    <strong className="text-foreground">Painel administrativo:</strong> a sessão de
                    login da equipe fica guardada no navegador até a saída.
                  </li>
                </ul>
                <p className="mt-2">
                  Não usamos cookies de publicidade nem compartilhamos dados para anúncios.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Armazenamento e segurança
                </h2>
                <p>
                  Há isolamento por cartório, controle de acesso por perfil, conexão criptografada
                  (HTTPS) e auditoria das ações administrativas. Logs técnicos de infraestrutura
                  podem existir para segurança e disponibilidade; por isso, não prometemos anonimato
                  absoluto. Se ocorrer um incidente de segurança que possa trazer risco relevante, o
                  cartório e o CartoQuali comunicam a ANPD e as pessoas afetadas, como a lei
                  determina (art. 48).
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Retenção</h2>
                <p>
                  Os dados são mantidos enquanto forem necessários para as finalidades acima e pelo
                  prazo definido pelo cartório em contrato. Os dados de contato servem apenas ao
                  retorno pedido. A qualquer momento, o cartório pode remover o contato e redigir
                  textos livres, preservando notas e indicadores agregados.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Seus direitos</h2>
                <p>A LGPD (art. 18) garante a você, entre outros, os direitos de:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>confirmar se há tratamento e acessar os seus dados;</li>
                  <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
                  <li>pedir anonimização, bloqueio ou eliminação de dados desnecessários;</li>
                  <li>saber com quem os dados foram compartilhados;</li>
                  <li>revogar o consentimento e se opor a um tratamento;</li>
                  <li>
                    reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em{" "}
                    <a
                      href="https://www.gov.br/anpd"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary underline"
                    >
                      gov.br/anpd
                    </a>
                    .
                  </li>
                </ul>
                <p className="mt-2">
                  Para exercer esses direitos, fale com o cartório ou escreva para o contato de
                  privacidade abaixo, que encaminha o pedido ao cartório responsável. A
                  identificação mínima necessária pode ser solicitada para localizar a informação e
                  evitar entrega indevida.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-bold text-foreground">Alterações</h2>
                <p>
                  Este aviso pode ser atualizado. A versão mostrada no momento de uma autorização de
                  contato fica registrada junto à solicitação.
                </p>
              </section>
              <section className="rounded-md bg-muted p-4">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                  <LockKeyhole className="size-4" />
                  Contato de privacidade
                </h2>
                <p>
                  Dúvidas, pedidos e reclamações sobre dados pessoais:{" "}
                  <a
                    href="mailto:cartoquali@gmail.com"
                    className="font-semibold text-primary underline"
                  >
                    cartoquali@gmail.com
                  </a>
                  . Respondemos ou encaminhamos ao cartório responsável o quanto antes.
                </p>
              </section>
              <p>
                Consulte também os{" "}
                <Link to="/termos" className="font-semibold text-primary underline">
                  Termos de uso
                </Link>
                .
              </p>
            </div>
          </GlassPanel>
        </div>
      </main>
    </div>
  );
}
