import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/cartoquali/primitives";
import { indexableMeta, publicPageUrl } from "@/lib/seo";

const path = "/conteudos/lgpd-pesquisa-de-satisfacao-cartorio";
const title = "LGPD na pesquisa de satisfação do cartório: 5 cuidados com os dados de quem avalia";
const description =
  "Como fazer pesquisa de satisfação no cartório respeitando a LGPD: coleta mínima, contato opcional, dados isolados, acesso por perfil e trilha de auditoria.";
const published = "2026-11-04";

// Article schema so search engines and AI answers can attribute the guide to CartoQuali.
function structuredData(url: string) {
  const home = publicPageUrl("/");
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: "pt-BR",
    datePublished: published,
    dateModified: published,
    mainEntityOfPage: url,
    image: publicPageUrl("/og-image.png"),
    author: { "@type": "Organization", name: "CartoQuali", url: home },
    publisher: { "@id": `${home}#organizacao`, "@type": "Organization", name: "CartoQuali" },
  };
}

export const Route = createFileRoute("/conteudos/lgpd-pesquisa-de-satisfacao-cartorio")({
  head: () => {
    const url = publicPageUrl(path);
    return {
      meta: [
        { title: `${title} — CartoQuali` },
        { name: "description", content: description },
        indexableMeta,
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: published },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData(url)) }],
    };
  },
  component: LgpdSurveyArticle,
});

const cares = [
  {
    title: "Peça só o necessário",
    principle: "Princípio da necessidade (art. 6º, III)",
    practice:
      "Para medir a qualidade do atendimento, basta a nota e, se a pessoa quiser, um comentário. Nome, CPF e telefone não precisam ser obrigatórios. Vale também orientar quem escreve a não colocar dados pessoais no comentário.",
    mistake:
      "Formulário de papel que pede nome e telefone “para contato” e depois fica guardado na gaveta, sem controle de quem lê.",
  },
  {
    title: "Contato só se a pessoa quiser, e para um fim claro",
    principle: "Princípio da finalidade (art. 6º, I)",
    practice:
      "Quem quer retorno deixa o contato por vontade própria e autoriza o cartório a usá-lo para responder àquela avaliação. Esse contato fica separado das respostas e fora dos indicadores.",
    mistake:
      "O telefone deixado para um retorno acaba numa lista de divulgação ou é usado para qualquer outra coisa.",
  },
  {
    title: "Separe os dados de cada cartório",
    principle: "Princípio da segurança (art. 6º, VII) e art. 46",
    practice:
      "As avaliações de uma serventia não podem ficar ao alcance de outra. O ideal é que essa separação seja feita no próprio banco de dados, e não só escondendo informações na tela.",
    mistake:
      "Planilha compartilhada por link: basta um envio para a pessoa errada para expor tudo.",
  },
  {
    title: "Dê a cada pessoa só o acesso de que ela precisa",
    principle: "Princípio da prevenção (art. 6º, VIII)",
    practice:
      "Dentro do cartório, cada função vê o que precisa: a gestão acompanha o painel, a qualidade trata as ocorrências, e o contato do cidadão fica restrito a quem vai dar o retorno.",
    mistake: "Uma senha só para toda a equipe: ninguém sabe quem viu ou alterou o quê.",
  },
  {
    title: "Registre quem fez o quê, e quando",
    principle: "Princípio da responsabilização e prestação de contas (art. 6º, X)",
    practice:
      "Uma trilha de auditoria guarda as ações feitas no sistema, como mudar o status de uma ocorrência ou concluir uma ação de melhoria. Assim o cartório consegue demonstrar como trata as informações.",
    mistake: "Sem registro, a resposta para “quem mudou isso?” vira “acho que foi fulano”.",
  },
] as const;

const comparison = [
  {
    topic: "Identificação de quem avalia",
    paper: "Costuma pedir nome e telefone",
    sheet: "Depende de quem montou",
    system: "Avaliação sem cadastro e sem documento",
  },
  {
    topic: "Contato para retorno",
    paper: "Sem autorização registrada",
    sheet: "Misturado às respostas",
    system: "Opcional, autorizado e guardado à parte",
  },
  {
    topic: "Separação entre cartórios",
    paper: "Não se aplica",
    sheet: "Um link expõe tudo",
    system: "Isolamento no banco de dados",
  },
  {
    topic: "Controle de acesso",
    paper: "Quem abrir a gaveta",
    sheet: "Quem tiver o link",
    system: "Perfis por função",
  },
  {
    topic: "Histórico de ações",
    paper: "Não existe",
    sheet: "Limitado",
    system: "Trilha de auditoria",
  },
] as const;

const checklist = [
  "A avaliação funciona sem cadastro e sem pedir documento?",
  "O contato para retorno é opcional e tem autorização específica?",
  "Os dados de cada cartório ficam isolados no banco de dados?",
  "Dá para definir perfis de acesso para a equipe?",
  "As ações feitas no sistema ficam registradas?",
  "Há aviso de privacidade dizendo quem é o controlador e quem é o operador dos dados?",
  "É possível atender pedidos do titular, como remover o contato informado?",
] as const;

