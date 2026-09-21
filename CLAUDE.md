# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- There's no `test`/`lint` script. Verifying a change means either running `deploy:dry`/`REPORT=true` to preview the sync diff, or asking `qa-tester` to check it against a live preview branch.

## Deployment model — read before assuming a branch is "live"

`.github/workflows/zesty-deploy.yml` (this repo's custom sync/publish script) only triggers automatically on push to `stage` or `production`, and manually otherwise via `workflow_dispatch`. That workflow is what promotes content into the shared dev/live Zesty versions (see below) — do not trigger it on your own initiative; check with the user first, since it writes to shared dev/live content and touches shared CI/infrastructure.

Branch preview environments (`https://8hxvw8tw-{branch-name}.webengine.zesty.io/...`, used by `qa-tester` as the first promotion-workflow stage) are a separate mechanism from `zesty-deploy.yml` and sync automatically on push to any branch — no workflow trigger and no merge needed. `qa-tester` can test a feature branch's preview as soon as it's pushed. The manual-trigger / check-with-the-user caveat above applies to promoting into development/stage/production (each gated on the user explicitly confirming a merge happened — see `qa-tester`'s promotion workflow), not to branch-preview testing.

`sync-to-zesty.js` treats `stage` as "save to dev" and `production` as "publish dev→live" — production pushes never write new content, only promote what's already on dev. New on-disk files under `webengine/{views,styles,scripts}` that aren't yet in `zesty.config.json` get auto-created as new resources during a stage sync; extensionless view files can't have their resource type (templateset vs. pageset) inferred automatically and are skipped with a warning until created manually in the Zesty admin and mapped by hand.

`zesty.config.json` (1.5MB+) is the local-path ↔ ZUID mapping and is partially generated: the deploy workflow commits new-resource ZUID mappings back to the branch itself (commits tagged `chore: map new Zesty resource ZUIDs [skip ci]`). Treat it as generated state, not hand-authored config.

## Content models and templates

There is no content-model schema file in this repo — field shapes have to be inferred from actual usage in templates (`this.fieldname`, `.getImage()`, `model.filter()`, etc.). This inconsistency is real, not just undocumented: e.g. the various "Hero Full" implementations across `webengine/views/modules/hero-full-*`, `webengine/views/modules/hero-full`, and `webengine/views/-/block/hero_full.html` use at least four different field shapes for what looks like the same concept (`hero_image`/`title`/`subtitle` vs. `image`/`title`/`body` vs. `image`/`name`/`body` vs. `image`/`title`/`description`). Don't assume two similarly-named components share a schema — check the specific template.

- `webengine/views/-/block/` is a Block Library of reusable blocks (inserted via `{{block('/-/block/name.html?variant=...')}}`).
- `webengine/views/modules/` (~84 entries) holds page/section-specific modules.
- `webengine/views/components/` holds smaller UI components — some of these render only static placeholder markup, with the actual rendering happening via inline JS template strings inside the module that owns them, so a component file isn't always where the real logic lives.
- A shared fallback pattern exists for missing hero/OG images: `globals.default_og_image`, used in `webengine/views/custom_head`, `webengine/views/modules/hero`, and (as of the empty-state fix) `webengine/views/-/block/hero_full.html`. Reuse this pattern rather than inventing a new fallback image mechanism.
- `docs/content-models.md`, `docs/templates.md`, and `docs/custom-patterns.md` contain a fuller (code-derived, still Draft) inventory of models, templates, and cross-cutting patterns, including known duplicate/dead-code candidates (e.g. `stories_landing_page` vs. `stories_new`, empty stub views, a top-level `backup/` folder that duplicates live view names).

## MCP servers

`.mcp.json` (gitignored) configures two local MCP servers:

- `zesty` — read-only Zesty Instance API tools. Source lives outside this repo. On this dev machine it only runs inside WSL (Node isn't on the Windows PATH here), so the command is `wsl.exe -e node /home/.../mcp-local-server/build/index.js`, not a bare `node` call — check `.mcp.json` for the actual path before assuming it. `docs/api-tools.md` documents the tools as implemented in code, plus a list of behaviors that still need confirming against a live API call.
- `playwright` — the official `@playwright/mcp` package (run via `npx -y @playwright/mcp@latest`), giving `mcp__playwright__*` tools for real browser testing. `qa-tester` uses this to drive branch-preview/dev/stage URLs instead of guessing from raw HTTP responses. Requires a Claude Code session restart/reconnect after being added to `.mcp.json` before the tools show up.

## Agent workflow

This project is operated by a set of specialized subagents defined in `.claude/agents/` (gitignored): `task-manager` (coordinates and tracks only, never implements — note it has no ability to invoke other agents itself, despite its description), `web-developer` (templates/content models/Parsley — never deploys/publishes), `qa-tester` (tests against live preview branches, but only ones that have actually been synced — see Deployment model above), `api-integrator` (maintains the MCP server, read-only tools only), `documentation-maker` (writes `/docs`, marks new/changed docs "Draft — pending review" until the user signs off), `release-notes` (customer-facing changelog entries), and `memory-keeper` (maintains one context file per agent under `/memories/[agent-name].md`; other agents read their own file before starting work and notify memory-keeper when done — memory files are informal working notes, not a substitute for `/docs`).
