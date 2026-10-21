# Templates & Views

Status: Draft — pending review
Last generated: 2026-10-15 by zesty-ai:documentation (automated codebase scan of webengine/views on development; seeded from the 2026-09-25 agent-lab doc)

What each view renders, which content model it reads, and **where it is included**, so new work reuses existing pieces instead of duplicating them.

Evidence base: working tree of `development` at `13b5017`. Include sites come from grepping `webengine/views/**` for `{{include`; every row below was re-checked against the current tree. "Verified" means the file or include line was read; "inferred" means the name or surrounding code suggests it but nothing in the repo confirms it. Platform-owned paths (`webengine/views/z/`, `webengine/views/menu-config/`) are not in the repo and could not be read.

## How views are stored in this repository

| Topic | Fact | Evidence |
| --- | --- | --- |
| Location | One file per Zesty view under `webengine/views/`, named after the view path (folders = path segments). 268 files are tracked. | `git ls-files webengine/views` (verified) |
| Extensions | Page and snippet views have **no extension** (HTML/Parsley). Endpoint views end in `.json`. A few legacy files end in `.html`, `.scss` or `.md` (see Include graph notes). | file tree (verified) |
| Folders | `modules/` (section modules, 83 top-level files plus 2 under `modules/tags/` and 1 stray `.md`), `components/` (26), `-/block/` (24, Block Library), `api/` (3), `datasets/mobile_editor/` (31), `_zesty/rollbacks/` (2). | file tree (verified) |
| Block Library | `-/block/*.html` are inserted in rich-text fields with `{{block('/-/block/<name>.html?variant=...')}}`. No view in the repo calls `{{block(`, so blocks have no include site in code. | `CLAUDE.md` Architecture; grep for `block(` found no hits in `webengine/views` (verified) |
| `zesty.config.json` | Maps each local path (key) to a Zesty ZUID and view `type` (`templateset`, `pageset`, `snippet`, `ajax-json`, `block`, `404`). It also lists `styles` and `scripts`. It is **partly generated**: the deploy workflow commits new ZUID mappings back to the branch (`chore: map new Zesty resource ZUIDs [skip ci]`). **Do not hand-edit it** unless the task is specifically about mappings. | `CLAUDE.md:34-36,121`; `.github/workflows/zesty-deploy.yml` commit step; `zesty.config.json` (verified) |
| Config keys | Two key styles coexist: bare names (138 keys, e.g. `homepage`) and slash-prefixed paths (4,662 keys, e.g. `/get-events.json`). The sync script resolves both under `webengine/views/`. | `scripts/sync-to-zesty.js` `resolveLocalPath`; `zesty.config.json` (verified) |
| Platform-owned keys | 4,547 config keys point at `/z/...` (layouts, version-history cache) and `/menu-config/...` (menus). These files are not in the repo. | `zesty.config.json` key scan (verified) |
| Unmapped files | 17 non-block view files on disk have no config entry (listed under Include graph notes). `sync-to-zesty.js` skips extensionless unmapped views (type cannot be inferred), so they must be created in the Zesty manager and mapped. Unmapped files **with** an extension are auto-created as `ajax-json` on the next sync. | `scripts/sync-to-zesty.js:173-238` (verified) |
| Sync | Only `scripts/sync-to-zesty.js` moves local files to the instance. It excludes `views/z` and `views/menu-config`. Branch flow is ticket branch -> `development` -> `stage` -> `production`. | `scripts/sync-to-zesty.js:40`; `CLAUDE.md` Conventions (verified) |
| Not templates | `webengine/views/_zesty/rollbacks/views/*.json` (2 tracked files, rollback snapshots of `modules/hero` and `loader`) are platform snapshots, not views to edit. `z/pvl/**` is no longer tracked. | `git ls-files webengine/views/_zesty`; commits `d3b7372`, `daff8a8` (verified); what produces the snapshots is inferred |

Styles and scripts live outside `views/`: `webengine/styles/{common,components,modules}/` and `webengine/scripts/{common,data-layer,modules}/` (see `CLAUDE.md` Architecture).

## Global layout & head

