# Bynder DAM Integration

Status: **Draft — pending review**
Last generated: 2026-09-30 by Documentation Maker (repo search, read-only Instance API via the `zesty` MCP server, template review)

This file records where the Bynder digital asset manager (DAM) is used in this Zesty instance, which pages depend on it, and the known caveats. It is for developers and content editors working on this repo.

**Confidence labels used below:**
- **Confirmed**: seen directly in repo code or in an Instance API response.
- **Inferred**: a reasonable conclusion from the data, not verified against Zesty documentation or a rendered page.

---

## 1. Summary

- Bynder is connected through **Zesty's native Media integration**, configured at the instance level. The repo has **no custom Bynder code**. The string `bynder` appears nowhere in the repo, on any branch, or in any commit. (Confirmed)
- Affected `images` fields store **raw Bynder public-link URLs**, not Zesty `3-` media ZUIDs. The existing templates render them. (Confirmed from item data)
- Bynder image URLs also appear hard-coded in a Freestyle layout (§3.4).

## 2. Instance configuration

Instance settings, category `bynder` (Confirmed via Instance API):

| Setting | Value |
|---|---|
| `bynder_portal_url` | `https://dam.redshieldtoolkit.org/`, the Red Shield Toolkit brand portal. Custom domain, CNAME to `tsa.bynder.com`. |
| `bynder_token` | Set. The value is intentionally not recorded here. |

## 3. Integration points

### 3.1 Content fields holding Bynder URLs

All of these use the standard `images` datatype and have **no Bynder-specific field setting** (Confirmed). Stored values look like:

```
https://dam.redshieldtoolkit.org/m/<16-hex id>/original/<filename>.jpg
```

| Model | Model ZUID | Field | Field ZUID | Notes |
|---|---|---|---|---|
| Informational Pages | `6-c2b7f2a9ad-k4frxv` | `hero_image` | `12-f8dda89690-vvzzhj` | |
| Volunteer Pages | `6-8489c3a590-kn21jh` | `hero_image` | `12-bafaae9b9b-pm4zp2` | |
| Services | `6-fef1bbcecc-cjfmfq` | `hero_image` | `12-b491a3cda7-nvn22n` | Required field |
| Hero Sliders (dataset) | `6-d4c0fbbee5-8j61c9` | `image` | `12-ca82ca9d81-9tnd57` | |
| Informational / Volunteer Pages | (as above) | `body` (WYSIWYG) | | Can also hold Bynder `<img>` tags |

**How the URL gets stored (Inferred):** the raw-URL storage is inferred from the data. Zesty's documentation only says media fields "can be integrated into third party software like Bynder" ([docs.zesty.io/docs/content-fields.md](https://docs.zesty.io/docs/content-fields.md)). It doesn't say whether a Bynder pick stores a URL or imports the asset as a Zesty media file. Some of these values may have been pasted by hand rather than picked through the integration.

### 3.2 Templates that render these fields

| Template | Lines | What it does | Reached from |
|---|---|---|---|
| `webengine/views/modules/hero-full` | :9, :59 | `this.hero_image.getImage()` as the `<img src>` and as a JS variable. A script then appends `?width=396&crop=3:2,smart` (mobile, :62) or `?width=1046&crop=3:1,smart` (desktop, :64). | `informational_pages:7` and `volunteer_pages:7` include `modules/generic`, which includes `modules/hero-full` at line 1. This path only runs when `template_layout` is not `1`. |
| `webengine/views/modules/hero-full-donate` | :9, :60 | Same `.getImage()` pattern. Appends `?width=396&crop=3:2,smart` (mobile, :63) or `?width=1400&crop=3:1,smart` (desktop, :65). | `webengine/views/services:1` (Services items). |
| `webengine/views/modules/hero` | :533, :610, :614-615 | Fetches `/-/gql/matrix_hero_sliders.json` (:533). Uses `banner_content.image` directly, **without** `.getImage()` (:610), then appends resize params (:614-615). Sliders are filtered by `display_on_locations` (:486). | `webengine/views/locations:10` (also `homepage:1`, `divisions:1`, `territories:1`). |

