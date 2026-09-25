# QA Test Plan

Status: **Approved** — signed off by the user 2026-09-26
Last generated: 2026-09-25 by Documentation Maker

This is a manual QA checklist for `quinn` (structured live test pass) and
`karen` (source-diff + live reality-check) to work from when testing
business-critical pages/modules/endpoints on a feature branch preview,
stage, and production. There is no test runner in this repo (see
`CLAUDE.md`) — this is meant to be worked through by hand, one item at a
time, and checked off.

For field-level content-model detail, endpoint parameters, and
cross-cutting pattern writeups, this doc links out to
`docs/content-models.md`, `docs/templates.md`, and `docs/custom-patterns.md`
rather than repeating them. If you find something here that contradicts
those docs, trust the code, flag it, and let `documentation-maker`
reconcile the docs afterward.

**How to add new test cases:** each numbered section below is a flat list
grouped by topic — append a new bullet/row to the relevant group rather
than restructuring. If a new module/page/endpoint doesn't fit an existing
group, add a new group rather than forcing it.

---

## 1. Cross-cutting checks (run on every page, not page-specific)

Run all of these on **every** page tested below, regardless of which
page-level test case you're on:

- [ ] **Org-hierarchy / territory context correctness.** Confirm nav,
  footer, and donate-links context (org name, contact info, donate URLs)
  match the actual page's org level (national / territory / division /
  location). This is driven by the cookie state machine in
  `modules/client-global-navigation`, recently extended for coda-2434 —
  see `docs/custom-patterns.md` §2. Pay special attention to **state**
  and **city** pages (the two org levels coda-2434 added branches for)
  and to any page whose derived org level could legitimately be empty
  (e.g. a city whose state has no territory set — should fall back to
  national, not show stale/wrong context).
- [ ] **Console errors.** No JS errors/warnings on page load (check
  browser devtools console).
- [ ] **Responsive breakpoints.** Check mobile, tablet, and desktop
  widths — nav collapse, hero layout, card grids.
- [ ] **Tealium tracking bootstrap present.** Confirm `utag.view()` fires
  with a populated data-layer payload. Note this is implemented
  independently in 4 places (`loader`, `custom_head`, `404-page`,
  `global-analytics`/`tealium-analytics`) with slightly different shapes
  — see `docs/custom-patterns.md` §6. If testing a 404 page, check for
  `page_errorPage: 'true'` specifically.
- [ ] **External link auto-hardening.** Any off-host `<a>` (including
  ones injected client-side, e.g. news/service cards) should carry
  `target="_blank" rel="noopener noreferrer"`. See
  `docs/custom-patterns.md` §7. Only applies to `http(s)` links —
  mailto/tel links should NOT be hardened.

---

## 2. Page-level test cases

### Org hierarchy pages
Priority: **`states` is a direct coda-2434 regression target — test first.**

- [ ] `territories` — hero/map/services/stats/news-cards render; org
  context matches territory.
- [ ] `divisions` — same 5 modules; org context matches division.
- [ ] `locations` — same 5 modules; org context matches location.
- [ ] `homepage` — hero/map/services/stats/news (full search/filter, not
  carousel) render; national context.
- [ ] `cities` — `hero-full-cities` + `zip-search` render; corps-card
  grid populates (see zip-search note in §3 below).
- [ ] **`states`** (coda-2434 regression target) — `hero-full-state` +
  `state-list` render; `state-list` shows cities scoped to this state
  (`find_in_set` on `state`); territory context (name, contact-us
  fallback, donate URLs) resolves from the state's own `territory` field,
  not a stale/national default. Also test a state whose `territory`
  field is unset if one exists, to confirm graceful fallback.

### Services
- [ ] `services` — hero-full-donate, page intro, benefits-perks,
  service-wy, programs-schedule, donate, stats, become-a-member,
  news-cards, services carousel all render; national fallback content
  (`national_service_body_content`) shows correctly when no
  location/division/territory-specific body is set.
- [ ] `service_area` — hero-full-service-area, services-service-area,
  service-area-body-details render; `service-area-form`'s conditional
  `form_embed` shows only when the field is set (see §3 Forms).

### Stories/news/events
- [ ] `stories` (detail page) — test each of the 4 `page_layout`
  branches (`Image Landscape`, `Image Landscape No Sidebar`,
  `Image Thumbnail`, default/no-image); test `external_url` redirect
  behavior; confirm date formatting and location title-casing.
