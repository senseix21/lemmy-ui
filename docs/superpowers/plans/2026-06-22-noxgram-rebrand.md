# noxgram Rebrand — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand lemmy-ui chrome from "Lemmy" to **noxgram** (name + cyan Ø logo) so it reads as noxgram against any backend, English only, no backend/feature/theme changes.

**Architecture:** A single `src/shared/brand.ts` holds the brand constants and an `applyBrand(siteRes)` helper that overwrites `site_view.site.name` at the two points the `GetSiteResponse` enters the app (server `catch-all-handler`, client `index`), so all 20 title getters + navbar + sidebar read "noxgram" with no per-file churn. The logo is a new square `favicon.svg` (cyan `#66FFFF` rounded square + white Ø) rasterized to the PWA PNGs; the icon is forced directly at each surface (navbar/favicon/manifest) rather than via `site.icon` to avoid pict-rs proxying.

**Tech Stack:** Inferno + TypeScript, Express SSR, `lemmy-js-client`, `sharp` (SVG→PNG), pnpm 10.9 / Node 22. Branch `noxgram-rebrand` off `main`.

## Global Constraints

- Brand name (verbatim, lowercase): `noxgram`.
- Brand accent (verbatim): `#66FFFF`.
- Brand URL placeholder (verbatim): `https://noxgram.app`.
- English only — edit `lemmy-translations/translations/en.json` (the source; the `.ts` files are generated and untracked). Other locales out of scope.
- No backend/API/theme/feature changes.
- Package manager: **pnpm**. Bootstrap 5.3.3 untouched.
- Husky lint-staged runs `prettier --write` + `eslint --fix` on staged ts/tsx; format SCSS/TS before commit.

## Verification model

This repo has **no component test runner** and `tsc` has a **pre-existing baseline** of type errors from `lemmy-js-client` version drift (measure it in Task 1). Per-task gates:
1. `pnpm exec tsc --noEmit` error count **does not exceed the baseline** measured in Task 1.
2. `pnpm build:dev` succeeds (babel strips types; build is green despite baseline errors).
3. Visual confirmation in Task 7 (boot server vs lemmy.world → screenshot/markup checks).

## File Structure

**New**
- `src/shared/brand.ts` — brand constants + `applyBrand()`.

**Replaced asset**
- `src/assets/icons/favicon.svg` — noxgram square icon.
- `src/assets/icons/apple-touch-icon.png` + `icon-{72,96,128,144,152,192,384,512}.png` — regenerated.

**Modified**
- `src/server/handlers/catch-all-handler.tsx` — `applyBrand(site)` after `getSite()`.
- `src/client/index.tsx` — `applyBrand(window.isoData.site_res)` before `initializeSite`.
- `src/shared/components/app/navbar.tsx` — brand icon + name.
- `src/server/utils/create-ssr-html.tsx` — favicon + meta description.
- `src/server/utils/generate-manifest-json.ts` — name + icons.
- `src/shared/config.ts` — `repoUrl` → `BRAND_URL`.
- `src/shared/components/app/footer.tsx` — brand link.
- `lemmy-translations/translations/en.json` — 10 brand strings.

---

## Task 1: Brand source-of-truth + logo assets

**Files:**
- Create: `src/shared/brand.ts`
- Replace: `src/assets/icons/favicon.svg`
- Regenerate: `src/assets/icons/apple-touch-icon.png`, `icon-{72,96,128,144,152,192,384,512}.png`

**Interfaces:**
- Produces: `BRAND_NAME: string`, `BRAND_ACCENT: string`, `BRAND_URL: string`, `brandFaviconUrl: string`, `brandIconPngUrl: string`, `applyBrand(siteRes?: GetSiteResponse): GetSiteResponse | undefined`.

- [ ] **Step 1: Measure tsc baseline**

Run: `pnpm translations:generate >/dev/null 2>&1; pnpm exec tsc --noEmit 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | grep -cE "error TS"`
Record the number as BASELINE (expected ~111). All later tasks must keep the count ≤ BASELINE.

- [ ] **Step 2: Write `src/shared/brand.ts`**

```ts
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
```

- [ ] **Step 3: Replace `src/assets/icons/favicon.svg`**

Write exactly:
```svg
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="120" ry="120" fill="#66FFFF"/>
  <g fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round">
    <ellipse cx="256" cy="256" rx="96" ry="132"/>
    <line x1="176" y1="356" x2="336" y2="156"/>
  </g>
</svg>
```

- [ ] **Step 4: Regenerate PNG icons from the SVG**

