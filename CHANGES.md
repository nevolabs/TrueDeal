# CHANGES.md

Changelog for this repo, newest entry first. Add a new dated entry here for
any substantive change so the next agent/session has context without needing
to replay `git log`.

---

## 2026-11-17 — Initial clone + Next.js port

**What was done**

- Cloned `https://github.com/iamdanusabu/sell.io` into `sell.io/` (reference
  only; its own `.git` history was dropped since it's vendored, not a
  submodule).
- Built a full Next.js 16 / TypeScript / Tailwind v4 port in `web/`:
  - Ported static data/constants (`lib/data.ts`), seed data (`lib/seed.ts`),
    and the entire business-logic/state-machine layer (`lib/store.ts`) from
    the original's `assets/js/data.js` and `assets/js/store.js`.
  - Added a mock REST API (`app/api/**/route.ts`) backed by an in-memory
    singleton store and an httpOnly session cookie (`lib/session.ts`) — no
    real auth, matching the original prototype's "sign in by email" model.
  - Rebuilt every page from the original's hash router as an App Router page:
    home, browse, item detail, how-it-works, login/join, sell landing, KYC
    verification, new listing, seller dashboard, checkout, buyer orders,
    order detail (role-aware: buyer/seller/bench-agent panels + ops
    inspection form), and the bench console (`/ops`).
  - Copied product photos and partner logos into `web/public/img`.
- Disabled `cacheComponents` in `next.config.ts` — it's incompatible with the
  all-client-components-fetch-the-mock-API architecture used here (dynamic
  routes like `/order/[id]` failed to prerender with it on).
- Verified: `npx tsc --noEmit` clean, `npm run build` clean, `npx eslint .`
  clean (two harmless warnings only). Exercised the full API lifecycle via
  curl against a running dev server: signup → KYC submit → listing blocked
  pre-verification → KYC approved by ops → listing created (pending) →
  approved by ops → full order lifecycle (paid → handover → at_hub →
  inspected/verified → dispatched/shipped → delivered → released/completed).
  Reset mock data back to seed state afterward (`POST /api/reset`).
- Initialized a new, separate git repo scoped to this `sellio/` directory
  (the enclosing filesystem tree has its own unrelated git repo one level up
  from here — left untouched) and pushed to the personal GitHub account:
  `origin` → `github-personal:nevolabs/PALAM---The-Bridge.git`, branch
  `master`. Git identity for this repo: `yethu-KL29 <yethukichu55@gmail.com>`
  (local config only, not global).
- Added `AGENTS.md` (repo root) and this file.

**Known limitations carried forward**

- No persistence beyond the Node process — state resets on restart or via
  `POST /api/reset`. This is intentional for a mock, not a TODO.
- No automated test suite yet.
- No real payments, KYC provider, or courier integration — all mocked,
  matching the original prototype's own disclaimers.
