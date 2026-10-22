# Content Models

Status: Draft — pending review
Last generated: 2026-10-15 by zesty-ai:documentation (automated codebase scan of webengine/views on development; seeded from the 2026-09-25 agent-lab doc)

## How this document was built (read this first)

| Item | Detail |
| --- | --- |
| Sources | Field access in `webengine/views/**` on `development` working tree (`this.<field>`, `<model>.filter(...).<field>`, `{{each <model> ...}}`, `find_in_set(...)` queries, JSON endpoints, Block Library files). Git history (`git log development`) for recent work. `zesty.config.json` for view ZUIDs and view types only. |
| Seed | Older doc `the-salvation-army-agent-lab/docs/content-models.md` (2026-09-25, ~120 commits behind). Every model, field, ZUID and path was re-checked against the current tree. Claims that could not be re-verified were dropped or moved to Open Questions / Flags. |
| Schema file | **None exists.** `zesty.config.json` (instance `8-da979ebeab-d59gnx`) maps **views** (`11-…` ZUIDs and view type such as `pageset`/`templateset`/`snippet`), not **models** (`6-…`) or fields. `webengine/views/model-info.json` and `models-info.json` are Parsley endpoints, not schema. |
| Field shapes | **Inferred from templates.** Names are copied from template code (reliable). Types and required-ness are best guesses from usage. **The template being changed is the final word.** |
| Not done | No instance lookups (`get-models`, `get-fields`), no API calls, no database access. Fields that exist on the instance but that no template reads are invisible here. |
| Labels | **[V]** verified in code (path cited). **[I]** inferred from usage. **[U]** unknown / not verifiable from the repo. |
| Model ZUIDs | Only appear in code as constants. Main source: `webengine/views/modules/client-global-navigation:38-55` and `:268`. Other sources cited per row. |
| Tracking note | `docs/` is in `.gitignore` (line 9), so this file is not tracked on `development`. `webengine/views/z/` and `webengine/views/menu-config/` are platform-synced paths and were not scanned for models. |

Terms: **org trio** = the optional `territory` / `division` / `location` relationship fields that scope a page to a level of the org hierarchy (National > Territory > Division > Location).

## Model index

Type comes from `zesty.config.json` view type when the view is listed there: `pageset` = multi page, `templateset` = single page, none = not listed. "Not in config" means the view file exists in the tree but has no entry in `zesty.config.json` (not yet synced or mapped; ZUID cannot be confirmed from the repo).

| Model | ZUID | Type | Rendered by | Notes |
| --- | --- | --- | --- | --- |
| National / Homepage | `6-a0898ca2c1-krnm0f` [V] (`client-global-navigation:40`) | single page (view `homepage` is `templateset`) | `webengine/views/homepage` | Model-to-view link inferred from name. |
| Territories | `6-deab97cfd9-wb5km4` [V] (`:38`) | multi page | `webengine/views/territories` | 4 territories hardcoded in `client-global-navigation:3-6`. |
| Divisions | `6-acb19a94bd-4q8ftj` [V] (`:39`) | multi page | `webengine/views/divisions` | |
| Locations | `6-b4c9aba69c-h2nqvm` [V] (`:1`) | multi page | `webengine/views/locations` | Largest model by usage. |
| States | `6-ce888daf92-fpzvz1` [V] (`:54`) | multi page | `webengine/views/states` | Also read as Instant API list in `modules/upcoming-events:103`. |
| Cities | `6-dcd5c9b192-tgsnht` [V] (`:55`) | multi page | `webengine/views/cities` | |
| Country | not in code [U] | multi page | `webengine/views/country` | Autolayout stub, no custom fields. |
| Properties Types | not in code [U] | multi page | `webengine/views/properties_types` | Stub; used as lookup (`api/property-type.json`). |
| Services | `6-fef1bbcecc-cjfmfq` [V] (`:41`) | multi page | `webengine/views/services` | |
| Service Types | not in code [U] | lookup | none (queried as `service_types`) | `webengine/views/services_types` is an autolayout stub and is not in config. |
| Service Info Cards | not in code [U] | dataset | `modules/benefits-perks` | Queried as `service_info_cards`. |
| Service Areas | not in code [U] | multi page (view `service_area`) | `webengine/views/service_area`, `service-areas.json` | Queried as `service_areas` in the JSON endpoint. |
| Stories | `6-80c7e29486-k0pq6s` [V] (`:51`) | multi page | `webengine/views/stories` | |
| All Stories | `6-8cdcc4c1bf-r8jnvc` [V] (`:53`) | single page (view `stories_new` is `templateset`) | `webengine/views/stories_new` -> `modules/all-stories-archive` | View-to-model link inferred. |
| Tags | `6-aef7cebfd9-q7q7lh` [V] (`:268`) | multi page [I] | `webengine/views/tags` -> `modules/tags-archive` | New 2026-10-14. Views `tags`, `tag`, `tags_pages` are not in config. |
| Events | `6-a2dbc1a6e2-x4pzmx` [V] (`:50`) | multi page | `webengine/views/events` | |
| Stories Landing Page | `6-f8c59d8382-h4z4pc` [V] (`:45`) | multi page | `webengine/views/stories_landing_page` -> `modules/news-archive` | |
| Events Landing Page | `6-c4d6a894f1-rtzv2z` [V] (`:46`) | multi page | `webengine/views/events_landing_pages` | |
| About Us | `6-b29d85ada7-5kzkcc` [V] (`:44`) | multi page | `webengine/views/about_us` | |
| Contact Us | `6-aa8c819c86-953qkz` [V] (`:43`) | multi page | `webengine/views/contact_us` | |
| Informational Pages | `6-c2b7f2a9ad-k4frxv` [V] (`:49`) | multi page | `webengine/views/informational_pages` | `informational_pages_dev` is a separate pageset (`{{this.meta_title}}` only). |
| Volunteer Pages | `6-8489c3a590-kn21jh` [V] (`:48`) | multi page | `webengine/views/volunteer_pages` | |
| Leadership Landing Page | `6-cee4dda7e4-0md6ts` [V] (`:47`) | multi page | `webengine/views/leadership_landing_page` | |
| Location Finder | `6-8e91efbf9b-jqqxjt` [V] (`:52`) | single page (view `location_finder` is `templateset`) | `webengine/views/location_finder` -> `modules/location-finder` | |
| Stuff the Bus | not in code [U] | single page (`templateset`) | `webengine/views/stuff_the_bus` | New since seed doc. |
| Angel Tree Campaign | not in code [U] | single page (`templateset`) | `webengine/views/angel_tree_campaign` | New since seed doc. |
| Staff (Staff and Community Leaders) | `6-98d1cbd695-tb73kj` [V] (`datasets/mobile_editor/navigation/navigation_links.json:21`) | dataset | `staff.json` endpoint | Queried as `staffs`. |
| Staff Role Types | not in code [U] | dataset | `staff_role_types.json` | |
| FAQs | not in code [U] | dataset | `modules/faqs` | |
| Stats | `6-d2dfc089be-s4p9pv` [V] (`datasets/mobile_editor/query/getExtenderFieldData.json:64`) | dataset | `stats-info.json` -> `modules/stats` | |
| Hero Sliders (`matrix_hero_sliders`) | `6-d4c0fbbee5-8j61c9` [V] (`datasets/mobile_editor/query/getHeroSliders.json:30`) | dataset | `modules/hero` | |
| Globals (alias `clippings`) | not in code [U] | site-wide singleton | many (section 10) | Old doc's ZUID `6-de95fda1c1-dxht20` is not in the tree. |
| Information Page Types | not in code [U] | lookup | none | Queried in `generate-csv`. |
| Program Schedule items | not in code [U] | dataset | `modules/programs-schedule` | Linked from Services by `matrix_program_schedule`. |
| Unnamed model `6-f0f2e8c49b-sdbvrb` | `6-f0f2e8c49b-sdbvrb` [V] | unknown | `components/header:670`, `components/header-dynamic:630` | Fetched via `/-/instant/<zuid>.json` for the service filter; name not stated in code. |
| `corps` | not in code [U] | n/a | `webengine/views/corps` is 0 bytes | Not in config. |
| `metro_area_command` | not in code [U] | n/a | `webengine/views/metro_area_command` (autolayout stub) | Not in config. |