Run:
```bash
node -e '
const sharp=require("sharp");
const sizes=[72,96,128,144,152,192,384,512];
const svg="src/assets/icons/favicon.svg";
(async()=>{
  for(const s of sizes){
    await sharp(svg,{density:384}).resize(s,s).png().toFile(`src/assets/icons/icon-${s}x${s}.png`);
  }
  await sharp(svg,{density:384}).resize(180,180).png().toFile("src/assets/icons/apple-touch-icon.png");
  console.log("icons regenerated");
})();
'
```
Expected: prints "icons regenerated".

- [ ] **Step 5: Verify icons are non-empty PNGs**

Run: `for f in apple-touch-icon icon-512x512 icon-72x72; do node -e "const s=require('sharp'); s('src/assets/icons/$f.png').metadata().then(m=>console.log('$f',m.width+'x'+m.height,m.format))"; done`
Expected: each prints correct dimensions and `png`.

- [ ] **Step 6: Typecheck gate**

Run: `pnpm exec tsc --noEmit 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | grep -cE "error TS"`
Expected: ≤ BASELINE (brand.ts adds no new errors; if it does, fix the `applyBrand` types).

- [ ] **Step 7: Commit**

```bash
pnpm exec prettier --write src/shared/brand.ts >/dev/null 2>&1
git add src/shared/brand.ts src/assets/icons/favicon.svg src/assets/icons/apple-touch-icon.png src/assets/icons/icon-*.png
git commit -m "feat(brand): add noxgram brand module and logo assets"
```

---

## Task 2: Data-layer name override

**Files:**
- Modify: `src/server/handlers/catch-all-handler.tsx` (after `site = try_site.data;`, ~line 83)
- Modify: `src/client/index.tsx` (before `initializeSite(...)`, ~line 22)

**Interfaces:**
- Consumes: `applyBrand` from `src/shared/brand.ts`.
- Produces: every `site_view.site.name` read in the app returns "noxgram".

- [ ] **Step 1: Server — import and apply**

In `src/server/handlers/catch-all-handler.tsx`, add import near the other `@utils`/shared imports:
```ts
import { applyBrand } from "@utils/../brand";
```
NOTE: confirm the correct import path for this file. `brand.ts` is at `src/shared/brand.ts`; from `src/server/handlers/` use a relative import:
```ts
import { applyBrand } from "../../shared/brand";
```
Then change:
```ts
      site = try_site.data;
      initializeSite(site);
```
to:
```ts
      site = try_site.data;
      applyBrand(site);
      initializeSite(site);
```

- [ ] **Step 2: Client — import and apply**

In `src/client/index.tsx`, add:
```ts
import { applyBrand } from "../shared/brand";
```
Then change:
```ts
  initializeSite(window.isoData.site_res);
```
to:
```ts
  applyBrand(window.isoData.site_res);
  initializeSite(window.isoData.site_res);
```

- [ ] **Step 3: Typecheck gate**

Run: `pnpm exec tsc --noEmit 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | grep -cE "error TS"`
Expected: ≤ BASELINE.

- [ ] **Step 4: Commit**

```bash
pnpm exec prettier --write src/server/handlers/catch-all-handler.tsx src/client/index.tsx >/dev/null 2>&1
git add src/server/handlers/catch-all-handler.tsx src/client/index.tsx
git commit -m "feat(brand): force noxgram site name at data layer"
```

---

## Task 3: Navbar brand (icon + name)

**Files:**
- Modify: `src/shared/components/app/navbar.tsx` (brand `NavLink`, ~lines 105-116)

**Interfaces:**
- Consumes: `brandFaviconUrl`, `BRAND_NAME` from `src/shared/brand.ts`.

- [ ] **Step 1: Add import**

In `src/shared/components/app/navbar.tsx`, add with the other relative imports:
```ts
import { brandFaviconUrl, BRAND_NAME } from "../../brand";
```

- [ ] **Step 2: Replace the brand contents**

Change:
```tsx
            {siteView?.site.icon && showAvatars() && (
              <PictrsImage src={siteView.site.icon} icon />
            )}
            {siteView?.site.name}
```
to:
```tsx
            <img
              src={brandFaviconUrl}
              alt={BRAND_NAME}
              height="32"
              width="32"
              className="me-2 rounded"
            />
            {BRAND_NAME}
```
(Leaves the surrounding `NavLink` untouched. `showAvatars`/`PictrsImage` remain imported for other uses; if eslint flags `showAvatars` as unused, remove only that import.)

- [ ] **Step 3: Typecheck gate**

Run: `pnpm exec tsc --noEmit 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | grep -cE "error TS"`
Expected: ≤ BASELINE.

- [ ] **Step 4: Commit**

```bash
pnpm exec prettier --write src/shared/components/app/navbar.tsx >/dev/null 2>&1
git add src/shared/components/app/navbar.tsx
git commit -m "feat(brand): noxgram logo and name in navbar"
```

