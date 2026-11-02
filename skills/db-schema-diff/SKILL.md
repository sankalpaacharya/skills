---
name: db-schema-diff
description: Find the database schema changes on the current branch (Prisma, Drizzle, SQL migrations, Rails, Django, TypeORM, Knex/Sequelize) and draw them as BEFORE and AFTER entity-relationship diagrams in Eraser via the Eraser MCP, then reply with only the Eraser link. Use when the user says "/db-schema-diff", "what schema changes did I make", "diagram the migration", "show the DB changes before and after", or "schema diff in Eraser".
---

# DB Schema Diff

Turns this branch's database schema changes into two Eraser diagrams, BEFORE
and AFTER, and hands back one link.

The whole job is clarity. Show only what changed plus the tables it connects
to, mark every change the same way, and add nothing else.

## How It Works

1. Collect the changed schema files:

   ```bash
   node scripts/collect-schema-changes.mjs [base-ref]
   ```

   It compares the working tree (committed, uncommitted, and untracked files)
   against the merge-base with the base branch. If `files` is empty, reply
   `No schema changes found against <base>.` and stop. Don't create an Eraser
   file.

2. Work out what changed, then write a change model to a temp file outside the
   repo (`mktemp`). See [Building the model](#building-the-model).

3. Render the two diagrams:

   ```bash
   node scripts/render-erd.mjs /tmp/schema-model.json
   ```

   The output is JSON with `before` and `after` (Eraser ERD code) and a
   `summary` of counts. Don't hand-edit the code; fix the model and re-render.

4. Build the Eraser file with the Eraser MCP:
   - `create_file` with `name: "Schema changes · <branch> vs <base>"` and
     `linkAccess: "no-link-access"`. Schemas are internal, so keep the file
     private unless the user asked to share it. This skill sets the
     destination, so don't ask where to put the file.
   - `manually_create_diagram` with `diagramType:
     "entity-relationship-diagram"` and `code: before`. Then do the same with
     `code: after`. Use the manual tool: the code must be stored exactly as
     rendered, not rewritten by Eraser's AI.

5. Verify. `export_diagram` each diagram and look at the images. Every table
   must appear, and every relationship in the code must have a line. If
   something is missing, fix the model, re-render, and use
   `manually_update_diagram`.

6. Reply with the Eraser `fileUrl` and nothing else: no summary, no table
   list, no explanation.

## Building the Model

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

- `before` / `after`: the base ref and the branch name, used in the headers.
- `status` is `added`, `removed`, `changed`, or `unchanged` (the default). A
  table with no status becomes `changed` if any of its columns changed.
- `beforeType`: the old type when the type, nullability, or default changed.
- `beforeName`: the old name when a column was renamed. A renamed table is a
  removed table plus an added one.
- `cardinality`: `>` many-to-one (the default), `<` one-to-many, `-`
  one-to-one, `<>` many-to-many. Write `from` as the side that holds the
  foreign key.

Rules:

- **List every column of a changed table, with the correct status.** The
  renderer shows the primary key, the changes, and the relationship columns,
  and folds the rest into a single `⋯ N unchanged columns` row. Pass `--full`
  to show every column.
- **Include unchanged tables that a changed table points to or is pointed at
  by.** They're drawn gray as context. Their primary key and relationship
  columns are enough. Leave out other unchanged tables; the renderer drops
  them anyway.
- **Read the declarative schema first.** That means `schema.prisma`, Drizzle
  `pgTable` files, `db/schema.rb`, `structure.sql`, `models.py`, or TypeORM
  entities. Compare `before` with `after` from the script output.
- **When only migrations changed, the migration is the change.** Get the
  tables' earlier state from the declarative schema at the merge-base
  (`git show <mergeBase>:<path>`) or from older migrations.
- **Copy names and types exactly as the schema writes them.** Don't
  normalize them. Indexes and check constraints aren't drawn. If a change
  touches only those, mark the column `changed` and put the difference in
  `beforeType`, for example `"text"` → `"text unique"`.
- **Don't guess.** If a file is `truncated` or you can't tell what changed,
  read the file in the repo rather than inferring.

## What the Diagrams Look Like

| Mark | Color | Meaning |
| --- | --- | --- |
| `+ name` | green | added table or column (AFTER only) |
| `✕ name` / `− name` | red | removed table / column (BEFORE only) |
| `~ name`, `old → new` | orange | changed column, rename, or type change |
| plain | gray | unchanged, shown for context |

Each diagram has a black header box (`BEFORE · main`, `AFTER · feat/x`) and a
legend that lists only the marks it uses.

## Eraser Quirks the Renderer Handles

- A `[color: ...]` on a relationship line makes Eraser drop the line, so
  lines stay black and the table colors carry the meaning.
- A relationship can't point at a quoted column such as `"+ teamId"`. Those
  links fall back to table-to-table.
- ERDs have no title, so the header box does that job.

## Troubleshooting

- `could not detect a base branch`: pass one, for example
  `node scripts/collect-schema-changes.mjs origin/develop`.
- A schema file wasn't detected: read it yourself and add it to the model.
  The script matches common ORM paths and patterns, not every possible
  layout.
- `the model has no changes`: at least one table, column, or relationship
  needs a status other than `unchanged`.
- Eraser tools are missing: the Eraser MCP isn't connected or authorized.
  Tell the user to connect it (`/mcp` in Claude Code) and stop.
