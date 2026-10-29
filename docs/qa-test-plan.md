# QA Test Plan

Status: Draft — pending review
Last generated: 2026-10-15 by zesty-ai:documentation (code-derived from webengine/views on development; seeded from the 2026-09-25 agent-lab plan; not yet executed against a live environment)

The business-critical checks for this project. Agents (`zesty-ai:qa`, `zesty-ai:reality-check`) report results against these IDs using `PASS` / `FAIL` / `BLOCKED` / `NOT RUN`, as defined in the zesty-ai `standards/qa-and-release.md`. There is no test runner in this repo (`CLAUDE.md`, "Running and testing"); this is a manual checklist worked through in a real browser.

Evidence labels: a statement with a `path` or `path:line` is **verified** in the working tree on `development`. `(inferred)` means derived from code but not directly observable without running the site. `(unknown)` means it cannot be settled from the repo. Nothing in this plan has been run against a live environment, so every expected result is code-derived until a first pass confirms it.

This plan replaces the old plan's cross-references to `docs/content-models.md`, `docs/templates.md`, and `docs/custom-patterns.md`. Those files are not in this working tree (`docs/` holds only `agents.md` and `project-tracking.md` at the time of writing), so they are not linked.

## How to use this plan

- **Single change:** run §1 (cross-cutting) plus every item the change touches, plus the developer's QA targets.
- **Stage re-verify or broad pass:** run the whole plan, except items marked *Excluded*.
- **Production:** only the read-only checks in §7, run by a human-initiated smoke test. Never submit forms, click donate links through to external sites, or change cookies on production.
- If the plan is wrong against what's live (a page moved, a field renamed), report a documentation issue, not a defect.
- Record results as `<ID>: PASS | FAIL | BLOCKED | NOT RUN` with the environment and URL. A `PASS` needs a check you ran and an output you read.
- To add a case, append a row with the next free ID in its group; never renumber.

## Environments

| Environment | Kind | URL | Access |
| --- | --- | --- | --- |
| Branch preview | preview | `https://8hxvw8tw-{branch}.webengine.zesty.io/` | Zesty GitHub integration builds it from the pushed branch (`CLAUDE.md`, "Environments and release"); ticket branches are `coda-<ID>`. Password-protected: append a `zpw` query value taken from `QA_ACCESS_QUERY` in the gitignored `.env`. Never write the value in a report. Confirm with the user the branch is pushed before testing. |
| development | preview | `https://8hxvw8tw-development.webengine.zesty.io/` | Same `zpw` access. GitHub-integration preview of the `development` branch. |
| Staging (instance dev version) | staging | `https://8hxvw8tw-dev.webengine.zesty.io/` | Same `zpw` access. Updated by a push to `stage` running `zesty-deploy.yml`. |
| Production | production | `https://www.salvationarmyusa.org/` | Public, look-only. |

On a 403 from a preview or staging URL, clear cache and cookies (fresh browser context) and retry once before reporting (`CLAUDE.md`, "Running and testing"). Agents never trigger `zesty-deploy.yml`.

## 1. Cross-cutting checks (every page)

Run every X- check on every page tested in §2, regardless of which page-level case you are on.

| ID | Check | How | Breakpoints |
| --- | --- | --- | --- |
| X-01 | No JS errors on load. Expected noise, not errors: `console.log` output such as `utag_data` and QuickBase "Returned ... Data" (`modules/client-global-navigation:514`, `modules/map-angel-tree:739`). | Browser console | all |
| X-02 | Header, navigation, and footer render and their links resolve. | Click through | mobile, tablet, desktop |
| X-03 | Images have meaningful `alt`; heading order is valid. Known candidate finding: `modules/hero-full-cities` hard-codes `alt="Featured Article"`. | Snapshot / accessibility tree | desktop |
| X-04 | Org-hierarchy context is correct for the page: header text, footer, contact-us content, and donate URLs match the page's level (national, territory, division, location, state, city). Driven by the cookie state machine in `modules/client-global-navigation` (cases at lines 601 homepage, 639 territories, 676 divisions, 721 locations, 1821 informational pages, 2360 states, 2407 cities, 2459 tags). Tags pages must keep the persisted location and only default to National when none is stored (`:2459-2465`). A city or state whose territory is unset must fall back to National. | Inspect header location name, cookies (`location_zuid`, `location_model`, `location_name`), donate links | desktop, mobile |
| X-05 | Responsive layout holds: nav collapse, hero layout, card grids, accordions, maps. | Resize | mobile, tablet, desktop |
| X-06 | Tealium: `utag.view` fires with a populated payload. Implemented independently in `loader:227`, `global-analytics:26`, and `404-page:160`; `custom_head:143` loads `utag.sync.js`. The 404 page must send `page_errorPage: 'true'` (`404-page:132`); the other pages send `'false'`. | Network and `utag_data` | desktop |
| X-07 | Off-host `http(s)` links get `target="_blank"` and `rel` containing `noopener noreferrer` (`modules/external-links:27-36`, included at `custom_head:108`), including links injected client-side. `mailto:` and `tel:` links are not altered (carried over from the old plan, `getExternalUrl` not re-read in this pass). | Inspect link attributes | desktop |
| X-08 | Footer address matches the page's org level. With `location_city`, `location_state`, and `location_address` cookies set it reads `address, City, State ZIP | 1-800-SAL-ARMY |`; otherwise the national fallback `615 Slaters Lane, Alexandria, Virginia 22314 | 1-800-SAL-ARMY |` (`components/footer:1081-1107`, rendered into `.footer__address` at `:411` and `:683`). It must not bleed a stale location onto nested informational pages (CODA-2541 fixes: commits `2ca30c8`, `544891b`, `8637345`). | Read the footer text after load; compare to the page's location | desktop, mobile |
| X-09 | Environment-conditional chrome is correct. On the instance dev version (`instance.env == 'dev'`) the loader adds "Submit a QA Ticket" and "Edit Content" buttons (`loader:2-27`), a Clarity script (`loader:315`), and an extra Feathery form on the homepage (`loader:325`). None of these may appear on production. | Visual check, page source | desktop |

