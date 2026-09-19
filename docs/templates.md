# WebEngine Templates

Status: **Draft — pending review**
Last generated: 2026-09-19 by Documentation Maker (automated codebase scan)
Updated: 2026-09-20 by Documentation Maker — added CODA-2533 (`modules/upcoming-events` infinite-spinner fix) and corrected an outdated entry for the `events` view; see "Stories / news / events" and "Ajax-JSON" sections below. **CODA-2533 is implemented on branch `coda-2533` only — not yet QA'd, merged, or deployed** — treat that content as Draft on top of this file's existing Draft status.

## How views are stored in this repo

Zesty WebEngine views are pulled down as files under `webengine/views/`, one file per view, named after the view's path (folders = path segments). Most view files have **no file extension** (they're HTML/Parsley snippets); JSON "ajax-json" endpoint views end in `.json`; a few legacy ones end in `.html`. `zesty.config.json` maps each file path to its Zesty ZUID for the deploy script — see `docs/custom-patterns.md`.

Two subtrees are **not templates to review/edit** and were excluded from most of the review below:
- `webengine/views/z/pvl/**` — Zesty CLI's local version-history cache (paired `.zhtml`/`.json` snapshots), auto-generated.
- `webengine/views/_zesty/rollbacks/**` — Zesty CLI rollback snapshots, auto-generated.

`webengine/views/-/block/*.html` is the **Block Library** (reusable WYSIWYG content blocks), documented in `docs/content-models.md` §10 — it's a different rendering context from the page views below (blocks render inside a rich-text field, not as a full page).

---

## Global layout & head

### `loader` (site-wide layout wrapper)
Wraps every page's `current_view`. Renders (in order): a dev-only QA banner + "Edit Content" link (`instance.env == 'dev'`), a large inline Tealium `utag.view()` data-layer script (page_path, page_name, page_hierarchy from cookies, organization_* from cookies, `modules: getModules()` derived from `[data-component-type]` elements), then `components/header` (or `components/header-dynamic` if `?navType=dynamic`), `components/header-donate-modal`, the page's `current_view` inside `<main>`, `components/footer`, Microsoft Clarity (dev only), and a conditional Feathery form embed hardcoded to one specific content ZUID (`7-dab495a2c1-13lthp`, dev only).
- **Custom logic to flag:** hardcoded ZUID checks for national homepage / Feathery form; large amount of Tealium logic duplicated here and in `custom_head` (see custom-patterns.md).

### `custom_head` (page `<head>` include)
SEO meta tags (`seo_meta_title`, `_meta_description`, `og:*`, `twitter:*`), **OG image fallback pattern** (`this.og_image` → `globals.default_og_image` — see custom-patterns.md), favicon links, a cookie-based `prop-type-simplified` class toggle, Tealium `utag.sync.js` bootstrap, then includes `modules/client-global-navigation`, `modules/indexdb`, `modules/external-links`, sets up `window.ServicesObserver`/`window.cookiesReady`, and finally includes `modules/schema` (JSON-LD).
- **Custom logic to flag:** a hardcoded `set_zuid` check (`6-c2b7f2a9ad-k4frxv`) injects `clippings.custom_analytics_scripts` raw script — unclear what page/model this targets without checking the live instance.

### `global-analytics` / `global-analytics.html` / `tealium-analytics` / `analytics.html`
Multiple **near-duplicate** standalone Tealium bootstrap scripts, not all wired into `loader`/`custom_head`. `global-analytics`/`global-analytics.html` are byte-for-byte similar (one has a placeholder-style `utag.view()` payload with literal `<<...>>` template markers that looks unfinished/example code, not live). `tealium-analytics` is trivial (`request.queryParam(profile)` only). Flagged as likely dead/duplicate — see custom-patterns.md.

---

## Page-type templates (top level of `webengine/views/`)

Most page-type views are thin — they just `{{include}}` a sequence of modules. The interesting logic is almost always in the module, not the page wrapper. Grouped by purpose:

### Org hierarchy pages
| View | Renders | Notes |
|---|---|---|
| `territories`, `divisions`, `locations` | `hero`, `map`, `services`, `stats`, `news-cards` | **Identical** across all three — same 5 includes, byte-for-byte. Confirms these three content models share one page layout by convention. |
| `homepage` | `hero`, `map`, `services`, `stats`, `news` | Same shape as above but with the full `news` module (search/filter) instead of `news-cards` (carousel). |
| `cities` | `hero-full-cities`, `zip-search` | |
| `country`, `properties_types` | Parsley `autolayout()` stub | Unmodified default — not customized. |