- [ ] `news_archive` — `news-archive-search` component filters/search
  works.
- [ ] `events_landing_pages` — hero-full-events + upcoming-events render.
- [ ] `events` (detail page) — test each of the 4 `page_layout` branches
  (`Image Landscape`, `Image Thumbnail`, `No Image`, `Blank`); confirm
  date/time formatting falls back correctly
  (`event_date_with_time`/`event_end_date_with_time` → `date_time_summary`
  → "No specific date"); confirm contact block only renders present
  fields; confirm the client-side Google Maps geocoded pin renders from
  `address`/`city`/`state`; confirm "Add to Calendar" / "Return to all
  events" links work.
- [ ] `stories_landing_page` vs `stories_new` — **do not write parallel
  test cases for both as if both are live.** See Open Item in §6 — get
  web-developer confirmation of which is actually linked/live before
  testing either as a real page.

### About/contact/leadership/volunteer
- [ ] `about_us` — hero-full, image-button-text-full, stats, local-needs,
  leadership-list render.
- [ ] `contact_us` (location branch) — `map-with-info-contact` +
  `contact-us-officers` render alongside `faqs`/`contact-form`.
- [ ] `contact_us` (national/no-location branch) — **verify whether the
  commented-out `contact-info` include is intentional or a bug** (see §6
  — don't assume either way); confirm what content, if any, fills that
  gap in the rendered page; confirm `map-contact` still renders.
- [ ] `contact-form` — confirm this is still an empty/static stub with no
  functioning form (expected per current code) — flag if it's since been
  built out without doc updates.
- [ ] `leadership_landing_page` — hero-full-leadership + leadership-list
  render.
- [ ] `volunteer_pages` — test all 3 `template_layout` branches
  (`autolayout()`, `modules/generic`, 301 to `external_link`).
- [ ] `informational_pages` — same 3-branch test as `volunteer_pages`;
  confirm nav placement (`navigation_parent`/`display_on_header_navigation`)
  matches the header mega-menu grouping.

### Campaign micro-sites
- [ ] `angel_tree_campaign` — hero-full-angel-tree, angel-tree-wy,
  map-angel-tree, angel-tree-wy-2 render; QuickBase-backed data
  (map pins / records) loads.
- [ ] `stuff_the_bus` — hero-full-stuff-the-bus, stuff-the-bus-wy,
  map-stuff-the-bus, stuff-the-bus-wy-2 render; QuickBase-backed data
  loads.
- [ ] **Shared risk note:** both pages depend on the same hardcoded
  QuickBase token (`docs/custom-patterns.md` §12). This is one shared
  blast-radius risk, not two independent ones — if QuickBase auth breaks,
  expect both pages' map/data features to fail together. Testing one
  doesn't clear the other, but a fix/regression in the token affects both
  simultaneously.

### Errors/infra
- [ ] `404` — raw plain-text 404 responder (not the styled page).
- [ ] `404-page` — styled 404: header, hero-full-404, services, faqs,
  footer render; confirm its independent Tealium bootstrap sets
  `page_errorPage: 'true'`.
- [ ] Reachability check: confirm whether `blocks_test`, `api_test`,
  `gb_test`, `utility-scripts`, `metro_area_command` are reachable on
  stage/prod. These are scratch/stub views per `docs/templates.md` — if
  reachable, flag whether they *should* be (see §6).

### Excluded — do not test yet
- `corps` — 0-byte file, dead/unbuilt. Exclude until web-developer
  confirms status (see §6).

---

## 3. Module-level test cases

### Donation/giving
- [ ] **Correction to test against:** `modules/donate` is a marketing CTA
  block, NOT a donation form — don't write a test case expecting a form
  there.
- [ ] Header-triggered donate modal (`components/header-donate-modal`,
  `components/header-donate-drawer-modal`) — open from header on a
  **national** page and a **territory** page; confirm the Classy iframe
  loads the correct URL per org level (`classy_url`/`classy_url_mobile`
  fields, `donateOnceURL`/`donateMonthlyURL` cookies set by
  `client-global-navigation`). Test both "once" and "monthly" variants if
  the modal exposes both.
- [ ] `block/fundraising_thermometer_block.html` — goal/raised values and
  donate button link render correctly (donation-adjacent surface, not the
  donate flow itself).
- [ ] `block/way_to_give_block.html` — service info cards render
  (donation-adjacent surface).

### Location finder / zip-search / territory-context family
- [ ] `modules/location-finder` + `location-finder-script` — search
  works; confirm coda-2480's removal of the service-area-model matching
  path didn't regress search results (search should now rely only on
  `services.json`/`service-types.json`).
