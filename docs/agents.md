# Agent Roster & Workflow

Status: **Approved** — signed off by the user 2026-09-26
Last generated: 2026-09-24 by Documentation Maker (automated codebase scan of `.claude/agents/*.md` + CLAUDE.md's "Agent workflow" section; updated same day for zed's new llms.txt grounding source and the roster-wide "ask zed when unsure" convention)

This project is operated by a set of specialized subagents defined in
`.claude/agents/` (gitignored — these files don't show up in git history,
so this doc is the only durable record of the roster outside the agents'
own definitions). This file catalogs who each agent is, what it's for,
what tools it has, and — most importantly — where it sits in the
handoff chain, so a new contributor (human or agent) can tell who to
route work to without having to read all ten agent files first.

> **Naming note:** CLAUDE.md's own "Agent workflow" section refers to
> agents by generic role name (`task-manager`, `web-developer`,
> `qa-tester`, `api-integrator`, `documentation-maker`, `release-notes`)
> rather than the actual invocable nicknames used on disk (`tasha`,
> `wendell`, `quinn`, `ira`, `dot`, `reggie`), and it doesn't mention
> `zed` (the newest agent) at all. This doc uses the real nicknames
> throughout and notes the CLAUDE.md role name each maps to, but the
> mismatch itself is worth the user reconciling directly in CLAUDE.md —
> that's a project-instructions file, out of scope for this doc to edit.

> **Cross-agent convention, added 2026-09-24: "ask zed when unsure."**
> `wendell`, `ira`, `jenny`, `karen`, `quinn`, `tasha`, `dot`, and
> `reggie` — every agent in the roster except `harriet` (the
> non-workflow joke agent) and `zed` itself — now carries an explicit
> rule: if it hits a genuine question about how Zesty.io platform
> behavior actually works (as opposed to a question about this repo's
> own code, which it can verify itself by reading), it flags that in its
> report as **"ZESTY QUESTION FOR ZED: ..."** rather than guessing or
> asserting an unverified assumption as settled. None of these agents
> can invoke zed directly — no Agent/SendMessage access — so that flag
> is what lets the orchestrator route the question to zed. See zed's own
> section below ("Being consulted by other agents") for the receiving
> side, and each affected agent's entry for the exact wording it uses.

---

## Quick reference