### Services & service areas
| View | Renders | Notes |
|---|---|---|
| `services` | `hero-full-donate`, page_intro block, `benefits-perks`, `service-wy`, `programs-schedule`, `donate`, `stats-modules`, `become-a-member`, `news-cards`, `services` | Resolves the item's location/division/territory ZUIDs and `national_service_body_content` fallback via `service_types.filter(...)`. |
| `service_area` | `hero-full-service-area`, `services-service-area`, `service-area-body-details` | |
| `services_types`, `services_seed_content` | Parsley `autolayout()` stub | Unused/unmodified. |
| `services-offered` (`.json`) | Ajax-json | Returns a location's `services_offered` list as JSON. |

### Stories / news / events
| View | Renders | Notes |
|---|---|---|
| `stories` | Inline (no includes) | Story detail page. Branches on `page_layout` (`Image Landscape`, `Image Landscape No Sidebar`, `Image Thumbnail`, default) to produce 4 different layouts, plus a 301 redirect if `external_url` is set. Ends with `modules/recent-stories`. Client JS formats the date and title-cases the location name. |
| `stories_landing_page` | `news-archive` | |
| `stories_new` | `all-stories-archive` | Looks like a newer/alternate stories-landing template; unclear if `stories_landing_page` or `stories_new` is the live one — flag for confirmation. |
| `news_archive` | `news-archive-search` (component) | |
| `events_landing_pages` | `hero-full-events`, `upcoming-events` | |
| `events` | Ajax-JSON data endpoint — serves `/events.json` | **Correction (2026-09-20):** an earlier pass in this doc described `events` as an empty/stub container. That was outdated/wrong — the file (no extension, but rendered as a JSON array, not HTML) branches on a `?model=` query param and returns `events` content items filtered by org relationship. See the `events.json` row in the Ajax-JSON table below for the full contract, and `custom-patterns.md` for a perf-risk flag on its filter logic. Consumed by `modules/upcoming-events`. |

### About / contact / leadership / volunteer
| View | Renders | Notes |
|---|---|---|
| `about_us` | `hero-full`, `image-button-text-full`, `stats`, `local-needs`, `leadership-list` | |
| `contact_us` | `contact-us`, then branches on `this.location`: `map-with-info-contact` + `contact-us-officers`, else (commented-out `contact-info`) + `map-contact`; always `faqs`, `contact-form` | The `contact-info` include is commented out — national/no-location contact pages may be missing that block intentionally or by accident. |
| `contact-form` | Static "Contact Us" shell, no logic | Looks unfinished/stub. |
| `leadership_landing_page` | `hero-full-leadership`, `leadership-list` | |
| `volunteer_pages` | `autolayout()` or `modules/generic`, or 301 to `external_link` | Same `template_layout` pattern as `informational_pages`. |
| `informational_pages` | Same 3-way branch as above | |
| `informational_pages_dev` | Parsley `autolayout()` stub | Looks like a scratch/dev copy of `informational_pages`. |
| `location_finder` | `location-finder` | |

### Campaign micro-sites
| View | Renders |
|---|---|
| `angel_tree_campaign` | `hero-full-angel-tree`, `angel-tree-wy`, `map-angel-tree`, `angel-tree-wy-2` |
| `stuff_the_bus` | `hero-full-stuff-the-bus`, `stuff-the-bus-wy`, `map-stuff-the-bus`, `stuff-the-bus-wy-2` |

