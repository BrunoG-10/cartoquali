import { getPublicAppBaseUrl } from "@/lib/public-url";

/** Overrides the root's default noindex on the public commercial pages (also listed in sitemap.xml). */
export const indexableMeta = { name: "robots", content: "index, follow" };

/** Absolute URL of a public page, for canonical links and og:url. */
export function publicPageUrl(path: string) {
  return `${getPublicAppBaseUrl()}${path}`;
}

/** Share card used by WhatsApp, LinkedIn and others (static file in /public, 1200×630). */
export function shareImageMeta() {
  const image = publicPageUrl("/og-image.png");
  const alt = "CartoQuali — avaliação do atendimento e gestão da qualidade para cartórios";
  return [
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: alt },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: alt },
  ];
}
