# Component: Hero Full

Status: Draft — pending review

Source file: `webengine/views/-/block/hero_full.html`

## What this is

Hero Full is a full-width banner block used at the top of pages built on the **Informational Page Template**. It renders a large background image with an overlay, a title, a description, and up to two call-to-action (CTA) buttons.

It is inserted into pages via Zesty's `block()` include syntax, e.g. `{{block('/-/block/hero_full.html?variant=<zuid>')}}`. Each page that uses it points at a specific content item (`variant=<zuid>`) that supplies the field values below. You can find where a given page uses this block by searching the compiled page-view-layout files under `webengine/views/z/pvl/` for `block/hero_full.html`.

Note: there is a **different, similarly-named** template at `webengine/views/modules/hero-full` that is a separate implementation with different field names (`hero_image`, `subtitle` instead of `image`, `description`) and different behavior — if the whole `hero_image` field is empty, that module hides itself entirely rather than showing a fallback image. Do not confuse the two. This doc covers only `webengine/views/-/block/hero_full.html`, the one used on the Informational Page Template and the one touched by ticket 2529.

## Fields used by this component

These are inferred from how the template reads them (`{{ this.<field> }}`); this repo does not contain the content model schema itself (that lives in the Zesty instance's Schema/content model manager), so field types below are best-effort based on usage, not a confirmed schema export.

| Field | Used as | Notes |
|---|---|---|
| `image` | Background hero image | Optional. See "Empty/broken image behavior" below — as of ticket 2529, an empty or broken `image` no longer breaks the layout. |
| `title` | Main heading (`<h1>`) | Rendered as-is via `{{ this.title }}`. |
| `description` | Supporting text below the title | Rendered as-is via `{{ this.description }}` (appears to allow rich/HTML content since no escaping is applied). |
| `primary_cta_link` | Href for the primary button | Button only renders if this field is non-empty. |
| `primary_cta_name` | Label text for the primary button | |
| `secondary_cta_link` | Href for the secondary button | Button only renders if this field is non-empty. |
| `secondary_cta_name` | Label text for the secondary button | |

There is no content-model relationship documented in this file beyond the flat fields above — no linked/related content items are pulled in by this template.

## Empty/broken image behavior (fixed in ticket 2529)

**Before the fix:** if a page's `image` field was empty, or pointed at a file that no longer existed (404 / broken reference), the hero rendered a broken-image icon. There was no empty-field check and no error handling at all.

**Current behavior (as of commit `0869468` on branch `coda-2529`):**

1. **Empty field:** The initial server-rendered `src` attribute uses a Parsley conditional — if `this.image` is empty, it renders `globals.default_og_image` instead:
   ```
   src="{{if {this.image} }}{{ this.image.getImage() }}{{else}}{{ globals.default_og_image.getImage() }}{{/if}}"
   ```
2. **Broken/404 file:** The `<img id="hero-full-image">` tag has an `onerror` handler that swaps to `globals.default_og_image` if whatever was in `src` (even a non-empty `image` field) fails to load:
   ```
   onerror="this.onerror=null;this.src='{{ globals.default_og_image.getImage() }}' + (window.innerWidth <= 768 ? '?width=396&height=658&crop=3:2,smart' : '?width=1046&crop=3:1,smart');"
   ```
3. **On page load (`setBannerImage()`):** A JS function runs on `DOMContentLoaded` to re-apply responsive crop parameters to the image `src` (this happens regardless of which image is showing, because crop dimensions differ by viewport width). This function was updated in the same fix to:
   - Use the same empty-field fallback to `globals.default_og_image` when computing the responsive `src`.
   - Attach its own `onerror` handler pointing at a fallback URL, so if it swaps in a broken/expired `image` URL, that gets caught too instead of overwriting a previously-correct render with a broken one.

So after the fix, **both** "field is empty" and "file is missing/404" cases result in the shared default image being shown, cropped correctly, instead of a broken image icon.

### Fallback image and crop parameters

- Fallback image source: `globals.default_og_image` — a site-wide global content field (not specific to this component). It's the same field already used as the fallback in:
  - `webengine/views/custom_head` (Open Graph `og:image` meta tag fallback when a page's own `og_image` is empty)
  - `webengine/views/modules/hero` (used directly for the initial static carousel image before JS populates real slides)
- The fallback gets the same responsive crop treatment as a real image, applied identically in both the inline `onerror` attribute and in `setBannerImage()`:
  - Mobile (`window.innerWidth <= 768`): `?width=396&height=658&crop=3:2,smart`
  - Desktop: `?width=1046&crop=3:1,smart`

### Dependency / environment consideration

This fallback only works if `globals.default_og_image` is populated in the Zesty instance's global content settings. If that global field is ever left empty, the fallback itself would have nothing to render and the broken-image scenario could reappear. This is flagged as an environment/content-configuration dependency, not a code defect — nothing in this repo can guarantee that global field stays populated; that is a content-editing responsibility in the Zesty instance.

## QA status (ticket 2529)

- Static code review: PASS.
- Live preview verification: blocked by an unrelated CI/deploy gap affecting preview environments for feature branches (not a defect in this component's code). Verify visually once that gap is resolved.

## Open questions / things to verify with the team

- Confirm with a content editor whether `globals.default_og_image` is currently populated in each environment (dev/stage/prod) this site deploys to — this doc can't verify that from the codebase alone, and per this project's documentation rules we are not to make live/database calls to check.
- Confirm whether `webengine/views/modules/hero-full` (the other, differently-behaved hero-full-named template) is still in active use anywhere, or is legacy/unused — its empty-state behavior (hide the whole block) was not part of this ticket and was not changed.
