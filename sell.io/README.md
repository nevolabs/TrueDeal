# sell.io

A clickable prototype of a verified marketplace for pre-owned computer hardware in India.
Buyers pay into escrow, the item is physically inspected by a sell.io agent, and the seller
is paid only after the buyer has had 48 hours with it.

Everything runs in the browser. There is no backend: sample data is stored in each visitor's
`localStorage`, so every person who opens the site gets their own copy. No real payments,
KYC checks or courier bookings happen.

## Try it

Use the **Prototype** bar at the bottom left to switch between the three sides of a deal:

| Account | What to try |
|---|---|
| Arjun (buyer) | Buy a listing, pick a verification level, confirm delivery or raise a claim |
| Rhea (seller) | List an item, choose hub drop-off or an on-site visit, hand over a sale |
| Nikhil (bench agent) | Approve sellers and listings, run inspections, dispatch, resolve claims |

**Reset** restores the sample data.

## How a deal works

1. The buyer pays into escrow and picks a verification level:
   a look-and-feel check (included) or a full bench test (paid add-on).
2. The seller either couriers the item to the hub (free) or pays for an agent to
   inspect and collect it on site (fee deducted from the payout).
3. The agent works through the checklist and issues a report. A failed inspection refunds the buyer in full.
4. The item ships sealed and insured. After a 48-hour inspection window, the payout is released.

Fees, shipping rates, bench-test prices and checklists are placeholders in `assets/js/data.js`.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python -m http.server 4173
```

## Deploy

It is a static site with no build step.

- **GitHub Pages:** push to GitHub, then Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.
- **Vercel:** import the repository, framework preset "Other", no build command, output directory `.`.

## Code

| File | Contents |
|---|---|
| `assets/js/data.js` | Fees, categories, verification levels, checklists, order steps |
| `assets/js/store.js` | Sample data, persistence and every deal action (the order state machine) |
| `assets/js/ui.js` | Formatting helpers and shared components (cards, inspection report, header) |
| `assets/js/views-*.js` | Pages: public, account (checkout, selling), order, bench console |
| `assets/js/app.js` | Hash router, click actions and form handling |
| `assets/css/app.css` | All styles |

Product photos are from [Unsplash](https://unsplash.com) and only illustrate the sample listings.
