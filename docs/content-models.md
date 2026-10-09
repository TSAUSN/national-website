# Content Models

Status: **Draft — pending review**
Last generated: 2026-09-19 by Documentation Maker (automated codebase scan)

## How this document was built (read this first)

There is **no schema/config file in this repo that declares content models or field types**. `zesty.config.json` only maps WebEngine **views** (templates) to their ZUIDs for the deploy script (`scripts/sync-to-zesty.js`) — it has no `models` or `fields` section. `webengine/views/model-info.json` and `webengine/views/models-info.json` are themselves *Parsley templates* (ajax-json endpoints), not schema definitions.

Everything below was therefore **inferred from how templates use fields** (`this.fieldname`, `{{model_name}}.filter(...)`, `this.fieldname.getImage()`, `{{each model_name as x}}`, etc.) across `webengine/views/**`. Consequences:

- Field **names** are reliable (they're copy-pasted from the templates).
- Field **types** are a best guess based on usage (e.g. something passed to `.getImage()` is an image/media field; something used in `{{if this.x}}` could be text, a relationship, or a checkbox — Parsley doesn't make this distinguishable from template code alone).
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
| Field | Inferred type | Notes |
|---|---|---|
| `name` | text | Territory display name |
| `territory_code` | text | 3-letter code used in Tealium `page_hierarchy` (e.g. `SAL^WES`) |
| `contact_us_image` | image | Used as fallback in `modules/client-global-navigation` |
| `contact_us_title` / `contact_us_cta_header` | text | Contact-us CTA fallback content |
| `zipcode` | text | |
| `classy_url` / `classy_url_mobile` | text/URL | Donation platform (Classy) links |
| Hero fields (see §7) | | via `hero-full-state`/`hero` modules |

### Divisions (`6-acb19a94bd-4q8ftj`)
| Field | Inferred type | Notes |
|---|---|---|
| `name` | text | |
| `division_code` | text | |
| `territory` | relationship → Territories | |

### Locations (`6-b4c9aba69c-h2nqvm`)
| Field | Inferred type | Notes |
|---|---|---|
| `name` | text | |
| `territory` / `division` | relationship | |
| `property_type` | relationship → Properties Types | drives "simplified" layout logic (see `properties_types`, `modules/services`) |
| `services_offered` | relationship (multi) → services-offered-type list | consumed by `services-offered.json` endpoint |
| `redirect_url` | text/URL | if set, `locations` view 301-redirects |
| `page_layout` | select (`simplified` / other) | toggles which modules render |
| `address`, `city` (rel → Cities), `state` (rel → States), `zipcode`, `contact_number` | text/relationship | contact/schema data |
| `site_name` | text | used in JSON-LD (`modules/schema`) and `map-contact-information` |

### Cities
| Field | Inferred type | Notes |
|---|---|---|
| `title` | text | |
| `state` | relationship → States (locations/cities filtered by `find_in_set(zuid, state)`) |

### States
| Field | Inferred type | Notes |
|---|---|---|
| `name` | text | |
| `state_code` | text | used on stories/story detail pages |

### Country / Properties Types
Both `country` and `properties_types` page-type views are unmodified Parsley `autolayout()` stubs — **no custom fields are referenced anywhere in templates**. `properties_types` ZUIDs (e.g. `7-c8a6abd0b7-xbhndn`) are hardcoded and checked against `locations.property_type` in `modules/services`, so the model exists and is used as a lookup table, just not rendered by its own page template.

---

## 2. Services

### Services (content model, referenced heavily; ZUID pattern seen: items filtered by `territory`/`division`/`location`)
| Field | Inferred type | Notes |
|---|---|---|
| `title` | text | |
| `subtitle` | text | shown as card excerpt |
| `service_type` | relationship → Service Types | |
| `service_page_icon` | text (icon name) | falls back to `service_types.icon_name` if empty |
| `display_in_services_navigation_dropdown` | boolean/checkbox | |
| `seo_meta_title` / `seo_meta_description` / `seo_meta_keywords` | text | also reused as on-page search index fields (`data-meta-*` attrs) |
| `territory` / `division` / `location` | relationship (nullable — org level is inferred from which of the three is set) | |
| `page_intro` | rich text | |
| `service_body` | rich text | rendered by `modules/service-wy`, varies heading by org level |
| `parent_zuid` | (Zesty built-in) | used to resolve the page's location/division/territory context |

### Service Types
| Field | Inferred type | Notes |
|---|---|---|
| `title` / `name` | text | |
| `icon_name` | text | Material Symbols icon name |
| `sort_order` | number | |
| `national_service_body_content` | rich text | national-level fallback body |

### Service Info Cards ("How We Serve" cards, `modules/benefits-perks`)
| Field | Inferred type | Notes |
|---|---|---|
| `service_page` | relationship → Services (the parent service page) | |
| `icon_name`, `title`, `description`, `sort_order` | text/number | |

---

## 3. Content / landing page models

Most of these are "pageset" models with a shared shape: `title`, an org-scoping trio (`territory`/`division`/`location`, all optional), SEO fields, and page-specific fields.

### Stories (news articles)
| Field | Inferred type | Notes |
|---|---|---|
| `title`, `body` (rich text), `image` | text/rich text/image | |
| `author` | text | |
| `story_date_picker` | date | formatted client-side (`.date(F j, Y)`) |
| `page_layout` | select: `No Image`, `Image Landscape`, `Image Landscape No Sidebar`, `Image Thumbnail` (default = plain) | controls the entire detail-page layout (see `webengine/views/stories`) |
| `primary_cta_name`/`primary_cta_link`, `secondary_cta_name`/`secondary_cta_link` | text/URL | |
| `external_url` | URL | if set, redirects away from the story (also used as a "Read More" link) |
| `property` | relationship → Locations | drives city/state display |
| `related_service` | relationship → Services | used to show a service-type badge on story cards |
| `article_tags` | relationship (multi), **commented out** in the live template (`webengine/views/stories`, `modules/news`) — flagged below |
| `seo_meta_description` | text | also used as card excerpt |

### Stories Landing Page / News Archive
Thin wrapper models whose page just includes `modules/news-archive`; org-scoped the same way (`territory`/`division`/`location`).

### Events
| Field | Inferred type | Notes |
|---|---|---|
| `territories`, `divisions`, `property` | relationship (comma-list, queried with `find_in_set`) | |
| `city` (rel → Cities), `state` (rel → States) | | |
| `event_date_with_time`, `event_end_date_with_time` | datetime | |

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
`body` (rich text), `contact_name`, `contact_number`, `email`, plus the standard `territory`/`division`/`location` scoping trio.

---

## 4. People / staff

### Staff (and Community Leaders / Advisory Board — same underlying `staff.json` endpoint, filtered by role)
| Field | Inferred type | Notes |
|---|---|---|
| `fullname`, `title_rank`, `job_role` | text | |
| `about` | rich text | shown on card flip-back |
| `portrait_image` | image | |
| `property` | relationship → Locations | |
| `staff_role_type` | relationship (multi) → **Staff Role Types** model | used to filter which staff show as "leaders" (`staff_role_types.json`) |
| `display_on_website` | boolean | |

---

## 5. FAQs
| Field | Inferred type | Notes |
|---|---|---|
| `topic` | select: `financial_donations`, `in_kind_donations`, `volunteering`, `getting_help`, `employment_opportunities`, `other` | hardcoded topic buckets in `modules/faqs` |
| `question`, `answer` | text/rich text | |

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

| Module | Image field | Title-ish fields | CTA fields |
|---|---|---|---|
| `modules/hero-full` (generic default) | `hero_image` | `title`, `subtitle` | `primary_cta_link/name`, `secondary_cta_link/name` |
| `modules/hero-full-donate` | `hero_image` | `title`, `subtitle` | same |
| `modules/hero-full-events` | `hero_image` | `title` (no subtitle used) | none |
| `modules/hero-full-leadership` | `image` | `title`, `body` | none |
| `modules/hero-full-service-area` | `image` | `name`, `body` | none |
| `modules/hero-full-state` | `image` | `name` | none |
| `modules/hero-full-cities` | `hero_image` | `seo_meta_title` | none |
| `modules/hero-full-angel-tree`, `-stuff-the-bus` | `hero_image` | `title` | none |
| `webengine/views/-/block/hero_full.html` (Block Library — see §10) | `image` | `title`, **`description`** (not `subtitle`) | same |

This is a real inconsistency, not a documentation gap — see Open Questions.

---

## 10. Content Blocks (Zesty "Block Library", `webengine/views/-/block/*.html`)

These are **separate from WebEngine page views**. They render reusable rich-text/matrix "blocks" that editors can drop into a WYSIWYG field, each with its own field shape:

| Block file | Fields referenced |
|---|---|
| `hero_full.html` | `image`, `title`, `description`, `primary_cta_link/name`, `secondary_cta_link/name` |
| `base_card.html` | `image`, `title`, `description`, `service_types`, `primary_cta_link`, `primary_card_cta_text`, `secondary_cta_link/name` |
| `cta_button.html` | `cta_button_link`, `cta_type`, `button_size`, `cta_button_text` |
| `activity_boxes.html` | `activity_box_items` (matrix) |
| `annual_reports_blocks.html` | `featured_annual_report`, `youtube_url_id`, `annual_reports` (matrix) |
| `contact_us_block.html` | `title`, `subtitle`, `feathery_id` (Feathery form embed id) |
| `dynamic_stories_carousel.html` | `locations`, `divisions`, `territories` (scoping), `article_tags` |
| `fundraising_thermometer_block.html` | `title`, `donate_button_url/text`, `goal`, `raised` |
| `general_accordion.html` | `title`, `accordion_items` (matrix), `open_first_accordion_item` |
| `generic_image_text_button_block.html` | `title`, `body`, `cta_buttons_alignment`, `cta_button_link/text`, `cta_button_link_2/text_2`, `should_link_open_to_a_new_tab[_2]` |
| `greatest_need.html` | `title`, `url`, `open_in_a_new_tab`, `button_text` |
| `info_block.html` | `icon_name`, `title`, `description` |
| `mobile_desktop_location_card_block.html` | `locations` (matrix) |
| `mobile_desktop_videos.html` | `media_1/2/3` (video/image), `media_1/2/3_title` |
| `our_vision.html` | `left_column_icon/title/description`, `right_column_icon/title/description` |
| `profile_card_block.html` | `staff_and_community_leaders` (relationship, multi) |
| `service_selector.html` | `services` (matrix) |
| `stats_block.html` | `stats` (matrix) |
| `stories_carousel.html` | `stories_entries` (matrix) |
| `theater_space_block.html` | `hero_sliders`, `primary_card`, `secondary_card` |
| `way_to_give_block.html` | `service_info_cards` (matrix) |

Flag: `base_card.html` and `hero_full.html` (blocks) look like earlier iterations of `modules/hero-full` and `components/card` — worth confirming with wendell whether they're still actively used in any WYSIWYG content, or dead.

---

## 11. Site-wide singletons

- **Globals** (`globals.*`): `default_og_image`, `services_all_image`, `site_name`. Referenced from `custom_head`, `modules/hero`, `modules/services`. This is Zesty's built-in "Globals" content group, not a page model.
- **Clippings** (`clippings.*`): `default_images` (media list, used as random hero/news fallback images), `custom_analytics_scripts` (raw script injected only on `set_zuid == 6-c2b7f2a9ad-k4frxv`). Zesty's built-in "Clippings" reusable-snippet feature.

---

## Open Questions / Flags

1. **No schema source of truth in-repo.** All types above are inferred from usage; confirm against the live instance via the `zesty` MCP server (`get-models`, `get-fields`) before treating any "inferred type" as fact.
2. **Hero field-name drift** (§9): at least 3 different field-naming conventions (`hero_image`/`title`/`subtitle` vs `image`/`title`/`body` vs `image`/`name`/`body`) across hero-full variants, plus a 4th shape in the Block Library `hero_full.html` (`description` instead of `subtitle`). This looks like organic drift across copies rather than a deliberate design — worth confirming with wendell whether these should be consolidated to one model/field set.
3. **`article_tags`** is referenced on Stories/story cards but every usage is commented out in the live templates (`webengine/views/stories`, `modules/news`) — field may exist on the model but is currently unused in the UI. Confirm whether tags are still a planned feature.
4. **`corps`** page-type view is a 0-byte file — either an unfinished/unused content model or content intentionally has no dedicated template. Needs a decision, not a guess.
5. **Information Page Types** model is referenced (`information_page_types.filter(...)`) but has no page template of its own — appears to be a pure lookup/taxonomy model.
6. **Duplicate/near-duplicate Block Library items** (`base_card.html`, `hero_full.html`) vs. their module counterparts — confirm if still in use before documenting them as "current."
