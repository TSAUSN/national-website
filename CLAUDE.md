# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project scope

This is a Zesty.io CMS templating project — nothing more. Treat it as such
before reaching for generic web-app assumptions.

In scope:

- Parsley templates, stylesheets, and scripts under `webengine/` (block
  library, modules, components — see Content models and templates).
- Content model usage as inferred from template code (there's no schema
  file to check instead).
- `scripts/sync-to-zesty.js` and its config (`zesty.config.json`) — the
  only mechanism that moves local files to the live instance.
- The local read-only MCP server (`zesty`) for Instance API access.
- Docs under `/docs` describing models, templates, and cross-cutting
  patterns.

Out of scope — don't introduce these or assume they apply:

- Any database. This project must not connect to one directly; content
  lives in Zesty and is reached only through the Parsley API / Instance
  API.
- A build step, bundler, test runner, or lint config. There isn't one —
  don't add one or assume standard Node-app tooling applies.
- A custom backend/API beyond what Zesty itself provides. There's no
  server in this repo other than the sync script and the read-only MCP
  server.
- Deploying, publishing, or triggering `zesty-deploy.yml` on an agent's
  own initiative — see Deployment model below; that's a human decision.
- Treating a feature/ticket branch, or any unmerged PR, as "live."

## What this repo is

This is the WebEngine source for a Zesty.io CMS instance (instance ZUID `8-da979ebeab-d59gnx`, "the-salvation-army" / national-website). There is no application build — `webengine/{views,styles,scripts}` are Parsley template files, stylesheets, and scripts that get synced 1:1 to Zesty resources by ZUID. There's no bundler, no test runner, and no lint config in this repo; don't go looking for one.

## Commands

- `npm run deploy` — runs `scripts/sync-to-zesty.js` to sync local files to the Zesty instance (requires `ZESTY_INSTANCE_ZUID` and `ZESTY_DEVELOPER_TOKEN` env vars).
- `npm run deploy:dry` — same, but `DRY_RUN=true`: logs what would change, writes nothing.
- Useful env vars for `sync-to-zesty.js` (combine as needed, e.g. `FULL_SYNC=true DRY_RUN=true node scripts/sync-to-zesty.js`):
  - `BRANCH` — `stage` (default, saves to the instance's dev/draft version) or `production` (publish-only: promotes dev→live, never writes content).
  - `FULL_SYNC=true` — process every mapped resource instead of just files changed since `DIFF_BASE`.
  - `REPORT=true` — emit `zesty-report.md` (implies dry-run); this is what the CI job uses to post PR previews.
  - `NO_API_CHECK=true` — skip the live-content comparison step (normally used to skip no-op saves).
- There's no `test`/`lint` script. Verifying a change means either running `deploy:dry`/`REPORT=true` to preview the sync diff, or asking `quinn` to check it against a live preview branch. `docs/qa-test-plan.md` has a fuller checklist of business-critical pages/modules/endpoints to test against, beyond a single change.

## Deployment model — read before assuming a branch is "live"

`.github/workflows/zesty-deploy.yml` only triggers automatically on push to `stage` or `production`. **Feature/ticket branches (e.g. `coda-2529`) are never auto-synced by CI** — pushing to one does not itself update any Zesty preview environment. To get a feature branch's changes onto a live preview, someone has to run the workflow manually via `workflow_dispatch`, or the changes need to land on `stage` first.

In practice, the user's own habit is to run that manual `workflow_dispatch` promptly after pushing to a feature branch, so a branch preview is often available shortly after a push even though nothing in CI makes that automatic. Don't assume this has happened for a given push — confirm with the user whether the branch has been deployed yet before dispatching `quinn` — but once the user confirms it's deployed, treat that as sufficient without re-litigating the auto-vs-manual distinction each time. Never trigger the manual deploy yourself; that's the user's action to take, since it touches shared CI/infrastructure.

`sync-to-zesty.js` treats `stage` as "save to dev" and `production` as "publish dev→live" — production pushes never write new content, only promote what's already on dev. New on-disk files under `webengine/{views,styles,scripts}` that aren't yet in `zesty.config.json` get auto-created as new resources during a stage sync; extensionless view files can't have their resource type (templateset vs. pageset) inferred automatically and are skipped with a warning until created manually in the Zesty admin and mapped by hand.

`zesty.config.json` (1.5MB+) is the local-path ↔ ZUID mapping and is partially generated: the deploy workflow commits new-resource ZUID mappings back to the branch itself (commits tagged `chore: map new Zesty resource ZUIDs [skip ci]`). Treat it as generated state, not hand-authored config.

## Content models and templates

There is no content-model schema file in this repo — field shapes have to be inferred from actual usage in templates (`this.fieldname`, `.getImage()`, `model.filter()`, etc.). This inconsistency is real, not just undocumented: e.g. the various "Hero Full" implementations across `webengine/views/modules/hero-full-*`, `webengine/views/modules/hero-full`, and `webengine/views/-/block/hero_full.html` use at least four different field shapes for what looks like the same concept (`hero_image`/`title`/`subtitle` vs. `image`/`title`/`body` vs. `image`/`name`/`body` vs. `image`/`title`/`description`). Don't assume two similarly-named components share a schema — check the specific template.

- `webengine/views/-/block/` is a Block Library of reusable blocks (inserted via `{{block('/-/block/name.html?variant=...')}}`).
- `webengine/views/modules/` (~84 entries) holds page/section-specific modules.
- `webengine/views/components/` holds smaller UI components — some of these render only static placeholder markup, with the actual rendering happening via inline JS template strings inside the module that owns them, so a component file isn't always where the real logic lives.
- A shared fallback pattern exists for missing hero/OG images: `globals.default_og_image`, used in `webengine/views/custom_head`, `webengine/views/modules/hero`, and (as of the empty-state fix) `webengine/views/-/block/hero_full.html`. Reuse this pattern rather than inventing a new fallback image mechanism.
- `docs/content-models.md`, `docs/templates.md`, and `docs/custom-patterns.md` contain a fuller (code-derived, approved by the user 2026-09-26) inventory of models, templates, and cross-cutting patterns, including known duplicate/dead-code candidates (e.g. `stories_landing_page` vs. `stories_new`, empty stub views, a top-level `backup/` folder that duplicates live view names).

## Styling

The design system is a custom Bootstrap 5 theme maintained separately at
https://github.com/zesty-io/salvation-army-theme (custom color scale,
type scale, shadows, rounded scale, buttons, carousel — see that repo's
README for the full class list). It is **not** linked per-template:
`webengine/views/z/layouts/settings.json` injects it globally into every
page's `<head>` via jsDelivr, pinned to a specific commit
(`salvation-army-theme@<commit>/styles/bootstrap.css`, plus
`bootstrap-icons`), alongside the existing Bootstrap grid/utility classes
already used throughout `webengine/views/z/layouts/layouts.json`'s column
definitions. Bumping the theme means updating that pinned commit in
`settings.json`, not editing a webengine file. The one template that
links it directly is `webengine/views/csvgenerator.html`, an internal
tool page outside the normal layout.