### Errors / infra
| View | Notes |
|---|---|
| `404` | Literal plain-text `404 not found` (this is the raw HTTP 404 responder, separate from the styled page below). |
| `404-page` | Full styled 404 page: placeholder header skeleton, `components/header`, `hero-full-404`, `services`, `faqs`, `components/footer`. Duplicates most of `loader`'s Tealium/analytics logic inline rather than including `loader`. |
| `blocks_test`, `api_test`, `gb_test` | **Scratch/test views left in the repo** (`api_test` echoes a Services JSON list; `gb_test` literally contains "some change / This is some test"; `blocks_test` echoes a query param). Not real product templates — flag for cleanup. |
| `csv_generator`, `generate-csv` (`.json`) | Admin-facing tool: an HTML page (`csv_generator`) with model/territory/division/location filters that calls `generate-csv.json`, an ajax-json endpoint that dumps Territories/Divisions/Locations/About Us/Informational Pages/Contact Us/Leadership/Events/Stories/Volunteer Pages rows (title, org scoping, `path_part`, publish status, URL) as a flat JSON array, paginated via `page`/`per_page`. |
| `loader`, `custom_head` | See "Global layout & head" above. |
| `national-legacy-contact-code` | Legacy jQuery/Wufoo/SimpleMaps contact-page CSS+script bundle carried over from a previous ("Symphony") site — comment says it can be deleted once the new contact form ships. |
| `code`, `data_code`, `code.json` | Ajax-json helper endpoints that resolve a Territory/Division/Location ZUID to an analytics `code` string (`SAL^<territory>^<division>^<location>`) or a `page_type`/`code` pair. Used by client JS to set Tealium cookies before the page-level data layer fires. |

---

## Modules (`webengine/views/modules/*`)

Modules are the actual content-rendering building blocks, included by page-type views. ~90 exist; grouped by purpose below (not every module is itemized — see `content-models.md` for field-level detail on the ones that render page fields directly).

### Hero banners
`hero` (homepage/org-hierarchy carousel: fetches `matrix_hero_sliders.json` client-side, falls back through location→division→territory→national via cookies, and separately resolves "primary/secondary card" CTAs via the `-/instant/<zuid>.json` Zesty endpoint with the same org-level fallback cascade) and a family of single-purpose `hero-full-*` variants (`hero-full`, `-donate`, `-events`, `-leadership`, `-service-area`, `-state`, `-cities`, `-404`, `-angel-tree`, `-stuff-the-bus`) that each render one page's own hero fields directly (no fallback cascade) — see content-models.md §9 for the field-name inconsistency across these.

### Org / services
`map` (location search CTA + Google map init), `services` (swiper carousel of service cards, populated client-side by `ServicesObserver`/`ServicesDB`, org-scoped visibility logic based on `property_type`), `services-service-area`, `service-wy` / `service-wy-landing`, `programs-schedule` / `programs-schedule-landing` (accordion of `matrix_program_schedule` items, with day-range formatting JS), `benefits-perks` ("How We Serve" info cards, dynamic CSS grid span based on description length), `local-needs`, `become-a-member`, `donate`, `stats-modules`, `stats-with-stat-group`.

### Stories / news
`news` (full search/filter/swiper module, fetches `stories.json`/`service-types.json` client-side, has a date-picker filter), `news-cards` (simpler homepage carousel variant, same data source), `news-archive`, `all-stories-archive`, `featured-stories`, `recent-stories`.

### Events

`upcoming-events` — renders the "Upcoming Events" swiper carousel on `events_landing_pages` (via `hero-full-events` + `upcoming-events`). Client-side `initEvents()` (~line 101) calls `fetchEvents()` (~line 324), which fetches `/events.json` (see Ajax-JSON table below) scoped by the `locationZUID`/`locationModel` cookies that `modules/client-global-navigation` sets (see `custom-patterns.md` §2) — sorts the results by event date, filters to upcoming-only, and renders event cards into the swiper; a `finally` block hides the loading spinner regardless of outcome.

