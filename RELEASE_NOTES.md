# Release Notes

## September 25, 2026 — released to production, now live

_Merged to `development` via [PR #27](https://github.com/TSAUSN/national-website/pull/27),
[PR #30](https://github.com/TSAUSN/national-website/pull/30), and
[PR #31](https://github.com/TSAUSN/national-website/pull/31); QA-passed; released to
production via [PR #34](https://github.com/TSAUSN/national-website/pull/34) on
September 25, 2026 at 5:19 AM (+08:00).
Live now on the public site._

### Fixes

- **Regional information now matches the right location.** Some state
  and local location pages were showing contact, navigation, and
  donation information for the wrong region. This is fixed — for
  example, New York-area pages now correctly show Eastern Territory
  information, and California-area pages now correctly show Western
  Territory information. ([PR #27](https://github.com/TSAUSN/national-website/pull/27), [coda-2434](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-9et99zMnoE&view=modal))
- **Corrected location names on city listings.** On some city pages, a
  Salvation Army location listing could show an incorrect or generic
  name instead of that location's actual name. Listings now always show
  the correct name. ([PR #31](https://github.com/TSAUSN/national-website/pull/31), [coda-2481](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-QXftAnkX_2&view=modal))

### Improvements

- **Streamlined the location finder.** Simplified how the location
  finder identifies nearby results behind the scenes. Searching by zip
  code or address, and filtering by service type, continue to work the
  same as before. ([PR #30](https://github.com/TSAUSN/national-website/pull/30), [coda-2480](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-2L2qWI7eat&view=modal))

### Known Issues

- None reported by QA for this set of changes.

### What Changed, By Area of Impact

#### Frontend Layout & Visual Design

No changes. This release did not modify page layout, visual styling, or the design of any page element — nothing here affected how any page looks.

#### Content Structure

No structural changes. One item in this release (location listing names) corrects what name is displayed on an existing listing — it does not change how listings are organized or arranged on the page.

#### Data / Logic Layer

All three fixes in this release are behind-the-scenes corrections to how the site determines and displays information, with no visible design changes:

- **Regional information matching** ([PR #27](https://github.com/TSAUSN/national-website/pull/27), [coda-2434](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-9et99zMnoE&view=modal)): Corrected the logic that determines which region's contact information, navigation, and donation links a state or city page should show.
- **Location finder search** ([PR #30](https://github.com/TSAUSN/national-website/pull/30), [coda-2480](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-2L2qWI7eat&view=modal)): Simplified the internal logic the location finder uses to identify results. No change to how searching or filtering works from a visitor's perspective.
- **Location listing names** ([PR #31](https://github.com/TSAUSN/national-website/pull/31), [coda-2481](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-QXftAnkX_2&view=modal)): Corrected the logic that selects which name to display for a location listing.

#### User-Facing Impact Summary

What visitors will notice:

- State and local pages (for example, New York or California area pages) now consistently show the correct regional contact information, navigation, and donation links for that area.
- Location listings on city pages now show the correct name for each location.

What visitors will not notice any change to:

- Page layout or visual design.
- How the location finder search or filtering works (zip code search, address search, filtering by service type).

---

<!--
Internal/technical version (for team reference; not for customer-facing
distribution).

### [PR #27](https://github.com/TSAUSN/national-website/pull/27) — Fix territory context for state and city pages ([coda-2434](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-9et99zMnoE&view=modal))
State and city/corps pages were sometimes inheriting navigation, footer,
and donation-link content from the wrong territory (or a generic
national default) instead of the territory the state/city actually
belongs to. Fixed so state/city pages correctly resolve their own
territory context for nav, footer contact info, and donation links.
QA-passed.

### [PR #30](https://github.com/TSAUSN/national-website/pull/30) — Simplified location finder search logic ([coda-2480](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-2L2qWI7eat&view=modal))
Removed outdated "service area model" logic from the location finder
that was no longer needed; streamlined how nearby-location search
results are determined. Zip/address search and service-type filtering
behavior unchanged. QA-passed.

### [PR #31](https://github.com/TSAUSN/national-website/pull/31) — Fixed incorrect corps name on city location listings ([coda-2481](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-QXftAnkX_2&view=modal))
On city pages, a corps/location listing could revert to showing an
incorrect or generic name instead of the location's proper site name.
Fixed so the correct location name is now shown. QA-passed.

### Coda tasks/projects closed by this release
- **[coda-2434](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-9et99zMnoE&view=modal)** ([PR #27](https://github.com/TSAUSN/national-website/pull/27)) — "Update cookie script on state/city pages to use the related territory for page context." Project: State and city pages needing a data layer. Request type: New Feature.
- **[coda-2480](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-2L2qWI7eat&view=modal)** ([PR #30](https://github.com/TSAUSN/national-website/pull/30)) — "Remove service_area model and its usage on the code base." Project: Service Area Model Removal. Request type: Operational.
- **[coda-2481](https://docs.superhuman.com/d/_dGNetDKGq5M/All-Tasks_suDbYBrB#_tuDtiqCI/_rui-QXftAnkX_2&view=modal)** ([PR #31](https://github.com/TSAUSN/national-website/pull/31)) — "Cities Page Location Site Title Reverts to Incorrect Corps Name." Project: Launch & Maintenance (2026). Request type: Bug.

### Production release
Merged via [PR #34](https://github.com/TSAUSN/national-website/pull/34) to
`production` — commit `a67d207`, committer timestamp
`2026-09-24T14:19:00-07:00` (`2026-09-25T05:19+08:00`), verified via
`git log -1 --format=%cI a67d207`. Confirmed to be the current HEAD of
`origin/production`. Live on http://salvationarmyusa.org; karen is
separately confirming this against the live production site — if that
check surfaces any issues, this entry may need to be walked back or
amended.
-->