---

## Task 4: Favicon, meta description, PWA manifest

**Files:**
- Modify: `src/server/utils/create-ssr-html.tsx` (~lines 120, 127)
- Modify: `src/server/utils/generate-manifest-json.ts`

**Interfaces:**
- Consumes: `BRAND_NAME`, `brandFaviconUrl` from `src/shared/brand.ts`.

- [ ] **Step 1: create-ssr-html imports**

In `src/server/utils/create-ssr-html.tsx`, add:
```ts
import { BRAND_NAME, brandFaviconUrl } from "../../shared/brand";
```

- [ ] **Step 2: Force meta description + favicon**

Change:
```html
    <meta name="Description" content="Lemmy">
```
to:
```html
    <meta name="Description" content="${BRAND_NAME}">
```
And change:
```tsx
       href=${site?.site_view.site.icon ?? favIconUrl}
```
to:
```tsx
       href=${brandFaviconUrl}
```

- [ ] **Step 3: Manifest name + icons**

In `src/server/utils/generate-manifest-json.ts`, add import:
```ts
import { BRAND_NAME } from "../../shared/brand";
```
Replace the entire `if (!icons) { ... }` block (lines 25-51) with:
```ts
  if (!icons) {
    icons = generateDefaultIcons();
  }
```
Change `name: site.name,` to:
```ts
    name: BRAND_NAME,
    short_name: BRAND_NAME,
```
(The `fetchIconPng` import becomes unused — remove the `import { fetchIconPng } from "./fetch-icon-png";` line to satisfy eslint.)

- [ ] **Step 4: Typecheck gate**

Run: `pnpm exec tsc --noEmit 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | grep -cE "error TS"`
Expected: ≤ BASELINE.

- [ ] **Step 5: Commit**

```bash
pnpm exec prettier --write src/server/utils/create-ssr-html.tsx src/server/utils/generate-manifest-json.ts >/dev/null 2>&1
git add src/server/utils/create-ssr-html.tsx src/server/utils/generate-manifest-json.ts
git commit -m "feat(brand): noxgram favicon, meta, and PWA manifest"
```

---

## Task 5: Footer + external URLs

**Files:**
- Modify: `src/shared/config.ts` (`repoUrl`)
- Modify: `src/shared/components/app/footer.tsx` (join link, ~lines 59-63)

**Interfaces:**
- Consumes: `BRAND_NAME`, `BRAND_URL`.

- [ ] **Step 1: config.ts — repoUrl → BRAND_URL**

In `src/shared/config.ts`, add at top (after the existing import):
```ts
import { BRAND_URL } from "./brand";
```
Change:
```ts
export const repoUrl = "https://github.com/LemmyNet";
```
to:
```ts
export const repoUrl = BRAND_URL;
```
(Leave `joinLemmyUrl` and the derived `docsUrl`/help URLs as-is so docs/help links keep resolving.)

- [ ] **Step 2: footer.tsx — brand link**

In `src/shared/components/app/footer.tsx`, add import:
```ts
import { BRAND_NAME, BRAND_URL } from "../../brand";
```
Change:
```tsx
            <li className="nav-item">
              <a className="nav-link" href={joinLemmyUrl}>
                {new URL(joinLemmyUrl).hostname}
              </a>
            </li>
```
to:
```tsx
            <li className="nav-item">
              <a className="nav-link" href={BRAND_URL}>
                {BRAND_NAME}
              </a>
            </li>
```
Then remove `joinLemmyUrl` from the `import { docsUrl, joinLemmyUrl, repoUrl } from "../../config";` line (now unused) → `import { docsUrl, repoUrl } from "../../config";`.

- [ ] **Step 3: Typecheck gate**

Run: `pnpm exec tsc --noEmit 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | grep -cE "error TS"`
Expected: ≤ BASELINE.

- [ ] **Step 4: Commit**

```bash
pnpm exec prettier --write src/shared/config.ts src/shared/components/app/footer.tsx >/dev/null 2>&1
git add src/shared/config.ts src/shared/components/app/footer.tsx
git commit -m "feat(brand): noxgram footer link and repo url"
```

---

## Task 6: English brand strings

**Files:**
- Modify: `lemmy-translations/translations/en.json` (submodule; regenerated into `src/shared/translations/en.ts`)

**Interfaces:** none (data only).

NOTE: `en.json` lives in the `lemmy-translations` git submodule. Editing it leaves the submodule with a dirty working tree (the change is not captured by a main-repo commit). This is expected and acceptable for this local rebrand; the build regenerates `en.ts` from it.

- [ ] **Step 1: Replace the 10 brand strings**