**Freestyle layout bypass:** `informational_pages:1-2` and `volunteer_pages:1-2` render the Freestyle layout (`this.autolayout(auto)`) when `template_layout == 1`, and skip `modules/generic` entirely. The Volunteer Pages Freestyle layouts only call blocks and never reference `this.hero_image` or `this.body`. So for those items, a Bynder URL in `hero_image` is stored but most likely not rendered (§4.2).

### 3.3 Where the Bynder configuration lives

Nothing in `webengine/` refers to Bynder directly. The integration consists of the instance settings (§2) plus field values in content items. None of it goes through `zesty.config.json` or `scripts/sync-to-zesty.js`, except for the hard-coded layout in §3.4.

### 3.4 Hard-coded Bynder URL in a Freestyle layout

- Item `7-c6f5cf92d0-mcht26`, "Freestyle Block Test" (`/freestyle-block-test/`, Informational Pages).
- Its Freestyle layout sets a Bynder image as an inline CSS `background-image` inside an Embed element. See `webengine/views/z/pvl/7-c6f5cf92d0-mcht26.zhtml:13-18` and the matching layout tree in `webengine/views/z/pvl/7-c6f5cf92d0-mcht26.json`.
- URL: `https://dam.redshieldtoolkit.org/m/562730b0ee2ac40a/original/Volunteer-Serving-Food.jpg`
- The item has **never been published** (v1, no publishing records).
- History: first committed in `6848426`, which is only on the `kharl` and `2312-donation-drawer` branches. It reached every branch through the bulk sync commit `b1928b5` (2026-06-16).

## 4. Pages using Bynder images

Production base: `https://www.salvationarmyusa.org`. Snapshot as of **2026-09-30**, taken from the Instance API. **None of these pages have been checked in a browser.** This list may be incomplete (see §5.1).

### 4.1 Bynder image rendered

| Page | Item | Source |
|---|---|---|
| `/wi/sheboygan/pennsylvania-ave-corps/volunteer-programs/` | `7-a49bfef3a0-524n99` (Services, live v9) | `hero_image` via `.getImage()` |
| `/wi/green-bay/union-court-corps/volunteer-programs/` | `7-dcffc8d1ea-xcrlfx` (Services, live v9) | `hero_image` via `.getImage()` |
| `/wi/sheboygan/pennsylvania-ave-corps/volunteer-old-informational-7-baf0dba6b1-fg9r8x/` | `7-baf0dba6b1-fg9r8x` (Informational, live v44, republished 2026-09-22; duplicates `7-f4cca0c7ed-0bp78d`) | `hero_image` via `.getImage()` |
| `/ia/cedar-rapids/c-avenue-nw-corps/` | Hero slider `7-b4dddbfca7-nmh111` "We Need Volunteers...Can You Help?" (live v3), on location `7-98ccd4e3b7-p5g34l` (live v23) | `image`, raw URL (no `.getImage()`) |

### 4.2 Live and storing a Bynder URL, but probably not rendered

These items use the Freestyle layout, which ignores the field (§3.2).

| Page | Item | Field |
|---|---|---|
| `/wi/superior/hughitt-avenue-corps/volunteer/` | `7-94d5e58ef6-65fk0x` (v12) | `hero_image` |
| `/wi/greenfield/w-coldspring-rd-corps/volunteer/` | `7-a899cfd58e-kvgml4` (v11) | `hero_image` |
| `/wi/sheboygan/pennsylvania-ave-corps/christmas-volunteer-opportunities/` | `7-f4cca0c7ed-0bp78d` (v13) | `hero_image` |
| `/usa-central-territory/volunteer/` | `7-b0e2afd6f9-t0dckq` (v14) | `body`, with 3 Bynder `<img>` tags |

### 4.3 Unpublished, still holding Bynder URLs

| Item | Notes |
|---|---|
| `7-88b2ff82ff-zbhg0f` | |
| `7-8ca3cce4c1-9dgdqq` | Unpublished 2026-04-30 |
| `7-988aee8a8c-1gjgr8` | Unpublished 2026-05-01 |
| `7-c6f5cf92d0-mcht26` | Never published (§3.4) |

## 5. Caveats

