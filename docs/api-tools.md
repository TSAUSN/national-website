# API Tools — `zesty` MCP Local Server

Status: **Draft — pending review**
Last generated: 2026-09-19 by Documentation Maker (automated codebase scan)

## What this is

`.mcp.json` in this repo registers a local MCP server named `zesty`:

```json
{
  "mcpServers": {
    "zesty": {
      "command": "wsl.exe",
      "args": ["-e", "node", "/home/kharljhon14/projects/zesty/mcp-local-server/build/index.js"],
      "env": {
        "ZESTY_SESSION_TOKEN": "PTK-...",
        "ZESTY_INSTANCE_ZUID": "8-da979ebeab-d59gnx"
      }
    }
  }
}
```

The server's **source code is a separate project** at `/home/kharljhon14/projects/zesty/mcp-local-server` (WSL). It was reachable from this machine at `\\wsl.localhost\Ubuntu\home\kharljhon14\projects\zesty\mcp-local-server` and was read directly for this documentation — this is **not** the same thing as the Parsley `.json` ajax endpoints documented in `docs/templates.md`; this MCP server talks to Zesty's **account/instance management REST APIs** (via the `@zesty-io/sdk` npm package), not to the rendered website.

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
| `get-items` | `MODEL_ZUID: string` | `sdk.instance.getItems(MODEL_ZUID)` | Per the tool description string: "the most recently edited item, by latest version and date created, on a collection content object" — naming (`getItems`, plural) vs. description (singular "item") is inconsistent; see flag below. |
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

## Known issue — CONNECTION_CLOSED on startup (diagnosed & fixed 2026-09-22)

**Symptom**: MCP client reports `CONNECTION_CLOSED` immediately when connecting to the `zesty` server; no tools are ever registered.

**Root cause**: `.mcp.json` sets `ZESTY_SESSION_TOKEN` / `ZESTY_INSTANCE_ZUID` in the `env` block of the `wsl.exe` command, but the launch command is a **bare** `wsl.exe -e node <path>` (no login shell). WSL does **not** forward arbitrary Windows-side environment variables into the Linux process unless they're listed in `WSLENV` — so `process.env.ZESTY_SESSION_TOKEN` / `ZESTY_INSTANCE_ZUID` were both `undefined` inside the Node process. `src/tools/register.ts` calls `new SDK(process.env.ZESTY_INSTANCE_ZUID, process.env.ZESTY_SESSION_TOKEN, opts)` with no guard, and the SDK constructor throws synchronously (`SDK:constructor() missing required 'token' parameter`) when `token` is falsy. That throw happens inside `registerAllTools()`, which is awaited in `initializeServer()` inside `main()`'s try/catch in `src/index.ts` — so the process logs `Fatal error: ...` to stderr and calls `process.exit(1)` **before** `server.connect(transport)` is ever reached. The MCP client sees the child process exit immediately after spawn, which surfaces as `CONNECTION_CLOSED`.

Confirmed live by reproducing the exact bare `wsl.exe -e node build/index.js` invocation from Windows with the env vars set only on the Windows/`wsl.exe`-parent side (no `WSLENV`) — it throws that exact error and exits 1. Setting `WSLENV=ZESTY_SESSION_TOKEN:ZESTY_INSTANCE_ZUID` in the same `env` block and re-running the identical invocation lets the process complete a real MCP `initialize` handshake successfully.

**Fix applied**: added `"WSLENV": "ZESTY_SESSION_TOKEN:ZESTY_INSTANCE_ZUID"` to the `env` block in this machine's `.mcp.json`. Not yet confirmed working from inside the actual MCP client session (config is read at session boot, so a running session won't pick this up until reconnect) — **flagging for user confirmation on next session start.**

**Correction 2026-09-22: `.mcp.json` is NOT gitignored, contrary to what this doc and `CLAUDE.md` previously assumed.** It's tracked in git (`git ls-files .mcp.json` confirms) and was committed in `54b6814` with a live `ZESTY_SESSION_TOKEN` in plaintext, already pushed to both `origin/coda-2533` and `origin/stage`. That token should be rotated/revoked and this file should be untracked + added to `.gitignore` going forward — flagged to the user directly, not something this doc fixes on its own.

Ruled out as causes: WSL itself (`wsl.exe` runs and is healthy), the build artifacts (present and current, `build/index.js` exists and runs), Node (`v18.19.1` present in WSL), and the session token (confirmed valid — `GET https://auth.api.zesty.io/verify` with this token returns `200 {"message":"Session valid", ...}`).

## Needs live verification

Everything below is a **specific claim from the source code that should be confirmed against a real API call**, not trusted from code/comments alone. Send these to `api-integrator`:

1. **Exact JSON shape of every tool's response.** The SDK is typed `any` in this project (`src/types/zesty-io__sdk.d.ts`), so no compile-time contract exists — every "Returns" cell above is only the *variable name* being serialized (`data`, `instances.data`, `session`, etc.), not a verified shape.
2. **`get-instances` / `get-instance` / `get-instance-users` "empty" branches**: confirm the SDK actually returns an object with a `.data` array (vs. e.g. `null` or throwing) when there are no instances/users, since the code assumes `instances.data.length` is safe to read after only checking `!instances`.
3. **`get-items` vs. its description**: the tool name is plural (`get-items`) and takes only `MODEL_ZUID`, but its description says it returns "the most recently edited item" (singular) "on a collection content object." Confirm live whether this actually returns one item or a list — this looks like it could be either a naming bug or a description bug.
4. **`search-content-item` (`sdk.instance.findItem`)**: confirm what "meta text values or path-related values" actually matches against, and the shape of multi-result responses.
5. **`get-item-version` parameter**: confirm `VERSION` is a version **number** (as a string) vs. a version ZUID — the Zod schema just says `z.string()`.
6. **Auth/session flow**: `registerAllTools()` calls `sdk.auth.verifyToken(ZESTY_SESSION_TOKEN)` once at server startup (to set the Sentry user) — confirm this doesn't fail/short-circuit tool registration if the token is invalid or expired, since there's no visible catch around that call in `src/tools/register.ts`.
7. **`opts`/custom API URL override branch**: confirmed by reading code that it only activates when `ZESTY_AUTH_API` is set (not set in this repo's `.mcp.json`), so the SDK should be hitting Zesty's default/production endpoints — confirm live that calls are in fact going to production and not silently misconfigured.
8. **Whether the session token embedded in `.mcp.json` (`ZESTY_SESSION_TOKEN`) is still valid / appropriately scoped** — this is a credential checked into the repo; confirm rotation policy with the user/api-integrator rather than assuming it's fine.
9. **Rate limits / pagination**: none of the "get all X" tools (`get-models`, `get-instances`, `get-audit-logs`, etc.) take pagination params in this implementation — confirm whether the underlying SDK methods paginate internally or could truncate large result sets silently.

## Open Questions / Flags

- The MCP server's own `README.md`/`CLAUDE.md` mark it as "40+ tools" and describe the same five categories confirmed here (Auth, Accounts, Instances, Media) — the tool list above matches the README exactly, so no discrepancy was found between the server's own docs and its code.
- No prompts or resources are implemented (`src/prompts/register.ts`, `src/resources/register.ts` are both empty stubs per the server's own `CLAUDE.md`) — only tools are usable today.
- This MCP server operates on the **Zesty account/instance management layer** (models, items, versions, settings, media, users). It has no knowledge of the *rendered* website (Parsley templates, the ajax-json endpoints in `docs/templates.md`, or front-end behavior) — don't use it to answer questions about what the live site displays; use it for schema/content/instance-config questions only.
