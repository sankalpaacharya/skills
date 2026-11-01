# Skills

Agent skills for Claude Code, Cursor, Copilot, and other coding agents. Follows the [Agent Skills](https://vercel.com/docs/agent-resources/skills) format.

## Skills

| Skill | What it does | Install |
| --- | --- | --- |
| [read-only](skills/read-only/SKILL.md) | Inspect and explain freely, but ask before any action that changes state | `npx skills add sankalpaacharya/skills --skill read-only` |
| [create-skill](skills/create-skill/SKILL.md) | Scaffold a new skill with valid frontmatter and an optional `.mjs` script | `npx skills add sankalpaacharya/skills --skill create-skill` |
| [pr-description](skills/pr-description/SKILL.md) | Write a PR title and body from the branch's commits and diff | `npx skills add sankalpaacharya/skills --skill pr-description` |

Install everything:

```bash
npx skills add sankalpaacharya/skills
```

Manual install for Claude Code:

```bash
cp -r skills/<skill-name> ~/.claude/skills/
```

## Usage

Invoke a skill by name, for example `/read-only`, or describe the task and let the agent pick the skill from its description.

## Development

```bash
npm install
node skills/create-skill/scripts/create-skill.mjs <name> "<description>" [--scripts]
git commit -am "Add <name> skill"
npm run build   # validates every committed skill and writes dist/index.json
```

On every push and pull request that touches `skills/`, the [Agent Skills Discovery](.github/workflows/agent-skills-discovery.yml) workflow runs `scripts/build-discovery-index.mjs`. On pushes to `main`, it also publishes the index and skill archives as a GitHub release.
