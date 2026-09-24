# Release Notes

Entries are added when a change has been merged, QA-passed, and is ready
to move toward the live site. Entries are dated by when they were
confirmed ready, not necessarily the day they go live on production —
see the status note on each entry below.

---

## September 25, 2026 — pending stage release

_Merged to `development` and QA-passed. Not yet live — awaiting the
stage → production release process._

### Fixes

- **Regional information now matches the right location.** Some state
  and local location pages were showing contact, navigation, and
  donation information for the wrong region. This is fixed — for
  example, New York-area pages now correctly show Eastern Territory
  information, and California-area pages now correctly show Western
  Territory information. (coda-2434)
- **Corrected location names on city listings.** On some city pages, a
  Salvation Army location listing could show an incorrect or generic
  name instead of that location's actual name. Listings now always show
  the correct name. (coda-2481)

### Improvements

- **Streamlined the location finder.** Simplified how the location
  finder identifies nearby results behind the scenes. Searching by zip
  code or address, and filtering by service type, continue to work the
  same as before. (coda-2480)

### Known Issues

- None reported by QA for this set of changes.

---

<!--
Internal/technical version (for team reference; not for customer-facing
distribution).

### coda-2434 — Fix territory context for state and city pages
State and city/corps pages were sometimes inheriting navigation, footer,
and donation-link content from the wrong territory (or a generic
national default) instead of the territory the state/city actually
belongs to. Fixed so state/city pages correctly resolve their own
territory context for nav, footer contact info, and donation links.
QA-passed.

### coda-2480 — Simplified location finder search logic
Removed outdated "service area model" logic from the location finder
that was no longer needed; streamlined how nearby-location search
results are determined. Zip/address search and service-type filtering
behavior unchanged. QA-passed.

### coda-2481 — Fixed incorrect corps name on city location listings
On city pages, a corps/location listing could revert to showing an
incorrect or generic name instead of the location's proper site name.
Fixed so the correct location name is now shown. QA-passed.
-->