| View | Purpose | Included by | Notes |
| --- | --- | --- | --- |
| `webengine/views/loader` | Site-wide wrapper around every page's `{{ current_view }}` (`loader:306`). Renders, in order: dev-only QA banner and "Edit Content" link (`loader:2`), Tealium data-layer bootstrap (`utag.view()`, `loader:33-227`), `components/header` or `components/header-dynamic` when `?navType=dynamic` (`loader:294-297`), `components/header-donate-modal` (`loader:300`), `<main>`, `components/footer` (`loader:312`), Microsoft Clarity (dev only, `loader:315`), Feathery embed for one hardcoded content ZUID (dev only, `loader:325`). | Platform layout (not in repo). How `loader` is attached to layouts is **unknown**. | Hardcoded ZUID check at `loader:325`. Large Tealium logic is duplicated in `custom_head` and `404-page`. |
| `webengine/views/custom_head` | Page `<head>`: SEO and Open Graph meta (OG image falls back to `globals.default_og_image`, `custom_head:39`), favicon, `prop-type-simplified` class toggle (`:83`), Tealium `utag.sync.js` (`:143`), `window.ServicesObserver` and `window.cookiesReady` (`:111-116`), then JSON-LD. Includes `modules/client-global-navigation` (`:106`), `modules/indexdb` (`:107`), `modules/external-links` (`:108`), `modules/schema` (`:217`). | Platform head hook (not in repo). Inferred from the name; unverified. | Hardcoded `set_zuid` check injects `clippings.custom_analytics_scripts` raw (`custom_head:213-214`). |
| `webengine/views/z/layouts/layouts.json`, `.../settings.json` | Platform layouts and global settings. `CLAUDE.md` says the Bootstrap theme is injected through `settings.json` via jsDelivr, pinned to a commit. | Platform | **Not in repo** (ignored via `.gitignore:13`; keys exist in `zesty.config.json`). Contents can only be checked in the Zesty manager. |
| `webengine/views/menu-config/*` | Platform menu definitions (3,144 config keys). | Platform | **Not in repo** (`.gitignore:14`). Check in the Zesty manager. |
| `webengine/views/404-page` | Styled 404 template (config type `404`). Includes `components/header` (`:224`), `modules/hero-full-404` (`:229`), `modules/services` (`:230`), `modules/faqs` (`:231`), `components/footer` (`:236`). Re-implements Tealium logic inline instead of using `loader`. | Platform (404 type) | Verified. |
| `webengine/views/404` | One line, `404 not found`. Not in `zesty.config.json`. | none | Purpose unknown; `404-page` is the mapped 404 view. Flagged. |
| `webengine/views/global-analytics`, `global-analytics.html`, `tealium-analytics`, `analytics.html` | Stand-alone Tealium bootstraps. `global-analytics*` are near-duplicates of each other; `tealium-analytics` prints `here is some code` plus a query param; `analytics.html` is 1 byte. | No include or fetch site found | Dead or duplicate (verified by grep). |

## Page-type templates

Model column: Zesty ties a pageset/templateset to a model in the manager; no schema file is in the repo. The model name below is **inferred from the view name**. Type comes from `zesty.config.json`.

### Org hierarchy

| View | Model (inferred) | Renders | Includes | Notes |
| --- | --- | --- | --- | --- |
| `webengine/views/homepage` (templateset) | homepage | Home | `hero`, `map`, `services`, `stats`, `news` (`homepage:1-5`) | Uses the full `news` module (search/filter), not `news-cards`. |
| `webengine/views/territories` | territories | Territory page | `hero`, `map`, `services`, `stats`, `news-cards`; `image-button-text` only if `image_button_text_title_left` is set (`territories:1-9`) | |
| `webengine/views/divisions` | divisions | Division page | `hero`, `map`, `services`, `stats`, `news-cards` (`divisions:1-5`) | Base 5-include layout. |
| `webengine/views/locations` | locations | Corps/location page | `hero`, `map-with-info`, `services`, `service-wy-landing`, `programs-schedule-landing`, `stats`, `news-cards`, `community-leaders` (`locations:10-22`) | 301s to `redirect_url` unless `?redirect=` is set (`:1-6`). When `page_layout` is `simplified`, skips `hero`, `services`, `service-wy-landing`, `programs-schedule-landing`, `stats` (`:9,14,19`). Uses `map-with-info`, not `map`. |
| `webengine/views/cities` | cities | City page | `hero-full-cities`, `zip-search` (`cities:1-2`) | `zip-search` lists locations where `find_in_set('{page.zuid}', city)` and plots a map with pins (`zip-search:69,256`). |
| `webengine/views/states` | states | State page | `hero-full-state`, `state-list` (`states:1-2`) | `state-list` lists cities with `find_in_set('{page.zuid}', state)` (`state-list:4`). |
| `webengine/views/country`, `properties_types`, `services_seed_content` | country, properties_types, services_seed_content | Parsley `autolayout()` stub (default code) | none | Mapped as pagesets; not customised. |
| `webengine/views/metro_area_command`, `services_types`, `tag`, `tags_pages` | metro area command, services types, tag, tags pages | Parsley `autolayout()` stub | none | **Not in `zesty.config.json`**; scaffolding only. |

### Services, stories, events

