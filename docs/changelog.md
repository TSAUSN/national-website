# Changelog

Status: **Approved** — signed off by the user 2026-09-26
Maintained by: Documentation Maker (dot)

This file tracks what was built/changed in this repo, by whom (which
agent) and when, per this project's documentation conventions. It is
organized by promotion stage reached — **dev rollup** (merged to
`development`), **stage**, **production** — since a human creates and
merges every PR in this workflow, and a stage is only logged here once
that merge has been explicitly confirmed (never inferred from a branch
existing or CI having run). Each entry cross-references the `/docs` files
it touches so this stays useful as a "what changed and where is it
documented" index, not just a duplicate of git log.

---

## 2026-09-25

### Dev rollup (merged to `development`)

Three fixes built by **web-developer**, verified by **qa-tester (quinn)**
and **karen** (both passed all three, verified against `development`'s
live preview and the source diffs), merged to `development` by a human
via PR. A PR from `development` → `stage` is being prepared as of this
writing — **not yet merged**, so these are logged as dev-rollup only;
this entry will be updated (not duplicated) once the user confirms the
stage merge.

#### coda-2434 — Fix territory context for state and city pages

- **File:** `webengine/views/modules/client-global-navigation` (large
  rewrite: 327 insertions / 123 deletions; merge commit `5bafc6c` on
  `development`).
- **What changed:** added `case models.states:` and `case models.cities:`
  branches to the `initCookies()` org-context switch (previously absent,
  so state/city pages fell through to a stale/wrong or national default
  instead of resolving their own territory). States reads its own
  `territory` field; Cities derives territory one hop further out via
  `state.territory` (Cities has no `territory` field of its own). Both
  branches set `locationZUID`, `locationHomeURL`, `organizationTerritory`,
  and donation/contact-us cookies from the resolved territory, reusing
  the existing `setLocationCookiesByTerritory()` /
  `setContactUsCookiesWithNationalFallback()` helpers. The cities branch
  adds a new `hasValidZUIDShape()` guard that falls back to
  `setNationalLocationCookies()` if a city's state has no territory
  relation.
- **Verified live (qa-tester/karen):** NY state/city pages now correctly
  show USA Eastern Territory (nav, footer, donate links); CA state/city
  pages show USA Western Territory.
- **Docs updated:** `docs/content-models.md` (States gains a documented
  `territory` field; Cities section clarifies it has none of its own),
  `docs/custom-patterns.md` §2 (documents the two new switch branches and
  the reusable `hasValidZUIDShape()` guard), `docs/templates.md`
  (Navigation/infra entry for `client-global-navigation`).

#### coda-2480 — Remove service area model on the location finder logic

- **Files:** `webengine/views/modules/location-finder` (3 lines changed),
  `webengine/views/modules/location-finder-script` (258 lines removed;
  merge commit `ce38710` on `development`).
- **What changed:** deleted the entire "service-area-model" matching code
  path from `location-finder-script`. Location finder search/filter now
  relies only on the `services.json`/`service-types.json` endpoints, not
  a separate service-area lookup.
- **Verified live (qa-tester/karen):** location finder search/filter
  still works correctly; no leftover `service_area`/`serviceArea`
  references anywhere in the script (confirmed independently by
  Documentation Maker via a repo-wide grep on the current `development`
  state before writing this entry).
- **Docs updated:** `docs/templates.md` (Navigation/infra entry for
  `location-finder`/`location-finder-script`). Note: this is unrelated to
  the separate "Service Area" **content model** documented in
  `docs/content-models.md` §3 (`service_area` page type / `modules/service-area-*`)
  — that model and its templates are untouched by this fix; don't
  conflate the two "service area" names.

#### coda-2481 — Cities Page Location Site Title Reverts to Incorrect Corps Name

- **File:** `webengine/views/modules/zip-search`, line 49 (1-line fix;
  merge commit `82e1426` on `development`).
- **What changed:** the corps-card link text on a city page's location
  listing now does
  `{{if {location.site_name} !== null && {location.site_name} !== ""}}{{ location.site_name }}{{else}}{{ location.name }}{{/if}}`
  — preferring `site_name` with a fallback to `name` — instead of
  reverting to the wrong/generic name.
- **Verified live (qa-tester/karen):** corps cards on city pages show the
  correct site name.
- **Docs updated:** `docs/templates.md` (Navigation/infra entry for
  `zip-search`).

### Stage

Not yet reached. A PR from `development` → `stage` is being prepared; per
this project's PR-ownership convention, this section will only be filled
in once the user explicitly confirms that merge happened.

### Production

Not yet reached.

---

## Review status

This document was **Approved** by the user on 2026-09-26 (previously Draft — pending review). Per this project's standing
documentation review convention, each future entry is marked "Draft —
pending review" until the user confirms it.
