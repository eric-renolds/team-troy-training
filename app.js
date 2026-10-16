/* Team Troy Training Portal — dashboard + trainer pairing.
   Talks to a Google Apps Script web app (see apps-script/Code.gs). */
(function () {
  'use strict';

  const CFG = window.TT_CONFIG || {};
  const API_URL = (CFG.API_URL || '').trim();
  const DEMO = !API_URL;
  const WEAK = 3;          // averages below this are flagged
  const STRONG = 4;        // ratings at/above this count as strengths
  const PW_KEY = 'tt_pw';
  const THEME_KEY = 'tt_theme';

  const S = { pw: null, data: null, view: 'overview', profileVA: null, editing: null, form: null,
              heat: { sort: 'name', cat: 'all', showMissing: true }, resp: { q: '', latestOnly: false, open: null } };

  /* ---------------- utils ---------------- */
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const fmt1 = n => (n == null || isNaN(n) ? '–' : n.toFixed(1));
  const fmtDate = iso => { if (!iso) return '–'; const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fmtDateTime = iso => { if (!iso) return '–'; const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const subAvg = x => { const v = Object.values(x.ratings || {}).filter(n => n != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const initials = n => { const w = String(n).split(/\s+/).filter(Boolean); const last = w[w.length - 1] || ''; return /\d/.test(last) ? last.slice(0, 3) : w.slice(0, 2).map(x => x[0]).join('').toUpperCase(); };
  const store = {
    get(k, sess) { try { return (sess ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set(k, v, sess) { try { (sess ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} },
    del(k, sess) { try { (sess ? sessionStorage : localStorage).removeItem(k); } catch (e) {} },
  };

  function toast(msg, isErr) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (isErr ? ' err' : ''); t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3200);
  }

  /* ---------------- theme ---------------- */
  function applyTheme(t) { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  applyTheme(store.get(THEME_KEY));
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next); store.set(THEME_KEY, next);
  }

  /* ---------------- API ---------------- */
  async function api(action, extra) {
    if (DEMO) return demoApi(action, extra || {});
    // text/plain body = "simple" CORS request, which Apps Script accepts.
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action, password: S.pw }, extra || {})) });
    if (!res.ok) throw new Error('Server error (' + res.status + ')');
    const out = await res.json();
    if (!out.ok) { const e = new Error(out.error || 'Request failed'); e.auth = /password/i.test(out.error || ''); throw e; }
    return out;
  }

  /* ---------------- demo data (used only when API_URL is empty) ---------------- */
  const demo = (function () {
    const skills = [['Email Management', 'Administrative'], ['Calendar & Scheduling', 'Administrative'], ['Data Entry & Accuracy', 'Administrative'],
      ['Microsoft Excel', 'Tools'], ['Google Workspace', 'Tools'], ['CRM Tools', 'Tools'], ['Project Management Tools', 'Tools'],
      ['Written Communication', 'Communication'], ['Verbal Communication', 'Communication'], ['Customer Service', 'Communication'],
      ['Internet Research', 'Research & Analysis'], ['Problem Solving', 'Research & Analysis'], ['Time Management', 'Professional'],
      ['Attention to Detail', 'Professional'], ['Social Media Management', 'Marketing'], ['Canva / Basic Design', 'Marketing'], ['Basic Bookkeeping', 'Finance']]
      .map(([name, category]) => ({ name, category, source: 'Standard' }));
    const vas = Array.from({ length: 16 }, (_, i) => ({ name: 'VA ' + String(i + 1).padStart(2, '0') }));
    const ratings = vas.slice(0, 12).map((v, k) => {
      const i = k + 1, r = {};
      skills.forEach((s, j) => (r[s.name] = 1 + ((i * 7 + j * 3 + (i * j) % 4) % 5)));
      return { va: v.name, timestamp: new Date(Date.now() - i * 864e5).toISOString(), ratings: r };
    });
    const submissions = ratings.map((r, k) => Object.assign({}, r, { comments: k % 4 === 0 ? 'Would like help with Excel formulas and pivot tables.' : '' }));
    ratings.slice(0, 3).forEach(r => { const old = {}; Object.keys(r.ratings).forEach(k => (old[k] = Math.max(1, r.ratings[k] - 1))); submissions.push({ va: r.va, timestamp: new Date(new Date(r.timestamp).getTime() - 30 * 864e5).toISOString(), ratings: old, comments: '' }); });
    submissions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { vas, skills, ratings, submissions, pairings: [], ratingsSource: 'Demo data', unmatchedColumns: [], generatedAt: new Date().toISOString() };
  })();
  function demoApi(action, x) {
    return new Promise(res => setTimeout(() => {
      if (action === 'getData') return res({ ok: true, data: JSON.parse(JSON.stringify(demo)) });
      if (action === 'savePairing') {
        const p = x.pairing; let row = p.id && demo.pairings.find(q => q.id === p.id);
        if (row) Object.assign(row, { va: p.va, trainer: p.trainer, trainerType: p.trainerType, skills: p.skills });
        else { row = Object.assign({}, p, { id: Math.random().toString(36).slice(2, 10), date: new Date().toISOString() }); demo.pairings.push(row); }
        return res({ ok: true, pairing: { id: row.id } });
      }
      if (action === 'deletePairing') { demo.pairings = demo.pairings.filter(q => q.id !== x.id); return res({ ok: true }); }
      res({ ok: true });
    }, 150));
  }

  /* ---------------- derived model ---------------- */
  function model() {
    const d = S.data;
    const byVA = {};
    d.ratings.forEach(r => (byVA[norm(r.va)] = r));
    const rosterKeys = new Set(d.vas.map(v => norm(v.name)));
    const submitted = d.vas.filter(v => byVA[norm(v.name)]);
    const missing = d.vas.filter(v => !byVA[norm(v.name)]);
    const outsiders = d.ratings.filter(r => !rosterKeys.has(norm(r.va))); // submitted but not in VAs tab
    const people = d.vas.map(v => v.name).concat(outsiders.map(r => r.va));

    const skillStats = d.skills.map(s => {
      const vals = [];
      people.forEach(n => { const r = byVA[norm(n)]; if (r && r.ratings[s.name] != null) vals.push({ va: n, v: r.ratings[s.name] }); });
      const avg = vals.length ? vals.reduce((a, b) => a + b.v, 0) / vals.length : null;
      const max = vals.length ? Math.max.apply(null, vals.map(x => x.v)) : null;
      const top = max != null && max >= STRONG ? vals.filter(x => x.v === max).map(x => x.va) : [];
      return { skill: s.name, category: s.category, avg, n: vals.length, max, top, weak: avg != null && avg < WEAK };
    });
    const allAvgs = skillStats.filter(s => s.avg != null);
    const teamAvg = allAvgs.length ? allAvgs.reduce((a, b) => a + b.avg, 0) / allAvgs.length : null;
    const pairByVA = {};
    d.pairings.forEach(p => { (pairByVA[norm(p.va)] = pairByVA[norm(p.va)] || []).push(p); });
    return { byVA, submitted, missing, outsiders, people, skillStats, teamAvg, pairByVA };
  }
  const rating = (M, va, skill) => { const r = M.byVA[norm(va)]; return r ? r.ratings[skill] : undefined; };
  const vaAvg = (M, va) => {
    const r = M.byVA[norm(va)]; if (!r) return null;
    const v = S.data.skills.map(s => r.ratings[s.name]).filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  /* ---------------- boot / auth ---------------- */
  async function login(pw) {
    S.pw = pw;
    const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Signing in…'; $('#loginError').textContent = '';
    try {
      await api('login');
      store.set(PW_KEY, pw, true);
      await showApp();
    } catch (e) {
      S.pw = null; store.del(PW_KEY, true);
      $('#loginError').textContent = e.auth ? 'Incorrect password.' : 'Could not reach the server: ' + e.message;
    } finally { btn.disabled = false; btn.textContent = 'Sign in'; }
  }

  async function showApp() {
    $('#login').hidden = true; $('#app').hidden = false;
    $('#teamTitle').textContent = CFG.TEAM_NAME || 'Team Troy';
    await load();
  }

  async function load() {
    const v = $('#view-' + S.view); v.innerHTML = '<div class="spinner" aria-label="Loading"></div>';
    try {
      const out = await api('getData');
      S.data = out.data;
      if (!S.profileVA) S.profileVA = (S.data.vas[0] || {}).name || null;
      render();
    } catch (e) {
      if (e.auth) return logout();
      v.innerHTML = '<div class="card empty">Could not load data: ' + esc(e.message) + ' <button class="btn sm" id="retry">Retry</button></div>';
      $('#retry').onclick = load;
    }
  }

  function logout() {
    S.pw = null; S.data = null; store.del(PW_KEY, true);
    $('#app').hidden = true; $('#login').hidden = false; $('#pw').value = ''; $('#pw').focus();
  }

  /* ---------------- render ---------------- */
  function setView(v) {
    S.view = v;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    document.querySelectorAll('.view').forEach(s => (s.hidden = s.id !== 'view-' + v));
    if (S.data) render();
  }

  function render() {
    const M = model();
    const b = $('#banner');
    const notes = [];
    if (DEMO) notes.push('<strong>Demo mode.</strong> No API URL set in <code>config.js</code>, so this is sample data. Changes are not saved.');
    else if (S.data.ratingsSource === 'Ratings') notes.push('Showing <strong>sample data</strong> from the Ratings tab. As soon as the first VA submits the skills form, the dashboard switches to real responses and adds each submitter to the VA list.');
    if (S.data.unmatchedColumns && S.data.unmatchedColumns.length)
      notes.push('Form columns not matched to a skill (add them to the <strong>Skills</strong> tab to include them): ' + S.data.unmatchedColumns.map(esc).join(', '));
    if (M.outsiders.length) notes.push('Submissions from names not in the <strong>VAs</strong> tab: ' + M.outsiders.map(r => esc(r.va)).join(', '));
    b.hidden = !notes.length; b.className = 'banner' + (DEMO ? '' : ' warn'); b.innerHTML = notes.join('<br>');
    $('#foot').textContent = 'Data source: ' + (S.data.ratingsSource || 'none') + ' · Updated ' + new Date(S.data.generatedAt).toLocaleString();
    ({ overview: rOverview, heatmap: rHeatmap, skills: rSkills, profile: rProfile, pairings: rPairings, responses: rResponses })[S.view](M, $('#view-' + S.view));
  }

  function barList(items, opts) {
    // items: [{label, value, weak, tip}] on a single 0–5 axis with a dashed reference at 3
    if (!items.length) return '<div class="empty">No ratings yet.</div>';
    const ref = (WEAK / 5) * 100;
    return '<div class="bars">' + items.map(it =>
      '<div class="bar-row" data-tip="' + esc(it.tip || (it.label + ': ' + fmt1(it.value))) + '">' +
      '<div class="name" title="' + esc(it.label) + '">' + esc(it.label) + '</div>' +
      '<div class="bar-track"><div class="ref" style="left:' + ref + '%"></div>' +
      (it.value != null ? '<div class="bar-fill' + (it.weak ? ' weak' : '') + '" style="width:' + (it.value / 5 * 100) + '%"></div>' : '') + '</div>' +
      '<div class="val">' + (it.weak ? '<span class="sr-only">Weak spot </span>' : '') + (opts && opts.int ? (it.value ?? '–') : fmt1(it.value)) + '</div></div>').join('') +
      '</div><div class="axis"><span></span><div class="ticks"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div><span></span></div>';
  }

  /* ---- Overview ---- */
  function rOverview(M, el) {
    const total = S.data.vas.length, done = M.submitted.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const weak = M.skillStats.filter(s => s.weak).sort((a, b) => a.avg - b.avg);
    const ranked = M.skillStats.filter(s => s.avg != null).sort((a, b) => b.avg - a.avg);
    const pairedVAs = Object.keys(M.pairByVA).length;
    el.innerHTML =
      '<div class="view-head"><div><h2>Overview</h2><p class="muted">Where the team stands on skills and training.</p></div></div>' +
      '<div class="grid tiles">' +
        '<div class="card tile"><div class="label">Submissions</div><div class="value num">' + done + ' <small>of ' + total + '</small></div>' +
          '<div class="meter" role="img" aria-label="' + pct + '% submitted"><span style="width:' + pct + '%"></span></div><div class="sub">' + pct + '% of VAs have rated their skills</div></div>' +
        '<div class="card tile"><div class="label">Team average</div><div class="value num">' + fmt1(M.teamAvg) + ' <small>/ 5</small></div><div class="sub">Across ' + S.data.skills.length + ' skills</div></div>' +
        '<div class="card tile"><div class="label">Weak spots</div><div class="value num">' + weak.length + '</div><div class="sub">Skills averaging below ' + WEAK + '.0</div></div>' +
        '<div class="card tile"><div class="label">VAs with a trainer</div><div class="value num">' + pairedVAs + ' <small>of ' + total + '</small></div><div class="sub">' + S.data.pairings.length + ' pairing' + (S.data.pairings.length === 1 ? '' : 's') + ' in total</div></div>' +
      '</div>' +
      '<div class="grid two">' +
        '<div class="card"><div class="card-head"><h3>Not submitted yet</h3><span class="muted num">' + M.missing.length + '</span></div>' +
          (M.missing.length ? '<div class="chips">' + M.missing.map(v => '<span class="chip">' + esc(v.name) + '</span>').join('') + '</div>' : '<div class="empty">Everyone has submitted.</div>') + '</div>' +
        '<div class="card"><div class="card-head"><h3>Team weak spots</h3><span class="muted">avg &lt; ' + WEAK + '.0</span></div>' +
          (weak.length ? barList(weak.map(s => ({ label: s.skill, value: s.avg, weak: true, tip: s.skill + ': ' + fmt1(s.avg) + ' avg from ' + s.n + ' VAs' }))) : '<div class="empty">No skills below ' + WEAK + '.0. Nice.</div>') + '</div>' +
      '</div>' +
      '<div class="grid two">' +
        '<div class="card"><h3>Strongest skills</h3>' + barList(ranked.slice(0, 5).map(s => ({ label: s.skill, value: s.avg }))) + '</div>' +
        '<div class="card"><h3>Trainer candidates</h3><p class="muted" style="margin:-6px 0 10px">Top-rated VAs in each weak skill.</p>' +
          (weak.length ? '<div class="table-wrap"><table><thead><tr><th>Weak skill</th><th>Top rated VAs</th></tr></thead><tbody>' +
            weak.map(s => '<tr><td>' + esc(s.skill) + '</td><td>' + (s.top.length ? '<div class="chips">' + s.top.map(n => '<span class="chip good">' + esc(n) + ' · ' + s.max + '</span>').join('') + '</div>' : '<span class="muted">No one rated 4+ — consider an external trainer</span>') + '</td></tr>').join('') +
            '</tbody></table></div>' : '<div class="empty">No weak spots to cover.</div>') + '</div>' +
      '</div>';
  }

  /* ---- Heatmap ---- */
  function rHeatmap(M, el) {
    const cats = Array.from(new Set(S.data.skills.map(s => s.category)));
    const skills = S.data.skills.filter(s => S.heat.cat === 'all' || s.category === S.heat.cat);
    let rows = M.people.filter(n => S.heat.showMissing || M.byVA[norm(n)]);
    const avgOf = n => { const v = skills.map(s => rating(M, n, s.name)).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    if (S.heat.sort !== 'name') {
      const dir = S.heat.sort === 'high' ? -1 : 1;
      rows = rows.slice().sort((a, b) => { const x = avgOf(a), y = avgOf(b); if (x == null) return 1; if (y == null) return -1; return dir * (x - y); });
    }
    const statBy = {}; M.skillStats.forEach(s => (statBy[s.skill] = s));
    el.innerHTML =
      '<div class="view-head"><div><h2>Team skill heatmap</h2><p class="muted">Each VA’s latest self-rating, 1 (low) to 5 (high).</p></div>' +
        '<div class="toolbar">' +
          '<select id="hmCat" aria-label="Skill category"><option value="all">All categories</option>' + cats.map(c => '<option' + (c === S.heat.cat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
          '<select id="hmSort" aria-label="Sort VAs"><option value="name">Sort: name</option><option value="high"' + (S.heat.sort === 'high' ? ' selected' : '') + '>Sort: average high → low</option><option value="low"' + (S.heat.sort === 'low' ? ' selected' : '') + '>Sort: average low → high</option></select>' +
          '<label class="chip"><input type="checkbox" id="hmMissing"' + (S.heat.showMissing ? ' checked' : '') + '> Show not submitted</label>' +
        '</div></div>' +
      '<div class="card">' +
        '<div class="legend" style="margin-bottom:12px">' + [1, 2, 3, 4, 5].map(n => '<span><span class="sw r' + n + '"></span>' + n + ['', ' Beginner', ' Basic', ' Competent', ' Strong', ' Expert'][n] + '</span>').join('') + '<span><span class="sw" style="border:1px dashed var(--muted)"></span>No rating</span></div>' +
        '<div class="heat-wrap"><table class="heat"><thead><tr><th class="va-h">VA</th>' +
          skills.map(s => '<th class="skill-h" title="' + esc(s.name) + '"><span>' + esc(s.name) + '</span></th>').join('') + '<th class="skill-h"><span><strong>Average</strong></span></th></tr></thead><tbody>' +
          rows.map(n => {
            const a = avgOf(n);
            return '<tr><th class="va-h"><a href="#" data-profile="' + esc(n) + '" style="color:inherit">' + esc(n) + '</a></th>' + skills.map(s => {
              const v = rating(M, n, s.name);
              return v == null ? '<td class="cell na" data-tip="' + esc(n + ' · ' + s.name + ': no rating') + '">·</td>'
                : '<td class="cell r' + v + '" data-tip="' + esc(n + ' · ' + s.name + ': ' + v + ' / 5') + '">' + v + '</td>';
            }).join('') + '<td class="cell ' + (a == null ? 'na' : 'r3') + '" style="font-weight:700" data-tip="' + esc(n + ' average: ' + fmt1(a)) + '">' + fmt1(a) + '</td></tr>';
          }).join('') +
          '<tr class="avg"><th class="va-h">Team avg</th>' + skills.map(s => { const st = statBy[s.name]; return '<td class="' + (st.weak ? 'weak' : '') + '" data-tip="' + esc(s.name + ': ' + fmt1(st.avg) + ' avg' + (st.weak ? ' — weak spot' : '')) + '">' + (st.weak ? '▲' : '') + fmt1(st.avg) + '</td>'; }).join('') + '<td></td></tr>' +
        '</tbody></table></div>' +
        '<p class="hint">▲ marks a team weak spot (average below ' + WEAK + '.0). Click a VA name to open their profile.</p>' +
      '</div>';
    $('#hmCat').onchange = e => { S.heat.cat = e.target.value; render(); };
    $('#hmSort').onchange = e => { S.heat.sort = e.target.value; render(); };
    $('#hmMissing').onchange = e => { S.heat.showMissing = e.target.checked; render(); };
  }

  /* ---- Skills ---- */
  function rSkills(M, el) {
    const list = M.skillStats.slice().sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99));
    el.innerHTML =
      '<div class="view-head"><div><h2>Skills</h2><p class="muted">Average rating per skill, weakest first. Dashed line marks ' + WEAK + '.0.</p></div></div>' +
      '<div class="card">' + barList(list.map(s => ({ label: s.skill, value: s.avg, weak: s.weak, tip: s.skill + ': ' + fmt1(s.avg) + ' avg · ' + s.n + ' rating' + (s.n === 1 ? '' : 's') + (s.weak ? ' · weak spot' : '') }))) + '</div>' +
      '<div class="card"><h3>Top performers per skill</h3><p class="muted" style="margin:-6px 0 10px">Highest-rated VAs (4 or 5) — good candidates to train others.</p><div class="table-wrap"><table><thead><tr><th>Skill</th><th>Category</th><th class="num">Avg</th><th>Top performers</th></tr></thead><tbody>' +
        M.skillStats.map(s => '<tr><td>' + esc(s.skill) + (s.weak ? ' <span class="flag">▲ Weak spot</span>' : '') + '</td><td class="muted">' + esc(s.category) + '</td><td class="num">' + fmt1(s.avg) + '</td><td>' +
          (s.top.length ? '<div class="chips">' + s.top.map(n => '<span class="chip good">' + esc(n) + ' · ' + s.max + '</span>').join('') + '</div>' : '<span class="muted">No one rated 4+</span>') + '</td></tr>').join('') +
      '</tbody></table></div></div>';
  }

  /* ---- VA Profile ---- */
  function rProfile(M, el) {
    const names = M.people;
    if (!names.length) { el.innerHTML = '<div class="card empty">Add VAs to the VAs tab of the sheet.</div>'; return; }
    if (!names.some(n => n === S.profileVA)) S.profileVA = names[0];
    const va = S.profileVA, sub = M.byVA[norm(va)], a = vaAvg(M, va);
    const rated = S.data.skills.map(s => ({ skill: s.name, v: sub ? sub.ratings[s.name] : undefined })).filter(x => x.v != null);
    const strengths = rated.filter(x => x.v >= STRONG).sort((x, y) => y.v - x.v);
    const gaps = rated.filter(x => x.v < WEAK).sort((x, y) => x.v - y.v);
    const pairs = M.pairByVA[norm(va)] || [];
    const trainsOthers = S.data.pairings.filter(p => norm(p.trainer) === norm(va));
    el.innerHTML =
      '<div class="view-head"><div><h2>VA profile</h2><p class="muted">One VA’s full skill breakdown.</p></div>' +
        '<div class="toolbar"><select id="pfSel" aria-label="Choose VA">' + names.map(n => '<option' + (n === va ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div></div>' +
      '<div class="card"><div class="profile-head"><div class="avatar">' + esc(initials(va)) + '</div><div style="flex:1;min-width:180px"><h2>' + esc(va) + '</h2>' +
        '<div class="muted">' + (sub ? 'Submitted ' + fmtDate(sub.timestamp) + ' · average ' + fmt1(a) + ' / 5' : 'Has not submitted a skill rating yet') + '</div></div>' +
        '<button class="btn primary" id="pfPair">' + (pairs.length ? 'Edit trainer pairing' : 'Assign a trainer') + '</button></div></div>' +
      (sub ? '<div class="grid two">' +
        '<div class="card"><h3>Strengths <span class="muted">(4–5)</span></h3>' + (strengths.length ? '<div class="chips">' + strengths.map(x => '<span class="chip good">' + esc(x.skill) + ' · ' + x.v + '</span>').join('') + '</div>' : '<div class="empty">None rated 4 or higher.</div>') + '</div>' +
        '<div class="card"><h3>Areas to improve <span class="muted">(1–2)</span></h3>' + (gaps.length ? '<div class="chips">' + gaps.map(x => '<span class="chip weak">' + esc(x.skill) + ' · ' + x.v + '</span>').join('') + '</div>' : '<div class="empty">No skills rated below 3.</div>') + '</div>' +
      '</div>' : '') +
      '<div class="grid two">' +
        '<div class="card"><h3>All skills</h3>' + (sub ? barList(S.data.skills.map(s => ({ label: s.name, value: sub.ratings[s.name] ?? null, weak: sub.ratings[s.name] != null && sub.ratings[s.name] < WEAK, tip: s.name + ': ' + (sub.ratings[s.name] ?? 'no rating') })), { int: true }) : '<div class="empty">No ratings yet.</div>') + '</div>' +
        '<div class="card"><h3>Training</h3>' +
          (pairs.length ? pairs.map(p => '<p style="margin:0 0 8px"><strong>Trainer:</strong> ' + esc(p.trainer) + ' <span class="chip">' + (p.trainerType === 'External' ? 'External' : 'Team VA') + '</span></p><div class="chips">' + p.skills.map(s => '<span class="chip accent">' + esc(s) + '</span>').join('') + '</div>').join('<hr style="border:0;border-top:1px solid var(--border);margin:12px 0">') : '<div class="empty">No trainer assigned.</div>') +
          (trainsOthers.length ? '<p class="hint" style="margin-top:14px">Also training: ' + trainsOthers.map(p => esc(p.va) + ' (' + p.skills.map(esc).join(', ') + ')').join('; ') + '</p>' : '') +
        '</div></div>' +
      (function () {
        const subs = (S.data.submissions || []).filter(x => norm(x.va) === norm(va));
        if (!subs.length) return '';
        return '<div class="card"><div class="card-head"><h3>Submissions</h3><a href="#" id="pfResp">View in Responses →</a></div>' +
          '<div class="table-wrap"><table><thead><tr><th>Submitted</th><th class="num">Average</th><th>Comments</th></tr></thead><tbody>' +
          subs.map((x, i) => '<tr><td>' + fmtDateTime(x.timestamp) + (i === 0 ? ' <span class="chip accent">Latest</span>' : '') + '</td><td class="num">' + fmt1(subAvg(x)) + '</td><td>' + (x.comments ? esc(x.comments) : '<span class="muted">–</span>') + '</td></tr>').join('') +
          '</tbody></table></div></div>';
      })();
    if ($('#pfResp')) $('#pfResp').onclick = e => { e.preventDefault(); S.resp.q = va; S.resp.open = null; setView('responses'); };
    $('#pfSel').onchange = e => { S.profileVA = e.target.value; render(); };
    $('#pfPair').onclick = () => { const p = pairs[0]; startForm(p ? Object.assign({}, p) : { va, trainerType: 'VA', trainer: '', skills: gaps.map(g => g.skill) }); setView('pairings'); };
  }

  /* ---- Responses (every form submission) ---- */
  function rResponses(M, el) {
    const all = S.data.submissions || [];
    const latestKey = {}; all.forEach(x => { const k = norm(x.va); if (!(k in latestKey)) latestKey[k] = x; }); // list is newest first
    const q = norm(S.resp.q);
    let list = all.filter(x => !q || norm(x.va).includes(q) || norm(x.comments).includes(q));
    if (S.resp.latestOnly) list = list.filter(x => latestKey[norm(x.va)] === x);
    const skills = S.data.skills;
    el.innerHTML =
      '<div class="view-head"><div><h2>Responses</h2><p class="muted">Every skills-form submission, newest first' + (S.data.ratingsSource ? ' · source: ' + esc(S.data.ratingsSource) : '') + '.</p></div>' +
        '<div class="toolbar"><input type="text" id="rsQ" placeholder="Search name or comment" value="' + esc(S.resp.q) + '" style="width:220px">' +
          '<label class="chip"><input type="checkbox" id="rsLatest"' + (S.resp.latestOnly ? ' checked' : '') + '> Latest per VA only</label>' +
          '<button class="btn" id="rsCsv">Download CSV</button></div></div>' +
      '<div class="card">' +
        (list.length ? '<div class="table-wrap"><table class="resp"><thead><tr><th>Submitted</th><th>VA</th><th class="num">Average</th><th class="num">Below 3</th><th>Comments</th><th></th></tr></thead><tbody>' +
          list.map((x, i) => {
            const id = all.indexOf(x), open = S.resp.open === id, a = subAvg(x);
            const low = skills.filter(s => x.ratings[s.name] != null && x.ratings[s.name] < WEAK).length;
            const isLatest = latestKey[norm(x.va)] === x;
            return '<tr class="resp-row" data-open="' + id + '" style="cursor:pointer"><td style="white-space:nowrap">' + fmtDateTime(x.timestamp) + '</td>' +
              '<td style="white-space:nowrap"><strong>' + esc(x.va) + '</strong> ' + (isLatest ? '<span class="chip accent">Latest</span>' : '<span class="chip">Older</span>') + '</td>' +
              '<td class="num">' + fmt1(a) + '</td><td class="num">' + (low ? '<span class="flag">▲ ' + low + '</span>' : '0') + '</td>' +
              '<td>' + (x.comments ? esc(x.comments.length > 80 ? x.comments.slice(0, 80) + '…' : x.comments) : '<span class="muted">–</span>') + '</td>' +
              '<td style="white-space:nowrap"><button class="btn sm">' + (open ? 'Hide' : 'View') + '</button></td></tr>' +
              (open ? '<tr><td colspan="6" style="background:var(--surface-2)"><div style="padding:6px 2px">' +
                '<div class="chips" style="margin-bottom:10px">' + skills.map(s => { const v = x.ratings[s.name]; return '<span class="chip"' + (v != null ? '' : ' style="opacity:.6"') + '>' + esc(s.name) + ' <span class="r r' + (v || 3) + '" style="padding:0 6px;border-radius:4px;font-weight:600">' + (v ?? '–') + '</span></span>'; }).join('') + '</div>' +
                (x.comments ? '<p style="margin:0 0 8px"><strong>Comments:</strong> ' + esc(x.comments) + '</p>' : '') +
                '<a href="#" data-profile="' + esc(x.va) + '">Open ' + esc(x.va) + '’s profile →</a></div></td></tr>' : '');
          }).join('') + '</tbody></table></div>'
          : '<div class="empty">' + (all.length ? 'No submissions match your search.' : 'No submissions yet. Share the skills form with your VAs.') + '</div>') +
        '<p class="hint">' + list.length + ' of ' + all.length + ' submission' + (all.length === 1 ? '' : 's') + '. Click a row to see every rating.</p>' +
      '</div>';
    const qi = $('#rsQ');
    qi.oninput = () => { S.resp.q = qi.value; const pos = qi.selectionStart; render(); const n = $('#rsQ'); n.focus(); n.setSelectionRange(pos, pos); };
    $('#rsLatest').onchange = e => { S.resp.latestOnly = e.target.checked; render(); };
    el.querySelectorAll('.resp-row').forEach(r => (r.onclick = e => { if (e.target.closest('a')) return; const id = Number(r.dataset.open); S.resp.open = S.resp.open === id ? null : id; render(); }));
    $('#rsCsv').onclick = () => {
      const cell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const head = ['Submitted', 'VA', 'Latest'].concat(skills.map(s => s.name), ['Average', 'Comments']);
      const rows = list.map(x => [x.timestamp ? new Date(x.timestamp).toLocaleString() : '', x.va, latestKey[norm(x.va)] === x ? 'Y' : 'N']
        .concat(skills.map(s => x.ratings[s.name] ?? ''), [fmt1(subAvg(x)), x.comments || '']));
      const csv = [head].concat(rows).map(r => r.map(cell).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
      a.download = 'team-troy-responses.csv'; document.body.appendChild(a); a.click(); a.remove();
    };
  }

  /* ---- Pairings ---- */
  function startForm(p) { S.form = Object.assign({ id: null, va: '', trainer: '', trainerType: 'VA', skills: [] }, p); S.form.skills = (S.form.skills || []).slice(); }

  function rPairings(M, el) {
    if (!S.form) startForm({ va: M.people[0] || '' });
    const f = S.form, statBy = {}; M.skillStats.forEach(s => (statBy[s.skill] = s));
    const trainerOptions = M.people.filter(n => norm(n) !== norm(f.va));
    const picks = S.data.skills.map(s => {
      const v = rating(M, f.va, s.name), weak = v != null && v < WEAK;
      return '<label class="pick' + (weak ? ' is-weak' : '') + '"><input type="checkbox" value="' + esc(s.name) + '"' + (f.skills.includes(s.name) ? ' checked' : '') + '>' +
        '<span>' + esc(s.name) + '</span>' + (v != null ? '<span class="r r' + v + '" title="' + esc(f.va) + ' rated ' + v + '">' + v + '</span>' : '') + '</label>';
    }).join('');
    const sugg = f.skills.map(sk => { const st = statBy[sk]; return st && st.top.length ? '<div><strong>' + esc(sk) + ':</strong> ' + st.top.filter(n => norm(n) !== norm(f.va)).map(n => '<a href="#" data-trainer="' + esc(n) + '">' + esc(n) + '</a>').join(', ') + ' <span class="muted">(rated ' + st.max + ')</span></div>' : ''; }).filter(Boolean).join('');
    const rows = S.data.pairings.slice().sort((a, b) => a.va.localeCompare(b.va, undefined, { numeric: true }));

    el.innerHTML =
      '<div class="view-head"><div><h2>Trainer pairing</h2><p class="muted">Assign each VA a trainer and the skills to work on.</p></div></div>' +
      '<div class="grid pair-layout">' +
      '<form class="card form-grid" id="pairForm"><h3>' + (f.id ? 'Edit pairing' : 'New pairing') + '</h3>' +
        '<div class="field"><label for="fVA">VA to train</label><select id="fVA" required>' + M.people.map(n => '<option' + (n === f.va ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div>' +
        '<div class="field"><span class="label">Trainer</span><div class="seg" role="group" aria-label="Trainer type">' +
          '<button type="button" data-tt="VA" aria-pressed="' + (f.trainerType !== 'External') + '">Team VA</button><button type="button" data-tt="External" aria-pressed="' + (f.trainerType === 'External') + '">External person</button></div>' +
          '<div style="margin-top:8px">' + (f.trainerType === 'External'
            ? '<input type="text" id="fTrainer" placeholder="Trainer’s name" value="' + esc(f.trainer) + '" required>'
            : '<select id="fTrainer" required><option value="">Choose a VA…</option>' + trainerOptions.map(n => '<option' + (n === f.trainer ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>') + '</div>' +
          (sugg && f.trainerType !== 'External' ? '<div class="suggest"><div class="muted" style="margin-bottom:2px">Suggested (top rated in selected skills):</div>' + sugg + '</div>' : '') + '</div>' +
        '<div class="field"><span class="label">Target skills <span class="muted" style="font-weight:400">· number = this VA’s rating, red outline = below ' + WEAK + '</span></span><div class="skill-picks" id="fSkills">' + picks + '</div></div>' +
        '<div class="form-actions"><button type="submit" class="btn primary" id="fSave">' + (f.id ? 'Save changes' : 'Add pairing') + '</button>' + (f.id ? '<button type="button" class="btn" id="fCancel">Cancel</button>' : '') + '</div>' +
      '</form>' +
      '<div class="card"><div class="card-head"><h3>All pairings</h3><span class="muted num">' + rows.length + '</span></div>' +
        (rows.length ? '<div class="table-wrap"><table><thead><tr><th>VA</th><th>Trainer</th><th>Target skills</th><th></th></tr></thead><tbody>' +
          rows.map(p => '<tr><td><strong>' + esc(p.va) + '</strong><div class="muted" style="font-size:12px">' + fmtDate(p.date) + '</div></td><td>' + esc(p.trainer) + '<div class="muted" style="font-size:12px">' + (p.trainerType === 'External' ? 'External' : 'Team VA') + '</div></td>' +
            '<td><div class="chips">' + p.skills.map(s => '<span class="chip accent">' + esc(s) + '</span>').join('') + '</div></td>' +
            '<td style="white-space:nowrap"><button class="btn sm" data-edit="' + esc(p.id) + '">Edit</button> <button class="btn sm danger" data-del="' + esc(p.id) + '">Remove</button></td></tr>').join('') +
          '</tbody></table></div>' : '<div class="empty">No pairings yet. Use the form to add one.</div>') +
      '</div></div>';

    const readForm = () => { f.va = $('#fVA').value; f.trainer = $('#fTrainer').value.trim(); f.skills = Array.from(el.querySelectorAll('#fSkills input:checked')).map(i => i.value); };
    $('#fVA').onchange = () => { readForm(); if (norm(f.trainer) === norm(f.va)) f.trainer = ''; render(); };
    el.querySelectorAll('[data-tt]').forEach(b => (b.onclick = () => { readForm(); if (f.trainerType !== b.dataset.tt) { f.trainerType = b.dataset.tt; f.trainer = ''; } render(); }));
    $('#fSkills').onchange = () => { readForm(); render(); };
    el.querySelectorAll('[data-trainer]').forEach(a => (a.onclick = e => { e.preventDefault(); readForm(); f.trainer = a.dataset.trainer; render(); }));
    if ($('#fCancel')) $('#fCancel').onclick = () => { startForm({ va: f.va }); render(); };
    $('#pairForm').onsubmit = async e => {
      e.preventDefault(); readForm();
      if (!f.trainer) return toast('Choose or enter a trainer.', true);
      if (!f.skills.length) return toast('Pick at least one target skill.', true);
      const btn = $('#fSave'); btn.disabled = true; btn.textContent = 'Saving…';
      try {
        await api('savePairing', { pairing: { id: f.id, va: f.va, trainer: f.trainer, trainerType: f.trainerType, skills: f.skills } });
        toast(f.id ? 'Pairing updated' : 'Pairing added');
        startForm({ va: f.va }); await load();
      } catch (err) { toast('Could not save: ' + err.message, true); btn.disabled = false; btn.textContent = 'Retry'; }
    };
    el.querySelectorAll('[data-edit]').forEach(b => (b.onclick = () => { const p = S.data.pairings.find(x => x.id === b.dataset.edit); if (p) { startForm(p); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }));
    el.querySelectorAll('[data-del]').forEach(b => (b.onclick = async () => {
      const p = S.data.pairings.find(x => x.id === b.dataset.del); if (!p) return;
      if (!confirm('Remove the pairing ' + p.va + ' → ' + p.trainer + '?')) return;
      b.disabled = true;
      try { await api('deletePairing', { id: p.id }); toast('Pairing removed'); if (S.form && S.form.id === p.id) startForm({ va: p.va }); await load(); }
      catch (err) { toast('Could not remove: ' + err.message, true); b.disabled = false; }
    }));
  }

  /* ---------------- global events ---------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-profile]');
    if (a) { e.preventDefault(); S.profileVA = a.dataset.profile; setView('profile'); }
  });
  const tip = $('#tooltip');
  document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (!t) { tip.hidden = true; return; } tip.textContent = t.dataset.tip; tip.hidden = false; });
  document.addEventListener('mousemove', e => {
    if (tip.hidden) return;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14;
    if (y + h > innerHeight - 8) y = e.clientY - h - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  document.addEventListener('scroll', () => (tip.hidden = true), true);

  document.querySelectorAll('.tabs button').forEach(b => (b.onclick = () => setView(b.dataset.view)));
  $('#refreshBtn').onclick = load;
  $('#themeBtn').onclick = toggleTheme;
  $('#logoutBtn').onclick = logout;
  $('#loginForm').onsubmit = e => { e.preventDefault(); login($('#pw').value); };

  const saved = store.get(PW_KEY, true);
  if (DEMO) { S.pw = 'demo'; showApp(); }
  else if (saved) { S.pw = saved; showApp(); } // skip the extra login round-trip; load() logs out if the password changed
  else { $('#login').hidden = false; $('#pw').focus(); }
})();
