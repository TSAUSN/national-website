# API Tools

Status: Draft — pending review
Last generated: 2026-10-15 by zesty-ai:documentation (source read of helpers + seeded from the 2026-09-24 agent-lab doc; no live calls made)

The API clients and MCP tools that agents can use on this project, with what each one has been verified to do. Credentials are referenced by environment variable **name** only. Instance ZUID for this project: `8-da979ebeab-d59gnx` (an identifier, not a secret).

Evidence labels: **verified** = read in source on 2026-10-15; **seed** = carried over from the 2026-09-24 agent-lab `docs/api-tools.md` and not re-checked; **unknown** = could not be checked.

## What this is

Agents have four read-only paths to live data and one write-capable script. Everything except the sync script is read-only.

| Tool | Where it lives | Reads / writes | Used for |
| --- | --- | --- | --- |
| `zesty-api.mjs` | zesty-ai plugin 0.9.0, `scripts/` | GET only | Zesty Instances, Accounts, Auth APIs (models, fields, items, settings, users) |
| `coda-api.mjs` | zesty-ai plugin 0.9.0, `scripts/` | GET only | Reading this project's tasks in Coda |
| `qa-url.mjs` | zesty-ai plugin 0.9.0, `scripts/` | No network calls | Building the preview URL QA opens (adds the access query) |
| `zesty` MCP server (local, 41 tools) | outside this repo (WSL) | read-only (all tools are `get-*`, `search-*`, `verify-*`) | Same Zesty management data as `zesty-api.mjs`, as MCP tools |
| `scripts/sync-to-zesty.js` | this repo | **writes** to the Zesty instance | CI deploy of `webengine/` files (stage: save; production: publish) |
| `scripts/locations-endpoint-sync/` | this repo | **writes** to the Zesty instance | Webhook-driven rebuild of the locations JSON view |

All of these act on the Zesty **management** layer (code, models, content, settings), not on the rendered site. For what the site displays, QA uses the branch preview, stage, or production URLs.

Agents here are the zesty-ai plugin agents (for example `zesty-expert` for platform questions); this doc does not name project-specific custom agents.

## Architecture (as implemented)

### zesty-ai plugin helpers (verified)

Path: `C:/Users/enriq/.claude/plugins/cache/zesty-ai/zesty-ai/0.9.0/scripts/`. All three are dependency-free Node 18+ scripts. Exit codes: 0 success, 1 HTTP/network error, 2 usage/config error.

**`zesty-api.mjs`** (`zesty-api.mjs:1-27`)
- Usage: `node zesty-api.mjs <path> [--api instances|accounts|auth] [--instance 8-xxxx-xxxx] [--pick a,b] [--max-bytes N] [--dry-run]`.
- GET only; there is no option to change the method (unknown options are rejected, `zesty-api.mjs:58`). The caller passes a path, never a URL (`validatePath`, `:69-75`), so the token only goes to fixed hosts: `https://<instance>.api.zesty.io/v1` (instances, default), `https://accounts.api.zesty.io/v1`, `https://auth.api.zesty.io` (`:146-150`). Redirects are refused (`:172-181`), requests time out at 30 s, output is truncated at 100,000 bytes by default, and the token is redacted from output.
- Instance ZUID must match `8-xxxx-xxxx` (`:34`, `:141`) and comes from `--instance` or `ZESTY_INSTANCE_ZUID`.
- `--dry-run` prints the URL and where the token came from, without calling.

**`coda-api.mjs`** (`coda-api.mjs:1-31`)
- Usage: `node coda-api.mjs <path> [--query EXPR] [--param key=value]... [--pick a,b] [--all-pages] [--max-pages N] [--max-bytes N] [--dry-run]`.
- GET only, fixed host `https://coda.io/apis/v1` (`:38`), path validated like above, redirects refused, token redacted. `--all-pages` follows `nextPageToken` up to `--max-pages` (default 10, max 50). A 429 prints a "wait and retry" message.
- This project's tasks (identifiers given by the project owner; **not re-verified here**, no call made): doc `GNetDKGq5M`, table `Tasks`, id column `ID`. Illustrative command (shape unverified, including whether `ID` is numeric or text): `node coda-api.mjs /docs/GNetDKGq5M/tables/Tasks/rows --query '"ID":"<id>"' --param useColumnNames=true`. List columns first with `/docs/GNetDKGq5M/tables/Tasks/columns --pick id,name`.

