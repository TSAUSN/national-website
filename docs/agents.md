# Agent Roster & Workflow

Status: Draft — pending review
Last generated: 2026-10-15 by Claude (zesty-ai project-discovery; from the zesty-ai 0.9.0 `ship-task` skill, `.claude/project.yaml`, `CLAUDE.md`, and the old roster in the `agent-lab` worktree's `.claude/agents/`)

How AI agents work on this project. It covers which plugin agents are used, where the human
gates are, and what this project changes. Shared rules live in the zesty-ai plugin
(`standards/`, `workflows/qa-to-release.md`). This doc records only what's specific to this
project.

## Quick reference

| Step | Agent | Does | Never does | Learnings file |
| --- | --- | --- | --- | --- |
| Plan | `zesty-ai:task-manager` | Reads the Coda task (`ID` = branch number), checks the acceptance criteria are testable, sequences work | Writes code; changes Coda rows without permission | `.claude/learnings/task-manager.md` |
| Build | `zesty-ai:developer` | Implements on the `coda-<ID>` branch, runs `npm run deploy:dry` when relevant, lists QA targets | Pushes shared branches; opens or merges PRs; commits unless asked | `.claude/learnings/developer.md` |
| Spec audit | `zesty-ai:spec-auditor` | Checks the real diff against the Coda `Notes` and `CLAUDE.md` (component reuse, field shapes, branch rules) | Edits files; renders the site | `.claude/learnings/spec-auditor.md` |
| Code review | `zesty-ai:sanity-check` | Reviews the diff for bugs, unescaped Parsley output, leftover debug code, secrets | Edits files | `.claude/learnings/sanity-check.md` |
| 🔒 Human review | Ticket owner (developer) | Reviews the diff, commits and pushes the branch | | |
| QA | `zesty-ai:qa` | Tests only the task on `https://8hxvw8tw-coda-<ID>.webengine.zesty.io/` in a real browser | Tests production beyond the read-only smoke checks; triggers deploys | `.claude/learnings/qa.md` |
| Reality check | `zesty-ai:reality-check` | Confirms "QA passed" against the files on disk and the live preview | Runs scripts or git | `.claude/learnings/reality-check.md` |
| Docs & release | `zesty-ai:documentation` | Updates `docs/` and `docs/changelog.md`, and drafts release notes | Publishes externally | `.claude/learnings/documentation.md` |
| Release readiness | `zesty-ai:release-manager` | Checks gates, defects and approvals before a production PR | Authorizes or performs a release | `.claude/learnings/release-manager.md` |
| Platform questions | `zesty-ai:zesty-expert` | Answers `PLATFORM QUESTION`s from docs.zesty.io and read-only lookups on instance `8-da979ebeab-d59gnx` | Implements, deploys or writes to the instance | `.claude/learnings/zesty-expert.md` |

## The main chain

The main chain is `zesty-ai:ship-task` (for example "ship coda-2541").

1. Coda task (`Tasks` table, `ID`) → task-manager plan. The human creates the `coda-<ID>`
   branch from `development` with `--no-track` if it doesn't exist yet.
2. The developer builds on `coda-<ID>`.
3. spec-auditor, then sanity-check. Critical or High findings go back to the developer, for
   at most 3 rounds before the human is asked.
4. 🔒 Human code review. The ticket owner reviews the diff, then commits and pushes.
5. 🔒 Preview: the branch preview comes from Zesty's GitHub integration once the branch is
   pushed. There's **no** workflow to run. The agent asks once: "is it pushed and is the
   preview up?"
6. qa on the branch preview (task scope only), then reality-check.
7. 🔒 Merges (human only): `coda-<ID>` → `development` → `stage` → `production`, one PR at a
   time. `pr-preview.yml` comments the sync impact on PRs into `stage` and `production`. Staging
   QA (regression) runs on `https://8hxvw8tw-dev.webengine.zesty.io/` after the `stage` push.
   After the `production` push, QA runs the read-only smoke checks in
   `docs/qa-test-plan.md` §7.
8. documentation updates `docs/changelog.md`, and the human updates the Coda task
   (`Progress Status`, `Solution/Action Taken`).

## Project-specific agents

None in this working tree. `.claude/agents/` doesn't exist on `development`.

The `agent-lab` worktree still holds the retired custom roster, which the plugin agents
replace:

| Old agent | Replaced by |
| --- | --- |
| tasha | `zesty-ai:task-manager` |
| wendell | `zesty-ai:developer` |
| jenny | `zesty-ai:spec-auditor` |
| rory | `zesty-ai:sanity-check` |
| quinn | `zesty-ai:qa` |
| karen | `zesty-ai:reality-check` |
| dot | `zesty-ai:documentation` |
| reggie | `zesty-ai:release-notes` skill |
| zed | `zesty-ai:zesty-expert` |
| ira | No plugin equivalent. It maintained the local `zesty` MCP server, which lives outside this repo |
| harriet | Not part of the workflow (a joke agent) |

## Project overrides

- **Never trigger `zesty-deploy.yml`** (`gh workflow run` or `workflow_dispatch`). On a
  `coda-*` branch it doesn't make a preview. It writes the branch's files into the shared dev
  version, which is the staging site. Deploys and publishes are human-only.
- **Never use `main`.** It isn't in the release flow and has deleted `.github/workflows/`.
- **Don't treat a branch as live** until the human confirms it's pushed and the preview is up.
- **On a 403 from a preview or stage URL,** QA and reality-check start a fresh browser context
  (cache and cookies cleared) and retry once before reporting.
- **Files agents must not edit:** `.github/workflows/` (human-only); `webengine/views/z/` and
  `webengine/views/menu-config/` (platform-owned, never committed); `zesty.config.json`
  mappings (generated by the deploy bot) unless the task is about them.
- **Commands:** agents may run `npm run deploy:dry` and `REPORT=true node
  scripts/sync-to-zesty.js`, never `npm run deploy`.
- **Coda:** read-only. Agents draft status and `Solution/Action Taken` text, and a human
  applies it.
- **Comments in webengine code:** keep them minimal. Ticket, debugging and agent notes go in
  commits and PRs.
- **No database connections,** ever (organization rule).
- **The agent-lab branch** is a sandbox and is never PR'd into `development`. Carry approved
  findings over on a normal ticket branch.

## Open Questions / Flags

- The old roster had approved lessons in the `agent-lab` worktree's `.claude/learnings/`
  (`wendell`, `jenny`, `rory`, `quinn`, `karen`, `dot`). Should they move into the plugin
  agents' files (`developer.md`, `spec-auditor.md`, `sanity-check.md`, `qa.md`,
  `reality-check.md`, `documentation.md`)? Today no learnings files exist on `development`.
- Learnings files are meant to be committed and shared, but `.claude` is gitignored here.
  Decide whether `.claude/learnings/` (and `.claude/project.yaml`) should be tracked.
- Who is the human code reviewer: always the ticket owner, or a second developer (the Coda
  "Code Review" status suggests a separate review step)?
- Who approves production releases (the `release.approvers` roles in `project.yaml` are
  placeholders)?

## Review status

Not yet reviewed.
