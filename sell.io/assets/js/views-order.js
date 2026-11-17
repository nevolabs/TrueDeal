/* sell.io prototype — the order page. One page, three audiences: buyer, seller, bench agent. */
(function () {
  const { esc, inr, icon, db } = PK;
  const F = PK.FEES;
  const H = 36e5;

  function timeline(o) {
    const at = {}; const notes = {};
    o.timeline.forEach((t) => { at[t.status] = t.at; if (t.note) notes[t.status] = t.note; });
    const idx = PK.STEPS.findIndex((s) => s.key === o.status);
    const off = ['refunded', 'cancelled', 'disputed'].includes(o.status);
    let html = PK.STEPS.map((s, i) => {
      const done = at[s.key] != null || (o.fromStock && i < 3);
      const current = !off && i === idx && o.status !== 'completed';
      if (off && !done) return '';
      return `<li class="${done ? 'done' : ''} ${current ? 'now' : ''}">
        <span class="tl-dot">${done ? icon('check', 12) : ''}</span>
        <div><strong>${o.handover === 'onsite' && s.onsite ? s.onsite : s.title}</strong>
          ${at[s.key] ? `<span class="muted small">${PK.dateTime(at[s.key])}</span>` : (o.fromStock && i > 0 && i < 3 ? `<span class="muted small">Done before listing</span>` : '')}
          ${notes[s.key] ? `<p>${esc(notes[s.key])}</p>` : ''}
        </div></li>`;
    }).join('');
    if (off) {
      const last = o.timeline[o.timeline.length - 1];
      html += `<li class="done now off"><span class="tl-dot"></span><div><strong>${esc(PK.STATUS[o.status].label)}</strong><span class="muted small">${PK.dateTime(last.at)}</span>${last.note ? `<p>${esc(last.note)}</p>` : ''}</div></li>`;
    }
    return `<ol class="tl">${html}</ol>`;
  }

  function hoursLeft(o) {
    const ms = (o.windowEnds || 0) - Date.now();
    if (ms <= 0) return 'The inspection window has closed.';
    const h = Math.floor(ms / H), m = Math.floor((ms % H) / 6e4);
    return `Inspection window closes in ${h} h ${m} min.`;
  }

  /* ---------- action panels ---------- */
  function buyerPanel(o, l, seller) {
    const s = PK.firstName(seller.name);
    const by = PK.date(o.createdAt + F.handoverDays * 24 * H);
    switch (o.status) {
      case 'paid': return box('Your payment is safe in escrow.', `${s} has until ${by} to hand the item to us. If that does not happen, you are refunded automatically.`,
        `<button class="btn btn-quiet btn-block" data-act="cancel-order" data-id="${o.id}">Cancel and refund</button>`);
      case 'in_transit': return o.handover === 'onsite'
        ? box('Inspection visit booked.', `Our agent is visiting ${s} to inspect the item in person.`)
        : box('On its way to our bench.', `${s} has handed the item over. We will inspect it as soon as it reaches the hub.`);
      case 'at_hub': return o.handover === 'onsite'
        ? box('Our agent is with the item now.', 'They are working through the checklist at the seller\'s address. You will get the report as soon as they sign it off.')
        : box('On the bench now.', 'Our technician is working through the checklist. Most inspections finish within one working day.');
      case 'verified': return box('Passed inspection.', 'The full report is below. We are packing and sealing it for dispatch.');
      case 'shipped': return box('On its way to you.', `${esc(o.tracking.courier)}, AWB <span class="mono">${esc(o.tracking.awb)}</span>. Check that the seal on the parcel reads <span class="mono">${esc(o.report.seal)}</span> and film the unboxing.`,
        `<button class="btn btn-block" data-act="mark-delivered" data-id="${o.id}">I have received the parcel</button>`);
      case 'delivered': return box('Check it over.', `${hoursLeft(o)} Compare the item with its report. The seller is paid only when you confirm, or when the window closes.`,
        `<button class="btn btn-block" data-act="release" data-id="${o.id}">All good, release payment</button>
         <details class="dispute"><summary>Something is wrong</summary>
           <form data-form="dispute" novalidate>
             <input type="hidden" name="id" value="${o.id}">
             <label>What happened?<select name="reason">${PK.DISPUTE_REASONS.map((r) => `<option>${r}</option>`).join('')}</select></label>
             <label>Details<textarea name="detail" rows="3" required placeholder="What you found, and when."></textarea></label>
             <div class="form-err" hidden></div>
             <button class="btn btn-quiet btn-block">Freeze payout and open a claim</button>
           </form>
         </details>`);
      case 'completed': return box('Deal complete.', 'Payment has been released to the seller.');
      case 'disputed': return box('We are reviewing your claim.', 'The seller\'s payout is frozen. A member of our team will contact you within one working day and may ask for your unboxing video.');
      case 'refunded': return box('Refunded.', `${inr(o.total)} has been returned to your original payment method (${esc(o.payMethod)}).`);
      case 'cancelled': return box('Order cancelled.', `${inr(o.total)} has been returned to your original payment method.`);
    }
    return '';
  }

  function sellerPanel(o, l, seller) {
    const by = PK.date(o.createdAt + F.handoverDays * 24 * H);
    const payoutTo = seller.kyc && seller.kyc.bank ? `${esc(seller.kyc.bank)} account ending ${esc(seller.kyc.acct)}` : 'your bank account';
    switch (o.status) {
      case 'paid': return box('A buyer has paid. Hand it over by ' + by + '.',
        o.handover === 'onsite'
          ? `Book a time for our agent to visit. They inspect it in front of you, seal it and take it away. Ask them for the code below before you hand anything over.`
          : `Pack it well and send it to the sell.io hub in Bengaluru. Write this code on the outside of the parcel.`,
        `<div class="codebox"><span>Handover code</span><strong class="mono">${esc(o.handoverCode)}</strong></div>
         ${o.handover !== 'onsite' ? `<p class="muted small">sell.io Hub, 2nd Floor, 80 Feet Road, Indiranagar, Bengaluru 560038</p>` : `<p class="muted small">On-site visit: ${inr(o.visitFee)}, deducted from your payout.</p>`}
         <button class="btn btn-block" data-act="handover" data-id="${o.id}">${o.handover === 'onsite' ? 'Book the visit' : 'I have dispatched it'}</button>`);
      case 'in_transit': return o.handover === 'onsite'
        ? box('Visit booked.', 'Our agent will arrive at the agreed time and give you the code. Keep the item, its box and the invoice ready.')
        : box('Handed over.', 'We will confirm as soon as it reaches the bench.');
      case 'at_hub': return box('Being inspected.', 'If it matches your listing, it ships to the buyer straight away.');
      case 'verified': return box('It passed inspection.', 'We are shipping it to the buyer.');
      case 'shipped': return box('On its way to the buyer.', `Your payout of ${inr(o.payout)} is released ${F.inspectionHours} hours after delivery.`);
      case 'delivered': return box('Delivered.', `The buyer has ${F.inspectionHours} hours to check it. ${inr(o.payout)} is then paid to your ${payoutTo}.`);
      case 'completed': return box('Paid out.', `${inr(o.payout)} sent to your ${payoutTo}.`);
      case 'disputed': return box('The buyer has raised a problem.', 'Your payout is on hold while we review the claim against our inspection report and videos.');
      case 'refunded': return box('This sale did not complete.', o.report && o.report.failed ? (o.handover === 'onsite' ? `The item did not pass inspection, so it stays with you; see the report for why. The ${inr(o.visitFee)} visit fee is still due.` : 'The item did not pass inspection. We will return it to you; see the report for why.') : 'The buyer was refunded. The item will be returned to you.');
      case 'cancelled': return box('The buyer cancelled.', 'Your listing is live again.');
    }
    return '';
  }

  function opsPanel(o, l) {
    switch (o.status) {
      case 'paid': return box('Waiting for the seller.', `Handover code <span class="mono">${esc(o.handoverCode)}</span>. Nothing to do until the parcel arrives.`);
      case 'in_transit': return o.handover === 'onsite'
        ? box('Site visit booked.', `Go to the seller in ${esc(db.user(o.sellerId).city)}. Give them the code <span class="mono">${esc(o.handoverCode)}</span> on arrival and start the intake video before touching the item.`,
          `<button class="btn btn-block" data-act="receive" data-id="${o.id}">Agent is on site</button>`)
        : box('Parcel expected.', `Match the handover code <span class="mono">${esc(o.handoverCode)}</span> on the parcel, weigh it and record the intake video.`,
          `<button class="btn btn-block" data-act="receive" data-id="${o.id}">Mark received at hub</button>`);
      case 'at_hub': return box('Ready for inspection.', 'Work through the checklist on the left. Every line needs a result.');
      case 'verified': return box('Passed. Pack and dispatch.', `Apply seal <span class="mono">${esc(o.report.seal)}</span>, record the packing video, then hand to the courier.`,
        `<form data-form="dispatch" novalidate><input type="hidden" name="id" value="${o.id}">
           <label>Courier<select name="courier">${PK.COURIERS.map((c) => `<option>${c}</option>`).join('')}</select></label>
           <button class="btn btn-block">Mark dispatched</button></form>`);
      case 'shipped': return box('In transit to the buyer.', `${esc(o.tracking.courier)}, AWB <span class="mono">${esc(o.tracking.awb)}</span>.`,
        `<button class="btn btn-quiet btn-block" data-act="mark-delivered" data-id="${o.id}">Courier confirms delivery</button>`);
      case 'delivered': return box('Inspection window running.', hoursLeft(o),
        `<button class="btn btn-quiet btn-block" data-act="release-ops" data-id="${o.id}">Window elapsed, release payout</button>`);
      case 'disputed': return box('Claim to resolve.', 'Compare the buyer\'s evidence with the report, intake video and packing video.',
        `<button class="btn btn-block" data-act="refund" data-id="${o.id}">Uphold claim, refund buyer</button>
         <button class="btn btn-quiet btn-block" data-act="release-ops" data-id="${o.id}">Reject claim, release payout</button>`);
      case 'completed': return box('Closed.', `Payout of ${inr(o.payout)} released. Fee earned: ${inr(o.fee)}.`);
      default: return box(PK.STATUS[o.status].label + '.', 'No further action.');
    }
  }

  function box(title, body, actions) {
    return `<div class="actbox"><h2>${title}</h2><p>${body}</p>${actions || ''}</div>`;
  }

  function inspectForm(o, l) {
    const checks = PK.checklistFor(l.category, o.tier);
    return `<form class="panel inspect" data-form="inspect" novalidate>
      <input type="hidden" name="id" value="${o.id}">
      <div class="inspect-head">
        <div><h2>${esc(l.title)}</h2><p class="muted small">${esc((PK.TIERS[o.tier] || PK.TIERS.full).label)}, chosen by the buyer</p></div>
        <button type="button" class="link" data-act="all-pass">Mark all as pass</button>
      </div>
      <div class="claimed">
        <div><span>Listed serial</span><strong class="mono">${esc(l.serial)}</strong></div>
        <div><span>Listed condition</span><strong>${esc(PK.CONDITIONS[l.condition].label)}</strong></div>
        <div><span>Warranty claimed</span><strong>${esc(l.warranty)}</strong></div>
        <div><span>Invoice / box</span><strong>${l.invoice ? 'Yes' : 'No'} / ${l.box ? 'Yes' : 'No'}</strong></div>
      </div>
      <ul class="ilist">
        ${checks.map((c, i) => `<li><span>${esc(c)}</span>
          <span class="seg">
            <label><input type="radio" name="c${i}" value="pass"><span>Pass</span></label>
            <label><input type="radio" name="c${i}" value="fail"><span>Fail</span></label>
            <label><input type="radio" name="c${i}" value="na"><span>N/A</span></label>
          </span></li>`).join('')}
      </ul>
      <div class="fgrid">
        <label>Serial read from the unit<input name="serial" required class="mono" placeholder="Type it, do not paste from the listing"></label>
        <label>Grade you would give it<select name="grade">${Object.keys(PK.CONDITIONS).map((k) => `<option value="${k}" ${k === l.condition ? 'selected' : ''}>${PK.CONDITIONS[k].label}</option>`).join('')}</select></label>
        <label class="span2">Notes for the buyer<textarea name="notes" rows="3" required placeholder="Temperatures under load, battery health, any marks or wear you found"></textarea></label>
      </div>
      <div class="form-err" hidden></div>
      <div class="inspect-actions">
        <button class="btn btn-lg" name="outcome" value="pass">Pass and issue report</button>
        <button class="btn btn-lg btn-danger" name="outcome" value="fail">Fail and refund buyer</button>
      </div>
    </form>`;
  }

  /* ---------- page ---------- */
  PK.views.order = (route) => {
    const me = db.me(), o = db.order(route.parts[1]);
    if (!o) return PK.notFound('We could not find that order.');
    const role = me.role === 'ops' ? 'ops' : me.id === o.buyerId ? 'buyer' : me.id === o.sellerId ? 'seller' : null;
    if (!role) return PK.notFound('We could not find that order.');
    const l = db.listing(o.listingId), buyer = db.user(o.buyerId), seller = db.user(o.sellerId);
    const flash = PK._flash; PK._flash = null;

    const money = role === 'seller'
      ? `<dl class="sum">
          <div><dt>Sale price</dt><dd>${inr(o.price)}</dd></div>
          <div><dt>sell.io fee</dt><dd>− ${inr(o.fee)}</dd></div>
          ${o.visitFee ? `<div><dt>On-site visit</dt><dd>− ${inr(o.visitFee)}</dd></div>` : ''}
          <div class="sum-total"><dt>Your payout</dt><dd>${inr(o.payout)}</dd></div></dl>`
      : `<dl class="sum">
          <div><dt>Item</dt><dd>${inr(o.price)}</dd></div>
          <div><dt>Insured shipping</dt><dd>${inr(o.shipping)}</dd></div>
          ${o.inspectionFee ? `<div><dt>Full bench test</dt><dd>${inr(o.inspectionFee)}</dd></div>` : ''}
          <div class="sum-total"><dt>${role === 'ops' ? 'Collected' : 'You paid'}</dt><dd>${inr(o.total)}</dd></div>
          ${role === 'ops' ? `<div><dt>Seller payout</dt><dd>${inr(o.payout)}</dd></div><div><dt>Fee</dt><dd>${inr(o.fee)}</dd></div>${o.visitFee ? `<div><dt>Visit fee</dt><dd>${inr(o.visitFee)}</dd></div>` : ''}` : ''}</dl>`;

    const escrow = ['refunded', 'cancelled'].includes(o.status) ? ['Returned to the buyer', 'muted']
      : o.status === 'completed' ? ['Released to the seller', 'ink']
      : o.status === 'disputed' ? ['Frozen in escrow', 'red'] : ['Held in escrow', 'green'];

    const back = role === 'ops' ? ['#/ops', 'Bench console'] : role === 'seller' ? ['#/selling', 'Selling'] : ['#/orders', 'Your orders'];
    const panel = role === 'ops' ? opsPanel(o, l) : role === 'seller' ? sellerPanel(o, l, seller) : buyerPanel(o, l, seller);

    return `<div class="wrap page">
      <nav class="crumbs"><a href="${back[0]}">${back[1]}</a></nav>
      ${flash ? `<div class="banner banner-green">${icon('check', 18)}<div><strong>${esc(flash)}</strong></div></div>` : ''}
      <div class="page-head row">
        <div><h1>Order <span class="mono">${o.id}</span></h1><p>Placed ${PK.dateTime(o.createdAt)}</p></div>
        ${PK.badge(o.status)}
      </div>
      <div class="order">
        <div class="order-main">
          ${role === 'ops' && o.status === 'at_hub' ? inspectForm(o, l) : ''}
          <section class="panel"><h2>Progress</h2>${timeline(o)}</section>
          ${o.dispute ? `<section class="panel"><h2>Buyer's claim</h2><p><strong>${esc(o.dispute.reason)}</strong></p><p>${esc(o.dispute.detail)}</p><p class="muted small">Raised ${PK.dateTime(o.dispute.at)}</p></section>` : ''}
          ${o.report ? PK.reportCard(o.report, l, { maskSerial: role !== 'ops' }) : ''}
        </div>
        <aside class="order-side">
          ${panel}
          <div class="panel">
            <a class="co-item" href="#/item/${l.id}">
              <div class="orow-img">${PK.thumb(l)}</div>
              <div><strong>${esc(l.title)}</strong><div class="muted small">${esc(PK.CONDITIONS[l.condition].label)}</div></div>
            </a>
            ${money}
            <div class="escrow"><span class="dot t-${escrow[1]}"></span>${escrow[0]}</div>
          </div>
          ${role !== 'seller' ? `<div class="panel"><h3>Deliver to</h3><p class="addr">${esc(o.address.name)}<br>${esc(o.address.line)}<br>${esc(o.address.city)} ${esc(o.address.pin)}${role === 'ops' ? `<br>${esc(o.address.phone)}` : ''}</p></div>` : ''}
          ${role === 'ops' ? `<div class="panel"><h3>Parties</h3><p class="addr">Buyer: ${esc(buyer.name)}, ${esc(buyer.city)}<br>Seller: ${esc(seller.name)}, ${esc(seller.city)}</p></div>` : ''}
        </aside>
      </div>
    </div>`;
  };
})();