## 1. Organizational hierarchy

### National / Homepage (`6-a0898ca2c1-krnm0f`)

Purpose: the national root page and the "National" scope used as the fallback when no org context exists.

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `map_excerpt_subtext`, `map_excerpt_description` | text / rich text [I] | no | `modules/map:28,30` | Included by `homepage`, `territories`, `divisions`. |
| `address` | text | no | `modules/map:97` | Map address. |
| `featured_article` | relationship -> Stories [I] | no | `modules/news:75-76` | Looks up `stories` by `z.zuid`. |

Relationships: hero slides are not page fields; see section 7. `homepage.first().zuid` is used as the National ID (`modules/stats:290`).

### Territories (`6-deab97cfd9-wb5km4`)

Purpose: top level of the org hierarchy (West, East, South, Central; ZUIDs `client-global-navigation:3-6`).

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `name` | text | yes [I] | everywhere | Display name. |
| `territory_code` | text | no | `data_code:31` | 3-letter code in `page_type` for Tealium (`SAL:<code>`). |
| `address`, `zipcode` | text | no | `client-global-navigation:176,187`, `modules/map-contact` | |
| `city` | relationship -> Cities | no | `client-global-navigation:178,180` | Resolved with `cities.filter(...)`. |
| `state` | relationship -> States | no | `client-global-navigation:179,181` | Resolved with `states.filter(...)`. |
| `contact_us_image` / `contact_us_title` / `contact_us_cta_header` | image / text / text | no | `client-global-navigation:184-186` | Contact-us CTA fallback content. |
| `classy_url`, `classy_url_mobile` | URL | no | `client-global-navigation:65-68,118-121` | Classy donation links. |
| `classy_campaign_id`, `classy_org_id` | text | no | `client-global-navigation:108-116` | Read for all four territories. |
| `dgioh_id` | text | no | `client-global-navigation:100-103` | Purpose not stated in code [U]. |
| `image_button_text_title_left` (+ `_description_left`, `_cta_name_left`, `_cta_link_left`, `_image_left`) | text / image | no | `territories:7`, `modules/image-button-text`, `modules/donate` | Module renders only if the title is set. |
| `map_excerpt_subtext`, `map_excerpt_description` | text | no | `modules/map:28,30` | |

Relationships: parent of Divisions and Locations via their `territory` field. Hero slides come from Hero Sliders, not page fields.
Known drift: hero for Territories/Divisions/Locations uses `modules/hero` (sliders), unlike the `hero-full-*` page-field heroes (section 9).

### Divisions (`6-acb19a94bd-4q8ftj`)

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `name` | text | yes [I] | everywhere | |
| `division_code` | text | no | `client-global-navigation` (11 uses) | |
| `territory` | relationship -> Territories | no | `client-global-navigation:155` | |
| `address`, `zipcode`, `city`, `state` | text / relationship | no | `client-global-navigation:150-152,164-169` | `city` -> Cities, `state` -> States. |
| `contact_us_image` / `contact_us_title` / `contact_us_cta_header` | image / text / text | no | `client-global-navigation:156-158` | |
| `classy_url`, `classy_url_mobile` | URL | no | `client-global-navigation` | |
| `map_excerpt_subtext`, `map_excerpt_description` | text | no | `modules/map:28,30` | |