- [ ] `modules/zip-search` — corps-card grid on `cities` pages; confirm
  coda-2481 fix: card title shows `location.site_name`, falling back to
  `location.name` only when `site_name` is empty/null. (Misleadingly
  named — this is a corps-card grid, not a zip input field.)
- [ ] `modules/client-global-navigation` — **highest-value regression
  target.** Test the full cookie state machine across every org level
  (national/territory/division/location/state/city), including the two
  new coda-2434 branches (`case models.states`, `case models.cities`) and
  the `hasValidZUIDShape()` empty-ZUID guard. See
  `docs/custom-patterns.md` §2 for the full behavior spec.
- [ ] `modules/global-navigation` — relationship to
  `client-global-navigation` is unconfirmed (flagged for web-developer,
  see §6) — test only if/once that relationship is clarified; don't
  assume it's a live alternate nav path.
- [ ] `components/header-find-help-modal` — geolocation prompt →
  Nominatim reverse-geocode → `location-finder.json` lookup. **Explicitly
  test the failure path**: deny geolocation permission, and separately
  simulate/observe Nominatim being slow or unavailable (throttle network
  or block the domain) — there's no documented graceful-failure behavior
  for this third-party dependency (see §5).
- [ ] Map modules — `modules/map`, `map-with-info`,
  `map-with-info-contact`, `map-contact` — pins/info panels render
  correctly per page context.

### Forms
- [ ] `contact-form`/`contact-us`/`contact-info`/`contact-us-officers` —
  **correction to test against:** Feathery is currently disabled/commented
  out on this path — it falls back to raw WYSIWYG or a hardcoded national
  `contact_us` item. Don't write a test expecting a live Feathery form
  here.
- [ ] `service-area-form` — conditional `form_embed` renders only when
  the field is populated on the Service Area item; confirm no broken
  empty-state markup when it's not set.
- [ ] Newsletter capture (`components/news-letter-modal`, launched from
  footer) — submit and confirm success/error states. Note this is not a
  dedicated module, it's footer-triggered.
- [ ] Volunteer signup — **no dedicated signup form exists.**
  `modules/volunteer` is page composition only. Test `get-volunteer-page`'s
  hardcoded national fallback URL (`7-b0e2afd6f9-t0dckq`) as a dead-link
  check candidate — confirm it still resolves to a live page.

### Search
- [ ] `components/header-search-modal` (`#site-search` form) — the real
  sitewide search entry point. Confirm results return and link correctly.

### Navigation/header/footer
- [ ] `components/header` / `header-dynamic` — mega-menu, service
  checkboxes, informational-page nav links (via
  `get-informational-page-links`), header text sync from cookies
  (location name, donate URLs). Test `header-dynamic` specifically via
  `?navType=dynamic`.
- [ ] `components/footer` — renders `model-info.json` fetch result;
  includes `news-letter-modal`.
- [ ] `nav-mobile` / `nav-mobile-dynamic` — mobile-width nav parity with
  desktop header/header-dynamic.
- [ ] **Flag while testing:** header components make an undocumented
  hardcoded call to `-/instant/6-f0f2e8c49b-sdbvrb.json`. Confirm what
  content this resolves to and note it in `docs/templates.md`/
  `docs/custom-patterns.md` once known (see §5, §6).

### Hero variants
- [ ] `modules/hero` — **high regression risk, 3 independent fallback
  cascades** (slider org-level fallback, primary/secondary card fallback,
  and the shared `matrix_hero_sliders.json` fetch). Test at each org
  level to confirm the location→division→territory→national cascade
  resolves correctly and doesn't silently show the wrong level's content.
- [ ] `hero-full-*` variants — each needs its **own** test case, not a
  shared one, because each reads different field names (see
  `docs/content-models.md` §9): `hero-full` (default), `hero-full-donate`,
  `hero-full-events`, `hero-full-leadership`, `hero-full-service-area`,
  `hero-full-state`, `hero-full-cities`, `hero-full-404`,
  `hero-full-angel-tree`, `hero-full-stuff-the-bus`.

