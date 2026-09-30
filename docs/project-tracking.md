# Project Tracking (Superhuman/Coda)

Status: **Approved** — signed off by the user 2026-09-26
Last generated: 2026-09-25 by Documentation Maker

This documents how work on this project (tickets, projects, QA sign-off,
prioritization) is tracked **outside this repo**, in the team's
Superhuman/Coda workspace doc "Salvation Army National Website Project"
(owned by Gisele Blair; docUri `superhuman://docs/GNetDKGq5M`). It's
written up here because `coda-XXXX` references appear throughout this
repo (git branch names, PR titles, `docs/changelog.md`,
`RELEASE_NOTES.md`) and a new contributor needs to know what those IDs
mean and where the actual ticket detail lives.

**This is descriptive documentation of an external tool, not a schema
this repo enforces or that Documentation Maker keeps byte-for-byte in
sync.** Nothing in this repo reads from or writes to the Coda doc — there
is no integration, API call, or sync script for it (contrast with
`zesty.config.json`, which really is generated/consumed by
`scripts/sync-to-zesty.js`). If the live doc's structure changes, this
file will drift until someone re-checks it against the live doc — it
isn't watched automatically.

---

## 1. What the workspace is for

The Coda doc is the team's project-management system for all work on the
Salvation Army National Website project — bug reports, feature requests,
enhancements, questions, and larger multi-task "projects" — across
multiple teams (Frontend, Backend, Mobile, Operational, Internal QA,
Platform, and a few app-specific teams; see §4). It is **not** specific to
this repo's WebEngine code — it also tracks non-code operational work,
mobile app tasks, and cross-team planning.

**The link to this repo:** the numeric `ID` auto-generated for each row in
the Tasks table (see §2) is the same `coda-XXXX` number used as this
repo's git branch names, PR titles, and references in
`docs/changelog.md` / `RELEASE_NOTES.md`. For example, a branch named
`coda-2434` corresponds to the Tasks-table row with `ID` = 2434. If you
need the full ticket description, requester, priority, or QA history
behind a `coda-XXXX` reference in this repo, that detail lives in this
Coda doc, not in this repo — this repo only records what was actually
changed in code and when it was verified/merged.

## 2. Page structure (45 pages)

Top-level pages, as currently laid out in the doc:

- **Salvation Army Dashboard** — the landing page. Two live tables:
  "Projects in Progress" and "Tasks in Progress".
- **My Tasks Board / My Tasks Table / My Submitted Tasks** — personal
  views scoped to whoever's viewing the doc.
- **Dev Dashboard** — dev-focused views, with child pages "Timeline" and
  "Board" (Kanban).
- **Teams Board** — per-team Kanban views, with child pages "Frontend
  Board", "Backend Board", "Mobile Editor Board".