**`qa-url.mjs`** (`qa-url.mjs:1-26`)
- Usage: `node qa-url.mjs <url> [--dry-run]`. Makes no network call; prints the URL with the value of `QA_ACCESS_QUERY` (a query string such as `zpw=<password>`) appended. Only `http`/`https` URLs without embedded credentials are accepted (`:111-112`). With no value found it prints the URL unchanged. `--dry-run` redacts the value and names its source.
- The value is a secret: never paste the printed URL into reports, PR comments, or chat (`qa-url.mjs:23-24`). Use `--dry-run` to check setup.

How the helpers find credentials (first source that has the value wins):

| Helper | Order |
| --- | --- |
| `zesty-api.mjs` | environment, then project `.env` (current folder up to the git root), then `ZESTY_ENV_FILE`, `~/.config/zesty-ai/zesty.env`, `~/.config/zesty-mcp.env` (`:112-125`). Only `ZESTY_*` keys are read. |
| `coda-api.mjs` | environment, then project `.env`, then `CODA_ENV_FILE`, `~/.config/zesty-ai/coda.env`, `~/.config/zesty-ai/zesty.env` (`:124-140`). Only `CODA_API_TOKEN` is read. |
| `qa-url.mjs` | environment, then project `.env`, then `QA_ENV_FILE`, `~/.config/zesty-ai/zesty.env` (`:85-101`). Only `QA_ACCESS_QUERY` is read. |

Each helper warns if the project `.env` is not git-ignored. This repo's `.gitignore` lists `.env`.

### Local `zesty` MCP server (seed, with 2026-10-15 source re-check)

- **Source is outside this repo.** It is a separate Node/TypeScript project at `/home/kharljhon14/projects/zesty/mcp-local-server` in WSL (readable from Windows at `\\wsl.localhost\Ubuntu\home\kharljhon14\projects\zesty\mcp-local-server`; read for this doc on 2026-10-15). It uses `@zesty-io/sdk`, an MCP stdio transport, and Sentry (`src/index.ts`: verified imports).
- **Registration.** `.mcp.json` is gitignored (`.gitignore:4`, confirmed with `git check-ignore`) and **does not exist in `g:\_zesty\the-salvation-army`** (checked 2026-10-15), so the server is not registered for this checkout. It does exist in the agent-lab checkout (`g:\_zesty\the-salvation-army-agent-lab\.mcp.json`, modified 2026-09-26), where it registers two servers (names, commands, and paths only):
  - `zesty`: command `wsl.exe`, args `-e bash -lc "set -a; . ~/.config/zesty-mcp.env; set +a; exec node /home/kharljhon14/projects/zesty/mcp-local-server/build/index.js"`. The credentials are no longer inline in the command: they come from the WSL file `~/.config/zesty-mcp.env`, which was not opened for this doc.
  - `playwright`: `npx @playwright/mcp@latest`, a browser-automation server unrelated to Zesty and out of scope here.
  - This differs from the 2026-09-24 seed, which showed the variables set inline in the `bash -lc` string.
- **Boot.** `src/tools/register.ts` creates `new SDK(ZESTY_INSTANCE_ZUID, ZESTY_SESSION_TOKEN, opts)` (`register.ts:19`) and calls `sdk.auth.verifyToken(ZESTY_SESSION_TOKEN)` once (`:22`). Custom API base URLs (`opts`) are read from `ZESTY_AUTH_API`, `ZESTY_ACCOUNTS_API`, `ZESTY_INSTANCES_API`, `ZESTY_MEDIA_MANAGER_API` (`:12-15`); whether the env file sets any of them is unknown, so whether calls hit the default (production) endpoints is unconfirmed.
- **Shape.** Zod-validated params, then `sdk.<domain>.<method>(...)`, returning `JSON.stringify(data)` as text content, or an `Error: <message>` result (seed). The SDK is typed `any`, so response shapes are not statically checked (seed).
- **Re-check result (2026-10-15, source read only).** 41 tool names found under `src/tools` (`grep` of the registered names), all `get-*`, `search-content-item`, or `verify-session`; the SDK methods they call are all read methods (`get*`, `fetch*`, `findItem`, `verifyToken`). The set matches the seed inventory below one-for-one (1 + 3 + 6 + 13 + 18 = 41). Files under `src/tools` carry a 2026-09-19 modification time, the same date as the seed's scan baseline. Per-tool parameters were not re-read; they are seed.

