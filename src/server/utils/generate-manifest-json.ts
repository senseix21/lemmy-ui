import { Site } from "lemmy-js-client";
import { getStaticDir } from "@utils/env";
import { BRAND_NAME } from "../../shared/brand";

type Icon = { sizes: string; src: string; type: string; purpose: string };
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
let icons: Icon[] | null = null;

function mapIcon(src: string, size: number): Icon {
  return {
    sizes: `${size}x${size}`,
    type: "image/png",
    src,
    purpose: "any maskable",
  };
}

function generateDefaultIcons() {
  return iconSizes.map(size =>
    mapIcon(`${getStaticDir()}/assets/icons/icon-${size}x${size}.png`, size),
  );
}

export default async function (site: Site) {
  if (!icons) {
    // Always use the noxgram default icons, regardless of backend site icon.
    icons = generateDefaultIcons();
  }

  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: site.description ?? "A link aggregator for the fediverse",
    start_url: "/",
    scope: "/",
    display: "standalone",
    id: "/",
    background_color: "#222222",
    theme_color: "#222222",
    icons,
    shortcuts: [
      {
        name: "Search",
        short_name: "Search",
        description: "Perform a search.",
        url: "/search",
      },
      {
        name: "Communities",
        url: "/communities",
        short_name: "Communities",
        description: "Browse communities",
      },
      {
        name: "Create Post",
        url: "/create_post",
        short_name: "Create Post",
        description: "Create a post.",
      },
    ],
    related_applications: [
      {
        platform: "f-droid",
        url: "https://f-droid.org/packages/com.jerboa/",
        id: "com.jerboa",
      },
    ],
  };
}