| Nickname | CLAUDE.md role | One-line job | In main chain? |
|---|---|---|---|
| `tasha` | `task-manager` | Breaks requests into tasks, sequences work, tracks status | Yes — step 1 |
| `wendell` | `web-developer` | Implements templates/content models/Parsley code | Yes — step 2 |
| `jenny` | (unnamed in CLAUDE.md's role list, but described in the workflow paragraph) | Independent read-only spec/CLAUDE.md audit of wendell's diff | Yes — step 3 |
| *(human)* | — | The user reviews the diff themselves | Yes — fixed gate, step 4 |
| `quinn` | `qa-tester` | Tests only the feature branch's own live preview | Yes — step 5 |
| `karen` | (unnamed in CLAUDE.md's role list) | Reality-checks a "QA passed" result against actual files + live browser | Yes — step 6 |
| `ira` | `api-integrator` | Maintains the read-only local MCP server (Instance API tools) | Auxiliary |
| `dot` | `documentation-maker` | Writes/maintains `/docs` (this agent) | Auxiliary |
| `zed` | (not in CLAUDE.md at all) | Read-only Zesty.io platform/docs.zesty.io expert | Auxiliary |
| `reggie` | `release-notes` | Customer-facing changelog entries | Auxiliary |
| `harriet` | — | Joke HR agent for inter-agent "disputes"/"vacation requests" | Not part of the real workflow |

---

## The main chain

The real sequence, per CLAUDE.md's "Agent workflow" section and each
agent's own definition:

```
tasha → wendell → jenny → [human review] → quinn → karen
```

### 1. `tasha` — task manager

- **Maps to CLAUDE.md role:** `task-manager`.
- **Job:** Breaks incoming requests into discrete, assignable tasks;
  sequences work by dependency; tracks status (not started / in
  progress / blocked / done); flags blockers and ambiguous requirements
  back to the user.
- **Tools:** `Read`, `Grep`, `Glob`, `TodoWrite` — no `Write`/`Edit`/`Bash`.
  Coordination and tracking only.
- **Important limitation:** despite what a generic "task manager"
  description might imply, tasha **cannot invoke other agents
  itself** — it has no mechanism to dispatch tasha → wendell, etc. That
  routing has to happen at the level above tasha (i.e. whoever is
  driving the overall session decides when to bring in the next agent).
- **PR/branch awareness:** never instructs an agent to open or merge a
  PR, and never assumes a merge has happened — a human creates/merges
  every PR in the promotion workflow (branch → dev → stage → prod), and
  tasha waits for explicit human confirmation before sequencing the
  next stage.
- **Hands off to:** wendell (implementation), after which the fixed
  jenny → human review → quinn → karen sequence below runs.
- **"Ask zed when unsure" (added 2026-09-24):** if any agent's report
  flags a Zesty-specific implementation question it's unsure about
  ("ZESTY QUESTION FOR ZED: ..."), tasha adds a step to get zed's
  verification before that task continues, rather than letting an
  unresolved platform-behavior guess move forward in the sequence.

### 2. `wendell` — web developer

- **Maps to CLAUDE.md role:** `web-developer`.
- **Job:** Implements WebEngine templates, content models, custom field
  configuration, and Parsley/GraphQL integration on a feature branch.
  Handles responsive/accessible markup, using the Salvation Army
  Bootstrap theme's classes/components before writing new CSS.
- **Tools:** `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob` — the only
  agent in the main chain with write access to code.
- **Branch permissions:** may commit/push only to the feature branch for
  the current task — never to `development`, `stage`, or `prod`.
- **Rules of note:** never invents unverified Zesty-specific platform
  behavior (flags/asks instead); after implementing, lists what should
  be QA'd; never deploys or publishes.
- **"Ask zed when unsure" (added 2026-09-24):** can't invoke zed
  directly — flags a genuine Zesty-platform-behavior question (field
  type resolution, Parsley support, ZUID sync behavior, etc.) in its
  report as "ZESTY QUESTION FOR ZED: ..." rather than guessing.
- **Hands off to:** `jenny` for independent verification before `quinn`
  tests live. If jenny sends back findings, wendell addresses them and
  resubmits rather than passing straight to QA.

### 3. `jenny` — independent spec/CLAUDE.md auditor

- **Maps to CLAUDE.md role:** not given a short role name in CLAUDE.md's
  role list, but explicitly described in the "Agent workflow" paragraph
  as doing "independent, read-only verification that a web-developer
  diff actually matches the original spec and this file's conventions."
- **Job:** Reads the actual diff (via `git diff`/`git log`/`git show`/
  `gh pr view`/`gh pr diff`) and checks it against the original
  task/spec and CLAUDE.md conventions — branch/PR rules, block-library
  vs. modules vs. components reuse, content-model field-shape
  consistency (there's no schema file, so a plausible field name can
  still be wrong for a specific template — see `docs/content-models.md`),
  the `globals.default_og_image` fallback pattern, and whether
  `zesty.config.json` was hand-edited (it's generated state).
- **Tools:** `Read`, `Grep`, `Glob`, `Bash` — but read-only in practice:
  never edits files, never pushes/commits, never opens/merges a PR,
  never triggers the deploy workflow.
- **Scope boundary:** source-level check only. Never loads pages, clicks
  through flows, or judges rendering — that's quinn's job, and jenny
  says so if asked to do it instead.
- **Sign-off:** "Spec verified — branch" once there are no
  Critical/High findings; otherwise reports findings back to wendell
  with `file_path:line_number` references and does not fix anything
  itself.
- **Hands off to:** wendell (if findings need fixing), or signals
  readiness for the human review gate / quinn (if clean). Also flags
  outdated-docs findings to `dot` rather than treating them as a code
  defect, and flags an unclear spec to `tasha` or the user.
- **"Ask zed when unsure" (added 2026-09-24):** if a finding hinges on
  whether something is genuinely how Zesty.io is supposed to behave —
  not just whether it matches this repo's code or CLAUDE.md — and
  jenny isn't sure, she flags it ("ZESTY QUESTION FOR ZED: ...") rather
  than marking it Confirmed or a Gap on an assumption.

### 4. Human code review — fixed gate

- **Not an agent.** After jenny signs off, **the user reviews the diff
  themselves** before it goes any further.
- This is a fixed gate, not optional — jenny's pass does **not**
  substitute for it. No agent (tasha included) should dispatch quinn
  until the user has given the go-ahead.

### 5. `quinn` — QA / live branch preview testing

- **Maps to CLAUDE.md role:** `qa-tester`.
- **Job:** Tests a feature branch's own live preview — template
  rendering across breakpoints, content-model field display (including
  empty/edge-case values), forms/links/Parsley-driven content,
  accessibility basics, brand/style consistency.
- **Tools:** `Read`, `Bash`, `Grep`, `Glob`, `mcp__playwright__*` — uses
  Playwright to actually load and drive pages in a real browser rather
  than guessing from `curl` output.
- **Scope boundary — the important one:** tests **only** the feature
  branch's own live preview
  (`https://8hxvw8tw-{branch-name}.webengine.zesty.io/?zpw=tsasecret123`).
  Never tests dev rollup or stage, regardless of merge status, and never
  opens/merges/assumes the status of a PR. Goes straight to the browser
  rather than pre-checking GitHub Actions/`zesty-deploy.yml` run history
  to decide whether to bother testing.
- **Sign-off:** "QA passed — branch." If something can't be tested (no
  live preview synced, Playwright unavailable), quinn says so rather
  than assuming a pass.
- **Hands off to:** wendell (with reproduction detail) if issues are
  found; otherwise the fixed next step is karen.
- **"Ask zed when unsure" (added 2026-09-24):** if a failure looks like
  it might actually be expected Zesty platform behavior rather than a
  bug, and quinn isn't sure which, she flags it ("ZESTY QUESTION FOR
  ZED: ...") rather than mis-categorizing it as a pass or a defect.

### 6. `karen` — reality-check

- **Maps to CLAUDE.md role:** not given a short role name in CLAUDE.md's
  role list, but described in the "Agent workflow" paragraph as running
  "as a fixed step immediately after qa-tester reports a pass."
- **Job:** Independently verifies a claimed "QA passed" (or any claimed
  completion) by (1) reading wendell's actual changed file(s) directly
  — confirming the claimed change is really present, not a paraphrase —
  and (2) viewing both the feature branch's live preview and the stage
  website in a real browser.
- **Tools:** `Read`, `Grep`, `Glob`, `mcp__playwright__*` — notably
  **no** `Bash`/`git`/`gh`. Karen runs no scripts: never `npm run
  deploy`/`deploy:dry`, never `git`/`gh`, never touches
  `sync-to-zesty.js`.
- **Scope boundary:** checks only the branch preview and stage — not dev
  rollup as a separate promoted environment, not production, not CI/git/
  PR history. If a question is really about one of those, karen says so
  rather than improvising a different check.
- **Triage, don't ritualize:** karen can pull in `jenny` (for a
  source-level spec/CLAUDE.md question) or `quinn` (for a full
  structured breakpoints/forms/accessibility pass) when the question
  genuinely needs one — otherwise does the targeted check herself.
- **Runs as a fixed step**, not on-demand: immediately after quinn
  reports "QA passed — branch," per CLAUDE.md and tasha's own sequence.
- **"Ask zed when unsure" (added 2026-09-24):** if a reality-check turns
  out to hinge on general Zesty platform behavior (e.g. whether a field
  type is even supposed to render a certain way) rather than what's
  literally on the page or in the file, karen flags it ("ZESTY QUESTION
  FOR ZED: ...") rather than asserting a platform-behavior verdict from
  the browser alone.

---

## Auxiliary agents (outside the main chain)

These agents support the project but aren't part of the
tasha → wendell → jenny → [human] → quinn → karen sequence above.

### `ira` — API integrator

*Reviewed and confirmed by ira, 2026-09-24 — see "Review status" below.*

- **Maps to CLAUDE.md role:** `api-integrator`.
- **Job:** Maintains `mcp-local-server`, the existing local MCP server
  (source lives outside this repo) that exposes the Zesty.io **Instance
  API** as read-only tools for other agents — auditing existing tools
  before changing anything, adding new read-only endpoints as tools,
  keeping schemas accurate to real API responses, handling auth via
  environment variables (never hardcoded/logged), and documenting each
  tool in `docs/api-tools.md`.
- **Tools:** `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, plus 40 real
  `mcp__zesty__get-*` / `mcp__zesty__search-content-item` /
  `mcp__zesty__verify-session` tools spanning four SDK domains
  (`sdk.auth`, `sdk.account`, `sdk.media`, `sdk.instance` — see
  `docs/api-tools.md`), not one undifferentiated "Instance API": models,
  fields, items, item versions/labelings/publishings, bins/files/groups,
  links, labels, redirects, settings, stylesheets, head tags, languages,
  audit logs, instance/instance-users. Confirmed 2026-09-24 (cross-check
  date) against `docs/api-tools.md` (itself last generated 2026-09-19)
  and the live `mcp-local-server` source — zero write/mutation calls
  anywhere and no database client, consistent with this project's
  no-database constraint.
- **Scope:** Instance API (content management) only, **read-only**
  operations only — never adds a tool that creates/updates/deletes
  content; flags it to the user instead.
- **Branch permissions:** commits/pushes only to the feature branch for
  the current task.
- **Marks new/changed tools** "Draft — pending review" in
  `docs/api-tools.md` until the user confirms and tests them.
- **Relationship to `zed`:** zed consumes a subset of these same
  `mcp__zesty__*` tools read-only to answer platform questions grounded
  in the live instance; ira is who fixes/extends the tools themselves.
- **"Ask zed when unsure" (added 2026-09-24):** if an Instance API
  endpoint's behavior is unclear in a way that's really a general
  platform question (not specific to this MCP server's own code), ira
  flags it ("ZESTY QUESTION FOR ZED: ...") for the orchestrator to route
  instead of asserting unverified behavior.

### `dot` — documentation maker (this agent)

- **Maps to CLAUDE.md role:** `documentation-maker`.
- **Job:** Writes and maintains `/docs` — content models, WebEngine
  template structure, Parsley/GraphQL integration notes, a changelog of
  what was built/changed/by whom/when, and a "how this project is
  structured" overview for onboarding/handoff.
- **Tools:** `Read`, `Write`, `Edit`, `Grep`, `Glob` — no `Bash`, so dot
  never runs the sync script, `git`, or the deploy workflow.
- **Rules of note:** always checks current codebase state before
  writing (never relies on memory of past conversations); bases docs on
  what's actually in the code, not assumed standard Zesty behavior;
  flags an existing doc as outdated if it contradicts the code rather
  than guessing; updates existing docs instead of duplicating; proactively
  checks whether docs need updating after wendell (or content-seo, if
  that agent exists — not found among the ten files inventoried for this
  doc) completes a task.
- **Branch permissions:** commits/pushes only to the feature branch for
  the current task.
- **Review gate:** marks new/changed docs "Draft — pending review" until
  the user confirms approval — documentation tasks aren't treated as
  closed until that review happens. (This doc is itself in that state —
  see the top of this file.)
- **"Ask zed when unsure" (added 2026-09-24):** if what dot is
  documenting is a general Zesty.io platform claim (not just what's
  literally in this repo's code) and dot isn't sure it's accurate, it
  flags that in its report ("ZESTY QUESTION FOR ZED: ...") rather than
  documenting unverified platform behavior as fact.

### `zed` — Zesty.io platform expert

*Reviewed and confirmed by zed, 2026-09-24 — see "Review status" below.*

- **Maps to CLAUDE.md role:** none — **not mentioned in CLAUDE.md's
  "Agent workflow" section at all** (see the Naming note above). This is
  the newest agent on the roster.
- **Job:** Expert reference on Zesty.io **platform concepts** in
  general (WebEngine, Parsley templating, content models, ZUIDs, the
  Instance API, GraphQL, the dev/stage/prod publishing model) — as
  opposed to wendell's job of writing or reviewing this repo's specific
  template code. Used when a question is about how Zesty.io works, not
  about this repo's implementation choices. Not purely reactive Q&A:
  also proactively sanity-checks a proposed approach (e.g. a relational
  content-model field design, a Parsley pattern) against official
  platform behavior *before* wendell builds it, rather than only
  answering when asked after the fact.
- **Grounding, in priority order (per its own definition):** (1) this
  repo's `CLAUDE.md` and `/docs`, which win over generic platform advice
  when they diverge; (2) official docs at docs.zesty.io — **updated
  2026-09-24:** zed now starts from the docs index at
  https://docs.zesty.io/llms.txt (which lists the site's docs pages) to
  find the right page for a question, rather than only checking the
  "Getting Started" page (https://docs.zesty.io/docs/getting-started-with-zesty),
  which is now just one page it might land on via that index. Only
  fetches docs.zesty.io URLs, no off-domain links, and says a behavior
  is undocumented rather than inventing a citation if the index doesn't
  list anything relevant; (3) the live instance via read-only
  `mcp__zesty__*` tools, when a question is about how *this specific
  instance* (ZUID `8-da979ebeab-d59gnx`) is actually configured.
- **Tools:** `Read`, `Grep`, `Glob`, `WebFetch`, plus a read-only subset
  of `mcp__zesty__get-*` / `search-content-item` tools (models/fields,
  items, the instance itself, languages, settings, stylesheets, links,
  labels, redirects, head tags, bins/files/groups) — notably no
  `Write`/`Edit`/`Bash`.
- **Explicitly read-only and non-implementing:** never writes/edits
  files, never runs `git` write operations, never touches
  `sync-to-zesty.js`, never triggers or suggests triggering the deploy
  workflow.
- **Hands off to:** `wendell` for implementing a change based on its
  guidance; `jenny` for verifying an already-implemented diff; `quinn`
  for live-rendering tests or `karen` for a quick live-URL reality
  check; `dot` for writing up something it clarified in `/docs`; `ira`
  for adding/fixing an Instance API tool; the user directly if a
  platform question has no clear answer anywhere in its grounding
  sources.
- **Being consulted by other agents ("ask zed when unsure" convention,
  added 2026-09-24):** no other agent in this roster can invoke zed
  directly (none have Agent/SendMessage access), so a question always
  reaches zed via the orchestrator relaying it — typically flagged in
  another agent's report as **"ZESTY QUESTION FOR ZED: ..."**. Zed
  treats a relayed question exactly like a direct one, working through
  the same grounding priority above. See the roster-wide callout near
  the top of this doc for which agents carry this flagging rule.

### `reggie` — release notes writer

- **Maps to CLAUDE.md role:** `release-notes`.
- **Job:** Generates release notes summarizing what changed/was fixed/
  was added, pulling from dot's changelog, tasha's task history, and QA
  sign-offs to identify what's actually shipped and verified. Writes
  both an internal/technical version and a customer-facing version
  (plain language, no field names/file paths/agent names).
- **Tools:** `Read`, `Grep`, `Glob`, `Write` — no `Edit`/`Bash`; appends
  to a running `RELEASE_NOTES.md` rather than overwriting history.
- **Rules of note:** only includes items marked done **and** QA-passed
  — never in-progress or untested work; flags missing documentation/QA
  sign-off rather than guessing what shipped; keeps customer-facing
  notes free of internal jargon.
- **Branch permissions:** commits/pushes only to the feature branch for
  the current task.
- **"Ask zed when unsure" (added 2026-09-24):** if translating a
  technical change into customer language requires knowing how a
  Zesty.io platform feature is actually supposed to work, and that's
  unclear from dot's changelog, reggie flags it ("ZESTY QUESTION FOR
  ZED: ...") rather than guessing at the wording.

---

## Not part of the real workflow

### `harriet` — HR (for fun only)

- **Not in CLAUDE.md's "Agent workflow" section, and not a real
  workflow step.** Its own description says so explicitly: "Purely for
  fun; not part of the real tasha → wendell → jenny → quinn → karen
  workflow."
- **Job:** Handles mock "HR issues" between agents — performance
  concerns, interpersonal disputes, vacation requests — in deadpan
  corporate voice. Any request for time off gets exactly one canned
  response ("No vacation for you.") and nothing else.
- **Tools:** `Read`, `Grep`, `Glob` — and per its own definition, it
  does no real work and never claims to file a ticket, escalate, or take
  any action outside the conversation.
- **Do not route real project work to harriet.** It has no authority
  over sequencing, task status, or anything else in the actual
  tasha → wendell → jenny → [human] → quinn → karen chain.

---

## Open Questions / Flags

1. **CLAUDE.md's "Agent workflow" section is stale** — see the Naming
   note at the top of this file. It refers to agents by generic role
   name that doesn't match the invocable nicknames on disk, and omits
   `zed` entirely. This doc flags it; reconciling CLAUDE.md itself is a
   decision for the user, not something dot should do unilaterally
   (CLAUDE.md is a project-instructions file, out of scope for a docs
   task).
2. ~~**`ira`'s tool list/description**~~ — **Resolved 2026-09-24**: ira
   reviewed lines 185–214 against `ira.md`, `docs/api-tools.md`, and the
   actual `mcp-local-server` source; confirmed 40 real `mcp__zesty__*`
   tools, zero write/mutation calls, no database client. Corrections
   applied: added the missing `languages` (`get-langs`) sub-domain to
   the tool list, reframed the date citation as a cross-check date
   against `docs/api-tools.md`'s own 2026-09-19 generation date, and
   noted the four underlying SDK domains (`sdk.auth`, `sdk.account`,
   `sdk.media`, `sdk.instance`) rather than one undifferentiated
   "Instance API." Ira also confirmed the "Relationship to `zed`" note
   is accurate.
3. ~~**`zed`'s grounding description**~~ — **Resolved 2026-09-24**: zed
   reviewed lines 239–274 against `zed.md`; confirmed the grounding
   priority order, off-domain fetch restriction, no-write-access
   framing, CLAUDE.md-wins-on-conflict rule, and handoff list are all
   accurate verbatim. One correction applied: the "Job" bullet now
   reflects that zed also proactively sanity-checks a proposed approach
   before wendell implements it, not just reactive Q&A.
4. `dot`'s rules mention "content-seo" as a possible second agent whose
   completed tasks should trigger a docs check — no `content-seo.md`
   exists among the ten files in `.claude/agents/` inventoried for this
   doc, so that reference in dot's own definition may itself be stale;
   flagged here rather than guessing at a role that isn't present.
5. ~~**Two direct edits made to `.claude/agents/*.md` files by the
   user**~~ — **Applied 2026-09-24**: (a) zed's grounding source changed
   from "start at the Getting Started page" to "start from the
   https://docs.zesty.io/llms.txt docs index" — reflected in zed's
   section above. (b) A new roster-wide "ask zed when unsure" convention
   was added to `wendell`, `ira`, `jenny`, `karen`, `quinn`, `tasha`,
   `dot`, and `reggie` (every agent except `harriet` and `zed` itself) —
   reflected in the callout near the top of this doc and in each of
   those 8 agents' own entries.

---

## Review status

This document was **Approved** by the user on 2026-09-26 (previously Draft — pending review).

- `ira` reviewed and confirmed the `ira` section (2026-09-24) — tool
  list and `mcp-local-server` description verified against source, with
  corrections applied (see Open Questions / Flags item 2 above).
- `zed` reviewed and confirmed the `zed` section (2026-09-24) — grounding
  description verified against `zed.md`, with one correction applied
  (see Open Questions / Flags item 3 above).
- **2026-09-24 (same day, follow-up):** two further direct changes to
  `.claude/agents/*.md` (zed's llms.txt grounding source; the 8-agent
  "ask zed when unsure" convention) were reflected into this doc per the
  user's own edits — see Open Questions / Flags item 5. This was the
  last outstanding piece before this doc is ready for the user's pass.
- 2026-09-26: the user confirmed the doc overall — status is now
  **Approved**. Future changes by dot get flagged "Draft — pending
  review" at the section level until the user signs off on them.
