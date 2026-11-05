---
name: data-flow
description: "Draw one short Eraser flowchart of how data moves through a feature or the current branch's change, showing only the parts that matter, and reply with the Eraser link. Use when the user says \"/data-flow\", \"diagram the data flow\", \"how does data flow here\", \"show the flow this change touches\", or \"data flow in Eraser\"."
---

# Data flow

Draws one small Eraser flowchart of how data moves through a feature, or
through the code the current branch changed, and replies with the link.

The diagram shows only what a reviewer needs to follow the data. That means
where data enters, what handles it, where it is stored, and what external
services it reaches.

## How it works

1. Pick the flow.
   - If the user names a feature, route, job, or file, diagram that flow.
   - Otherwise diagram the flow the current branch changes. Find the base
     with `git merge-base HEAD origin/main`, using the repo's default branch.
     List the changes with `git diff --stat <merge-base>` and
     `git status --short`, so uncommitted and untracked files count too.
   - If the change moves no data, for example docs, styling, or config only,
     reply `No data flow changes found against <base>.` and stop. Don't
     create an Eraser file.

2. Trace the flow in the code. Start at the entry point, such as a route, a
   page action, a CLI command, a cron job, or a queue consumer. Follow the
   calls until the data is stored, sent, or returned. Read each step in the
   code. Don't infer a step from a file name.

3. Choose what to draw. See [Keeping it small](#keeping-it-small).

4. Write the flowchart code. See [Writing the code](#writing-the-code).

5. Create the Eraser file with the Eraser MCP.
   - Call `create_file` with `name: "Data flow · <flow> · <branch>"` and
     `isTeamFile: true`. Leave `linkAccess` unset. Set it to
     `"publicly-viewable"` only when the user asks for a link anyone can
     open.
   - If `create_file` fails because the Eraser plan has no files left, tell
     the user. Ask them for an existing file to add the diagram to, or to
     upgrade. Don't pick a file yourself.
   - Call `manually_create_diagram` with `diagramType: "flowchart-diagram"`
     and the code. Use the manual tool, because `create_diagram` sends the
     text through Eraser's AI, which rewrites it.

6. Call `export_diagram` and look at the image.
   - Every node you defined must appear.
   - No blank box may appear. A connection that misspells a node name
     creates one.
   - Every label must be readable.

   Fix the code and call `manually_update_diagram` until the image is right.

7. Reply with the Eraser `fileUrl`. If the diagram uses change colors, add
   one line: `Green is new in this branch, orange changed, red removed.` If
   you left out a step or branch of the flow, name it in one more line.

## Keeping it small

- Aim for 4 to 8 nodes. Never draw more than 10 nodes or 12 connections. If
  the flow is bigger, draw the main path and name what you left out in the
  reply.
- A node is something data passes through or rests in. Examples are a
  client, a route or handler, a service, a queue, a worker, a table, a cache,
  a bucket, or an external API. Draw one node per component, not one per
  function.
- Leave out logging, metrics, auth middleware, config, types, validation
  helpers, retries, and error paths, unless the change is about them.
- Name nodes as the code does, for example `POST /api/orders`, `orders`
  table, or `Stripe API`.
- Label each connection with the data that moves, in 2 to 5 words, for
  example `cart items`, `insert order row`, or `payment intent`. Add the
  mechanism only when a reviewer needs it, for example `webhook` or
  `queue message`.
- Point each arrow the way the data moves. Draw a response as its own arrow
  only when it carries data the reviewer cares about.
- Draw only what the code shows. If you can't find where a step happens,
  leave it out and say so in the reply.

For a branch change, color what changed and leave the rest uncolored.

| Change | Code |
| --- | --- |
| New node or connection | `color: green` |
| Node whose behavior changed | `color: orange` |
| Removed node or connection | `color: red`, and `-->` for the connection |

Include an unchanged node only when the changed part needs it to make sense.

## Writing the code

This example shows the format. It is not a real project.

```
title Save cart · feat/save-cart
direction right

browser [label: Browser, icon: computer]
cart_route [label: "POST /api/cart", color: green]
cart_service [label: Cart service]
carts [label: carts table, shape: cylinder, icon: database, color: green]
stripe [label: Stripe API, icon: cloud]

browser > cart_route: cart items [color: green]
cart_route > cart_service: cart items [color: green]
cart_service > carts: upsert cart row [color: green]
cart_service > stripe: payment intent
```

Rules:

- Give each node a short name made of letters, digits, and underscores. Put
  the text people read in `label`. Short names keep connections free of typos
  and quoting problems.
- Quote a label that contains a comma, colon, semicolon, quote, bracket,
  brace, or slash.
- Define every node before the first connection that uses it. If the node
  belongs to a group, define it inside the group.
- Put connection properties after the colon, as in
  `a > b: label [color: green]`. Without the colon, Eraser colors node `b`
  instead of the line.
- Use `>` for data flow. Use `-->` only for a removed connection.
- Use `shape: cylinder` for tables, databases, and buckets.
- Use `direction right`, so the flow reads left to right.
- Eraser's icon list includes `database`, `computer`, `cloud`, `cpu`, `bot`,
  and vendor icons such as `aws-lambda`. Leave the icon out if you aren't
  sure a name exists, and check the export.
- Group nodes only when it makes the picture clearer, for example a
  `web_app [label: Next.js app] { ... }` group around its routes.

## Troubleshooting

- If the Eraser tools are missing, the Eraser MCP isn't connected. Tell the
  user to connect it with `/mcp` in Claude Code, and stop.
- If `git merge-base` fails, ask the user which branch to compare against.
- If the flow crosses into another repository, draw that service as one node
  and say in the reply that you didn't trace inside it.
