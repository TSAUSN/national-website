# Content Models

Status: **Approved** — signed off by the user 2026-09-26
Last generated: 2026-09-25 by Documentation Maker (see "2026-09-25 update" note below; earlier history in the "2026-09-24 refresh" note further down)

> **2026-09-25 update:** three web-developer fixes merged to `development`
> this pass (coda-2434, coda-2480, coda-2481; QA'd by qa-tester and karen —
> see `docs/changelog.md` for full detail). Of the three, only **coda-2434**
> ("Fix territory context for state and city pages") changes anything
> documented here: it added a `territory` field to **States** and clarified
> that **Cities** has no `territory` field of its own (derived via
> `state.territory` instead) — see those sections above. coda-2480
> (location-finder service-area-model removal) and coda-2481 (zip-search
> corps-card title fallback) are template/script-only fixes with no new
> content-model fields; see `docs/templates.md` for those.

> **2026-09-24 refresh note:** this pass re-checked every section against
> the current repo state. Corrections applied directly (self-verifiable
> from template code): Events model fields were significantly
> under-documented (the `events` page-type view is not the empty stub
> `docs/templates.md` previously described — see that doc's 2026-09-24
> update), and a new `form_embed` field was found on Service Area. Three
> new, currently-empty Block Library stubs were added to §10.
>
> **Follow-up (same day):** ira and zed have since reviewed every item
> that was flagged for them in this pass — see the "Review status"
> section at the bottom of this file for what was confirmed vs.
> corrected. The Stories `property`/`divisions`/`territory` cardinality
> question is now live-confirmed (ira), the "Globals" vs. "Clippings"
> split has been corrected to reflect they're one feature (zed), and the
> find_in_set/LIKE relationship-query pattern is now cited to Zesty's
> own docs rather than just inferred (zed).

## How this document was built (read this first)

There is **no schema/config file in this repo that declares content models or field types**. `zesty.config.json` only maps WebEngine **views** (templates) to their ZUIDs for the deploy script (`scripts/sync-to-zesty.js`) — it has no `models` or `fields` section. `webengine/views/model-info.json` and `webengine/views/models-info.json` are themselves _Parsley templates_ (ajax-json endpoints), not schema definitions.

Everything below was therefore **inferred from how templates use fields** (`this.fieldname`, `{{model_name}}.filter(...)`, `this.fieldname.getImage()`, `{{each model_name as x}}`, etc.) across `webengine/views/**`. Consequences:

