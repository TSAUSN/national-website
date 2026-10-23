# Custom Patterns & Shared Conventions

Status: Draft — pending review
Last generated: 2026-10-15 by zesty-ai:documentation (automated codebase scan on development; seeded from the 2026-09-25 agent-lab doc)

Cross-cutting conventions to **reuse** when building, and known debt **not to copy**. Agents check new work against this list. Paths are relative to the repo root; `webengine/views/` is abbreviated `views/`. Every claim was re-read against the working tree on `development`. Claims are labelled verified (read in code), inferred, or unknown.

## Patterns to reuse

### P-01: Site-wide image fallback (`globals.default_og_image`, `clippings.hero_fallback_image`)

- What: a page field is used when set; otherwise the template falls back to an instance-level Globals image. Globals (formerly "Clippings") is one Zesty feature, reachable as `globals.*` or `clippings.*` (inferred from both prefixes being used for the same kind of content; the model identity was checked on the live instance only in the older doc, not re-checked here).
- Where (verified):
  - `views/custom_head:39` (OG image).
  - `views/modules/hero:111-112`.
  - `views/modules/hero-full:8,62-64`, plus the `hero-full-*` variants (`-angel-tree`, `-donate`, `-events`, `-leadership`, `-service-area`, `-stuff-the-bus`).
  - `views/-/block/hero_full.html:8,58-60`.
  - `clippings.hero_fallback_image` is a second fallback field, used by `views/modules/hero-full-state:35`, `hero-full-cities:33`, `hero-full-404:7` and `modules/contact-us:69`.
- Use it when: a new template needs an image with a sensible site-wide default. Reuse an existing `globals.*` / `clippings.*` field instead of adding a new mechanism (`CLAUDE.md`, Conventions). For hero-type images, check which field the sibling `hero-full-*` module uses before choosing.
- Gotchas: field names drift between variants (`this.hero_image` in `hero-full`, `this.image` in `-/block/hero_full.html`, `hero-full-leadership`, `hero-full-service-area`). See D-03.

### P-02: Org-hierarchy cookie state machine (`modules/client-global-navigation`)

- What: the central shared script. It resolves which org level the visitor is on (national / territory / division / location) and writes it to cookies. Hero, stats, news, services, header, footer and others read those cookies instead of deriving location themselves.
- Where (verified):
  - `views/modules/client-global-navigation:233` `cookieManager` (get/set/delete).
  - `:315` `cookieKeys`, the canonical list of cookie names. Do not invent ad-hoc cookie names elsewhere.
  - `:259` `levels`, `:277` `models`.
  - `:597` `async function initCookies(source)`, a `switch (currentModel)` that sets cookies per page type.
  - `:2360` `case models.states`, `:2407` `case models.cities`.
  - `:2592` `hasValidZUIDShape(zuid)` (false for empty, `"0"` or whitespace). Also used at `:2597` and `:2616`.
  - `:2961` and `:2966` call `initCookies` on DOMContentLoaded and on visibility change.
