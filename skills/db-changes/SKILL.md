---
name: db-changes
description: Find the database schema changes on the current branch (Prisma, Drizzle, SQL migrations, Rails, Django, TypeORM, Knex/Sequelize), draw them as BEFORE and AFTER entity-relationship diagrams in Eraser with the Eraser MCP, and reply with only the Eraser link. Use when the user says "/db-changes", "what schema changes did I make", "diagram the migration", "show the DB changes before and after", or "schema diff in Eraser".
---

# DB Changes

Draws this branch's database schema changes as two Eraser diagrams, BEFORE and
AFTER, and replies with one link.

The diagrams show only the changed tables and the tables they link to.

## How it works

1. Collect the changed schema files.

   ```bash
   node scripts/collect-schema-changes.mjs [base-ref]
   ```

   The script compares the working tree against the merge-base with the base
   branch, so it includes committed, uncommitted, and untracked files. If
   `files` is empty, reply `No schema changes found against <base>.` and stop.
   Don't create an Eraser file.

2. Work out what changed and write a change model to a temp file outside the
   repo (`mktemp`). See [Building the model](#building-the-model).

3. Render the two diagrams.

   ```bash
   node scripts/render-erd.mjs /tmp/schema-model.json
   ```

   The script prints JSON with `before` and `after` (Eraser ERD code) and a
   `summary` of counts. Don't edit the code by hand. Fix the model and render
   again.

4. Build the Eraser file with the Eraser MCP.
   - Call `create_file` with `name: "Schema changes · <branch> vs <base>"` and
     `linkAccess: "no-link-access"`. Schemas are internal, so keep the file
     private unless the user asks to share it. This skill sets the
     destination, so don't ask the user where to put the file.
   - Call `manually_create_diagram` with `diagramType:
     "entity-relationship-diagram"` and `code: before`, then again with
     `code: after`. Use the manual tool because Eraser's AI rewrites code
     passed to `create_diagram`.

5. Call `export_diagram` on each diagram and look at the images. Every table
   in the code must appear, and every relationship must have a line. If
   something is missing, fix the model, render again, and call
   `manually_update_diagram`.

6. Reply with the Eraser `fileUrl` and nothing else.

## Building the model

```json
{
  "before": "main",
  "after": "feat/sessions",
  "tables": [
    {
      "name": "User",
      "columns": [
        { "name": "id", "type": "String", "pk": true },
        { "name": "nickname", "type": "String?", "status": "removed" },
        { "name": "age", "type": "Int?", "beforeType": "String?", "status": "changed" },
        { "name": "fullName", "beforeName": "name", "type": "String", "status": "changed" },
        { "name": "avatarUrl", "type": "String?", "status": "added" },
        { "name": "teamId", "type": "String", "fk": true },
        { "name": "createdAt", "type": "DateTime" }
      ]
    },
    { "name": "Session", "status": "added", "columns": [
      { "name": "id", "type": "String", "pk": true },
      { "name": "userId", "type": "String", "fk": true }
    ] },
    { "name": "Team", "columns": [{ "name": "id", "type": "String", "pk": true }] }
  ],
  "relations": [
    { "from": "Session.userId", "to": "User.id", "status": "added" },
    { "from": "User.teamId", "to": "Team.id" }
  ]
}
```

Fields:

- `before` and `after` hold the base ref and the branch name. They go in the
  diagram headers.
- `status` is `added`, `removed`, `changed`, or `unchanged` (the default). A
  table with no status becomes `changed` if any of its columns changed.
- `beforeType` holds the old type when the type, nullability, or default
  changed.
- `beforeName` holds the old name when a column was renamed. Model a renamed
  table as one removed table and one added table.
- `cardinality` is `>` for many-to-one (the default), `<` for one-to-many, `-`
  for one-to-one, or `<>` for many-to-many. Put the side that holds the
  foreign key in `from`.

Rules:

- List every column of a changed table with its status. The renderer shows the
  primary key, the changed columns, and the relationship columns, and folds
  the rest into one `⋯ N unchanged columns` row. Pass `--full` to show every
  column.
- Include each unchanged table that a changed table links to. The renderer
  draws these gray, and their primary key and relationship columns are
  enough. It drops unchanged tables with no link to a change.
- Read the declarative schema first: `schema.prisma`, Drizzle `pgTable` files,
  `db/schema.rb`, `structure.sql`, `models.py`, or TypeORM entities. Compare
  its `before` and `after` contents from the script output.
- If only migrations changed, the migration describes the change. Read the
  earlier state of the touched tables from the declarative schema at the
  merge-base (`git show <mergeBase>:<path>`) or from older migrations.
- Copy names and types exactly as the schema writes them. The diagrams don't
  show indexes or check constraints. If a change touches only those, mark the
  column `changed` and put the old definition in `beforeType`, for example
  `"text"` for a column that is now `"text unique"`.
- If a file is `truncated` or the change is unclear, read the file in the repo
  instead of guessing.

## What the diagrams show

| Mark | Color | Meaning |
| --- | --- | --- |
| `+ name` | green | Added table or column. Appears in AFTER only. |
| `✕ name`, `− name` | red | Removed table or column. Appears in BEFORE only. |
| `~ name`, `old → new` | orange | Changed column, rename, or type change. |
| no mark | gray | Unchanged table, shown because it links to a change. |

Each diagram has a black header box (`BEFORE · main` or `AFTER · feat/x`) and
a legend that lists only the colors that diagram uses.

## Eraser limits the renderer works around

- Eraser drops a relationship line that has a `[color: ...]` property, so the
  renderer leaves lines black and uses table colors to show changes.
- A relationship can't reference a quoted column such as `"+ teamId"`, so the
  renderer links those tables at the table level instead.
- ERDs have no title, so the header box names each diagram.

## Troubleshooting

- If the script says `could not detect a base branch`, pass one, for example
  `node scripts/collect-schema-changes.mjs origin/develop`.
- If the script misses a schema file, read the file yourself and add its
  tables to the model. The script matches common ORM paths and patterns, not
  every layout.
- If the renderer says `the model has no changes`, give at least one table,
  column, or relationship a status other than `unchanged`.
- If the Eraser tools are missing, the Eraser MCP isn't connected. Tell the
  user to connect it with `/mcp` in Claude Code, and stop.
