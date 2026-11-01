---
name: create-skill
description: Scaffold a new agent skill (SKILL.md with valid frontmatter, optional .mjs script) and fill it in. Use when the user says "create a skill", "make a new skill", "turn this into a skill", or "add a skill to my skills repo".
---

# Create Skill

Scaffolds a skill directory that passes `build-discovery-index.mjs` validation,
then writes the real content.

## How It Works

1. Pick a kebab-case name, at most 64 characters, that says what the skill
   does (`read-only`, `pr-description`).
2. Write the description: one sentence saying when to use it, plus the phrases
   that should trigger it. Agents only see the name and description until the
   skill loads, so the description decides whether the skill gets used.
3. Run the scaffolder. Add `--scripts` when the skill needs to run code.
4. Replace every `TODO` in the generated files.
5. If you're in a skills repo with `scripts/build-discovery-index.mjs`, commit
   and run it to validate. It reads from `HEAD`.

## Usage

```bash
node scripts/create-skill.mjs <name> "<description>" [--dir <skills-dir>] [--scripts]
```

**Arguments:**
- `name`: kebab-case skill name; this also becomes the directory name
- `description`: when to use the skill, with trigger phrases (max 1024 characters)
- `--dir`: parent directory for the skill (defaults to `./skills`)
- `--scripts`: also create an executable `scripts/<name>.mjs`

**Examples:**

```bash
# Instructions-only skill in this repo
node scripts/create-skill.mjs explain-error "Explain a stack trace in plain words. Use when the user pastes an error and asks what it means."

# Skill with a Node script
node scripts/create-skill.mjs dep-audit "Audit outdated dependencies. Use for 'check my deps'." --scripts

# Personal Claude Code skill
node scripts/create-skill.mjs my-style "..." --dir ~/.claude/skills
```

## Output

Status goes to stderr. JSON goes to stdout:

```json
{
  "name": "dep-audit",
  "path": "/repo/skills/dep-audit",
  "files": ["/repo/skills/dep-audit/SKILL.md", "/repo/skills/dep-audit/scripts/dep-audit.mjs"]
}
```

## Writing Guidelines

- Keep SKILL.md under 500 lines. Put long reference material in
  `references/` and link it from SKILL.md.
- Prefer scripts over inline code. Running a script costs only its output in
  context.
- Scripts: `#!/usr/bin/env node`, `.mjs`, status to stderr, JSON to stdout,
  and executable (`chmod +x`).
- Reference scripts by relative path: `node scripts/<script>.mjs`.

## Troubleshooting

- `already exists`: pick another name or edit the existing skill.
- `must be kebab-case`: lowercase letters, digits, and single hyphens only.
- Validation says a script `must be executable`: run
  `git update-index --chmod=+x skills/<name>/scripts/<file>.mjs`.
