/* sell.io prototype — formatting helpers and shared components. */
(function () {
  const db = PK.db;

  PK.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = PK.esc;
  PK.inr = (n) => '₹' + new Intl.NumberFormat('en-IN').format(Math.round(n));
  PK.date = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  PK.dateTime = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  PK.age = (m) => m < 12 ? m + (m === 1 ? ' month' : ' months') : (m % 12 === 0 ? m / 12 + (m === 12 ? ' year' : ' years') : Math.floor(m / 12) + ' yr ' + (m % 12) + ' mo');
  PK.initials = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  PK.firstName = (name) => name.split(' ')[0];

  const paths = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    shield: '<path d="M12 3l7 3v5.5c0 4.4-2.9 8.3-7 9.5-4.1-1.200-7-5.100-7-9.500V6l7-3z"/><path d="M9 12l2.200 2.200L15 10.200"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7.500" cy="17" r="1.800"/><circle cx="17.500" cy="17" r="1.800"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.500-4.500"/>',
    clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
    bench: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6M3 20h18"/>',
    doc: '<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    camera: '<path d="M4 8h3l1.500-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.200"/>'
  };
  PK.icon = (name, size) => `<svg class="ic" width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
  const icon = PK.icon;

  PK.toast = (msg) => {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(PK._toastT); PK._toastT = setTimeout(() => t.classList.remove('on'), 3200);
  };

  PK.badge = (status) => {
    const s = PK.STATUS[status] || { label: status, tone: 'muted' };
    return `<span class="badge t-${s.tone}">${esc(s.label)}</span>`;
  };

  PK.verifiedTag = (l) => l.mode === 'hub'
    ? `<span class="tag tag-green">${icon('check', 13)} Inspected, at our hub</span>`
    : (l.handover === 'onsite'
      ? `<span class="tag">On-site inspection</span>`
      : `<span class="tag">Inspected on order</span>`);

  PK.thumb = (l, cls) => l.img
    ? `<img class="${cls || ''}" src="${esc(l.img)}" alt="${esc(l.title)}" loading="lazy">`
    : `<div class="noimg ${cls || ''}">${icon('camera', 20)}<span>No photo yet</span></div>`;

  PK.listingCard = (l) => {
    const seller = db.user(l.sellerId);
    const off = l.newPrice > l.price ? Math.round((1 - l.price / l.newPrice) * 100) : 0;
    return `<a class="card" href="#/item/${l.id}">
      <div class="card-img">${PK.thumb(l)}${l.mode === 'hub' ? `<span class="card-flag">${icon('check', 12)} Inspected</span>` : ''}</div>
      <div class="card-body">
        <div class="card-meta"><span>${esc(PK.CATEGORIES[l.category].label)}</span><span>${esc(PK.CONDITIONS[l.condition].label)}</span></div>
        <h3>${esc(l.title)}</h3>
        <div class="card-foot">
          <div class="price">${PK.inr(l.price)}${off ? `<small>${off}% under new</small>` : ''}</div>
          <div class="card-seller">${esc(PK.firstName(seller.name))}, ${esc(l.city)}</div>
        </div>
      </div>
    </a>`;
  };

  /* The inspection report. This is the document a buyer is really paying for. */
  PK.reportCard = (r, l, opts) => {
    opts = opts || {};
    const passed = r.checks.filter((c) => c.result === 'pass').length;
    const failed = r.checks.filter((c) => c.result === 'fail').length;
    return `<section class="report ${r.failed ? 'is-failed' : ''}">
      <header class="report-head">
        <div>
          <div class="eyebrow">Inspection report</div>
          <div class="report-id mono">${esc(r.id)}</div>
          <div class="report-tier">${esc((PK.TIERS[r.tier] || PK.TIERS.full).label)}</div>
        </div>
        <div class="report-verdict">${r.failed
          ? `<span class="stamp stamp-red">Did not pass</span>`
          : `<span class="stamp">${icon('check', 14)} Passed</span>`}</div>
      </header>
      <dl class="report-grid">
        <div><dt>Item</dt><dd>${esc(l.title)}</dd></div>
        <div><dt>Inspected</dt><dd>${PK.dateTime(r.at)}</dd></div>
        <div><dt>Technician</dt><dd>${esc(r.agent)}</dd></div>
        <div><dt>Graded</dt><dd>${esc((PK.CONDITIONS[r.grade] || {}).label || r.grade)}</dd></div>
        <div><dt>Serial on unit</dt><dd class="mono">${esc(opts.maskSerial ? maskSerial(r.serial) : r.serial)}</dd></div>
        <div><dt>Tamper seal</dt><dd class="mono">${esc(r.seal || 'Not sealed')}</dd></div>
      </dl>
      <ul class="report-checks">
        ${r.checks.map((c) => `<li class="r-${c.result}">
          <span class="r-mark">${c.result === 'pass' ? icon('check', 14) : c.result === 'fail' ? icon('x', 14) : '–'}</span>
          <span>${esc(c.label)}</span>
          <span class="r-res">${c.result === 'pass' ? 'Pass' : c.result === 'fail' ? 'Fail' : 'N/A'}</span>
        </li>`).join('')}
      </ul>
      ${r.notes ? `<div class="report-notes"><div class="eyebrow">Technician's notes</div><p>${esc(r.notes)}</p></div>` : ''}
      <footer class="report-foot">${passed} of ${r.checks.length} checks passed${failed ? `, ${failed} failed` : ''}. Intake and packing are recorded on video and kept for 90 days.</footer>
    </section>`;
  };
  function maskSerial(s) { s = String(s || ''); return s.length > 4 ? '•'.repeat(s.length - 4) + s.slice(-4) : s; }
  PK.maskSerial = maskSerial;

  /* ---------- chrome ---------- */
  PK.header = (route) => {
    const me = db.me();
    const dark = route.parts.length === 0;
    const at = (p) => route.parts[0] === p ? 'class="on"' : '';
    let right;
    if (!me) right = `<a href="#/login" class="link">Sign in</a><a href="#/login?mode=join" class="btn btn-sm ${dark ? 'btn-light' : ''}">Create account</a>`;
    else if (me.role === 'ops') right = `<a href="#/ops" class="link">Bench console</a>${who(me)}`;
    else right = `<a href="#/orders" class="link">Orders</a><a href="#/selling" class="link">Selling</a>${who(me)}`;
    return `<header class="hdr ${dark ? 'hdr-dark' : ''}">
      <div class="wrap hdr-in">
        <a class="logo" href="#/" aria-label="sell.io home"><span class="logo-mark"></span>sell.io</a>
        <nav class="nav">
          <a href="#/browse" ${at('browse')}>Browse</a>
          <a href="#/protection" ${at('protection')}>How it works</a>
          <a href="#/sell" ${at('sell')}>Sell</a>
        </nav>
        <div class="hdr-r">${right}</div>
      </div>
    </header>`;
  };
  function who(me) {
    return `<span class="who"><span class="avatar">${esc(PK.initials(me.name))}</span><button class="link" data-act="signout">Sign out</button></span>`;
  }

  /* Demo partners: official logos (Wikimedia Commons and company sites), shown for the prototype only; no partnership is implied. */
  PK.PARTNERS = [
    { id: 'razorpay', name: 'Razorpay', role: 'Escrow and payments', img: 'razorpay.svg' },
    { id: 'phonepe', name: 'PhonePe', role: 'UPI payments', img: 'phonepe.svg' },
    { id: 'cashfree', name: 'Cashfree Payments', role: 'Seller payouts', img: 'cashfree.svg' },
    { id: 'delhivery', name: 'Delhivery', role: 'Surface shipping', img: 'delhivery.png' },
    { id: 'bluedart', name: 'Blue Dart', role: 'Express air', img: 'bluedart.svg' },
    { id: 'shiprocket', name: 'Shiprocket', role: 'Pickups and tracking', img: 'shiprocket.png' },
    { id: 'dhl', name: 'DHL', role: 'Express courier', img: 'dhl.svg' },
    { id: 'digit', name: 'Digit Insurance', role: 'Transit insurance', img: 'digit.svg' },
    { id: 'hyperverge', name: 'HyperVerge', role: 'Seller KYC', img: 'hyperverge.webp' }
  ];
  PK.partnerMark = (p) => `<img class="pw pw-${p.id}" src="assets/img/partners/${p.img}" alt="${esc(p.name)}" loading="lazy" decoding="async">`;

  PK.footer = () => `<footer class="ftr">
    <div class="wrap ftr-in">
      <div class="ftr-brand">
        <a class="logo" href="#/"><span class="logo-mark"></span>sell.io</a>
        <p>Used PC hardware, inspected by hand before it ships.</p>
      </div>
      <div><h2>Marketplace</h2><a href="#/browse">Browse listings</a><a href="#/browse?vault=1">Already inspected</a><a href="#/sell">Sell hardware</a></div>
      <div><h2>Protection</h2><a href="#/protection">How a deal works</a><a href="#/protection#checks">What we check</a><a href="#/protection#fees">Fees</a></div>
      <div><h2>Account</h2><a href="#/orders">Your orders</a><a href="#/selling">Seller dashboard</a><a href="#/login">Sign in</a></div>
    </div>
    <div class="wrap ftr-partners"><span class="eyebrow">Partners</span>${PK.PARTNERS.map(PK.partnerMark).join('')}</div>
    <div class="wrap ftr-note">Prototype build. Listings, people and payments on this site are sample data; no money moves. Partner names and logos are shown for demonstration only and do not imply an actual partnership.</div>
  </footer>`;

  /* Demo control so one person can walk the whole deal from all three sides. */
  PK.demoBar = () => {
    const me = db.me();
    const opt = (id, label) => `<option value="${id}" ${me && me.id === id ? 'selected' : ''}>${label}</option>`;
    const known = ['u_arjun', 'u_rhea', 'u_ops'];
    return `<div class="demo">
      <span class="demo-l">Prototype</span>
      <label>View as
        <select data-demo-switch>
          <option value="" ${!me ? 'selected' : ''}>Signed out</option>
          ${opt('u_arjun', 'Arjun (buyer)')}
          ${opt('u_rhea', 'Rhea (seller)')}
          ${opt('u_ops', 'Nikhil (bench agent)')}
          ${me && !known.includes(me.id) ? opt(me.id, esc(PK.firstName(me.name)) + ' (you)') : ''}
        </select>
      </label>
      <button data-act="reset" title="Restore the sample data">Reset</button>
    </div>`;
  };

  PK.notFound = (msg) => `<div class="wrap page"><div class="empty"><h2>${esc(msg || 'Page not found')}</h2><p><a class="ulink" href="#/browse">Browse listings</a></p></div></div>`;
})();