### Locations (`6-b4c9aba69c-h2nqvm`)

Purpose: one item per local site (corps, thrift store, center). The most-queried model (260 `locations.filter` calls).

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `name`, `site_name` | text | `name` yes [I] | `client-global-navigation:132-133` | `site_name` is read at `:133`; its output use is not traced [U]. |
| `territory`, `division` | relationship | no | `client-global-navigation:127-128` | |
| `address`, `zipcode`, `contact_number` | text | no | `components/map-contact-information-pointer`, `thrift-store-locations.json` | |
| `city` | relationship -> Cities | no | `client-global-navigation:125-126` | Resolved to `cities.title` (some templates read `.name`, see Cities). |
| `state` | relationship -> States | no | `client-global-navigation:129-130` | |
| `hours_of_operation` | text | no | `components/map-contact-information:12,19`, `components/map-contact-information-pointer:13` | |
| `latitude`, `longitude` | text | no | `thrift-store-locations.json`, `-/block/mobile_desktop_location_card_block.html:9` | |
| `property_type` | relationship -> Properties Types [I] | no | `modules/services:12-13`, `api/property-type.json:2-6` | See drift note. |
| `page_layout` | select (`simplified` / other) | no | `locations` (`!= "simplified"` gates hero, services, stats), `client-global-navigation:737` | Value is also written to cookie `location_property_type`. |
| `redirect_url` | URL | no | `locations` (301 unless `?redirect=` overrides), `thrift-store-locations.json` | |
| `services_offered` | relationship (multi) | no | `services-offered` view, `thrift-store-locations.json` | Each item output with `toJSON()`. Target model not named in code [U]. |
| `contact_us_image` / `contact_us_title` / `contact_us_cta_header` | image / text / text | no | `client-global-navigation:136-138` | |
| `classy_url`, `classy_url_mobile` | URL | no | `client-global-navigation` | |
| `map_excerpt_title`, `map_cta_nav_text`, `map_cta_nav_link` | text / URL | no | `modules/map-with-info-contact:9-13` | Only on Contact Us pages scoped to a location. |
| `og_image` | image | no | `paginated-locations.json`, `datasets/mobile_editor/content_list/locations.json` | Mobile editor list. |
| `featured_article` | relationship -> Services [I] | no | `modules/service-wy-landing`, `modules/programs-schedule-landing` | Same name as the Stories-pointing field on Homepage. |

Relationships: `territory`, `division` point up; `city`, `state`, `property_type`, `services_offered` point sideways. Stories, Events, Staff point to Locations from their own `property` / `member_locations` fields.
Known drift: `locations.property_type` is compared to ZUID `7-c8a6abd0b7-xbhndn` in `modules/services:13` but to the string `"thrift_store"` in `thrift-store-locations.json:2`. Both cannot match the same stored value (see Flags F-04).

### Cities

ZUID `6-dcd5c9b192-tgsnht`. View: `cities` -> `modules/hero-full-cities` + `modules/zip-search`.

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `title` | text | yes [I] | 44 `cities.filter(...).title` uses; `modules/upcoming-events` (Instant `content.title`) | Primary name field. |
| `name` | text | [U] | `components/map-contact-information-pointer:45,61` | Read in a few places instead of `title`; see Flags F-05. |
| `state` | relationship -> States | no | `client-global-navigation:196` | |
| `hero_image`, `seo_meta_title` | image / text | no | `modules/hero-full-cities:1,6,20` | Hero renders only if `seo_meta_title` is set. |

Known drift: Cities has no `territory` field. Territory context is derived through `states.filter(this.state).territory` (`client-global-navigation:196-198`). Do not add a direct field to fix that.

### States

ZUID `6-ce888daf92-fpzvz1`. View: `states` -> `modules/hero-full-state` + `modules/state-list`.

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `name` | text | yes [I] | 42 uses; `modules/upcoming-events` (Instant `content.name`) | |
| `state_code` | text | no | `stories:42`, `events`, `thrift-store-locations.json` | Two-letter code. |
| `territory` | relationship -> Territories | no | `client-global-navigation:189-190` | Drives the state page's territory context. |
| `image`, `seo_meta_description` | image / text | no | `modules/hero-full-state:7,25` | `seo_meta_description` sits inside an HTML comment at `:25` (still evaluated, not shown). |

### Country / Properties Types

`country` and `properties_types` views are unmodified `autolayout()` stubs (`webengine/views/country`, `webengine/views/properties_types`). `properties_types` has a `name` field read by `api/property-type.json:6`. Special property-type ZUIDs `7-b29cb08fe5-379fqs` (adult rehab), `7-a0f48bbaad-gzx0rj` (Kroc), `7-d2e39fdd9e-hfnxcs` (family center) are mapped to cookie values in `client-global-navigation:57-59,309-313`.

## 2. Services

### Services (`6-fef1bbcecc-cjfmfq`)

Purpose: service pages at national, territory, division or location level. Org level is inferred from which org-trio fields are set (`get-services-national:5`, `get-services-territories`, `-divisions`, `-locations`).

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `title`, `subtitle` | text | title yes [I] | `get-services-national`, `modules/programs-schedule-landing` | `subtitle` is the card excerpt. |
| `service_type` | relationship -> Service Types | no | `services`, `modules/services-service-area`, `get-services-national` | |
| `service_page_icon` | text (icon name) | no | `get-services-national` | Falls back to `service_types.icon_name`. |
| `display_in_services_navigation_dropdown` | boolean | no | `get-services-national` (`display_on_nav`) | |
| `seo_meta_title`, `seo_meta_description`, `seo_meta_keywords` | text | no | `get-services-national`, `components/service-card:5-6` | Also used as search-index attributes. |
| `territory`, `division`, `location` | relationship | no (nullable) | `get-services-*`, `modules/service-wy` | |
| `page_intro` | rich text | no | `services` | Shown above the body if set. |
| `service_body` | rich text | no | `modules/service-wy`, `modules/service-wy-landing` | Heading text varies by org level (`modules/service-wy`). |
| `hero_image` | image | no | `modules/programs-schedule-landing` | |
| `matrix_program_schedule` | relationship (multi) -> Program Schedule items | no | `modules/programs-schedule` | Ordered by `find_in_set`. |