## 2. Page-level test cases

Default Environments for a row is `preview, stage`. Rows marked `production (smoke)` are also in the §7 subset.

### Org hierarchy pages

| ID | Page (path) | Template | Steps | Expected | Environments |
| --- | --- | --- | --- | --- | --- |
| PG-01 | Any territory page | `territories` | Load a territory page. Repeat for a territory with `image_button_text_title_left` set and one without. Run X-04. | `hero`, `map`, `services`, `stats`, `news-cards` render (`territories:1-5`). `image-button-text` renders only when `image_button_text_title_left` is non-empty (`territories:7-9`). Org context is that territory. | preview, stage, production (smoke) |
| PG-02 | Any division page | `divisions` | Load a division page. Run X-04. | `hero`, `map`, `services`, `stats`, `news-cards` render (`divisions:1-5`). Org context is that division. | preview, stage |
| PG-03 | Any location page (default layout) | `locations` | Load a location page with no `page_layout` override and no `redirect_url`. Run X-04 and X-08. | Renders `hero`, `map-with-info`, `services`, `service-wy-landing`, `programs-schedule-landing`, `stats`, `news-cards`, `community-leaders` (`locations:10-22`). Org context and footer address are that location's. | preview, stage, production (smoke) |
| PG-04 | A location with `page_layout` = `simplified` | `locations` | Load it. | Only `map-with-info`, `news-cards`, `community-leaders` render; hero, services, service-wy-landing, programs-schedule-landing, and stats are absent (`locations:9-19`). | preview, stage |
| PG-05 | A location with `redirect_url` set | `locations` | Load it, then load it with `?redirect=` set. | A 301 to `redirect_url`; with the `redirect` query param present the location renders instead of redirecting (`locations:1-8`). (inferred for the param semantics from the `$redirectOveride` logic; confirm on a live page.) | preview, stage |
| PG-06 | `/` | `homepage` | Load the homepage. Run X-04 (national). | `hero`, `map`, `services`, `stats`, `news` render (`homepage:1-5`); the `news` module offers search and filter, not a plain carousel. National context. | preview, stage, production (smoke) |
| PG-07 | Any city page | `cities` | Load a city page with several locations. Expand an accordion item; click a map pin; click "View Location Website". Run X-04. | `hero-full-cities` (title "Locations in <city>") and `zip-search` render (`cities:1-2`). See M-06 for the location list and map. | preview, stage |
| PG-08 | Any state page, and a state with no `territory` if one exists | `states` | Load a state page. Run X-04. | `hero-full-state` and `state-list` render (`states:1-2`). `state-list` lists only cities whose `state` contains this page (`find_in_set`, `modules/state-list:4`) and the list is title-cased. Territory context comes from the state's own `territory`. **Known code gap:** the `states` case has no `hasValidZUIDShape()` guard (`modules/client-global-navigation:2360-2405`; the `cities` case has one at `:2420`). An unset state `territory` is therefore expected to set empty territory cookies rather than fall back to National. If that case fails, report it as the known gap (§6), not a new regression. | preview, stage |

### Services

| ID | Page (path) | Template | Steps | Expected | Environments |
| --- | --- | --- | --- | --- | --- |
| PG-09 | Any service page | `services` | Load a service page at national, territory, and location level if available. | `hero-full-donate`, optional `page_intro` block, `benefits-perks`, `service-wy`, `programs-schedule`, `donate`, `stats-modules`, `become-a-member`, `services` carousel render (`services:1-23`). `news-cards` must **not** render: its include is inside a Parsley comment (`services:22`). National fallback body content (`national_service_body_content`) shows when no more specific body is set. | preview, stage |
| PG-10 | Any service-area page | `service_area` | Load a service-area page. | `hero-full-service-area`, `services-service-area`, `service-area-body-details` render (`service_area:1-3`). | preview, stage |

### Stories, news, and events

| ID | Page (path) | Template | Steps | Expected | Environments |
| --- | --- | --- | --- | --- | --- |
| PG-11 | Any story detail page | `stories` | Test one story per `page_layout` value seen in code: `Image Landscape` (`stories:84`), `Image Landscape No Sidebar` and `No Image` (`stories:60`), `Image Thumbnail` (`stories:253`), and empty. Also test a story with `external_url` set. | Each layout renders its own markup. Date formatting and location title-casing are correct; tag chips render when `article_tags` is non-empty (`stories:179`); `socials-share` renders (`stories:78`); `recent-stories` renders (`stories:430`). A story with `external_url` returns a 301 to it (`stories:44-45`). | preview, stage |
| PG-12 | News archive page | `news_archive` | Search, filter by content type and date, paginate. | `news-archive-search` renders (`news_archive:1`); search, filters, and pagination work; results link correctly. | preview, stage |
| PG-13 | Events landing page | `events_landing_pages` | Load it. | `hero-full-events` and `upcoming-events` render (`events_landing_pages:1-2`); the module heading reads "Upcoming Events". See M-31. | preview, stage |
| PG-14 | Any event detail page | `events` | Test one event per `page_layout`: `Image Landscape` (`events:23`), `Image Thumbnail` (`events:43`), `No Image` (`events:53`), and the fallback branch (Blank). | Date and time fall back `event_date_with_time` / `event_end_date_with_time`, then `date_time_summary`, then "No specific date" (`events:103`). Contact block shows only present fields. The geocoded Google Maps pin renders from `address`, `city`, `state` (`events:270`, `:479`). "Add to Calendar" (`events:113`) and "Return to all events" (`events:8`) work. The module heading under it reads "Other Events". | preview, stage |
| PG-15 | The stories landing page | `stories_landing_page` | Load it, **only after** the §6 liveness question is answered. | `news-archive` renders (`stories_landing_page:1`); search and filters work. | preview, stage |
| PG-16 | The all-stories page | `stories_new` | Load it, **only after** the §6 liveness question is answered. | `all-stories-archive` renders (`stories_new:3`) with 16 results per page (`modules/all-stories-archive:5`). Suspected defect: line 9 of that module is `let  = null;`, which is invalid JavaScript and would stop the whole script. Expect a console error (X-01) until confirmed otherwise. | preview, stage |
| PG-17 | Any tag page (Tags model item) | `tags` | Load a tag page. Run X-04 with a stored location, then with cleared cookies. Search by title; toggle "Show all locations"; paginate (15 per page, `modules/tags-archive:6`); use "View More". | `tags-archive` renders (`tags:1`). Stories tagged with this page's own ZUID list by default scoped to the stored location; with "Show all locations" checked, stories from every location list. Result count reads "N of M articles". No stories gives an empty, non-broken list. Which view actually serves Tags-model pages is unconfirmed (§6). | preview, stage |

