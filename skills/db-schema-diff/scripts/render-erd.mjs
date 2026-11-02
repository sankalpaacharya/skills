#!/usr/bin/env node

// Turns a schema change model (JSON) into two Eraser ERD diagrams, BEFORE and
// AFTER, with one consistent color and marker scheme.
// Usage: node render-erd.mjs <model.json | -> [--full]

import { readFileSync } from 'node:fs';

const STATUSES = ['added', 'removed', 'changed', 'unchanged'];
const COLORS = { added: 'green', removed: 'red', changed: 'orange', unchanged: 'gray' };
const COLUMN_MARKS = { added: '+ ', removed: '− ', changed: '~ ', unchanged: '' };
const LEGEND = {
  before: [
    ['removed', 'red', '✕ table / − column: removed'],
    ['changed', 'orange', '~ changed (old → new)'],
    ['unchanged', 'gray', 'unchanged, shown for context'],
  ],
  after: [
    ['added', 'green', '+ table / + column: added'],
    ['changed', 'orange', '~ changed (old → new)'],
    ['unchanged', 'gray', 'unchanged, shown for context'],
  ],
};

const fail = (message) => {
  console.error(`error: ${message}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const full = args.includes('--full');
const source = args.find((arg) => arg !== '--full');
if (!source) fail('usage: render-erd.mjs <model.json | -> [--full]');

let model;
try {
  model = JSON.parse(readFileSync(source === '-' ? 0 : source, 'utf8'));
} catch (error) {
  fail(`could not read model: ${error.message}`);
}

const checkStatus = (status, where) => {
  if (status !== undefined && !STATUSES.includes(status)) {
    fail(`${where}: status "${status}" must be one of ${STATUSES.join(', ')}`);
  }
};

const tables = (model.tables ?? []).map((table) => {
  if (!table.name) fail('every table needs a name');
  checkStatus(table.status, `table ${table.name}`);
  const columns = (table.columns ?? []).map((column) => {
    if (!column.name || !column.type) fail(`table ${table.name}: every column needs a name and type`);
    checkStatus(column.status, `column ${table.name}.${column.name}`);
    return { status: 'unchanged', ...column };
  });
  const derived = columns.some((column) => column.status !== 'unchanged') ? 'changed' : 'unchanged';
  return { ...table, status: table.status ?? derived, columns };
});
const tableByName = new Map(tables.map((table) => [table.name, table]));

const parseEnd = (end, where) => {
  const [table, column] = end.split('.');
  if (!tableByName.has(table)) fail(`${where}: unknown table "${table}"`);
  if (column && !tableByName.get(table).columns.some((c) => c.name === column)) {
    fail(`${where}: unknown column "${end}"`);
  }
  return { table, column };
};

const relations = (model.relations ?? []).map((relation) => {
  const where = `relation ${relation.from} → ${relation.to}`;
  if (!['<', '>', '-', '<>'].includes(relation.cardinality ?? '>')) {
    fail(`${where}: cardinality must be <, >, -, or <>`);
  }
  checkStatus(relation.status, where);
  return {
    cardinality: '>',
    status: 'unchanged',
    ...relation,
    from: parseEnd(relation.from, where),
    to: parseEnd(relation.to, where),
  };
});

if (tables.every((table) => table.status === 'unchanged') && relations.every((r) => r.status === 'unchanged')) {
  fail('the model has no changes; mark what changed with status added, removed, or changed');
}

// Unchanged tables appear only when a relation links them to a changed table.
const touched = new Set(tables.filter((table) => table.status !== 'unchanged').map((table) => table.name));
for (const relation of relations) {
  if (relation.status !== 'unchanged') {
    touched.add(relation.from.table);
    touched.add(relation.to.table);
  }
}
const shown = new Set(touched);
for (const { from, to } of relations) {
  if (touched.has(from.table)) shown.add(to.table);
  if (touched.has(to.table)) shown.add(from.table);
}

const relationColumns = new Set(
  relations.flatMap(({ from, to }) => [from, to].filter((end) => end.column).map((end) => `${end.table}.${end.column}`)),
);

const exists = (status, side) => status !== (side === 'before' ? 'added' : 'removed');
const bare = (text) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
const quote = (text) => (bare(text) ? text : `"${String(text).replaceAll('"', "'")}"`);

const tableLabel = (table) =>
  table.status === 'added' ? `+ ${table.name}` : table.status === 'removed' ? `✕ ${table.name}` : table.name;

const columnLabel = (table, column) => {
  if (table.status === 'added' || table.status === 'removed') return column.name;
  const name = column.status === 'changed' && column.beforeName ? `${column.beforeName} → ${column.name}` : column.name;
  return `${COLUMN_MARKS[column.status]}${name}`;
};

const renderTable = (table, side) => {
  const present = table.columns.filter((column) => exists(column.status, side));
  const wholeTable = full || table.status === 'added' || table.status === 'removed';
  const visible = wholeTable
    ? present
    : present.filter(
        (column) =>
          column.pk ||
          column.status !== 'unchanged' ||
          relationColumns.has(`${table.name}.${column.name}`),
      );
  const hidden = present.length - visible.length;

  const lines = visible.map((column) => {
    const type = column.status === 'changed' && column.beforeType ? `${column.beforeType} → ${column.type}` : column.type;
    const keys = [column.pk && 'pk', column.fk && 'fk'].filter(Boolean).join(' ');
    return `  ${quote(columnLabel(table, column))} ${quote(type)}${keys ? ` ${keys}` : ''}`;
  });
  if (hidden > 0) lines.push(`  ${quote(`⋯ ${hidden} unchanged column${hidden === 1 ? '' : 's'}`)} ""`);

  return `${quote(tableLabel(table))} [color: ${COLORS[table.status]}] {\n${lines.join('\n')}\n}`;
};

// Eraser can't reference a quoted column in a relation, so a marked column
// ("+ teamId") falls back to a table-level link.
const renderEnd = ({ table, column }, side) => {
  const owner = tableByName.get(table);
  const target = owner.columns.find((c) => c.name === column);
  const label = target && columnLabel(owner, target);
  const entity = quote(tableLabel(owner));
  return target && exists(target.status, side) && bare(label) ? `${entity}.${label}` : entity;
};

const columnExists = ({ table, column }, side) => {
  if (!column) return true;
  const target = tableByName.get(table).columns.find((c) => c.name === column);
  return exists(target.status, side);
};

const render = (side) => {
  const sideTables = tables.filter((table) => shown.has(table.name) && exists(table.status, side));
  const names = new Set(sideTables.map((table) => table.name));
  const sideRelations = relations.filter(
    (relation) =>
      exists(relation.status, side) &&
      names.has(relation.from.table) &&
      names.has(relation.to.table) &&
      columnExists(relation.from, side) &&
      columnExists(relation.to, side),
  );
  const statuses = new Set(sideTables.map((table) => table.status));
  const legend = LEGEND[side]
    .filter(([status]) => statuses.has(status))
    .map(([, color, label]) => `  [color: ${color}, label: ${quote(label)}]`);
  const header = `${side.toUpperCase()}${model[side] ? ` · ${model[side]}` : ''}`;

  return [
    'typeface clean',
    'notation crows-feet',
    '',
    `${quote(header)} [color: black, colorMode: bold] { }`,
    '',
    ...sideTables.map((table) => `${renderTable(table, side)}\n`),
    ...sideRelations.map(
      (relation) => `${renderEnd(relation.from, side)} ${relation.cardinality} ${renderEnd(relation.to, side)}`,
    ),
    ...(legend.length ? ['', 'legend [position: bottom] {', ...legend, '}'] : []),
  ].join('\n');
};

const count = (items, status) => items.filter((item) => item.status === status).length;
const changedColumns = tables
  .filter((table) => table.status === 'changed' || table.status === 'unchanged')
  .flatMap((table) => table.columns);

console.log(
  JSON.stringify(
    {
      before: render('before'),
      after: render('after'),
      summary: {
        tables: { added: count(tables, 'added'), removed: count(tables, 'removed'), changed: count(tables, 'changed') },
        columns: {
          added: count(changedColumns, 'added'),
          removed: count(changedColumns, 'removed'),
          changed: count(changedColumns, 'changed'),
        },
        relations: { added: count(relations, 'added'), removed: count(relations, 'removed') },
      },
    },
    null,
    2,
  ),
);