### Events/calendar
- [ ] `modules/upcoming-events` — list renders and links to individual
  `events` detail pages correctly.

### Stats/leadership
- [ ] `modules/stats` — dual-carousel, org-level fallback cascade
  (location→division→territory→national), share-to-social buttons.
- [ ] `modules/community-leaders` — homepage staff carousel, flip-cards.
- [ ] `modules/leadership-list` / `leadership-parent` — scoped by
  `this.location`.
- [ ] `modules/advisory-board` — renders correctly, filtered by staff
  role type.

### Excluded — static/placeholder, not live render paths
Do not write functional test cases for these; confirm only that they
don't accidentally render on a live page (they should be excluded via
config or unmapped in `zesty.config.json`):
- `modules/service-program-schedule`
- `modules/programs`
- `modules/services-national-wysiwyg`
- `modules/services-national-wysiwyg-bottom`

---

## 4. Block Library test cases (`webengine/views/-/block/`)

Business-critical/reusable blocks worth their own test case (insert via
`{{block('/-/block/name.html?variant=...')}}` in a WYSIWYG field to test):

- [ ] `hero_full.html` — note field-name drift vs `modules/hero-full`
  (`description` instead of `subtitle`) — see `docs/custom-patterns.md`
  §8. Test as its own case, don't assume module-level hero test coverage
  carries over.
- [ ] `base_card.html`
- [ ] `cta_button.html`
- [ ] `contact_us_block.html` — **contrast note:** this block's Feathery
  embed (`feathery_id`) IS live, unlike the disabled Feathery paths in §3
  Forms. Explicitly confirm the form actually loads and submits here.
- [ ] `fundraising_thermometer_block.html`
- [ ] `greatest_need.html`
- [ ] `way_to_give_block.html`
- [ ] `dynamic_stories_carousel.html` / `stories_carousel.html` — org
  hierarchy fallback cascade, same risk pattern as `modules/hero`. Test
  at each org level.
- [ ] `service_selector.html`
- [ ] `profile_card_block.html`

Lower-priority general content blocks (test if time allows, not blocking):
- [ ] `general_accordion.html`
- [ ] `activity_boxes.html`
- [ ] `stats_block.html`
- [ ] `annual_reports_blocks.html`
- [ ] `theater_space_block.html` — does its own fetch +
  `location-finder.json` call; test this call succeeds independent of the
  page's other location-finder usage.
- [ ] `mobile_desktop_location_card_block.html`
- [ ] `mobile_desktop_videos.html`
- [ ] `our_vision.html`
- [ ] `info_block.html`
- [ ] `generic_image_text_button_block.html`

### Excluded — empty/decorative placeholder blocks
Do not write test cases for these (Zesty "Template File is empty"
scaffolds, per `docs/content-models.md` §10):
- `side_by_side_hero_image.html`
- `sustainability_in_action.html`
- `staff_and_leadership.html`

---

## 5. Endpoint / pseudo-API checks

Base reference: the endpoint table in `docs/templates.md`
("Ajax-JSON / data endpoint views"). This section only lists
new/corrected findings from this pass — check parameters/response shape
there, not here.

- [ ] `find-event.json` and `find-story.json` — confirmed to run the
  **same** location→division→territory `find_in_set` cascade as other
  endpoints, returning contact-us fallback content plus a Tealium `code`
  string, falling back to `{"code": "SAL^USN"}` when nothing resolves.
  **Test as one shared parametrized case** (same location/division/
  territory ZUID inputs against both endpoints), not two separate ones.
- [ ] `model-info.json?zuid=` — confirm live call sites in
  header/footer components still resolve correctly.
- [ ] `get-informational-page-links.json?zuid=&navParent=` — confirm live
  call site in header mega-menu resolves the correct set of links per
  `navParent`.
- [ ] `-/instant/6-f0f2e8c49b-sdbvrb.json` — hardcoded Zesty built-in
  endpoint called from header components. **Content it resolves to is
  not yet confirmed** — investigate and report back so
  `docs/templates.md`/`docs/custom-patterns.md` can be updated.

