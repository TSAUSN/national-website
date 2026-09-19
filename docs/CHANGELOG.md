# Project Changelog

Status: Draft — pending review

This log tracks notable changes to WebEngine templates, content models, and integrations in this repo, along with who/what made the change. It is maintained by the documentation-maker agent based on what's actually committed to the repo — entries are added after a dev/content task completes.

## 2026-09-19

- **Fixed:** Hero Full component (`webengine/views/-/block/hero_full.html`) showed a broken-image icon when the `image` field was empty or the referenced file was missing/404 (no fallback logic existed at all). Now falls back to the shared `globals.default_og_image` global field in both cases, with matching responsive crop params, and the `setBannerImage()` JS re-apply step was updated to use the same fallback + its own `onerror` handler so it can't overwrite a correct render with a broken one.
  - Ticket: 2529 (Frontend, Launch & Maintenance 2026, bug fix, Level 1)
  - Commit: `0869468` — "fix: display design fallback image for empty/broken Hero Full images"
  - Branch: `coda-2529`
  - Built by: web-developer agent
  - QA: qa-tester agent — static code review PASS; live preview verification blocked by an unrelated CI/deploy gap for feature branches (not a code defect)
  - Docs: documentation-maker agent — added `docs/components/hero-full.md`, updated to describe the corrected empty-state behavior and its dependency on `globals.default_og_image` being populated
