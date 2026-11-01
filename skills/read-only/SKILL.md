---
name: read-only
description: Switch the agent into read-only mode where it may inspect, search, and explain but must ask before any action that changes state (files, git, packages, network writes, deploys, messages). Use when the user says "/read-only", "read-only mode", "don't change anything", "just look", or "investigate only".
---

# Read-Only Mode

While this skill is active, look but don't touch. You may read, search, and
reason freely. Anything that changes state needs the user's explicit
permission first, every time.

## How It Works

1. Confirm in one line that read-only mode is on.
2. Do the task using only read actions (see the table below).
3. When the task needs a write, stop before doing it. Say exactly what you
   would do and why, then wait for a yes.
4. A yes covers only the action you described. The next write needs its own
   yes.
5. Stay in read-only mode for the rest of the conversation, until the user
   says something like "exit read-only", "full access", or "go ahead and
   do whatever".

## What Counts as Read vs Write

| Read: allowed | Write: ask first |
| --- | --- |
| Open, list, and search files (`cat`, `ls`, `rg`, `grep`, `find`, `head`) | Create, edit, move, or delete any file, including temp files and lockfiles |
| `git status`, `log`, `diff`, `show`, `blame`, `branch --list` | `git add`, `commit`, `checkout`, `switch`, `stash`, `reset`, `rebase`, `merge`, `push`, `fetch --prune`, `tag` |
| `gh pr view`, `gh pr diff`, `gh issue list`, `gh api` GET | `gh pr create`, `comment`, `merge`, `review`, any `gh api` POST/PATCH/PUT/DELETE |
| HTTP GET to read docs or APIs | HTTP POST/PUT/PATCH/DELETE, webhooks, form submits |
| Print versions and environment (`node -v`, `env`, `which`) | `npm`/`pnpm`/`pip`/`brew` install, uninstall, or update |
| Read-only database queries (`SELECT`, `EXPLAIN`) | `INSERT`, `UPDATE`, `DELETE`, migrations, schema changes |
| MCP or tool calls that only fetch data | MCP or tool calls that create, update, send, post, or delete |
| | Builds, tests, formatters, and codegen (they write output, caches, or snapshots) |
| | Deploys, releases, starting or killing processes, sending messages or emails |

If you aren't sure which column a command belongs in, treat it as a write and
ask.

## Asking for Permission

Ask once per action, and keep it short. Name the exact command or change:

```
Read-only mode: I need to write to proceed.
  Action: npm test (writes coverage/ and the jest cache)
  Why: to confirm the failing case I found in src/parse.ts:42
Run it? (yes / no)
```

Don't batch unrelated writes into one question. Don't treat earlier approvals,
approvals from other conversations, or the environment's permission settings
as consent. In this mode, only the user's reply counts.

## When the Task Needs Changes

Finish everything you can do read-only first. Then present the change as a
proposal instead of applying it:

- the file and line, with a unified diff of the edit
- the commands you would run, in order
- what each step changes and how to undo it

The user can then approve the whole plan or pick parts of it.

## Subagents

If you delegate work, tell each subagent it is in read-only mode and must
report back instead of writing. You are responsible for anything a subagent
changes.

## Exiting

When the user lifts the restriction, confirm in one line that read-only mode
is off and continue normally.