- `window.cookiesReady`: set in `views/custom_head:116` (`window.cookiesReady = window.cookiesReady || initCookies().catch(...)`) after `custom_head:106` includes this module. `views/loader:66`, `views/404-page:16`, `views/components/header:1057` and `views/components/header-dynamic:884` await it, or call `initCookies()` if it is missing. The footer and `components/nav-mobile(-dynamic)` set their Volunteer links after it resolves.
- `volunteer_url` on Central pages: `initCookies` awaits the `get-volunteer-page` lookup (one request per location per page load) before it resolves, so `window.cookiesReady` covers the final value. The cookie holds the Central territory page while the lookup runs. Volunteer links render the national volunteer page until a non-empty cookie value replaces it.
- Use it when: you need the visitor's current location, division or territory. Read `cookieManager.get(cookieKeys.X)` after awaiting `window.cookiesReady`. A value that looks like "the current location" in a module came from this file, not from the page's own fields.
- Informational pages: a persisted `location_zuid` cookie wins and is left as is. Without one, the owner is resolved in Parsley at the top of the module (so cookies are set before the footer reads them) from the page's `location`, `division`, `territory` fields, each one ZUID or a comma-separated list: one location gives Location context; several locations in one division give Division; several divisions in one territory give Territory; otherwise National. Division and territory come from the locations (a location without a territory uses its division's), then from the page's own fields, then from the parent informational page. `get-informational-page-links` applies the same location rules to list a multi-location page in the nav of the division or territory it resolves to; change both together.
- Extending it: add a new org-level branch by reusing `setLocationCookiesByTerritory()` (`:672`, `:712`, `:815`) and `setContactUsCookiesWithNationalFallback()` (`:387`), and guard derived ZUIDs with `hasValidZUIDShape()`. The `cities` branch does this (`:2420` falls back to `setNationalLocationCookies()`).
- Gotchas:
  - The `states` branch (`:2360-2406`) reads `{{$statesTerritoryZUID}}` and has **no** `hasValidZUIDShape()` guard. Verified: if a State has no territory, cookies are set from an empty ZUID instead of falling back to national. This is a possible code gap, not a documented behaviour (see Open Questions).
  - Debug: `?debugDataLayer=1` enables `logCurrentDataLayerValues` output (function referenced at `:598`; the query-param handling was not re-read in this pass).
  - A second copy exists at `views/modules/tags/client-global-navigation` (see D-04).
  - The informational-page owner lookups read records with `{{each <model> as x WHERE z.zuid = '{$var}' LIMIT 1}}` (as `get-page-ownership.json` does), because `<model>.filter({$var})` returned the first record there on a branch preview. `filter()` with an empty ZUID also returns the first record. The other `.filter` usages in this file are unchanged and have not been verified.

### P-03: Org-level fallback cascade (implemented independently three times)

- What: try the most specific level, then walk up to national.
- Where (verified):
  - `views/modules/hero:475` `addHeroSliders()` and `:530-549` (location, then division, then territory, then national, over `/-/gql/matrix_hero_sliders.json`).
  - `views/modules/hero:214` `cardGenerator1` and `:344` `cardGenerator2` (division, then territory, then national, over `/-/instant/<zuid>.json`, first success wins via `Promise.any`).
  - `views/modules/stats:502` `generateCarousel()` (filters a flat stats array by relationship ZUIDs, per org level).
  - `views/modules/upcoming-events:112-119` mirrors the same order for event org candidates, and uses `/-/instant/` at `:103` and `:392`.
- Use it when: a module needs "content for my org, else a parent's". Follow the same priority order.
- Gotchas:
  - A change to the fallback rule has to be made in every copy; see D-02.
  - `/-/gql/` and `/-/instant/` are Zesty optional features. Per docs.zesty.io (not re-verified here) they must be enabled in the instance's developer settings. If disabled, the fetches fail and that content does not load. PLATFORM QUESTION (zesty): confirm both are enabled on instance `8-da979ebeab-d59gnx`.
  - `views/components/header:670` and `header-dynamic:630` also depend on `/-/instant/`.

### P-04: Services cache and pub/sub (`ServicesObserver`, `ServicesDB`)

- What: `custom_head` creates `window.ServicesObserver = new ServicesSubject()` and runs `initSiteScripts()`. That builds `ServicesDB` (IndexedDB, stores `servicesItems` and `servicesMeta`) and fetches the right `get-services-{territories,divisions,locations,national}.json` per location model. It then calls `ServicesObserver.notify(services)`.
- Where (verified): `views/custom_head:111,176-181`; `views/modules/indexdb:2` (`ServicesSubject`), `:26` (`ServicesDB`), `:76-90` (endpoint switch by model ZUID), `:167` (`initServices`). Subscribers: `views/modules/services:623`, `views/components/header:843,1455`, `views/components/header-dynamic:805`.
- Use it when: a new module needs the current page's list of services. `subscribe()` replays the latest value (`indexdb:10-12`), so a late subscriber still gets data. Do not add another fetch to the `get-services-*` endpoints.

### P-05: Declarative analytics attributes and `LinkTrackingClickEvent`