| View | Model (inferred) | Renders | Includes | Notes |
| --- | --- | --- | --- | --- |
| `webengine/views/services` | services | Service page | `hero-full-donate`, `benefits-perks`, `service-wy`, `programs-schedule`, `donate`, `stats-modules`, `become-a-member`, `services` (`services:1-23`) | `news-cards` is wrapped in `(** **)` (`services:22`), a Parsley comment, so it does **not** run. `page_intro` is rendered inline (`:9-13`). |
| `webengine/views/service_area` | service_area | Service-area page | `hero-full-service-area`, `services-service-area`, `service-area-body-details` (`service_area:1-3`) | `modules/service-area-form` is not included here or anywhere. |
| `webengine/views/stories` | stories | Story detail | `components/socials-share` (`stories:78`), `modules/recent-stories` (`stories:430`) | No other includes. 301s to `external_url` if set (`:44-45`). Branches on `page_layout`: `Image Landscape`, `Image Landscape No Sidebar`, `Image Thumbnail`, default (`:60,84,190,253`). |
| `webengine/views/stories_landing_page` | stories_landing_page | Stories landing | `news-archive` (`:1`) | Mapped pageset. |
| `webengine/views/stories_new` (templateset) | n/a | Alternate stories archive | `all-stories-archive` (`:3`) | Mapped. Which of `stories_landing_page` / `stories_new` is live is **unknown**. |
| `webengine/views/news_archive` | n/a | Intended news archive | `modules/news-archive-search` (`:1`) | **Broken include**: that module does not exist (the file is `components/news-archive-search`). View is also unmapped. |
| `webengine/views/events` | events | Event detail | `components/socials-share` (`events:18`), `modules/upcoming-events` (`events:195`) | Branches on `page_layout`: `Image Landscape`, `Image Thumbnail`, `No Image`, `Blank` (`events:23-139`). |
| `webengine/views/events_landing_pages` | events_landing_pages | Events landing | `hero-full-events`, `upcoming-events` (`:1-2`) | |
| `webengine/views/tags` | tags (inferred) | Tag archive | `modules/tags-archive` (`:1`) | **Added since the old doc** (commit `cf09058`). Unmapped, so sync will not create it. |

### Informational, about, contact, leadership, volunteer

| View | Model (inferred) | Renders | Includes | Notes |
| --- | --- | --- | --- | --- |
| `webengine/views/about_us` | about_us | About page | `hero-full`, `image-button-text-full`, `stats`, `local-needs`, `leadership-list` (`about_us:1-5`) | |
| `webengine/views/contact_us` | contact_us | Contact page | `contact-us`; if `this.location`: `map-with-info-contact`, `contact-us-officers`; else `map-contact`; always `faqs`, `contact-form` (`contact_us:2-11`) | `contact-info` is inside `(** **)` (`:7`), so it does not run. |
| `webengine/views/leadership_landing_page` | leadership_landing_page | Leadership landing | `hero-full-leadership`, `leadership-list` (`:4-5`) | |
| `webengine/views/informational_pages` | informational_pages | Informational page | `this.autolayout(auto)` when `template_layout == 1`; else `modules/generic`, or 301 to `external_link` (`informational_pages:1-10`) | |
| `webengine/views/volunteer_pages` | volunteer_pages | Volunteer page | Same branch as `informational_pages`; `modules/generic` (`:7`) | |
| `webengine/views/informational_pages_dev` | informational_pages_dev | Prints `{{this.meta_title}}` only | none | Scratch copy; **not** an `autolayout()` stub. |
| `webengine/views/location_finder` (templateset) | n/a | Location finder | `modules/location-finder` (`:1`) | |
| `webengine/views/contact-form` | n/a | Static "Contact Us" shell | none | **Orphaned**: `contact_us` includes `modules/contact-form`, not this file. |
| `webengine/views/corps` | n/a | Empty (0 bytes) | none | Unmapped; flagged. |

### Campaign micro-sites

| View | Includes |
| --- | --- |
| `webengine/views/angel_tree_campaign` (templateset) | `hero-full-angel-tree`, `angel-tree-wy`, `map-angel-tree`, `angel-tree-wy-2` (`:1-4`) |
| `webengine/views/stuff_the_bus` (templateset) | `hero-full-stuff-the-bus`, `stuff-the-bus-wy`, `map-stuff-the-bus`, `stuff-the-bus-wy-2` (`:1-4`) |

### Admin tools and test views

| View | Notes |
| --- | --- |
| `webengine/views/csv_generator` | Admin HTML page with filters; shows `/generate-csv.json` in its UI and calls `generate-csv`. Unmapped. |
| `webengine/views/csvgenerator.html` | 3,807-line, 113 KB standalone page with the same name idea; no caller found. Mapped as `ajax-json`. |
| `webengine/views/blocks_test` | `this.autolayout(auto)`. Unmapped test view. |
| `webengine/views/gb_test` | Contains `some change` / `This is some test`. Mapped snippet. |
| `webengine/views/api_test` | Services JSON by `zuid` / `model_zuid`. Mapped `ajax-json`; no caller. |
| `webengine/views/utility-scripts` | 1 byte. Unmapped. `modules/location-finder:77` includes `modules/utility-scripts`, a path that does not exist. |
| `webengine/views/national-legacy-contact-code` | Legacy contact-page CSS/JS bundle. Included by `modules/contact-form` (`:7`, `:29`). |
| `webengine/views/angel-tree-script` | 446-line client script that queries QuickBase and geocodes. No include or fetch site found (orphaned). |
| `webengine/views/legacy-styles.scss` | 0 bytes; mapped as `ajax-json`; no caller. |

