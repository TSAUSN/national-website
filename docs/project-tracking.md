# Project Tracking

Status: Draft — pending review
Last generated: 2026-10-15 by Claude (zesty-ai project-discovery; read-only lookups of the live Coda doc's Tasks schema and "How We Work" / "Resources" pages; seeded from the 2026-09-25 agent-lab doc)

How work is tracked for this project. The tracker is the source of truth for task status. This
repository reads from it through `integrations.tasks` in `.claude/project.yaml` (read-only)
and never writes to it without explicit permission.

## 1. What the tracker is for

- **Tool:** Coda (also reachable through the Superhuman Docs connector).
- **Doc:** "Salvation Army National/Corps Website Project", doc ID `GNetDKGq5M`.
- **Owner:** Gisele Blair. The "How We Work" page was last reviewed 2026-09-25.
- **Scope:** all work on The Salvation Army's national web platform on Content.One. That
  covers the National site; the territory, division and location sites; and the supporting
  apps (Mobile Editor App, Dynamic Navigation, Staff Manager App, GDOS location sync). The
  doc isn't specific to this repo, and many tasks are for other repos or are operational
  work (see the doc's "List of Repositories" page).
- **Users:** the Content.One dev team, TSA National, and the four territories (Central, East,
  South, West), all of which share one Zesty instance.

## 2. Structure

Most pages are filtered views of one **Tasks** table. The pages that matter here:

| Page | Holds |
| --- | --- |
| All Tasks | The master `Tasks` table (1,824 rows on 2026-10-15), with views by status |
| Inbox | New requests (`Received`) waiting for their routed developer to accept |
| Standup | Active work by owner. Red rows are stale |
| Code Review | Board of tasks in `Code Review` (added automatically when the status changes) |
| Projects / Prioritizations | Projects, per-territory priorities and votes, progress |
| Decisions | Cross-territory decisions that change shared behavior |
| Release Notes | Monthly client release notes, one row per month |
| Manager | Task overview, the `Devs` table (expertise, out-of-office), weekly views |
| Teams | Area owners and backups used for automatic routing |
| Resources | Preview, live and manager URLs |
| List of Repositories | GitHub repos for each part of the platform. This repo is `TSAUSN/national-website` |
| Holidays & Time Off | US and Philippines holidays used in workday counts |

## 3. Tasks

Table `Tasks` (`grid-i-KqDtiqCI`). Columns that matter to a developer or agent:

| Field | Meaning | Values |
| --- | --- | --- |
| `ID` | Ticket number (formula `RowId(thisRow)`). Used in the branch name | `2541` → branch `coda-2541` |
| `Task` | Title (display column) | text |
| `Notes` | **The requirement**: problem, affected site/page, expected result, links, screenshots | canvas |
| `Progress Status` | Workflow state (see below) | `Received`, `Queued`, `Backlog`, `In Progress`, `Blocked`, `QA`, `Code Review`, `Closed`, `Completed`, `On Hold`, `Archived` |
| `Priority` | | `Low`, `Normal`, `High`, `Critical` |
| `Request Type` | | `Bug`, `New Feature`, `Enhancement`, `Question`, `Operational`, `Documentation`, `Incident`, `Duplicate`, `Re-architecture` |
| `Difficulty` | | `Level 1`, `Level 2`, `Level 3` |
| `Team` | Area (lookup → Teams). Drives routing | e.g. `Frontend`, `Not Sure` |
| `Project` | Parent project (lookup → Projects) | e.g. `Launch & Maintenance (2026)` |
| `Owner` / `QA Assignee` | Developer and tester | person |
| `Start Date`, `Effort Days`, `Due Date` | Due Date = Start + Effort in workdays, minus holidays and time off (formula) | dates |
| `Committed Date` | Set to the Due Date when the task moves to In Progress. Never changed afterward | date |
| `Waiting On` / `Waiting On Detail` | Who a held or blocked task waits on, and for what | `TSA National`, `TSA Central/East/South/West`, `Content.One Product`, `Content.One Dev Team`, `Third Party` |
| `Solution/Action Taken` | What was done. Required for Completed | text |
| `Status Last Updated` | Stamped by automation on status change. Don't hand-edit | datetime |
| `Workdays in Status`, `Stale`, `Slipped`, `Status Check`, `Waiting Since`, `Workdays Waiting` | Formula health flags | computed |
| `Routed To`, `Passed By`, `Accept`, `Not Mine`, `Needs PM Review` | Inbox routing and buttons | computed / buttons |
| `Decisions` | Linked cross-territory decisions | lookup |

**Statuses:**

- **Received:** new and routed, waiting in the developer's Inbox.
- **Queued:** accepted.
- **In Progress:** being worked on.
- **Code Review:** development done, code under review.
- **QA:** being tested.
- **Completed:** passed every stage.
- **On Hold:** waiting on TSA.
- **Blocked:** waiting on Content.One or a third party.
- **Closed:** ended without development. The reason is always in the comments.
- **Backlog:** deprioritized.
- **Archived:** set aside for review.

## 4. Teams and projects

- **Teams:** each Team row lists Owners and a Backup. A new request goes to the Team owner with
  the fewest open tasks, skipping anyone out of office. Then it goes to the Backup, then to the
  "Not Sure" owner (the project manager).
- **Projects:** group tasks. National and each territory give every project a priority. These
  average into a Prioritization Summary (for example "Top of the Queue"), which is reviewed at
  the bi-weekly town hall.
- **Decisions:** all territories share one instance, so changes to shared behavior are
  recorded on the Decisions page. The statuses there are Open → Awaiting Agreement → Decided →
  Superseded. Task comments aren't the place for these decisions.

## 5. SOPs to know before filing or triaging

- **One issue per request.** `Notes` must describe the problem, the site and page, and the
  expected result.
- **Response targets:** `Received` reviewed within 1 workday, `Queued` picked up within about
  7 workdays, `QA` tested within 3 workdays.
- **On Hold vs. Blocked:** use On Hold for a TSA wait and Blocked for a Content.One or third-party
  wait. Always fill in `Waiting On` and `Waiting On Detail`, and clear both when the task moves on.
- **Stale:** a task is stale when it's In Progress or Code Review past its Due Date, or 3+
  workdays without a status change when there's no estimate.
- **Slipped:** the Due Date moved past the Committed Date. If you need more time, raise
  `Effort Days` and add a comment. Never edit `Committed Date`.
- **Definition of done (task):**
  - the work is finished
  - test cases are attached or linked
  - there's proof of testing (screenshots, Loom)
  - a visual QA check is done
  - new features and enhancements have a demo or instructions
  - `Solution/Action Taken` is filled in
- **Completed vs. Closed:** Completed means it passed every stage. Closed means it ended
  without development (duplicate, question, wrong team, already fixed), with the reason
  in a comment.
- Use task comments for questions and updates, so the history stays in one place.

## 6. Access

The whole Content.One workspace has edit access. Each agent or person who reads the doc through
the zesty-ai helper uses their own `CODA_API_TOKEN` in the gitignored `.env`, limited to read
access and this doc. Tokens are never committed or written into docs.

## How this relates to this repository

- **Branch naming:** `coda-<ID>`, cut from `development` with `--no-track`. Use lowercase and
  hyphens with no `/`, because the branch name becomes the preview hostname
  `8hxvw8tw-<branch>.webengine.zesty.io`. Follow-up suffixes are allowed (`coda-2541-fix`).
  Production hotfixes use `-prod` (`coda-2541-prod`).
- **Acceptance criteria:** the task's `Notes` column. If they aren't testable, the
  task-manager asks the human before work starts.
- **Where ticket IDs may appear:** branch names, commit messages, PR titles and descriptions,
  and `docs/changelog.md`. Not in shipped code comments, and not in client release notes (the
  "Monthly Client Release Notes" SOP leaves out IDs and internal names).
- **Status updates:** agents may draft a status change or a `Solution/Action Taken` text, but
  only a human applies it (or explicitly authorizes the write).
- **QA evidence:** QA reports from the zesty-ai qa agent provide the "proof of testing" the
  definition of done asks for.

## Open Questions / Flags

- The old doc's `Alert Drumline` checkbox and its SOP (Drumline QA for analytics and data-layer
  changes) aren't in the live Tasks schema as of 2026-10-15. Is analytics QA still routed to
  Drumline, and how?
- Release cadence vs. the "Release Notes" table: monthly client notes are written from
  Completed tasks. Confirm whether the dev team also logs each production release there.
- This doc is a snapshot. If the live Coda doc changes, trust the live doc and flag this file
  for a refresh.

## Review status

Not yet reviewed.
