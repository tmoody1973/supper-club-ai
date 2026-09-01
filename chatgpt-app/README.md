# Supper Club AI ChatGPT App

This package exposes Supper Club AI as a standards-based MCP App. ChatGPT can create or open a shared dinner-party plan, and the Creative Host gets an interactive form inside the conversation instead of editing raw tool arguments.

## How state is shared

The MCP server does not keep its own plan database. Every tool calls the website's versioned PlanStore API:

```text
ChatGPT conversation
  ↕ MCP tools + interactive resource
chatgpt-app/server.ts
  ↕ authenticated server-to-server HTTP
Next.js /api/plans
  ↕ PlanStore interface
MemoryPlanStore (prototype) → durable adapter (next milestone)
```

The browser workspace opens the same plan through `/?plan=<planId>`. Both interfaces must provide the current plan version when saving, so a stale change cannot overwrite a newer one.

## Tools

- `create_party_plan` — creates an anonymous plan and opens the interactive planner.
- `get_party_plan` — reads the latest version without changing it.
- `configure_party` — saves inspiration, guests, budget, dietary needs, tone, and date.
- `finalize_party_plan` — validates completeness and requires the literal input `confirm: true` after the Creative Host explicitly approves.

Each tool returns the full structured plan, storage metadata, and the URL for opening that plan in the full website workspace. The tools reference `ui://supper-club/planner-v1.html`, a self-contained MCP Apps resource with bundled React, CSS, and JavaScript.

## Local development

With the main website running on port 3000:

```bash
npm install
npm run build
npm start
```

Environment variables:

```env
PORT=8787
HOST=0.0.0.0
SUPPER_CLUB_API_BASE_URL=http://127.0.0.1:3000
SUPPER_CLUB_WEBSITE_URL=http://127.0.0.1:3000
SUPPER_CLUB_SERVICE_TOKEN=
```

For deployment, set `SUPPER_CLUB_API_BASE_URL` and `SUPPER_CLUB_WEBSITE_URL` to the public Supper Club AI origin. Set the same high-entropy `SUPPER_CLUB_SERVICE_TOKEN` on this service and the website. Do not expose it to the widget or prefix it with `NEXT_PUBLIC_`.

Connect a compatible host to `http://localhost:8787/mcp`. For a hosted ChatGPT connection, deploy this package to an HTTPS endpoint and provide its `/mcp` URL when creating the connector.

## Verification

```bash
npm run typecheck
npm run build
```

The current PlanStore adapter is in-memory with a 24-hour TTL. It is deliberately labeled non-durable in tool output and in the widget. Replace it with a shared Redis or Postgres adapter before relying on plans across production cold starts or multiple instances.
