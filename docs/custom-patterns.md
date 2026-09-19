# Custom Patterns & Shared Conventions

Status: **Draft — pending review**
Last generated: 2026-09-19 by Documentation Maker (automated codebase scan)
Updated: 2026-09-20 by Documentation Maker — added §13 and §14 on CODA-2533 (`modules/upcoming-events` fetch-timeout fix and the `find_in_set` scan perf-risk flag it surfaced). CODA-2533 is implemented on branch `coda-2533` only — not yet QA'd, merged, or deployed; treat that content as Draft on top of this file's existing Draft status.

This file documents non-obvious, cross-cutting patterns a new contributor needs to know before touching templates or scripts in this repo. It intentionally skips anything that's standard/obvious Parsley or Bootstrap usage.

---

## 1. The `default_og_image` fallback pattern

Used in `webengine/views/custom_head` (and mirrored, with different field names, in `modules/hero`):

```
{{if {!this.og_image} }}
  <!-- use this.og_image -->
{{else}}
  <!-- fall back to globals.default_og_image -->
{{/if}}
```

`globals.*` is Zesty's built-in instance-level "Globals" content, edited once and available to every template. The same "page field, else a global default" idea reappears for hero background images in `modules/hero` (`clippings.default_images`, a random pick from a Clippings media list) and for the "How We Serve" services banner (`globals.services_all_image`). **Convention to follow:** any new template that needs an image with a sensible site-wide fallback should look for an existing `globals.*` or `clippings.*` field before adding a new one.

## 2. Org-hierarchy cookie state machine (`modules/client-global-navigation`)

This is the single most important shared script in the codebase — nearly every other module depends on cookies it sets. It:

1. Defines `cookieManager` (get/set/delete on `document.cookie`) and a `cookieKeys` dictionary (e.g. `locationZUID`, `locationModel`, `territoryZUID`, `divisionZUID`, `organizationLevel`, `analyticsCode`, `tealiumprofile`, `donateOnceURL`, `donateMonthlyURL`, `contactUsImage`, etc.) — **this is the canonical list of cookie names**; don't invent new ad-hoc cookie names elsewhere.
2. On every page load, resolves "what org level am I on" (national / territory / division / location) from the current page's `parent_zuid`/relationship fields and writes it into cookies (`setNationalLocationCookies()` and siblings, not fully shown but same pattern).
3. Every other module/component that needs "what's the user's current location/division/territory" (hero, stats, news, services, header, footer, community-leaders, indexdb, etc.) reads these cookies via `cookieManager.get(cookieKeys.X)` rather than deriving it themselves.
4. Also seeds `window.cookiesReady` (a Promise most other scripts `await` before reading cookies) via `initCookies()`.
5. Has a debug mode: `?debugDataLayer=1` in the URL enables `console.groupCollapsed` logging of the resolved cookie snapshot and data-layer values (`logCurrentDataLayerValues`).

**Anywhere you see `cookieManager.get(cookieKeys.locationZUID)` (or similar) in a module, that value came from this file, not from the current page's own fields.**

## 3. Org-level fallback cascade (repeated in ≥3 places)

The same "try the most specific level, then walk up to national" pattern is implemented independently in at least three places, with slightly different code each time:

- `modules/hero`'s `addHeroSliders()` — location → division (cookie) → territory (cookie) → national, for `matrix_hero_sliders.json` entries.
- `modules/hero`'s `cardGenerator1`/`cardGenerator2` — division → territory → national, resolved by chaining fetches to Zesty's built-in `/-/instant/<zuid>.json` endpoint (`Promise.any`-style "first success wins" loop).
- `modules/stats`'s `generateCarousel()` — location → division → territory → national, filtering a flat stats array by matching `stat.locations`/`.divisions`/`.territories` relationship data against the cookie ZUID.

**Flag:** because this cascade is hand-rolled three times with different matching logic, a future change to "how org-level fallback should work" would need to be made in three places, not one. Worth a `web-developer` follow-up to consider extracting a shared helper (e.g. into `webengine/scripts/`).