### About, contact, leadership, volunteer, informational

| ID | Page (path) | Template | Steps | Expected | Environments |
| --- | --- | --- | --- | --- | --- |
| PG-18 | About page | `about_us` | Load it. | `hero-full`, `image-button-text-full`, `stats`, `local-needs`, `leadership-list` render (`about_us:1-5`). | preview, stage |
| PG-19 | Contact page for a location | `contact_us` | Load a contact page with a location. | `contact-us`, `map-with-info-contact`, `contact-us-officers`, `faqs`, `contact-form` render (`contact_us:2-11`). | preview, stage |
| PG-20 | Contact page, national or no location | `contact_us` | Load the national contact page. | `contact-us`, `map-contact`, `faqs`, `contact-form` render. The `contact-info` include is commented out (`contact_us:7`); record what content, if any, fills that gap. Do not call this a defect or a pass until §6 is answered. | preview, stage |
| PG-21 | Leadership landing page | `leadership_landing_page` | Load it. | `hero-full-leadership` and `leadership-list` render (`leadership_landing_page:4-5`). | preview, stage |
| PG-22 | Any volunteer page | `volunteer_pages` | Test each `template_layout` branch: value 1 (autolayout), other with empty `external_link` (`modules/generic`), other with `external_link` set. | Autolayout, `generic` (`hero-full` + `generic-info`), or a 301 to `external_link` (`volunteer_pages:1-12`). | preview, stage |
| PG-23 | Any informational page, including a nested one | `informational_pages` | Same three-branch test as PG-22. For a page nested under a location, division, or territory, run X-04 and X-08. Check the header mega-menu groups the page per `navigation_parent` and `display_on_header_navigation`. | Same branches as PG-22. Without a `location_zuid` cookie (fresh context): footer address and location cookies match the page owner (one location, else the shared division, else the shared territory, else National). With a persisted cookie from an earlier page: the header, nav links and footer keep that persisted context. | preview, stage |

### Campaign micro-sites

| ID | Page (path) | Template | Steps | Expected | Environments |
| --- | --- | --- | --- | --- | --- |
| PG-24 | Angel Tree campaign page | `angel_tree_campaign` | Load it. Enter a ZIP or city and search; select a pin and a result card; try an input with no matches. | `hero-full-angel-tree`, `angel-tree-wy`, `map-angel-tree`, `angel-tree-wy-2` render (`angel_tree_campaign:1-4`). See M-40 for module behaviour. QuickBase-backed data loads (T-04). | preview, stage |
| PG-25 | Stuff the Bus campaign page | `stuff_the_bus` | Load it. | `hero-full-stuff-the-bus`, `stuff-the-bus-wy`, `map-stuff-the-bus`, `stuff-the-bus-wy-2` render (`stuff_the_bus:1-4`). See M-41. QuickBase-backed data loads (T-04). | preview, stage |

### Location finder, errors, and infrastructure

| ID | Page (path) | Template | Steps | Expected | Environments |
| --- | --- | --- | --- | --- | --- |
| PG-26 | Location finder page | `location_finder` | Load it. | `location-finder` renders (`location_finder:1`). See M-05. | preview, stage |
| PG-27 | Any unknown path | `404` | Request a path that does not exist, on a host where the `404` view applies. | A plain-text body `404 not found`, not the styled page. Which of `404` and `404-page` answers a real missing path is unconfirmed (§6). | preview, stage |
| PG-28 | Any unknown path | `404-page` | Request a path that does not exist. Run X-06. | Styled 404: header, `hero-full-404`, `services`, `faqs`, footer render (`404-page:224-236`). Tealium sends `page_errorPage: 'true'` (`404-page:132`). | preview, stage |
| PG-29 | `blocks_test`, `api_test`, `gb_test`, `utility-scripts`, `metro_area_command` | scratch views | Request each path on staging and production. | Record reachable or not. These are scratch or stub views; if reachable, flag whether they should be (§6). Do not write functional cases for them. | stage, production (look-only) |

### Excluded (do not test yet)

- `corps`: still a 0-byte file (`webengine/views/corps`). Exclude until its status is confirmed (§6).
- `modules/service-area-form` conditional `form_embed`: parked. The module has no include site anywhere in `webengine/views`, so there is no page to test it on (§6).
- `informational_pages_dev`: renders only `{{this.meta_title}}`; a dev scratch template.
- `tag`, `tags_pages`, `country`: bare autolayout stubs (one default comment plus `this.autolayout()`); `tags_pages` is the view the 2026 tags work replaced with `tags`. Test only once §6 confirms which view serves Tags-model pages.

## 3. Module-level test cases