## Modules

All 83 top-level files in `webengine/views/modules/`. "Included by" is from `{{include` grep (verified). `(none)` means no include site in `webengine/views`; the module may still be assigned in the Zesty manager (unknown). Purpose: only items marked * were opened this pass for purpose; others are inferred from name and field names. `[FPO]` marks static placeholder markup seen in the file.

| Module | Purpose | Included by | Variants / parameters |
| --- | --- | --- | --- |
| `advisory-board` | Advisory board list (static `Title` placeholders) | `modules/leadership` | n/a |
| `all-stories-archive` | Stories archive; fetches `stories.json` (`show=16`) | `stories_new` | includes `components/news-archive-search` |
| `angel-tree-wy` | Renders `this.content` | `angel_tree_campaign` | pair with `-2` |
| `angel-tree-wy-2` | Same pattern | `angel_tree_campaign` | |
| `become-a-member` | CTA from `image_button_text_full_bleed_*` fields | `services`, `modules/sponsorship` | |
| `benefits-perks` | "How We Serve" info cards | `services`, `modules/employment` | |
| `client-global-navigation` | Org-context and cookie state machine (2,969 lines); calls `data_code`, `get-volunteer-page`, `get-informational-page`, `contact-us-cookie-fallbacks` | `custom_head:106` | `find-event` / `find-story` calls are commented out in JS (`:2479`, `:2515`) |
| `community-leaders` | Staff cards; fetches `staff.json` | `locations`, `modules/leadership` | |
| `contact-form` | Wraps the legacy contact code | `contact_us` | includes `national-legacy-contact-code` |
| `contact-info` | National hours and contact block | **commented out** in `contact_us:7` | (none live) |
| `contact-us` | Contact hero and body | `contact_us` | falls back to `clippings.hero_fallback_image` |
| `contact-us-officers` | Officers list for a location | `contact_us` | |
| `corporate-partners` | Partners block | `modules/sponsorship` | |
| `donate` | CTA from `image_button_text_*_left` fields | `services` | |
| `employment` | Composite: `hero-full`, `job-positions`, `image-button-text`, `benefits-perks`, `video-module`, `testimonials`, `text-block` | (none) | |
| `external-links` | Opens off-host links in a new tab | `custom_head:108` | |
| `faqs` | FAQ accordion grouped by hardcoded `topic` values | `contact_us`, `404-page` | |
| `featured-stories` | Empty (0 bytes) | (none) | stub |
| `generic` | `hero-full` + `generic-info` | `informational_pages`, `volunteer_pages` | |
| `generic-info` | Renders `this.body` | `modules/generic` | |
| `global-navigation` | Older navigation logic (`@location_model`, `@location_name`) | (none) | likely superseded by `client-global-navigation` (inferred) |
| `hero` | Carousel; fetches `/-/gql/matrix_hero_sliders.json` (`:533`), `/-/instant/<zuid>.json` for primary/secondary cards (`:212-401`), `model-info.json` (`:211`) | `homepage`, `territories`, `divisions`, `locations` | Instant and GQL endpoints must be enabled in the instance's developer settings (PLATFORM QUESTION, see Open Questions) |
| `hero-full` | Page hero; falls back to `globals.default_og_image` | `about_us`, `modules/generic`, `employment`, `leadership`, `sponsorship`, `volunteer` | field names differ across `hero-full*` variants |
| `hero-full-404` | 404 hero | `404-page` | uses `hero_fallback_image` and `default_og_image` |
| `hero-full-angel-tree` | Campaign hero | `angel_tree_campaign` | |
| `hero-full-cities` | City hero | `cities` | uses `hero_fallback_image` and `default_og_image` |
| `hero-full-donate` | Service-page hero | `services` | |
| `hero-full-events` | Events hero | `events_landing_pages` | |
| `hero-full-leadership` | Leadership hero | `leadership_landing_page` | |
| `hero-full-service-area` | Service-area hero | `service_area` | |
| `hero-full-state` | State hero | `states` | uses `hero_fallback_image` and `default_og_image` |
| `hero-full-stuff-the-bus` | Campaign hero | `stuff_the_bus` | |
| `image-button-text` | Image + title + description + CTA | `territories`, `modules/employment`, `leadership`, `volunteer` | `_left` field suffix |
| `image-button-text-full` | Full-width variant | `about_us` | |
| `image-button-text-reverse` | Mirrored variant | `modules/volunteer` | |
| `indexdb` | `ServicesObserver` and IndexedDB `ServicesDB` cache; calls `get-services-*`, `locations.json` | `custom_head:107` | |
| `info-cards-stats` | Volunteer stats (static `[FPO]` numbers) | `modules/volunteer` | |
| `job-positions` | Job listings (static `[FPO]` titles) | `modules/employment`, `modules/volunteer` | |
| `leadership` | Composite: `hero-full`, `community-leaders`, `advisory-board`, `image-button-text` | (none) | |
| `leadership-list` | Leadership grid; fetches `staff.json`, `staff_role_types` | `about_us`, `leadership_landing_page` | |
| `leadership-parent` | Leadership by division/territory; fetches `leadership-parent.json` | (none) | |
| `local-needs` | Local needs cards (`local_need_*_1..n` fields) | `about_us` | |
| `location-finder` | Location finder shell | `location_finder` | includes `components/current-location-card`, `location-finder-script`, `modules/utility-scripts` (path does not exist) |
| `location-finder-script` | Search, filter, pagination script (1,583 lines); calls `services.json`, `service-types.json`, `location-finder.json` | `modules/location-finder:76` | |
| `map` | "Find a Location" CTA and Google map | `homepage`, `territories`, `divisions`, `modules/volunteer` | |
| `map-angel-tree` | Angel Tree map with QuickBase data (1,116 lines) | `angel_tree_campaign` | contains a hardcoded QuickBase credential (see flags) |
| `map-contact` | Contact map for national/no-location pages | `contact_us` | |
| `map-stuff-the-bus` | Stuff the Bus map with QuickBase data (909 lines) | `stuff_the_bus` | contains a hardcoded QuickBase credential (see flags) |
| `map-with-info` | Location map + info panel | `locations` | includes `components/map-contact-information` |
| `map-with-info-contact` | Contact-page variant | `contact_us` | includes `components/map-contact-information-pointer` |
| `news` | News search/filter/swiper; `stories.json`, `service-types.json` | `homepage` | includes `components/news-filter` |
| `news-archive` | Stories archive; `stories.json?show=15` | `stories_landing_page` | includes `components/news-archive-search` |
| `news-cards` | Carousel variant | `territories`, `divisions`, `locations`, `modules/volunteer`; **commented out** in `services:22` | |
| `partnership-opportunities` | Placeholder partnership CTA | `modules/sponsorship` | |
| `programs` | Static shelter-programs mockup | (none) | not `programs-schedule` |
| `programs-schedule` | Program schedule accordion | `services` | |
| `programs-schedule-landing` | Landing variant | `locations` | |
| `recent-stories` | Recent stories list; fetches `stories.json?show=16`, drops the current story by ZUID, shows up to 15 | `stories:430` | |
| `schema` | JSON-LD (214 lines) | `custom_head:217` | |
| `service-area-body-details` | Contact + body for service areas | `service_area` | includes `components/service-area-contact-detail`, `service-area-body` |
| `service-area-form` | Renders `this.form_embed` | (none) | orphaned |
| `service-program-schedule` | Static mockup | (none) | orphaned |
| `services` | Services carousel; filled client-side via `ServicesObserver` | `homepage`, `territories`, `divisions`, `locations`, `services`, `404-page` | |
| `services-national-wysiwyg` | Empty (0 bytes) | (none) | stub |
| `services-national-wysiwyg-bottom` | Empty (0 bytes) | (none) | stub |
| `services-service-area` | Service-area service cards | `service_area` | |
| `service-wy` | Service body content | `services` | |
| `service-wy-landing` | Landing variant (`featured_article`) | `locations` | |
| `sponsorship` | Composite: `hero-full`, `what-we-do`, `partnership-opportunities`, `corporate-partners`, `become-a-member` | (none) | |
| `state-list` | Cities in the current state | `states` | |
| `stats` | Stats carousel; `stats-info.json`, `model-info.json` | `homepage`, `territories`, `divisions`, `locations`, `about_us` | |
| `stats-modules` | Service stats (`stat_title_*` fields) | `services` | |
| `stats-with-stat-group` | Stats using `components/stat-group` | (none) | orphaned |
| `stuff-the-bus-wy` | Renders `this.content` | `stuff_the_bus` | |
| `stuff-the-bus-wy-2` | Same pattern | `stuff_the_bus` | |
| `tags-archive` | Tag archive; fetches `stories.json`, `service-types.json`, `datasets/mobile_editor/content_list/{tags_stories,locations,divisions,territories}.json` | `tags:1` | new since old doc; unmapped |
| `testimonials` | Placeholder testimonials | `modules/employment` | |
| `text-block` | Equal-opportunity text | `modules/employment` | |
| `upcoming-events` | Lazy-loaded events; `get-events.json` and `/-/instant/` | `events`, `events_landing_pages` | rewritten 2026-10-02..05 |
| `video-module` | Placeholder video | `modules/employment` | |
| `volunteer` | Composite of 7 modules | (none) | |
| `what-we-do` | Placeholder block | `modules/sponsorship` | |
| `zip-search` | City-page locations and map pins | `cities` | |