- Field **names** are reliable (they're copy-pasted from the templates).
- Field **types** are a best guess based on usage (e.g. something passed to `.getImage()` is an image/media field; something used in `{{if this.x}}` could be text, a relationship, or a checkbox — Parsley doesn't make this distinguishable from template code alone).
  *(Reviewed and confirmed by zed, 2026-09-24 — accurate to how Parsley works generally, no change needed.)*
- **Relationships** are inferred when a field holds a ZUID that's then looked up via `<model>.filter(...)` (e.g. `this.location` → `locations.filter(z.zuid = this.location)`).
- This document does **not** enumerate every field of every content model exhaustively — it covers what's actually referenced in templates. There may be fields in the live Zesty instance that no template currently uses; those are invisible to this scan.
- Zesty model ZUIDs seen in code (useful for correlating with the live instance):
  - Locations: `6-b4c9aba69c-h2nqvm`
  - Divisions: `6-acb19a94bd-4q8ftj`
  - Territories: `6-deab97cfd9-wb5km4`
  - National/Homepage: `6-a0898ca2c1-krnm0f`

**Recommendation:** the `zesty` MCP server's `get-models` / `get-model` / `get-fields` / `get-field` tools (see `docs/api-tools.md`) can pull the authoritative schema (names, ZUIDs, field types) directly from the live instance. That should be run to confirm/correct everything in this file — see the "Needs live verification" list at the end.

---

## 1. Organizational hierarchy models

The site is structured as a 3-level org hierarchy (Territory → Division → Location), plus a National/Homepage root and geographic lookup models (Country, State, City). These are Zesty "pageset"-type models (each item is a real URL).

### Territories (`6-deab97cfd9-wb5km4`)

| Field                                        | Inferred type | Notes                                                           |
| -------------------------------------------- | ------------- | --------------------------------------------------------------- |
| `name`                                       | text          | Territory display name                                          |
| `territory_code`                             | text          | 3-letter code used in Tealium `page_hierarchy` (e.g. `SAL^WES`) |
| `contact_us_image`                           | image         | Used as fallback in `modules/client-global-navigation`          |
| `contact_us_title` / `contact_us_cta_header` | text          | Contact-us CTA fallback content                                 |
| `zipcode`                                    | text          |                                                                 |
| `classy_url` / `classy_url_mobile`           | text/URL      | Donation platform (Classy) links                                |
| Hero fields (see §7)                         |               | via `hero-full-state`/`hero` modules                            |

### Divisions (`6-acb19a94bd-4q8ftj`)

| Field           | Inferred type              | Notes |
| --------------- | -------------------------- | ----- |
| `name`          | text                       |       |
| `division_code` | text                       |       |
| `territory`     | relationship → Territories |       |

### Locations (`6-b4c9aba69c-h2nqvm`)

| Field                                                                                 | Inferred type                                     | Notes                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `name`                                                                                | text                                              |                                                                               |
| `territory` / `division`                                                              | relationship                                      |                                                                               |
| `property_type`                                                                       | relationship → Properties Types                   | drives "simplified" layout logic (see `properties_types`, `modules/services`) |
| `services_offered`                                                                    | relationship (multi) → services-offered-type list | consumed by `services-offered.json` endpoint                                  |
| `redirect_url`                                                                        | text/URL                                          | if set, `locations` view 301-redirects                                        |
| `page_layout`                                                                         | select (`simplified` / other)                     | toggles which modules render                                                  |
| `address`, `city` (rel → Cities), `state` (rel → States), `zipcode`, `contact_number` | text/relationship                                 | contact/schema data                                                           |
| `site_name`                                                                           | text                                              | used in JSON-LD (`modules/schema`) and `map-contact-information`              |

### Cities

| Field   | Inferred type                                                                   | Notes |
| ------- | ------------------------------------------------------------------------------- | ----- |
| `title` | text                                                                            |       |
| `state` | relationship → States (locations/cities filtered by `find_in_set(zuid, state)`) |

> **Added 2026-09-25 (coda-2434).** Cities has **no direct `territory` field of its own** — a city's territory context is derived one hop away, through its `state` relationship: `client-global-navigation` resolves `states.filter(this.state).territory` (see States below) to get the territory ZUID, then looks up that territory's name/contact/donation data. If a city's `state` has no `territory` set, the derived ZUID is empty and the page falls back to national context (`hasValidZUIDShape()` guard — see `docs/custom-patterns.md` §2). Don't add a `territory` field directly to Cities to "fix" this — the existing template code expects to reach it via `state`.

### States

| Field        | Inferred type              | Notes                              |
| ------------ | --------------------------- | ---------------------------------- |
| `name`       | text                        |                                    |
| `state_code` | text                        | used on stories/story detail pages |
| `territory`  | relationship → Territories  | **Added 2026-09-25 (coda-2434).** Read by `client-global-navigation`'s `case models.states` branch to derive and persist the state page's own territory context (name, contact-us fallback, donation URLs/cookies) instead of falling through to the national default. |

### Country / Properties Types

Both `country` and `properties_types` page-type views are unmodified Parsley `autolayout()` stubs — **no custom fields are referenced anywhere in templates**. `properties_types` ZUIDs (e.g. `7-c8a6abd0b7-xbhndn`) are hardcoded and checked against `locations.property_type` in `modules/services`, so the model exists and is used as a lookup table, just not rendered by its own page template.

---

## 2. Services

### Services (content model, referenced heavily; ZUID pattern seen: items filtered by `territory`/`division`/`location`)

| Field                                                           | Inferred type                                                                  | Notes                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `title`                                                         | text                                                                           |                                                                  |
| `subtitle`                                                      | text                                                                           | shown as card excerpt                                            |
| `service_type`                                                  | relationship → Service Types                                                   |                                                                  |
| `service_page_icon`                                             | text (icon name)                                                               | falls back to `service_types.icon_name` if empty                 |
| `display_in_services_navigation_dropdown`                       | boolean/checkbox                                                               |                                                                  |
| `seo_meta_title` / `seo_meta_description` / `seo_meta_keywords` | text                                                                           | also reused as on-page search index fields (`data-meta-*` attrs) |
| `territory` / `division` / `location`                           | relationship (nullable — org level is inferred from which of the three is set) |                                                                  |
| `page_intro`                                                    | rich text                                                                      |                                                                  |
| `service_body`                                                  | rich text                                                                      | rendered by `modules/service-wy`, varies heading by org level    |
| `parent_zuid`                                                   | (Zesty built-in)                                                               | used to resolve the page's location/division/territory context   |

### Service Types

| Field                           | Inferred type | Notes                        |
| ------------------------------- | ------------- | ---------------------------- |
| `title` / `name`                | text          |                              |
| `icon_name`                     | text          | Material Symbols icon name   |
| `sort_order`                    | number        |                              |
| `national_service_body_content` | rich text     | national-level fallback body |

### Service Info Cards ("How We Serve" cards, `modules/benefits-perks`)

| Field                                             | Inferred type                                     | Notes |
| ------------------------------------------------- | ------------------------------------------------- | ----- |
| `service_page`                                    | relationship → Services (the parent service page) |       |
| `icon_name`, `title`, `description`, `sort_order` | text/number                                       |       |

---

## 3. Content / landing page models

Most of these are "pageset" models with a shared shape: `title`, an org-scoping trio (`territory`/`division`/`location`, all optional), SEO fields, and page-specific fields.

### Stories (news articles)

| Field                                                                            | Inferred type                                                                                                            | Notes                                                                                         |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `title`, `body` (rich text), `image`                                             | text/rich text/image                                                                                                     |                                                                                               |
| `author`                                                                         | text                                                                                                                     |                                                                                               |
| `story_date_picker`                                                              | date                                                                                                                     | formatted client-side (`.date(F j, Y)`)                                                       |
| `page_layout`                                                                    | select: `No Image`, `Image Landscape`, `Image Landscape No Sidebar`, `Image Thumbnail` (default = plain)                 | controls the entire detail-page layout (see `webengine/views/stories`)                        |
| `primary_cta_name`/`primary_cta_link`, `secondary_cta_name`/`secondary_cta_link` | text/URL                                                                                                                 |                                                                                               |
| `external_url`                                                                   | URL                                                                                                                      | if set, redirects away from the story (also used as a "Read More" link)                       |
| `property`                                                                       | relationship (`one_to_many`, confirmed live 2026-09-24) → **Locations** pageset (`6-b4c9aba69c-h2nqvm`) — not a separate "Properties" model despite the admin label | drives city/state display                                                                     |
| `divisions`                                                                      | relationship (`one_to_many`, confirmed live 2026-09-24) → Divisions                                                                                                 | org-hierarchy scoping (see note below)                                                        |
| `territory`                                                                      | relationship (`one_to_many`, confirmed live 2026-09-24) → Territories                                                                                               | org-hierarchy scoping — **note singular name**, unlike Events' `territories` (see note below) |
| `related_service`                                                                | relationship → Services                                                                                                  | used to show a service-type badge on story cards                                              |
| `article_tags`                                                                   | relationship (multi), **commented out** in the live template (`webengine/views/stories`, `modules/news`) — flagged below |
| `seo_meta_description`                                                           | text                                                                                                                     | also used as card excerpt                                                                     |

> **Confirmed 2026-09-24 (ira + zed).** `property`, `divisions`, and
> `territory` are all confirmed **`one_to_many` relational fields**
> (multi-value, comma-list) — ira ran the `zesty` MCP server's
> `get-fields` tool live against the Stories model
> (ZUID `6-80c7e29486-k0pq6s`) and got a definitive answer, resolving
> what had been an inferred guess as of 2026-09-23. Two things worth
> flagging while this is fresh:
>
> - **`property` relates to the Locations pageset** (ZUID
>   `6-b4c9aba69c-h2nqvm`), not a separate "Properties" model — the
>   admin-facing label is "Properties," which could otherwise read as
>   implying a distinct content model. There isn't one; don't go looking
>   for it.
> - **The field's real (internal) name is singular `territory`**, not
>   `territories` — the admin label "Territories" is plural, but
>   `this.territory` is what templates actually read. This is the same
>   naming inconsistency called out below, now confirmed rather than
>   just observed in template code.
>
> This was originally inferred from four templates that query `stories`
> with the same `find_in_set`/`LIKE` cascade pattern used by Events:
>
> - `webengine/views/find-story.json` (lines 6, 12, 18): `find_in_set(zuid, property)` → `find_in_set(zuid, divisions)` → `find_in_set(zuid, territory)`.
> - `webengine/views/get-stories-by-location.json`: `find_in_set('<zuid>', story.territory)`.
> - `webengine/views/-/block/dynamic_stories_carousel.html` (lines 6-45): cascades through `stories.filter(property LIKE ...)` → `divisions LIKE ...` → `territory LIKE ...` → national default, mirroring the org-hierarchy scoping pattern used elsewhere in this doc.
> - `webengine/views/datasets/mobile_editor/content_list/stories.json` (line 71): `find_in_set({$property}, property) OR find_in_set({$division}, divisions) OR find_in_set({$territory}, territory)` — directly parallel to the sibling `content_list/events.json` query for Events (which uses `find_in_set(..., territories)`, plural).
>
> **Reviewed and confirmed by zed, 2026-09-24:** `find_in_set`/`LIKE`
> isn't just "suggestive of" a multi-valued field here — it's Zesty's
> own **documented idiom** for querying a one-to-many relationship field
> (see [docs.zesty.io: How to Create a one_to_many Relationship](https://docs.zesty.io/docs/how-to-create-a-one_to_many-relationship),
> whose own example uses `FIND_IN_SET(tag.zid,'{thispage.tags}')`). Combined
> with ira's live `get-fields` confirmation above, this is no longer a
> hedged inference for `property`/`divisions`/`territory`.
>
> **Naming inconsistency to watch for:** Events' territory-scoping field is named `territories` (plural); Stories' equivalent field is named `territory` (singular). Anyone building shared cascade/scoping logic across both models needs to branch on this field-name difference — don't assume the two models share an identical field set just because the pattern (`property`/`divisions`/territory-field) looks the same.

### Stories Landing Page / News Archive

Thin wrapper models whose page just includes `modules/news-archive`; org-scoped the same way (`territory`/`division`/`location`).

### Events

> **Corrected 2026-09-24.** This section was previously much sparser
> because `docs/templates.md` had `webengine/views/events` (the Events
> detail page) misdocumented as an empty stub. It is not — it's a fully
> built detail-page template (title, CTAs, date/time, contact block,
> Google Maps geocoded map, "Add to Calendar" link, `modules/upcoming-events`)
> parallel in shape to the `stories` detail page. Fields below are
> expanded accordingly.

| Field                                              | Inferred type                                         | Notes                                                                                                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                            | text                                                   |                                                                                                                                                                                          |
| `territories`, `divisions`, `property`             | relationship (comma-list, queried with `find_in_set`) | **note plural `territories`** — Stories' equivalent field is singular `territory`; see Draft note in the Stories section above before assuming shared field names across the two models |
| `city` (rel → Cities), `state` (rel → States)      |                                                        |                                                                                                                                                                                          |
| `address`                                          | text                                                   | shown alongside city/state and used to build a Google Maps link/geocoded pin (`webengine/views/events`)                                                                                |
| `event_date_with_time`, `event_end_date_with_time` | datetime                                              | formatted client-side (`.date(F j, Y h:iA)`); if neither is set, falls back to `date_time_summary`, else "No specific date"                                                            |
| `date_time_summary`                                | text                                                   | fallback display text when start/end datetime fields aren't set                                                                                                                        |
| `page_layout`                                      | select: `Image Landscape`, `Image Thumbnail`, `No Image`, `Blank` (default = plain) | controls detail-page layout — **note this option list differs from Stories' `page_layout` options** (`No Image`, `Image Landscape`, `Image Landscape No Sidebar`, `Image Thumbnail`); don't assume the two models share a select list |
| `image`                                            | image                                                  | used in the `Image Landscape`/`Image Thumbnail` layout branches                                                                                                                        |
| `body`                                             | rich text                                              | main event description                                                                                                                                                                 |
| `primary_cta_name`/`primary_cta_link`, `secondary_cta_name`/`secondary_cta_link` | text/URL                          |                                                                                                                                                                                          |
| `contact_person_name`, `contact_email`, `contact_number`                        | text                               | rendered in a "Contact" block, each conditionally shown if present                                                                                                                     |

### Events Landing Page

Org-scoped wrapper; renders `modules/hero-full-events` + `modules/upcoming-events`.

### About Us / Contact Us / Informational Pages / Leadership Landing Page / Volunteer Pages

Share a common shape used by the `data_code`/`generate-csv`/`get-informational-page-links` endpoints:
| Field | Inferred type | Notes |
|---|---|---|
| `title` | text | |
| `territory` / `division` / `location` | relationship (optional, mutually-scoping) | |
| `template_layout` | select (`1` = use Parsley `autolayout()`, else custom) — seen on `informational_pages` and `volunteer_pages` |
| `external_link` | URL | if template_layout ≠ 1 and this is set, the page 301-redirects instead of rendering |
| `page_type` (Informational Pages only) | relationship → **Information Page Types** (a model referenced but never directly rendered) |
| `navigation_parent`, `display_on_header_navigation` | text/boolean | drive which nav dropdown ("more", "about", "ways_to_give") the page link appears under (`get-informational-page-links`) |
| `location` (Contact Us) | relationship → Locations — if present, renders location-specific contact modules; else renders generic contact info |

### Corps

`webengine/views/corps` (the page-type view) is a **completely empty file (0 bytes)**. Either this model has no dedicated page template yet, or it's dead. Flagged below.

### Service Area

Fields inferred from `modules/service-area-body-details` / `service-area-contact-detail`:
`body` (rich text), `contact_name`, `contact_number`, `email`, plus the standard `territory`/`division`/`location` scoping trio. **Added 2026-09-24:** `form_embed` (embed code/rich text, conditionally rendered by `modules/service-area-form` — a new module found in this pass).

---

## 4. People / staff

### Staff (and Community Leaders / Advisory Board — same underlying `staff.json` endpoint, filtered by role)

| Field                                | Inferred type                                     | Notes                                                                  |
| ------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `fullname`, `title_rank`, `job_role` | text                                              |                                                                        |
| `about`                              | rich text                                         | shown on card flip-back                                                |
| `portrait_image`                     | image                                             |                                                                        |
| `property`                           | relationship → Locations                          |                                                                        |
| `staff_role_type`                    | relationship (multi) → **Staff Role Types** model | used to filter which staff show as "leaders" (`staff_role_types.json`) |
| `display_on_website`                 | boolean                                           |                                                                        |

---

## 5. FAQs

| Field                | Inferred type                                                                                                           | Notes                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `topic`              | select: `financial_donations`, `in_kind_donations`, `volunteering`, `getting_help`, `employment_opportunities`, `other` | hardcoded topic buckets in `modules/faqs` |
| `question`, `answer` | text/rich text                                                                                                          |                                           |

## 6. Program Schedule (matrix/relationship items on a service page)

Referenced via `this.matrix_program_schedule` (a relationship/matrix field on Services): each linked item has `title`, `pseudo_multiselect_days`, `time`, `timezone`, `program_schedule_location`, `link`, `description`.

## 7. Stats

Two shapes coexist:

- **Page-level stat fields** (`modules/stats-modules`, `modules/local-needs`): `stat_title_1/2/3`, `stat_subtitle_1/2/3` directly on the page item.
- **Stats content model** (fed to `modules/stats` via `stats-info.json`): `stats_name`, `categories`, `description`, `image`, `stats_sub_text`, `right_side_header`, `right_side_content`, `learn_more_url`, `general_statistic`, plus relationships `territories`/`divisions`/`locations` for scoping.

## 8. Hero Sliders (`matrix_hero_sliders`, fetched via `/-/gql/matrix_hero_sliders.json`)

Fields referenced in `modules/hero`: `title`, `content` (rich text), `image`, `primary_cta_link`/`primary_cta_name`, `secondary_cta_link`/`secondary_cta_name`, `sort_order`, `display_on_national`, `display_on_territories`, `display_on_divisions`, `display_on_locations`. **This is a separate reusable slide model**, not the page item itself — flagged for live verification since the endpoint shape wasn't inspected live.

---

## 9. The "Hero" field convention (shared across many models, not a single model)

Several unrelated content models each carry their own copy of a hero-banner field set, rendered by one of the many `hero-full-*` modules. Field names are **not** fully consistent between variants:

| Module                                                             | Image field  | Title-ish fields                            | CTA fields                                         |
| ------------------------------------------------------------------ | ------------ | ------------------------------------------- | -------------------------------------------------- |
| `modules/hero-full` (generic default)                              | `hero_image` | `title`, `subtitle`                         | `primary_cta_link/name`, `secondary_cta_link/name` |
| `modules/hero-full-donate`                                         | `hero_image` | `title`, `subtitle`                         | same                                               |
| `modules/hero-full-events`                                         | `hero_image` | `title` (no subtitle used)                  | none                                               |
| `modules/hero-full-leadership`                                     | `image`      | `title`, `body`                             | none                                               |
| `modules/hero-full-service-area`                                   | `image`      | `name`, `body`                              | none                                               |
| `modules/hero-full-state`                                          | `image`      | `name`                                      | none                                               |
| `modules/hero-full-cities`                                         | `hero_image` | `seo_meta_title`                            | none                                               |
| `modules/hero-full-angel-tree`, `-stuff-the-bus`                   | `hero_image` | `title`                                     | none                                               |
| `webengine/views/-/block/hero_full.html` (Block Library — see §10) | `image`      | `title`, **`description`** (not `subtitle`) | same                                               |

This is a real inconsistency, not a documentation gap — see Open Questions.

---

## 10. Content Blocks (Zesty "Block Library", `webengine/views/-/block/*.html`)

These are **separate from WebEngine page views**. They render reusable rich-text/matrix "blocks" that editors can drop into a WYSIWYG field, each with its own field shape:

| Block file                                | Fields referenced                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `hero_full.html`                          | `image`, `title`, `description`, `primary_cta_link/name`, `secondary_cta_link/name`                                               |
| `base_card.html`                          | `image`, `title`, `description`, `service_types`, `primary_cta_link`, `primary_card_cta_text`, `secondary_cta_link/name`          |
| `cta_button.html`                         | `cta_button_link`, `cta_type`, `button_size`, `cta_button_text`                                                                   |
| `activity_boxes.html`                     | `activity_box_items` (matrix)                                                                                                     |
| `annual_reports_blocks.html`              | `featured_annual_report`, `youtube_url_id`, `annual_reports` (matrix)                                                             |
| `contact_us_block.html`                   | `title`, `subtitle`, `feathery_id` (Feathery form embed id)                                                                       |
| `dynamic_stories_carousel.html`           | `locations`, `divisions`, `territories` (scoping), `article_tags`                                                                 |
| `fundraising_thermometer_block.html`      | `title`, `donate_button_url/text`, `goal`, `raised`                                                                               |
| `general_accordion.html`                  | `title`, `accordion_items` (matrix), `open_first_accordion_item`                                                                  |
| `generic_image_text_button_block.html`    | `title`, `body`, `cta_buttons_alignment`, `cta_button_link/text`, `cta_button_link_2/text_2`, `should_link_open_to_a_new_tab[_2]` |
| `greatest_need.html`                      | `title`, `url`, `open_in_a_new_tab`, `button_text`                                                                                |
| `info_block.html`                         | `icon_name`, `title`, `description`                                                                                               |
| `mobile_desktop_location_card_block.html` | `locations` (matrix)                                                                                                              |
| `mobile_desktop_videos.html`              | `media_1/2/3` (video/image), `media_1/2/3_title`                                                                                  |
| `our_vision.html`                         | `left_column_icon/title/description`, `right_column_icon/title/description`                                                       |
| `profile_card_block.html`                 | `staff_and_community_leaders` (relationship, multi)                                                                               |
| `service_selector.html`                   | `services` (matrix)                                                                                                               |
| `stats_block.html`                        | `stats` (matrix)                                                                                                                  |
| `stories_carousel.html`                   | `stories_entries` (matrix)                                                                                                        |
| `theater_space_block.html`                | `hero_sliders`, `primary_card`, `secondary_card`                                                                                  |
| `way_to_give_block.html`                  | `service_info_cards` (matrix)                                                                                                     |
| `side_by_side_hero_image.html`, `sustainability_in_action.html`, `staff_and_leadership.html` | **Added 2026-09-24, no fields yet** — all three render Zesty's own "Template File is empty" placeholder alert (a Code-App scaffold message with an "Edit Template File" link back to the manager UI), not real markup. They exist as Block Library entries but haven't been built out — don't treat them as documented content models until someone fills them in. |

Flag: `base_card.html` and `hero_full.html` (blocks) look like earlier iterations of `modules/hero-full` and `components/card` — worth confirming with web-developer whether they're still actively used in any WYSIWYG content, or dead.

---

## 11. Site-wide singletons

- **Globals / Clippings — one feature, two names, one model.** `globals.*` and `clippings.*` are **not two separate site-wide singletons** — this was corrected 2026-09-24 (reviewed and confirmed by zed). "Clippings" is the legacy name for the same Zesty feature now called "Globals": per [docs.zesty.io: Globals](https://docs.zesty.io/docs/globals), "Globals (formerly Content Clippings)." Confirmed on the live instance too: there is exactly **one** model (ZUID `6-de95fda1c1-dxht20`), admin label "Globals," internal name `clippings`, with one set of 24 fields — templates just alternate between the `globals.*` and `clippings.*` prefixes for the *same underlying dataset* (both prefixes appear across `custom_head`, `components/footer`, `modules/hero`, etc., referencing the same fields). Known fields referenced in templates: `default_og_image`, `services_all_image`, `site_name`, `default_images` (media list, used as a random hero/news fallback image), `custom_analytics_scripts` (raw script injected only on `set_zuid == 6-c2b7f2a9ad-k4frxv`). Don't write new template code assuming `globals.*` and `clippings.*` are different data sources — they're two aliases for one item.

---

## Open Questions / Flags

1. **No schema source of truth in-repo.** All types above are inferred from usage; confirm against the live instance via the `zesty` MCP server (`get-models`, `get-fields`) before treating any "inferred type" as fact.
2. **Hero field-name drift** (§9): at least 3 different field-naming conventions (`hero_image`/`title`/`subtitle` vs `image`/`title`/`body` vs `image`/`name`/`body`) across hero-full variants, plus a 4th shape in the Block Library `hero_full.html` (`description` instead of `subtitle`). This looks like organic drift across copies rather than a deliberate design — worth confirming with web-developer whether these should be consolidated to one model/field set.
3. **`article_tags`** is referenced on Stories/story cards but every usage is commented out in the live templates (`webengine/views/stories`, `modules/news`) — field may exist on the model but is currently unused in the UI. Confirm whether tags are still a planned feature.
4. **`corps`** page-type view is a 0-byte file — either an unfinished/unused content model or content intentionally has no dedicated template. Needs a decision, not a guess.
5. **Information Page Types** model is referenced (`information_page_types.filter(...)`) but has no page template of its own — appears to be a pure lookup/taxonomy model.
6. **Duplicate/near-duplicate Block Library items** (`base_card.html`, `hero_full.html`) vs. their module counterparts — confirm if still in use before documenting them as "current."
7. **Events model was significantly under-documented until 2026-09-24** — `docs/templates.md` had incorrectly described the `events` page-type view as an empty stub, so this file's Events section never picked up `title`, `page_layout`, `image`, `body`, CTA, and contact fields. Corrected this pass; worth double-checking no other model has the same "documented from a page that was wrongly assumed to be a stub" problem.
8. **Three new Block Library files are empty Zesty scaffolds** (`side_by_side_hero_image.html`, `sustainability_in_action.html`, `staff_and_leadership.html`, added to §10 2026-09-24) — someone (web-developer) needs to actually build these before they render anything but a "Template File is empty" placeholder.
9. ~~**Stories `property`/`divisions`/`territory` cardinality**~~ — **Resolved 2026-09-24**: ira confirmed live via `get-fields` (Stories model ZUID `6-80c7e29486-k0pq6s`) that all three are `one_to_many` relational fields; `property` relates to the Locations pageset, not a separate "Properties" model. See the Stories section above.
10. ~~**"Globals" vs. "Clippings" — are these two different features?**~~ — **Resolved 2026-09-24**: no, one feature/one model (see §11) — "Clippings" is the legacy name, per docs.zesty.io.

---

## Review status

This document was **Approved** by the user on 2026-09-26 (previously Draft — pending review).

- `ira` reviewed and confirmed the Stories cardinality question (2026-09-24) — ran `get-fields` live against the Stories model and confirmed `property`/`divisions`/`territory` are all `one_to_many`, plus clarified `property` relates to the Locations pageset (not a separate "Properties" model). See the Stories section and Open Questions item 9.
- `zed` reviewed and confirmed 3 flagged items (2026-09-24): the general Parsley field-type-inference claim (confirmed as-is, no change), the find_in_set/LIKE-as-relationship-query-idiom claim (confirmed and strengthened with a docs.zesty.io citation), and the "Globals"/"Clippings" framing (found to be a real error — both are the same feature/model, corrected in §11 and Open Questions item 10).
- 2026-09-25: added the States `territory` field and the Cities territory-derivation note for coda-2434 (see the "2026-09-25 update" note at the top of this file). Self-verified against the current `client-global-navigation` source only — not yet reviewed by ira/zed.
- 2026-09-26: the user confirmed the doc overall — status is now **Approved**. Future changes by dot get flagged "Draft — pending review" at the section level until the user signs off on them.