### Donation and giving

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-01 | `modules/donate` | `services` | Load a service page; look for the block. | A marketing call-to-action, not a donation form. Do not expect a form here. |
| M-02 | `components/header-donate-drawer-modal` | Every page via `header` / `header-dynamic` (`header:620`) | Click the header Donate button on desktop and mobile, at national and territory level. Close with the X button. Enter 4, then 5 digits in the Donate Goods ZIP field. Click Give Now (once and monthly). | The drawer opens and closes and the Donate button caret flips (`header-donate-drawer-modal:62-95`). Click is intercepted in the capture phase so no other donate UI opens (`:126`). "Go" is disabled until exactly 5 digits (`:167-180`); submit goes to `https://satruck.org/Donate/Choose?zip=<zip>` (`:188`). Give Now once and monthly links come from the `donateOnceURL` / `donateMonthlyURL` cookies, open in a new tab with `noopener noreferrer` (`:224-232`). With those cookies empty the links stay `href="#"` (inferred from `:224-226`); record that as an observation. Tealium events `donate_money_click` and `donate_goods_click` fire (`:192`, `:234`). |
| M-03 | `components/header-donate-modal` (Classy iframe, Bootstrap `#donateModal`) | Included from `loader:300` | Click the header Donate button; watch for the modal. | Expected not to open from the header, because the drawer handler stops propagation (inferred from `header-donate-drawer-modal:126`; `#donateModal` is also referenced in `-/block/stats_block.html`). If it does open, confirm the Classy iframe URL matches the org level and report the drawer and modal conflict. |
| M-04 | `components/header` Donate dropdown links | `header:229-262` | Open any Donate dropdown shown instead of, or alongside, the drawer. On the East territory page check the Donate Goods link. | Links resolve from cookies (`mutual_funds_url` for goods, `header:1147-1148`). The goods link is hidden on the East territory page (`header:260`, zuid `7-ae82da90c9-zjnfr3`). Record which UI (drawer or dropdown) a real user sees at each breakpoint. |

### Location finder, zip-search, and territory-context family

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-05 | `modules/location-finder` + `modules/location-finder-script` | `location_finder` | Search for a location and filter by service. | Search relies on `services.json` and `service-types.json` (`location-finder-script:51`, `:75`); the older service-area-model matching path is gone (coda-2480). The location finder block was removed from `hero-full-cities` (commit `0ba2f42`), so it must not appear on city pages. |
| M-06 | `modules/zip-search` | `cities` | On a city page: read the location list; open and close accordion items; click each pin; click directions and "View Location Website". Check a location with empty `site_name`. | Despite its name this is not a ZIP input (the ZIP search form is commented out, `zip-search:1-36`). It renders a collapsible card per location in this city (`zip-search:69`), titled `site_name`, falling back to `name` only when `site_name` is empty (`:96-98`, coda-2481). Address, phone, hours (with the "Contact Store for hours" case), and Google Maps directions links render only when the field is set. "View Location Website" goes to `redirect_url` (external, new tab) or the location's own path. A Google map with one labelled pin per location renders from the `city-locations-map-data` JSON (`:62-65`, `:255`); clicking a pin selects it and its card. City names are title-cased (commit `8c49af4`). |
| M-07 | `modules/client-global-navigation` | `custom_head:106`, every page | Visit one page of each model: homepage, territory, division, location, informational (nested and top-level), service, state, city, tags, stories, events. Inspect location cookies at each. | Highest-value regression target. Cookies (`location_model`, `location_zuid`, `location_name`, `location_address`, `location_city`, `location_state`, `location_zipcode`, `organization_*`, donate URLs) match the page's level per the cases listed in X-04. `cities` falls back to National when the territory ZUID is malformed (`:2420-2423`). `states` has no such guard (see PG-08). Informational pages resolve from their location, division, or territory parent (`:2160-2230`). |
| M-08 | `components/header-find-help-modal` | Every page via `header` | Open Find Help; allow geolocation and read the result; then deny geolocation; then block `nominatim.openstreetmap.org` or throttle the network. | Allowed: geolocation then Nominatim reverse geocode (`header-find-help-modal:102`) then `location-finder` lookup (`:194`, `:210`). Denied or Nominatim down: there is no documented graceful-failure behaviour. Record exactly what the user sees (silent, message, endless spinner); this may be a real defect (T-03). |
| M-09 | `modules/map`, `map-with-info`, `map-with-info-contact`, `map-contact` | homepage, territories, divisions (`map`); locations (`map-with-info`); contact page (`map-with-info-contact`, `map-contact`) | Load each host page; click pins and info panels. | Pins and info panels render for the page's context. Map data comes from `/locations.json?_bypassError=true` (`webengine/scripts/map.js:620`; E-06). An empty or failed fetch must not break the page. |

### Forms

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-10 | `modules/contact-form` (and the `contact-form` view) | `contact_us` | Load the contact page. | No live Feathery form: the embed in `modules/contact-form:9-16` is commented out ("Temporarily removing Feathery"), and the `contact-form` view is an empty styled shell (`contact-form:1-6`). Flag it if a working form now appears without a doc update. |
| M-11 | `modules/contact-us`, `contact-info`, `contact-us-officers` | `contact_us` | Compare against PG-19 and PG-20. | Falls back to WYSIWYG or a hard-coded national `contact_us` item. `contact-info` is excluded on the national branch (PG-20). |
| M-12 | `components/news-letter-modal` | Footer (`footer:727`) | Open the newsletter modal from the footer; wait for the form; submit a valid email on preview only; submit an invalid one. | A loader shows, then the Feathery newsletter form (`formId` `CdNLvi`) replaces it once its script loads (`news-letter-modal:40-66`). Success and error states display. Do not submit on production. |
| M-13 | `get-volunteer-page` fallback | Header volunteer links | Call `get-volunteer-page` for an org with no volunteer page. Open `fallback_url`. | JSON has `volunteer_url` and `fallback_url`; with no volunteer page `volunteer_url` equals `$centralFallbackURL`, path `7-b0e2afd6f9-t0dckq` (`get-volunteer-page:5`, `:33-34`). Confirm it still resolves to a live page and record whether it is the Central territory's page or a national one. There is no dedicated volunteer signup form; `modules/volunteer` has no include site. |

### Search

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-14 | `components/header-search-modal` (`#site-search`) | Every page via `header` | Open search; search a common term; search nonsense. | The real sitewide search entry point (`header-search-modal:13`, `:353`). Results return and link correctly; no results is handled cleanly. |