- What: interactive elements carry `data-location-type`, `data-function-type`, `data-format-type`, `data-link-type` and `onclick="LinkTrackingClickEvent(this,'<event>')"`. The function reads those attributes and optional `data-page-component*-type` attributes, drops null or empty values and pushes to Tealium (`utag`).
- Where (verified): `webengine/scripts/data-layer/link-tracking.js:1` (function), and 53 view files reference `LinkTrackingClickEvent`. Per-concern scripts live in `webengine/scripts/data-layer/`: `form-`, `location-`, `site-search-`, `services-`, `program-`, `volunteer-`, `career-`, `media-`, `news-`, `wysiwyg-tracking.js`.
- Use it when: adding a CTA or link. Follow the attribute convention and check `data-layer/` before writing inline tracking JS.
- Gotchas: `utag.link` is also called directly in some views and scripts (42 call sites in `views/` and `scripts/` at scan time), so the convention is not universal.

### P-06: External link auto-hardening (`modules/external-links`)

- What: a `MutationObserver` script adds `target="_blank"` and `rel="noopener noreferrer"` to links whose host differs from the current host, including links injected after load.
- Where (verified): `views/modules/external-links:25-37,50`; included from `views/custom_head:108`.
- Use it when: writing external links. You do not need to add `target`/`rel` by hand.
- Gotchas: the older doc said only `http(s)` links are affected. That detail was not re-read in this pass (inferred still true).

### P-07: Parsley output is not escaped by default

- What: per docs.zesty.io (not re-verified here), Parsley does not HTML-escape `{{ }}` output. Treat every value as raw.
- Where (verified examples): `.escapeForJs()` for values inside JS strings (330 occurrences under `views/`, for example `views/custom_head:101`, `views/modules/upcoming-events:114-115`); `.htmlentities()` for values in HTML or JSON (`views/404-page:129,137`, `views/api/property-type.json:6`).
- Use it when: any request-derived value (`{{get_var.*}}`, `request.queryParam(...)`) reaches HTML, or any Parsley value lands inside a JS or JSON string.
- Gotchas: everything inside `{{ }}` runs on the server, even inside a `<script>` tag. This is the platform rule only, not an audit of which templates lack escaping. Unescaped request values exist, for example `views/api/territory-stories.json:5-6` uses `{get_var.territory}`; whether that is exploitable was not assessed.

### P-08: Locations endpoint sync service (`scripts/locations-endpoint-sync/`)

- What: a separate Node service (own `package.json` and README, not part of the Zesty sync). It receives a Zesty locations-model webhook, rebuilds the full locations JSON from a Parsley endpoint, and writes it into a Zesty view through the Instance API. It runs as a local Express server or a Cloud Functions gen2 HTTP function.
- Where (verified):
  - `scripts/locations-endpoint-sync/index.js`, `src/webhook-handler.js`, `src/webhook-server.js`.
  - `src/locations-sync.js:11-13` (live and preview domains), `:15` (45s debounce), `:19-23` (retry settings: 3 attempts, 120s timeout, retries on 502/503/504), `:44` (`fetchLocations` uses the preview domain for `update` and the live domain otherwise).
  - `src/zesty-view-commit.js:27-34` (`updateLocationsView`): writes the live view (published unless `publish: false`) and a separate dev view (draft only).
  - Deploy: `README.md` and `scripts/deploy.js`.
- Consumer: `views/locations.json` is a one-line `{{include https://<media-host>/locations.json}}` stub (verified); `webengine/scripts/map.js:620` fetches `/locations.json`.
- Use it when: locations data for the map changes. Do not hand-edit generated locations JSON.
- Gotchas: only secrets are read from env (`DEV_TOKEN` through GCP Secret Manager); the example config holds identifiers only (`deploy.config.example.json`). The service must keep `max-instances=1` for its in-memory debounce (README). The mapping between the view ZUIDs the service writes and the repo's `/locations.json` entry (`zesty.config.json:544`) is unknown (see Open Questions).

### P-09: Events loaded lazily from the Instant API (`modules/upcoming-events`)

- What: events load only when the module nears the viewport. The org (location, division, territory, then parent) is resolved from the page's own fields, and states and cities come from `/-/instant/`. Fetches use a timeout and a 10-minute cache.
- Where (verified): `views/modules/upcoming-events:103` (`STATES_INSTANT_URL`), `:105-109` (timeout, TTL, viewport margin), `:112-125` (org candidates; note the two branches by `$page_type_detail`), `:350` (`fetchJSON`), `:461` (`/get-events.json`). Endpoint: `views/get-events.json`.
- Use it when: building another lazy, org-scoped listing. Reuse the candidate-list approach rather than reading cookies.
- Gotchas: this module resolves org from page fields (a fourth variant of P-03), not from cookies.