Other files under `modules/`:

| File | Notes |
| --- | --- |
| `modules/tags/client-global-navigation` | 2,557-line copy of `modules/client-global-navigation` (differs by ~1,700 diff lines). No include site. Added in `cf09058`. Mapped as snippet. |
| `modules/tags/schema` | 214-line copy of `modules/schema` (differs in about 70 diff lines). No include site. Mapped as snippet. |
| `modules/client-global-navigation-flow.md` | 114-line Markdown explainer, not a template. Mapped as `ajax-json`, so it is a live resource. |

## Components / block library

### Components (`webengine/views/components/`, all 26)

| Component | Purpose | Callers | Variants |
| --- | --- | --- | --- |
| `header` | Main nav (1,507 lines); calls `get-informational-page-links`, `/-/instant/` | `loader:297`, `404-page:224` | includes `nav-mobile`, `header-find-help-modal`, `header-search-modal`, `header-donate-drawer-modal` (`:617-620`) |
| `header-dynamic` | Alternate nav (1,225 lines) | `loader:295` when `?navType=dynamic` | includes `nav-mobile-dynamic` |
| `footer` | Site footer; calls `model-info.json` | `loader:312`, `404-page:236` | includes `news-letter-modal` |
| `nav-mobile`, `nav-mobile-dynamic` | Mobile nav | `header`, `header-dynamic` | |
| `header-find-help-modal`, `header-search-modal`, `header-donate-drawer-modal` | Header modals | `header`, `header-dynamic` | |
| `header-donate-modal` | Donate modal | `loader:300` | |
| `news-letter-modal` | Newsletter modal | `footer:727` | |
| `current-location-card` | Current-location card | `modules/location-finder:6` | |
| `map-contact-information` | Location contact panel | `modules/map-with-info:21` | |
| `map-contact-information-pointer` | Pointer variant | `modules/map-with-info-contact:23` | |
| `service-area-body`, `service-area-contact-detail` | Service-area blocks | `modules/service-area-body-details` | |
| `news-filter` | News filter UI | `modules/news:127` | |
| `news-archive-search` | Archive search | `modules/all-stories-archive`, `modules/news-archive` | includes `news-archive-list` |
| `news-archive-list` | Results list | `components/news-archive-search:81` | |
| `tags-archive-search` | Tag search UI | `modules/tags-archive:1` | includes `tags-archive-list`; unmapped |
| `tags-archive-list` | Results list | `components/tags-archive-search:89` | unmapped |
| `socials-share` | Share buttons | `stories:78`, `events:18` | mapped snippet; extensionless |
| `stat-group` | Static stat card | `modules/stats-with-stat-group` (itself orphaned) | placeholder |
| `card`, `service-card`, `biograph-card`, `location-finder-results` | Static example markup | none (names appear only as CSS classes or inline JS templates) | **Orphaned** |

