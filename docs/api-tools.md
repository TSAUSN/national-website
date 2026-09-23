# API Tools — `zesty` MCP Local Server

Status: **Draft — pending review**
Last generated: 2026-09-24 by api-integrator (full re-verification pass against `mcp-local-server` source + live `.mcp.json`)

## What this is

`.mcp.json` in this repo (gitignored) registers **two** local MCP servers. This doc covers only the **`zesty`** server — the `playwright` entry (`npx @playwright/mcp@latest`) is a separate, unrelated MCP server for browser automation and is out of scope here.

As of 2026-09-24, `.mcp.json` looks like this (token redacted):

```json
{
  "mcpServers": {
    "zesty": {
      "command": "wsl.exe",
      "args": ["-e", "bash", "-lc", "ZESTY_SESSION_TOKEN='PTK-...' ZESTY_INSTANCE_ZUID='8-da979ebeab-d59gnx' node /home/kharljhon14/projects/zesty/mcp-local-server/build/index.js"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

This is a **shape change from an earlier version of this doc**: the `zesty` entry used to be a bare `wsl.exe -e node ...` command with a top-level MCP `"env"` block (`{ "ZESTY_SESSION_TOKEN": ..., "ZESTY_INSTANCE_ZUID": ... }`). It no longer has an `env` key at all — the same two env vars are now set inline, ahead of the `node` invocation, inside a single `bash -lc "..."` string passed to `wsl.exe -e bash -lc`. Functionally this is equivalent (both vars still land in the child process's environment before `index.js` runs), but if you're editing `.mcp.json` by hand, don't go looking for an `env` object — it's not there anymore.

The server's **source code is a separate project** at `/home/kharljhon14/projects/zesty/mcp-local-server` (WSL), reachable from this machine at `\\wsl.localhost\Ubuntu\home\kharljhon14\projects\zesty\mcp-local-server`, and was read directly (via `wsl.exe`) for this documentation pass — this is **not** the same thing as the Parsley `.json` ajax endpoints documented in `docs/templates.md`; this MCP server talks to Zesty's **account/instance management REST APIs** (via the `@zesty-io/sdk` npm package), not to the rendered website.

## Architecture (as implemented)

- `src/index.ts` boots an `McpServer` (stdio transport), wraps it with Sentry, and calls `registerAllTools()`.
- `src/tools/register.ts` instantiates `new SDK(ZESTY_INSTANCE_ZUID, ZESTY_SESSION_TOKEN, opts)` from `@zesty-io/sdk`, calls `sdk.auth.verifyToken(...)` once (also used to set the Sentry user), then registers four domain groups: **Auth**, **Accounts**, **Instances** (16 sub-domains), **Media**.
- `opts` (custom API base URLs) are only set if `ZESTY_AUTH_API` is present in env; none of those override env vars are set in this repo's `.mcp.json`, so the SDK uses its default (production) API endpoints.
- Every tool follows the same shape: Zod-validated params → `await sdk.<domain>.<method>(...)` → `{ content: [{ type: "text", text: JSON.stringify(data) }] }`, or `{ isError: true, content: [{ type: "text", text: "Error: <message>" }] }` on thrown error. **The SDK itself is typed `any`** (`src/types/zesty-io__sdk.d.ts` is a minimal stub), so none of the response shapes below are statically verified by the MCP server's own code — they depend entirely on what `@zesty-io/sdk` returns at runtime.

## Auth

| Tool | Params | Calls | Returns (as coded) |
|---|---|---|---|
| `verify-session` | none | `sdk.auth.verifyToken(ZESTY_SESSION_TOKEN)` | `JSON.stringify(session)` — whatever the SDK's `verifyToken` resolves to. |

## Accounts

| Tool | Params | Calls | Returns (as coded) |
|---|---|---|---|
| `get-instances` | none | `sdk.account.getInstances()` | `JSON.stringify(instances.data)` (array), or a plain-text "no active instances" / "failed to retrieve" message if `instances` is falsy or `.data.length === 0`. |
| `get-instance` | none | `sdk.account.getInstance()` | `JSON.stringify(instance.data)` for the **current** instance (uses `ZESTY_INSTANCE_ZUID` from env implicitly via the SDK instance, not a passed param). |
| `get-instance-users` | none | `sdk.account.getInstanceUsers()` | `JSON.stringify(instanceUsers.data)` — users of the current instance. |

## Media

| Tool | Params | Calls | Returns |
|---|---|---|---|
| `get-bins` | none | `sdk.media.getBins()` | `JSON.stringify(data)` |
| `get-bin` | `BIN_ZUID: string` | `sdk.media.getBin(BIN_ZUID)` | `JSON.stringify(data)` |
| `get-groups` | `BIN_ZUID: string` | `sdk.media.getGroups(BIN_ZUID)` | `JSON.stringify(data)` |
| `get-group` | `GROUP_ZUID: string` | `sdk.media.getGroup(GROUP_ZUID)` | `JSON.stringify(data)` |
| `get-files` | `BIN_ZUID: string` | `sdk.media.getFiles(BIN_ZUID)` | `JSON.stringify(data)` |
| `get-file` | `FILE_ZUID: string` | `sdk.media.getFile(FILE_ZUID)` | `JSON.stringify(data)` |

## Instances — Content & Models

| Tool | Params | Calls | Returns |
|---|---|---|---|
| `get-models` | none | `sdk.instance.getModels()` | `JSON.stringify(data)` — all content models on the instance. |
| `get-model` | `MODEL_ZUID: string` | `sdk.instance.getModel(MODEL_ZUID)` | `JSON.stringify(data)` — one model. |
| `get-fields` | `MODEL_ZUID: string` | `sdk.instance.getModelFields(MODEL_ZUID)` | `JSON.stringify(data)` — all fields of a model (this is the tool to run to replace the "inferred types" in `docs/content-models.md` with real ones). |
| `get-field` | `MODEL_ZUID: string`, `FIELD_ZUID: string` | `sdk.instance.getModelField(MODEL_ZUID, FIELD_ZUID)` | `JSON.stringify(data)` — one field's definition. |
| `get-items` | `MODEL_ZUID: string` | `sdk.instance.getItems(MODEL_ZUID)` | **Confirmed live 2026-09-23** (Events model `6-a2dbc1a6e2-x4pzmx`): returns the full item collection for the model (1,252 items, ~3.8MB JSON), not "the most recently edited item" as the tool's description string claims — the description is wrong/stale, not the plural name. Response shape: `{ statusCode, _meta: { timestamp, totalResults, start, offset, limit }, data: [ { web: {...path/meta fields...}, meta: { ZUID, contentModelZUID, ... }, siblings: {...}, data: { ...model fields... }, publishAt } ] }`. Note `_meta.totalResults`/`start`/`offset`/`limit` were all `0` in the observed response despite 1,252 items actually being returned — do not trust those pagination fields as accurate; no pagination params are exposed by this tool regardless. Relational one-to-many fields (e.g. `property`, `divisions`, `territories`) come back under `data.<field>` as either `null`, a single ZUID string, or a comma-separated string of ZUIDs (not a JSON array) — callers must split on `,` themselves.  |
| `get-item` | `MODEL_ZUID: string`, `ITEM_ZUID: string` | `sdk.instance.getItem(MODEL_ZUID, ITEM_ZUID)` | `JSON.stringify(data)` — a single content item. |
| `search-content-item` | `SEARCH_TERM: string` | `sdk.instance.findItem(SEARCH_TERM)` | Description: "Allows searching for contents by either ZUID, meta text values or path-related values." |
| `get-item-versions` | `MODEL_ZUID`, `ITEM_ZUID` | `sdk.instance.getItemVersions(...)` | All versions of an item. |
| `get-item-version` | `MODEL_ZUID`, `ITEM_ZUID`, `VERSION: string` | `sdk.instance.getItemVersion(...)` | One version of an item. |
| `get-item-labelings` | `MODEL_ZUID`, `ITEM_ZUID` | `sdk.instance.fetchItemLabelings(...)` | Item's labels. |
| `get-item-labeling` | `MODEL_ZUID`, `ITEM_ZUID`, `LABEL_ZUID` | `sdk.instance.fetchItemLabeling(...)` | One labeling record. |
| `get-item-publishings` | `MODEL_ZUID`, `ITEM_ZUID` | `sdk.instance.getItemPublishings(...)` | Publishing history of an item. |
| `get-item-publishing` | `MODEL_ZUID`, `ITEM_ZUID`, `PUBLISHING_ZUID` | `sdk.instance.getItemPublishing(...)` | One publishing record. |

## Instances — Site configuration

| Tool | Params | Calls | Returns |
|---|---|---|---|
| `get-langs` | none | `sdk.instance.fetchLangs()` | Non-deleted languages for the instance. |
| `get-links` | none | `sdk.instance.fetchLinks()` | All links. |
| `get-link` | `LINK_ZUID` | `sdk.instance.fetchLink(LINK_ZUID)` | One link. |
| `get-labels` | none | `sdk.instance.fetchLabels()` | All labels. |
| `get-label` | `LABEL_ZUID` | `sdk.instance.fetchLabel(LABEL_ZUID)` | One label. |
| `get-redirects` | none | `sdk.instance.fetchRedirects()` | All redirects. |
| `get-redirect` | `REDIRECT_ZUID` | `sdk.instance.fetchRedirect(REDIRECT_ZUID)` | One redirect. |
| `get-settings` | none | `sdk.instance.getSettings()` | All instance settings. |
| `get-setting` | `SETTING_ZUID` | `sdk.instance.getSetting(SETTING_ZUID)` | One setting. |
| `get-stylesheet-variables` | none | `sdk.instance.fetchStylesheetVariables()` | All stylesheet variables. |
| `get-stylesheet-variable` | `VARIABLE_ZUID` | `sdk.instance.fetchStylesheetVariable(VARIABLE_ZUID)` | One variable. |
| `get-stylesheets` | none | `sdk.instance.getStylesheets()` | All stylesheets. |
| `get-stylesheet` | `STYLESHEET_ZUID` | `sdk.instance.getStylesheet(STYLESHEET_ZUID)` | One stylesheet. |
| `get-web-headers` | none | `sdk.instance.getWebHeaders()` | Description: "Returns all legacy headers." |
| `get-head-tags` | none | `sdk.instance.getHeadTags()` | All head tags. |
| `get-head-tag` | `HEADTAG_ZUID` | `sdk.instance.getHeadTag(HEADTAG_ZUID)` | One head tag. |
| `get-audit-logs` | none | `sdk.instance.getAuditLogs()` | All audit trail entries for the instance. |
| `get-audit-log` | `AUDIT_ZUID` | `sdk.instance.getAuditLog(AUDIT_ZUID)` | One audit trail entry. |

---

## Needs live verification

Everything below is a **specific claim from the source code that should be confirmed against a real API call**, not trusted from code/comments alone. Send these to `api-integrator`:

1. **Exact JSON shape of every tool's response.** The SDK is typed `any` in this project (`src/types/zesty-io__sdk.d.ts`), so no compile-time contract exists — every "Returns" cell above is only the *variable name* being serialized (`data`, `instances.data`, `session`, etc.), not a verified shape.
2. **`get-instances` / `get-instance` / `get-instance-users` "empty" branches**: confirm the SDK actually returns an object with a `.data` array (vs. e.g. `null` or throwing) when there are no instances/users, since the code assumes `instances.data.length` is safe to read after only checking `!instances`.
3. ~~**`get-items` vs. its description**~~ — **Resolved 2026-09-23**: confirmed live against the Events model (`6-a2dbc1a6e2-x4pzmx`) that `get-items` returns the full collection (1,252 items), not a single "most recently edited item." The tool's description string in the server source is stale/wrong and should be corrected there; the plural name and Zod signature (`MODEL_ZUID` only, no pagination) were accurate. See the `get-items` row above for the confirmed response shape.
4. **`search-content-item` (`sdk.instance.findItem`)**: confirm what "meta text values or path-related values" actually matches against, and the shape of multi-result responses.
5. **`get-item-version` parameter**: confirm `VERSION` is a version **number** (as a string) vs. a version ZUID — the Zod schema just says `z.string()`.
6. **Auth/session flow**: `registerAllTools()` calls `sdk.auth.verifyToken(ZESTY_SESSION_TOKEN)` once at server startup (to set the Sentry user) — confirm this doesn't fail/short-circuit tool registration if the token is invalid or expired, since there's no visible catch around that call in `src/tools/register.ts`.
7. **`opts`/custom API URL override branch**: confirmed by reading code that it only activates when `ZESTY_AUTH_API` is set (not set in this repo's `.mcp.json`), so the SDK should be hitting Zesty's default/production endpoints — confirm live that calls are in fact going to production and not silently misconfigured.
8. **Whether the session token embedded in `.mcp.json` (`ZESTY_SESSION_TOKEN`, now set inline in the `bash -lc` command string rather than an `env` block — see "What this is" above) is still valid / appropriately scoped** — `.mcp.json` is gitignored so this isn't committed to the repo, but it's still a plaintext credential sitting on disk; confirm rotation policy with the user rather than assuming it's fine.
9. **Rate limits / pagination**: none of the "get all X" tools (`get-models`, `get-instances`, `get-audit-logs`, etc.) take pagination params in this implementation — confirm whether the underlying SDK methods paginate internally or could truncate large result sets silently.

## Open Questions / Flags

- **2026-09-24 re-verification pass:** re-read every file under `mcp-local-server/src/tools/**` (all 4 domain-group registrars plus all 16 `instances/*` sub-domain files, `src/index.ts`, `src/tools/register.ts`, `src/prompts/register.ts`, `src/resources/register.ts`, `src/types/zesty-io__sdk.d.ts`) directly from the source tree via `wsl.exe`. Every tool name, param, `sdk.<domain>.<method>` call, and response-serialization shape in the tables above still matches the code exactly — no drift found in tool behavior/schemas since the 2026-09-19 scan. The `mcp-local-server` repo's own git log shows no commits since the prior scan that touch `src/` (last relevant commit was a Sentry upgrade predating 2026-09-19). The only confirmed drift was in `.mcp.json`'s connection wiring (see "What this is" above), which has now been corrected in this doc.
- The MCP server's own `README.md`/`CLAUDE.md` mark it as "40+ tools" and describe the same five categories confirmed here (Auth, Accounts, Instances, Media) — the tool list above matches the README exactly, so no discrepancy was found between the server's own docs and its code.
- No prompts or resources are implemented (`src/prompts/register.ts`, `src/resources/register.ts` are both empty stubs per the server's own `CLAUDE.md`) — only tools are usable today.
- This MCP server operates on the **Zesty account/instance management layer** (models, items, versions, settings, media, users). It has no knowledge of the *rendered* website (Parsley templates, the ajax-json endpoints in `docs/templates.md`, or front-end behavior) — don't use it to answer questions about what the live site displays; use it for schema/content/instance-config questions only.