function LgpdSurveyArticle() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <main className="mx-auto max-w-3xl">
        <Button asChild variant="ghost">
          <Link to="/">
            <ArrowLeft />
            Início
          </Link>
        </Button>
        <article className="mt-5">
          <GlassPanel>
            <header className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Privacidade e LGPD</p>
                <h1 className="font-display text-3xl font-bold leading-tight">{title}</h1>
                <p className="mt-2 text-xs text-muted-foreground">
                  Por CartoQuali · publicado em{" "}
                  <time dateTime={published}>4 de novembro de 2026</time> · leitura de 5 minutos
                </p>
              </div>
            </header>

            <div className="mt-7 space-y-8 text-sm leading-7 text-muted-foreground">
              <p className="text-base leading-8 text-foreground">
                Antes de colocar um QR Code no guichê, o titular do cartório precisa responder a uma
                pergunta: o que acontece com os dados de quem avalia o atendimento? Este guia mostra
                os cinco cuidados que uma pesquisa de satisfação deve ter para respeitar a Lei Geral
                de Proteção de Dados (Lei nº 13.709/2018).
              </p>

              <section>
                <h2 className="font-display text-xl font-bold text-foreground">
                  A LGPD vale para a pesquisa de satisfação do cartório?
                </h2>
                <p className="mt-2">
                  A LGPD se aplica a qualquer tratamento de dados pessoais. Para os cartórios, a lei
                  traz uma regra própria: os serviços notariais e de registro recebem o mesmo
                  tratamento dado às pessoas jurídicas de direito público (art. 23, § 4º).
                </p>
                <p className="mt-2">
                  Uma pesquisa de satisfação pode envolver dados pessoais: um nome, um telefone ou
                  até um comentário em que a pessoa se identifica. Por isso, ela precisa seguir os
                  princípios do art. 6º da lei desde o desenho do formulário.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Os 5 cuidados com os dados de quem avalia
                </h2>
                <ol className="mt-4 space-y-5">
                  {cares.map((care, index) => (
                    <li key={care.title} className="rounded-lg border border-border p-5">
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {index + 1}. {care.title}
                      </h3>
                      <p className="text-xs font-semibold text-primary">{care.principle}</p>
                      <p className="mt-2">
                        <strong className="text-foreground">Na prática:</strong> {care.practice}
                      </p>
                      <p className="mt-2 flex gap-2">
                        <X className="mt-1 size-4 shrink-0 text-destructive" aria-hidden="true" />
                        <span>
                          <strong className="text-foreground">Erro comum:</strong> {care.mistake}
                        </span>
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Papel, planilha ou sistema: o que muda
                </h2>
                <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <caption className="sr-only">
                      Comparação entre formulário de papel, planilha compartilhada e sistema de
                      avaliação nos cuidados com os dados
                    </caption>
                    <thead className="bg-muted text-xs uppercase text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2">
                          Cuidado
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Papel
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Planilha
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Sistema de avaliação
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((row) => (
                        <tr key={row.topic} className="border-t border-border">
                          <th scope="row" className="px-3 py-2 font-semibold text-foreground">
                            {row.topic}
                          </th>
                          <td className="px-3 py-2">{row.paper}</td>
                          <td className="px-3 py-2">{row.sheet}</td>
                          <td className="px-3 py-2 text-foreground">{row.system}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Checklist para escolher uma ferramenta
                </h2>
                <p className="mt-2">
                  Antes de contratar um sistema de pesquisa de satisfação, faça estas perguntas ao
                  fornecedor:
                </p>
                <ul className="mt-3 space-y-2">
                  {checklist.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Como o CartoQuali aplica esses cuidados
                </h2>
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  <li>O cidadão avalia pelo celular, sem conta e sem informar documento.</li>
                  <li>
                    O contato para retorno é opcional, depende de autorização específica, fica
                    separado das respostas e não entra em indicadores nem em relatórios gerais.
                  </li>
                  <li>As avaliações ficam isoladas por cartório no banco de dados.</li>
                  <li>
                    A equipe acessa por perfil, e só os perfis autorizados veem o contato do
                    cidadão.
                  </li>
                  <li>As ações administrativas ficam registradas na trilha de auditoria.</li>
                  <li>
                    A proteção contra envios repetidos usa um identificador temporário da aba do
                    navegador, e não o endereço de rede de quem avalia.
                  </li>
                  <li>
                    A pedido, o cartório remove o contato e apaga textos livres, mantendo as notas e
                    os indicadores.
                  </li>
                </ul>
                <p className="mt-3">
                  O cartório é o controlador dos dados e o CartoQuali atua como operador. A
                  ferramenta dá o suporte técnico; a adequação da serventia à LGPD, como a indicação
                  do encarregado e os prazos de guarda, continua sendo definida pelo cartório, com
                  orientação jurídica. Veja o{" "}
                  <Link to="/privacidade" className="font-semibold text-primary underline">
                    aviso de privacidade
                  </Link>
                  .
                </p>
              </section>

              <section className="rounded-lg bg-primary/5 p-5">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Ouvir o cidadão sem expor o cidadão
                </h2>
                <p className="mt-2">
                  Veja na prática como o CartoQuali transforma a avaliação do atendimento em
                  indicadores e ações de melhoria, com teste grátis de 7 dias.
                </p>
                <Button asChild className="mt-4">
                  <a href="/?origem=artigo-lgpd#teste-gratis">
                    Solicitar demonstração
                    <ArrowRight aria-hidden="true" />
                  </a>
                </Button>
              </section>

              <p className="border-t border-border pt-4 text-xs">
                Conteúdo informativo, não constitui parecer jurídico. Para decisões sobre a
                adequação do seu cartório à LGPD, consulte o encarregado de dados ou um advogado.
              </p>
            </div>
          </GlassPanel>
        </article>
      </main>
    </div>
  );
}
