/* sell.io prototype — router, event wiring and form handlers. */
(function () {
  const { db, act, inr } = PK;
  const app = document.getElementById('app');

  /* ---------- router ---------- */
  function parse() {
    let h = location.hash.slice(1) || '/';
    let anchor = '';
    const i = h.indexOf('#');
    if (i > -1) { anchor = h.slice(i + 1); h = h.slice(0, i); }
    const [path, qs] = h.split('?');
    return { path, parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || ''), anchor };
  }

  // route -> [view name, needs sign-in, ops only]
  function resolve(r) {
    const [a, b] = r.parts;
    if (!a) return ['home'];
    if (a === 'browse') return ['browse'];
    if (a === 'item') return ['item'];
    if (a === 'protection') return ['protection'];
    if (a === 'login') return ['login'];
    if (a === 'sell' && !b) return ['sell'];
    if (a === 'sell' && b === 'verify') return ['sellVerify', true];
    if (a === 'sell' && b === 'new') return ['sellNew', true];
    if (a === 'selling') return ['selling', true];
    if (a === 'checkout') return ['checkout', true];
    if (a === 'orders') return ['orders', true];
    if (a === 'order') return ['order', true];
    if (a === 'ops') return ['ops', true, true];
    return ['404'];
  }

  let lastPath = null;
  function render() {
    const r = parse();
    const [name, auth, opsOnly] = resolve(r);
    const me = db.me();
    if (auth && !me) { location.replace('#/login?next=' + encodeURIComponent(r.path)); return; }
    let body;
    if (name === '404' || (opsOnly && me.role !== 'ops')) body = PK.notFound();
    else if (name === 'selling' && me.role === 'ops') body = PK.notFound('Bench accounts do not sell.');
    else body = PK.views[name](r);
    app.innerHTML = PK.header(r) + `<main>${body}</main>` + PK.footer() + PK.demoBar();
    document.title = 'sell.io — ' + ({ home: 'Verified hardware exchange', browse: 'Browse', protection: 'How it works', sell: 'Sell', login: 'Sign in', ops: 'Bench console' }[name] || 'Verified hardware exchange');
    if (PK.mounts[name]) PK.mounts[name](r);
    if (r.anchor) { const el = document.getElementById(r.anchor); if (el) el.scrollIntoView(); }
    else if (r.path !== lastPath) window.scrollTo(0, 0);
    lastPath = r.path;
  }
  PK.render = render;
  const go = (path) => { if (location.hash === '#' + path) render(); else location.hash = path; };
  window.addEventListener('hashchange', render);

  /* ---------- helpers ---------- */
  function showErr(form, msg) {
    const el = form.querySelector('.form-err');
    if (el) { el.textContent = msg; el.hidden = false; el.scrollIntoView({ block: 'nearest' }); }
    else PK.toast(msg);
  }
  function validate(form) {
    const bad = Array.from(form.elements).find((el) => el.willValidate && !el.checkValidity());
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
    if (!bad) return true;
    bad.classList.add('invalid'); bad.focus();
    const label = bad.closest('label');
    const name = label ? label.childNodes[0].textContent.trim() : 'This field';
    showErr(form, bad.type === 'checkbox' ? 'Please tick the confirmation box.' : bad.validity.valueMissing ? `${name} is required.` : `${name} does not look right.`);
    return false;
  }
  const run = (form, fn) => { try { return fn(); } catch (e) { showErr(form, e.message); return null; } };

  /* ---------- click actions ---------- */
  const handlers = {
    signout() { act.signOut(); go('/'); PK.toast('Signed out.'); },
    reset() { db.reset(); PK.browse.q = ''; PK.browse.cat = ''; PK.browse.cond = []; PK.browse.vault = false; go('/'); PK.toast('Sample data restored.'); },
    'demo-login'(el) {
      act.switchTo(el.dataset.id);
      const me = db.me();
      go(el.dataset.next || (me.role === 'ops' ? '/ops' : me.kyc.status === 'verified' ? '/selling' : '/orders'));
    },
    'clear-filters'() { Object.assign(PK.browse, { q: '', cat: '', cond: [], vault: false }); go('/browse'); render(); },
    withdraw(el) { act.withdrawListing(el.dataset.id); render(); PK.toast('Listing withdrawn.'); },

    'cancel-order'(el) { act.cancel(el.dataset.id); render(); PK.toast('Order cancelled. Refund issued.'); },
    handover(el) {
      act.handover(el.dataset.id); render();
      PK.toast(db.order(el.dataset.id).handover === 'onsite' ? 'Visit booked. Our agent will bring the code.' : 'Thanks. We will confirm when it reaches the hub.');
    },
    receive(el) {
      act.receive(el.dataset.id); render(); window.scrollTo(0, 0);
      PK.toast(db.order(el.dataset.id).handover === 'onsite' ? 'On site. Ready for inspection.' : 'Received. Ready for inspection.');
    },
    'mark-delivered'(el) { act.delivered(el.dataset.id); render(); PK.toast('Delivered. The 48-hour window has started.'); },
    release(el) { act.release(el.dataset.id, 'Confirmed by the buyer.'); render(); PK.toast('Payment released to the seller.'); },
    'release-ops'(el) {
      const o = db.order(el.dataset.id);
      act.release(o.id, o.status === 'disputed' ? 'Claim reviewed and not upheld. Payout released.' : 'Inspection window closed without a claim.');
      render(); PK.toast('Payout released.');
    },
    refund(el) { act.refund(el.dataset.id); render(); PK.toast('Buyer refunded.'); },

    'listing-ok'(el) { act.reviewListing(el.dataset.id, true); render(); PK.toast('Listing is live.'); },
    'listing-no'(el) { act.reviewListing(el.dataset.id, false); render(); PK.toast('Listing rejected.'); },
    'kyc-ok'(el) { act.reviewKyc(el.dataset.id, true); render(); PK.toast('Seller verified.'); },
    'kyc-no'(el) { act.reviewKyc(el.dataset.id, false); render(); PK.toast('Seller rejected.'); },
    'all-pass'(el) { el.closest('form').querySelectorAll('input[value="pass"]').forEach((i) => { i.checked = true; }); }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !handlers[el.dataset.act]) return;
    e.preventDefault();
    handlers[el.dataset.act](el, e);
  });

  /* ---------- forms ---------- */
  const forms = {
    signin(d, f) {
      const u = run(f, () => act.signIn(d.email)); if (!u) return;
      go(d.next || (u.role === 'ops' ? '/ops' : '/browse'));
    },
    join(d, f) {
      const u = run(f, () => act.signUp(d)); if (!u) return;
      PK.toast('Welcome, ' + PK.firstName(u.name) + '.');
      go(d.next || '/browse');
    },
    checkout(d, f) {
      const btn = f.querySelector('button.btn');
      const address = { name: d.name.trim(), phone: d.phone.trim(), line: d.line.trim(), city: d.city.trim(), pin: d.pin.trim() };
      btn.disabled = true; btn.textContent = 'Contacting your bank…';
      setTimeout(() => {
        const o = run(f, () => act.placeOrder(d.listingId, address, d.pay, d.tier));
        if (!o) { btn.disabled = false; btn.textContent = 'Try again'; return; }
        PK._flash = `Payment of ${inr(o.total)} received and held in escrow.`;
        go('/order/' + o.id);
      }, 1100);
    },
    kyc(d, f) {
      const btn = f.querySelector('button.btn');
      btn.disabled = true; btn.textContent = 'Sending ₹1 to your account…';
      setTimeout(() => { act.submitKyc(d); PK.toast('Details submitted for review.'); go('/selling'); }, 1100);
    },
    listing(d, f) {
      d.img = PK._photo || '';
      const l = run(f, () => act.createListing(d)); if (!l) return;
      PK.toast('Submitted. We will review it within a working day.');
      go('/selling');
    },
    dispute(d) { act.dispute(d.id, d.reason, d.detail.trim()); render(); PK.toast('Claim opened. The payout is frozen.'); window.scrollTo(0, 0); },
    dispatch(d) { act.dispatch(d.id, d.courier); render(); PK.toast('Dispatched.'); },
    inspect(d, f, e) {
      const o = db.order(d.id), l = db.listing(o.listingId);
      const labels = PK.checklistFor(l.category, o.tier);
      const checks = labels.map((label, i) => ({ label, result: d['c' + i] || '' }));
      if (checks.some((c) => !c.result)) return showErr(f, 'Every check needs a result before you can sign off.');
      const pass = (e.submitter && e.submitter.value) === 'pass';
      const anyFail = checks.some((c) => c.result === 'fail');
      if (pass && anyFail) return showErr(f, 'A failed check cannot be signed off as a pass.');
      if (!pass && !anyFail) return showErr(f, 'Mark the check that failed before failing the item.');
      if (pass && d.serial.trim().toUpperCase() !== String(l.serial).toUpperCase())
        return showErr(f, 'The serial you typed does not match the listing. If the unit really differs, fail the serial check.');
      act.verify(o.id, { checks, serial: d.serial.trim(), grade: d.grade, notes: d.notes.trim() }, pass);
      render(); window.scrollTo(0, 0);
      PK.toast(pass ? 'Report issued. Ready to pack.' : 'Item failed. Buyer refunded.');
    }
  };

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const err = f.querySelector('.form-err'); if (err) err.hidden = true;
    if (!validate(f)) return;
    forms[f.dataset.form](Object.fromEntries(new FormData(f)), f, e);
  });

  /* ---------- live inputs ---------- */
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.filter === 'q') { PK.browse.q = t.value; PK.browse.renderResults(); }
    if (t.dataset.calc === 'sell') {
      const p = Number(t.value) || 0, fee = p ? PK.fee(p) : 0;
      document.getElementById('calc-fee').textContent = '− ' + inr(fee);
      document.getElementById('calc-net').textContent = inr(Math.max(0, p - fee));
    }
    if (t.dataset.calc === 'list') listCalc(t.form);
    if (t.classList.contains('upper')) t.value = t.value.toUpperCase();
  });
  function listCalc(f) {
    const p = Number(f.elements.price.value) || 0;
    const visit = f.elements.handover.value === 'onsite' ? PK.FEES.visitFee : 0;
    document.getElementById('l-ship').textContent = inr(PK.shipFor(f.elements.category.value));
    document.getElementById('l-fee').textContent = p ? '− ' + inr(PK.fee(p)) : '–';
    document.getElementById('l-visit').textContent = visit ? '− ' + inr(visit) : 'None';
    document.getElementById('l-net').textContent = p ? inr(Math.max(0, p - PK.fee(p) - visit)) : '–';
  }

  document.addEventListener('change', (e) => {
    const t = e.target, s = PK.browse;
    if (t.dataset.filter === 'cat') { s.cat = t.value; s.renderResults(); }
    if (t.dataset.filter === 'sort') { s.sort = t.value; s.renderResults(); }
    if (t.dataset.filter === 'vault') { s.vault = t.checked; s.renderResults(); }
    if (t.dataset.filter === 'cond') {
      s.cond = t.checked ? s.cond.concat(t.value) : s.cond.filter((c) => c !== t.value);
      s.renderResults();
    }
    if (t.dataset.calc === 'list') listCalc(t.form);
    if (t.name === 'tier') {
      const add = Number(t.dataset.tier) || 0, pay = document.getElementById('co-pay');
      const total = Number(pay.dataset.base) + add;
      document.getElementById('co-insp').textContent = add ? 'Full bench test, +' + inr(add) : 'Look and feel, included';
      document.getElementById('co-total').textContent = inr(total);
      pay.textContent = 'Pay ' + inr(total) + ' into escrow';
    }
    if (t.hasAttribute('data-demo-switch')) {
      act.switchTo(t.value);
      const me = db.me();
      go(!me ? '/' : me.role === 'ops' ? '/ops' : me.kyc.status === 'verified' ? '/selling' : '/orders');
      render();
    }
    if (t.hasAttribute('data-photo') && t.files[0]) readPhoto(t.files[0]);
  });

  /* Downscale the seller's photo so it fits in localStorage. */
  function readPhoto(file) {
    const img = new Image();
    img.onload = () => {
      const max = 1000, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      PK._photo = c.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(img.src);
      const drop = document.getElementById('drop');
      if (drop) { drop.classList.add('has'); drop.style.backgroundImage = `url(${PK._photo})`; }
    };
    img.onerror = () => PK.toast('That file is not an image we can read.');
    img.src = URL.createObjectURL(file);
  }

  render();
})();