- **Manager** — the project-management hub, with children:
  - **Calendar** — open tasks only (closed/completed hidden).
  - **My Calendar**
  - **Operational Board**
  - **Timeline**
  - **Goals & KPIs**
  - **Projects** — with children **Project Board**, **List View**,
    **2025 MidYear Planning**, **2026 Planning**, **Projects Timeline**,
    **Release Notes**, **List of Repositories**.
  - **All Tasks** — the master Tasks table (see §3), with children **New
    Tasks**, **Queued Tasks**, **In Progress Tasks**, **QA Tasks**,
    **Completed/Closed**, **On Hold Tasks**, **Backlog**, **Blocked**,
    **Archived**, **Unnassigned** [sic — that's the actual page name],
    **Utilities**.
- **Utilities** (under All Tasks) — children **SOPs** (see §5), **Teams**
  (see §4), **Holidays**, **Website Request Form** (intake form), **Blocks
  Inventory** (an embed), **Resources**.
- Other top-level pages: **Internal- Project Manager** (hidden page) and
  **Code Review**.

Most of the child pages under "All Tasks" and "Manager" are simply
filtered/grouped **views** of the one underlying Tasks table (§3) — e.g.
"Blocked" is the Tasks table filtered to `Progress Status = Blocked`, not
a separate table. Treat the Tasks table as the single source of truth and
the various board/calendar/timeline pages as different lenses on it.

## 3. The Tasks table — the master tracker (~1,796 rows)

This is the table every `coda-XXXX` reference in this repo points into.
Columns (excluding Coda-internal plumbing that isn't meaningful to a
reader, e.g. exact column IDs):

| Column | Type | Notes |
|---|---|---|
| **Task** | text | Title/display column. |
| **Progress Status** | select (single) | `Received` (default), `Queued`, `Backlog`, `In Progress`, `Blocked`, `QA`, `Code Review`, `Closed`, `Completed`, `On Hold`, `Archived`. See §5 for what "Completed" vs. "Closed" actually mean. |
| **Start Date** | date | |
| **Priority** | select | `Low`, `Normal`, `High`, `Critical`. |
| **Team** | lookup → Teams table | Single team per task; see §4. |
| **Notes** | rich text/canvas | Where the actual issue/requirement detail lives — see §5's intake-completeness rule. |
| **Created By** | person (auto) | |
| **ID** | number (auto) | **This is the `coda-XXXX` number** referenced in this repo's branch names, PR titles, and `RELEASE_NOTES.md`/`docs/changelog.md` entries. |
| **Owner** | person | |
| **Effort Days** | number | |
| **Due Date** | date (auto) | Computed as `Start Date` + `Effort Days` in working days. |
| **Created on** | timestamp (auto) | |
| **Project** | lookup → Projects table | Single project a task belongs to, if any (see §4). |
| **Solution/Action Taken** | text | Required to be filled before a task counts as done — see §5. |
| **QA Assignee** | person | See §5's Drumline QA note. |
| **Status Last Updated** | timestamp (auto) | |
| **Alert Drumline** | checkbox | Triggers an automation — see §5. |
| **Difficulty** | select | `Level 1`, `Level 2`, `Level 3`. |
| **Request Type** | select | `Bug`, `New Feature`, `Enhancement`, `Question`, `Operational`, `Documentation`, `Incident`, `Duplicate`, `Re-architecture`. |

## 4. Teams and Projects tables

### Teams (9 rows)

A simple reference table, one "Team" column, used as the lookup source
for Tasks' and Projects' `Team` columns. Each team has a display color in
the Coda UI: Frontend (Blue), Backend (Green), Mobile (Yellow),
Operational (Purple), Internal QA (Pink), Platform (Orange), Page Manager
App (Red), Staff Manager App (Gray), Dynamic Nav App.

### Projects (78 rows)

Groups related tasks under a larger initiative. Columns of note (again
excluding pure Coda plumbing):

- **Name**, **Status** (select), **Notes** (canvas).
- **Progress %** (auto) — completed-task count ÷ non-closed-task count
  for that project, ×100.
- **Estimate** (checkbox), **Tasks** (lookup — every Tasks row whose
  `Project` points at this row), **Task Count** (auto count), **Team**
  (lookup), **Project ID** (auto).
- **Projected Start** / **Projected End** (dates), **Owner** (person),
  **Created On** (auto), **Requested by** (person), **Project
  Prioritization Number**, **Goal(s)** (lookup).
- **Regional priority columns** — four territory columns plus one
  national column: **Central Territory**, **East Territory**, **South
  Territory**, **West Territory**, **National territory** — each a
  select starting at a default of `"0 - Set Priority"`.
- **Prioritization Ave** (auto) — averages the leading digit of all five
  territory priority selects above.
- **Prioritization Summary** (auto) — buckets that average into one of:
  `Priority Undetermined`, `Top of the Queue`, `Insert into the Queue`,
  `Insert after the Next in line Project`, `Bottom of the Queue`.

**What this means in practice:** a project's priority is negotiated
per-territory (Central / East / South / West) plus a National column,
then averaged — it is not set unilaterally by one owner. If you're
wondering why a project seems to be waiting despite looking important,
check whether all five territory columns have actually been set past the
"0 - Set Priority" default; an unset column will skew or block a
meaningful average.

## 5. SOPs — conventions to know before filing or triaging a ticket

These are the "Standard Operating Procedures for Tasks and Projects" from
the doc's SOPs page. Anyone filing, triaging, or closing a ticket in this
workspace should know these before touching a row:

- **Drumline QA assignment.** If a ticket affects the analytics data
  layer, the default `QA Assignee` is Elyse Morrison
  (e.morrison@heydrumline.com), with Jason as backup. Other named people
  (Allison, Hannah) can also be assigned QA on tickets they themselves
  submitted. (Note added to the SOP doc 2025-11-24.)
- **`Alert Drumline` checkbox.** Check this if a ticket affects site
  layout or the data layer. Checking it fires a Coda automation
  (configured in the doc's own Doc Settings — not visible/editable from
  outside the doc) that alerts configured team members both on check and
  on later status changes to that row.
- **Completed vs. Closed** (`Progress Status`) — these are not
  interchangeable:
  - **Completed** — the ticket passed every stage (review, development,
    testing, QA), with all details/actions recorded in comments and
    visible in the row's activity tab.
  - **Closed** — the ticket was concluded *without* full completion,
    e.g. it was a duplicate, belonged to another team, was an inquiry
    needing no dev work, or was already previously addressed elsewhere.
    Every closure must include a comment explaining why, plus any
    necessary external notification (email, etc.) to whoever filed it.
- **Overdue SLAs** (idle-time thresholds per `Progress Status`):
  - `Received` — reviewed within 3 working days, else overdue.
  - `Queued` — can sit up to 7 working days before overdue.
  - `QA` — 3 working days to be fully QA'd, else overdue.
  - (Anything not covered by one of these three windows is treated as
    overdue by default per the SOP doc's "all else overdue" language.)
- **Ticket intake completeness.** A ticket is only considered properly
  filed once its `Notes` field has complete issue/problem/requirement
  details *and* expected results — not just a one-line description.
- **Definition of done — tasks.** All of: the task itself completed;
  test cases attached/linked in Coda; proof of testing (screenshots,
  Loom videos, etc.); visual QA done; an instruction/demo video for
  enhancements or features; and `Solution/Action Taken` filled in.
- **Definition of done — projects.** All of: requirements completed;
  test cases attached/linked in Coda; proof of testing; a Project
  Documentation Data Sheet; a demo video; and `Solution/Action Taken`
  filled in.
- **Project/task timeline stages** (a draft guideline in the SOP doc, not
  a hard gate in the table itself): Planning/Scoping/Requirement Analysis
  → Design and Architecture → Development → Testing and QA (Internal,
  then External, then UAT-Internal) → Code Review (external QA process)
  → Demo (Media) → Documentation (checklist/form) → Deployment →
  Hand-off (Client).

## 6. Access

The doc is shared at **edit** access with the whole zesty.io
Coda/Superhuman workspace (not just a short list of named individuals),
plus a handful of individually-added external collaborators at
comment/edit level, and one "anyone with the link" grant at comment
level.

---

## How this relates to this repo's own conventions

- **`coda-XXXX` = Tasks-table `ID`.** Any git branch name, PR title, or
  changelog entry in this repo using that pattern is referencing a
  specific row in the Tasks table described in §3 — go there for the
  original requirement, requester, priority, and QA history, since this
  repo's own docs only track what was actually implemented and verified,
  not the original ask.
- **This file is not kept in lockstep with the live Coda doc.** Unlike
  `zesty.config.json` (mechanically regenerated by `sync-to-zesty.js`),
  there's no automated or scheduled process re-checking this file against
  Coda. Treat it as a snapshot as of the "Last generated" date above; if
  something here looks wrong against the live doc, trust the live doc and
  flag this file for a refresh.
- This file does not duplicate `docs/qa-test-plan.md` (that's this repo's
  own manual QA checklist for `quinn`/`karen`) or `docs/changelog.md`
  (this repo's own build/merge log) — it's purely "what the outside
  tracking tool looks like and how to use it," for a reader who's never
  opened the Coda doc before.

---

## Open Questions / Flags

1. This write-up is based on a point-in-time snapshot of the Coda doc's
   structure and SOP text handed to Documentation Maker for this task,
   not something Documentation Maker fetched directly (Documentation
   Maker has no Superhuman/Coda access of its own). If the live doc's
   page structure, table schemas, or SOP wording have changed since, this
   file will be stale until someone re-supplies current doc content for
   a refresh.
2. The "all else overdue" SLA language in §5 is a paraphrase of the SOP
   doc's own wording for statuses beyond `Received`/`Queued`/`QA` — the
   SOP doc doesn't spell out explicit day-counts for every other status
   (`In Progress`, `Blocked`, `On Hold`, etc.), so don't assume there's a
   numeric SLA for those beyond "not one of the three named exceptions."
3. **ZESTY QUESTION FOR ZED:** none — this file is entirely about an
   external project-management tool, not Zesty/WebEngine/Parsley
   platform behavior, so there's nothing here that needs zed's review.

---

## Review status

This document was **Approved** by the user on 2026-09-26 (previously
Draft — pending review). It was new content (no prior `/docs` file
covered project-management tooling) built from source material provided
directly rather than derived from this repo's own code.
