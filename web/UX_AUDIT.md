# UX / design audit — fix list

Source: a manual desktop-width audit of `http://localhost:3000` (home, browse,
a listing page, `/protection`, `/sell`, `/login`). All items below have been
fixed. Status and file pointers kept for reference / future regressions.

## Root cause found before any item-by-item fix

Items 1-4 (and a good chunk of item 3's "low contrast text across the site")
all traced back to one bug: `app/globals.css` still had the create-next-app
boilerplate

```css
@media (prefers-color-scheme: dark) {
  :root { --background: #0a0a0a; --foreground: #ededed; }
}
```

This app is a deliberately **light-themed** site (the hero/footer dark
sections use explicit `bg-neutral-900 text-white` Tailwind classes). But most
plain text (headings, card copy, nav text) had no explicit `text-neutral-*`
class — it inherited `body`'s `color: var(--foreground)`. On a browser/OS set
to dark mode, that variable flipped to near-white while backgrounds stayed
explicitly light (`bg-white`, `bg-neutral-50`, etc.), so lots of text became
invisible: the header logo/nav, the grade-explanation box on listing pages,
the "Demo accounts" card on `/login`, and generally any text relying on
inherited color.

**Fixed:** the dark-mode media query was removed from `app/globals.css` (see
the comment left in that file). Do not reinstate it without auditing every
component for explicit text color first.

---

## P0 — broken or unreadable

- [x] **1. Header logo/nav invisible** — root cause fix.
- [x] **2. White-on-white text in light cards** — root cause fix.
- [x] **3. Low-contrast body text across the site** — root cause fix resolved
      most of this; re-verified every remaining page (home, browse, item,
      `/how-it-works`) against the light theme — all explicit Tailwind text
      classes read at acceptable contrast on their backgrounds.
- [x] **4. Sign in button nearly invisible on `/login`** — root cause fix,
      plus added a visible `:focus-visible` ring (`app/login/page.tsx`).
- [x] **5. Browse shows a false empty state before data loads** —
      `app/browse/page.tsx` now shows skeleton cards while loading and only
      renders the real empty state after the first fetch resolves.

## P1 — UX and logic problems

- [x] **6. Sticky header is translucent** — `components/Header.tsx` header is
      now fully opaque (`bg-white`, no backdrop blur).
- [x] **7. Inconsistent header** — the "Sign in" button is now hidden on
      `/login` (pathname check), the avatar/name displays correctly when
      signed in.
- [x] **8. Navigation feels slow/unresponsive** — added hover/active states
      to header nav links and the `ListingCard` link; a dedicated loading
      indicator for the auth-redirect case was judged unnecessary scope
      (the existing "Loading…" text in `RequireAuth` already covers it).
- [x] **9. Checkout bounces guests to login with no explanation** —
      `app/login/page.tsx` now shows "Sign in to continue to checkout" when
      `next` points at `/checkout/*`; the `next` param already round-tripped.
- [x] **10. Demo accounts affordance unclear + autofill risk** —
      `components/DemoAccounts.tsx` now shows a "Use this account →" hint on
      hover/focus; `app/login/page.tsx`'s email field has `autoComplete="off"`.
- [x] **11. Filter state not in the URL** — `app/browse/page.tsx` now syncs
      `cat`, `cond`, `vault`, `sort`, `q` to the URL query string via
      `router.replace`.
- [x] **12. Category radio + condition checkboxes can dead-end** —
      `app/api/listings/route.ts` now computes category counts relative to
      the *other* active filters (not a flat total), and
      `app/browse/page.tsx` grays out/disables zero-result categories and
      makes "Clear filters" an actual button.
- [x] **13. Payout calculator edge case** — `app/sell/page.tsx` shows a
      "Minimum price is ₹X" message below the min price, and an on-site-visit
      toggle that updates the previewed payout.
- [x] **14. Hero image doesn't match the product** — verified: `/img/gpu.jpg`
      is the exact same photo used for the `l_gpu` listing (the RTX 2080 Ti
      referenced in the report sample further down the page) — there is no
      actual mismatch in code; the alt text is generic and makes no specific
      model claim. No change made.
- [x] **15. "8 listings shown, copy says 9"** — `app/page.tsx` now reads
      "Showing {listings.length} of {total} live listings" instead of
      juxtaposing an unrelated total next to the 8-tile grid.

## P2 — design polish

- [x] **16. Emoji used as UI icons** — replaced with a small inline SVG icon
      set (`components/icons.tsx`) rather than adding a new dependency like
      lucide-react — same visual intent, zero added install footprint.
      Occurrences fixed: `app/page.tsx`, `app/item/[id]/page.tsx`,
      `app/browse/page.tsx`, `app/how-it-works/page.tsx`.
- [x] **17. Partner list cluttered/low-trust** — `PARTNERS` in `lib/data.ts`
      now has a `category` field; `app/page.tsx` groups them under Payments /
      Identity / Courier / Insurance headings, and the section copy now notes
      this is a mock prototype.
- [x] **18. Footer is bright white under a dark site** — re-evaluated: this
      is no longer a mismatch now that the whole site is consistently light.
      Added About/Contact/Terms/Privacy/Support to `components/Footer.tsx`
      (About/Contact/Terms/Privacy are muted placeholders with a "not built
      in this prototype" tooltip rather than dead links; Support links to
      the `/how-it-works` FAQ).
- [x] **19. `/protection` route name doesn't match nav label or H1** —
      renamed to `/how-it-works`; updated every internal link
      (`components/Header.tsx`, `components/Footer.tsx`, `app/page.tsx`).
      Verified old `/protection` 404s and the new route serves correctly.
- [x] **20. FAQ accordions use default browser disclosure triangle** —
      `app/how-it-works/page.tsx` FAQ now uses a chevron icon that rotates on
      open via Tailwind's `group-open:` variant, no JS state needed.
- [x] **21. Listing card polish** — `components/ListingCard.tsx`: added a
      `:focus-visible` ring on the card link, condition is now a chip (not
      plain text) that reads distinctly from the "Already inspected" badge.
- [x] **22. Price formatting consistency** — verified already correct;
      every formatted price goes through `inr()`.
- [x] **23. Typography hierarchy** — addressed as part of items 20/25 polish
      on `/how-it-works` and `/sell`; both already used a reasonable
      heading/body scale once contrast was fixed, so this was mostly a
      non-issue post root-cause-fix.
- [x] **24. Listing page right column** — "You pay from" is now a heavier
      (text-base font-semibold) row, the Buy button is a larger/bolder
      full-width primary with a hover + focus state, and a bench-test
      checkbox toggle now sits above it on items without a pre-inspected
      report (updates the previewed total and carries the choice into
      checkout via `?tier=full`).
- [x] **25. `/sell` page is sparse** — added a "What you'd take home" fee
      example table and a short seller-specific FAQ section; strengthened
      the CTA link's visual weight and added a focus ring.

## Accessibility + mobile pass

- [x] Added a site-wide default `:focus-visible` outline in `globals.css` so
      every interactive element (links, buttons, inputs, `<summary>`) gets a
      visible ring even where a component doesn't set its own.
- [x] Added a `prefers-reduced-motion` media query in `globals.css` that
      collapses all transitions/animations to near-zero duration for users
      who request it.
- [x] `app/browse/page.tsx`: condition checkboxes have explicit `aria-label`s,
      the result count has `aria-live="polite"`.
- [ ] **Not done — flagging honestly:** no automated axe/Lighthouse run was
      performed. This environment has no headless-browser/devtools
      automation tool available to this agent; run `npx lighthouse` or the
      axe browser extension yourself against each route to catch anything
      this manual pass missed.
- [ ] **Not done — flagging honestly:** the browse filter sidebar was not
      converted into a collapsible drawer at narrow widths. It already
      stacks above the results (no horizontal overflow) at any width because
      it has no column layout below the `md:` breakpoint, so it's functional
      at 390px, just not as polished as a dedicated drawer component would
      be. Revisit if mobile usage data suggests it's worth the extra
      component.
