<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (not auto-generated — safe to edit)

See `../AGENTS.md` (repo root) for the full picture of this project. Short
version: this is a Next.js port of the `sell.io` prototype in `../sell.io`,
with a mock REST API under `app/api/**` backed by an in-memory store in
`lib/store.ts`. `cacheComponents` is intentionally off in `next.config.ts`
because every page is a client component that fetches `/api/*` — re-enabling
it will break prerendering on dynamic routes like `/order/[id]`.