- **Status: Draft — pending review.** A bug fix for **CODA-2533** is implemented on branch `coda-2533` as of 2026-09-20 — **not yet QA'd, merged, or deployed.** Do not treat this fix as shipped until a human confirms the merge (per this project's PR-ownership convention).
- **Bug fixed (CODA-2533):** the Events Landing Page got stuck on an infinite loading spinner. First reported on USA Southern Territory's page (`/usa-southern-territory/events/`), but confirmed to affect every territory/division/location Events Landing Page, since `upcoming-events` is one shared module/template, not something Southern-specific. Root cause: `fetchEvents()` called `fetch('/events.json...')` with no timeout/`AbortController`. A request that *hung* (as opposed to one that errored out — which the existing `finally` already handled by hiding the loader) meant `initEvents()`'s `await fetchEvents()` never completed, so the loader was never hidden. (The `locationZUID`/`locationModel` cookie logic in `client-global-navigation` was checked and ruled out — it's uniform across all territories.)
- **Fix:** `fetchEvents()` now wraps its `fetch()` call in an `AbortController` with a 30s timeout (`EVENTS_FETCH_TIMEOUT_MS`), clears the timeout in a `finally`, and treats a non-OK HTTP response (`!model.ok`) as a logged failure returning `false` rather than trying to parse a bad response. `initEvents()` now guards on the result: if `fetchEvents()` didn't return an array (timeout, abort, bad status, or thrown error), it shows a "We're unable to load events right now. Please try again later." message and returns, instead of letting the subsequent `.sort()` throw on `false`.
- **Net effect:** a hang now degrades to a bounded (~30s) error state instead of an infinite spinner; normal slow-but-successful loads under 30s are unaffected. This fix does **not** address the `find_in_set` unindexed-scan performance risk inside `/events.json` itself — see the Ajax-JSON table below and `custom-patterns.md` §13 for that separate, still-open concern.

### Stats
`stats` (large module: dual-carousel with left image / right content+share, fetches `stats-info.json`, filters client-side by org level with a location→division→territory→national cascade, share-to-social buttons using `navigator.share`/manual share links).

### Leadership / staff
`community-leaders` (homepage variant, fetches `staff.json`, biograph flip-cards, swiper), `leadership-list` (same pattern scoped by `this.location`), `leadership`, `leadership-parent`, `advisory-board`, `contact-us-officers`.

### Forms / CTA / marketing blocks
`contact-us`, `contact-info`, `contact-form`, `faqs` (accordion grouped by hardcoded `topic` buckets), `image-button-text` / `-full` / `-full-bleed` / `-reverse` (repeated "image + title + description + CTA" pattern, several near-identical copies with slightly different field-name suffixes), `testimonials`, `text-block`, `video-module`, `info-cards-stats`, `sponsorship`, `partnership-opportunities`, `corporate-partners`, `what-we-do`, `volunteer`, `employment`, `job-positions`, `generic`, `generic-info`.

### Campaign-specific
`angel-tree-wy`, `angel-tree-wy-2`, `map-angel-tree`, `hero-full-angel-tree`, `stuff-the-bus-wy`, `stuff-the-bus-wy-2`, `map-stuff-the-bus`, `hero-full-stuff-the-bus`. Note: `webengine/views/angel-tree-script` contains a large, separate client-side geocoding/QuickBase-integration script (calls `https://api.quickbase.com/v1/records/query` directly from the browser with a **hardcoded QuickBase token** — see custom-patterns.md flag).

### Navigation / infra (not visual content — shared plumbing)
`client-global-navigation` (huge — ~2000 lines; defines `cookieManager`/`cookieKeys`, resolves and persists the current org-level context into cookies, sets donate/volunteer/employment URLs, drives `page_hierarchy`/Tealium profile selection — see custom-patterns.md), `global-navigation`, `location-finder` / `location-finder-script` / `zip-search`, `external-links` (auto-adds `target="_blank"`/`rel=noopener noreferrer` to any off-host `<a>`, including ones added after page load, via `MutationObserver`), `indexdb` (defines `ServicesObserver` pub/sub + `ServicesDB` IndexedDB wrapper that caches `get-services-*.json` results), `schema` (JSON-LD `LocalBusiness`/organization structured data, branches by model ZUID), `map-with-info`, `map-with-info-contact`, `map-contact`, `map-contact-information` (component, used by several map modules).

There is also `webengine/views/modules/tags/schema` and `modules/tags/client-global-navigation` — apparent duplicates of `modules/schema` and `modules/client-global-navigation` living under a `tags/` subpath. Not confirmed whether these are used by a `tag`/`tags_pages` view (both of which are unmodified `autolayout()` stubs) or are stray copies — flagged below.

---

## Components (`webengine/views/components/*`)

| Component | Purpose |
|---|---|
| `header` / `header-dynamic` | Main site nav. `header` is very large (~1500+ lines): builds service-category checkboxes/mega-menu columns, resolves informational-page nav links via `get-informational-page-links`, syncs header text from cookies (location name, donate URLs), includes `nav-mobile`, `header-find-help-modal`, `header-search-modal`, `header-donate-drawer-modal`. `header-dynamic` is an alternate variant selected via `?navType=dynamic`. |
| `footer` | Site footer; also fetches `model-info.json` and includes `news-letter-modal`. |
| `nav-mobile` / `nav-mobile-dynamic` | Mobile nav counterparts. |
| `header-search-modal`, `header-find-help-modal`, `header-donate-modal`, `header-donate-drawer-modal`, `news-letter-modal` | Modal dialogs launched from the header/footer. |
| `card`, `service-card`, `biograph-card`, `current-location-card` | Reusable card markup (mostly static/placeholder markup consumed as an HTML template string by module JS, e.g. `modules/community-leaders` builds `biograph-card`-style markup inline rather than including this file at render time — see flag below). |
| `stat-group` | Static example markup for a single stat card (appears to be a design reference, not wired to live data — the actual stats module builds its own markup client-side). |
| `map-contact-information`, `map-contact-information-pointer` | Location contact-info panel used inside map modules. |
| `service-area-body`, `service-area-contact-detail` | Service-area page content blocks. |
| `news-filter`, `news-archive-search`, `news-archive-list` | Stories/news filtering UI. |
| `socials-share` | Share-this-story buttons on the story detail page. |
| `location-finder-results` | Result-card markup for the location finder. |

**Flag:** `components/card`, `components/service-card`, and `components/stat-group` contain hardcoded example content ("Title", "Lorem ipsum...", "Fact 1") rather than field bindings — the live cards you see on the site are actually built as HTML-string templates inside the corresponding module's `<script>` (e.g. `modules/news`, `modules/services`, `modules/stats`). These component files look like they were the original static mockups and may no longer be the live render path — confirm with web-developer before treating them as current.

---

## Ajax-JSON / data endpoint views

These are Parsley views with a `.json` extension — Zesty renders them as `ajax-json` responses, and the front-end JS in the modules above calls them via `fetch()`. Full request/response contract for each is defined entirely in the Parsley template (not a separate backend) — see the query string params below.

| Endpoint | Query params | Returns |
|---|---|---|
| `model-info.json` | `zuid` | Full `toJSON()` of a content item, resolved by matching `zuid` against every model in `models` (used to identify "what model is this ZUID"). |
| `models-info.json` | — | List of `{zuid}` for every model in the instance. |
| `stories.json` | `show`, `limit`, `name` (search), `most-recent`, `related-service`, `date`, `model`, `location` | Story cards for the news/story modules; also returns `modelJumpedName` when results "jump" from location scope up to a broader org level. |
| `service-types.json` | `zuid` (optional) | All service types, or one by zuid. |
| `services-info.json` / `services.json` (page) | — | Related to service listing; `services.json` at repo root is the **page-type view** for individual service pages, not a data endpoint (see page table above). |
| `events.json` (view name `events`, no file extension) | `zuid`, `model` | Events for a Territory (`model=6-deab97cfd9-wb5km4`), Division (`6-acb19a94bd-4q8ftj`), or Location/property (`6-b4c9aba69c-h2nqvm`), each branch filtering with `{{each events as event WHERE find_in_set('{$zuid}', <territories\|divisions\|property>)}}`. **Perf-risk flag:** this is an unindexed string-function scan over the entire `events` content model on every request — not changed by CODA-2533, but worth future attention if the `events` model grows; see `custom-patterns.md` §13 (the same `find_in_set`-in-`WHERE` pattern recurs in ~30+ other views in this repo, so any future fix/index strategy is likely worth applying broadly, not just here). Consumed by `modules/upcoming-events`'s client-side `fetchEvents()` — see that module's entry above for the CODA-2533 hang/timeout fix (Draft, not yet merged). |
| `services-offered.json` | `zuid` | A location's `services_offered` list. |
| `service-catalog.json`, `api_test`, `get-services-territories`, `get-services-divisions`, `get-services-locations`, `get-services-national` | `zuid`, `model_zuid` | Services scoped to a territory/division/location/national level; consumed by `modules/indexdb`'s `ServicesDB` cache. |
| `stats-info.json` | `zuid`, `page-model`, `parent-division`, `parent-territory` | Stats scoped to the requesting page's org level. |
| `location-finder.json` | `query` | Location lookup by name, used by the "return to newsroom" link logic. |
| `staff.json` | `property`, `model`, `limit` | Staff/leadership list scoped by location/org model. |
| `staff_role_types.json` | — | All staff role types (used to filter "leaders"). |
| `find-event.json`, `find-story.json` | — | Not read in detail during this pass — flag for follow-up. |
| `data_code`, `code`, `code.json` | `zuid`, `model`/`model_zuid` | Resolves a ZUID to a Tealium `code`/`page_type` string. |
| `generate-csv.json` (view name `generate-csv`) | `zuid`, `divisionzuid`, `locationzuid`, `<model>=1` flags, `page`, `per_page` | Flat CSV-able export of most content models scoped by org hierarchy (see `csv_generator` above). |
| `get-informational-page-links` | `zuid`, `navParent` | Informational-page nav links for the header mega-menu, scoped by org level and `navigation_parent`. |
| `get-informational-page-links copy`, `get-informational-page copy.json` | — | **Appear to be accidental duplicate files** (literal " copy" in the filename) — flag for cleanup, not documented as live endpoints. |
| `get-volunteer-page` | `zuid`, `model` | Resolves the nearest Volunteer Page for a location/division/territory, with a hardcoded national fallback URL (`7-b0e2afd6f9-t0dckq`). |
| `paginated-locations.json`, `paginated-divisions.json`, `location-finder.json`, `all-service-pages.json`, `all-informational-pages.json`, `get-stories-by-location.json`, `contact-us-cookie-fallbacks.json` | — | Not opened in detail during this pass — flag for follow-up (names strongly suggest their purpose but content wasn't verified). |
| `angel-tree-data.json`, `angel-tree-dummy-data.json`, `hero-content.json`, `hero-content-test.json`, `gisele-test.json` | — | Names suggest scratch/test data endpoints; not verified — flag for cleanup review. |

---

## Datasets (`webengine/views/datasets/mobile_editor/**`)

A set of `.json` views under `datasets/mobile_editor/` (content_list, locations, navigation, query subfolders) were not opened in this pass. Names (`getUsersByEmail.json`, `getRoleTypes.json`, `getHeroSliders.json`, `getDivisions.json`, `getTerritories.json`, `getExtenderFieldData.json`, `getAllStaffMembers.json`) suggest these back a **separate mobile/editor tool**, not the public website. Flag for follow-up if that tool is in scope for documentation.

---

## Open Questions / Flags

1. **Duplicate stories-landing paths**: both `stories_landing_page` (→ `news-archive`) and `stories_new` (→ `all-stories-archive`) exist. Confirm which is actually linked/live.
2. **`events` page-type view** appears to be an empty/stub container — confirm it's intentional before treating it as a real template.
3. **`contact-us` national fallback**: the `contact-info` include is commented out in `webengine/views/contact_us` for the no-location branch — confirm whether national contact pages are missing content intentionally.
4. **`modules/tags/schema` and `modules/tags/client-global-navigation`**: duplicate-looking copies of `modules/schema` / `modules/client-global-navigation` under a `tags/` path, while the `tag`/`tags_pages` page-type views are unmodified stubs. Unclear what wires them together.
5. **Scratch/test content left in the deployed views tree**: `blocks_test`, `api_test`, `gb_test`, `hero-content-test.json`, `gisele-test.json`, files with literal " copy" in the name. These sync to the live Zesty instance via `scripts/sync-to-zesty.js` just like real views — worth confirming they're not reachable/linked in production.
6. **`components/card`, `components/service-card`, `components/stat-group`** contain static placeholder markup; the actually-rendered cards are built by inline JS template strings in the owning module. Confirm whether these component files are still used anywhere (e.g. as an editor preview) or are stale.
7. **Multiple independent Tealium bootstrap implementations** (`loader`, `custom_head`, `404-page`, `global-analytics`/`.html`, `tealium-analytics`) — see custom-patterns.md for the consolidated flag.
8. Several `.json` endpoints (`find-event.json`, `find-story.json`, `paginated-locations.json`, `paginated-divisions.json`, `all-service-pages.json`, `all-informational-pages.json`, `get-stories-by-location.json`, `contact-us-cookie-fallbacks.json`, and the `datasets/mobile_editor/**` tree) were **not opened in this pass** — their purpose above is inferred from filenames only and should be verified before relying on it.
9. **`events` view corrected (2026-09-20):** an earlier version of this doc described the `events` page-type view as an empty/stub container. That was wrong — it's actually the `/events.json` data endpoint (see Ajax-JSON table). Flagging in case this incorrect description was copied elsewhere (e.g. release notes, onboarding notes) before this correction.
10. **CODA-2533 (`modules/upcoming-events` hang fix)** is Draft — pending review, implemented on branch `coda-2533` only, not yet QA'd/merged/deployed. Do not cite this fix as shipped in customer-facing release notes until a human confirms the merge.
