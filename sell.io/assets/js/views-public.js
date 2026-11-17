/* sell.io prototype — public pages: home, browse, item, how it works, sell, sign in. */
(function () {
  const { esc, inr, icon, db } = PK;
  PK.views = PK.views || {};
  const F = PK.FEES;
  const li = (arr) => arr.map((c) => `<li>${icon('check', 15)}<span>${esc(c)}</span></li>`).join('');

  const steps = [
    ['You pay into escrow', 'Your money is held by our payment partner. The seller can see that you have paid, but cannot withdraw it yet.'],
    ['The seller hands it over', 'They courier it to our hub in Bengaluru within three days. If they prefer, our agent visits them to inspect and collect it.'],
    ['We inspect it', 'Every item gets a look-and-feel check by hand. You can add a full bench test at checkout. You see the report before the item ships.'],
    ['You check it, then the seller is paid', 'It ships sealed and insured. You have 48 hours to check it. If you raise nothing in that time, the payment is released.']
  ];
  const stepList = (cls, tag) => steps.map((s, i) => `<li><span class="step-n">${i + 1}</span><div><${tag}>${s[0]}</${tag}><p>${s[1]}</p></div></li>`).join('');

  /* ---------- home ---------- */
  PK.views.home = () => {
    const live = db.live();
    const featured = live.slice().sort((a, b) => (b.mode === 'hub') - (a.mode === 'hub') || b.price - a.price).slice(0, 8);
    const sample = db.listing('l_gpu');
    return `
    <section class="hero">
      <div class="wrap hero-in">
        <div class="hero-copy">
          <h1>Used PC hardware, inspected by hand before it ships.</h1>
          <p>Your payment waits in escrow while a sell.io technician checks the item against its listing. The seller is paid only after you have had it for 48 hours.</p>
          <div class="hero-cta">
            <a class="btn btn-light btn-lg" href="#/browse">Browse listings ${icon('arrow', 16)}</a>
            <a class="btn btn-ghost-light btn-lg" href="#/sell">Sell your hardware</a>
          </div>
        </div>
        <div class="hero-art"><img src="assets/img/gpu.jpg" alt="Two graphics cards on a dark surface"></div>
      </div>
      <div class="wrap">
        <ul class="hero-facts">
          <li>${icon('lock', 16)}Payment held in escrow</li>
          <li>${icon('check', 16)}Every item inspected by hand</li>
          <li>${icon('truck', 16)}Sealed and insured in transit</li>
          <li>${icon('clock', 16)}48 hours to check it yourself</li>
        </ul>
      </div>
    </section>

    <section class="wrap partners" aria-labelledby="partners-h">
      <div class="partners-head">
        <h2 id="partners-h" class="eyebrow">In partnership with</h2>
        <p>Your money, the parcel and the seller's identity are each handled by a specialist.</p>
      </div>
      <ul class="partners-grid">
        ${PK.PARTNERS.map((p) => `<li>${PK.partnerMark(p)}<span class="partners-role">${esc(p.role)}</span></li>`).join('')}
      </ul>
    </section>

    <section class="wrap sec">
      <div class="sec-head">
        <h2>Recently listed</h2>
        <a class="ulink" href="#/browse">All ${live.length} listings</a>
      </div>
      <div class="grid">${featured.map(PK.listingCard).join('')}</div>
    </section>

    <section class="sec sec-tint">
      <div class="wrap">
        <div class="sec-head"><h2>How a deal works</h2><a class="ulink" href="#/protection">Fees and the full process</a></div>
        <ol class="steps">${stepList('steps', 'h3')}</ol>
      </div>
    </section>

    <section class="wrap sec split">
      <div class="split-copy">
        <h2>Every order comes with an inspection report</h2>
        <p>This is the report for the RTX 2080 Ti listed above. The technician records the serial number, the result of each check and anything they noticed, including scratches and wear.</p>
        <p>You see the report before the item ships. If the item does not match its listing, the order is cancelled and you get all your money back.</p>
        <a class="btn" href="#/protection#checks">What we check ${icon('arrow', 16)}</a>
      </div>
      <div class="split-art">${sample && sample.report ? PK.reportCard(sample.report, sample, { maskSerial: true }) : ''}</div>
    </section>

    <section class="sec sec-dark">
      <div class="wrap fees-row">
        <div>
          <h2>What it costs</h2>
          <p class="fees-note">No subscription and no listing fee. Sellers pay only when something sells.</p>
        </div>
        <dl class="fees">
          <div><dt>Buyers</dt><dd>Listed price and insured shipping, with a look-and-feel check included.</dd></div>
          <div><dt>Full bench test</dt><dd>Optional, chosen at checkout. From ${inr(PK.benchFor('mouse'))} for a mouse to ${inr(PK.benchFor('desktop'))} for a desktop build.</dd></div>
          <div><dt>Sellers</dt><dd>${F.commissionRate * 100}% of the sale price (minimum ${inr(F.commissionMin)}), charged only when the deal completes.</dd></div>
          <div><dt>If it fails inspection</dt><dd>The buyer is refunded in full. The item goes back to the seller.</dd></div>
        </dl>
      </div>
    </section>

    <section class="wrap sec cta-row">
      <div>
        <h2>Selling a graphics card, laptop or camera?</h2>
        <p>The buyer pays into escrow before you hand anything over, and you are paid once they have had the item for 48 hours.</p>
      </div>
      <a class="btn btn-lg" href="#/sell">Start selling ${icon('arrow', 16)}</a>
    </section>`;
  };

  /* ---------- browse ---------- */
  PK.browse = { q: '', cat: '', cond: [], vault: false, sort: 'new' };

  function results() {
    const s = PK.browse;
    let list = db.live().filter((l) =>
      (!s.cat || l.category === s.cat) &&
      (!s.vault || l.mode === 'hub') &&
      (!s.cond.length || s.cond.includes(l.condition)) &&
      (!s.q || (l.title + ' ' + l.brand).toLowerCase().includes(s.q.toLowerCase())));
    const sorts = { new: (a, b) => b.createdAt - a.createdAt, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price };
    return list.sort(sorts[s.sort] || sorts.new);
  }
  PK.browse.renderResults = () => {
    const list = results();
    const el = document.getElementById('results');
    if (!el) return;
    document.getElementById('result-count').textContent = list.length + (list.length === 1 ? ' listing' : ' listings');
    el.innerHTML = list.length ? list.map(PK.listingCard).join('')
      : `<div class="empty"><h3>Nothing matches those filters.</h3><p>Stock is small while we onboard sellers. <a class="ulink" href="#/browse" data-act="clear-filters">Clear filters</a></p></div>`;
  };

  PK.views.browse = (route) => {
    const s = PK.browse;
    if (route.q.has('cat')) s.cat = route.q.get('cat');
    if (route.q.has('vault')) s.vault = route.q.get('vault') === '1';
    const counts = {};
    db.live().forEach((l) => { counts[l.category] = (counts[l.category] || 0) + 1; });
    const cats = Object.keys(PK.CATEGORIES).filter((k) => counts[k]);
    return `<div class="wrap page">
      <div class="page-head">
        <h1>Browse</h1>
        <p>Every listing here comes from a seller whose identity and bank account we have verified.</p>
      </div>
      <div class="browse">
        <aside class="filters">
          <label class="search">${icon('search', 16)}<input type="search" placeholder="Search model or brand" value="${esc(s.q)}" data-filter="q" aria-label="Search listings"></label>
          <div class="f-group">
            <h2 class="f-h">Category</h2>
            <label class="radio"><input type="radio" name="cat" value="" data-filter="cat" ${!s.cat ? 'checked' : ''}><span>Everything</span><em>${db.live().length}</em></label>
            ${cats.map((k) => `<label class="radio"><input type="radio" name="cat" value="${k}" data-filter="cat" ${s.cat === k ? 'checked' : ''}><span>${PK.CATEGORIES[k].label}</span><em>${counts[k]}</em></label>`).join('')}
          </div>
          <div class="f-group">
            <h2 class="f-h">Condition</h2>
            ${Object.keys(PK.CONDITIONS).map((k) => `<label class="radio"><input type="checkbox" value="${k}" data-filter="cond" ${s.cond.includes(k) ? 'checked' : ''}><span>${PK.CONDITIONS[k].label}</span></label>`).join('')}
          </div>
          <div class="f-group">
            <h2 class="f-h">Availability</h2>
            <label class="radio"><input type="checkbox" data-filter="vault" ${s.vault ? 'checked' : ''}><span>Already inspected and at our hub</span></label>
          </div>
        </aside>
        <div>
          <div class="results-bar">
            <span id="result-count" class="muted"></span>
            <label class="sort">Sort
              <select data-filter="sort">
                <option value="new" ${s.sort === 'new' ? 'selected' : ''}>Newest</option>
                <option value="low" ${s.sort === 'low' ? 'selected' : ''}>Price, low to high</option>
                <option value="high" ${s.sort === 'high' ? 'selected' : ''}>Price, high to low</option>
              </select>
            </label>
          </div>
          <div class="grid grid-3" id="results"></div>
        </div>
      </div>
    </div>`;
  };
  PK.mounts = PK.mounts || {};
  PK.mounts.browse = () => PK.browse.renderResults();

  /* ---------- item ---------- */
  PK.views.item = (route) => {
    const l = db.listing(route.parts[1]);
    const me = db.me();
    if (!l) return PK.notFound('That listing does not exist.');
    const mine = me && me.id === l.sellerId;
    if (!['live', 'reserved', 'sold'].includes(l.status) && !mine && !(me && me.role === 'ops')) return PK.notFound('That listing is not available.');
    const seller = db.user(l.sellerId);
    const ship = PK.shipFor(l.category);
    const cond = PK.CONDITIONS[l.condition];
    const specs = [['Brand', l.brand], ['Age', PK.age(l.ageMonths)], ['Warranty', l.warranty],
      ['Original invoice', l.invoice ? 'Yes' : 'No'], ['Original box', l.box ? 'Yes' : 'No']].concat(l.specs || []);

    let buy;
    if (l.status === 'live' && mine) buy = `<div class="note">This is your listing. Buyers see this page.</div>`;
    else if (l.status === 'live' && me && me.role === 'ops') buy = `<div class="note">Bench accounts cannot buy.</div>`;
    else if (l.status === 'live') buy = `<a class="btn btn-lg btn-block" href="#/checkout/${l.id}">Buy with sell.io protection</a>`;
    else if (l.status === 'reserved') buy = `<button class="btn btn-lg btn-block" disabled>Reserved by a buyer</button>`;
    else if (l.status === 'sold') buy = `<button class="btn btn-lg btn-block" disabled>Sold</button>`;
    else buy = `<div class="note">Status: ${esc(l.status)}. Not visible to buyers.</div>`;

    const how = l.mode === 'hub'
      ? `This item is already at our hub. It has been inspected, sealed and is ready to ship the day you pay.`
      : l.handover === 'onsite'
        ? `After you pay, our agent inspects it in person at the seller's address in ${esc(l.city)}, seals it, and we ship it to you.`
        : `After you pay, the seller has ${F.handoverDays} days to get it to our hub. We inspect it and send you the report before it ships.`;

    return `<div class="wrap page">
      <nav class="crumbs"><a href="#/browse">Browse</a><span>/</span><a href="#/browse?cat=${l.category}">${PK.CATEGORIES[l.category].label}</a></nav>
      <div class="item">
        <div class="item-main">
          <div class="item-photo">${PK.thumb(l)}</div>
          <section class="block">
            <h2>From the seller</h2>
            <p class="lede">${esc(l.description)}</p>
          </section>
          <section class="block">
            <h2>Details</h2>
            <table class="spec">${specs.map((r) => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</table>
          </section>
          ${l.mode === 'hub' && l.report ? `<section class="block"><h2>Inspection report</h2>${PK.reportCard(l.report, l, { maskSerial: true })}</section>` : `
          <section class="block">
            <h2>What we will check</h2>
            <p class="muted">You choose the level at checkout. Either way, a sell.io technician handles the item before it ships and you receive the signed report.</p>
            <div class="checkcols">
              <div><h3>Look-and-feel check, included</h3><ul class="checks">${li(PK.checklistFor(l.category, 'basic'))}</ul></div>
              <div><h3>Full bench test, +${inr(PK.benchFor(l.category))}</h3><ul class="checks">${li(PK.CHECKS[l.category] || PK.CHECKS.component)}</ul>
                <p class="muted small tier-foot">Plus the four identity and condition checks.</p></div>
            </div>
          </section>`}
        </div>

        <aside class="item-side">
          <div class="buybox">
            <div class="buy-tags">${PK.verifiedTag(l)}<span class="tag">${esc(cond.label)}</span></div>
            <h1>${esc(l.title)}</h1>
            <div class="buy-price">${inr(l.price)}</div>
            ${l.newPrice > l.price ? `<div class="muted small">New, this sold for about ${inr(l.newPrice)}</div>` : ''}
            <dl class="sum">
              <div><dt>Item</dt><dd>${inr(l.price)}</dd></div>
              <div><dt>Insured shipping</dt><dd>${inr(ship)}</dd></div>
              ${l.mode === 'hub' && l.report
                ? `<div><dt>Full bench test</dt><dd>Already done</dd></div>
                   <div class="sum-total"><dt>You pay</dt><dd>${inr(l.price + ship)}</dd></div>`
                : `<div><dt>Look-and-feel check</dt><dd>Included</dd></div>
                   <div><dt>Full bench test</dt><dd>Optional, +${inr(PK.benchFor(l.category))}</dd></div>
                   <div class="sum-total"><dt>You pay from</dt><dd>${inr(l.price + ship)}</dd></div>`}
            </dl>
            ${buy}
            <p class="buy-how">${how}</p>
            <ul class="assure">
              <li>${icon('lock', 16)}<span>Held in escrow until you have had ${F.inspectionHours} hours with it</span></li>
              <li>${icon('shield', 16)}<span>Full refund if it fails inspection</span></li>
              <li>${icon('truck', 16)}<span>Tamper-sealed and insured in transit</span></li>
            </ul>
          </div>

          <div class="sellerbox">
            <div class="avatar avatar-lg">${esc(PK.initials(seller.name))}</div>
            <div>
              <div class="seller-name">${esc(seller.name)} <span class="tag tag-green">${icon('check', 12)} ID verified</span></div>
              <div class="muted small">${esc(seller.city)} · ${seller.deals} completed ${seller.deals === 1 ? 'deal' : 'deals'} · member since ${new Date(seller.joined).getFullYear()}</div>
            </div>
          </div>
          <div class="condbox"><strong>${esc(cond.label)}.</strong> ${esc(cond.note)}</div>
        </aside>
      </div>
    </div>`;
  };

  /* ---------- how it works / protection ---------- */
  PK.views.protection = () => `<div class="wrap page narrow">
    <div class="page-head">
      <h1>How sell.io works</h1>
      <p>Buying used hardware from a stranger usually means trusting their photos and paying first. On sell.io the money waits in escrow, and the item is inspected before it ships.</p>
    </div>

    <ol class="longsteps">${stepList('longsteps', 'h2')}</ol>

    <section class="block" id="window">
      <h2>The 48-hour inspection window</h2>
      <p>You have ${F.inspectionHours} hours from delivery to check the item against its report. If something is wrong, raise a claim from your order page and the seller's payout is frozen while we look into it.</p>
      <p>Record yourself opening the parcel, and check that the seal number on it matches the one on the report.</p>
    </section>

    <section class="block" id="checks">
      <h2>What we check</h2>
      <p>The look-and-feel check in the first column is part of every order. If you choose the full bench test, we add the checks for that kind of item.</p>
      <div class="checkcols">
        <div><h3>Look-and-feel, every item</h3><ul class="checks">${PK.checklistFor('', 'basic').map((c) => `<li>${icon('check', 15)}<span>${esc(c)}</span></li>`).join('')}</ul></div>
        ${['gpu', 'laptop', 'monitor'].map((k) => `<div><h3>Bench test: ${PK.CATEGORIES[k].label.toLowerCase()}</h3><ul class="checks">${PK.CHECKS[k].map((c) => `<li>${icon('check', 15)}<span>${esc(c)}</span></li>`).join('')}</ul></div>`).join('')}
      </div>
    </section>

    <section class="block" id="fees">
      <h2>Fees</h2>
      <table class="spec">
        <tr><th>Buyer</th><td>Listed price plus insured shipping (${inr(PK.shipFor('mouse'))} to ${inr(PK.shipFor('desktop'))} depending on size). The look-and-feel check is included.</td></tr>
        <tr><th>Full bench test</th><td>Optional, chosen by the buyer at checkout: ${inr(PK.benchFor('mouse'))} for a mouse up to ${inr(PK.benchFor('desktop'))} for a desktop build. Refunded if the item fails.</td></tr>
        <tr><th>Seller</th><td>${F.commissionRate * 100}% of the sale price, minimum ${inr(F.commissionMin)}, deducted from the payout when the deal completes.</td></tr>
        <tr><th>On-site visit</th><td>Optional, chosen by the seller when listing. Our agent inspects and collects the item at the seller's address for ${inr(F.visitFee)}, deducted from the payout. Still due if the item fails inspection.</td></tr>
        <tr><th>Item fails inspection</th><td>Buyer refunded in full. Item returned to the seller, who pays return shipping.</td></tr>
        <tr><th>Buyer cancels before handover</th><td>Full refund, no charge.</td></tr>
      </table>
    </section>

    <section class="block">
      <h2>Questions people ask</h2>
      <details><summary>Where is my money while I wait?</summary><p>With a licensed payment partner, in an account that only pays out on our instruction: to the seller once the deal completes, or back to you if it does not. It never sits in sell.io's own bank account.</p></details>
      <details><summary>Can I talk to the seller directly?</summary><p>No. Contact details stay private on both sides, and the inspection report is the record of what was sold. If you have a question about an item, ask us and we will check it for you.</p></details>
      <details><summary>What if the item dies a month later?</summary><p>Our report describes the item on the day we tested it. After the inspection window closes, any remaining manufacturer warranty is your cover, and we note its status in the report.</p></details>
      <details><summary>Why is there a minimum price?</summary><p>Every item takes a technician's time to inspect. Below ${inr(F.minPrice)}, the inspection would cost more than it protects.</p></details>
    </section>
  </div>`;

  /* ---------- sell landing ---------- */
  PK.views.sell = () => {
    const me = db.me();
    const next = !me ? '#/login?mode=join&next=' + encodeURIComponent('/selling')
      : me.kyc.status === 'verified' ? '#/sell/new' : '#/sell/verify';
    const ex = 30000, fee = PK.fee(ex);
    return `<div class="wrap page">
      <div class="sellhero">
        <div>
          <h1>Sell your hardware on sell.io</h1>
          <p>The buyer pays into escrow before you send anything, so you never chase a payment or meet a stranger to hand it over. You are paid 48 hours after the item is delivered.</p>
          <a class="btn btn-lg" href="${next}">${!me ? 'Create a seller account' : me.kyc.status === 'verified' ? 'List an item' : 'Verify your identity'} ${icon('arrow', 16)}</a>
        </div>
        <div class="calc">
          <h2 class="calc-h">Work out your payout</h2>
          <label>Sale price<div class="inp-pre"><span>₹</span><input type="number" inputmode="numeric" value="${ex}" min="${F.minPrice}" step="500" data-calc="sell"></div></label>
          <dl class="sum">
            <div><dt>sell.io fee (${F.commissionRate * 100}%, min ${inr(F.commissionMin)})</dt><dd id="calc-fee">− ${inr(fee)}</dd></div>
            <div class="sum-total"><dt>Paid to your bank</dt><dd id="calc-net">${inr(ex - fee)}</dd></div>
          </dl>
          <p class="muted small">The buyer pays shipping. You pay nothing unless the item sells. Would rather not post it? Our agent can inspect and collect it from you for ${inr(F.visitFee)}.</p>
        </div>
      </div>
      <ol class="steps steps-3">
        <li><span class="step-n">1</span><div><h2>Verify your identity</h2><p>Your PAN and a bank account in your own name. It takes a few minutes, and it keeps stolen goods off the site.</p></div></li>
        <li><span class="step-n">2</span><div><h2>List the item</h2><p>Mention scratches, faults and missing parts. The technician checks the item against what you write, so an accurate listing gets through fastest.</p></div></li>
        <li><span class="step-n">3</span><div><h2>Hand it over</h2><p>When it sells, courier it to our hub, or pay ${inr(F.visitFee)} for our agent to collect it from you. You are paid 48 hours after delivery.</p></div></li>
      </ol>
    </div>`;
  };

  /* ---------- sign in / join ---------- */
  PK.views.login = (route) => {
    const join = route.q.get('mode') === 'join';
    const next = route.q.get('next') || '';
    return `<div class="wrap page auth">
      <div class="authbox">
        <h1>${join ? 'Create your account' : 'Sign in'}</h1>
        <p class="muted">${join ? 'One account lets you buy and sell.' : 'Welcome back.'}</p>
        <form data-form="${join ? 'join' : 'signin'}" novalidate>
          <input type="hidden" name="next" value="${esc(next)}">
          ${join ? `<label>Full name<input name="name" required autocomplete="name"></label>` : ''}
          <label>Email<input name="email" type="email" required autocomplete="email"></label>
          ${join ? `<label>City<input name="city" required autocomplete="address-level2"></label>` : ''}
          <label>Password<input name="password" type="password" required minlength="6" autocomplete="${join ? 'new-password' : 'current-password'}"></label>
          <div class="form-err" hidden></div>
          <button class="btn btn-lg btn-block">${join ? 'Create account' : 'Sign in'}</button>
        </form>
        <p class="auth-alt">${join ? `Already have an account? <a class="ulink" href="#/login${next ? '?next=' + encodeURIComponent(next) : ''}">Sign in</a>`
          : `New here? <a class="ulink" href="#/login?mode=join${next ? '&next=' + encodeURIComponent(next) : ''}">Create an account</a>`}</p>
      </div>
      <div class="demobox">
        <h2 class="calc-h">Demo accounts</h2>
        <p class="muted small">This is a prototype. Sign in as any side of a deal:</p>
        <button class="demo-acct" data-act="demo-login" data-id="u_arjun" data-next="${esc(next)}"><span class="avatar">AM</span><span><strong>Arjun Menon</strong><em>Buyer with two orders in progress</em></span></button>
        <button class="demo-acct" data-act="demo-login" data-id="u_rhea" data-next="${esc(next)}"><span class="avatar">RK</span><span><strong>Rhea Kapoor</strong><em>Verified seller with a sale to hand over</em></span></button>
        <button class="demo-acct" data-act="demo-login" data-id="u_ops" data-next="${esc(next)}"><span class="avatar">ND</span><span><strong>Nikhil D'Souza</strong><em>Bench agent: inspections, approvals, disputes</em></span></button>
      </div>
    </div>`;
  };
})();
