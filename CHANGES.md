# CHANGES.md

Changelog for this repo, newest entry first. Add a new dated entry here for
any substantive change so the next agent/session has context without needing
to replay `git log`.

---

## 2026-11-18 — README rewritten with the actual product positioning

**What was done**

- Replaced the README's product description (which only described the
  `sell.io` used-hardware prototype) with the user-supplied product
  description for the actual product being built: a general secure
  buyer-seller transaction platform (verification + escrow + dispute
  resolution), renamed in the README to **TrueDeal** with the tagline
  "Verified Products. Protected Payments. Trusted Transactions."
- Flagged honestly in the README that the current codebase still implements
  the narrower `sell.io` scope (PC hardware, India, ₹ pricing, Bengaluru hub)
  and hasn't yet been reworked to match the broader product description —
  this is a known gap for a future session, not something silently glossed
  over.

## 2026-11-18 — Flatten repo root to be the Next.js app directly

**What was done**

- Moved every file out of `web/` up to the repo root via `git mv` (preserving
  history), so `package.json`, `app/`, `components/`, `lib/`, `public/` are
  now at the top level — `npm install`/`npm run dev` work directly from the
  repo root, no `cd web` needed. `sell.io/` (the original reference clone)
  stays as a sibling folder.
- Merged `web/.gitignore` into the root `.gitignore` (kept the fuller
  Next.js-generated one) and merged `web/AGENTS.md`'s Next.js
  auto-generated agent block into the root `AGENTS.md`, which was rewritten
  to describe the flat layout.
- Deleted the now-empty `web/` directory (including its `node_modules`/
  `.next`, which were gitignored anyway) and reinstalled dependencies at the
  repo root.
- Verified: `npx tsc --noEmit`, `npm run build`, `npx eslint .` all clean
  from the new root location.

## 2026-11-18 — UX audit fixes, repo rename, proper README

**What was done**

- Ran a full UX/design audit fix pass (see `UX_AUDIT.md`): found and fixed
  the root cause of most contrast complaints (a leftover
  `prefers-color-scheme: dark` media query in `globals.css` that fought the
  app's light-only theme), then fixed all 25 audit items plus an
  accessibility/mobile pass — header/login/browse/item/home/footer/sell page
  polish, URL-synced + dead-end-aware browse filters, a payout-calculator
  edge case, emoji icons replaced with a small inline SVG set
  (`components/icons.tsx`, no new dependency), `/protection` renamed to
  `/how-it-works`, and site-wide `:focus-visible` + `prefers-reduced-motion`
  CSS added.
- GitHub repo renamed by the user from `PALAM---The-Bridge` to `TrueDeal`;
  updated the git remote URL and every doc reference.
- Replaced the create-next-app boilerplate `README.md` with real setup/run/
  demo-account/verification instructions.

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
  `origin` → `github-personal:nevolabs/TrueDeal.git`, branch
  `master`. Git identity for this repo: `yethu-KL29 <yethukichu55@gmail.com>`
  (local config only, not global).
- Added `AGENTS.md` (repo root) and this file.

**Known limitations carried forward**

- No persistence beyond the Node process — state resets on restart or via
  `POST /api/reset`. This is intentional for a mock, not a TODO.
- No automated test suite yet.
- No real payments, KYC provider, or courier integration — all mocked,
  matching the original prototype's own disclaimers.