Relationships: `service_type` -> Service Types; `matrix_program_schedule` -> Program Schedule items; Stories point here through `related_service`; Info Cards through `service_page`. The `services` view renders `modules/hero-full-donate`, so Services carry the `hero_image` / `title` / `subtitle` / CTA hero set (section 9).

### Service Types

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `title` | text | yes [I] | `get-services-national`, 7 `service_types.filter(...).title` uses | |
| `icon_name` | text | no | 16 uses | Material Symbols name. |
| `sort_order` | number | no | `get-services-national` | |
| `national_service_body_content` | rich text | no | `services` | National-level fallback body. |

### Service Info Cards ("How We Serve", `modules/benefits-perks`)

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `service_page` | relationship -> Services | yes [I] | `modules/benefits-perks:1,17` | Filter `service_page = this.zuid`. |
| `icon_name`, `title`, `description`, `sort_order` | text / number | no | `modules/benefits-perks` | |

### Program Schedule items

Fields read in `modules/programs-schedule`: `title`, `pseudo_multiselect_days`, `time`, `timezone`, `program_schedule_location`, `link`, `description` [V]. A separate `program_schedule.json` endpoint exists but only holds a test query, not model fields.

### Service Areas

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `name` | text | [I] | `modules/hero-full-service-area`, `components/service-area-contact-detail` | |
| `body` | rich text | no | `modules/service-area-body-details`, `components/service-area-body` | |
| `contact_name`, `contact_number`, `email` | text | no | `components/service-area-contact-detail` | |
| `seo_meta_description` | text | no | `modules/hero-full-service-area:26` | Hero body text. |
| `image` | image | no | `modules/hero-full-service-area:8` | |
| `state`, `service_type` | relationship | no | `service-areas.json` (`state = <zuid>`, `find_in_set(service_type)`) | Used by the zip search. |
| `form_embed` | embed / rich text | no | `modules/service-area-form` | **Not rendered:** no view or module includes `service-area-form` (see F-06). |

## 3. Stories, Tags and Events

### Stories (`6-80c7e29486-k0pq6s`)

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `title`, `body`, `image`, `author` | text / rich text / image / text | title yes [I] | `stories`, `stories.json` | |
| `story_date_picker` | date | no | `stories:100,461`, `stories.json`, `tags_stories.json` | Formatted server-side with `.date(F j, Y)` (`stories:461`), then written to a script. |
| `city`, `state` | relationship -> Cities / States | no | `stories:41-42` | Builds the "City, ST" line (`title`, `state_code`). |
| `page_layout` | select: `No Image`, `Image Landscape`, `Image Landscape No Sidebar`, `Image Thumbnail` (empty = plain) | no | `stories:60,84,190,253` | Controls the whole detail layout. |
| `primary_cta_name`/`_link`, `secondary_cta_name`/`_link` | text / URL | no | `stories` | |
| `external_url` | URL | no | `stories:44-45,140-144` | If set, the page 301-redirects. Also a "Read More" link. |
| `property` | relationship (multi) -> Locations | no | `stories:37`, `find-story.json:6`, `tags_stories.json` | Resolves a URL and name into variables that are not output. Admin label may read "Properties"; the target is Locations [I]. |
| `divisions` | relationship (multi) -> Divisions | no | `find-story.json:12`, `tags_stories.json` | |
| `territory` | relationship (multi) -> Territories | no | `find-story.json:18`, `get-stories-by-location.json` | **Singular name**, unlike Events' `territories`. |
| `related_service` | relationship -> Services | no | `stories.json` | Service badge on cards. |
| `article_tags` | relationship (multi) -> Tags | no | `-/block/dynamic_stories_carousel.html:50,65`, `tags_stories.json:38,45`, `stories:179,354,416` | Live in the carousel block and the tags endpoint. In `stories` the tag loops sit inside `<!-- -->`. |
| `seo_meta_description` | text | no | `stories.json` | Card excerpt. |

Relationships: org scoping uses `property` -> `divisions` -> `territory` cascade (`find-story.json`, `-/block/dynamic_stories_carousel.html:6-27`, `datasets/mobile_editor/content_list/stories.json`). `find_in_set(...)` / `LIKE` queries are consistent with multi-value relationship fields [I]. The seed doc said these are `one_to_many` per a live check; that check was not repeated (F-02).
Known drift: Stories uses `territory`; Events uses `territories`. Shared scoping code must branch on the field name.

### Tags (`6-aef7cebfd9-q7q7lh`)

Purpose: tag landing pages listing stories tagged with the page's own item. Added in `cf09058` "New Tags Pages Update" (2026-10-14) and `4426174` "Tags model zuid".

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `name` | text | yes [I] | `components/tags-archive-search:2,8` | Page heading and search label. |
| `tag_icon` | text (icon name) | no | `stories:181` (inside HTML comment) | Only read in the hidden tag pills. |

Behaviour: `webengine/views/tags` includes `modules/tags-archive`. The page calls `datasets/mobile_editor/content_list/tags_stories.json?tag=<this.zuid>` (`modules/tags-archive:69-91`), which filters Stories with `find_in_set('<tag>', article_tags)` and optional `property`+`model` org filters (`tags_stories.json:25-45`). `client-global-navigation:2459` has a `case TAGS_MODEL_ZUID` that keeps the persisted location cookie and defaults to National if none.
Known drift: `webengine/views/modules/tags/client-global-navigation` and `modules/tags/schema` are synced snippets (config entries `/modules/tags/*`) but nothing includes them; `custom_head:106,217` includes the non-tags versions. `webengine/views/tags-pages` is an empty directory (config lists `/tags-pages/*/index.parsley`). `webengine/views/tag` and `tags_pages` are `autolayout()` stubs.