## 4. `ServicesObserver` / `ServicesDB` (IndexedDB cache) — `modules/indexdb`

`custom_head` creates `window.ServicesObserver` (a tiny pub/sub: `subscribe(cb)` / `notify(data)`) and kicks off `initSiteScripts()`, which builds a `ServicesDB` (wraps `window.indexedDB`, object stores `servicesItems`/`servicesMeta`) and calls `db.initServices(locationZUID, modelZUID)`, which fetches the appropriate `get-services-{territories,divisions,locations,national}.json` endpoint based on `cookieKeys.locationModel` and then calls `ServicesObserver.notify(services)`. `modules/services` subscribes to this (`ServicesObserver.subscribe((services) => setupServicesCards(services))`) instead of fetching data itself. **If you need "the current page's list of services" in a new module, subscribe to `ServicesObserver` rather than adding another fetch to one of the `get-services-*.json` endpoints.**

## 5. Declarative analytics attributes → `LinkTrackingClickEvent`

Interactive elements across almost every module carry a consistent set of `data-*` attributes:

```html
<a data-location-type="body:hero-section"
   data-function-type="other"
   data-format-type="button"
   data-link-type="internal"
   onclick="LinkTrackingClickEvent(this,'cta_click')">...</a>
```

`LinkTrackingClickEvent` (defined in `webengine/scripts/data-layer/link-tracking.js`, a standalone Zesty **script** resource, not a view) reads `data-function-type`/`data-format-type`/`data-location-type`/`data-link-type`/`href`/link text, plus any `data-page-component*-type` and `data-event-*-type` attributes, strips nulls, and calls `utag.link(...)`. **New CTAs should follow this exact attribute convention** rather than writing bespoke `utag.link()` calls, so tracking stays consistent with the rest of the site. There are separate tracking scripts per concern under `webengine/scripts/data-layer/` (`form-tracking.js`, `location-tracking.js`, `site-search-tracking.js`, `services-tracking.js`, `program-tracking.js`, `volunteer-tracking.js`, `career-tracking.js`, `media-tracking.js`, `news-tracking.js`, `wysiwyg-tracking.js`) — check there first before writing new tracking JS inline in a view.

## 6. Duplicated Tealium page-view bootstrap

The full `utag.view()` data-layer payload (page_path, page_name, page_hierarchy, organization_*, `modules: getModules()`, etc.) is implemented **independently in at least 4 places** with copy-pasted logic: `loader`, `custom_head`, `404-page`, and the `global-analytics`/`global-analytics.html`/`tealium-analytics` views. They aren't identical — e.g. `404-page`'s copy hardcodes `page_errorPage: 'true'` and reads `$page_type_detail`, while `custom_head`'s doesn't set `page_errorPage` at all. **If you change the analytics payload shape, you likely need to change it in all of these, not just one** — this is a real maintenance risk, not just documentation noise.

## 7. External link auto-hardening (`modules/external-links`)

A `MutationObserver`-based script (loaded via `custom_head`) automatically adds `target="_blank"` and `rel="noopener noreferrer"` to any `<a>` whose hostname differs from `window.location.hostname` — including links injected after page load by other modules' client-side rendering (news cards, service cards, etc.). You do **not** need to manually add `target="_blank"` to external links in new templates; this script does it globally. It only affects `http(s)` links (protocol-relative/mailto/tel are left alone).

## 8. Hero-full field-name drift (Block Library vs. Modules)

`webengine/views/-/block/hero_full.html` (a Block Library / WYSIWYG block) and `webengine/views/modules/hero-full` (a WebEngine module) render visually identical markup but read **different field names** for the same concept (`this.image` vs `this.hero_image`; `this.description` vs `this.subtitle`). See `docs/content-models.md` §9 for the full table across all `hero-full-*` variants. This isn't a doc gap — it's an actual inconsistency in the code that a `web-developer` should decide whether to consolidate.