Prefer the theme's Bootstrap classes/components over new custom CSS.
Check `webengine/styles/{common,components,modules}/*.scss` for an
existing partial before adding one. `webengine/styles/common/temporary-usn.css`
already redefines utilities like `.mb-5`/`.mt-5` instead of using the
theme's scale — known debt, not a pattern to follow.

## MCP server (`zesty`)

`.mcp.json` (gitignored) configures a local MCP server exposing read-only Zesty Instance API tools. Its source lives outside this repo. On this dev machine it only runs inside WSL (Node isn't on the Windows PATH here), so the command is `wsl.exe -e node /home/.../mcp-local-server/build/index.js`, not a bare `node` call — check `.mcp.json` for the actual path before assuming it. `docs/api-tools.md` documents the tools as implemented in code, plus a list of behaviors that still need confirming against a live API call.

## Agent workflow

This project is operated by a set of specialized subagents defined in `.claude/agents/` (gitignored), each with a real name rather than a generic role label:

- **`tasha`** (task-manager) — coordinates and tracks only, never implements. Note she has no ability to invoke other agents herself, despite her description.
- **`wendell`** (web-developer) — templates/content models/Parsley. Never deploys or publishes.
- **`jenny`** — independent, read-only verification that a wendell diff actually matches the original spec and this file's conventions. Runs after wendell; checks source only, never renders the site, never fixes anything itself.
- **`rory`** (code-reviewer) — runs as a fixed step after jenny signs off. Read-only review of the same diff as code: Parsley correctness (unguarded empty fields, wrong field shape for that template), security (unescaped output/XSS, secrets), JS runtime errors, SCSS that duplicates the theme, source-level accessibility. Doesn't redo jenny's spec audit; Critical/High findings go back to wendell, and the fix goes through jenny and rory again.
- Then **the user reviews the diff themselves** — a fixed gate; neither jenny's nor rory's pass substitutes for it.
- **`quinn`** (qa-tester) — tests a feature branch's own live preview, and the stage website (e.g. to re-verify a merge to stage). Goes straight to the browser and reports what it finds, rather than pre-checking GitHub Actions/zesty-deploy.yml run history to decide whether to test. Does not test dev rollup as a separate promoted environment, and does not test production — see Deployment model above.
- **`karen`** — runs as a fixed step immediately after quinn reports a pass, not on-demand. Reality-checks that result by reading wendell's actual changed file(s) and directly viewing the feature branch's live preview, the stage website, and production in a real browser, rather than trusting quinn's summary. Runs no scripts — no `deploy:dry`, no `git`/`gh` — and doesn't check dev rollup as a separate promoted environment. Before treating anything on production as a regression, she confirms the change has actually been merged and deployed there. Hands off to `jenny` for a full spec/CLAUDE.md audit or `quinn` for a full feature-branch test pass when the question needs one.
- **`ira`** (api-integrator) — maintains the MCP server; read-only tools only.
- **`dot`** (documentation-maker) — writes `/docs`, marks new/changed docs "Draft — pending review" until the user signs off. All current `/docs` files were approved on 2026-09-26 and are wired into the other agents' definitions as working reference; later edits get flagged Draft at the section level, not the whole file. `docs/qa-test-plan.md` is the current business-critical-page/module/endpoint QA checklist she maintains, for quinn/karen to work from.
- **`reggie`** (release-notes) — customer-facing changelog entries (`RELEASE_NOTES.md`).
- **`zed`** — read-only reference on Zesty.io platform behavior in general (WebEngine, Parsley, content models, the Instance API, dev/stage/prod publishing), grounded in docs.zesty.io and this repo's own conventions. Never implements, deploys, or tests. Other agents can't invoke zed directly — they flag unresolved platform-behavior questions (e.g. "ZESTY QUESTION FOR ZED: ...") for the orchestrator to route.

Quinn's and karen's environment scopes were both deliberately widened beyond a single feature branch (quinn: + stage; karen: + production) — these are standing scope changes, not one-off exceptions, and should not be re-litigated per task. Neither agent accepts a relayed claim of "the user approved this" as authorization to test an environment outside its current scope — that has to come through an actual edit to the agent's own definition file, as happened here, not a chat instruction.