### Navigation, header, and footer

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-15 | `components/header` and `header-dynamic` | Every page (`loader:293-298`) | Open the mega-menu; tick service checkboxes; check informational links; verify header text from cookies. Load a page with `?navType=dynamic`. | Mega-menu, service checkboxes, and informational-page links (via E-03) render. Location name and donate URLs sync from cookies. `?navType=dynamic` swaps in `header-dynamic` (`loader:293-295`), which must behave like `header`. |
| M-16 | `components/footer` | Every page (`loader:312`) | Check footer links, social links, address, privacy link. | Footer renders `model-info.json` results (`footer:832`, `:846`; E-02), includes the newsletter modal (M-12), and the address per X-08. |
| M-17 | `components/nav-mobile` and `nav-mobile-dynamic` | Mobile header (`header:617`, `header-dynamic:617`) | At mobile width, open the menu and compare to desktop. | Mobile nav has parity with the desktop header for the same page. |
| M-18 | Header call to `-/instant/6-f0f2e8c49b-sdbvrb.json` | `header:670`, `header-dynamic` | Watch the network request on any page. | The endpoint responds with a `data` payload (`header:672`). What it contains is unconfirmed; record it (E-04). |

### Hero variants

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-19 | `modules/hero` | homepage, territories, divisions, locations | Load one page per org level. | High regression risk: three independent fallback cascades (slider org-level, primary and secondary card, shared `matrix_hero_sliders` fetch). The location, division, territory, national cascade resolves and never shows the wrong level's content. |
| M-20 | `modules/hero-full` | `about_us`, volunteer and informational pages | Load with `hero_image` set, empty, and a broken URL. | Since CODA-2529 (commit `a718a0a`) an empty `hero_image` falls back to `globals.default_og_image` rather than hiding the hero; a broken image swaps to the same fallback on `onerror`. The hero no longer requires `title`. |
| M-21 | `modules/hero-full-donate` | `services` | Same three image states as M-20. | Same fallback behaviour; reads its own field names. |
| M-22 | `modules/hero-full-events` | `events_landing_pages` | Same three image states. | Same fallback behaviour. |
| M-23 | `modules/hero-full-leadership` | `leadership_landing_page` | Same three image states. | Same fallback behaviour. |
| M-24 | `modules/hero-full-service-area` | `service_area` | Same three image states. | Same fallback behaviour. |
| M-25 | `modules/hero-full-state` | `states` | Same three image states. | Same fallback behaviour; title uses the state title. |
| M-26 | `modules/hero-full-cities` | `cities` | Same three image states. | Same fallback behaviour; title "Locations in <city>"; no location-finder block (M-05). |
| M-27 | `modules/hero-full-404` | `404-page` | Load the styled 404. | Renders with the fallback image behaviour; Tealium error flag per PG-28. |
| M-28 | `modules/hero-full-angel-tree` | `angel_tree_campaign` | Same three image states. | Same fallback behaviour. |
| M-29 | `modules/hero-full-stuff-the-bus` | `stuff_the_bus` | Same three image states. | Same fallback behaviour. |

Each `hero-full-*` variant is its own case because each reads different field names; do not treat a pass on one as covering another.

### Events and calendar

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-30 | `modules/upcoming-events` | `events_landing_pages`, `events` | Load a landing page and an event page; scroll to the module; page through; test an org with no events; block `/get-events.json` and reload. | The module loads only when it nears the viewport (`IntersectionObserver`, `upcoming-events:226-241`), then fetches `/get-events.json` for the page's own org (`:101`, `:349`). Cards show in a 3-column, 2-row Swiper with custom pagination. City and state names resolve through Instant endpoints (`:103`, `:392`). Heading is "Upcoming Events" on the landing page and "Other Events" on event detail (`upcoming-events:8-11`). No events or a failed fetch shows an empty or error state, not a broken layout (`showEventsLoadError`). Links go to event detail pages. |

### Stats, leadership, and news

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-31 | `modules/stats` | homepage, territories, divisions, locations, about | Check the dual carousel, the info icon, and share-to-social buttons at each org level. | Org-level cascade (location, division, territory, national) via `stats-info.json` (E-08). The info icon is vertically aligned (`lh-1`, commit `b3105d1`). Share buttons work. |
| M-32 | `modules/stats-modules` | `services` | Load a service page. | Page-level `stat_title_*` module renders (not the `stats` carousel). |
| M-33 | `modules/community-leaders` | `locations` | Load a location page with and without staff. | Staff carousel and flip cards render; empty state is clean. |
| M-34 | `modules/leadership-list` | `about_us`, `leadership_landing_page` | Load both pages; check at a location. | Scoped by `this.location`; renders staff. `leadership-parent` and `leadership` have no include site. |
| M-35 | `modules/advisory-board` | Pages that include it (include site not re-checked this pass) | Load one and check the roles shown. | Renders, filtered by staff role type. (inferred: carried over from the old plan.) |
| M-36 | `modules/news` | `homepage` | Search and filter stories; page through. | Full search and filter experience with service-type filter (`news:206`, `:504`), not a carousel. |
| M-37 | `modules/news-cards` | `territories`, `divisions`, `locations` | Load each; check at a location with no stories. | Cards come from `stories.json` for the page's org (`news-cards:152`) and service types (`:162`). Not rendered on `services` (PG-09). |
| M-38 | `modules/news-archive` and `components/news-archive-search` | `stories_landing_page`, `news_archive` | Search, filter by type and date, paginate. | Controls `#searchNews`, `#contentType`, `#datepicker`, `#search-stories-button` work; results render in `#searchResults`. |

### Tags

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-39 | `modules/tags-archive` with `components/tags-archive-search` and `tags-archive-list` | `tags` (PG-17) | Search `#searchTags`; toggle `#showAllLocationsTags`; paginate; follow "View More" (`#parent-tags__link`). | Calls `tags_stories.json` with the page's own ZUID (E-07). The Content Type filter is hidden (`d-none`, `tags-archive-search:23`). "Loading tagged content..." shows while fetching (`tags-archive:23`). Location-scoped by default, all locations when the box is checked. A failed fetch is logged and shows no stories. |
| M-40 | `modules/tags/client-global-navigation` and `modules/tags/schema` | None found | No functional test. | Mapped as snippets in `zesty.config.json` (`:32443-32456`) but no `include` site exists in `webengine/views`. The tags case in the main `client-global-navigation` (`:2459`) is the live path. Confirm only that these do not render (§6). |

### Campaign modules

