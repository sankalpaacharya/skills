#!/usr/bin/env node

// Scaffolds skills/<name>/SKILL.md with valid frontmatter.
// Usage: node create-skill.mjs <name> "<description>" [--dir <skills-dir>] [--scripts]

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const [, value] = args.splice(index, 2);
  return value;
};
const has = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
};

const skillsDir = resolve(flag('--dir') ?? 'skills');
const withScripts = has('--scripts');
const [name, description] = args;

const fail = (message) => {
  console.error(`error: ${message}`);
  process.exit(1);
};

if (!name || !description) {
  fail('usage: create-skill.mjs <name> "<description>" [--dir <skills-dir>] [--scripts]');
}
if (name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
  fail(`name "${name}" must be kebab-case, at most 64 characters`);
}
if (description.length > 1024) {
  fail(`description is ${description.length} characters; the limit is 1024`);
}

const skillDir = join(skillsDir, name);
if (existsSync(skillDir)) fail(`${skillDir} already exists`);

const title = name
  .split('-')
  .map((word) => word[0].toUpperCase() + word.slice(1))
  .join(' ');

const usage = withScripts
  ? `## Usage

\`\`\`bash
node scripts/${name}.mjs [args]
\`\`\`
`
  : `## Steps

1. TODO
`;

const files = {
  'SKILL.md': `---
name: ${name}
description: ${JSON.stringify(description)}
---

# ${title}

TODO: one paragraph on what this skill does.

## How It Works

1. TODO

${usage}
## Present Results to User

TODO: how to format the result.
`,
};

if (withScripts) {
  files[`scripts/${name}.mjs`] = `#!/usr/bin/env node

// Status messages go to stderr; machine-readable output goes to stdout.

console.error('${name}: running');
console.log(JSON.stringify({ ok: true }, null, 2));
`;
}

console.error(`Creating ${skillDir}`);
for (const [file, content] of Object.entries(files)) {
  const path = join(skillDir, file);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content, { mode: file.startsWith('scripts/') ? 0o755 : 0o644 });
}

console.log(
  JSON.stringify(
    { name, path: skillDir, files: Object.keys(files).map((file) => join(skillDir, file)) },
    null,
    2,
  ),
);
