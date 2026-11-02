#!/usr/bin/env node

// Finds database schema files changed between a base branch and the working
// tree (committed, uncommitted, and untracked) and prints their before/after
// contents as JSON.
// Usage: node collect-schema-changes.mjs [base-ref]

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const MAX_BYTES = 150_000;

const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });

const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return undefined;
  }
};

const detectBase = () => {
  const remoteHead = tryGit('symbolic-ref', '--short', 'refs/remotes/origin/HEAD')?.trim();
  if (remoteHead) return remoteHead;
  for (const candidate of ['origin/main', 'origin/master', 'main', 'master']) {
    if (tryGit('rev-parse', '--verify', '--quiet', candidate)) return candidate;
  }
  return undefined;
};

const fail = (message) => {
  console.error(`error: ${message}`);
  process.exit(1);
};

if (!tryGit('rev-parse', '--show-toplevel')) fail('not inside a git repository');
process.chdir(git('rev-parse', '--show-toplevel').trim());

const base = process.argv[2] ?? detectBase();
if (!base) fail('could not detect a base branch; pass one, e.g. collect-schema-changes.mjs origin/main');

const mergeBase = tryGit('merge-base', base, 'HEAD')?.trim();
if (!mergeBase) fail(`no common ancestor between ${base} and HEAD`);

console.error(`Comparing working tree against ${base} (merge-base ${mergeBase.slice(0, 7)})`);

const KINDS = [
  ['prisma', (path) => /\.prisma$/.test(path)],
  ['sql', (path) => /\.sql$/.test(path)],
  ['rails', (path) => /(^|\/)db\/(schema\.rb|migrate\/.+\.rb)$/.test(path)],
  ['django', (path) => /(^|\/)(models\.py|models\/.+\.py|migrations\/\d+.*\.py)$/.test(path)],
  ['typeorm', (path, text) => /\.entity\.[cm]?[jt]s$/.test(path) || /@Entity\s*\(/.test(text)],
  ['drizzle', (path, text) => /\b(pgTable|mysqlTable|sqliteTable)\s*\(/.test(text)],
  ['knex-sequelize', (path) => /(^|\/)migrations?\/.+\.[cm]?[jt]s$/.test(path)],
];

const readBefore = (path) => tryGit('show', `${mergeBase}:${path}`) ?? null;
const readAfter = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

const clip = (text) =>
  text !== null && text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;

const changed = git('diff', '--name-status', '--find-renames', mergeBase)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [status, ...paths] = line.split('\t');
    return { status: status[0], path: paths.at(-1), from: paths.length > 1 ? paths[0] : undefined };
  });

const untracked = git('ls-files', '--others', '--exclude-standard')
  .split('\n')
  .filter(Boolean)
  .map((path) => ({ status: 'A', path }));

const files = [...changed, ...untracked]
  .map(({ status, path, from }) => {
    // Path decides most kinds; only JS/TS files need their contents read.
    let before;
    let after;
    const content = () => {
      before ??= readBefore(from ?? path);
      after ??= readAfter(path);
      return `${before ?? ''}\n${after ?? ''}`;
    };
    const kind = KINDS.find(([, matches]) =>
      matches(path, /\.[cm]?[jt]sx?$/.test(path) ? content() : ''),
    )?.[0];
    if (!kind) return undefined;
    content();
    return {
      path,
      ...(from && { from }),
      kind,
      status,
      truncated: (before?.length ?? 0) > MAX_BYTES || (after?.length ?? 0) > MAX_BYTES,
      before: clip(before),
      after: clip(after),
    };
  })
  .filter(Boolean);

console.error(
  files.length === 0
    ? 'No schema files changed'
    : `Found ${files.length} changed schema file(s): ${files.map((file) => file.path).join(', ')}`,
);

console.log(
  JSON.stringify(
    {
      base,
      branch: tryGit('rev-parse', '--abbrev-ref', 'HEAD')?.trim(),
      mergeBase,
      files,
    },
    null,
    2,
  ),
);