| ID | Module | Where it appears | Steps | Expected |
| --- | --- | --- | --- | --- |
| M-41 | `modules/map-angel-tree` | `angel_tree_campaign` | Load the page; search with a ZIP, a city, and nonsense; select a pin and a card; resize to mobile; click "Donate ... instead" and reset. | Only the online registry is fetched (`:589-596`, `:724-745`); the "How would you like to give?" in-store toggle is hidden (`:15-16`), so no in-store option or request should appear. Search and results work within a 50-mile radius (`:310`); results header and count appear; the empty-state prompt shows before a search; the search button enables only after data loads (`:617`, `:652`). Pins and cards stay in sync on mobile. Analytics events `angeltree_filter_select` and `angeltree_filter_reset` exist in code but should not fire while the toggle is hidden (inferred). |
| M-42 | `modules/map-stuff-the-bus` | `stuff_the_bus` | Load the page; search; select pins. | Campaign and registry data load from QuickBase (`:107`, `:132`); map pins and results render; failure logs an error and shows an empty list (T-04). |

### Excluded: static, placeholder, or orphaned modules

Do not write functional cases for these. Confirm only that they do not render on a live page. None has an include site in `webengine/views` (checked with `rg` for `include modules/<name>` this pass, so dynamic includes are not ruled out):

- `modules/service-program-schedule`, `modules/programs`, `modules/services-national-wysiwyg`, `modules/services-national-wysiwyg-bottom`
- `modules/global-navigation`: the old plan left its relationship to `client-global-navigation` open; it has no include site (§6).
- `modules/volunteer`, `modules/leadership`, `modules/leadership-parent`, `modules/employment`, `modules/sponsorship`, `modules/featured-stories`, `modules/stats-with-stat-group`, `modules/service-area-form`
- `components/biograph-card`, `components/card`, `components/service-card`, `components/location-finder-results`

## 4. Component / block library test cases

Blocks live in `webengine/views/-/block/`. Insert one through a WYSIWYG field using `{{block('/-/block/<name>.html?variant=...')}}` to test (syntax carried over from the old plan, not re-verified). All blocks below exist in the working tree.

| ID | Component | Variants | Expected |
| --- | --- | --- | --- |
| B-01 | `hero_full.html` | Image set, empty | Test on its own: field names differ from `modules/hero-full` (`description` instead of `subtitle`). Empty image falls back to the default hero image (CODA-2529). |
| B-02 | `base_card.html` | With and without image, link | Renders card; empty fields omit their markup. |
| B-03 | `cta_button.html` | With and without link | Renders button; link opens as authored. |
| B-04 | `contact_us_block.html` | Valid and blank `feathery_id` | Unlike the disabled `modules/contact-form`, this block's Feathery embed is live (`contact_us_block.html:16-21`). Confirm the form loads and submits on preview only (T-05). |
| B-05 | `fundraising_thermometer_block.html` | Goal and raised set, one missing | Goal, raised value, and donate link render correctly. |
| B-06 | `greatest_need.html` | Default | Renders and links work. |
| B-07 | `way_to_give_block.html` | Default | Service info cards render. |
| B-08 | `dynamic_stories_carousel.html` and `stories_carousel.html` | Each org level | Org-hierarchy fallback cascade, same risk pattern as `modules/hero`. Test at each level. |
| B-09 | `service_selector.html` | Default | Selector works and routes correctly. |
| B-10 | `profile_card_block.html` | With and without photo | Card renders; empty fields omitted. |
| B-11 | `general_accordion.html` | Open and close | Accordion height and toggling work (height fix commit `d908b75`). |
| B-12 | `activity_boxes.html` | Default | Renders. |
| B-13 | `stats_block.html` | Default | Renders; it references `#donateModal` (see M-03), so check its donate trigger. |
| B-14 | `annual_reports_blocks.html` | Default | Renders and links resolve. |
| B-15 | `theater_space_block.html` | Default | Does its own fetch and `location-finder.json` call; confirm it succeeds independent of other location-finder use. |
| B-16 | `mobile_desktop_location_card_block.html` | Mobile and desktop | Correct variant per breakpoint. |
| B-17 | `mobile_desktop_videos.html` | Mobile and desktop | Correct video per breakpoint. |
| B-18 | `our_vision.html` | Default | Renders. |
| B-19 | `info_block.html` | Default | Renders. |
| B-20 | `generic_image_text_button_block.html` | With and without button | Renders; empty button omitted. |

Excluded: `side_by_side_hero_image.html`, `sustainability_in_action.html`, `staff_and_leadership.html`. They are empty scaffolds in the old plan; re-check at execution that they are still empty before skipping.

## 5. Endpoint / data checks

Request on a preview or staging host with the `zpw` value (never written here). Parsley endpoints are extensionless views served as `.json`; confirm the `.json` URL resolves, because extensionless view files are skipped by a stage sync until mapped in Zesty (`CLAUDE.md`).

