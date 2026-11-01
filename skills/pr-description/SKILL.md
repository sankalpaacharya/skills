---
name: pr-description
description: Write a clear pull request title and description from the current branch's commits and diff. Use when the user says "write a PR description", "describe this PR", "summarize my branch", or before opening a pull request.
---

# PR Description

Turns the current branch into a PR title and body a reviewer can scan in under
a minute.

## How It Works

1. Run `collect-changes.mjs` to get the commits, changed files, and line
   counts against the base branch.
2. Read the diffs of the largest or least obvious files
   (`git diff <mergeBase>..HEAD -- <path>`). Skip lockfiles and generated
   files.
3. Work out *why* the change exists from the commit messages, linked issues,
   and code. If the reason isn't recoverable, ask the user rather than invent
   one.
4. Write the title and body using the template below.
5. Show it to the user. Only run `gh pr create` or `gh pr edit` if they ask.

## Usage

```bash
node scripts/collect-changes.mjs [base-ref]
```

**Arguments:**
- `base-ref`: branch to compare against (defaults to `origin/HEAD`, then
  `origin/main`, `origin/master`, `main`, `master`)

## Output

```json
{
  "base": "origin/main",
  "branch": "feat/read-only-skill",
  "mergeBase": "3f2c1a9...",
  "commits": [{ "sha": "a1b2c3d", "subject": "Add read-only skill", "body": "" }],
  "files": [{ "path": "skills/read-only/SKILL.md", "status": "A", "additions": 88, "deletions": 0, "binary": false }],
  "totals": { "commits": 1, "files": 1, "additions": 88, "deletions": 0 },
  "hasUncommittedChanges": false
}
```

`status` is git's code: `A` added, `M` modified, `D` deleted, `R` renamed
(with `from`).

## Present Results to User

```markdown
**Title:** <type>(<scope>): <imperative summary, under 70 characters, no trailing period>

## What
<1-3 sentences: what changes for users or callers>

## Why
<the problem or motivation; link the issue if there is one>

## How
- <key implementation choices, only the non-obvious ones>

## Testing
- <commands run and what they showed, or "Not tested" and why>

## Reviewer notes
<where to start reading, risky spots, follow-ups; omit if none>
```

Rules:
- Format the title as a Conventional Commit: `feat`, `fix`, `docs`,
  `refactor`, `chore`, `ci`, or `test`, with an optional scope
  (`feat(auth): add passkey login`).
- Describe behavior, not a file-by-file changelog.
- Leave out sections that would be empty, except Testing.
- Don't claim tests passed unless you ran them or saw them pass.
- If `hasUncommittedChanges` is true, tell the user those changes aren't in
  the description.

## Troubleshooting

- `could not detect a base branch`: pass it explicitly, for example
  `node scripts/collect-changes.mjs origin/develop`.
- `no common ancestor`: run `git fetch origin` (ask first if the user is in
  read-only mode), or check that you're on the right branch.
- Empty `commits`: the branch has no commits beyond the base yet.