### Third-party dependency checks
- [ ] `nominatim.openstreetmap.org/reverse` (OSM reverse geocoding),
  called from `components/header-find-help-modal` — **no documented
  graceful-failure behavior.** Dedicated check: simulate the service
  being slow/down/rate-limited and confirm what the user actually sees
  (silent failure? error message? infinite spinner?). Report findings —
  this may surface a real bug, not just a doc gap.
- [ ] QuickBase API (`api.quickbase.com/v1/records/query`, hardcoded
  token — already flagged as a security issue in
  `docs/custom-patterns.md` §12) — called from 4 separate places
  (`angel-tree-script`, `modules/map-angel-tree`,
  `modules/map-stuff-the-bus` ×2). **Treat as one shared blast-radius
  risk** across all Angel Tree/Stuff the Bus pages — if this token is
  rotated/revoked/rate-limited, expect all 4 call sites (both campaign
  pages) to fail together, not independently.

---

## 6. Open items to resolve before this plan is final

These are blocking questions for web-developer/the user — do not
silently resolve either way when writing or running test cases above:

- [ ] `stories_landing_page` vs `stories_new` — which is actually
  live/linked? (See `docs/templates.md` Open Questions #1.)
- [ ] `corps` page (0-byte) — dead or unbuilt? (See
  `docs/content-models.md` Open Questions #4.)
- [ ] `contact_us` national-fallback missing `contact-info` include —
  intentional or bug? (See `docs/templates.md` Open Questions #3.)
- [ ] Are `blocks_test`, `api_test`, `gb_test`, `utility-scripts`,
  `metro_area_command` reachable on stage/prod, and should they be? (See
  `docs/templates.md` Open Questions #5, #9.)

Additional items surfaced while assembling this plan, also unresolved:

- [ ] `modules/global-navigation`'s relationship to
  `modules/client-global-navigation` is unconfirmed — is it a live
  alternate nav path, dead code, or something else?
- [ ] Header components' hardcoded `-/instant/6-f0f2e8c49b-sdbvrb.json`
  call — what does this resolve to?

---

## 7. How to run this against stage vs. production

This checklist applies to all three environments this project promotes
through:

- **Feature branch preview** — `https://8hxvw8tw-{branch}.webengine.zesty.io`.
  Per `CLAUDE.md`'s Deployment model, a feature branch is only live at
  this URL after a human has manually run `workflow_dispatch` for
  `zesty-deploy.yml` (or merged to `stage`) — **confirm with the user
  that this has happened before testing a branch preview; don't assume
  it based on a recent push.**
- **Stage / dev-draft** — `https://8hxvw8tw-dev.webengine.zesty.io`. This
  is the "dev" (draft/working) version of content saved via `stage`
  pushes — see `docs/custom-patterns.md` §9 for the save-vs-publish
  branch semantics.
- **Production** — `http://salvationarmyusa.org`. Only updated by a
  `production` push/publish action, which promotes dev→live and never
  writes new content itself.

Notes on agent scope per environment:
- `qa-tester` tests only a feature branch's own live preview — it does
  not test dev rollup (stage) or stage as separate steps.
- `karen`'s agent definition (`.claude/agents/karen.md`) was recently
  updated to include **production** in her normal scope, alongside the
  feature branch preview and stage — she does not run scripts (no
  `deploy:dry`, no `git`/`gh`) and reality-checks by reading source and
  viewing live pages directly in a browser.
- Regardless of environment, always re-run the org-hierarchy/territory
  context check (§1) first — it's the most likely thing to silently
  regress across a promotion, and the coda-2434 states/cities fix makes
  it the top current regression risk end-to-end.

---

## Review status

This document was **Approved** by the user on 2026-09-26 (previously Draft — pending review).

- Built 2026-09-25 by Documentation Maker from a research pass over
  `webengine/views` (already verified by direct file reads per the task
  brief) plus cross-references into `docs/content-models.md`,
  `docs/templates.md`, and `docs/custom-patterns.md`. Not yet run against
  a live environment by `quinn`/`karen`.
- 2026-09-26: the user confirmed the doc overall — status is now
  **Approved**, and it is the working checklist for `quinn` and `karen`.
  Still not yet run end-to-end against a live environment; the first full
  pass may surface corrections, which dot flags as "Draft — pending
  review" at the section level until the user signs off.
