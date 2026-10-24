# The Salvation Army National Website

## About

WebEngine source for The Salvation Army's Zesty.io instance (`8-da979ebeab-d59gnx`,
"national-website"). National and all four territories (Central, East, South, West) share
this one instance, so a change for one territory can affect every site. Project type: `website`.

This is a Zesty.io templating project. No database, no build step, no bundler, no lint
config, no custom backend. Don't add any of them or assume Node-app tooling. The only test
tooling is Node's built-in test runner and Playwright (see "Running and testing").
Content lives in Zesty and is reached only through Parsley and the Instance API.

Machine-readable configuration (commands, quality gates, environments, integrations):
`.claude/project.yaml`.

## Standards

This project follows the zesty-ai shared standards (load the
`zesty-ai:engineering-standards` skill). Project rules below add to them.

## Architecture

- `webengine/views/`: Parsley views, synced 1:1 to Zesty resources by ZUID.
  - `-/block/`: Block Library, inserted via `{{block('/-/block/name.html?variant=...')}}`.
  - `modules/`: page and section modules.
  - `components/`: small UI pieces. Some render only placeholder markup, and the real
    rendering happens in inline JS template strings in the module that owns them.
  - `*.json` views: headless JSON endpoints (e.g. `get-events.json`, `find-story.json`).
- `webengine/styles/`: stylesheets (`common/`, `components/`, `modules/` SCSS partials).
- `webengine/scripts/`: site scripts.
- `scripts/sync-to-zesty.js`: the only thing that moves local files to the instance.
- `scripts/locations-endpoint-sync/`: separate Node service that writes the preview and live
  `locations.json` endpoints. It has its own `package.json` and README.
- `zesty.config.json` (1.5 MB+): local path ↔ ZUID mapping. Partly generated. The deploy
  workflow commits new mappings back (`chore: map new Zesty resource ZUIDs [skip ci]`).
  Treat it as generated state.
- Platform-owned, never committed: `webengine/views/z/` (layouts) and
  `webengine/views/menu-config/` (menus). They're anchored in `.gitignore` and excluded in
  `sync-to-zesty.js` (`EXCLUDED_DIRS`).

## Conventions

- **Content models:** there's no schema file. Infer field shapes from the specific template
  (`this.fieldname`, `.getImage()`, `model.filter()`). Similar components don't share a schema.
  For example, the "Hero Full" variants (`modules/hero-full*`, `-/block/hero_full.html`) use at
  least four different field shapes.
- **Fallback images:** reuse `globals.default_og_image` (as in `views/custom_head`,
  `views/modules/hero`, `-/block/hero_full.html`). Don't invent a new mechanism.