## Known debt (do not copy)

### D-01: Hardcoded QuickBase credentials in client-side views

- What and where (verified; values deliberately not reproduced):
  - `views/angel-tree-script:4` defines `QB_TOKEN` in a `CONFIG` object and sends it in a browser `Authorization: QB-USER-TOKEN` header at `:41` (calls `https://api.quickbase.com/v1/records/query`).
  - `views/modules/map-stuff-the-bus:111,136`: a token literal in an `Authorization` header, in two requests.
  - `views/modules/map-angel-tree:728`: the same pattern. A commented-out copy remains at `:756`.
  - These headers are served to the browser, so anyone viewing source on a page that includes them can read them. This is more than the single credential the 2026-09-25 doc recorded.
- Includes: `views/modules/map-stuff-the-bus` is included by `views/stuff_the_bus:3`, and `views/modules/map-angel-tree` by `views/angel_tree_campaign:3`. No include of `angel-tree-script` was found (orphaned, or served directly by URL; unknown).
- Why it exists: unknown. Likely a quick client-side integration.
- Instead: do not add new credentials to views or scripts. Do not copy these headers into new work. Escalate to a human for security review and rotation. A server-side or proxy approach is a recommendation (not designed here). Removing the commented copy would not remove the exposure, because the values stay in git history.

### D-02: Org-level fallback cascade duplicated across modules

- What and where: P-03's cascade is hand-written in `modules/hero`, `modules/stats` and `modules/upcoming-events` with different matching logic. A change to "how org fallback works" must be made in each.
- Why it exists: unknown (inferred: modules grew independently).
- Instead: reuse the priority order from P-03. Consider a shared helper before adding a fourth copy (recommendation).

### D-03: Hero-full field-name drift (Block Library vs Modules)

- What and where: `views/-/block/hero_full.html` and `views/modules/hero-full*` render near-identical markup but read different fields (`this.image` versus `this.hero_image`). The same fallback block (`bannerImage`, `fallbackImage`, `onerror`) is copy-pasted into at least seven variants (see P-01). `CLAUDE.md` notes at least four field shapes.
- Instead: when adding a hero, confirm the field names against the content model, and do not assume sibling variants share a schema.

### D-04: Duplicated and likely orphaned `modules/tags/*` copies

- What and where: `views/modules/tags/client-global-navigation` (2557 lines, versus 2969 for the original) and `views/modules/tags/schema` look like copies of `modules/client-global-navigation` and `modules/schema`. No `include` of either `modules/tags/...` path was found in `views/`. `views/custom_head:106` includes the non-tags module. Label: no caller found (orphaned) as of this scan. The tags pages that exist use `views/tags` (includes `modules/tags-archive`) and `views/tag` / `views/tags_pages` (autolayout only).
- Why it exists: unknown. Added with the tags work (`cf09058`, "New Tags Pages Update").
- Instead: do not patch the copy and assume it takes effect. Change `modules/client-global-navigation` (P-02). Ask a human whether the copies are meant to be removed.

### D-05: Tealium page-view payload duplicated

- What and where: the `utag.view()` payload (page path, name, hierarchy, organization fields, `modules: getModules()`) is copy-pasted in `views/loader:227` and `views/404-page:160`, with a variant in `views/global-analytics:26` and `views/global-analytics.html:28`. They differ (`404-page:132` sets `page_errorPage: 'true'`, `loader:197` sets `'false'`). `views/custom_head` only loads Tealium (`utag.sync.js` at `:143`); it no longer contains a `utag.view()` payload (the older doc said it did). `views/tealium-analytics` is a one-line stub. No include of `global-analytics` was found (no caller found).
- Instead: if the payload shape changes, update `loader` and `404-page` together, and check the `global-analytics` views are actually in use before touching them.

### D-06: `temporary-usn.css` redefines theme utilities

