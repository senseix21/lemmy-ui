import { getStaticDir } from "@utils/env";
import { GetSiteResponse } from "lemmy-js-client";

export const BRAND_NAME = "noxgram";
export const BRAND_ACCENT = "#66FFFF";
export const BRAND_URL = "https://noxgram.app";

export const brandFaviconUrl = `${getStaticDir()}/assets/icons/favicon.svg`;
export const brandIconPngUrl = `${getStaticDir()}/assets/icons/apple-touch-icon.png`;

// Force the product brand name onto the site response, regardless of backend.
export function applyBrand(
  siteRes?: GetSiteResponse,
): GetSiteResponse | undefined {
  if (siteRes?.site_view?.site) {
    siteRes.site_view.site.name = BRAND_NAME;
  }
  return siteRes;
}
