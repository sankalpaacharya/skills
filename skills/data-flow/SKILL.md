---
name: data-flow
description: "Draw one short Eraser flowchart of where data goes in a feature or the current branch's change, showing only the parts of the system data moves between, and reply with the Eraser link. Use when the user says \"/data-flow\", \"diagram the data flow\", \"how does data flow here\", \"show the flow this change touches\", or \"data flow in Eraser\"."
---

# Data flow

Draws one small Eraser flowchart of where data goes in a feature, or in the
current branch's change, and replies with the link.

The diagram shows where data moves between parts of the system. It never
shows how the code works inside one part.

## What goes in the diagram

A box is one of these:

- Where data comes from, such as a user, a browser, a mobile app, a cron
  schedule, or a webhook sender.
- A program that handles it. Draw one box per deployed app, service, or
  worker, named as the team calls it, such as `Web app` or `Billing worker`.
- Where data is stored, such as a table, a cache, a bucket, or a queue. Draw
  one box per table the flow writes or the change touches. Put any other
  storage in one box.
- Where data leaves the system, such as an external API, an email, or an
  outgoing webhook.

An arrow is data crossing between two boxes. That can be an HTTP request, a
database query, a queue message, an API call, or a file upload. Label it with
the data as a noun, such as `order`, `session token`, or `invoice PDF`. Add
an endpoint path or mechanism only when the change adds it, as in
`order (POST /api/orders)`.

Everything inside a box stays out. That includes functions, classes, files,
routes, middleware, validation, helpers, retries, logging, and error
handling. A function call is never an arrow. Steps that run in the same
program are one box.

Draw 3 to 7 boxes. Never draw more than 9 boxes or 10 arrows. If the diagram
doesn't fit, you are drawing the inside of a box, so merge boxes. If the flow
really spans more programs, draw the main path and name what you left out in
the reply.

Before you draw, test every box and arrow. If you removed it, would a reader
lose a fact about where data enters, where it is stored, or where it leaves?
If not, cut it.

## Branch changes

Show the arrows and boxes the change adds, removes, or changes. Add only the
unchanged boxes needed to connect them. Color what changed and leave the
rest uncolored.

| Change | Code |
| --- | --- |
| New box or arrow | `color: green` |
| Box whose data changed, such as a new column or field | `color: orange` |
| Removed box or arrow | `color: red`, and `-->` for the arrow |

## Steps

1. Pick the flow.
   - If the user names a feature, route, job, or file, diagram that flow.
   - Otherwise diagram the flow the current branch changes. Find the base
     with `git merge-base HEAD origin/main`, using the repo's default branch.
     List the changes with `git diff --stat <merge-base>` and
     `git status --short`, so uncommitted and untracked files count too.
   - If the change moves no data, for example docs, styling, or config only,
     reply `No data flow changes found against <base>.` and stop. Don't
     create an Eraser file.

2. Find where data crosses between boxes. Start at the entry point. Look for
   database queries and ORM calls, HTTP clients, vendor SDK calls, queue
   publishes, file or bucket writes, and emails. Read the code between them
   only as far as you need to name the data.

3. Apply the test above and cut what fails it.

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

6. Call `export_diagram` and look at the image. Every box you defined must
   appear, with no blank boxes and readable labels. A blank box means a
   connection misspells a node name. Fix the code and call
   `manually_update_diagram` until the image is right.

7. Reply with the Eraser `fileUrl`. If the diagram uses colors, add one line:
   `Green is new in this branch, orange changed, red removed.` If you left
   part of the flow out, name it in one more line.

## Writing the code

This example shows the format. It is not a real project.

```
title Save cart · feat/save-cart
direction right

browser [label: Browser, icon: computer]
web [label: Web app]
carts [label: carts table, shape: cylinder, icon: database, color: green]
stripe [label: Stripe API, icon: cloud]

browser > web: cart items
web > carts: cart [color: green]
web > stripe: payment intent
```

The route handler, cart service, and repository that save the cart all run
in the web app, so they are one box. Don't draw
`cart_route > cart_service > cart_repo > carts`.

Rules:

- Give each node a short name made of letters, digits, and underscores. Put
  the text people read in `label`.
- Quote a label that contains a comma, colon, semicolon, quote, bracket,
  brace, or slash.
- Define every node before the first connection that uses it.
- Put connection properties after the colon, as in
  `a > b: label [color: green]`. Without the colon, Eraser colors node `b`
  instead of the line.
- Use `>` for data flow. Use `-->` only for a removed arrow.
- Use `shape: cylinder` for tables, databases, buckets, and queues.
- Use `direction right`, so the flow reads left to right.
- Eraser's icon list includes `database`, `computer`, `cloud`, `cpu`, `bot`,
  and vendor icons such as `aws-lambda`. Leave the icon out if you aren't
  sure a name exists, and check the export.

## Troubleshooting

- If the Eraser tools are missing, the Eraser MCP isn't connected. Tell the
  user to connect it with `/mcp` in Claude Code, and stop.
- If `git merge-base` fails, ask the user which branch to compare against.
- If the flow reaches a service in another repository, draw it as one box and
  say in the reply that you didn't trace inside it.
