# Release Notes

## Unreleased — queued for next release (Sept 19, 2026)

### Fixes

- **Informational page banner: missing-image fallback** — Fixed an issue where the banner image at the top of Informational pages would show a broken image icon if no image was set, or if the image file failed to load. The banner now automatically displays a default placeholder image instead, sized correctly for both mobile and desktop.
  - _Internal: Ticket #2529 ("Hero Full Empty State is not working"), Frontend team, Launch & Maintenance 2026, Normal priority / Level 1. Component: Hero Full (`webengine/views/-/block/hero_full.html`), used on the Informational Page Template. Fix: falls back to the shared `globals.default_og_image` (same default used for OG meta tags and the standard hero module) when the hero image field is empty or the referenced file 404s, with matching responsive cropping for mobile/desktop. Committed on branch `coda-2529`, commit `0869468`. QA: static/code review passed; queued for next release. Live preview verification is pending a separate deployment step for feature branches — unrelated to the fix itself._