- What and where: `webengine/styles/temporary-usn.css` (the file is directly under `styles/`; `webengine/styles/common/temporary-usn.css` does **not** exist, though `CLAUDE.md` still cites that path). It redefines spacing utilities such as `.mb-5` and `.mt-5` (`:12-17`) and carries its own ad-hoc classes (`.jaMR`, `.btn-block`). The header says it is a "temporary stylesheet for migrated content".
- Why it exists: migrated content (per the file header).
- Instead: use the theme's Bootstrap 5 utilities and spacing scale. The design system is the custom theme from `github.com/zesty-io/salvation-army-theme`, injected globally through `views/z/layouts/settings.json` via jsDelivr, pinned to a commit (per `CLAUDE.md`; `views/z/` is not present in this working tree, so the pin could not be read). Bumping the theme means changing the pin in the Zesty manager. Prefer theme classes, then an existing partial in `webengine/styles/{common,components,modules}/`.

### D-07: Tracked Zesty rollback snapshots under `views/_zesty/`

- What and where: `views/_zesty/rollbacks/views/*.json` (two base64-named files for `loader` and `modules/hero`) are tracked and mapped in `zesty.config.json:1972,1979`. They are historical snapshots, not the live template.
- Instead: do not edit them or treat them as the source. Flag them if they change unexpectedly in a diff. Whether they should be synced at all is a question for a human.

## Deploy and sync pipeline

Facts below were re-read from `scripts/sync-to-zesty.js` and `.github/workflows/*.yml`.

**Branch flow** (`CLAUDE.md`): ticket branch (`coda-<ID>`) to `development` to `stage` to `production`. `main` is not in the release flow.

**`scripts/sync-to-zesty.js`** (the only thing that moves local files to the instance):

- `BRANCH` defaults to `stage` (`:7`). `shouldPublish = BRANCH === 'production' || MANUAL_PUBLISH` (`:459`). Any other branch name, without `MANUAL_PUBLISH`, takes the **stage path** (`runStage`, `:390`): create new resources, then save changed files to the instance's shared dev version via `PUT /web/<endpoint>/<zuid>` (`saveDevItem`, `:282`). Stage never publishes.
- `production` takes `runProduction` (`:420`): **publish only**, dev to live, by version number via `POST .../versions/<n>` (`publishItem`, `:307`). It never writes content and never creates. A resource not yet on dev is skipped with a warning, so new files must reach production through `stage` first.
- New files not yet in `zesty.config.json` are created as resources (`createNew`, `:222`). Extensionless new views are skipped with a warning (`:231`), because `templateset` versus `pageset` cannot be inferred. Create them in the Zesty manager and add the ZUID to `zesty.config.json`.
- `EXCLUDED_DIRS` (`:40`) skips `webengine/views/z` and `webengine/views/menu-config`. They are never saved, created or published.
- Env vars: `DRY_RUN`, `REPORT` (implies dry run, writes `zesty-report.md`, `:385`), `FULL_SYNC` (or `--full`), `NO_API_CHECK` (disables the dev/live content comparison, `:19`), `DIFF_BASE` and `DIFF_HEAD` (`:93-94`; by default only files changed between them are processed; a missing or all-zero base falls back to a full sync). `BRANCH`, `MANUAL_PUBLISH`, `ZESTY_INSTANCE_ZUID` and `ZESTY_DEVELOPER_TOKEN` are also read (names only).
- When a token is present, current dev (or live) content is fetched and compared (normalised) so no-op saves and publishes are skipped.

**Workflows** (`.github/workflows/`, human-only to edit):

- `zesty-deploy.yml`: runs on push to `stage` or `production`, and on `workflow_dispatch` (inputs `publish`, `full_sync`). It runs the sync script, then commits any `zesty.config.json` change back as `chore: map new Zesty resource ZUIDs [skip ci]` (`:47-55`).
- `pr-preview.yml`: on PRs into `stage` or `production`, runs the script with `REPORT=true` (read-only) and posts or updates a PR comment from `zesty-report.md`. The comment is marked with `<!-- zesty-sync-report -->` (`:39-61`).
- `pr-slack-notify.yml`: posts to Slack when a PR into `development`, `stage` or `production` is opened or merged (`:3-10`). Webhook URLs come from repository secrets.