## Auth

| Variable | Used for | Where it is set |
| --- | --- | --- |
| `ZESTY_TOKEN` | `zesty-api.mjs` bearer token (falls back to `ZESTY_SESSION_TOKEN`) | environment, project `.env` (gitignored), or `~/.config/zesty-ai/zesty.env` |
| `ZESTY_SESSION_TOKEN` | fallback token for `zesty-api.mjs`; the token the `zesty` MCP server reads | `~/.config/zesty-mcp.env` (WSL/home), per the agent-lab `.mcp.json`; contents not read |
| `ZESTY_INSTANCE_ZUID` | which instance the Instances API and MCP server target (`8-da979ebeab-d59gnx`); also a CI secret name | `.env`, environment, `~/.config/zesty-mcp.env`; GitHub Actions secret |
| `ZESTY_ENV_FILE` | optional path to an env file for `zesty-api.mjs` | environment |
| `ZESTY_AUTH_API`, `ZESTY_ACCOUNTS_API`, `ZESTY_INSTANCES_API`, `ZESTY_MEDIA_MANAGER_API` | optional base-URL overrides read by the MCP server | MCP server environment; set or not is unknown |
| `CODA_API_TOKEN` | `coda-api.mjs` bearer token | environment, project `.env`, or `~/.config/zesty-ai/coda.env` |
| `CODA_ENV_FILE` | optional env-file path for `coda-api.mjs` | environment |
| `QA_ACCESS_QUERY` | access query (for example `zpw=...`) appended to preview URLs by `qa-url.mjs` | environment, project `.env`, or `~/.config/zesty-ai/zesty.env` |
| `QA_ENV_FILE` | optional env-file path for `qa-url.mjs` | environment |
| `ZESTY_DEVELOPER_TOKEN` | `scripts/sync-to-zesty.js` bearer token | GitHub Actions secret (`.github/workflows/zesty-deploy.yml:40`, `pr-preview.yml:32`); local runs via environment |
| `DEV_TOKEN` | bearer token used by `locations-endpoint-sync` for the Zesty Instances API and the site fetch | `.env` locally (gitignored); GCP Secret Manager secret `locations-webhook-dev-token` when deployed (README) |
| `INSTANCE_ZUID` | instance for `locations-endpoint-sync` | `.env` locally or `deploy.config.json` `envVars` (gitignored) when deployed |
| `LOCATIONS_ENDPOINT_PATH`, `LOCATIONS_LIVE_DOMAIN`, `LOCATIONS_PREVIEW_DOMAIN`, `LOCATIONS_VIEW_ZUID`, `LOCATIONS_VIEW_DEV_ZUID` | source endpoint, domains, and target view ZUIDs for `locations-endpoint-sync` | `.env` or `deploy.config.json` `envVars` |
| `REBUILD_DEBOUNCE_MS`, `PUBLISH_PROPAGATION_DELAY_MS`, `LOCATIONS_FETCH_TIMEOUT_MS`, `LOCATIONS_FETCH_MAX_RETRIES`, `LOCATIONS_FETCH_RETRY_DELAY_MS` | tuning for `locations-endpoint-sync` (defaults 45000, 5000, 120000, 3, 15000 ms) | optional; same places |

Never print or commit values. A session token for the MCP server was once committed in `.mcp.json` before it was untracked (see `docs/changelog.md`, 2026-10-05 CODA-2533 note); rotation is a human decision.

## Tool inventory

### Zesty MCP server: Auth and Accounts

Status for every row below: **Draft — pending review**. Tool names and SDK calls verified from source on 2026-10-15 (set-level match); inputs and output descriptions are seed; **response shapes not verified against a live response** (not re-verified 2026-10-15).

| Tool | Endpoint (SDK call) | Inputs | Output (seed, shape unverified) | Verified on | Status |
| --- | --- | --- | --- | --- | --- |
| `verify-session` | `sdk.auth.verifyToken` | none | whatever the SDK returns | 2026-10-15 source read; not live | Draft — pending review / not re-verified 2026-10-15 |
| `get-instances` | `sdk.account.getInstances` | none | array from `.data`, or a plain-text "no active instances" message | same | Draft — pending review / not re-verified 2026-10-15 |
| `get-instance` | `sdk.account.getInstance` | none (uses `ZESTY_INSTANCE_ZUID`) | current instance `.data` | same | Draft — pending review / not re-verified 2026-10-15 |
| `get-instance-users` | `sdk.account.getInstanceUsers` | none | users of the current instance | same | Draft — pending review / not re-verified 2026-10-15 |

