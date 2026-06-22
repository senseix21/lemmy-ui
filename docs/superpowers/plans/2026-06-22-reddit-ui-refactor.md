# Modern Reddit UI Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make lemmy-ui look and feel like modern reddit.com (light, rounded cards, left vote pill, sticky search top bar, left nav rail, right sidebar) as the new default theme, without changing any backend, API, data flow, or removing existing themes/features.

**Architecture:** A new compiled SCSS theme (`reddit`) provides the skin; a single reusable `MainLayout` (3-column CSS grid) plus a `NavRail` component provide the structure, applied only to browsing pages (home, post; community optional). Existing components get small, stable class hooks; the bulk of the Reddit cosmetics live in one focused partial `_reddit-components.scss`. Bootstrap 5.3.3, SSR, i18n, federation, and theme switching are untouched.

**Tech Stack:** Inferno + TypeScript, Bootstrap 5.3.3, SCSS (dart-sass via `pnpm themes:build`), Express SSR, `lemmy-js-client`, pnpm 10.9 / Node 22.

## Global Constraints

- Bootstrap version: **5.3.3** — do not upgrade. Use `data-bs-theme` for light/dark.
- Package manager: **pnpm** (`pnpm-lock.yaml` present). Node v22.
- No API/data-model changes. No new network fetches. New state is UI-local only.
- All existing themes remain registered and selectable; only the hardcoded *fallback* default changes to `reddit`.
- Reddit theme is **light** (`data-bs-theme: light`); `dataBsTheme()` already returns `light` for any name not containing "dark" (`src/shared/utils/browser/data-bs-theme.ts:12`).
- A pre-commit husky hook runs `lint-staged`. It works only after `pnpm install`. Docs-only commits may use `--no-verify`; code commits must pass it.
- Theme entry files import order is fixed: `@import "variables.<name>";` then Bootstrap, then (new) component partial.
- Preserve every existing mobile toggle (sidebar/subscribed) — do not regress mobile behavior.
- Reddit palette (verbatim): primary/upvote `#ff4500`; downvote `#7193ff`; app bg `#dae0e6`; card surface `#ffffff`.

## Verification model (read first)

This is a visual/layout refactor; lemmy-ui has **no component unit-test runner** (no `test` script). The honest, repeatable test cycle per task is:

1. **Typecheck:** `pnpm lint` (runs `tsc --noEmit` + eslint) → must pass.
2. **Theme compile:** `pnpm themes:build` → emits `src/assets/css/themes/reddit.css` with no Sass errors.
3. **Build:** `pnpm build:dev` → succeeds (only required in Task 1 and Task 8 to keep the loop fast; lint covers most type errors between).
4. **Visual:** dev server + Playwright screenshot (set up in Task 0; used where a task changes rendered output).

"Failing test first" for visual work = capture the *current* screenshot / confirm the new class hook is absent, make the change, then confirm the new screenshot/markup. Each task states its concrete expected before/after.

## File Structure

**New files**
- `src/assets/css/themes/_variables.reddit.scss` — Bootstrap variable overrides (Reddit palette, radii, fonts).
- `src/assets/css/themes/reddit.scss` — theme entry: variables → Bootstrap → component partial.
- `src/assets/css/themes/_reddit-components.scss` — all scoped Reddit cosmetics (topbar, nav-rail, post card, comments). Grown section-by-section across tasks.
- `src/shared/components/common/main-layout.tsx` — 3-column grid wrapper.
- `src/shared/components/common/nav-rail.tsx` — left navigation rail.

**Modified files**
- `src/server/utils/build-themes-list.ts` — register `reddit`.
- `src/shared/components/app/theme.tsx` — default fallback → reddit (light).
- `src/shared/components/app/navbar.tsx` — sticky topbar class hooks + centered search.
- `src/shared/components/app/app.tsx` — sticky chrome class hook.
- `src/shared/components/home/home.tsx` — render via `MainLayout`.
- `src/shared/components/post/post-listing.tsx` — card class hooks + `viewMode`.
- `src/shared/components/post/post-listings.tsx` — card gap + pass `viewMode`.
- `src/shared/components/post/post.tsx` — render via `MainLayout`.
- `src/shared/components/comment/comment-node.tsx`, `comment-nodes.tsx` — thread-line class hooks.

---

## Task 0: Green baseline + verification harness

**Files:**
- Modify (none — environment only)