1. **The inventory may be incomplete.** The Instance API search (`/search/items?q=`) only matches meta and path, not field values, so searching for `bynder` or `redshieldtoolkit` returns 0 results. The items above were found incidentally. A complete count needs a scan of every model's items. The MCP `get-items` tool also only returns en-US content.
2. **`.getImage()` on a raw external URL is undocumented.** It either passes the URL through unchanged or returns an empty string. If it returns empty, the `<img src>` in `modules/hero-full` and `modules/hero-full-donate` is blank, and on Services `hero_image` is a required field. A live-page check is needed.
3. **No image optimization (Inferred).** The `?width=…&crop=…,smart` params are Fastly Image Optimization on Zesty media domains ([docs.zesty.io/docs/on-the-fly-media-optimization-and-dynamic-image-manipulation.md](https://docs.zesty.io/docs/on-the-fly-media-optimization-and-dynamic-image-manipulation.md)). Bynder's CDN won't apply them. Every stored URL points to an `/original/` file, so full-resolution images download even on mobile. The templates don't use Bynder's own transform (`io=transform`), and there is no `preconnect` for `dam.redshieldtoolkit.org`.
4. **No fallback image.** If a Bynder asset is archived or moved, or its public link is revoked, the image breaks. The `globals.default_og_image` fallback pattern (`docs/custom-patterns.md` §1) is not applied in these hero templates. Related: `webengine/views/-/block/hero_full.html:8` also lacks the fallback that CLAUDE.md says it has (`src="{{ this.image.getImage() }}"`, no `globals.default_og_image` branch). This was checked on `coda-2483`, `stage`, and `production`.
5. **External dependency.** These are cross-origin image loads from a portal the web team doesn't operate. If a Content Security Policy is added later, it will need `img-src dam.redshieldtoolkit.org`.
6. **Accessibility.** The Freestyle Block Test image (§3.4) is a CSS background with no alt text and no `role`/`aria-label`.
7. **Visibility gap in existing docs.** Bynder usage lives in content and in `z/pvl` layout files. `docs/custom-patterns.md:87` and `docs/templates.md:11` describe `webengine/views/z/pvl/**` as a CLI version-history cache to skip during review. In fact these files are mapped, synced resources in `zesty.config.json` (e.g. `/z/pvl/7-c6f5cf92d0-mcht26.zhtml` → `11-9c9ea08fe5-37j9kf`). Those two docs need correcting. Flagged here only; they haven't been changed.
8. **Tooling gaps in the read-only MCP server.** It has no view tool, returns en-US only, its search misses field values, and checking live state needs a per-item `get-item-publishings` call. Suggested read-only additions: `get-views`/`get-view`, a content pattern-scan tool, `lang`/paging params on `get-items`, `get-item-live`, and `search-files`. See `docs/api-tools.md`.
9. **Related third-party media (not Bynder):**
   - Widen video embeds (`//embed.widencdn.net`) in `webengine/views/z/pvl/7-8eb496d6e5-bdv7rt.zhtml:100` and `webengine/views/z/pvl/7-f2c7ffa7a3-x6f92q.zhtml:94`.
   - A CloudFront-hosted video (`d3cy9zhslanhfa.cloudfront.net`) in `webengine/views/z/pvl/7-d48799deed-jc2lz2.zhtml:101` (Greater Birmingham). It may come from Bynder, but that's **unconfirmed**.
   - The Media Manager holds 11,960 files, all on `8hxvw8tw.media.zestyio.com`. Three are named like Bynder downloads (`webimage-<id>.png`): `3-15ebb9a0-70hjs8`, `3-14154f2c-t55n1b`, `3-14017af4-bj7pfb`.

---

## Open Questions / Flags

1. **ZESTY QUESTION:** How does Zesty's Bynder picker store a selection: as the raw public URL, or as an imported `3-` media ZUID? (§3.1)
2. **ZESTY QUESTION:** What does `.getImage()` return for a raw external URL? (§5.2)
3. **Browser check needed** on the 4 pages in §4.1: the actual hero `src`, whether the resize params have any effect, and the image download weight.
4. Was the live 2026-09-22 republish of the old informational page `7-baf0dba6b1-fg9r8x` intentional? (§4.1)
5. Correct the `z/pvl/**` description in `docs/custom-patterns.md` §10 and `docs/templates.md` (§5.7).
6. The fallback for `webengine/views/-/block/hero_full.html` that CLAUDE.md describes isn't present in the code (§5.4).