### Block Library (`webengine/views/-/block/`, 24 files)

All mapped as type `block`; none has a `{{block(` caller in the repo. Names: `activity_boxes`, `annual_reports_blocks`, `base_card`, `contact_us_block`, `cta_button`, `dynamic_stories_carousel`, `fundraising_thermometer_block`, `general_accordion`, `generic_image_text_button_block`, `greatest_need`, `hero_full`, `info_block`, `mobile_desktop_location_card_block`, `mobile_desktop_videos`, `our_vision`, `profile_card_block`, `service_selector`, `side_by_side_hero_image`, `staff_and_leadership`, `stats_block`, `stories_carousel`, `sustainability_in_action`, `theater_space_block`, `way_to_give_block` (all `.html`). Usage lives in CMS rich-text fields, which cannot be checked from the repo.

## Data / JSON endpoint views

Consumers are `fetch` sites found in `webengine/views/**` and `webengine/scripts/**`. `fetchInformation()` in `client-global-navigation:2553-2560` builds `https://<domain>/<name>.json?zuid=...`. Query params are the ones read with `request.queryParam` / `get_var`.

| View | URL path | Consumers | Shape notes |
| --- | --- | --- | --- |
| `stories.json` | `/stories.json` | `news`, `news-archive`, `news-cards`, `all-stories-archive`, `recent-stories`, `tags-archive` | params `show`, `limit`, `name`, `most-recent`, `related-service`, `date`, `model`, `location` |
| `service-types.json` | `/service-types.json` | `news*`, `recent-stories`, `tags-archive`, `location-finder-script`, `components/map-contact-information`, `scripts/map.js` | optional `zuid` |
| `services.json` | `/services.json` | `location-finder-script`, `components/map-contact-information(-pointer)`, `scripts/map.js` | params `location`, `serviceTypes`. This is an endpoint, not a page view. |
| `location-finder.json` | `/location-finder.json` | `components/header-find-help-modal`, `location-finder-script`, `events`, `stories` | param `query` (a location ZUID) |
| `staff.json` | `/staff.json` | `community-leaders`, `leadership-list` | params `property`, `model`, `limit` |
| `staff_role_types.json` | `/staff_role_types.json` | `community-leaders`, `leadership-list` | |
| `stats-info.json` | `/stats-info.json` | `modules/stats` | params `zuid`, `page-model`, `parent-division`, `parent-territory` |
| `model-info.json` | `/model-info.json` | `hero`, `map`, `map-contact`, `stats`, `events`, `header`, `header-dynamic`, `footer`, one block | param `zuid` |
| `get-events.json` | `/get-events.json` | `modules/upcoming-events:101` | params `field` (`property`/`divisions`/`territories`/`any`), `z1`..`z5`; returns future events, up to 100 (`get-events.json:72`) |
| `get-services-territories`, `-divisions`, `-locations`, `-national` | `/get-services-*.json` | `modules/indexdb` | param `zuid` (and `model_zuid` for `api_test`) |
| `get-informational-page-links` | `/get-informational-page-links.json` | `header`, `header-dynamic` | params `zuid`, `navParent` |
| `get-informational-page.json` | same | `client-global-navigation:2741` | param `zuid` |
| `get-volunteer-page` | `/get-volunteer-page.json` | `client-global-navigation:2581` | params `zuid`, `model`; hardcoded fallback page ZUID |
| `data_code` | `/data_code.json` | `client-global-navigation:2546,2601` | params `zuid`, `model` |
| `contact-us-cookie-fallbacks.json` | same | `client-global-navigation:463` | params `zuid`, `model` |
| `leadership-parent.json` | same | `modules/leadership-parent` (orphaned) | params `division`, `territory` |
| `locations.json` | `/locations.json` | `indexdb`, `scripts/map.js`, `angel-tree-script` | Body is `{{include <media URL>/locations.json}}` (`locations.json:1`): a file written by `scripts/locations-endpoint-sync` (separate service). |
| `generate-csv` | `/generate-csv` (mapped without `.json`) | `csv_generator`, `csvgenerator.html` | params per model flag, `zuid`, `divisionzuid`, `locationzuid`, `page`, `page_stride`, `per_page` |
| `api/property-type.json` | `/api/property-type.json` | no caller found | param `locationZUID` |
| `api/territory-stories.json` | `/api/territory-stories.json` | no caller found | param `territory` |
| `api/new.json` | `/api/new.json` | none | empty (0 lines) |
| `datasets/mobile_editor/**` (31 files) | `/datasets/mobile_editor/...` | only `tags-archive` calls 4 of them (`content_list/{tags_stories,locations,divisions,territories}.json`) | Names suggest a separate mobile/editor tool (inferred). `content_list/tags_stories.json` is new and unmapped. |