**Environments** (`CLAUDE.md`, partly inferred from the workflows): Zesty itself has dev and live. "Stage" is a git branch whose push saves to the instance's dev version (the staging URL). "Production" is the branch whose push publishes dev to live.

**Branch previews** (`https://8hxvw8tw-<branch>.webengine.zesty.io/`) come from Zesty's GitHub integration, not from the workflow (`CLAUDE.md`). A manual `workflow_dispatch` on a ticket branch is not a preview. It runs the stage path and writes that branch's files to the shared dev version (staging).

**Safe for agents:** `npm run deploy:dry` (`DRY_RUN=true`) and `REPORT=true node scripts/sync-to-zesty.js`. Both write nothing to Zesty; `REPORT` writes a local `zesty-report.md`. Without a token the script cannot compare content and treats everything in scope as a change.

**Human-only:** `npm run deploy`, any workflow run (`gh workflow run`, `workflow_dispatch`), and any publish. Agents never trigger `zesty-deploy.yml`. Production releases need human approval.

## Generated or protected files

| File | Written by | Rule |
| --- | --- | --- |
| `zesty.config.json` | deploy bot (`zesty-deploy.yml`) and `sync-to-zesty.js` (new-resource mappings) | Treat as generated state. Do not hand-edit mappings unless the task is about them. Flag problems to a human. |
| `.github/workflows/*.yml` | humans | Human-only. Agents do not edit them. |
| `webengine/views/z/` | Zesty platform (layouts, `settings.json`) | Platform-owned. Gitignored (`.gitignore:13`), excluded by `EXCLUDED_DIRS`, never committed. |
| `webengine/views/menu-config/` | Zesty platform (menus) | Same as above (`.gitignore:14`). |
| `webengine/views/_zesty/rollbacks/**` | Zesty CLI | Historical snapshots. Never hand-edit. See D-07. |
| `zesty-report.md` | `sync-to-zesty.js` with `REPORT=true` | Local or CI artifact. Do not commit. |
| `.env`, `.mcp.json`, `docs/`, `RELEASE_NOTES.md` | local | Gitignored (`.gitignore`). Secrets stay in `.env`. Note `docs/` is gitignored, so this file is local unless the ignore rule changes. |

## Open Questions / Flags

1. D-01: hardcoded QuickBase credentials remain in client-side views (three files, at least four live header uses). A human should rotate them and decide on a server-side approach. This doc records locations only.
2. P-02: the `states` branch lacks the `hasValidZUIDShape()` guard that the `cities` branch has. Is a national fallback intended when a State has no territory? This is a code question for a developer.
3. D-04: are `views/modules/tags/client-global-navigation` and `views/modules/tags/schema` dead copies? No include was found.
4. P-08: does the view ZUID that `locations-endpoint-sync` writes (`LOCATIONS_VIEW_ZUID`, set outside the repo) match the repo's `/locations.json` entry (`zesty.config.json:544`)? If so, a stage sync could overwrite what the webhook wrote. Unknown from the repo.
5. P-03: PLATFORM QUESTION (zesty): are `/-/gql/` and `/-/instant/` enabled in the instance's developer settings?
6. `CLAUDE.md` Styling cites `webengine/styles/common/temporary-usn.css`, but the file is at `webengine/styles/temporary-usn.css` (D-06). `CLAUDE.md` is currently modified in the working tree, so the user should reconcile it directly.
7. Not verified: whether `webengine/scripts/**` files are served 1:1 to the browser. The sync maps them 1:1 to Zesty script resources, so this is assumed.
8. Not verified: the theme pin in `views/z/layouts/settings.json` (the folder is absent from this working tree).
9. Excluded from this doc: the old top-level `backup/` folder (no longer exists, verified), the old `webengine/views/z/pvl/**` cache (untracked in recent commits, and no longer in the tree), the old agent-lab-only notes about `.mcp.json` wiring (`.mcp.json` is gitignored and out of scope here), and the old `scripts` listing of tracking files (re-listed in P-05).

## Review status

Not yet reviewed. All sections are Draft — pending review. This doc supersedes the 2026-09-25 agent-lab version as a re-verified rewrite; a human should compare the two before approving.