### Zesty MCP server: Media

| Tool | Endpoint (SDK call) | Inputs | Output (seed) | Verified on | Status |
| --- | --- | --- | --- | --- | --- |
| `get-bins` | `sdk.media.getBins` | none | bins | 2026-10-15 source read; not live | Draft — pending review / not re-verified 2026-10-15 |
| `get-bin` | `sdk.media.getBin` | `BIN_ZUID` | one bin | same | same |
| `get-groups` | `sdk.media.getGroups` | `BIN_ZUID` | groups in a bin | same | same |
| `get-group` | `sdk.media.getGroup` | `GROUP_ZUID` | one group | same | same |
| `get-files` | `sdk.media.getFiles` | `BIN_ZUID` | files in a bin | same | same |
| `get-file` | `sdk.media.getFile` | `FILE_ZUID` | one file | same | same |

### Zesty MCP server: Instances, content and models

| Tool | Endpoint (SDK call) | Inputs | Output (seed) | Verified on | Status |
| --- | --- | --- | --- | --- | --- |
| `get-models` | `sdk.instance.getModels` | none | all content models | 2026-10-15 source read; not live | Draft — pending review / not re-verified 2026-10-15 |
| `get-model` | `sdk.instance.getModel` | `MODEL_ZUID` | one model | same | same |
| `get-fields` | `sdk.instance.getModelFields` | `MODEL_ZUID` | all fields of a model (the tool to use to replace "inferred" field types in content-model docs) | same | same |
| `get-field` | `sdk.instance.getModelField` | `MODEL_ZUID`, `FIELD_ZUID` | one field definition | same | same |
| `get-items` | `sdk.instance.getItems` | `MODEL_ZUID` | description says "most recently edited item"; name is plural; single item or list is unconfirmed | same | same |
| `get-item` | `sdk.instance.getItem` | `MODEL_ZUID`, `ITEM_ZUID` | one item | same | same |
| `search-content-item` | `sdk.instance.findItem` | `SEARCH_TERM` | search by ZUID, meta text, or path values | same | same |
| `get-item-versions` | `sdk.instance.getItemVersions` | `MODEL_ZUID`, `ITEM_ZUID` | all versions | same | same |
| `get-item-version` | `sdk.instance.getItemVersion` | `MODEL_ZUID`, `ITEM_ZUID`, `VERSION` (string) | one version | same | same |
| `get-item-labelings` | `sdk.instance.fetchItemLabelings` | `MODEL_ZUID`, `ITEM_ZUID` | item labels | same | same |
| `get-item-labeling` | `sdk.instance.fetchItemLabeling` | `MODEL_ZUID`, `ITEM_ZUID`, `LABEL_ZUID` | one labeling | same | same |
| `get-item-publishings` | `sdk.instance.getItemPublishings` | `MODEL_ZUID`, `ITEM_ZUID` | publishing history | same | same |
| `get-item-publishing` | `sdk.instance.getItemPublishing` | `MODEL_ZUID`, `ITEM_ZUID`, `PUBLISHING_ZUID` | one publishing record | same | same |

### Zesty MCP server: Instances, site configuration

| Tool | Endpoint (SDK call) | Inputs | Output (seed) | Verified on | Status |
| --- | --- | --- | --- | --- | --- |
| `get-langs` | `sdk.instance.fetchLangs` | none | non-deleted languages | 2026-10-15 source read; not live | Draft — pending review / not re-verified 2026-10-15 |
| `get-links` / `get-link` | `fetchLinks` / `fetchLink` | none / `LINK_ZUID` | links | same | same |
| `get-labels` / `get-label` | `fetchLabels` / `fetchLabel` | none / `LABEL_ZUID` | labels | same | same |
| `get-redirects` / `get-redirect` | `fetchRedirects` / `fetchRedirect` | none / `REDIRECT_ZUID` | redirects | same | same |
| `get-settings` / `get-setting` | `getSettings` / `getSetting` | none / `SETTING_ZUID` | instance settings | same | same |
| `get-stylesheet-variables` / `get-stylesheet-variable` | `fetchStylesheetVariables` / `fetchStylesheetVariable` | none / `VARIABLE_ZUID` | stylesheet variables | same | same |
| `get-stylesheets` / `get-stylesheet` | `getStylesheets` / `getStylesheet` | none / `STYLESHEET_ZUID` | stylesheets | same | same |
| `get-web-headers` | `getWebHeaders` | none | legacy headers | same | same |
| `get-head-tags` / `get-head-tag` | `getHeadTags` / `getHeadTag` | none / `HEADTAG_ZUID` | head tags | same | same |
| `get-audit-logs` / `get-audit-log` | `getAuditLogs` / `getAuditLog` | none / `AUDIT_ZUID` | audit trail | same | same |