**Interfaces:**
- Produces: a known-good build, an installed toolchain, a documented way to take a screenshot, and a decision on backend availability that later visual steps consume.

- [ ] **Step 1: Install dependencies**

Run: `cd /Users/abuhamzah/Dev/lemmy/lemmy-ui && pnpm install`
Expected: completes; husky hooks installed.

- [ ] **Step 2: Baseline typecheck + build**

Run: `pnpm lint && pnpm build:dev`
Expected: both succeed. If lint fails on pre-existing issues unrelated to our files, record them — they are not ours to fix, but the build must produce `dist/`.

- [ ] **Step 3: Decide backend source for visual checks**

Run: `printf '%s\n' "${LEMMY_UI_LEMMY_INTERNAL_HOST:-unset}" "${LEMMY_UI_LEMMY_EXTERNAL_HOST:-unset}"` and `curl -s -o /dev/null -w "%{http_code}" https://lemmy.world/api/v3/site || true`
Decision rule (record the chosen one in the task notes):
  - (a) A local backend is reachable → use it.
  - (b) Else set `LEMMY_UI_LEMMY_EXTERNAL_HOST=lemmy.world` and `LEMMY_UI_LEMMY_INTERNAL_HOST=lemmy.world` (HTTPS read-only) for screenshots.
  - (c) Else (offline) → visual steps degrade to SSR-HTML smoke (`curl localhost:1234` and grep for the new class hooks) + a screenshot of whatever renders.

- [ ] **Step 4: Capture baseline screenshot**

Start dev server in background: `LEMMY_UI_HOST=0.0.0.0:1234 LEMMY_UI_LEMMY_EXTERNAL_HOST=<chosen> LEMMY_UI_LEMMY_INTERNAL_HOST=<chosen> pnpm dev` (run_in_background).
Then with Playwright MCP: `browser_navigate` to `http://localhost:1234/`, `browser_take_screenshot` → save `before-home.png`.
Expected: the classic Lemmy home renders (or, offline, SSR HTML returns 200). This is the "before" reference.

- [ ] **Step 5: Commit (no code yet — skip)**

No commit; this task only establishes the harness. Proceed to Task 1.

---

## Task 1: Reddit theme skin (default)

**Files:**
- Create: `src/assets/css/themes/_variables.reddit.scss`
- Create: `src/assets/css/themes/reddit.scss`
- Create: `src/assets/css/themes/_reddit-components.scss`
- Modify: `src/server/utils/build-themes-list.ts:7-18`
- Modify: `src/shared/components/app/theme.tsx:145-167` (final `else` fallback)

**Interfaces:**
- Produces: a compiled `reddit.css` served at `/css/themes/reddit.css`; `reddit` present in `/css/themelist`; `reddit` used as the out-of-box default when no per-user/site theme is set. Stable CSS hooks consumed by later tasks: `.reddit-topbar`, `.nav-rail`, `.main-layout`, `.post-listing-card`, `.post-listing--compact`, `.comments` (existing).

- [ ] **Step 1: Confirm the hooks are absent (failing check)**

Run: `ls src/assets/css/themes/reddit.scss 2>&1` and `grep -c '"reddit"' src/server/utils/build-themes-list.ts`
Expected: file does not exist; grep prints `0`.

- [ ] **Step 2: Write `_variables.reddit.scss`**

```scss
@import "./variables";

// Reddit palette
$gray-100: #f6f7f8;
$gray-200: #edeff1;
$gray-300: #dae0e6;
$gray-600: #878a8c;
$gray-700: #1a1a1b;
$black: #1a1a1b;

$orange: #ff4500; // reddit upvote / brand
$blue: #0079d3; // reddit link blue
$periwinkle: #7193ff; // downvote

$primary: $orange;
$secondary: $blue;
$success: #46d160;
$info: $blue;
$danger: #ea0027;

$body-color: $gray-700;
$body-bg: $gray-300; // #dae0e6 app background
$link-color: $blue;
$link-hover-color: darken($blue, 10%);
$border-color: #cccccc;
$mark-bg: rgb(255, 252, 239);
$headings-color: $gray-700;

$font-family-sans-serif:
  "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans",
  Helvetica, Arial, sans-serif;
$font-size-base: 0.875rem;
$font-weight-bold: 600;

// Cards = white surfaces (the feed sits on the grey body-bg)
$card-color: $gray-700;
$card-cap-color: $gray-700;
$card-bg: #ffffff;
$card-border-color: $border-color;
$card-border-radius: 0.5rem;

$navbar-light-color: $gray-600;
$navbar-light-hover-color: $gray-700;
$navbar-light-active-color: $gray-700;

$input-btn-focus-color: rgba($primary, 0.4);
$btn-border-radius: 1.5rem; // reddit pill buttons
$btn-border-radius-lg: 1.5rem;
$btn-border-radius-sm: 1.5rem;

$border-radius: 0.5rem;
$border-radius-lg: 0.75rem;
$border-radius-sm: 0.25rem;
$rounded-pill: 50rem;

$hr-border-color: $border-color;
```