- **Styling:** the design system is a custom Bootstrap 5 theme
  (https://github.com/zesty-io/salvation-army-theme), injected globally through
  `webengine/views/z/layouts/settings.json` via jsDelivr, pinned to a commit. Bumping the theme
  means changing that pin in the Zesty manager, not a webengine file. Prefer theme classes
  over new CSS. Check `webengine/styles/{common,components,modules}/` for an existing partial
  first. `webengine/styles/temporary-usn.css` redefines spacing utilities. That's known debt, not
  a pattern to follow.
- **Comments:** keep them minimal, only where they matter. Ticket numbers, debugging notes
  and agent notes belong in commits and PRs, not code.
- **Branches:** one branch per Coda ticket, named `coda-<ID>` (e.g. `coda-2541`).
  Use lowercase and hyphens with no `/`, because the branch name becomes the preview hostname.
  Suffixes are OK for follow-ups (`coda-2541-fix`). Production hotfix branches use `-prod`
  (`coda-2541-prod`, `coda-2529-2520-2500-prod`). Cut ticket branches from `development` with
  `--no-track` so they don't upstream to a shared branch.
- **Commits:** a type prefix in brackets: `[Feat]`, `[Fix]`, `[Chore]`, followed by a short
  imperative summary.
- **PRs:** ticket branch → `development` → `stage` → `production`. Keep `.md` and docs files
  out of PRs into `stage` and `production`.

## Tasks (Coda)

Tickets live in the Coda doc "Salvation Army National/Corps Website Project", in the `Tasks`
table. The branch number is the `ID` column: `coda-2541` → `ID = 2541`. The `Notes` column holds
the requirement. Other useful columns are `Progress Status`, `Owner`, `QA Assignee` and
`Solution/Action Taken`. Read the task; never change its status or fields without explicit
permission.

## Running and testing

There are no lint or build commands. To verify a change:

- `npm test`: static tests for every view (`tests/static/`): `if`/`each` nesting, tag braces,
  `include` targets, inline `<script>` syntax. No install or network needed.
- `npm run test:render`: Playwright opens real pages and checks each mapped module renders
  (`tests/render/module-pages.js`), with no unrendered Parsley and no new site JS errors.
  Defaults to production. Set `BASE_URL` (and `QA_ACCESS_QUERY`) for a preview or staging.
  Needs `npm ci` and `npx playwright install chromium` once.
- Existing problems are listed as known issues (`KNOWN_ISSUES` in the static test,
  `KNOWN_JS_ERRORS` in the render test). They show as TODO/annotations. Remove an entry once
  the view is fixed.
- `npm run validate`: PR checks against `origin/development` (forbidden paths, JSON, ZUIDs,
  unmappable new views, debug code).
- `npm run deploy:dry`: lists what a stage sync would change. It writes nothing.
- `REPORT=true node scripts/sync-to-zesty.js`: writes `zesty-report.md` (dry run). CI posts
  this on PRs into `stage` and `production`.
- Visual QA on the ticket's branch preview (see below), in a real browser.

Env var names: `ZESTY_INSTANCE_ZUID`, `ZESTY_DEVELOPER_TOKEN` (sync script), `ZESTY_TOKEN`,
`QA_ACCESS_QUERY`, `CODA_API_TOKEN` (zesty-ai helpers). Values go in the gitignored `.env`.
Previews and stage are password-protected (`zpw`). If a preview or stage URL returns 403 in
the browser, clear cache and cookies (fresh context) and retry once before reporting it.

## Environments and release

| Environment | URL | How it updates |
| --- | --- | --- |
| Branch preview | `https://8hxvw8tw-<branch>.webengine.zesty.io/` | Zesty GitHub integration, from the pushed branch's view files |
| development | `https://8hxvw8tw-development.webengine.zesty.io/` | GitHub integration preview of `development` |
| staging (instance dev version) | `https://8hxvw8tw-dev.webengine.zesty.io/` | push to `stage` → `zesty-deploy.yml` saves changed files to dev |
| production | `https://www.salvationarmyusa.org/` | push to `production` → `zesty-deploy.yml` publishes dev → live |

- Production pushes never write content. They only publish what's already on dev, so new
  files have to reach production through `stage` first.
- New files under `webengine/{views,styles,scripts}` are created as resources during a stage
  sync. Extensionless view files (type can't be inferred) are skipped until someone creates and
  maps them in the Zesty manager.
- `main` is **not** in the release flow, and it has deleted `.github/workflows/`. Never use
  `main` or a branch cut from it as a promotion source.
- Production releases need human approval.
- Production smoke checks (read-only): the homepage loads, plus one territory page, one
  location page (e.g. `/tx/houston/`) and the footer address on a location page.

## Project-specific restrictions

- Never trigger `zesty-deploy.yml` (`gh workflow run` or `workflow_dispatch`) yourself, and
  never deploy or publish. That's a human decision. A manual dispatch on a `coda-*` branch
  isn't a preview: it runs the stage path and writes that branch's files to the shared dev
  version (the staging URL).
- Don't treat a ticket branch or an unmerged PR as live. Before QA on a preview, confirm with
  the user that the branch is pushed.
- Never connect to a database.
- Never commit `webengine/views/z/` or `webengine/views/menu-config/`. Don't edit
  `.github/workflows/`; only a human changes those.
- Don't hand-edit `zesty.config.json` mappings unless the task is specifically about them.
- Zesty Instance API access is read-only unless a write is explicitly authorized.