(All SDK calls in this table are `sdk.instance.<method>`.) That is 18 tools: 1 + 2 + 2 + 2 + 2 + 2 + 2 + 1 + 2 + 2 = 18.

### Plugin helper: `zesty-api.mjs` (equivalent read paths)

The helper can answer the same management questions without the MCP server. The path is appended to the host for the chosen `--api`; paths below come from the helper's own usage comments, not from a live check.

| Tool | Endpoint | Inputs | Output (verified shape) | Verified on | Status |
| --- | --- | --- | --- | --- | --- |
| `zesty-api.mjs` | `GET /content/models` on the instance host | `--pick ZUID,name,label` | JSON with a `data` array; `--pick` filters fields of `data` | usage comment read 2026-10-15; no call | Draft — pending review |
| `zesty-api.mjs` | `GET /content/models/<model-zuid>/fields` | model ZUID | fields for a model | same | Draft — pending review |
| `zesty-api.mjs` | `GET /users/verify` with `--api auth` | none | token verification | same | Draft — pending review |

### Repo script: `scripts/sync-to-zesty.js` (WRITES)

- **What it does** (`scripts/sync-to-zesty.js`): reads `zesty.config.json`, maps its `views`, `styles`, `scripts` entries to files under `webengine/`, and calls the Instances API at `https://<ZESTY_INSTANCE_ZUID>.api.zesty.io/v1`. Branch `stage` (default `BRANCH`): creates new resources (`POST /web/<views|stylesheets|scripts>`) and saves changed files to the dev version (`PUT /web/<endpoint>/<zuid>`), no publish. Branch `production` or `MANUAL_PUBLISH=true`: publishes the existing dev version (`POST /web/<endpoint>/<zuid>/versions/<n>?purge_cache=true`), no content writes and no creates. `webengine/views/z` and `webengine/views/menu-config` are excluded (`:44-45`).
- **Env:** `ZESTY_INSTANCE_ZUID`, `ZESTY_DEVELOPER_TOKEN`, plus switches `BRANCH`, `MANUAL_PUBLISH`, `FULL_SYNC`, `DIFF_BASE`, `DIFF_HEAD`, `NO_API_CHECK`, `DRY_RUN`, `REPORT`.
- **Commands** (`package.json`): `npm run deploy` (writes), `npm run deploy:dry` (`DRY_RUN=true`).
- **Agent rule: agents may run it only with `DRY_RUN=true` or `REPORT=true`** (`REPORT` implies dry-run and emits a Markdown summary). Never run `npm run deploy` or the script without one of them. Note: a dry run with a token still makes GET calls to fetch current instance code (`CAN_CHECK`, `:19`, `:405`, `:427-428`); set `NO_API_CHECK=true` for a fully offline run. Without a token a dry run does not exit early (`:301`) and skips those fetches.
- **Where it runs in CI:** `.github/workflows/zesty-deploy.yml` (push to `stage`/`production`, or manual dispatch; commits new-resource ZUID mappings in `zesty.config.json` back to the branch) and `.github/workflows/pr-preview.yml` (PRs into `stage`/`production`; `REPORT=true`, posts a PR comment). Humans trigger deploys; agents must not trigger the deploy workflow.

### Repo script: `scripts/locations-endpoint-sync/` (WRITES)

