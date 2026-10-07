import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/cartoquali/landing-page";
import { getPublicAppBaseUrl } from "@/lib/public-url";

export const Route = createFileRoute("/")({
  head: () => {
    const homeUrl = `${getPublicAppBaseUrl()}/`;
    return {
      meta: [
        { title: "CartoQuali | Plataforma de Qualidade para Cartórios" },
        { name: "description", content: "Acompanhe a satisfação dos usuários, indicadores de qualidade e oportunidades de melhoria do seu cartório com o CartoQuali." },
        { property: "og:title", content: "CartoQuali | Plataforma de Qualidade para Cartórios" },
        { property: "og:description", content: "Transforme avaliações dos usuários em indicadores e ações de melhoria contínua para o seu cartório." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: homeUrl },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: homeUrl }],
    };
  },
  component: LandingPage,
});
