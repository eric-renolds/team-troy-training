/* Team Troy Training Portal v2 — VA self-assessment page (personal link). */
(function () {
  'use strict';
  const BOOT = window.BOOT || {};
  const root = document.getElementById('root');
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = (fn, ...args) => new Promise((res, rej) => {
    const r = google.script.run.withSuccessHandler(res).withFailureHandler(e => rej(new Error((e && e.message) || String(e))));
    r[fn].apply(r, args);
  });
  const fmtDate = iso => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';

  let D = null;
  const scores = {};

  function fail(msg) {
    root.innerHTML = '<div class="va-wrap"><div class="card done-card"><h2>Link not working</h2><p class="t2" style="margin-top:8px">' + esc(msg) + '</p></div></div>';
  }

  function render() {
    const names = D.levelNames;
    const byCat = {};
    D.skills.forEach(s => (byCat[s.category] = byCat[s.category] || []).push(s));
    const returning = !!D.lastTs;
    root.innerHTML = '<div class="va-wrap">' +
      '<div class="va-hero"><h1>Hi ' + esc(D.first) + ', how are your skills today?</h1>' +
      '<p>' + (returning
        ? 'Your answers from ' + esc(fmtDate(D.lastTs)) + ' are filled in. Just change anything that has moved up or down, then submit.'
        : 'Rate yourself on each skill from 1 to 5. Be honest: this isn’t a test, it helps ' + esc(D.team) + ' pair you with the right trainer.') + '</p>' +
      '<div class="meta"><span class="chip">' + D.skills.length + ' skills</span><span class="chip">About 3 minutes</span>' + (returning ? '<span class="chip">Last updated ' + esc(fmtDate(D.lastTs)) + '</span>' : '') + '</div></div>' +
      '<div class="scale">' + names.map((n, i) => '<div><b>' + (i + 1) + '</b>' + esc(n) + '</div>').join('') + '</div>' +
      '<p class="small muted" style="margin-bottom:6px">Tap a number to see what it means for that skill.</p>' +
      '<div class="rate-list">' + Object.keys(byCat).map(cat => '<div class="cat-title">' + esc(cat) + '</div>' + byCat[cat].map(s => {
        const v = scores[s.name], was = D.last[s.name];
        return '<div class="rate' + (v ? ' done' : '') + '" data-skill="' + esc(s.name) + '"><div class="rate-top"><span class="nm">' + esc(s.name) + '</span>' + (was ? '<span class="hint">Last time: ' + was + '</span>' : '') + '</div>' +
          '<div class="picks" role="radiogroup" aria-label="' + esc(s.name) + '">' + [1, 2, 3, 4, 5].map(n => '<button type="button" class="pick" role="radio" aria-checked="' + (v === n) + '" aria-pressed="' + (v === n) + '" data-n="' + n + '"><b>' + n + '</b><span>' + esc(names[n - 1]) + '</span></button>').join('') + '</div>' +
          '<div class="desc">' + (v ? '<b>' + v + ' · ' + esc(names[v - 1]) + ':</b> ' + esc(s.levels[v - 1]) : '<span class="muted">Pick the level that fits you best.</span>') + '</div></div>';
      }).join('')).join('') + '</div>' +
      '<div class="card" style="margin-top:16px"><label class="field">Anything you’d like training on, or a skill we missed? (optional)<textarea id="note" maxlength="2000" placeholder="e.g. I’d like help with Excel pivot tables"></textarea></label></div>' +
      '</div>' +
      '<div class="sticky-bar"><div class="inner"><div class="progress"><span class="small t2" id="prog"></span><div class="bar"><span id="progBar"></span></div></div><button class="btn primary" id="submit">Submit</button></div></div>';
    wire();
    progress();
  }

  function progress() {
    const n = D.skills.filter(s => scores[s.name]).length;
    $('#prog').textContent = n + ' of ' + D.skills.length + ' rated';
    $('#progBar').style.width = (n / D.skills.length) * 100 + '%';
  }

  function wire() {
    const names = D.levelNames;
    $$('.rate').forEach(card => {
      const s = D.skills.find(x => x.name === card.dataset.skill);
      const desc = $('.desc', card);
      const show = n => (desc.innerHTML = n ? '<b>' + n + ' · ' + esc(names[n - 1]) + ':</b> ' + esc(s.levels[n - 1]) : '<span class="muted">Pick the level that fits you best.</span>');
      $$('.pick', card).forEach(b => {
        b.onmouseenter = () => show(Number(b.dataset.n));
        b.onmouseleave = () => show(scores[s.name]);
        b.onclick = () => {
          scores[s.name] = Number(b.dataset.n);
          $$('.pick', card).forEach(x => { x.setAttribute('aria-pressed', String(x === b)); x.setAttribute('aria-checked', String(x === b)); });
          card.classList.add('done'); show(scores[s.name]); progress();
        };
      });
    });
    $('#submit').onclick = async () => {
      const missing = D.skills.filter(s => !scores[s.name]);
      if (missing.length) {
        const c = $('.rate[data-skill="' + CSS.escape(missing[0].name) + '"]');
        if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.style.borderColor = 'var(--crit)'; setTimeout(() => (c.style.borderColor = ''), 1600); }
        return;
      }
      const btn = $('#submit'); btn.disabled = true; btn.textContent = 'Sending…';
      try {
        const res = await call('apiVaSubmit', BOOT.token, scores, $('#note').value);
        done(res);
      } catch (e) { btn.disabled = false; btn.textContent = 'Try again'; alert(e.message); }
    };
  }

  function done(res) {
    const ups = res.changes.filter(c => c.to > c.from), downs = res.changes.filter(c => c.to < c.from);
    window.scrollTo(0, 0);
    root.innerHTML = '<div class="va-wrap"><div class="card done-card"><div class="check">' + check + '</div><h1>Thanks, ' + esc(D.first) + '!</h1>' +
      '<p class="t2" style="margin-top:8px">Your ratings are saved. Your team lead will use them to plan training with you.</p>' +
      (ups.length ? '<div style="margin-top:20px"><h3 style="margin-bottom:10px">You moved up in</h3><div class="chips" style="justify-content:center">' + ups.map(c => '<span class="chip good">' + esc(c.skill) + ' ' + c.from + ' → ' + c.to + '</span>').join('') + '</div></div>' : '') +
      (downs.length ? '<div style="margin-top:16px"><h3 style="margin-bottom:10px">Rated lower than last time</h3><div class="chips" style="justify-content:center">' + downs.map(c => '<span class="chip">' + esc(c.skill) + ' ' + c.from + ' → ' + c.to + '</span>').join('') + '</div></div>' : '') +
      '<p class="small muted" style="margin-top:22px">You can use this same link again next time.</p></div></div>';
  }

  call('apiVaLoad', BOOT.token).then(d => {
    D = d;
    D.skills.forEach(s => { if (D.last[s.name]) scores[s.name] = D.last[s.name]; });
    render();
  }).catch(e => fail(e.message));
})();