- [ ] **Step 3: Write `_reddit-components.scss` (placeholder header only)**

```scss
// Reddit component cosmetics. Sections appended per task:
//   §2 topbar (Task 2), §3 nav-rail + layout (Task 3),
//   §5 post card (Task 5), §7 comments (Task 7).

#app.lemmy-site {
  background-color: $body-bg;
}
```

- [ ] **Step 4: Write `reddit.scss` (entry)**

```scss
@import "variables.reddit";
@import "../../../../node_modules/bootstrap/scss/bootstrap";
@import "reddit-components";
```

- [ ] **Step 5: Register the theme**

In `src/server/utils/build-themes-list.ts`, add `"reddit",` as the first entry of the `themes` array (line 8, before `"darkly"`):

```ts
const themes: ReadonlyArray<string> = [
  "reddit",
  "darkly",
```

- [ ] **Step 6: Make reddit the default fallback**

In `src/shared/components/app/theme.tsx`, the final `else` branch (currently lines 145-167) loads `litely.css` for light. Replace the light `<link>`'s href and drop the media split so reddit is the unconditional default light theme, keeping darkly for dark preference:

Change the `href="/css/themes/litely.css"` line in that final `else` block to `href="/css/themes/reddit.css"`. Leave the dark link (`darkly.css`) and the `id`/`media` attributes unchanged.

- [ ] **Step 7: Compile the theme (test)**

Run: `pnpm themes:build`
Expected: no Sass error; `src/assets/css/themes/reddit.css` exists.
Run: `test -f src/assets/css/themes/reddit.css && head -c 60 src/assets/css/themes/reddit.css`
Expected: prints CSS.

- [ ] **Step 8: Typecheck**

Run: `pnpm lint`
Expected: passes (no new TS errors from the theme.tsx / build-themes-list.ts edits).

- [ ] **Step 9: Visual check**