### Events (`6-a2dbc1a6e2-x4pzmx`)

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `title` | text | yes [I] | `events:15` | |
| `territories`, `divisions`, `property` | relationship (multi) | no | `get-events.json:3-6`, `find-event.json:6,12,18`, `modules/upcoming-events:123-125` | **Plural `territories`.** `property` -> Locations. |
| `city`, `state` | relationship -> Cities / States | no | `events` (Location block), `get-events.json` | |
| `address` | text | no | `events` (Location block, Maps link) | |
| `event_date_with_time`, `event_end_date_with_time` | datetime | no | `events:93`, `get-events.json` | Formatted server-side `.date(F j, Y h:iA)`. |
| `date_time_summary` | text | no | `events`, `get-events.json` | Shown if no datetimes; else "No specific date". |
| `page_layout` | select: `Image Landscape`, `Image Thumbnail`, `No Image`, `Blank` | no | `events:23,41,53,139` | Option list differs from Stories. `No Image` shows a map. |
| `image` | image | no | `events`, `get-events.json` | |
| `body` | rich text | no | `events` | |
| `primary_cta_name`/`_link`, `secondary_cta_name`/`_link` | text / URL | no | `events` | |
| `contact_person_name`, `contact_email`, `contact_number` | text | no | `events` | Each shown if present. |

Behaviour: the upcoming-events carousel loads from `/get-events.json` (one call, up to 5 org ZUIDs, `field` = `property` / `divisions` / `territories` / `any`; `modules/upcoming-events:101-102`), then resolves city and state names through the Instant API (`:103,392`). Events whose end or start is within the last day or later are returned, max 100 (`get-events.json`). Related commits: `cd2e0aa`, `2a5979a`, `f35aec9`.
Known drift: `events` builds the calendar link from `this.date` and `locations.filter(this.parent_zuid).address`; `this.date` is not a field seen elsewhere [U] (F-07).

## 4. Landing and informational page models

Shared shape: `title` plus the org trio (`territory`, `division`, `location`), mostly optional. The CSV exporters (`generate-csv`) filter these models by the org trio.