| ID | Endpoint | Check | Expected |
| --- | --- | --- | --- |
| E-01 | `find-event.json` and `find-story.json` | Run the same location, division, and territory ZUID inputs against both as one parametrised case. | Both run the same location, division, territory `find_in_set` cascade, returning contact-us fallback content plus a Tealium `code` string, falling back to `{"code": "SAL^USN"}` when nothing resolves (old-plan finding; both files exist, ~3.8 KB each; re-confirm). Valid JSON in every case. |
| E-02 | `model-info.json?zuid=` | Pass a location ZUID and an invalid ZUID. | Returns that item's JSON (`model-info.json:1-12`). Called from `header:899` and `footer:832`, `:846`. With no `zuid` it returns `{'error': 'Request Parameter is empty!'}`, which uses single quotes and so is not valid JSON; record as an observation. |
| E-03 | `get-informational-page-links.json?zuid=&navParent=` | Pass location, division, and territory ZUIDs, with and without `navParent`. | A JSON array of links per org level; `navParent` defaults to `more` (`get-informational-page-links:21-23`). Called from `header:924`. A page whose `location` lists several locations appears for each of them, and also for the division (all locations in one division) or territory (several divisions in one territory) it resolves to. |
| E-04 | `-/instant/6-f0f2e8c49b-sdbvrb.json` | Request directly. | Hard-coded Zesty built-in endpoint called from `header:670` and `header-dynamic`. Valid JSON with a `data` key. What it holds is unconfirmed; report it. |
| E-05 | `get-events.json?field=&z1=...z5=` | Call with `field=property`, `divisions`, `territories`, and `any`; valid ZUIDs, an invalid ZUID, and none. | Valid JSON with `cutoff` and `events[]` (`get-events.json:71-84`); each event has `zuid`, `title`, `url`, `image`, `address`, `start`, `end`, `summary`, `city`, `state`. No valid org gives an empty `events` array. At most 100 events. Includes events from one day before now. |
| E-06 | `locations.json` | Fetch and parse. Compare preview and live hosts. | A one-line view that includes the media file `https://8hxvw8tw.media.zestyio.com/locations.json` (`locations.json:1`). Valid JSON array of locations. Rebuilt by `scripts/locations-endpoint-sync`, which writes preview and live separately (commit `949cb62`) and retries a failed fetch 3 times (commit `2c906e8`). The webhook function itself is not testable from the site. |
| E-07 | `datasets/mobile_editor/content_list/tags_stories.json?tag=&property=&model=&name=&skip=&limit=` | Use a tag with stories, a tag with none, and each `model` ZUID (location, division, territory); omit `property`. | `{"data": [...], "totalItems": N, "initialReturn": 1, ...}` (`tags_stories.json:46-68`). `property` and `model` scope by location, division, or territory; omitted gives stories from every location. `name` filters on title. Default `limit` is 10. No matches gives `data: []`, `totalItems: 0`. |
| E-08 | `stats-info.json?zuid=&page-model=&parent-division=&parent-territory=` | Location, division, territory, and national inputs. | A JSON array of stat records with the location, division, territory, national cascade. `source_url` is escaped so URLs with special characters keep the JSON valid (commit `b3105d1`). |
| E-09 | `get-informational-page.json?zuid=` | An informational page under a location, a division, and a territory. | Object with `content`, `address`, `city`, `state`, `zipcode` of the parent org (`get-informational-page.json:1-17`). Feeds the nested informational-page footer and cookies (X-08, M-07). |
| E-10 | `location-finder.json?query=<zuid>` | Valid ZUID; no `query`. | Returns the location JSON (`location-finder.json:5-7`). With no `query` it returns the single-quoted `{'error': ...}` form (not valid JSON; observation). Used by `header-find-help-modal:210`. |
| E-11 | `services.json` and `service-types.json?zuid=` | Request each. | Valid JSON; these two are the data source for location finder search (M-05) and `news` / `news-cards` filters. |
| E-12 | `get-volunteer-page` | Call for an org with and without a volunteer page. | Valid JSON with `volunteer_url` and `fallback_url` (M-13). |

### Third-party dependency checks

| ID | Dependency | Check |
| --- | --- | --- |
| T-01 | Tealium (`tags.tiqcdn.com/utag/salvationarmy`, `loader`, `custom_head:93`) | `utag.js` and `utag.sync.js` load without console errors; profile and environment segment in the URL match the instance (national by default). |
| T-02 | Google Maps JavaScript API (loaded from `webengine/scripts/main.js`) | Maps load on homepage, territory, division, location, city, event, and campaign pages; geocoder works on events and Angel Tree. |
| T-03 | OpenStreetMap Nominatim (`nominatim.openstreetmap.org/reverse`, `header-find-help-modal:102`) | Slow, blocked, or rate-limited: report exactly what the user sees. Possible real bug, not just a doc gap. |
| T-04 | QuickBase (`api.quickbase.com/v1/records/query`) | Live call sites: `modules/map-angel-tree:724`, `modules/map-stuff-the-bus:107` and `:132`. Treat as one shared blast-radius risk across both campaign pages: if the token is rotated, revoked, or rate-limited all three fail together. `angel-tree-script:37` also calls it but has no include site, and a second `map-angel-tree` call is commented out (`:752`). The user token is hard-coded in these views; this is a security finding. The value is deliberately not recorded in this plan. |
| T-05 | Feathery (`cdn.jsdelivr.net/npm/@feathery/react`) | Loads in `news-letter-modal` (`formId` `CdNLvi`) and `contact_us_block.html`. Disabled in `modules/contact-form`. On the dev version only, also on the homepage (`loader:325-340`). |
| T-06 | Classy donation pages | `donateOnceURL` and `donateMonthlyURL` cookies, set by M-07 from each org's `classy_url` and `classy_url_mobile`, open the right campaign per org level. Do not complete a donation. |
| T-07 | `satruck.org/Donate/Choose` | The drawer's Donate Goods "Go" lands on this site with `?zip=`. Check the redirect only; do not proceed. |
| T-08 | Zesty media host (`8hxvw8tw.media.zestyio.com/locations.json`) | Loads and parses (E-06); a failure must not break map pages. |
| T-09 | Microsoft Clarity (`clarity.ms`) | Appears only on the instance dev version (`loader:315`); absent on production (X-09). |

## 6. Open items to resolve before this plan is final

Carried over from the old plan and still open:

- `stories_landing_page` (`news-archive`) and `stories_new` (`all-stories-archive`) now have distinct includes, but which is live and linked is unconfirmed. In `zesty.config.json`, `stories_landing_page` is a `pageset` and `stories_new` a `templateset`. PG-15 and PG-16 stay gated on this.
- `modules/all-stories-archive:9` contains `let  = null;`. This looks like invalid JavaScript (inferred; a sync artifact is possible). Confirm in a browser console.
- `corps` is still a 0-byte file: dead or unbuilt?
- `contact_us` national branch: `contact-info` is commented out (`contact_us:7`). Intentional or a bug?
- Are `blocks_test`, `api_test`, `gb_test`, `utility-scripts`, `metro_area_command` reachable on stage or production, and should they be?
- `modules/global-navigation` has no include site. Dead code, or reached some other way?
- What does `-/instant/6-f0f2e8c49b-sdbvrb.json` return?
- `service-area-form`: wire into `service_area` or remove?
- Does `$centralFallbackURL` (`get-volunteer-page:5`) point to the Central territory's page or to National?
- Known code gap: the `states` case in `client-global-navigation` has no `hasValidZUIDShape()` guard (PG-08).