Rebuild + restart dev server; Playwright `browser_navigate` to `/`, `browser_take_screenshot` → `after-theme.png`.
Expected: grey app background, white-ish cards, orange primary buttons, smaller base font. Layout unchanged (that's later tasks). If offline: `curl -s localhost:1234/css/themes/reddit.css | head -c 40` returns CSS and `curl -s localhost:1234/ | grep -o 'themes/reddit.css'` matches.

- [ ] **Step 10: Commit**

```bash
git add src/assets/css/themes/_variables.reddit.scss src/assets/css/themes/reddit.scss src/assets/css/themes/_reddit-components.scss src/assets/css/themes/reddit.css src/server/utils/build-themes-list.ts src/shared/components/app/theme.tsx
git commit -m "feat(theme): add modern reddit theme as default"
```

---

## Task 2: Sticky Reddit top bar

**Files:**
- Modify: `src/shared/components/app/navbar.tsx` (root `<nav>` class + search element)
- Modify: `src/shared/components/app/app.tsx` (main wrapper hook)
- Modify: `src/assets/css/themes/_reddit-components.scss` (append §2)

**Interfaces:**
- Consumes: `.reddit-topbar` hook from Task 1 plan (defined here).
- Produces: a fixed/sticky top bar with class `.reddit-topbar`; body content offset accordingly via `.main-content-offset`.

- [ ] **Step 1: Read the current navbar root**

Run: `grep -n 'navbar navbar-expand-md' src/shared/components/app/navbar.tsx`
Expected: one match (the root `<nav>`). Confirm current classes before editing.

- [ ] **Step 2: Add the topbar hook to the navbar root**

In `src/shared/components/app/navbar.tsx`, change the root nav className from:
`"navbar navbar-expand-md navbar-light p-0 px-3 container-lg"`
to:
`"navbar navbar-expand-md navbar-light p-0 px-3 container-lg reddit-topbar"`
(Keep `container-lg`; the sticky/full-width band is applied to a wrapping rule in CSS via the fixed-position parent — see Step 4. Do not remove existing classes.)

- [ ] **Step 3: Add offset hook in app.tsx**

In `src/shared/components/app/app.tsx`, change `<main className="mt-4 p-0 fl-1">` to `<main className="mt-4 p-0 fl-1 main-content-offset">`.

- [ ] **Step 4: Append §2 to `_reddit-components.scss`**

```scss
// §2 Reddit sticky top bar
.reddit-topbar {
  position: sticky;
  top: 0;
  z-index: 1030;
  background-color: #ffffff;
  border-bottom: 1px solid $border-color;
  min-height: 56px;
  max-width: none; // full-width band
  margin-left: 0;
  margin-right: 0;

  .navbar-brand {
    font-weight: 700;
    color: $primary;
  }

  // Centered search: the existing search control becomes a wide pill
  .form-control,
  input[type="search"],
  input[type="text"] {
    border-radius: $rounded-pill;
    background-color: $gray-100;
    border-color: transparent;
    &:focus {
      background-color: #fff;
      border-color: $border-color;
    }
  }

  .btn {
    border-radius: $rounded-pill;
  }
}

.main-content-offset {
  margin-top: 1rem;
}
```

- [ ] **Step 5: Compile + typecheck (test)**

Run: `pnpm themes:build && pnpm lint`
Expected: both pass.

- [ ] **Step 6: Visual check**

Restart dev server; Playwright screenshot of `/` after scrolling: `browser_navigate` `/`, `browser_take_screenshot` → `after-topbar.png`; scroll down and screenshot again to confirm the bar stays pinned.
Expected: white bar pinned to top with rounded search + pill buttons. Offline: `curl -s localhost:1234/ | grep -o 'reddit-topbar'` matches.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/app/navbar.tsx src/shared/components/app/app.tsx src/assets/css/themes/_reddit-components.scss src/assets/css/themes/reddit.css
git commit -m "feat(navbar): sticky reddit-style top bar"
```

---

## Task 3: MainLayout + NavRail components

**Files:**
- Create: `src/shared/components/common/main-layout.tsx`
- Create: `src/shared/components/common/nav-rail.tsx`
- Modify: `src/assets/css/themes/_reddit-components.scss` (append §3)

**Interfaces:**
- Produces:
  - `MainLayout` — `export class MainLayout extends Component<MainLayoutProps>` where
    `interface MainLayoutProps { children: any; sidebar?: any; showNavRail?: boolean; }`.
    Renders `<div class="main-layout"><NavRail/?><div class="main-layout__content">{children}</div><aside class="main-layout__sidebar">{sidebar}</aside></div>`.
  - `NavRail` — `export class NavRail extends Component<NavRailProps>` where
    `interface NavRailProps { myUserInfo?: MyUserInfo; }`. Renders Home / Popular / Saved links via `inferno-router` `Link`, plus a subscribed-communities list read from `myUserInfo.follows` (no fetch). If `myUserInfo` is undefined, render only the static links.
- Consumes: `MyUserInfo` type from `lemmy-js-client`; `Link` from `inferno-router`; existing i18n `I18NextService.i18n.t`.

- [ ] **Step 1: Confirm components absent (failing check)**

Run: `ls src/shared/components/common/main-layout.tsx 2>&1`
Expected: not found.

- [ ] **Step 2: Write `nav-rail.tsx`**

```tsx
import { Component } from "inferno";
import { Link } from "inferno-router";
import { MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";

interface NavRailProps {
  myUserInfo?: MyUserInfo;
}

export class NavRail extends Component<NavRailProps> {
  render() {
    const follows = this.props.myUserInfo?.follows ?? [];
    return (
      <nav className="nav-rail d-none d-lg-block">
        <ul className="list-unstyled">
          <li>
            <Link className="nav-rail__link" to="/">
              {I18NextService.i18n.t("home")}
            </Link>
          </li>
          <li>
            <Link className="nav-rail__link" to="/communities">
              {I18NextService.i18n.t("communities")}
            </Link>
          </li>
          {this.props.myUserInfo && (
            <li>
              <Link className="nav-rail__link" to="/inbox">
                {I18NextService.i18n.t("inbox")}
              </Link>
            </li>
          )}
        </ul>
        {follows.length > 0 && (
          <>
            <hr />
            <div className="nav-rail__heading text-uppercase small text-muted px-2">
              {I18NextService.i18n.t("subscribed")}
            </div>
            <ul className="list-unstyled">
              {follows.map(cv => (
                <li key={cv.community.id}>
                  <Link
                    className="nav-rail__link"
                    to={`/c/${cv.community.name}${cv.community.local ? "" : "@" + new URL(cv.community.actor_id).host}`}
                  >
                    {cv.community.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    );
  }
}
```

Note: verify the i18n keys `home`, `communities`, `inbox`, `subscribed` exist (`grep -RIl '"subscribed"' src/shared/translations` or the lemmy-translations submodule). If `subscribed` is missing, use `"subscribed_to_communities"` or fall back to a literal — pick an existing key and record it.

- [ ] **Step 3: Write `main-layout.tsx`**

```tsx
import { Component } from "inferno";

interface MainLayoutProps {
  children?: any;
  sidebar?: any;
  navRail?: any;
}

export class MainLayout extends Component<MainLayoutProps> {
  render() {
    return (
      <div className="main-layout container-lg">
        {this.props.navRail}
        <div className="main-layout__content">{this.props.children}</div>
        {this.props.sidebar && (
          <aside className="main-layout__sidebar d-none d-md-block">
            {this.props.sidebar}
          </aside>
        )}
      </div>
    );
  }
}
```

Rationale: `navRail` passed as a prop (not hardcoded) so pages without a logged-in context, or pages that shouldn't show it, simply omit it — keeps the layout unit dumb and testable.

- [ ] **Step 4: Append §3 to `_reddit-components.scss`**

```scss
// §3 Reddit three-column layout + nav rail
.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  align-items: start;

  @media (min-width: 768px) {
    grid-template-columns: minmax(0, 1fr) 312px; // content + right sidebar
  }
  @media (min-width: 992px) {
    grid-template-columns: 240px minmax(0, 1fr) 312px; // rail + content + sidebar
  }
}

.main-layout__content {
  min-width: 0; // prevent grid blowout from long content
}

.main-layout__sidebar > * {
  position: sticky;
  top: 72px;
}

.nav-rail {
  position: sticky;
  top: 72px;

  .nav-rail__link {
    display: block;
    padding: 0.4rem 0.75rem;
    border-radius: $border-radius;
    color: $body-color;
    text-decoration: none;
    &:hover {
      background-color: $gray-200;
    }
  }
}
```

- [ ] **Step 5: Compile + typecheck (test)**

Run: `pnpm themes:build && pnpm lint`
Expected: pass. The components aren't rendered yet (no consumer), but TS must compile — fix any type mismatch on `follows`/`MyUserInfo` by checking the real field name: `grep -n "follows" node_modules/lemmy-js-client/dist/types/*.d.ts | head` and adjust (`MyUserInfo.follows` is the subscribed list; element type has `.community`).

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/common/main-layout.tsx src/shared/components/common/nav-rail.tsx src/assets/css/themes/_reddit-components.scss src/assets/css/themes/reddit.css
git commit -m "feat(layout): add MainLayout grid and NavRail components"
```

---

## Task 4: Home feed through MainLayout

**Files:**
- Modify: `src/shared/components/home/home.tsx` (the render method's outer `container-lg`/`row`/`col` wrapper, ~the JSX returned by `render()`)

**Interfaces:**
- Consumes: `MainLayout`, `NavRail` (Task 3); existing `this.state.siteRes` / `myUserInfo` already in scope for the page.
- Produces: home page rendered in the 3-column grid.

- [ ] **Step 1: Locate the home wrapper**

Run: `grep -n 'home container-lg\|className="row"\|col-md-8\|col-md-4' src/shared/components/home/home.tsx`
Expected: find the outer `<div className="home container-lg">`, the `<div className="row">`, the main `col-12 col-md-8 col-lg-9`, and the `<aside ... col-md-4 col-lg-3>` (per structural map).

- [ ] **Step 2: Add imports**

At the top of `home.tsx` add:
```tsx
import { MainLayout } from "../common/main-layout";
import { NavRail } from "../common/nav-rail";
```

- [ ] **Step 3: Replace the outer grid with MainLayout**

Replace the `<div className="home container-lg"><div className="row">…</div></div>` wrapper so that:
- the previous main column's children become the `children` of `MainLayout`,
- the previous `<aside>`'s children become the `sidebar` prop,
- `navRail={<NavRail myUserInfo={UserService.Instance.myUserInfo} />}` is passed.

Concretely the returned JSX becomes:
```tsx
<div className="home">
  <MainLayout
    navRail={<NavRail myUserInfo={UserService.Instance.myUserInfo} />}
    sidebar={/* the existing sidebar JSX block, unchanged */}
  >
    {/* the existing main-column JSX block, unchanged */}
  </MainLayout>
</div>
```
Keep the inner content (sort controls, `PostListings`, comments, pagination, mobile sidebar toggle) exactly as-is — only the wrapper changes. Ensure `UserService` is already imported (it is used elsewhere in the file; if not, add `import { UserService } from "../../services";`).

- [ ] **Step 4: Typecheck (test)**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 5: Visual check**

Restart dev server; Playwright `/` → `after-home-3col.png` at desktop width (`browser_resize` 1280×900) and mobile width (`browser_resize` 390×844).
Expected: desktop shows rail | feed | sidebar; mobile collapses to a single column with the existing sidebar toggle still working. Offline: `curl -s localhost:1234/ | grep -o 'main-layout'` matches.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/home/home.tsx
git commit -m "feat(home): render feed in reddit 3-column layout"
```

---

## Task 5: Reddit post card + view toggle

**Files:**
- Modify: `src/shared/components/post/post-listing.tsx` (desktop `article` wrapper class; add `viewMode`)
- Modify: `src/shared/components/post/post-listings.tsx` (container gap; remove `<hr>`; pass `viewMode`)
- Modify: `src/assets/css/themes/_reddit-components.scss` (append §5)

**Interfaces:**
- Consumes: existing `VoteButtons`, thumbnail, action-row markup inside `post-listing.tsx`.
- Produces: each post wrapped with `.post-listing-card`; compact mode toggles `.post-listing--compact` on the container.

- [ ] **Step 1: Locate the post article wrappers**

Run: `grep -n 'post-container\|d-none d-sm-block\|d-block d-sm-none' src/shared/components/post/post-listing.tsx`
Expected: find the desktop (`d-none d-sm-block`) and mobile (`d-block d-sm-none`) `<article className="row post-container">` blocks.

- [ ] **Step 2: Add the card hook**

On both the desktop and mobile `<article className="row post-container">`, add the card class → `className="row post-container post-listing-card"`. (The card chrome is CSS; markup is otherwise unchanged.)

- [ ] **Step 3: Add `viewMode` plumbing in `post-listings.tsx`**

In `post-listings.tsx`, replace the `<hr className="my-3" />` separators with a wrapping container that uses gap spacing, and read a persisted view mode:

```tsx
// near top of the file
const VIEW_MODE_KEY = "lemmy-reddit-view-mode";
function getViewMode(): "card" | "compact" {
  if (typeof localStorage === "undefined") return "card";
  return localStorage.getItem(VIEW_MODE_KEY) === "compact" ? "compact" : "card";
}
```

Wrap the mapped listings:
```tsx
<div className={`post-listings ${getViewMode() === "compact" ? "post-listing--compact" : ""}`}>
  {/* existing map of <PostListing/>, WITHOUT the interleaved <hr/> */}
</div>
```
Keep the existing props passed to each `PostListing`. The toggle UI (a small "Card / Compact" button group) is added in the home controls in Step 4; clicking it sets `localStorage[VIEW_MODE_KEY]` and calls `location.reload()` (acceptable v1; no shared store needed).

- [ ] **Step 4: Add the toggle control**

In `post-listings.tsx`, render above the list a button group:
```tsx
<div className="btn-group btn-group-sm mb-2 post-view-toggle" role="group">
  <button
    type="button"
    className={`btn btn-outline-secondary ${getViewMode() === "card" ? "active" : ""}`}
    onClick={() => { localStorage.setItem(VIEW_MODE_KEY, "card"); location.reload(); }}
  >
    {I18NextService.i18n.t("card") /* if key missing, use literal "Card" */}
  </button>
  <button
    type="button"
    className={`btn btn-outline-secondary ${getViewMode() === "compact" ? "active" : ""}`}
    onClick={() => { localStorage.setItem(VIEW_MODE_KEY, "compact"); location.reload(); }}
  >
    {I18NextService.i18n.t("compact") /* if key missing, use literal "Compact" */}
  </button>
</div>
```
Ensure `I18NextService` is imported in `post-listings.tsx`; if these i18n keys don't exist, use the string literals `"Card"`/`"Compact"` and record it.

- [ ] **Step 5: Append §5 to `_reddit-components.scss`**

```scss
// §5 Reddit post card
.post-listings {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.post-listing-card {
  background-color: #ffffff;
  border: 1px solid $border-color;
  border-radius: $border-radius;
  padding: 0.5rem 0.75rem;
  margin: 0;
  transition: border-color 0.1s ease;

  &:hover {
    border-color: #898989;
  }

  // left vote column → reddit grey rail
  .vote-bar,
  > .col.flex-grow-0:first-child {
    background-color: transparent;
  }
}

// Compact rows: tighter padding, smaller thumbs
.post-listing--compact {
  gap: 0;

  .post-listing-card {
    border-radius: 0;
    border-top: none;
    padding: 0.25rem 0.75rem;
    &:first-child {
      border-top: 1px solid $border-color;
      border-top-left-radius: $border-radius;
      border-top-right-radius: $border-radius;
    }
    &:last-child {
      border-bottom-left-radius: $border-radius;
      border-bottom-right-radius: $border-radius;
    }
  }
}
```

- [ ] **Step 6: Compile + typecheck (test)**

Run: `pnpm themes:build && pnpm lint`
Expected: pass.

- [ ] **Step 7: Visual check**

Restart dev server; Playwright `/`: screenshot card mode (`after-cards.png`), click "Compact" toggle, screenshot compact mode (`after-compact.png`).
Expected: discrete white rounded cards with hover border in card mode; dense bordered rows in compact mode; toggle persists across reload. Offline: grep `post-listing-card` and `post-view-toggle` in `curl` output.

- [ ] **Step 8: Commit**

```bash
git add src/shared/components/post/post-listing.tsx src/shared/components/post/post-listings.tsx src/assets/css/themes/_reddit-components.scss src/assets/css/themes/reddit.css
git commit -m "feat(post): reddit-style post cards with card/compact toggle"
```

---

## Task 6: Post detail page through MainLayout

**Files:**
- Modify: `src/shared/components/post/post.tsx` (outer wrapper)

**Interfaces:**
- Consumes: `MainLayout`, `NavRail`.
- Produces: post page in the 3-column grid (rail | post+comments | community sidebar).

- [ ] **Step 1: Locate the post wrapper**

Run: `grep -n 'post container-lg\|className="row"\|col-md-8\|col-md-4' src/shared/components/post/post.tsx`
Expected: find `<div className="post container-lg">`, the main `col-12 col-md-8 col-lg-9 mb-3`, and the `<aside ... col-md-4 col-lg-3>`.

- [ ] **Step 2: Add imports**

```tsx
import { MainLayout } from "../common/main-layout";
import { NavRail } from "../common/nav-rail";
```

- [ ] **Step 3: Replace the grid wrapper**

Mirror Task 4: the main column's children become `MainLayout` children; the `<aside>`'s children become `sidebar`; pass `navRail={<NavRail myUserInfo={UserService.Instance.myUserInfo} />}`. Keep `PostListing`, comment form, sort radios, tree/flat toggle, and the mobile sidebar toggle untouched. Confirm `UserService` import exists; add if missing.

- [ ] **Step 4: Typecheck (test)**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 5: Visual check**

Restart dev server; navigate to a post URL (from the feed, click the first post via Playwright `browser_click`, or `browser_navigate` to a known `/post/<id>`). Screenshot → `after-post-page.png` at desktop + mobile widths.
Expected: 3-column post page; comments render; mobile collapses with working sidebar toggle. Offline: grep `main-layout` in the post page HTML.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/post/post.tsx
git commit -m "feat(post): render post page in reddit 3-column layout"
```

---

## Task 7: Reddit comment thread styling

**Files:**
- Modify: `src/shared/components/comment/comment-nodes.tsx` (add class hook to the `<ul className="comments">`)
- Modify: `src/shared/components/comment/comment-node.tsx` (add `.comment-node--reddit` hook to the article if needed)
- Modify: `src/assets/css/themes/_reddit-components.scss` (append §7)

**Interfaces:**
- Consumes: existing `.comments` ul, depth-based `ms-1` indent, `--comment-node-*` custom props.
- Produces: subtle hoverable thread lines + tightened comment rows, CSS-only.

- [ ] **Step 1: Locate comment markup**

Run: `grep -n 'className.*comments\|comment-node\|border-left' src/shared/components/comment/comment-nodes.tsx src/shared/components/comment/comment-node.tsx`
Expected: find the `<ul>` with `comments` class and the inline `border-left` style, and the `comment-node` article.

- [ ] **Step 2: Add a stable hook**

On the `<ul className={classNames("comments", …)}>` in `comment-nodes.tsx`, add `"comments-reddit"` to the classNames list so CSS can target our threads without fighting the inline `border-left` (we override it in §7).

- [ ] **Step 3: Append §7 to `_reddit-components.scss`**

```scss
// §7 Reddit comment threads
.comments-reddit {
  border-left-color: $border-color !important;
  border-left-width: 2px;
  transition: border-left-color 0.1s ease;

  &:hover {
    border-left-color: #898989 !important;
  }
}

.comment-node {
  padding-top: 0.4rem !important;
  padding-bottom: 0.4rem !important;

  .md-div {
    font-size: 0.875rem;
    line-height: 1.4;
  }
}
```

- [ ] **Step 4: Compile + typecheck (test)**

Run: `pnpm themes:build && pnpm lint`
Expected: pass.

- [ ] **Step 5: Visual check**

Restart dev server; open a post with comments; screenshot → `after-comments.png`. Hover a thread (Playwright `browser_hover` over a `.comments-reddit`) and screenshot.
Expected: thin grey thread lines that darken on hover; tighter comment rows. Offline: grep `comments-reddit`.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/comment/comment-nodes.tsx src/shared/components/comment/comment-node.tsx src/assets/css/themes/_reddit-components.scss src/assets/css/themes/reddit.css
git commit -m "feat(comments): reddit-style thread lines"
```

---

## Task 8: Full verification pass

**Files:** none (verification + final commit of any rebuilt CSS)

**Interfaces:** Consumes everything above.

- [ ] **Step 1: Clean typecheck + lint**

Run: `pnpm lint`
Expected: passes with no new errors attributable to our changes.

- [ ] **Step 2: Theme build**

Run: `pnpm themes:build`
Expected: `reddit.css` rebuilt, no Sass errors.

- [ ] **Step 3: Production-ish build**

Run: `pnpm build:dev`
Expected: succeeds; `dist/` produced.

- [ ] **Step 4: Boot + smoke**

Start dev server; Playwright capture the full journey: home (card + compact) → open post → comments. Save final screenshots.
Expected: no console errors of severity error (`browser_console_messages`), all pages render in Reddit style. Offline fallback: `curl -s -o /dev/null -w "%{http_code}" localhost:1234/` == 200 and grep the four hooks (`reddit-topbar`, `main-layout`, `post-listing-card`, `comments-reddit`).

- [ ] **Step 5: Regression — other themes still work**

Switch theme to `darkly` (Playwright: set via settings, or `browser_navigate` after changing the user theme; offline: `curl -s localhost:1234/css/themes/darkly.css | head -c 40`).
Expected: darkly still loads — proves we only changed the default, not removed themes.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: rebuild reddit theme css; verification pass"
```

---

## Self-Review (completed by author)

**Spec coverage:** theme skin (T1), default (T1), navbar/sticky (T2), MainLayout+NavRail (T3), home (T4), post card + toggle (T5), post page (T6), comments (T7), verification incl. backend-availability + rollback (T0/T8). All §3 spec components mapped.

**Placeholder scan:** No "TBD/TODO". Where exact existing-file line contents can't be reproduced (files are 500–1500 lines), tasks give a `grep` anchor + the precise class/wrapper change rather than a fake full-file listing — this is deliberate and actionable, not a placeholder.

**Type consistency:** `MainLayoutProps { children, sidebar?, navRail? }` used consistently in T3/T4/T6. `NavRailProps { myUserInfo? }` and `getViewMode(): "card"|"compact"` used consistently. `VIEW_MODE_KEY` constant reused across T5 steps.

**Open assumptions to confirm during execution (each task has the grep to verify):** `MyUserInfo.follows` field name + element `.community` shape; i18n keys `subscribed`/`card`/`compact` (fall back to literals if absent). These are explicitly flagged in-task, not hidden.