| Model | Extra fields (verified) | Notes |
| --- | --- | --- |
| About Us | `hero_image`, `title`, `subtitle`, CTAs (via `modules/hero-full`); `image_button_text_full_*` (via `modules/image-button-text-full`); `local_need_*` (via `modules/local-needs`, see section 7) | `webengine/views/about_us`. Also includes `modules/stats`, `modules/leadership-list`. |
| Contact Us | `hero_image` (`modules/contact-us:8`), `contact_us_form` (`modules/contact-form:1`), `location` | If `location` is set it renders `map-with-info-contact` + `contact-us-officers`, else `map-contact` (`contact_us`). `services-info.json` reads the org trio and `truepath`. |
| Informational Pages | `template_layout`, `external_link`, `page_type`, `navigation_parent`, `display_on_header_navigation`, `national` | `template_layout == 1` uses `autolayout`; else `modules/generic`, or 301 to `external_link`. `get-informational-page-links:30,66` filters on `display_on_header_navigation`, `navigation_parent` (default `more`), location/division/territory (`find_in_set`, so a page listed under several locations shows in each location's nav, and in the nav of the division or territory those locations resolve to), `national`. `page_type` -> Information Page Types (`generate-csv:127`). `location`, `division`, `territory` are `one_to_one` (Instance API read, 2026-10-19); code accepts one ZUID or a comma-separated list so they can become `one_to_many` without code changes. Owner resolution: see `custom-patterns.md` P-02. |
| Volunteer Pages | `template_layout`, `external_link` | Same view logic as Informational Pages. `get-volunteer-page` finds a page by `location`, `division`, `territory`, with a central fallback. |
| Leadership Landing Page | org trio, `title`, `body`, `image` (`modules/hero-full-leadership`) | `leadership_landing_page` includes `modules/leadership-list`. |
| Stories Landing Page | org trio | View includes `modules/news-archive`. |
| Events Landing Page | org trio, `hero_image`, `title` (`modules/hero-full-events`) | Also `modules/upcoming-events`, which reads `location`/`division`/`territory` (`:116-118`). |
| Location Finder | none read by the view | `webengine/views/location_finder` is a one-line include of `modules/location-finder`. |
| All Stories (`stories_new`) | none read by the view | Includes `modules/all-stories-archive`. |
| Stuff the Bus | `hero_image`, `title`, `subtitle`, `content`, `content_2`, `map_heading`, `map_content`, `map_filter_instructions` | `webengine/views/stuff_the_bus`. New. |
| Angel Tree Campaign | `hero_image`, `title`, `subtitle`, `content`, `content_2`, `map_heading`, `map_content` | `webengine/views/angel_tree_campaign`. New. |

Notes:
- Angel Tree and Stuff the Bus pages get their map data from external sources, not from Zesty models: `angel-tree-data.json` and `angel-tree-dummy-data.json` hold static JSON, and `angel-tree-script` calls Quickbase. They are Zesty views, not content models. See F-01 for a security flag on `angel-tree-script`.
- `webengine/views/news_archive` is a one-line include of `components/news-archive-search` (not `modules/news-archive`) and is not in config.
- `webengine/views/corps` is a 0-byte file and not in config (F-08).

## 5. People

### Staff (`6-98d1cbd695-tb73kj`, queried as `staffs`)

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `first_name`, `last_name` | text | yes [I] | `staff.json` | Combined into `fullname` in the JSON. |
| `title_rank`, `job_role`, `email` | text | no | `staff.json` | `title_rank LIKE '%General%'` is a query filter. |
| `about` | rich text | no | `staff.json` | |
| `portrait_image` | image | no | `staff.json` (`.getMediaURL()`) | |
| `member_locations`, `member_divisions`, `member_territories` | relationship (multi) | no | `staff.json:9-20` | Chosen by the `model` query parameter. |
| `national_member` | boolean | no | `staff.json:56,85` | National leaders. |
| `staff_role_type` | relationship -> Staff Role Types | no | `staff.json` | |
| `display_on_website` | boolean | no | `staff.json` | |
| `sort_order` | number | no | `staff.json` | |

Known drift: the seed doc listed `fullname`, `property`, and `staff_role_types` multi-select; none of those are read now. `staff.json` hard-excludes one staff ZUID (`7-8ed48083e0-hgjwqf`, `staff.json:56,85`).

### Staff Role Types

Fields: `role_name`, `displayed_on_website` [V] (`staff_role_types.json:2-4`). The loop variable is `srt` but the body outputs `staff_role_type.*` (F-09).

## 6. FAQs

| Field | Type | Required | Used in | Notes |
| --- | --- | --- | --- | --- |
| `topic` | select | no | `modules/faqs:11,59` | Values seen in the module include `financial_donations`, `in_kind_donations`. The full list is hardcoded as `WHERE topic = '...'` blocks. |
| `question`, `answer` | text / rich text | no | `modules/faqs:21,40` | |

## 7. Stats, local needs and hero sliders

### Stats (`6-d2dfc089be-s4p9pv`)

Fed to `modules/stats` by `stats-info.json`. Scope cascade: Location -> Division -> Territory -> `national = 1`.

| Field | Used in | Notes |
| --- | --- | --- |
| `stats_name`, `stats_sub_text`, `categories`, `description`, `image` | `stats-info.json` | |
| `right_side_header`, `right_side_content` | `stats-info.json` | Output with `striptags()`. |
| `general_statistic` | `stats-info.json`, `modules/stats:281` | `"1"` marks the "general" filter. |
| `source_url`, `related_service` | `stats-info.json:42-43` | `related_service` -> Services, output as a path. New since seed doc. |
| `territories`, `divisions`, `locations` | `stats-info.json` | Scoping (multi). |
| `national` | `stats-info.json:83,152` | Fallback flag. |

### Page-level stat and local-need fields

| Field set | Module | Notes |
| --- | --- | --- |
| `stat_title_1..3`, `stat_subtitle_1..3` | `modules/stats-modules` | On the page item. Included by `services`. |
| `local_need_title_1..3`, `_subtitle_`, `_icon_name_`, `_link_`, `_link_text_`, `_external_link_` | `modules/local-needs` | On the page item. `modules/local-needs` does **not** read `stat_title_*`. Included by `about_us`. External link wins over internal link [I]. |

### Hero Sliders (`matrix_hero_sliders`, `6-d4c0fbbee5-8j61c9`)

| Field | Used in | Notes |
| --- | --- | --- |
| `title`, `content`, `image` | `modules/hero:610-642` | |
| `primary_cta_link`/`_name`, `secondary_cta_link`/`_name` | `modules/hero:646-665` | |
| `sort_order` | `modules/hero:552` | |
| `display_on_national` | `modules/hero:482`, `hero-content.json` | |
| `display_on_territories`, `display_on_divisions`, `display_on_locations` | `modules/hero:486-511`, `datasets/mobile_editor/query/getHeroSliders.json:11` | Multi (`find_in_set`). |

`modules/hero` fetches `/-/gql/matrix_hero_sliders.json` (`modules/hero:533`). The platform feature must be enabled in the instance's developer settings; that is a platform claim not verifiable from the repo (PLATFORM QUESTION (zesty): is `/-/gql/` enabled on this instance?). `hero-content.json` is an alternative server-side query using the same fields.

## 8. Block Library (`webengine/views/-/block/*.html`)

Reusable blocks editors drop into WYSIWYG content, each with its own field shape. Separate from page views.

| Block file | Fields referenced |
| --- | --- |
| `hero_full.html` | `image`, `title`, `description`, `primary_cta_link/name`, `secondary_cta_link/name` |
| `base_card.html` | `image`, `title`, `description`, `service_types`, `primary_cta_link`, `primary_card_cta_text`, `secondary_cta_link/name` |
| `cta_button.html` | `cta_button_link`, `cta_type`, `button_size`, `cta_button_text` |
| `activity_boxes.html` | `activity_box_items` (matrix) |
| `annual_reports_blocks.html` | `featured_annual_report`, `youtube_url_id`, `annual_reports` (matrix) |
| `contact_us_block.html` | `title`, `subtitle`, `feathery_id` |
| `dynamic_stories_carousel.html` | `locations`, `divisions`, `territories` (scoping), `article_tags`, `title` |
| `fundraising_thermometer_block.html` | `title`, `donate_button_url/text`, `goal`, `raised`, `end_date` |
| `general_accordion.html` | `title`, `accordion_items` (matrix), `open_first_accordion_item` |
| `generic_image_text_button_block.html` | `title`, `body`, `cta_buttons_alignment`, `cta_button_link/text`, `cta_button_link_2/text_2`, `should_link_open_to_a_new_tab[_2]` |
| `greatest_need.html` | `title`, `url`, `open_in_a_new_tab`, `button_text` |
| `info_block.html` | `icon_name`, `title`, `description` |
| `mobile_desktop_location_card_block.html` | `locations` (relationship to a Location; reads `city`, `state`, `latitude`, `hours_of_operation`) |
| `mobile_desktop_videos.html` | `title`, `media_1/2/3`, `media_1/2/3_title` |
| `our_vision.html` | `title`, `left_column_icon/title/description`, `right_column_icon/title/description` |
| `profile_card_block.html` | `title`, `staff_and_community_leaders` (relationship, multi) |
| `service_selector.html` | `title`, `services` (matrix) |
| `stats_block.html` | `title`, `stats` (matrix) |
| `stories_carousel.html` | `title`, `stories_entries` (matrix) |
| `theater_space_block.html` | `hero_sliders`, `primary_card`, `secondary_card` |
| `way_to_give_block.html` | `service_info_cards` (matrix) |
| `side_by_side_hero_image.html`, `sustainability_in_action.html`, `staff_and_leadership.html` | None. Each renders Zesty's "Template File is empty" scaffold (`alert-title`, line 51). Not built. |

## 9. Shared field conventions

### Org-scoping fields

| Models | Field names | Notes |
| --- | --- | --- |
| Services, Informational Pages, Volunteer Pages, Contact Us, About Us, landing pages | `territory`, `division`, `location` (singular) | `get-informational-page-links`, `get-volunteer-page`, `generate-csv`. For Informational Pages, code treats each as one ZUID or a comma-separated list. |
| Stories | `property`, `divisions`, `territory` | Multi-value. |
| Events | `property`, `divisions`, `territories` | Multi-value. |
| Staff | `member_locations`, `member_divisions`, `member_territories` | `staff.json`. |
| Stats | `locations`, `divisions`, `territories` | `stats-info.json`. |
| Hero Sliders | `display_on_locations`, `display_on_divisions`, `display_on_territories`, `display_on_national` | `modules/hero`. |
| Blocks (`dynamic_stories_carousel`) | `locations`, `divisions`, `territories` | `-/block/dynamic_stories_carousel.html:6-27`. |

The same idea has at least six naming variants. The template being changed decides which one to use.

### Hero fields (page-field heroes, `modules/hero-full-*`)

| Module | Image field | Title-ish fields | CTA fields | Fallback image |
| --- | --- | --- | --- | --- |
| `hero-full` (About Us) | `hero_image` | `title`, `subtitle` | `primary_cta_link/name`, `secondary_cta_link/name` | `globals.default_og_image` (`:8,62,64`) |
| `hero-full-donate` (Services) | `hero_image` | `title`, `subtitle` | same | `globals.default_og_image` |
| `hero-full-events` | `hero_image` | `title` | none | `globals.default_og_image` |
| `hero-full-leadership` | `image` | `title`, `body` | none | `globals.default_og_image` |
| `hero-full-service-area` | `image` | `name`, `seo_meta_description` (`:26`); `body` only gates rendering (`:1`) | none | `globals.default_og_image` |
| `hero-full-state` | `image` | `name`; `seo_meta_description` (HTML comment, `:25`) | none | `clippings.hero_fallback_image` (`:35`) |
| `hero-full-cities` | `hero_image` | `seo_meta_title` | none | `clippings.hero_fallback_image` (`:33`) |
| `hero-full-404` | none | none | none | `clippings.hero_fallback_image` (`:7`) |
| `hero-full-angel-tree`, `hero-full-stuff-the-bus` | `hero_image` | `title`, `subtitle` | none | `globals.default_og_image` |
| Block `hero_full.html` | `image` | `title`, `description` | same as `hero-full` | `globals.default_og_image` |

The seed doc said only `custom_head` and `modules/hero` use `globals.default_og_image`. That is outdated: most hero modules use it (above). Territories, Divisions and Locations use slider-based `modules/hero` instead of page fields. `modules/contact-us` also uses `clippings.hero_fallback_image`.

### image-button-text field sets

| Module | Field prefix |
| --- | --- |
| `modules/image-button-text`, `modules/donate` | `image_button_text_{title,description,cta_name,cta_link,image}_left` |
| `modules/image-button-text-full` | `image_button_text_full_{title,description,cta_name,cta_link,image}` |
| `modules/become-a-member` | `image_button_text_full_bleed_{title,description,cta_name,cta_link,image}_left` |
| `modules/image-button-text-reverse`, `modules/partnership-opportunities` | `image_button_text_reverse_{title,description,cta_name,cta_link,image}` |

### Other shared conventions

| Convention | Fields | Notes |
| --- | --- | --- |
| SEO | `seo_meta_title`, `seo_meta_description`, `seo_meta_keywords` | Services read all three; Stories and Service Areas read the description. Cities repurpose `seo_meta_title` as the visible hero name. |
| CTAs | `primary_cta_name`/`_link`, `secondary_cta_name`/`_link` | Stories, Events, Hero Sliders, hero modules. Blocks use `cta_button_*` and `primary_card_cta_text` instead. |
| Contact-us fallback | `contact_us_image`, `contact_us_title`, `contact_us_cta_header` | Territories, Divisions, Locations; read in `client-global-navigation:136-186`. |
| Donation | `classy_url`, `classy_url_mobile` (+ `classy_campaign_id`, `classy_org_id` on Territories) | Territories, Divisions, Locations. |
| Map excerpt | `map_excerpt_subtext`, `map_excerpt_description` (Homepage, Territories, Divisions); `map_excerpt_title`, `map_cta_nav_text`, `map_cta_nav_link` (Locations) | `modules/map`, `modules/map-with-info-contact`. |
| Featured item | `featured_article` | Homepage -> a Story (`modules/news:75`); Locations -> a Service (`modules/programs-schedule-landing`). Same name, different targets. |

## 10. Site-wide singletons and globals

**Globals / Clippings** are one feature under two prefixes, `globals.*` and `clippings.*`; templates alternate between them (for example `custom_head` uses both). The Zesty docs name them "Globals (formerly Content Clippings)"; this scan only shows both prefixes in use, so treat them as one dataset until checked on the instance (F-03).

| Field | Used in | Notes |
| --- | --- | --- |
| `default_og_image` | `custom_head`, `modules/hero`, `modules/hero-full*`, `-/block/hero_full.html` | Default OG and hero fallback. |
| `hero_fallback_image` | `modules/hero-full-state`, `-cities`, `-404`, `modules/contact-us` | Distinct from `default_og_image`. Check which one sibling modules use before adding a hero. |
| `default_images` | `modules/hero`, `modules/news-cards`, `modules/upcoming-events`, `-/block/theater_space_block.html` | Media list for random fallback images. |
| `default_news_images` | `modules/all-stories-archive`, `modules/news-archive`, `modules/recent-stories`, `modules/tags-archive:580` | Story fallbacks. New since seed doc. |
| `services_all_image` | `modules/services`, `modules/services-service-area` | |
| `site_name` | `custom_head` | |
| `custom_analytics_scripts` | `custom_head:212-214` | Raw script injected only when `this.set_zuid == 6-c2b7f2a9ad-k4frxv` (Informational Pages). |
| `feathery_form_id` | `modules/contact-form` | |
| `national_address`, `national_contact_number`, `national_general_hours` | `modules/contact-info` | |
| `our_mission_title`, `our_mission_description` | `components/footer` | |
| `salvation_army_usa_url` / `_name`, `kroccenter_url_*`, `satruck_url_*`, `sawso_url_*`, `disaster_salvation_army_url_*` | `components/footer` | Footer link pairs (`_url_link` + `_url_name`). |

## Open Questions / Flags

| ID | Item | Evidence | Suggested owner |
| --- | --- | --- | --- |
| F-01 | **Security.** `webengine/views/angel-tree-script` contains a literal Quickbase token in its `CONFIG` block (line 4). Value deliberately not reproduced here. It is a tracked file synced to the instance. Needs a decision on rotation and moving it out of the template. | `angel-tree-script:2-9` | Human / security review |
| F-02 | Stories `property`/`divisions`/`territory` are shown as multi-value relationships. The seed doc cited a live `get-fields` check (`one_to_many`); not repeatable from the repo. Code only shows `find_in_set` usage. | `find-story.json:6,12,18` | zesty-expert (read-only lookup) |
| F-03 | Globals vs Clippings treated as one dataset (seed doc cited a live check of one model with 24 fields). Neither the ZUID `6-de95fda1c1-dxht20` nor the count appear in the repo. | `custom_head`, `components/footer` | zesty-expert |
| F-04 | `locations.property_type` is compared to a ZUID in `modules/services:13` and to the string `"thrift_store"` in `thrift-store-locations.json:2`. One of them may never match. | both files | developer |
| F-05 | Cities name field: most code reads `title`; `components/map-contact-information-pointer:45,61` and a few others read `name`. | those files | developer |
| F-06 | `modules/service-area-form` (and its `form_embed` field) has no include site in any view or module. Orphaned. | `grep` of `webengine/views` | developer |
| F-07 | `events` uses `this.date` in the calendar link; no model field named `date` appears elsewhere. Calendar link also uses the parent location's address, not the event's `address`. | `events` (Add to Calendar link) | developer / qa |
| F-08 | `webengine/views/corps` is 0 bytes and `webengine/views/metro_area_command`, `services_types`, `services_seed_content`, `tag`, `tags_pages` are autolayout stubs. Unclear whether these models are live. | files listed | product owner |
| F-09 | `staff_role_types.json` loops as `srt` but outputs `staff_role_type.role_name` / `.zuid`; those references appear to be unbound. Also, `get-informational-page copy.json` and `get-informational-page-links copy` are copies in the tree. | `staff_role_types.json:2-5` | developer |
| F-10 | Views missing from `zesty.config.json`: `tags`, `tag`, `tags_pages`, `corps`, `metro_area_command`, `services_types`, `news_archive`, `api_test`, `blocks_test`, and `modules/tags-archive`, `components/tags-archive-*`. Their view ZUIDs cannot be confirmed from the repo. | `zesty.config.json` | developer (sync) |
| F-11 | `modules/tags/client-global-navigation` and `modules/tags/schema` have no include site (`custom_head:106,217` includes the non-tags versions). Likely orphaned copies. | `custom_head` | developer |
| F-12 | Model ZUIDs not found in code: Country, Properties Types, Service Types, Service Info Cards, Service Areas, Staff Role Types, FAQs, Program Schedule, Information Page Types, Stuff the Bus, Angel Tree Campaign, Globals. Models behind `6-f0f2e8c49b-sdbvrb` and the `services_offered` target are unnamed. | model index | zesty-expert (read-only lookup) |
| F-13 | Relationship cardinality (`one_to_one` vs `one_to_many`) is not visible in code for `city`, `state`, `territory`, `division`, `service_type` and similar fields resolved with `.filter(...)`. All cardinalities here other than the `find_in_set` cases are inferred. | usage | zesty-expert |
| F-14 | Hero field-name drift (`hero_image` vs `image`; `subtitle` vs `body` vs `description`; `name` vs `title`) looks organic, not designed. Consolidation is a product decision. | section 9 | product owner |
| F-15 | `-/block/base_card.html` and `-/block/hero_full.html` look like older copies of `modules/hero-full` and `components/card`. Unclear if editors still use them. | files | product owner |
| F-16 | PLATFORM QUESTION (zesty): is `/-/gql/` enabled in this instance's developer settings (needed by `modules/hero:533`)? | `modules/hero:533` | zesty-expert |

## Review status

Not yet reviewed. Draft — pending review. Seeded from the 2026-09-25 agent-lab doc (previously approved 2026-09-26); the whole file is treated as a new draft because every section was re-derived from the current `development` tree and several claims changed.
