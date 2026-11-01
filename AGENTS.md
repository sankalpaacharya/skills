# AGENTS.md

Guidance for AI coding agents working in this repository.

## Repository Overview

A collection of agent skills. Each skill is packaged instructions, plus optional scripts, that extends what an agent can do.

## Creating a New Skill

Run the scaffolder rather than writing the files by hand:

```bash
node skills/create-skill/scripts/create-skill.mjs <name> "<description>" [--scripts]
```

### Directory Structure

```
skills/
  {skill-name}/           # kebab-case, must equal the frontmatter name
    SKILL.md              # Required
    scripts/              # Optional: executable .mjs or .sh scripts
    references/           # Optional: docs loaded on demand
```

### SKILL.md Frontmatter

```yaml
---
name: {skill-name}        # kebab-case, max 64 chars, same as the directory
description: {When to use it, with trigger phrases. Max 1024 chars.}
---
```

### Rules

- Keep SKILL.md under 500 lines. Move long material to `references/`.
- Node scripts: `#!/usr/bin/env node`, `.mjs`, executable bit set.
- Status messages go to stderr, machine-readable JSON to stdout.
- Reference scripts by relative path: `node scripts/{script}.mjs`.
- Add every new skill to the table in README.md.

## Validation

`scripts/build-discovery-index.mjs` reads skills from `HEAD`, so commit first, then run:

```bash
npm run build
```

It fails on missing or invalid frontmatter, a name that doesn't match its directory, a non-executable script, or a duplicate name. CI runs the same script.