In `lemmy-translations/translations/en.json`, replace the value text "Lemmy" → "noxgram" in these keys (replace only the product-name occurrences, keep surrounding markup/tokens like `<1>...</1>`):
- `private_message_disclaimer`: `"Warning: Private messages in noxgram are not secure. Please create an account on <1>Matrix</1> for secure messaging."`
- `lemmy_instance_setup`: `"noxgram Instance Setup"`
- `join_lemmy`: `"Join noxgram"`
- `support_lemmy`: `"Support noxgram"`
- `donation_dialog_title`: `"Support noxgram development"`
- `community_not_logged_in_alert`: replace "Lemmy" → "noxgram".
- `error_page_paragraph`: replace both "Lemmy" → "noxgram".
- `rate_limit_info`: replace "Lemmy" → "noxgram".
- `torrent_help`: replace "Lemmy" → "noxgram".
- `donation_dialog_message`: replace every "Lemmy" → "noxgram".

- [ ] **Step 2: Regenerate and typecheck**

Run: `pnpm translations:generate && pnpm exec tsc --noEmit 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | grep -cE "error TS"`
Expected: regeneration succeeds; count ≤ BASELINE.

- [ ] **Step 3: Verify the regenerated strings**

Run: `grep -E '"(support_lemmy|join_lemmy|lemmy_instance_setup)"' src/shared/translations/en.ts`
Expected: shows the noxgram values.

- [ ] **Step 4: Commit (main-repo pointer; submodule stays dirty)**

```bash
git add -A
git commit -m "feat(brand): rebrand English UI strings to noxgram" || echo "nothing tracked to commit (submodule change is in lemmy-translations working tree)"
```

---

## Task 7: Full verification

**Files:** none (verify + final report)

- [ ] **Step 1: Build**

Run: `pnpm themes:build && pnpm build:dev`
Expected: both succeed; `dist/` produced.

- [ ] **Step 2: Boot server vs lemmy.world**

Run (background): `LEMMY_UI_HOST=127.0.0.1:1234 LEMMY_UI_LEMMY_INTERNAL_HOST=lemmy.world LEMMY_UI_LEMMY_EXTERNAL_HOST=lemmy.world LEMMY_UI_HTTPS=true node dist/js/server.js`
Wait for "started listening".

- [ ] **Step 3: Markup checks**

Run:
```bash
curl -s http://127.0.0.1:1234/ -o /tmp/nox.html
echo "title:"; grep -oE '<title>[^<]*</title>' /tmp/nox.html
echo "desc:"; grep -oE 'name="Description" content="[^"]*"' /tmp/nox.html
echo "favicon:"; grep -oE 'id="favicon"[^>]*' /tmp/nox.html
echo "manifest name:"; curl -s http://127.0.0.1:1234/manifest.webmanifest | grep -oE '"name":"[^"]*"'
echo "deep page title:"; curl -s http://127.0.0.1:1234/communities | grep -oE '<title>[^<]*</title>'
```
Expected: title + deep page title contain "noxgram"; description is "noxgram"; favicon href is the noxgram favicon.svg; manifest name is "noxgram".

- [ ] **Step 4: Visual screenshot**

With Playwright: navigate to `http://127.0.0.1:1234/`, clear timers (`const m=setTimeout(()=>{},0);for(let i=0;i<=m;i++){clearTimeout(i);clearInterval(i);}`), screenshot.
Expected: navbar shows the cyan Ø icon + "noxgram"; tab favicon is the cyan Ø.

- [ ] **Step 5: Regression**

Confirm the home feed still renders posts (content from lemmy.world loads), and the about-sidebar now reads "noxgram".

- [ ] **Step 6: Stop server + final report**

Run: `pkill -f "dist/js/server.js"`
Report the brand surfaces verified and the submodule caveat.

---

## Self-Review (completed by author)

**Spec coverage:** brand.ts + applyBrand (T1/T2), logo assets (T1), navbar (T3), favicon/meta/manifest (T4), footer/config URLs (T5), EN strings (T6), verification incl. deep-page title + regression (T7). All spec §1–§5 mapped.

**Placeholder scan:** No TBD/TODO. Import paths for `brand.ts` are given as concrete relative paths per file (`../../shared/brand` from server/utils & server/handlers, `../shared/brand` from client, `../../brand` from shared/components/app, `./brand` from shared/config); each task states its own path.

**Type consistency:** `applyBrand(siteRes?: GetSiteResponse): GetSiteResponse | undefined`, `BRAND_NAME`/`BRAND_ACCENT`/`BRAND_URL`/`brandFaviconUrl`/`brandIconPngUrl` used consistently across T1–T5.

**Known caveats flagged in-task:** submodule dirtiness for en.json (T6); per-task `tsc ≤ BASELINE` instead of "clean" due to pre-existing version-drift errors.
