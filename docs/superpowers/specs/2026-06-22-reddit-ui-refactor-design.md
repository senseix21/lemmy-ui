# Design Spec: Modern Reddit Refactor of lemmy-ui

**Date:** 2026-06-22
**Status:** Approved (design), pending implementation plan
**Scope:** Full Reddit clone — modern reddit.com look (light, rounded cards, left vote pill, sticky search bar, left nav rail, right community sidebar). New default SCSS theme + in-place component restructure. Bootstrap, SSR, i18n, federation preserved.

## 1. Goal

Make lemmy-ui look and feel like modern reddit.com while preserving all existing
functionality (auth, federation, inbox/reports, moderation, search, modlog) and the
existing theme-switching system. The Reddit look ships as the new **default** theme;
every existing theme remains selectable.

Non-goals: no API/backend changes, no data-model changes, no removal of Lemmy-specific
features, no port off Bootstrap, no removal of other themes.

## 2. Architectural principles

- **Isolate skin from structure.** Visual identity lives in a new compiled SCSS theme
  (`reddit`). Layout identity lives in a small, named set of new/edited Inferno
  components. The two evolve independently.
- **One new seam, not a rewrite.** Introduce a single reusable `MainLayout` (3-column
  CSS grid: left nav rail │ center feed │ right sidebar) used only by browsing pages
  (home, community, post). Full-width pages (settings, modlog, search, admin) are left
  alone. This contains the structural blast radius and keeps each unit testable.
- **CSS-first, JSX-second.** The desktop post listing already has a left vote column and
  thumbnail; the Reddit card is mostly theme CSS plus minor class hooks. JSX changes only
  where the DOM lacks a hook.
- **No data-flow changes.** All `lemmy-js-client` calls, route loaders, SSR hydration,
  and handlers are untouched. New state is UI-local only (e.g. `viewMode`).

## 3. Components and files

### New
- `src/assets/css/themes/reddit.scss` — imports variables + Bootstrap + Reddit cosmetics.
- `src/assets/css/themes/_variables.reddit.scss` — Bootstrap variable overrides.
- `src/shared/components/common/main-layout.tsx` — 3-column grid wrapper
  (props: `mainContent`, `sidebar?`, `showNavRail?`). CSS grid, collapses to single
  column on mobile; nav rail and sidebar become toggles on small screens.
- `src/shared/components/common/nav-rail.tsx` — left rail: Home / Popular / Saved +
  subscribed communities list. Reads subscriptions from existing site/user context;
  no new fetch.

### Edited
- `src/server/utils/build-themes-list.ts` — register `reddit` in the themes array.
- `src/shared/components/app/theme.tsx` — make `reddit` the built-in default fallback
  (admin site-default `local_site.default_theme` and per-user theme still take
  precedence; only the hardcoded fallback changes).
- `src/shared/components/app/navbar.tsx` — sticky top bar: brand, centered search box,
  Reddit-style pill buttons, user menu, existing badges/links preserved.
- `src/shared/components/app/app.tsx` — sticky chrome wiring as needed for the sticky
  navbar + scroll container.
- `src/shared/components/home/home.tsx` — render through `MainLayout`; keep all existing
  sort/listing/dataType controls and pagination.
- `src/shared/components/post/post-listing.tsx` — Reddit card: rounded surface, left
  vote pill, thumbnail, title/meta, action row (comments / share / save / more).
  Add card-vs-compact `viewMode` (localStorage-persisted, default card).
- `src/shared/components/post/post-listings.tsx` — card spacing/gap instead of `<hr>`
  separators; pass through `viewMode`.
- `src/shared/components/post/post.tsx` — render through `MainLayout`; keep comment form,
  sort radios, tree/flat toggle.
- `src/shared/components/comment/comment-node.tsx` and `comment-nodes.tsx` — Reddit
  thread lines (subtle, hoverable), collapse bar, compact vote row. Mostly CSS via the
  existing `--comment-*` custom properties plus small class hooks.

### Optional / stretch
- Community page (`community/community.tsx`) routed through `MainLayout` for consistency.

## 4. Theme specifics (`_variables.reddit.scss` + `reddit.scss`)

- `data-bs-theme: light`.
- Palette: `$primary` Reddit-orange `#ff4500`; upvote `#ff4500`, downvote `#7193ff`;
  app background `#dae0e6`; card surface `#ffffff`; muted text greys per Reddit.
- `$border-radius` increased for rounded cards/buttons; tighter `$font-size-base`;
  system/IBM-Plex-style sans stack.
- Card, nav-rail, sticky-bar, and comment thread-line cosmetics that are not Bootstrap
  variables live as scoped rules in `reddit.scss` (keyed off stable class hooks added in
  the components, e.g. `.post-listing-card`, `.nav-rail`, `.reddit-topbar`).

## 5. Build & verification

- **Typecheck/lint:** `pnpm lint` (tsc) passes.
- **Theme compile:** `pnpm themes:build` emits `reddit.css`.
- **Build:** `pnpm build:dev` succeeds.
- **Boot:** dev server (SSR) starts and serves `/` with no runtime errors.
- **Visual:** Playwright screenshots of feed + post page.
  - lemmy-ui requires a backend API. Resolution order: (a) use a reachable local backend
    if one exists; (b) point `LEMMY_UI_LEMMY_EXTERNAL_HOST` / internal host at a public
    read-only instance for screenshots; (c) if neither is available, fall back to an SSR
    HTML smoke check + screenshot of whatever renders. Backend availability is confirmed
    early in implementation.
- **Rollback:** all other themes and classic layout behavior remain; rollback = switch
  theme or revert the layout commits.

## 6. Sequencing

1. Theme skin (`reddit` theme + register + default fallback).
2. App shell + navbar (sticky top bar).
3. `MainLayout` + nav rail.
4. Home feed through `MainLayout`.
5. Post card (`post-listing` + `post-listings`, viewMode toggle).
6. Post page through `MainLayout`.
7. Comments restyle.
8. Verification pass (typecheck, theme build, build, boot, visual).

Each step is independently viable and leaves the app in a working state.

## 7. Risks

- **Backend for visual verification** may be unavailable locally (mitigation in §5).
- **Sticky navbar + SSR** — ensure no hydration mismatch from sticky/scroll logic; keep
  it CSS-driven where possible.
- **`MainLayout` mobile collapse** — the existing pages already have mobile sidebar
  toggles; preserve that behavior rather than regressing it.
- **Default theme switch** — must not override an admin-configured site default or a
  per-user theme; only the hardcoded fallback changes.
