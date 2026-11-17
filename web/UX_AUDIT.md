# UX / design audit — fix list

Source: a manual desktop-width audit of `http://localhost:3000` (home, browse,
a listing page, `/protection`, `/sell`, `/login`). The tester had no source
access and could not resize the viewport to test mobile. Findings below,
annotated with status and file pointers for whoever picks each item up.

## Root cause found before any item-by-item fix

Items 1-4 (and a good chunk of item 3's "low contrast text across the site")
all trace back to one bug: `app/globals.css` still had the create-next-app
boilerplate

```css
@media (prefers-color-scheme: dark) {
  :root { --background: #0a0a0a; --foreground: #ededed; }
}
```

This app is a deliberately **light-themed** site (the hero/footer dark
sections use explicit `bg-neutral-900 text-white` Tailwind classes). But most
plain text (headings, card copy, nav text) has no explicit `text-neutral-*`
class — it inherits `body`'s `color: var(--foreground)`. On a browser/OS set
to dark mode, that variable flipped to near-white while backgrounds stayed
explicitly light (`bg-white`, `bg-neutral-50`, etc.), so lots of text became
invisible: the header logo/nav, the grade-explanation box on listing pages,
the "Demo accounts" card on `/login`, and generally any text relying on
inherited color.

**Fixed:** the dark-mode media query was removed from `app/globals.css`
(see the comment left in that file). This alone should resolve items 1, 2,
4, and most of item 3. Agents picking up item 3 and others below should
re-verify contrast against the *light* theme only — don't re-add dark mode
support as part of fixing these.

---

## P0 — broken or unreadable

- [x] **1. Header logo/nav invisible** — root cause above. Re-verify after
      the globals.css fix; `components/Header.tsx` has no further known issue.
- [x] **2. White-on-white text in light cards** (grade box on listing pages,
      "Demo accounts" card on `/login`) — root cause above. Re-verify
      `components/DemoAccounts.tsx` and the condition box in
      `app/item/[id]/page.tsx`.
- [ ] **3. Low-contrast body text across the site** — re-verify after the
      globals.css fix; some of these may be genuinely low-contrast Tailwind
      classes (e.g. `text-neutral-400` on a dark background) independent of
      the dark-mode bug. Check: home page trust strip + partner list
      (`app/page.tsx`), browse subtitle (`app/browse/page.tsx`), listing page
      checklists / "From the seller" / assure list (`app/item/[id]/page.tsx`),
      `/protection` step descriptions + FAQ (`app/protection/page.tsx`).
- [x] **4. Sign in button nearly invisible on `/login`** — likely root cause
      above (the button already had `bg-neutral-900 text-white` in
      `app/login/page.tsx`, which should render fine once dark mode isn't
      flipping things — but re-verify contrast and add a visible
      `:focus-visible` ring; none exists today).
- [ ] **5. Browse shows a false empty state before data loads** —
      `app/browse/page.tsx` renders "Nothing matches those filters" while
      the initial fetch is in flight. Add a loading state (skeleton cards)
      and only show the empty state once the first fetch has resolved.

## P1 — UX and logic problems

- [ ] **6. Sticky header is translucent** (`bg-white/90 backdrop-blur` in
      `components/Header.tsx`) — content bleeds through on scroll. Make it
      opaque or confirm the blur reads clean with a bottom border.
- [ ] **7. Inconsistent header** — confirm the "Sign in" button isn't
      flickering/missing on `/protection`; it should hide on `/login` (via a
      pathname check) and show the user avatar/name when signed in (already
      partially implemented in `components/Header.tsx` — verify behavior).
- [ ] **8. Navigation feels slow/unresponsive** — add pressed/loading
      states on `components/ListingCard.tsx`, and a visible "redirecting to
      login…" state in `components/RequireAuth.tsx` instead of a silent delay.
- [ ] **9. Checkout bounces guests to login with no explanation** —
      `components/RequireAuth.tsx` redirects silently. Pass context so
      `/login` can show "Sign in to continue to checkout" when `next`
      points at `/checkout/*`.
- [ ] **10. Demo accounts affordance unclear + autofill risk** —
      `components/DemoAccounts.tsx`: add a visible "Use this account" label/
      hover state; `app/login/page.tsx`: add `autoComplete="off"` (or
      equivalent) to the email field so browsers don't suggest a real email
      on this prototype's sign-in form.
- [ ] **11. Filter state not in the URL** — `app/browse/page.tsx` keeps
      `cond`, `vault`, `sort`, `q` in React state only; only `cat` round-trips
      via the query string. Sync all of them to `useSearchParams`/
      `router.replace` so filters are shareable/reload-safe.
- [ ] **12. Category radio + condition checkboxes can dead-end** —
      `app/browse/page.tsx`: show live counts for the *current* filter
      combination (not just category counts) and disable/gray out options
      that would return zero results. Already has a "Clear filters" link in
      the empty state copy — make it an actual clickable action that resets
      state.
- [ ] **13. Payout calculator edge case** — `app/sell/page.tsx`: at a price
      below `FEES.minPrice` the fee/payout math still runs and can show a
      nonsensical payout. Add a "Minimum price is ₹X" validation message
      below the input, and add an on-site-visit fee toggle so the preview
      payout reflects it (`FEES.visitFee`).
- [ ] **14. Hero image doesn't match the product** — `app/page.tsx` hero
      uses `/img/gpu.jpg`; confirm whether that image is actually the
      1080 Ti the tester saw vs. the featured 2080 Ti listing, and swap for
      an accurate or neutral image.
- [ ] **15. "8 listings shown, copy says 9"** — `app/page.tsx` slices the
      featured grid to 8 (`.slice(0, 8)`) but the "All {total} listings" link
      uses the full live count. Either show all of the featured set or
      reword the copy so it doesn't imply the grid above has that many tiles.

## P2 — design polish

- [ ] **16. Emoji used as UI icons** — replace emoji (🔒 ✓ 🚚 ⏱ 🛡 🔍) with a
      proper SVG icon set (suggest `lucide-react`) at consistent size/stroke.
      Occurrences: `app/page.tsx` (trust strip), `app/item/[id]/page.tsx`
      (assure list), `app/browse/page.tsx` (search icon), `components/*`
      wherever checkmarks are used as plain `✓` characters.
- [ ] **17. Partner list cluttered/low-trust** — `app/page.tsx` + `PARTNERS`
      in `lib/data.ts`: group by role (Payments, Identity, Courier,
      Insurance) instead of a flat list with "· role" suffixes.
- [ ] **18. Footer is bright white under a dark site** —
      `components/Footer.tsx` uses `bg-neutral-50`; the rest of the site is
      light too post-fix, so re-evaluate whether this is still a real
      mismatch once the dark-mode bug is gone. Also add About/Contact/Terms/
      Privacy/Support links (currently only Fees/Browse/Sell).
- [ ] **19. `/protection` route name doesn't match nav label or H1** —
      rename the route to `/how-it-works` (`app/protection/` →
      `app/how-it-works/`) and update every internal link: `components/
      Header.tsx`, `app/page.tsx` (two links), `app/item/[id]/page.tsx`.
      **Do this one last** and coordinate with whoever else touches those
      files — it's the one genuinely cross-cutting item.
- [ ] **20. FAQ accordions use default browser disclosure triangle** —
      `app/protection/page.tsx` uses native `<details>/<summary>`; restyle
      with a chevron icon + open/close transition, keep contrast in mind.
- [ ] **21. Listing card polish** — `components/ListingCard.tsx`: add hover/
      focus state and a visible focus ring on the link, style condition as a
      chip instead of plain text, make sure the "Already inspected" badge
      and condition chip don't visually compete, add meaningful `alt` text
      (currently uses the title, confirm it's descriptive enough).
- [x] **22. Price formatting consistency** — verified: every formatted price
      across the app goes through `lib/data.ts`'s `inr()`
      (`toLocaleString('en-IN')`, correct Indian digit grouping). The only
      bare `₹` literals are input-field prefixes next to raw number inputs
      (`app/sell/page.tsx`, `app/sell/new/page.tsx`), not formatted totals —
      no change needed.
- [ ] **23. Typography hierarchy** — `app/protection/page.tsx`,
      `app/sell/page.tsx`: increase heading-to-body size/spacing contrast,
      cap paragraph width (~70ch) for readability.
- [ ] **24. Listing page right column** — `app/item/[id]/page.tsx`: make the
      "You pay from" total visually heavier, make the Buy button a
      high-contrast full-width primary (re-verify after the dark-mode fix —
      it may already read fine), add a bench-test checkbox above the button
      instead of only describing it in text.
- [ ] **25. `/sell` page is sparse** — `app/sell/page.tsx`: fill the empty
      area below the three steps with examples, a fee comparison, or FAQs;
      increase contrast on the "Create a seller account →" CTA.

## Accessibility + mobile pass (do last, after the above land)

- [ ] Run axe or Lighthouse on every route after the contrast fixes land.
- [ ] Add visible `:focus-visible` styles for every interactive element
      (links, buttons, radios, checkboxes) — currently relying on browser
      defaults in most places.
- [ ] Label every radio/checkbox filter in `app/browse/page.tsx` properly
      (currently wrapping `<input>` in `<label>` with trailing text, but
      verify screen readers announce them correctly — add explicit
      `aria-label` where the visible text alone isn't enough).
- [ ] Add `aria-live="polite"` to the listing/result count in
      `app/browse/page.tsx` so screen readers announce filter changes.
- [ ] Respect `prefers-reduced-motion` for any added hover/transition
      animations (items 8, 20, 21).
- [ ] Test at 390px width: `app/browse/page.tsx`'s filter sidebar
      (`grid-cols-[220px_1fr]`) should collapse into a drawer/accordion, and
      listing grids (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4`) should stay
      usable at that width (they already start at 2 columns — verify tap
      target sizes).

## Suggested order of work (per the original report)

1. Color tokens / contrast (items 1-4) — **root cause fixed**, re-verify only.
2. Loading/empty states (item 5), then filter dead-ends (item 12).
3. Header behavior + navigation feedback (items 6-9).
4. Filters, URL state, calculator (items 11, 13).
5. Visual polish (items 14-25).
6. Accessibility + mobile pass.
