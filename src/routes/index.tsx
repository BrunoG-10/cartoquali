import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/cartoquali/landing-page";
import { indexableMeta, publicPageUrl } from "@/lib/seo";

const description =
  "Acompanhe a satisfação dos usuários, indicadores de qualidade e oportunidades de melhoria do seu cartório com o CartoQuali.";

// Tells search engines what the product is and who offers it (schema.org, read as JSON-LD).
function structuredData(homeUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${homeUrl}#organizacao`,
        name: "CartoQuali",
        url: homeUrl,
        logo: publicPageUrl("/icon-512.png"),
        email: "cartoquali@gmail.com",
      },
      {
        "@type": "SoftwareApplication",
        name: "CartoQuali",
        url: homeUrl,
        description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "pt-BR",
        offers: {
          "@type": "Offer",
          name: "Preço de lançamento",
          price: "79.90",
          priceCurrency: "BRL",
          url: `${homeUrl}#preco`,
        },
        publisher: { "@id": `${homeUrl}#organizacao` },
      },
    ],
  };
}

export const Route = createFileRoute("/")({
  head: () => {
    const homeUrl = publicPageUrl("/");
    return {
      meta: [
        { title: "CartoQuali | Plataforma de Qualidade para Cartórios" },
        { name: "description", content: description },
        indexableMeta,
        { property: "og:title", content: "CartoQuali | Plataforma de Qualidade para Cartórios" },
        {
          property: "og:description",
          content:
            "Transforme avaliações dos usuários em indicadores e ações de melhoria contínua para o seu cartório.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: homeUrl },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: homeUrl }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData(homeUrl)) }],
    };
  },
  component: LandingPage,
});
