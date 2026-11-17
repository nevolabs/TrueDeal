/* sell.io prototype — signed-in pages: checkout, orders, seller dashboard, seller verification, new listing. */
(function () {
  const { esc, inr, icon, db } = PK;
  const F = PK.FEES;

  const row = (o, side) => {
    const l = db.listing(o.listingId);
    return `<a class="orow" href="#/order/${o.id}">
      <div class="orow-img">${PK.thumb(l)}</div>
      <div class="orow-main"><strong>${esc(l.title)}</strong><span class="muted small"><span class="mono">${o.id}</span> · ${PK.date(o.createdAt)}</span></div>
      <div class="orow-amt">${inr(side === 'seller' ? o.payout : o.total)}<span class="muted small">${side === 'seller' ? 'payout' : 'paid'}</span></div>
      <div class="orow-st">${PK.badge(o.status)}</div>
    </a>`;
  };
  PK.orderRow = row;

  /* ---------- checkout ---------- */
  PK.views.checkout = (route) => {
    const me = db.me(), l = db.listing(route.parts[1]);
    if (!l || l.status !== 'live') return PK.notFound('That item is no longer available.');
    const a = me.address || { name: me.name, phone: '', line: '', city: me.city || '', pin: '' };
    const ship = PK.shipFor(l.category);
    const vault = l.mode === 'hub' && !!l.report, bench = PK.benchFor(l.category);
    return `<div class="wrap page">
      <nav class="crumbs"><a href="#/item/${l.id}">Back to the listing</a></nav>
      <div class="page-head"><h1>Checkout</h1></div>
      <form class="checkout" data-form="checkout" novalidate>
        <input type="hidden" name="listingId" value="${l.id}">
        <div>
          <section class="panel">
            <h2>Deliver to</h2>
            <div class="fgrid">
              <label>Full name<input name="name" required value="${esc(a.name)}" autocomplete="name"></label>
              <label>Mobile number<input name="phone" required inputmode="tel" value="${esc(a.phone)}" autocomplete="tel" placeholder="10-digit mobile"></label>
              <label class="span2">Address<input name="line" required value="${esc(a.line)}" autocomplete="street-address" placeholder="Flat, building, street"></label>
              <label>City<input name="city" required value="${esc(a.city)}" autocomplete="address-level2"></label>
              <label>PIN code<input name="pin" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" value="${esc(a.pin)}" autocomplete="postal-code"></label>
            </div>
            <p class="muted small">The courier will ask for a one-time code at the door. Someone must be there to receive it.</p>
          </section>
          <section class="panel">
            <h2>How should we check it?</h2>
            ${vault ? `<div class="note">${icon('check', 16)}<span>This item has already had the full bench test and is sealed at our hub. Its report is on the listing.</span></div>`
            : `<div class="paylist">
              <label class="payopt"><input type="radio" name="tier" value="basic" data-tier="0" checked><span><strong>${PK.TIERS.basic.label}<b class="opt-price">Included</b></strong><em>${PK.TIERS.basic.note}</em></span></label>
              <label class="payopt"><input type="radio" name="tier" value="full" data-tier="${bench}"><span><strong>${PK.TIERS.full.label}<b class="opt-price">+${inr(bench)}</b></strong><em>${PK.TIERS.full.note}</em></span></label>
            </div>
            <p class="muted small">If the item fails either check, you are refunded in full, including the bench test fee.</p>`}
          </section>
          <section class="panel">
            <h2>Pay into escrow</h2>
            <div class="paylist">
              <label class="payopt"><input type="radio" name="pay" value="UPI" checked><span><strong>UPI</strong><em>Any UPI app. Recommended for amounts under ₹1,00,000.</em></span></label>
              <label class="payopt"><input type="radio" name="pay" value="Net banking"><span><strong>Net banking</strong><em>All major banks.</em></span></label>
              <label class="payopt"><input type="radio" name="pay" value="Card"><span><strong>Debit or credit card</strong><em>Visa, Mastercard, RuPay.</em></span></label>
            </div>
            <div class="note">${icon('lock', 16)}<span>Your payment is held by our payment partner and released to the seller only after the item passes inspection, is delivered, and your ${F.inspectionHours}-hour window has closed.</span></div>
          </section>
        </div>
        <aside class="panel co-sum">
          <div class="co-item">
            <div class="orow-img">${PK.thumb(l)}</div>
            <div><strong>${esc(l.title)}</strong><div class="muted small">${esc(PK.CONDITIONS[l.condition].label)} · sold by ${esc(PK.firstName(db.user(l.sellerId).name))}</div></div>
          </div>
          <dl class="sum">
            <div><dt>Item</dt><dd>${inr(l.price)}</dd></div>
            <div><dt>Insured shipping</dt><dd>${inr(ship)}</dd></div>
            <div><dt>Inspection</dt><dd id="co-insp">${vault ? 'Full bench test, done' : 'Look and feel, included'}</dd></div>
            <div class="sum-total"><dt>Total</dt><dd id="co-total">${inr(l.price + ship)}</dd></div>
          </dl>
          <div class="form-err" hidden></div>
          <button class="btn btn-lg btn-block" id="co-pay" data-base="${l.price + ship}">Pay ${inr(l.price + ship)} into escrow</button>
          <p class="muted small center">Prototype: no real payment is taken.</p>
        </aside>
      </form>
    </div>`;
  };

  /* ---------- buyer orders ---------- */
  PK.views.orders = () => {
    const me = db.me();
    const mine = db.state.orders.filter((o) => o.buyerId === me.id);
    const open = mine.filter((o) => !['completed', 'refunded', 'cancelled'].includes(o.status));
    const done = mine.filter((o) => ['completed', 'refunded', 'cancelled'].includes(o.status));
    return `<div class="wrap page narrow">
      <div class="page-head"><h1>Your orders</h1></div>
      ${!mine.length ? `<div class="empty"><h3>You have not bought anything yet.</h3><p><a class="ulink" href="#/browse">Browse listings</a></p></div>` : ''}
      ${open.length ? `<h2 class="list-h">In progress</h2><div class="olist">${open.map((o) => row(o)).join('')}</div>` : ''}
      ${done.length ? `<h2 class="list-h">Past orders</h2><div class="olist">${done.map((o) => row(o)).join('')}</div>` : ''}
    </div>`;
  };

  /* ---------- seller dashboard ---------- */
  const listingStatus = { live: ['Live', 'green'], pending: ['In review', 'amber'], reserved: ['Sale in progress', 'amber'], sold: ['Sold', 'ink'], rejected: ['Not accepted', 'red'], withdrawn: ['Withdrawn', 'muted'] };

  PK.views.selling = () => {
    const me = db.me();
    const k = me.kyc.status;
    const listings = db.state.listings.filter((l) => l.sellerId === me.id);
    const sales = db.state.orders.filter((o) => o.sellerId === me.id);
    const toAct = sales.filter((o) => o.status === 'paid');
    const moving = sales.filter((o) => ['in_transit', 'at_hub', 'verified', 'shipped', 'delivered', 'disputed'].includes(o.status));
    const paidOut = sales.filter((o) => o.status === 'completed');
    const pending = sales.filter((o) => ['paid', 'in_transit', 'at_hub', 'verified', 'shipped', 'delivered'].includes(o.status));
    const sum = (arr) => arr.reduce((t, o) => t + o.payout, 0);

    const kycBanner = k === 'verified' ? ''
      : k === 'pending' ? `<div class="banner banner-amber">${icon('clock', 18)}<div><strong>We are checking your details.</strong><span>This usually takes a few hours. You can list as soon as you are verified.</span></div></div>`
      : k === 'rejected' ? `<div class="banner banner-red"><div><strong>We could not verify your details.</strong><span>The name on the bank account must match your PAN.</span></div><a class="btn btn-sm" href="#/sell/verify">Try again</a></div>`
      : `<div class="banner"><div><strong>Verify your identity to start selling.</strong><span>PAN and a bank account in your name. A few minutes, once.</span></div><a class="btn btn-sm" href="#/sell/verify">Get verified</a></div>`;

    return `<div class="wrap page">
      <div class="page-head row">
        <div><h1>Selling</h1><p>${esc(me.name)}${k === 'verified' ? ` <span class="tag tag-green">${icon('check', 12)} ID verified</span>` : ''}</p></div>
        ${k === 'verified' ? `<a class="btn" href="#/sell/new">List an item</a>` : ''}
      </div>
      ${kycBanner}
      <div class="stats">
        <div><span>Live listings</span><strong>${listings.filter((l) => l.status === 'live').length}</strong></div>
        <div><span>Sales in progress</span><strong>${toAct.length + moving.length}</strong></div>
        <div><span>Held in escrow for you</span><strong>${inr(sum(pending))}</strong></div>
        <div><span>Paid out</span><strong>${inr(sum(paidOut))}</strong></div>
      </div>

      ${toAct.length ? `<h2 class="list-h">Needs your action</h2><div class="olist">${toAct.map((o) => row(o, 'seller')).join('')}</div>` : ''}
      ${moving.length ? `<h2 class="list-h">In progress</h2><div class="olist">${moving.map((o) => row(o, 'seller')).join('')}</div>` : ''}

      <h2 class="list-h">Your listings</h2>
      ${listings.length ? `<div class="tablewrap"><table class="table">
        <thead><tr><th>Item</th><th>Price</th><th>You receive</th><th>Status</th><th></th></tr></thead>
        <tbody>${listings.map((l) => {
          const st = listingStatus[l.status] || [l.status, 'muted'];
          return `<tr>
            <td><a class="tlink" href="#/item/${l.id}">${esc(l.title)}</a><div class="muted small">Listed ${PK.date(l.createdAt)}</div></td>
            <td>${inr(l.price)}</td><td>${inr(l.price - PK.fee(l.price) - (l.handover === 'onsite' ? F.visitFee : 0))}${l.handover === 'onsite' ? '<div class="muted small">after on-site visit</div>' : ''}</td>
            <td><span class="badge t-${st[1]}">${st[0]}</span></td>
            <td class="t-right">${['live', 'pending'].includes(l.status) ? `<button class="link" data-act="withdraw" data-id="${l.id}">Withdraw</button>` : ''}</td>
          </tr>`;
        }).join('')}</tbody></table></div>`
        : `<div class="empty"><h3>No listings yet.</h3><p>${k === 'verified' ? `<a class="ulink" href="#/sell/new">List your first item</a>` : 'Verify your identity, then list your first item.'}</p></div>`}

      ${paidOut.length ? `<h2 class="list-h">Payouts</h2><div class="olist">${paidOut.map((o) => row(o, 'seller')).join('')}</div>` : ''}
    </div>`;
  };

  /* ---------- seller verification (KYC) ---------- */
  PK.views.sellVerify = () => {
    const me = db.me();
    if (me.kyc.status === 'verified') return `<div class="wrap page narrow"><div class="empty"><h2>You are verified.</h2><p><a class="ulink" href="#/sell/new">List an item</a></p></div></div>`;
    if (me.kyc.status === 'pending') return `<div class="wrap page narrow"><div class="empty"><h2>Your details are with our team.</h2><p>We will email you as soon as you are verified. <a class="ulink" href="#/selling">Back to selling</a></p><p class="muted small">Prototype tip: switch to the bench agent (bottom left) to approve this.</p></div></div>`;
    return `<div class="wrap page narrow">
      <div class="page-head">
        <h1>Verify your identity</h1>
        <p>We verify every seller so that buyers know a real, traceable person stands behind each listing. Your details are never shown to buyers.</p>
      </div>
      <form class="panel" data-form="kyc" novalidate>
        <h2>Identity</h2>
        <div class="fgrid">
          <label class="span2">Full name, as on your PAN card<input name="legalName" required value="${esc(me.name)}"></label>
          <label>PAN<input name="pan" required maxlength="10" placeholder="ABCDE1234F" class="mono upper" pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]"></label>
          <label>Last 4 digits of Aadhaar<input name="aadhaar" required maxlength="4" inputmode="numeric" pattern="[0-9]{4}" class="mono"></label>
        </div>
        <h2>Bank account for payouts</h2>
        <div class="fgrid">
          <label>Bank<input name="bank" required placeholder="e.g. HDFC Bank"></label>
          <label>IFSC<input name="ifsc" required maxlength="11" placeholder="HDFC0001234" class="mono upper" pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}"></label>
          <label class="span2">Account number<input name="account" required inputmode="numeric" pattern="[0-9]{9,18}" class="mono"></label>
        </div>
        <p class="muted small">We send ₹1 to this account to confirm the holder's name matches your PAN. Payouts only ever go to this account.</p>
        <label class="check"><input type="checkbox" name="consent" required><span>I confirm that I own the items I list and that these details are mine.</span></label>
        <div class="form-err" hidden></div>
        <button class="btn btn-lg">Submit for verification</button>
      </form>
    </div>`;
  };

  /* ---------- new listing ---------- */
  PK.views.sellNew = () => {
    const me = db.me();
    if (me.kyc.status !== 'verified') return PK.views.sellVerify();
    PK._photo = '';
    return `<div class="wrap page">
      <nav class="crumbs"><a href="#/selling">Selling</a></nav>
      <div class="page-head"><h1>List an item</h1><p>Mention any scratches, faults or missing parts. The technician checks the item against this description.</p></div>
      <form class="checkout" data-form="listing" novalidate>
        <div>
          <section class="panel">
            <h2>The item</h2>
            <div class="fgrid">
              <label class="span2">Title<input name="title" required maxlength="90" placeholder="e.g. ASUS ROG Strix RTX 4070 Ti Super OC, 16 GB"></label>
              <label>Category<select name="category" required data-calc="list">${Object.keys(PK.CATEGORIES).map((k) => `<option value="${k}">${PK.CATEGORIES[k].label}</option>`).join('')}</select></label>
              <label>Brand<input name="brand" required></label>
              <label>Condition<select name="condition" required>${Object.keys(PK.CONDITIONS).map((k) => `<option value="${k}" ${k === 'excellent' ? 'selected' : ''}>${PK.CONDITIONS[k].label}</option>`).join('')}</select></label>
              <label>Age in months<input name="ageMonths" type="number" min="0" max="240" required inputmode="numeric"></label>
              <label class="span2">Warranty<input name="warranty" placeholder="e.g. 8 months manufacturer warranty, or leave blank if none"></label>
              <label class="span2">Description<textarea name="description" required rows="4" placeholder="How it was used, any marks or faults, what is included."></textarea></label>
            </div>
            <div class="checks-inline">
              <label class="check"><input type="checkbox" name="invoice" checked><span>I have the original invoice</span></label>
              <label class="check"><input type="checkbox" name="box" checked><span>Original box included</span></label>
            </div>
          </section>

          <section class="panel">
            <h2>Photo</h2>
            <label class="drop" id="drop">
              <input type="file" accept="image/*" data-photo hidden>
              <span class="drop-in">${icon('camera', 22)}<strong>Add a photo of the actual item</strong><em>Plain background, good light. No stock images.</em></span>
            </label>
          </section>

          <section class="panel">
            <h2>Proof and handover</h2>
            <div class="fgrid">
              <label class="span2">Serial number<input name="serial" required class="mono" placeholder="As printed on the unit"></label>
              <label class="span2">Your city<input name="city" required value="${esc(me.city || '')}"></label>
            </div>
            <p class="muted small">The serial is never shown to buyers in full. Our technician matches it against the unit, and it must match your invoice.</p>
            <h2>How should we inspect it?</h2>
            <div class="paylist">
              <label class="payopt"><input type="radio" name="handover" value="ship" data-calc="list" checked><span><strong>Send it to our hub<b class="opt-price">Free</b></strong><em>When it sells, pack it and courier it to our Bengaluru hub within ${F.handoverDays} days. The buyer pays shipping.</em></span></label>
              <label class="payopt"><input type="radio" name="handover" value="onsite" data-calc="list"><span><strong>Our agent visits you<b class="opt-price">${inr(F.visitFee)}</b></strong><em>We inspect it in front of you, seal it and collect it. Nothing to pack or post. Deducted from your payout.</em></span></label>
            </div>
          </section>
        </div>

        <aside class="panel co-sum">
          <h2>Price</h2>
          <label>Asking price<div class="inp-pre"><span>₹</span><input name="price" type="number" required min="${F.minPrice}" step="100" inputmode="numeric" data-calc="list"></div></label>
          <label>Price when new <span class="muted">(optional)</span><div class="inp-pre"><span>₹</span><input name="newPrice" type="number" min="0" step="100" inputmode="numeric"></div></label>
          <dl class="sum">
            <div><dt>sell.io fee</dt><dd id="l-fee">–</dd></div>
            <div><dt>On-site visit</dt><dd id="l-visit">None</dd></div>
            <div><dt>Buyer pays shipping</dt><dd id="l-ship">${inr(PK.shipFor('gpu'))}</dd></div>
            <div class="sum-total"><dt>You receive</dt><dd id="l-net">–</dd></div>
          </dl>
          <div class="form-err" hidden></div>
          <button class="btn btn-lg btn-block">Submit for review</button>
          <p class="muted small center">We review new listings within a working day. Minimum price ${inr(F.minPrice)}.</p>
        </aside>
      </form>
    </div>`;
  };
})();