- **What it does** (README and `src/*.js`, read 2026-10-15): receives a Zesty webhook on the locations model, then rebuilds the full locations JSON by fetching a Parsley endpoint (`LOCATIONS_ENDPOINT_PATH` on the live domain for publish/delete events, the preview domain for update events; retries 502/503/504 and timeouts up to 3 attempts), and writes the result into two Zesty view files with `PUT /web/views/<zuid>` (`src/zesty-view-commit.js`). The live view (`LOCATIONS_VIEW_ZUID`) is published with `?action=publish&purge_cache=true` only for publish/delete events; the dev view (`LOCATIONS_VIEW_DEV_ZUID`) is always draft-only. Event type is inferred from the webhook's message text by regex (`webhook-handler.js:classifyAction`). Rebuilds are debounced in memory (45 s default) and the handler answers `202` before the rebuild runs.
- **What it writes:** only those two views in the Zesty instance. It writes nothing to this repo.
- **How it is deployed:** runs locally as an Express server (`npm start`, `src/webhook-server.js`) or as a Cloud Functions 2nd-gen HTTP function (`index.js`, entry point `locationsWebhook`) deployed by `npm run deploy` (`scripts/deploy.js` runs `gcloud functions deploy --gen2`, then `gcloud run services update --no-cpu-throttling --concurrency=1`). Settings come from the gitignored `deploy.config.json` (template `deploy.config.example.json`: region `us-central1`, runtime `nodejs20`, max instances 1, `allowUnauthenticated: true`). The secret is read from GCP Secret Manager.
- **Agent rule:** do not run `npm start`, `npm run deploy`, or POST to the function: all write to Zesty or GCP. Reading the source is fine.
- **Merged via:** `main` PRs #41, #42, #49, #50; reached development/stage/production through the `tags-pages` branch (see `docs/changelog.md`).

## Needs live verification

- Response shape of every MCP tool above (SDK typed `any`; only variable names are known). Not verified live on 2026-10-15; no live calls were made.
- `get-items`: single item or list, given the plural name and singular description (seed).
- `search-content-item`: what "meta text or path values" matches and multi-result shape (seed).
- `get-item-version`: `VERSION` as a number-as-string versus a version ZUID (seed).
- MCP boot behaviour if the token is invalid: `verifyToken` at `register.ts:22` has no visible catch in the seed; not re-read in detail.
- Whether the MCP server targets default (production) Zesty endpoints, given the unknown contents of `~/.config/zesty-mcp.env`.
- Pagination and truncation of "get all" tools (`get-models`, `get-audit-logs`, ...): no pagination params; SDK internals unknown (seed).
- `coda-api.mjs` against `GNetDKGq5M` / `Tasks`: table and column names, and the type of the `ID` column, have not been checked live.
- `zesty-api.mjs` endpoint paths above come from the helper's usage comments and were not called.

## Open Questions / Flags

- **MCP server not registered here.** `g:\_zesty\the-salvation-army\.mcp.json` does not exist; only the agent-lab checkout has one. If agents in this checkout should use the `zesty` MCP tools, a gitignored `.mcp.json` must be created locally, without committing tokens. Until then, use `zesty-api.mjs`.
- **MCP source is outside the repo** and outside version control for this project, so its tool set can change without a diff here. The 2026-10-15 read matched the seed's 41 tools; its `git log` could not be run (git "dubious ownership" on the WSL path), so the date of the last source change is inferred from file modification times only.
- **Token-in-config history.** The seed's earlier `.mcp.json` embedded a session token. The agent-lab file now sources an env file instead. Whether the old token was rotated is unknown.
- **`locations-endpoint-sync` hygiene.** The deploy example sets `allowUnauthenticated: true`, and the handler does no sender verification (`webhook-handler.js`); any caller that can reach the URL can trigger a rebuild and, with a crafted message text, a publish. The site fetch also sends `DEV_TOKEN` as a bearer to `LOCATIONS_LIVE_DOMAIN` / `LOCATIONS_PREVIEW_DOMAIN`. These are observations from source, not verified against the deployed function. Whether and where it is deployed is unknown.
- **`sync-to-zesty.js` safety.** Local `npm run deploy` writes to the instance with no confirmation prompt (not seen in the source read). Convention here: dry-run or report only.
- **Seed items dropped.** The seed's Sentry user, empty prompts/resources stubs, and references to project-specific custom agents were not carried over, or were condensed.
- **`docs/` is gitignored** in this repo (`.gitignore:9`), so this file will not be committed unless the rule changes.
- PLATFORM QUESTION (zesty): whether `GET /users/verify` on the auth host and the paths used in the helper's examples are current for the Zesty APIs; taken from the helper's comments, not from official documentation.

## Review status

Not yet reviewed.
