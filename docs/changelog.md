# Project Changelog

Status: Draft — pending review
Last generated: 2026-10-15 by zesty-ai:documentation (read-only git history of `development`, `stage`, `production`, `main`; seeded from the 2026-09-25 agent-lab changelog; no live calls, no PR or task-tracker lookups)

Notable changes to templates, content models, integrations, and configuration in this repository, based on what is actually committed. Newest entries first. Customer-facing release notes are written separately from this log.

How to read the entries:

- Entries are grouped by ticket (the `coda-<ID>` branch number) or, where there is none, by PR/branch. Ticket titles are not in git; the short title is derived from the commits and the files they touch.
- `PR #NN` numbers come from the merge commits "Merge pull request #NN from TSAUSN/<branch>". PR links are `https://github.com/TSAUSN/national-website/pull/NN`.
- Dates are the dates git records on the merge commit (each author's local timezone), so a PR can show a merge date a day earlier than its newest commit.
- `Promotion:` is the furthest of development / stage / production that the change's commits reached, checked with `git merge-base --is-ancestor` against `origin/development`, `origin/stage`, `origin/production`. Release flow is development -> stage -> production. `main` is not part of the release flow; PRs merged into `main` are noted as not promoted.
- Production is also fed by separate `*-prod` branches whose commits are re-applied copies (different SHAs) of the stage work. Where such a PR exists, it is named. "Reached production" is a git fact; it does not prove the Zesty publish succeeded (see Open Questions).
- `Verified by:` is filled only where evidence exists in the repository or in the seed changelog; otherwise "not recorded".

Entry format:

    ## YYYY-MM-DD: <short title>
    - Ticket: <ID>          Branch/PR: <branch> / <PR link>
    - Changed: <models, templates, modules, integrations, config>
    - By: <human and/or agent>        Verified by: <spec-auditor, sanity-check, qa, reality-check, human>
    - Promotion: <feature branch | development | stage | production (date)>
    - Notes: <migrations, follow-ups, known issues>

<!-- entries below, newest first -->

## 2026-10-15: PR preview workflow, backup folder removal, deploy-workflow edits
- Ticket: not recorded          Branch/PR: direct commits (no PR merge commit) / commits `13b5017` (development), `c349fe8` (stage)
- Changed: added `.github/workflows/pr-preview.yml` (on PRs into `stage`/`production`, runs `scripts/sync-to-zesty.js` with `REPORT=true` and posts a PR comment; `.github/workflows/pr-preview.yml:1-32`). Deleted 8 files under `backup/` (about 5,790 lines: `client-nav`, `custom_head`, `map.js`, `news`, `news.scss`, `services`, `services.scss`, `stats.scss`). Separately, six one-line edits to `.github/workflows/zesty-deploy.yml` on `production` the same day (`d71afda`, `0117189`, `11fc5cd`, `48d853e`, `9ecf378`, `be5b0a9`; messages "Temp remove production deploy", "Remove production workflow", "Add nacl production workflow", "Remove production deploy", "Remove temp production deploy", "Add back production workflow"). The edited line is not interpreted here.
- By: Kharl        Verified by: not recorded
- Promotion: production (2026-10-15; `13b5017` is in `origin/production` via merge `e53274b` "stage-to-production")
- Notes: `zesty-deploy.yml` triggers on pushes to `stage`/`production` and on manual dispatch (`.github/workflows/zesty-deploy.yml:3-6`), so the production edits above are deploy-trigger changes; their intent is not recorded in git. Unmerged branch `coda-2560` carries later deploy-workflow commits (`3c6ff65`, `3f4b6de`); excluded because not merged.

## 2026-10-14: Tags archive pages (tags-pages)
- Ticket: not recorded (no `coda-<ID>` branch)          Branch/PR: `tags-pages` / PR #60 (development), PR #61 (stage), PR #62 (main), PR #64 (production, branch `tags-pages-prod`)
- Changed: new `webengine/views/modules/tags-archive`, `components/tags-archive-list`, `components/tags-archive-search`, `webengine/views/tags`, `mobile_editor/content_list/tags_stories.json`, styles `modules/tags-archive.scss` and `components/tags-archive-search.scss` (PR #60 diff stat: 20 files, 4,478 insertions). PR #62 and #64 also add `webengine/views/modules/tags/client-global-navigation` and `modules/tags/schema` (PR #64: 22 files, 7,249 insertions). Latest commit `cf09058` "New Tags Pages Update" (an earlier `912b5f0` "Tags Pages Update" is in the branch history).
- By: Nico Martin Sabio (6 commits), Gisele Blair (4 commits) on the tags-pages PR range; PR #64 also has Kharl (2 commits: "Restore GitHub workflows from production" and "Remove workflows", the latter dated 2026-06-16 and already in `main`)        Verified by: not recorded
- Promotion: production (2026-10-14, PR #64). Also development (PR #60), stage (PR #61). PR #62 merged into `main` (2026-10-14): `main` is not in the release flow, so that merge is not a promotion.
- Notes: this branch also carries the `locations-endpoint-sync` commits (see below). The file sets of PR #60 (development), #62 (main) and #64 (production) differ per their diff stats, so the three environments do not hold identical tag-page files; not investigated further. The `tags` view `webengine/views/tags` is 1 line in each diff.

## 2026-10-14: Untrack Zesty-managed `views/z/pvl` files and skip them in sync
- Ticket: not recorded          Branch/PR: `development` / PR #59 (development -> stage); production-side branch `prod-untrack-zesty-views` merged into `production` as `4babaaa` (no PR merge commit)
- Changed: removed about 4,550 tracked files under `webengine/views/z/pvl` (`d3b7372`), added ignore rules (`1815f4e`; current `.gitignore` has `/webengine/views/z/` and `/webengine/views/menu-config/`), and made `scripts/sync-to-zesty.js` skip those paths (`daff8a8`; `EXCLUDED_DIRS` at `scripts/sync-to-zesty.js:44-45`). Production-side commits `b430728` "Untrack Zesty-managed views and restore production deploy trigger" and `250de92` "Ignore Zesty-managed views on production".
- By: Kharl (3 commits on development; production branch commits also Kharl)        Verified by: not recorded
- Promotion: production (2026-10-15 by git ancestry: `daff8a8` in `origin/production` via `e53274b`; production-side branch merged `4babaaa` 2026-10-15). Also development, stage (PR #59, 2026-10-14).
- Notes: PR #59 shows 4,552 files changed, 14 insertions, 721,726 deletions. Layouts and menus remain managed in the Zesty manager, not git.

## 2026-10-13: CODA-2500 Angel Tree map and campaign filter updates
- Ticket: CODA-2500          Branch/PR: `coda-2500` / PR #48 (2026-10-09), PR #52 (2026-10-12), PR #55 (2026-10-13), all into development; production via PR #57 (`coda-2529-2520-2500-prod`, shared with CODA-2529 and CODA-2520)
- Changed: `webengine/views/modules/map-angel-tree` (large rewrite: 893 changed lines in the PR #48 diff; PR #48 also brought in `docs/*.md` and `CLAUDE.md` changes via a merge of stage; later commits "Update Quickbase call error", "Update quickbase endpoints", "Update online registry endpoint", "Add store type and store company name on the Quickbase call", filter buttons and back button, "Hide the instore logic for now", "hide the filter for data to display", mobile search/label fixes in PR #52 and #55).
- By: Nico Martin Sabio (14 commits on PR #48 range, 1 each on #52 and #55), Kharl (2)        Verified by: not recorded
- Promotion: production (2026-10-12 merge date, PR #57; the PR's commit `93a74a2` is dated 2026-10-13). Also development (PRs #48, #52, #55), stage (PR #56, 2026-10-12).
- Notes: on `production`, the three tickets were first committed directly as separate commits (`7cd8594`, `7958cd9`, `ecf71c8`, 2026-10-13), then reverted by `a679c12` "Revert CODA-2529, CODA-2520, CODA-2500 from production [skip ci]", then re-applied by PR #57. Commit `ae37a14` "CODA-2500 - Enable Angel Tree map on the campaign page" (`webengine/views/angel_tree_campaign`) is on unmerged branch `coda-2560` and is not part of this entry. Quickbase endpoints are called from the module; their configuration was not read for this entry.

## 2026-10-12: CODA-2520 Stats module attribution
- Ticket: CODA-2520          Branch/PR: `coda-2520` / PR #47 (2026-10-08), PR #53 (2026-10-12), both into development; production via PR #57
- Changed: `webengine/views/modules/stats`, `webengine/views/stats-info.json`, `webengine/styles/modules/stats.scss`. PR #47 uses a new Stats info field (`e62e123`); PR #53 "Fix the icons size" removes 5 lines of SCSS and adjusts `stats` and `stats-info.json` (PR #53: 3 files, 11 insertions, 16 deletions).
- By: Kharl        Verified by: not recorded
- Promotion: production (2026-10-12 merge date, PR #57). Also development, stage (PR #56, 2026-10-12).
- Notes: see the CODA-2500 entry for the direct-commit, revert, and re-apply sequence on `production`.

## 2026-10-09: CODA-2529 Hero Full empty-state fallback; docs and release-notes untracked
- Ticket: CODA-2529          Branch/PR: `coda-2529` / PR #46; production via PR #57
- Changed: Hero Full empty/broken image fallback across variants: `webengine/views/modules/hero-full-cities`, `hero-full-donate`, `hero-full-events`, `hero-full-leadership`, `hero-full-service-area`, `hero-full-state`, `hero-full-stuff-the-bus` (PR #46: 11 files, 112 insertions, 36 deletions; commits `0869468`, `a718a0a`). The same PR also carries repo-hygiene commits `6a4b2e6`, `3c3cfc3`, `bb233ff`, `8861ef5`, `341cca8` whose messages say they untrack `docs/`, `RELEASE_NOTES.md` and `CLAUDE.md` and clean `.gitignore`.
- By: Kharl        Verified by: not recorded
- Promotion: production (2026-10-12 merge date, PR #57). Also development (PR #46, 2026-10-09), stage (PR #56, 2026-10-12).
- Notes: current `.gitignore` ignores `docs/`, `RELEASE_NOTES.md`, `CLAUDE.md`, `.mcp.json`, and `.claude`, so `docs/*.md` in a working copy are local files unless the ignore rule is changed (see Open Questions).

## 2026-10-09: locations-endpoint-sync (Cloud Function that rebuilds the locations JSON view)
- Ticket: not recorded          Branch/PR: `locations-endpoint-sync` / PR #41 (2026-10-05), #42 (2026-10-05), #49 (2026-10-09), #50 (2026-10-09), all merged into `main`
- Changed: new `scripts/locations-endpoint-sync/` (13 files, 2,663 insertions in PR #41: Express server `src/webhook-server.js`, handler `src/webhook-handler.js`, rebuild logic `src/locations-sync.js`, view writer `src/zesty-view-commit.js`, GCP deploy script `scripts/deploy.js`); #42 adds a CORS fix to `index.js`; #49 separates preview and live `locations.json` endpoint writing; #50 adds fetch retries (3 attempts). See `docs/api-tools.md` for what it writes.
- By: Nico Martin Sabio        Verified by: not recorded
- Promotion: production (2026-10-14), but not via these PRs: all four PRs went into `main`, which is not in the release flow. The same commits (`57ff7c5`, `ebc9fb2`, `949cb62`, `2c906e8`) reached development (PR #60), stage (PR #61), and production (PR #64) through the `tags-pages` branch.
- Notes: deployment of the Cloud Function itself is not a repository event; whether and where it is deployed is unknown (see Open Questions).

## 2026-10-08: CODA-2536 Tags model reference
- Ticket: CODA-2536          Branch/PR: `coda-2536` / PR #45 (into development)
- Changed: `webengine/views/modules/client-global-navigation` (commit `4426174` "Tags model zuid"); earlier commit `3499535` "Tags model" updated `CLAUDE.md` and the then-tracked `docs/*.md`.
- By: Kharl        Verified by: not recorded
- Promotion: production (by git ancestry only: in `origin/production` via `e53274b`, 2026-10-15). Also development (2026-10-08), stage (PR #56, 2026-10-12).
- Notes: no `*-prod` PR exists for this ticket, so whether its production Zesty publish happened separately is unknown. The tags model is also referenced by the later `fd91eda` "Moved tags model on the model consts", which is not in this entry's PR.

## 2026-10-05: CODA-2533 Upcoming events: lazy loading and per-org events endpoint
- Ticket: CODA-2533          Branch/PR: `coda-2533` / PR #40 (into development); production via PR #44 (`coda-2483-2532-2533-prod`)
- Changed: `webengine/views/modules/upcoming-events`, `webengine/views/get-events.json`, `webengine/styles/modules/upcoming-events.scss` (PR #40: 3 files, 323 insertions, 72 deletions). Commits include "Load events from Instant API using the page's own org", "Lazy loaded events", "Update getevents endpoint", plus earlier 2026-09-20..22 fixes for the WebEngine 3000-query cap (move fetch off Parsley `{{each}}`, offset pagination, wait for location cookie, read `event.content.uri` for the View Event link).
- By: Kharl (21 commits)        Verified by: not recorded
- Promotion: production (2026-10-05 merge date, PR #44). Also development (PR #40), stage (PR #43, 2026-10-05).
- Notes: on `production`, CODA-2483/2532/2533 were first committed directly (`40c5c12`), reverted (`9d16445` "[skip ci]"), then re-applied by PR #44 (`bcbfb28`, a revert of the revert). PR #40 also stops tracking `.mcp.json` (`241c201`; the commit message says it contained a live session token, so treat that credential as exposed in earlier history and rotate it).

## 2026-10-05: CODA-2483 City page location map and card redesign
- Ticket: CODA-2483          Branch/PR: `coda-2483` / PR #39 (into development); production via PR #44
- Changed: `webengine/views/modules/zip-search` (PR #39: 568 insertions, 15 deletions): location card redesign, accordion height, "view location" link, city-page map with pins plotted from the zip-search view, location-name labels, mobile pin tweaks, city-title casing, sizes.
- By: Kharl (10 commits)        Verified by: not recorded
- Promotion: production (2026-10-05 merge date, PR #44). Also development (PR #39), stage (PR #43, 2026-10-05).
- Notes: see the CODA-2533 entry for the production revert and re-apply sequence.

## 2026-10-02: CODA-2532 Remove Location Finder link from city hero
- Ticket: CODA-2532          Branch/PR: `coda-2532` / PR #38 (into development); production via PR #44
- Changed: `webengine/views/modules/hero-full-cities` (removed the "Location Finder" CTA anchor, 10 lines); `CLAUDE.md` (deployment-model clarification, gitignored). Also commit `7897e0e` "Untrack .mcp.json".
- By: Kharl (3 commits)        Verified by: not recorded
- Promotion: production (2026-10-05 merge date, PR #44). Also development (PR #38, 2026-10-02), stage (PR #43, 2026-10-05).
- Notes: the commit "Remove location finder" (`0ba2f42`) is the source of the `hero-full-cities` change; its link to the ticket is inferred from the branch name.

## 2026-09-26: CODA-2541 Footer address and cookies on nested informational pages
- Ticket: CODA-2541          Branch/PR: `coda-2541` / PR #35 (into development); production via PR #37 (`coda-2541-prod`)
- Changed: `webengine/views/modules/client-global-navigation` (async fetch/cookie race fix, empty `location_state` cookie fix, footer address no longer falling back to NHQ or a stale location) and `webengine/views/get-informational-page.json` (PR #35: 4 files, 323 insertions, 33 deletions; PR #37: 2 files, 241 insertions, 13 deletions).
- By: Kharl (7 commits)        Verified by: not recorded
- Promotion: production (2026-09-25 merge date, PR #37; commit `f25fdd3` is dated 2026-09-26). Also development (PR #35, 2026-09-26), stage (PR #36, 2026-09-25).
- Notes: a "defect B" change (resolve footer/cookies from a direct location/division/territory parent, `880f74e`) was reverted in the same PR (`15874a8`), so only the earlier fixes remain. PR #36 (development -> stage) also removed the tracked `docs/*.md` files from stage.

## 2026-09-24: CODA-2481 Cities page location site title falls back to location name
- Ticket: CODA-2481          Branch/PR: `coda-2481` / PR #31 (into development); production via PR #34 (`release-2026-09-25-production-pr`)
- Changed: `webengine/views/modules/zip-search`, 1 line (PR #31: 1 insertion, 1 deletion): the corps-card link text uses `location.site_name` when non-empty, otherwise `location.name`.
- By: Kharl (3 commits)        Verified by: QA pass on the `development` preview, as recorded in the seed (agent-lab) changelog; not re-verified here
- Promotion: production (2026-09-24 merge date, PR #34). Also development (PR #31), stage (PR #32, 2026-09-24).
- Notes: seed entry listed this as dev-rollup only; git now shows stage and production.

## 2026-09-24: CODA-2480 Remove service-area matching from the location finder script
- Ticket: CODA-2480          Branch/PR: `coda-2480` / PR #30 (into development); production via PR #34
- Changed: `webengine/views/modules/location-finder` (3 lines) and `webengine/views/modules/location-finder-script` (258 lines removed): location finder search/filter relies on the `services.json` / `service-types.json` endpoints only. This is unrelated to the Service Area content model and its `service-area-*` modules.
- By: Nico Martin Sabio        Verified by: QA pass on the `development` preview, as recorded in the seed changelog; not re-verified here
- Promotion: production (2026-09-24 merge date, PR #34). Also development (PR #30), stage (PR #32, 2026-09-24).
- Notes: the seed entry reports no leftover `service_area` / `serviceArea` references after the removal (repo-wide grep at the time); not re-run for this log.

## 2026-09-24: CODA-2434 Territory context for state and city pages
- Ticket: CODA-2434          Branch/PR: `coda-2434` / PR #27 (into development); production via PR #34
- Changed: `webengine/views/modules/client-global-navigation` (327 insertions, 123 deletions): `case models.states:` and `case models.cities:` added to the `initCookies()` organization-context switch. States read their own `territory` field; Cities derive territory from the parent state's `territory`. Both set location, home URL, territory, donation, and contact-us cookies, reusing the existing territory-cookie helpers; a new `hasValidZUIDShape()` guard falls back to national cookies when a city's state has no territory relation (as described in the seed changelog; function names not re-read in this pass).
- By: Kharl (6 commits)        Verified by: QA pass on the `development` preview (NY pages show USA Eastern Territory, CA pages show USA Western Territory), as recorded in the seed changelog; not re-verified here
- Promotion: production (2026-09-24 merge date, PR #34). Also development (PR #27), stage (PR #32, 2026-09-24).
- Notes: PR #34 bundles CODA-2434, CODA-2480, and CODA-2481 plus `Added production sync` (a one-line `zesty-deploy.yml` change). Follow-up `1762629` "Restore states/cities territory variables in client-global-navigation" (Kharl, 2026-09-26, +20 lines) landed directly on stage and is in development and production; it appears to repair content lost in a later merge (inferred from its message).

## Open Questions / Flags

- **Seed discrepancy.** The seed changelog (dated 2026-09-25, approved in the agent-lab repo) said the development -> stage PR for CODA-2434/2480/2481 was "not yet merged". Git shows PR #32 merged into stage on 2026-09-24 and PR #34 into production on 2026-09-24. Code wins: this log follows git. Seed "Docs updated" lines (`docs/content-models.md`, `docs/templates.md`, `docs/custom-patterns.md`) are omitted because those files are not tracked on `development`.
- **Reached production is not "published".** `zesty-deploy.yml` publishes only changed files on `production` pushes, and `sync-to-zesty.js` skips resources not yet on dev (`scripts/sync-to-zesty.js`, `publishItem`). No workflow run results were read, so a successful live publish of any entry above is unknown.
- **Ticket IDs missing** for tags-pages, locations-endpoint-sync, the pvl untracking, and the 2026-10-15 workflow chores (no `coda-<ID>` branch or commit reference). Also unconfirmed: CODA-2532's link to the "Remove location finder" commit, and CODA-2536's scope beyond `client-global-navigation`.
- **Verified by is "not recorded"** for every entry except the three seed entries, because no QA report, task-tracker status, or review artifact was read. Seed QA claims name agents that are no longer used; they are summarised without the agent names.
- **`docs/` is gitignored** (`.gitignore`: `docs/`), so this file and the other standard docs will not be committed unless the rule changes. Decision needed from a human. Likewise `CLAUDE.md` is listed in `.gitignore` yet `git ls-files` shows it tracked on `development` (and the working tree shows it modified), despite the "Untrack CLAUDE.md" commit `341cca8`; not investigated.
- **Excluded from this log:** work merged before 2026-09-24 (earlier PRs #2 to #26 back to 2026-06-30, `development`/`stage` sync merges); unmerged branches (`coda-2560`, `chore/deploy-fail-loud`, `agent-lab`, `lab/*`, `coda-2566`, `coda-2571`, `coda-2576`, `coda-2569`); merge commits that only sync one branch into another (for example "Merge branch 'stage' into coda-...") except where they are the PR itself; and `main`-only history other than PRs #41, #42, #49, #50, #62.
- **Credential note.** Commit `241c201` says `.mcp.json` held a live Zesty session token before it was untracked on 2026-09-22. Not verified which history it remains in; rotation is a human decision.
- **Local `main` is stale.** Local `main` is `94299f6`; `origin/main` is `630a0d3`. Entries use `origin/*` refs.

## Review status

Not yet reviewed. All entries are Draft — pending review.