Endpoints with no consumer found in the repo (callers may be external or in platform content): `models-info.json`, `services-info.json`, `services-offered`, `service-catalog.json`, `service-areas.json` (only a CSS mention), `paginated-locations.json`, `paginated-divisions.json`, `all-service-pages.json`, `all-informational-pages.json`, `get-stories-by-location.json`, `thrift-store-locations.json`, `about-us-json-to-csv.json`, `program_schedule.json`, `hero-content.json`, `find-event.json`, `find-story.json` (the only calls are commented out in JS), `code`, `code.json`, `angel-tree-data.json` (910 KB data dump), `angel-tree-dummy-data.json` (402 KB).

## Include graph notes

**Orphaned views (no include site in `webengine/views`)**

| Kind | Items |
| --- | --- |
| Modules | `employment`, `featured-stories`, `global-navigation`, `leadership`, `leadership-parent`, `programs`, `service-area-form`, `service-program-schedule`, `services-national-wysiwyg`, `services-national-wysiwyg-bottom`, `sponsorship`, `stats-with-stat-group`, `volunteer`; `tags/schema`, `tags/client-global-navigation`; `client-global-navigation-flow.md` |
| Only reachable through an orphan | `advisory-board`/`community-leaders` via `leadership` (community-leaders also via `locations`); `job-positions`, `video-module`, `testimonials`, `text-block` via `employment`; `what-we-do`, `partnership-opportunities`, `corporate-partners` via `sponsorship`; `info-cards-stats`, `image-button-text-reverse` via `volunteer`; `components/stat-group` via `stats-with-stat-group` |
| Components | `card`, `service-card`, `biograph-card`, `location-finder-results` |
| Root views | `contact-form`, `corps`, `angel-tree-script`, `analytics.html`, `global-analytics`, `global-analytics.html`, `tealium-analytics`, `legacy-styles.scss`, `csvgenerator.html` |
| Reason | `employment`, `leadership`, `sponsorship`, `volunteer` look like page layouts that may be selected in the manager or through `autolayout()`; unverified |

**Commented-out includes** (remember: Parsley inside an HTML comment still runs; `(** **)` does not)

