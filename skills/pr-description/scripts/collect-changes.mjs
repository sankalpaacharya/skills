#!/usr/bin/env node

// Summarizes the current branch against its base as JSON.
// Usage: node collect-changes.mjs [base-ref]

import { execFileSync } from 'node:child_process';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return undefined;
  }
};

const detectBase = () => {
  const remoteHead = tryGit('symbolic-ref', '--short', 'refs/remotes/origin/HEAD');
  if (remoteHead) return remoteHead;
  for (const candidate of ['origin/main', 'origin/master', 'main', 'master']) {
    if (tryGit('rev-parse', '--verify', '--quiet', candidate)) return candidate;
  }
  return undefined;
};

const base = process.argv[2] ?? detectBase();
if (!base) {
  console.error('error: could not detect a base branch; pass one, e.g. collect-changes.mjs origin/main');
  process.exit(1);
}

const mergeBase = tryGit('merge-base', base, 'HEAD');
if (!mergeBase) {
  console.error(`error: no common ancestor between ${base} and HEAD`);
  process.exit(1);
}

console.error(`Comparing HEAD against ${base} (merge-base ${mergeBase.slice(0, 7)})`);

const range = `${mergeBase}..HEAD`;
const separator = '\x1f';
const recordEnd = '\x1e';

const commits = git('log', '--reverse', `--format=%h${separator}%s${separator}%b${recordEnd}`, range)
  .split(recordEnd)
  .map((record) => record.trim())
  .filter(Boolean)
  .map((record) => {
    const [sha, subject, body] = record.split(separator);
    return { sha, subject, body: body?.trim() ?? '' };
  });

const statuses = new Map(
  git('diff', '--name-status', '--find-renames', range)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split('\t');
      return [paths.at(-1), { status: status[0], from: paths.length > 1 ? paths[0] : undefined }];
    }),
);

const files = git('diff', '--numstat', '--find-renames', range)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [added, deleted, ...rest] = line.split('\t');
    const raw = rest.join('\t');
    // Renames print as "dir/{old => new}/file" or "old => new".
    const path = raw.includes(' => ')
      ? raw.replace(/\{[^}]* => ([^}]*)\}/, '$1').replace(/^.* => /, '').replace(/\/\//g, '/')
      : raw;
    const binary = added === '-';
    return {
      path,
      ...statuses.get(path),
      additions: binary ? 0 : Number(added),
      deletions: binary ? 0 : Number(deleted),
      binary,
    };
  })
  .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));

const uncommitted = tryGit('status', '--porcelain') ?? '';

console.log(
  JSON.stringify(
    {
      base,
      branch: tryGit('rev-parse', '--abbrev-ref', 'HEAD'),
      mergeBase,
      commits,
      files,
      totals: {
        commits: commits.length,
        files: files.length,
        additions: files.reduce((sum, file) => sum + file.additions, 0),
        deletions: files.reduce((sum, file) => sum + file.deletions, 0),
      },
      hasUncommittedChanges: uncommitted.length > 0,
    },
    null,
    2,
  ),
);
