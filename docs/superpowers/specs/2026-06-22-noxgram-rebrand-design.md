# Design Spec: Rebrand Lemmy → noxgram

**Date:** 2026-06-22
**Branch:** `noxgram-rebrand` (off `main`, the classic UI)
**Status:** Approved (design), pending implementation plan

## Goal

Rebrand the lemmy-ui product chrome from "Lemmy" to **noxgram**, including a new
logo, so the UI reads as noxgram **regardless of which backend instance it points
at** (including lemmy.world). English only for v1.

Non-goals: no backend changes, no feature changes, no theme/layout changes, no
translation of the 40+ non-English locale files, no real noxgram website/repo
(external links point at a configurable placeholder).

## Decisions (locked)

- **Brand name:** `noxgram` (lowercase).
- **Logo:** keep the supplied logo's identity — a **cyan `#66FFFF` rounded-square
  containing a white Ø** — redrawn as a clean, optimized **square app icon**
  (the "social media app icon" refactor). The "noxgram" wordmark is rendered as
  themed HTML text next to the icon (not baked into the SVG), so it adapts to
  light/dark themes.
- **Brand source:** force noxgram in the UI, overriding backend-provided name.
- **Accent color:** `#66FFFF`.

## Architecture

### 1. Single source of truth — `src/shared/brand.ts`
Exports the brand constants used everywhere:
- `BRAND_NAME = "noxgram"`
- `BRAND_ACCENT = "#66FFFF"`
- `BRAND_URL = "#"` (placeholder for footer/external links)
- `brandFaviconUrl`, `brandIconPngUrl` (asset paths, via `getStaticDir()`)
- `applyBrand(siteRes)` — overwrites `siteRes.site_view.site.name = BRAND_NAME`
  in place and returns it. Name only — **not** `site.icon` (see §3 rationale).

### 2. Data-layer name override (the "everywhere" mechanism)
20 components compose their document `<title>` from
`site_view.site.name`; the navbar text and the about-sidebar read it too. Rather
than edit 20 files, call `applyBrand()` at the two points where the
`GetSiteResponse` enters the app:
- **Server:** `src/server/handlers/catch-all-handler.tsx` — immediately after
  `client.getSite()` resolves (before `isoData` is assembled and before SSR
  render). This brands titles, navbar text, sidebar, and the SSR HTML.
- **Client:** `src/client/index.tsx` — apply to `window.isoData.site_res` before
  `initializeSite(...)`, covering any client-side site refetch/hydration.

Because the override mutates the shared site object upstream, all 20 title
getters + navbar + sidebar read "noxgram" with zero per-file churn.

### 3. Logo / icon assets
- Replace `src/assets/icons/favicon.svg` with the noxgram icon: a `512×512`
  rounded-square (`rx ≈ 120`, ~23% — app-icon rounding) filled `#66FFFF`, with a
  white Ø (vertical ellipse outline + diagonal slash, stroke white) centered.
- Regenerate the raster icons from the new SVG via `sharp`:
  `apple-touch-icon.png` (180²) and `icon-{72,96,128,144,152,192,384,512}.png`.
- **Rationale for not overriding `site.icon`:** the navbar renders `site.icon`
  through `PictrsImage`, which proxies via the backend pict-rs image service.
  Pointing that at a local asset path would break proxying. So the icon is forced
  by **direct edits** at each surface instead (navbar, favicon link, manifest).

### 4. Chrome wiring (direct edits)
- `src/shared/components/app/navbar.tsx` — brand link renders the noxgram icon
  (local `<img>`/inline SVG, `BRAND_ACCENT`) + the `site.name` text (already
  "noxgram" via the override). Replaces the conditional `PictrsImage site.icon`.
- `src/server/utils/create-ssr-html.tsx` — favicon `<link>` always uses
  `brandFaviconUrl` (ignore `site.icon`); meta description `"Lemmy"` → `BRAND_NAME`.
- `src/server/utils/generate-manifest-json.ts` — PWA `name`/`short_name` =
  `BRAND_NAME`; icons = noxgram default icons (ignore `site.icon`).
- `src/shared/config.ts` — `favIconUrl`/`favIconPngUrl` stay (now point at the
  noxgram assets, same paths); `repoUrl`/`joinLemmyUrl`/`docsUrl` → `BRAND_URL`.
- `src/shared/components/app/footer.tsx` — brand text/links read noxgram /
  `BRAND_URL`.

### 5. Brand strings (English only)
Update the ~10 EN i18n keys in `src/shared/translations/en.ts` (and the matching
`lemmy-translations/translations/en.json`) whose values name the product:
`support_lemmy`, `join_lemmy`, `lemmy_instance_setup`,
`community_not_logged_in_alert`, `error_page_paragraph`,
`private_message_disclaimer`, `rate_limit_info`, `torrent_help`,
`donation_dialog_title`, `donation_dialog_message`. Replace "Lemmy" → "noxgram"
in the user-visible text. Other locales are out of scope (documented).

## Verification

- `tsc --noEmit`: no new errors beyond the repo's pre-existing baseline.
- `pnpm themes:build` and `pnpm build:dev` succeed.
- Regenerated PNG icons exist and are non-empty.
- Boot server against lemmy.world; confirm via screenshot/markup:
  - navbar shows the cyan Ø icon + "noxgram"
  - `<title>` of the home page and a deep page (e.g. a post) read "noxgram"
  - favicon link and manifest `name` are noxgram
  - meta description is "noxgram"
- Regression: app still renders; other instances' content still loads.

## Risks

- **pict-rs proxying** if `site.icon` were overridden — avoided by forcing the
  icon at each surface directly (§3).
- **Hydration mismatch** — server brands `site_res` before serializing to
  `window.isoData`, so client receives already-branded data; the client
  `applyBrand` is idempotent (sets the same constant). No mismatch.
- **Deep-page titles** — covered by the data-layer override since they read
  `site.name`; verified explicitly.