New from this pass:

- Which view serves Tags-model pages: `tags` (new, includes `tags-archive`), `tag`, `tags_pages`, or the `/tags-pages/*/index.parsley` mapping (`zesty.config.json:32135`)? `tags`, `modules/tags-archive`, and `components/tags-archive-*` are not in `zesty.config.json` at all. Per `CLAUDE.md`, extensionless view files are skipped by a stage sync until created and mapped in the Zesty manager (inferred), so tag pages may not exist on staging yet.
- `modules/tags/client-global-navigation` (2,557 lines, a near-copy of the main module) and `modules/tags/schema` are mapped but never included. Orphaned, or wired in through the platform?
- Header Donate: three UIs exist in code (the drawer, the legacy `header-donate-modal` in `loader`, and the dropdown in `header`). Which one does a user see?
- `angel-tree-script` and `angel-tree-data.json` / `angel-tree-dummy-data.json` have no include sites. The hidden in-store registry code paths in `map-angel-tree` are commented out or `d-none` "for now".
- `/tx/houston/` is the example location page. `state-list` links cities through `truepath`, so that path may be a `cities` page rather than a `locations` page (unknown). If so, pick a location through its "View Location Website" button for PG-03.
- Which of `404` and `404-page` answers a real missing path (PG-27, PG-28)?
- `location-finder.json` and `model-info.json` return single-quoted pseudo-JSON when the parameter is missing. Intended?
- `hero-full-cities` uses `alt="Featured Article"` (X-03).
- Is `instance.env == 'dev'` also true on branch previews, so X-09 chrome appears there too? PLATFORM QUESTION (zesty): confirm the value of `instance.env` per environment.
- Block insertion syntax in §4 and the `modules/advisory-board` include site were carried over from the old plan, not re-verified.

Old plan mapping: the 2026-09-25 plan was an unnumbered checklist, so no old IDs existed to preserve. IDs here were assigned fresh. Old items map in order of appearance: org hierarchy and services pages to PG-01 to PG-10; stories, events, about, contact, leadership, volunteer pages to PG-11 to PG-23; campaigns and errors to PG-24 to PG-29; modules to M-01 to M-38; blocks to B-01 to B-20; endpoint and dependency items to E-01 to E-04 and T-03, T-04. New items (no old equivalent): PG-17, PG-26, M-02 to M-04 (drawer), M-06 map (pins), M-30, M-39 to M-42, X-08, X-09, E-05 to E-12, T-01, T-02, T-05 to T-09.

## 7. Running against stage vs. production

- **Branch preview:** built automatically by the Zesty GitHub integration from the pushed branch (`CLAUDE.md`). The old plan said a manual `workflow_dispatch` was needed; that no longer applies. Still confirm with the user that the branch is pushed before testing.
- **Staging (instance dev version):** content saved by pushes to `stage`. It is the only environment where `instance.env == 'dev'` is known to apply, so expect the QA Ticket and Edit Content buttons, Clarity, and the homepage Feathery form here (X-09, T-09), but never on production.
- **Production:** only updated by a push to `production`, which publishes dev to live and never writes new content. New files must reach production through `stage` first; extensionless new views (for example `tags`) need mapping in Zesty before they exist anywhere (§6).
- **Expected differences before promotion:** Tealium environment segment differs by `instance.env` (`loader:85`, `:198`); `locations.json` is written separately for preview and live (E-06); anything newer than the last `stage` push (for example the tags pages from 2026-10-14) will exist on development and branch previews first.
- Regardless of environment, run X-04 and X-08 first. They are the most likely to regress silently across a promotion.
- **Agent scope:** `zesty-ai:qa` tests a ticket branch's own preview. `zesty-ai:reality-check` confirms the claimed change is in the files and visible on the preview, staging, or production page, by reading source and viewing the page in a browser; it runs no scripts. Neither triggers `zesty-deploy.yml`.

### Production smoke subset (read-only, human-initiated)

Look only. No form submits, no newsletter, no donation or external click-through, no cookie edits.

| Step | What to check | IDs |
| --- | --- | --- |
| 1 | Homepage `https://www.salvationarmyusa.org/` loads: hero, map, services, stats, news render | PG-06, X-01 |
| 2 | One territory page loads with its own hero, map, services, stats, news cards and org context | PG-01, X-04 |
| 3 | One location page, for example `/tx/houston/` (confirm it is a location page, not a city page; see §6) | PG-03, X-04 |
| 4 | Footer address on that location page matches the location, not the national fallback | X-08 |
| 5 | Header, mega-menu, search opens, footer render and internal links resolve; no dev-only chrome | X-02, M-15, M-16, X-09 |
| 6 | Optionally open and close the donate drawer without clicking Give Now or Go | M-02 (open and close only) |

## Open Questions / Flags

Items that could not be verified from the repo, or that contradict older docs:

- Every expected result is derived from code. Nothing was executed against a live environment. A first full pass may correct this plan; report plan errors as documentation issues, not defects.
- The old plan's claim that `modules/donate` is the only donate surface is outdated. The header donate drawer, with its ZIP goods form, is a new giving surface (M-02).
- The old plan said the 4 QuickBase call sites cover both campaign pages; now 3 are live (T-04).
- The old plan said `zip-search` is a corps-card grid; it is now a location accordion plus a pinned Google map (M-06).
- The old plan said branch previews required a manual `workflow_dispatch`; `CLAUDE.md` now says the GitHub integration builds them.
- Cross-references to `docs/content-models.md`, `docs/templates.md`, and `docs/custom-patterns.md` were dropped: those files are not present in this working tree.
- Unverified, left as `(inferred)` or `(unknown)` in place: PG-05 param semantics, M-03 and M-04 which donate UI is live, M-35 include site, X-07 link-type filter, B-section insertion syntax.

## Review status

Draft — pending review. Not yet reviewed by a human. Seeded from the agent-lab plan approved on 2026-09-26 (the older version, which stays the approved baseline for items not changed here). All new and changed sections in this document are unreviewed until a human signs off.