## 9. Deploy pipeline (`scripts/sync-to-zesty.js` + `.github/workflows/zesty-deploy.yml`)

- Views/styles/scripts on disk are mapped to Zesty resource ZUIDs via `zesty.config.json` (`instance.views`, `instance.styles`, `instance.scripts`), each entry storing `{ zuid, type, updatedAt, createdAt, lastSyncedAt }`.
- **Branch semantics:** pushing to `stage` **saves** changed files to each resource's Zesty "dev" (working) version via `PUT /web/<endpoint>/<zuid>`; pushing to `production` (or manual dispatch with `publish: true`) **only publishes** (`POST /web/<endpoint>/<zuid>/versions/<dev_version>?action=publish`) — it never writes new content on production, so a production deploy with unstaged changes will just no-op with a warning.
- **Change scoping:** by default only files that changed between `DIFF_BASE`(the pre-push SHA)and `HEAD` are processed; `FULL_SYNC=true` (or `--full`) forces every mapped file to be checked.
- **New files on disk** not yet in `zesty.config.json` are auto-created as Zesty resources (`POST /web/<endpoint>`) — except **extensionless new views**, which are skipped with a warning because the script can't infer `templateset` vs `pageset` from a bare filename; those must be created in the Zesty admin first, then their ZUID added to `zesty.config.json` (the CI job auto-commits that mapping back with `chore: map new Zesty resource ZUIDs [skip ci]`).
- **Dry-run/report mode:** `DRY_RUN=true` or `REPORT=true` (or `--dry-run`/`--report`) skips all writes and (for `REPORT`) writes a Markdown summary to `zesty-report.md`, intended for a PR comment bot.
- A hybrid "did this actually change" check (`CAN_CHECK`) fetches the resource's current live code and compares normalized content before writing, to avoid no-op saves/publishes when only whitespace changed.

## 10. Zesty CLI artifacts to ignore during code review

- `webengine/views/z/pvl/**` (paired `.zhtml`/`.json` files) — local version-history cache written by the Zesty CLI.
- `webengine/views/_zesty/rollbacks/**` — rollback snapshots, filenames are base64.
- Neither of these should be hand-edited or treated as "the template" — they're historical snapshots, not the live source. If they show up in a diff unexpectedly, that's worth flagging (it may mean a CLI operation ran locally that shouldn't have been committed).

## 11. `top-level backup/` folder and `.gitignore` change noted in git status

There is a `backup/` folder at the repo root (`backup/custom_head`, `backup/services`, `backup/news`, `backup/map.js`, `backup/*.scss`, `backup/client-nav`) that duplicates several live view/script names. This wasn't diffed line-by-line against the live versions in this pass, but its presence suggests either (a) manual pre-deploy backups someone made locally, or (b) stale content that should be removed. The repo's `.gitignore` also shows as modified in the current git status — worth confirming with the user/web-developer whether `backup/` is meant to be tracked at all.

## 13. Bounding a client-side `fetch()` with `AbortController` + timeout (CODA-2533)

**Draft — pending review.** Fix implemented on branch `coda-2533` as of 2026-09-20; **not yet QA'd, merged, or deployed.**

`modules/upcoming-events`'s `fetchEvents()` (~line 324) previously called `/events.json` via a plain `fetch()` with no timeout. If that request *hung* — never resolved or rejected, as opposed to erroring out, which the module's existing `finally` already handled by hiding the loader — the `await` in `initEvents()` never completed, so the loading spinner on the Events Landing Page spun forever. First reported on USA Southern Territory's page, but confirmed to affect every territory/division/location Events Landing Page, since `upcoming-events` is one shared module.

The fix: wrap the `fetch()` in an `AbortController` with a 30-second timeout (`EVENTS_FETCH_TIMEOUT_MS`), `clearTimeout` in a `finally`, treat a non-OK HTTP response as a logged failure, and have the caller (`initEvents()`) guard on "did I actually get an array back" before doing anything else with the result (sorting, etc.) instead of assuming success.

**Convention to consider for other client-side fetches in this codebase:** as of this writing, none of the other client-side `fetch()` calls documented in `templates.md` (`stats.json`, `staff.json`, `stories.json`, `get-services-*.json`, etc.) have an equivalent timeout/`AbortController` guard — this fix was scoped to `upcoming-events` only. If a similar "infinite spinner on a hung request" bug shows up in another module, this is the pattern to copy; it may also be worth a proactive audit rather than waiting for the next bug report.

## 14. `find_in_set()` scan over a whole content model in a `{{each ... WHERE ...}}` (perf-risk, not fixed by CODA-2533)

While investigating CODA-2533, `web-developer` traced `/events.json` (`webengine/views/events`) filtering events with `{{each events as event WHERE find_in_set('{$zuid}', territories)}}` (and the `divisions`/`property` equivalents) — an unindexed string-function scan over the entire `events` content model on every request. This wasn't changed by the CODA-2533 fix (which only bounds the client-side `fetch()`'s wait time) and isn't itself confirmed to be the cause of the reported slowness, but it's a real perf risk worth future attention, especially as the `events` model grows.

