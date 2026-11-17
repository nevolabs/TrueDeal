/* sell.io prototype — bench console for verification agents. */
(function () {
  const { esc, inr, icon, db } = PK;

  const NEXT = {
    in_transit: 'Receive at hub', at_hub: 'Inspect', verified: 'Pack and dispatch',
    delivered: 'Release when window closes', disputed: 'Resolve claim'
  };

  PK.views.ops = () => {
    const st = db.state;
    const orders = st.orders;
    const queue = orders.filter((o) => NEXT[o.status]);
    const prio = ['disputed', 'at_hub', 'verified', 'in_transit', 'delivered'];
    queue.sort((a, b) => prio.indexOf(a.status) - prio.indexOf(b.status));
    const waiting = orders.filter((o) => ['paid', 'shipped'].includes(o.status));
    const closed = orders.filter((o) => ['completed', 'refunded', 'cancelled'].includes(o.status));
    const pendingListings = st.listings.filter((l) => l.status === 'pending');
    const pendingKyc = st.users.filter((u) => u.kyc && u.kyc.status === 'pending');
    const held = orders.filter((o) => !['completed', 'refunded', 'cancelled'].includes(o.status)).reduce((t, o) => t + o.total, 0);

    const orow = (o, action) => {
      const l = db.listing(o.listingId);
      return `<tr>
        <td><a class="tlink mono" href="#/order/${o.id}">${o.id}</a></td>
        <td>${esc(l.title)}<div class="muted small">${esc(PK.firstName(db.user(o.sellerId).name))} → ${esc(PK.firstName(db.user(o.buyerId).name))}, ${esc(o.address.city)} · ${esc(PK.TIERS[o.tier || 'full'].short)}${o.handover === 'onsite' ? ' · On site' : ''}</div></td>
        <td>${inr(o.total)}</td>
        <td>${PK.badge(o.status)}</td>
        <td class="t-right">${action ? `<a class="btn btn-sm" href="#/order/${o.id}">${action}</a>` : `<a class="link" href="#/order/${o.id}">Open</a>`}</td>
      </tr>`;
    };
    const table = (rows, head) => `<div class="tablewrap"><table class="table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
    const oHead = ['Order', 'Item', 'In escrow', 'Status', ''];

    return `<div class="wrap page">
      <div class="page-head"><h1>Bench console</h1><p>Signed in as ${esc(db.me().name)}, Bengaluru hub.</p></div>
      <div class="stats">
        <div><span>Orders needing action</span><strong>${queue.length}</strong></div>
        <div><span>Listings to review</span><strong>${pendingListings.length}</strong></div>
        <div><span>Sellers to verify</span><strong>${pendingKyc.length}</strong></div>
        <div><span>Currently in escrow</span><strong>${inr(held)}</strong></div>
      </div>

      <h2 class="list-h">Orders needing action</h2>
      ${queue.length ? table(queue.map((o) => orow(o, NEXT[o.status])).join(''), oHead) : `<div class="empty"><h3>The bench is clear.</h3></div>`}

      <h2 class="list-h">Listings to review</h2>
      ${pendingListings.length ? table(pendingListings.map((l) => {
        const s = db.user(l.sellerId);
        return `<tr>
          <td><div class="orow-img">${PK.thumb(l)}</div></td>
          <td><a class="tlink" href="#/item/${l.id}">${esc(l.title)}</a><div class="muted small">${esc(PK.CONDITIONS[l.condition].label)} · ${PK.age(l.ageMonths)} old · serial <span class="mono">${esc(l.serial)}</span></div></td>
          <td>${esc(s.name)}<div class="muted small">${s.deals} completed · ${esc(l.city)}</div></td>
          <td>${inr(l.price)}${l.newPrice ? `<div class="muted small">new ${inr(l.newPrice)}</div>` : ''}</td>
          <td class="t-right nowrap"><button class="btn btn-sm" data-act="listing-ok" data-id="${l.id}">Approve</button> <button class="btn btn-sm btn-quiet" data-act="listing-no" data-id="${l.id}">Reject</button></td>
        </tr>`;
      }).join(''), ['', 'Item', 'Seller', 'Asking', '']) : `<div class="empty"><h3>No listings waiting.</h3></div>`}

      <h2 class="list-h">Sellers to verify</h2>
      ${pendingKyc.length ? table(pendingKyc.map((u) => `<tr>
          <td>${esc(u.name)}<div class="muted small">${esc(u.email)} · ${esc(u.city)}</div></td>
          <td><span class="mono">${esc(u.kyc.pan)}</span><div class="muted small">PAN name: ${esc(u.kyc.legalName || u.name)}</div></td>
          <td>${esc(u.kyc.bank)} <span class="mono">••${esc(u.kyc.acct)}</span><div class="small ok">${icon('check', 12)} ₹1 test transfer: name matched</div></td>
          <td class="muted small">${PK.dateTime(u.kyc.at)}</td>
          <td class="t-right nowrap"><button class="btn btn-sm" data-act="kyc-ok" data-id="${u.id}">Verify</button> <button class="btn btn-sm btn-quiet" data-act="kyc-no" data-id="${u.id}">Reject</button></td>
        </tr>`).join(''), ['Seller', 'Identity', 'Bank account', 'Submitted', '']) : `<div class="empty"><h3>No sellers waiting.</h3></div>`}

      ${waiting.length ? `<h2 class="list-h">Waiting on someone else</h2>${table(waiting.map((o) => orow(o)).join(''), oHead)}` : ''}
      ${closed.length ? `<h2 class="list-h">Closed</h2>${table(closed.map((o) => orow(o)).join(''), oHead)}` : ''}
    </div>`;
  };
})();