| Site | Syntax | Effect |
| --- | --- | --- |
| `contact_us:7` `modules/contact-info` | `(** **)` | Does not run on the no-location contact branch. |
| `services:22` `modules/news-cards` | `(** **)` | Does not run on service pages. |
| `client-global-navigation:2479,2515` `find-event` / `find-story` | JS `//` | Not called. |

No `{{include` inside an HTML `<!-- -->` comment was found.

**Broken include paths**

| Site | Target | Reality |
| --- | --- | --- |
| `news_archive:1` | `modules/news-archive-search` | No such module; the file is `components/news-archive-search`. |
| `modules/location-finder:77` | `modules/utility-scripts` | No such module; `utility-scripts` is a root view and is 1 byte. |

**Duplicates and test files**

| File | Notes |
| --- | --- |
| `get-informational-page copy.json`, `get-informational-page-links copy` | Both are 1 byte (effectively empty) yet mapped in `zesty.config.json` (`ajax-json`, `snippet`), so they exist as live resources. |
| `code` / `code.json`, `global-analytics` / `global-analytics.html`, `csv_generator` / `csvgenerator.html`, `tag` / `tags_pages` | Near-duplicate pairs. |
| `modules/tags/*` | Copies of `modules/schema` and `modules/client-global-navigation`; no include site. |
| `api_test`, `blocks_test`, `gb_test`, `gisele-test.json`, `hero-content-test.json`, `datasets/mobile_editor/test_query.json`, `angel-tree-dummy-data.json` | Test or scratch views. `gisele-test.json`, `hero-content-test.json` and `api_test` are mapped and synced like real views. |

**Unmapped view files (17 non-block)**: `404`, `blocks_test`, `components/tags-archive-list`, `components/tags-archive-search`, `corps`, `csv_generator`, `datasets/mobile_editor/content_list/tags_stories.json`, `global-analytics`, `metro_area_command`, `modules/tags-archive`, `news_archive`, `services_types`, `tag`, `tags`, `tags_pages`, `tealium-analytics`, `utility-scripts`. The tags feature (`tags`, `modules/tags-archive`, two tags components, `tags_stories.json`) is the newest work and is mostly unmapped; extensionless ones will be skipped by the sync script until created in the manager.

## Open Questions / Flags

1. **Hardcoded QuickBase credentials (security).** `angel-tree-script`, `modules/map-angel-tree` and `modules/map-stuff-the-bus` contain a QuickBase `QB-USER-TOKEN` string in client-side code (verified by grep; value deliberately not reproduced here). Rotate and move server-side or behind a proxy. Recommendation, not verified live.
2. **Global layout not reviewable.** `webengine/views/z/` and `menu-config/` are not in the repo. Zesty manager check needed for: which snippet is the head and which layout wraps `loader`, theme pin in `z/layouts/settings.json`, menu contents. PLATFORM QUESTION (Zesty): how `loader` and `custom_head` are bound.
3. **Which stories archive is live:** `stories_landing_page` (-> `news-archive`) or `stories_new` (-> `all-stories-archive`)? Both mapped.
4. **Tags feature deploy state.** `tags`, `modules/tags-archive` and two components are unmapped. Confirm they exist in the manager. Decide whether `modules/tags/*` copies are needed (no include site).
5. **`news_archive` and `location-finder` broken includes** (see Include graph notes). Decide fix or removal.
6. **`service-area-form`, `programs`, `service-program-schedule`, `featured-stories`, `services-national-wysiwyg*`** have no callers. Wire in or remove.
7. **`get-volunteer-page` fallback.** A hardcoded fallback ZUID is used; whether it is a national or a regional page needs a check of the item in the instance.
8. **Empty or one-byte mapped views** (`analytics.html`, `legacy-styles.scss`, two ` copy` files, `api/new.json`) are live resources in the instance. Confirm they can be deleted.
9. **Hero endpoints.** `modules/hero` needs the instance's `/-/instant/` and `/-/gql/` features. PLATFORM QUESTION (Zesty): confirm both are enabled on every environment.
10. **Model names in Page-type tables are inferred** from view names. `docs/content-models.md` (not present in this working tree) would be the place to confirm.
11. **Purpose of modules not marked as opened** is inferred from names and field references. Re-verify before relying on it.
12. **`docs/` is listed in `.gitignore`**, so this file will not be committed unless that rule changes. Confirm intent.
13. **Old-doc claims that the code contradicts** (code wins): `informational_pages_dev` is an `autolayout()` stub (it prints `meta_title`); `hero-full-state/-cities/-404` do not use `default_og_image` (they reference both it and `hero_fallback_image`); `services.json` is a page view (it is an endpoint); the ` copy` files are duplicates with content (they are 1 byte each).

## Review status

Not yet reviewed. Draft — pending review. Seeded from the 2026-09-25 agent-lab doc; no sign-off from that doc carries over because the content was re-derived from `development` at `13b5017`.
