import { getStaticDir } from "@utils/env";
import { GetSiteResponse } from "lemmy-js-client";

export const BRAND_NAME = "noxgram";
export const BRAND_ACCENT = "#66FFFF";
export const BRAND_URL = "https://noxgram.app";

export const brandFaviconUrl = `${getStaticDir()}/assets/icons/favicon.svg`;
export const brandIconPngUrl = `${getStaticDir()}/assets/icons/apple-touch-icon.png`;

// Replace every "lemmy" mention (any case) with the noxgram brand name.
function scrub(text?: string): string | undefined {
  return text?.replace(/lemmy/gi, BRAND_NAME);
}

// Force the noxgram brand onto the site response, regardless of backend:
// the site name plus every user-visible instance text field.
export function applyBrand(
  siteRes?: GetSiteResponse,
): GetSiteResponse | undefined {
  const site = siteRes?.site_view?.site;
  if (site) {
    site.name = BRAND_NAME;
    site.description = scrub(site.description);
    site.sidebar = scrub(site.sidebar);
    site.content_warning = scrub(site.content_warning);
  }
  for (const tagline of siteRes?.taglines ?? []) {
    tagline.content = scrub(tagline.content) ?? tagline.content;
  }
  return siteRes;
}