**This is not isolated to `events.json`** — a repo-wide search turns up the same `find_in_set(...)` inside a `WHERE` clause in ~30+ other views (a mix of Block Library blocks, page modules, and ajax-json endpoints, e.g. `modules/programs-schedule`, `modules/services-service-area`, `modules/contact-us-officers`, `stories.json`, `staff.json`, several `datasets/mobile_editor/**` views). If this pattern is ever revisited for performance, it's likely worth treating as a systemic question (e.g. "should relationship filtering use an indexed join instead of `find_in_set` over a full scan") rather than a one-off fix to `events.json`.

## 15. Hardcoded third-party credential in a client-side script

`webengine/views/angel-tree-script` contains a client-side (`<script>`) integration with QuickBase (`https://api.quickbase.com/v1/records/query`) that includes a **hardcoded `QB_TOKEN`** in plain text, sent from the browser. This is a genuine security concern (the token is visible to anyone who views source on whatever page includes this script) — flagged here for visibility, not something Documentation Maker can or should fix. Recommend escalating to web-developer/security review rather than treating as a doc note only.

---

## Open Questions / Flags

1. **Org-level fallback cascade duplicated 3×** (§3) — candidate for consolidation into a shared script; not this agent's call to make, but worth raising with web-developer.
2. **Tealium bootstrap duplicated 4×** (§6) — same recommendation.
3. **`backup/` folder** (§11) — confirm with the user whether it should be deleted, `.gitignore`d, or is intentionally kept.
4. **Hardcoded QuickBase token** (§15) — flagged for security follow-up, not a documentation-only issue.
5. **Hardcoded Zesty session token in `.mcp.json`** — see `docs/api-tools.md` "Needs live verification" §8; same category of concern as §15 above but for the MCP server credential.
6. Could not confirm whether `webengine/scripts/**` files (e.g. `link-tracking.js`, `main.js`) are the actual live copies served to the browser or whether the site pulls a built/minified bundle from elsewhere — the sync script treats them as 1:1 Zesty "script" resources, so assumed live, but not verified against the rendered site.
7. **CODA-2533 fetch-timeout fix** (§13) is Draft — pending review, implemented on branch `coda-2533` only, not yet QA'd/merged/deployed. Other client-side `fetch()` calls in this repo (`stats.json`, `staff.json`, `stories.json`, `get-services-*.json`, etc.) don't have an equivalent guard — worth a proactive audit rather than waiting for the next "infinite spinner" report.
8. **`find_in_set()` scan perf-risk** (§14) — flagged from the CODA-2533 investigation, recurs in ~30+ views repo-wide. Not itself confirmed as the cause of any reported slowness; worth a `web-developer` follow-up to assess if/when the `events` (or other) models grow large enough for it to matter.
