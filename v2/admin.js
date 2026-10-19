/* Team Troy Training Portal v2 — admin app. Runs inside the Google Apps Script web app. */
(function () {
  'use strict';

  /* ================= basics ================= */
  const BOOT = window.BOOT || {};
  const root = document.getElementById('root');
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nk = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const f1 = n => (n == null || isNaN(n) ? '–' : (Math.round(n * 10) / 10).toFixed(1));
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const DAY = 864e5;
  const fmtDate = iso => { if (!iso) return '–'; const d = new Date(iso); return isNaN(d) ? '–' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fmtShort = iso => { if (!iso) return '–'; const d = new Date(iso); return isNaN(d) ? '–' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  const ago = iso => {
    if (!iso) return 'never';
    const days = Math.floor((Date.now() - new Date(iso)) / DAY);
    if (days <= 0) return 'today'; if (days === 1) return 'yesterday';
    if (days < 30) return days + ' days ago'; if (days < 60) return 'a month ago';
    return Math.round(days / 30) + ' months ago';
  };
  const toInput = iso => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
  const first = n => String(n || '').replace(/^Sample · /, '').split(' ')[0];
  const initials = n => String(n || '?').replace(/^Sample · /, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#c98500', '#d55181', '#008300', '#6250d6', '#e34948'];
  const colorFor = id => { let h = 0; String(id).split('').forEach(c => (h = (h * 31 + c.charCodeAt(0)) >>> 0)); return PALETTE[h % PALETTE.length]; };
  const avatar = (p, cls) => '<span class="avatar ' + (cls || '') + '" style="--c:' + colorFor(p ? p.id : '?') + '" aria-hidden="true">' + esc(initials(p ? p.name : '?')) + '</span>';
  const scoreChip = v => (v == null ? '<span class="score" style="border:1px dashed var(--border-strong);color:var(--muted)">–</span>' : '<span class="score r' + v + '">' + v + '</span>');

  const I = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.7.1 4.5 1.7 5 4.4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  };
  const icon = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + '</svg>';

  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const setTheme = t => { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); };
  setTheme(store.get('tt2_theme'));

  /* ================= server calls ================= */
  const call = (fn, ...args) => new Promise((res, rej) => {
    const r = google.script.run.withSuccessHandler(res).withFailureHandler(e => rej(new Error((e && e.message) || String(e))));
    r[fn].apply(r, args);
  });
  let busyN = 0;
  function busy(on) {
    busyN += on ? 1 : -1;
    let bar = $('#busybar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'busybar'; bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:var(--accent);z-index:80;transition:width .6s ease, opacity .3s;width:0'; document.body.appendChild(bar); }
    if (busyN > 0) { bar.style.opacity = 1; bar.style.width = '70%'; } else { bar.style.width = '100%'; setTimeout(() => { if (busyN <= 0) { bar.style.opacity = 0; bar.style.width = '0'; } }, 250); }
  }
  async function act(fn, args, okMsg) {
    busy(true);
    try { S.d = await call(fn, ...args); M = model(S.d); render(); if (okMsg) toast(okMsg); return true; }
    catch (e) { toast(e.message, true); return false; }
    finally { busy(false); }
  }
  function toast(msg, err) {
    $$('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), err ? 5000 : 2600);
  }

  /* ================= state + model ================= */
  const S = { d: null, mx: { mode: 'cur', cat: 'all', sort: 'name' }, teamQ: '', showInactive: false, personTab: 'overview', rateDraft: null };
  let M = null;

  function model(d) {
    const pById = {}; d.people.forEach(p => (pById[p.id] = p));
    const people = d.people.filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const skills = d.skills.filter(s => s.active);
    const skillNames = skills.map(s => s.name);
    const L = {}, lastSelf = {}, lastMgr = {}, cyc = {};
    d.assessments.forEach(a => {
      if (!pById[a.personId]) return;
      const o = ((L[a.personId] = L[a.personId] || {})[a.skill] = L[a.personId][a.skill] || {});
      if (a.type === 'Self') {
        if (o.self != null && o.selfCycle !== a.cycle) o.prevSelf = o.self;
        o.self = a.score; o.selfTs = a.ts; o.selfCycle = a.cycle; lastSelf[a.personId] = a.ts;
      } else {
        if (o.mgr != null && o.mgrCycle !== a.cycle) o.prevMgr = o.mgr;
        o.mgr = a.score; o.mgrTs = a.ts; o.mgrCycle = a.cycle; lastMgr[a.personId] = a.ts;
      }
      const c = ((cyc[a.personId] = cyc[a.personId] || {})[a.cycle] = cyc[a.personId][a.cycle] || { Self: {}, Manager: {} });
      c[a.type][a.skill] = a.score;
    });
    const get = (pid, skill) => (L[pid] && L[pid][skill]) || {};
    const val = (pid, skill, mode) => {
      const o = get(pid, skill);
      if (mode === 'self') return o.self; if (mode === 'mgr') return o.mgr;
      if (mode === 'prev') return o.prevMgr != null ? o.prevMgr : o.prevSelf;
      if (mode === 'gap') return o.self != null && o.mgr != null ? o.self - o.mgr : undefined;
      return o.mgr != null ? o.mgr : o.self;
    };
    const pAvg = (pid, mode, list) => avg((list || skillNames).map(s => val(pid, s, mode)).filter(v => v != null));
    const history = pid => Object.keys(cyc[pid] || {}).sort().map(c => {
      const x = cyc[pid][c];
      return { cycle: c, self: avg(Object.values(x.Self)), mgr: avg(Object.values(x.Manager)), skills: x };
    });
    const teamSkill = skillNames.map(s => {
      const vals = people.map(p => val(p.id, s, 'cur')).filter(v => v != null);
      const prev = people.map(p => val(p.id, s, 'prev')).filter(v => v != null);
      const best = vals.length ? Math.max.apply(null, vals) : null;
      return { skill: s, avg: avg(vals), prev: avg(prev), n: vals.length, below: vals.filter(v => v < 3).length,
        top: best >= 4 ? people.filter(p => val(p.id, s, 'cur') === best).map(p => p.id) : [], best };
    });
    const tBy = {}; teamSkill.forEach(t => (tBy[t.skill] = t));
    const training = d.training.filter(t => pById[t.personId]);
    const activeTraining = training.filter(t => t.status !== 'Done');
    const now = new Date(d.now).getTime();
    const overdue = t => t.status !== 'Done' && t.due && new Date(t.due).getTime() < now - DAY / 2;
    const selfDue = pid => !lastSelf[pid] || now - new Date(lastSelf[pid]).getTime() > d.reassessDays * DAY;
    const needsMgr = pid => lastSelf[pid] && (!lastMgr[pid] || new Date(lastMgr[pid]) < new Date(lastSelf[pid]));
    return { pById, people, skills, skillNames, L, get, val, pAvg, history, teamSkill, tBy, training, activeTraining, overdue, selfDue, needsMgr, lastSelf, lastMgr, now };
  }

  /* ================= routing ================= */
  const routes = { home: rHome, team: rTeam, person: rPerson, matrix: rMatrix, training: rBoard, skills: rSkills, settings: rSettings };
  function parseHash() { const h = (location.hash || '#/home').replace(/^#\/?/, '').split('/'); return { name: routes[h[0]] ? h[0] : 'home', arg: h[1] ? decodeURIComponent(h[1]) : null }; }
  function go(name, arg) { location.hash = '#/' + name + (arg ? '/' + encodeURIComponent(arg) : ''); }
  window.addEventListener('hashchange', () => { closeModal(); render(); window.scrollTo(0, 0); });

  /* ================= frame ================= */
  function attentionItems() {
    const out = [];
    const d = S.d;
    M.people.forEach(p => {
      if (!M.lastSelf[p.id]) out.push({ sev: 'warn', icon: 'send', key: 'self0', p, title: '<b>' + esc(p.name) + '</b> hasn’t rated their skills yet', sub: 'Send their personal link', action: ['Copy link', 'copy', p.id] });
      else if (M.selfDue(p.id)) out.push({ sev: 'warn', icon: 'clock', key: 'selfdue', p, title: '<b>' + esc(p.name) + '</b> is due to re-rate themselves', sub: 'Last self-rating ' + ago(M.lastSelf[p.id]), action: ['Copy link', 'copy', p.id] });
      if (M.needsMgr(p.id)) out.push({ sev: 'info', icon: 'scale', key: 'mgr', p, title: 'Add your rating for <b>' + esc(p.name) + '</b>', sub: M.lastMgr[p.id] ? 'They re-rated themselves ' + ago(M.lastSelf[p.id]) : 'No manager rating yet', action: ['Rate', 'rate', p.id] });
      const gaps = M.skillNames.filter(s => Math.abs(M.val(p.id, s, 'gap') || 0) >= 2);
      if (gaps.length) out.push({ sev: 'info', icon: 'alert', key: 'gap', p, title: '<b>' + esc(p.name) + '</b> rates themselves very differently from you', sub: gaps.slice(0, 3).join(', ') + (gaps.length > 3 ? ' +' + (gaps.length - 3) : ''), action: ['Review', 'person', p.id] });
    });
    M.training.forEach(t => {
      const p = M.pById[t.personId];
      if (M.overdue(t)) out.push({ sev: 'crit', icon: 'clock', key: 'overdue', p, title: 'Training overdue: <b>' + esc(p.name) + '</b> · ' + esc(t.skills.join(', ')), sub: 'Was due ' + fmtDate(t.due) + ' · trainer ' + esc(t.trainer), action: ['Open', 'training', t.id] });
      else if (t.status === 'Ready to re-assess') out.push({ sev: 'good', icon: 'check', key: 'ready', p, title: '<b>' + esc(p.name) + '</b> is ready to be re-assessed', sub: esc(t.skills.join(', ')) + ' with ' + esc(t.trainer), action: ['Rate', 'rate', p.id] });
    });
    M.teamSkill.filter(s => s.avg != null && s.avg < 3).forEach(s => {
      const covered = M.activeTraining.some(t => t.skills.indexOf(s.skill) >= 0);
      if (!covered) out.push({ sev: 'warn', icon: 'star', key: 'weak', title: 'Team weak spot with no training: <b>' + esc(s.skill) + '</b>', sub: 'Team average ' + f1(s.avg) + ' · ' + s.below + ' below 3' + (s.top.length ? ' · best: ' + s.top.map(id => first(M.pById[id].name)).join(', ') : ''), action: ['Plan training', 'plan', s.skill] });
    });
    const rank = { crit: 0, warn: 1, info: 2, good: 3 };
    return out.sort((a, b) => rank[a.sev] - rank[b.sev]);
  }

  function frame(active, body) {
    const n = attentionItems().filter(a => a.sev === 'crit' || a.sev === 'warn').length;
    const nav = [['home', 'Home', 'home'], ['team', 'Team', 'team'], ['matrix', 'Skill matrix', 'grid'], ['training', 'Training', 'board'], ['skills', 'Skills', 'book'], ['settings', 'Settings', 'gear']];
    const brand = '<div class="brand"><span class="mark">' + esc(initials(S.d.team)) + '</span><div>' + esc(S.d.team) + '<small>Training Portal</small></div></div>';
    return '<div class="shell"><aside class="side">' + brand +
      '<nav class="nav">' + nav.map(([k, l, ic]) => '<a href="#/' + k + '" class="' + (active === k ? 'on' : '') + '">' + icon(ic) + l + (k === 'home' && n ? '<span class="count">' + n + '</span>' : '') + '</a>').join('') + '</nav>' +
      '<div class="side-foot"><button class="btn ghost sm" data-act="theme" style="justify-content:flex-start">' + icon('sun') + 'Light / dark</button><span>Signed in as<br><b class="t2" style="word-break:break-all">' + esc(S.d.me) + '</b></span></div></aside>' +
      '<div><div class="topbar">' + brand + '<span class="spacer"></span><button class="btn ghost icon" data-act="theme" aria-label="Toggle theme">' + icon('sun') + '</button></div>' +
      '<div class="mnav">' + nav.map(([k, l]) => '<a href="#/' + k + '" class="' + (active === k ? 'on' : '') + '">' + l + '</a>').join('') + '</div>' +
      '<main class="main">' + (S.d.hasSample ? '<div class="sample-banner">' + icon('alert').replace('<svg', '<svg style="width:18px;height:18px;flex:none;color:var(--warn)"') + '<span class="spacer">You’re looking at <b>sample data</b> (names start with “Sample ·”). Add your real team, then remove it.</span><a class="btn sm" href="#/settings">Remove sample data</a></div>' : '') + body + '</main></div></div>';
  }

  function render() {
    if (!S.d) return;
    const r = parseHash();
    root.innerHTML = frame(r.name === 'person' ? 'team' : r.name, routes[r.name](r.arg));
    const after = afterRender[r.name]; if (after) after(r.arg);
  }
  const afterRender = {};

  /* ================= HOME ================= */
  function rHome() {
    const d = S.d;
    const hr = new Date().getHours();
    const hello = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const n = M.people.length;
    const teamNow = avg(M.people.map(p => M.pAvg(p.id, 'cur')).filter(v => v != null));
    const teamPrev = avg(M.people.map(p => M.pAvg(p.id, 'prev')).filter(v => v != null));
    const delta = teamNow != null && teamPrev != null ? teamNow - teamPrev : null;
    const cyStart = (() => { const [y, q] = d.cycle.split('-Q').map(Number); return new Date(y, (q - 1) * 3, 1).getTime(); })();
    const selfThis = M.people.filter(p => M.lastSelf[p.id] && new Date(M.lastSelf[p.id]).getTime() >= cyStart).length;
    const mgrThis = M.people.filter(p => M.lastMgr[p.id] && new Date(M.lastMgr[p.id]).getTime() >= cyStart).length;
    const overdue = M.training.filter(M.overdue).length;
    const weak = M.teamSkill.filter(s => s.avg != null && s.avg < 3);
    const items = attentionItems();
    const ranked = M.teamSkill.filter(s => s.avg != null).sort((a, b) => a.avg - b.avg);

    const kpis = '<div class="grid g-4" style="margin-bottom:16px">' +
      kpi('Team skill level', f1(teamNow) + ' <small>/ 5</small>', delta == null ? 'Across ' + M.skills.length + ' skills' : deltaHtml(delta) + ' vs last cycle') +
      kpi('Rated this cycle (' + d.cycle.replace('-', ' ') + ')', selfThis + ' <small>of ' + n + '</small>', '<span>Your ratings: ' + mgrThis + ' of ' + n + '</span>', n ? selfThis / n : 0) +
      kpi('Active training', M.activeTraining.length, overdue ? '<span class="delta down">' + overdue + ' overdue</span>' : 'None overdue') +
      kpi('Team weak spots', weak.length, 'Skills averaging below 3.0') + '</div>';

    const attn = '<div class="card"><div class="card-head"><h3>Needs your attention</h3><span class="sub">' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span></div>' +
      (items.length ? '<div class="attn">' + items.slice(0, 10).map(a => '<div class="attn-item"><div class="attn-icon ' + a.sev + '">' + icon(a.icon) + '</div><div class="attn-body"><div>' + a.title + '</div><div class="small">' + a.sub + '</div></div>' +
        '<button class="btn sm" data-act="' + a.action[1] + '" data-arg="' + esc(a.action[2]) + '">' + a.action[0] + '</button></div>').join('') + '</div>' +
        (items.length > 10 ? '<p class="small muted" style="margin-top:10px">+' + (items.length - 10) + ' more</p>' : '')
        : '<div class="empty"><div class="big">All caught up</div>Nothing needs you right now.</div>') + '</div>';

    const weakCard = '<div class="card"><div class="card-head"><h3>Weakest skills</h3><a href="#/matrix" class="small">Open matrix</a></div>' +
      (ranked.length ? '<div class="stack" style="gap:10px">' + ranked.slice(0, 6).map(s => miniBar(s.skill, s.avg, s.prev)).join('') + '</div>' : '<div class="empty">No ratings yet.</div>') + '</div>';

    const feed = activity().slice(0, 7);
    const feedCard = '<div class="card"><div class="card-head"><h3>Recent activity</h3></div>' +
      (feed.length ? '<div class="attn">' + feed.map(e => '<div class="attn-item">' + (e.p ? avatar(e.p, 'sm') : '<span class="avatar sm" style="--c:var(--muted)">•</span>') + '<div class="attn-body"><div class="small" style="color:var(--text)">' + e.html + '</div><div class="small">' + ago(e.ts) + '</div></div></div>').join('') + '</div>' : '<div class="empty">Nothing yet.</div>') + '</div>';

    return '<div class="page-head"><div><h1>' + hello + '</h1><p>Here’s where ' + esc(d.team) + ' stands today.</p></div>' +
      '<div class="row"><button class="btn" data-act="newperson">' + icon('plus') + 'Add person</button><button class="btn primary" data-act="plan">' + icon('plus') + 'Plan training</button></div></div>' +
      kpis + '<div class="grid g-main">' + attn + '<div class="stack">' + weakCard + feedCard + '</div></div>';
  }
  function kpi(label, value, foot, meter) {
    return '<div class="card kpi"><div class="label">' + label + '</div><div class="value num">' + value + '</div>' +
      (meter != null ? '<div class="meter"><span style="width:' + Math.round(meter * 100) + '%"></span></div>' : '') + '<div class="foot">' + foot + '</div></div>';
  }
  function deltaHtml(dl) {
    if (dl == null) return '';
    const cls = dl > 0.05 ? 'up' : dl < -0.05 ? 'down' : 'flat';
    return '<span class="delta ' + cls + '">' + (dl > 0.05 ? '▲ +' : dl < -0.05 ? '▼ ' : '') + (cls === 'flat' ? '±0.0' : f1(dl)) + '</span>';
  }
  function miniBar(label, v, prev) {
    const w = v == null ? 0 : (v / 5) * 100;
    return '<div data-tip="' + esc(label + ': ' + f1(v) + (prev != null ? ' (last cycle ' + f1(prev) + ')' : '')) + '"><div class="row" style="justify-content:space-between;margin-bottom:5px"><span style="font-weight:520">' + esc(label) + '</span><span class="num small t2">' + f1(v) + (prev != null ? ' ' + deltaHtml(v - prev) : '') + '</span></div>' +
      '<div style="position:relative;height:8px;background:var(--surface-3);border-radius:4px"><div style="height:100%;width:' + w + '%;border-radius:4px;background:' + (v < 3 ? 'var(--crit)' : 'var(--accent)') + '"></div><div style="position:absolute;left:60%;top:-3px;bottom:-3px;border-left:1px dashed var(--muted)"></div></div></div>';
  }
  function activity() {
    const ev = [], seen = {};
    S.d.assessments.forEach(a => {
      const k = a.personId + a.type + a.ts.slice(0, 16);
      if (seen[k]) { seen[k].n++; return; }
      const p = M.pById[a.personId]; if (!p) return;
      seen[k] = { ts: a.ts, p, type: a.type, rater: a.rater, n: 1 }; ev.push(seen[k]);
    });
    ev.forEach(e => (e.html = e.type === 'Self' ? '<b>' + esc(e.p.name) + '</b> rated their skills (' + e.n + ')' : '<b>' + esc(first(e.rater.split('@')[0]) || 'An admin') + '</b> rated <b>' + esc(e.p.name) + '</b> (' + e.n + ' skills)'));
    S.d.checkins.forEach(c => { const t = S.d.training.find(x => x.id === c.trainingId); const p = t && M.pById[t.personId]; if (p) ev.push({ ts: c.date, p, html: 'Check-in on <b>' + esc(p.name) + '</b>: ' + esc(c.note.length > 70 ? c.note.slice(0, 70) + '…' : c.note) }); });
    S.d.training.forEach(t => { const p = M.pById[t.personId]; if (p && t.created) ev.push({ ts: t.created, p, html: 'Training planned for <b>' + esc(p.name) + '</b>: ' + esc(t.skills.join(', ')) }); });
    return ev.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  }

  /* ================= TEAM ================= */
  function rTeam() {
    const q = nk(S.teamQ);
    const list = (S.showInactive ? S.d.people.slice().sort((a, b) => a.name.localeCompare(b.name)) : M.people).filter(p => !q || nk(p.name).includes(q) || nk(p.role).includes(q));
    return '<div class="page-head"><div><h1>Team</h1><p>' + M.people.length + ' active ' + (M.people.length === 1 ? 'person' : 'people') + '. Click someone to see their skills, progress and training.</p></div>' +
      '<div class="row wrap"><input type="search" id="teamQ" placeholder="Search people" value="' + esc(S.teamQ) + '" style="width:200px">' +
      '<label class="chip" style="cursor:pointer"><input type="checkbox" id="showInactive"' + (S.showInactive ? ' checked' : '') + '> Show inactive</label>' +
      '<button class="btn primary" data-act="newperson">' + icon('plus') + 'Add person</button></div></div>' +
      (list.length ? '<div class="people">' + list.map(personCard).join('') + '</div>'
        : '<div class="card empty"><div class="big">' + (q ? 'No one matches “' + esc(S.teamQ) + '”' : 'No one here yet') + '</div>' + (q ? '' : 'Add your VAs, then send each one their personal link.') + '</div>');
  }
  afterRender.team = () => {
    const qi = $('#teamQ');
    qi.oninput = () => { S.teamQ = qi.value; const pos = qi.selectionStart; render(); const n = $('#teamQ'); n.focus(); n.setSelectionRange(pos, pos); };
    $('#showInactive').onchange = e => { S.showInactive = e.target.checked; render(); };
  };
  function personCard(p) {
    const cur = M.pAvg(p.id, 'cur'), prev = M.pAvg(p.id, 'prev');
    const hist = M.history(p.id);
    const tr = M.activeTraining.filter(t => t.personId === p.id);
    const status = !M.lastSelf[p.id] ? '<span class="chip warn">Not rated yet</span>' : M.selfDue(p.id) ? '<span class="chip warn">Re-rate due</span>' : '<span class="chip good">Rated ' + fmtShort(M.lastSelf[p.id]) + '</span>';
    return '<button class="pcard" data-act="person" data-arg="' + esc(p.id) + '"' + (p.active ? '' : ' style="opacity:.6"') + '>' +
      '<div class="row">' + avatar(p) + '<div style="min-width:0"><div class="name">' + esc(p.name) + '</div><div class="role">' + esc(p.role || 'Virtual Assistant') + (p.active ? '' : ' · inactive') + '</div></div></div>' +
      '<div class="row" style="align-items:flex-end"><div class="stats"><div class="stat"><div class="v">' + f1(cur) + '</div><div class="l">Current avg</div></div>' +
      '<div class="stat"><div class="v">' + (prev != null && cur != null ? deltaHtml(cur - prev) : '–') + '</div><div class="l">vs last cycle</div></div></div><span class="spacer"></span>' + spark(hist) + '</div>' +
      '<div class="chips">' + status + tr.slice(0, 2).map(t => '<span class="chip accent">' + esc(t.skills[0]) + (t.skills.length > 1 ? ' +' + (t.skills.length - 1) : '') + '</span>').join('') + '</div></button>';
  }
  function spark(hist) {
    const pts = hist.map(h => (h.mgr != null ? h.mgr : h.self)).filter(v => v != null);
    if (pts.length < 2) return '<span class="small muted">' + (pts.length ? '1 cycle' : '') + '</span>';
    const w = 90, h = 28, x = i => (i / (pts.length - 1)) * (w - 6) + 3, y = v => h - 3 - ((v - 1) / 4) * (h - 6);
    return '<svg class="spark" style="width:' + w + 'px" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + pts.map((v, i) => x(i) + ',' + y(v)).join(' ') + '"/><circle cx="' + x(pts.length - 1) + '" cy="' + y(pts[pts.length - 1]) + '" r="3" fill="var(--accent)"/></svg>';
  }

  /* ================= PERSON ================= */
  function rPerson(id) {
    const p = M.pById[id];
    if (!p) return '<div class="card empty"><div class="big">Person not found</div><a href="#/team">Back to team</a></div>';
    const tab = S.personTab;
    const cur = M.pAvg(p.id, 'cur');
    const tabs = [['overview', 'Skills'], ['progress', 'Progress'], ['training', 'Training'], ['rate', 'Rate ' + first(p.name)]];
    let body = '';
    if (tab === 'overview') body = personSkills(p);
    else if (tab === 'progress') body = personProgress(p);
    else if (tab === 'training') body = personTraining(p);
    else body = rateForm(p);
    return '<div class="page-head"><div class="row" style="gap:16px">' + avatar(p, 'lg') + '<div><a href="#/team" class="small">← Team</a><h1 style="margin-top:2px">' + esc(p.name) + '</h1>' +
      '<p>' + esc(p.role || 'Virtual Assistant') + (p.email ? ' · ' + esc(p.email) : '') + ' · Self-rated ' + ago(M.lastSelf[p.id]) + ' · Your rating ' + ago(M.lastMgr[p.id]) + '</p></div></div>' +
      '<div class="row wrap"><button class="btn" data-act="copy" data-arg="' + esc(p.id) + '">' + icon('link') + 'Copy personal link</button><button class="btn" data-act="editperson" data-arg="' + esc(p.id) + '">' + icon('edit') + 'Edit</button>' +
      '<button class="btn primary" data-act="plan" data-arg="" data-person="' + esc(p.id) + '">' + icon('plus') + 'Plan training</button></div></div>' +
      '<div class="grid g-4" style="margin-bottom:18px">' +
      kpi('Current level', f1(cur) + ' <small>/ 5</small>', M.pAvg(p.id, 'prev') != null ? deltaHtml(cur - M.pAvg(p.id, 'prev')) + ' vs last cycle' : 'Manager rating where available') +
      kpi('Self-rating avg', f1(M.pAvg(p.id, 'self')), 'How they see themselves') +
      kpi('Your rating avg', f1(M.pAvg(p.id, 'mgr')), M.lastMgr[p.id] ? 'Last on ' + fmtShort(M.lastMgr[p.id]) : 'Not rated yet') +
      kpi('Training', M.activeTraining.filter(t => t.personId === p.id).length + ' <small>active</small>', S.d.training.filter(t => t.personId === p.id && t.status === 'Done').length + ' completed') + '</div>' +
      '<div class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" aria-selected="' + (k === tab) + '" data-act="ptab" data-arg="' + k + '">' + esc(l) + '</button>').join('') + '</div>' + body;
  }
  afterRender.person = id => {
    if (S.personTab === 'rate') wireRate(id);
    if (S.personTab === 'training') wireCheckinForms();
    const lc = $('#lc'); if (lc) lc.innerHTML = lineChart(M.history(id), lc.clientWidth);
  };
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const lc = $('#lc'), r = parseHash(); if (lc && r.name === 'person') lc.innerHTML = lineChart(M.history(r.arg), lc.clientWidth); }, 150); });

  function personSkills(p) {
    const byCat = {};
    M.skills.forEach(s => (byCat[s.category] = byCat[s.category] || []).push(s));
    const rated = M.skillNames.filter(s => M.val(p.id, s, 'cur') != null);
    if (!rated.length) return '<div class="card empty"><div class="big">No ratings yet</div>Copy their personal link and send it to them, or rate them yourself.<div class="row" style="justify-content:center;margin-top:14px"><button class="btn" data-act="copy" data-arg="' + esc(p.id) + '">' + icon('link') + 'Copy personal link</button><button class="btn primary" data-act="ptab" data-arg="rate">Rate now</button></div></div>';
    const strengths = rated.filter(s => M.val(p.id, s, 'cur') >= 4).sort((a, b) => M.val(p.id, b, 'cur') - M.val(p.id, a, 'cur'));
    const gaps = rated.filter(s => M.val(p.id, s, 'cur') < 3).sort((a, b) => M.val(p.id, a, 'cur') - M.val(p.id, b, 'cur'));
    const pct = v => ((v - 1) / 4) * 100;
    const rows = Object.keys(byCat).map(cat => '<div class="cat-title">' + esc(cat) + '</div>' + byCat[cat].map(s => {
      const o = M.get(p.id, s.name);
      const pts = [];
      if (o.self != null && o.mgr != null) pts.push('<span class="link" style="left:' + Math.min(pct(o.self), pct(o.mgr)) + '%;width:' + Math.abs(pct(o.self) - pct(o.mgr)) + '%"></span>');
      if (o.mgr != null) pts.push('<span class="pt mgr" style="left:' + pct(o.mgr) + '%"></span>');
      if (o.self != null) pts.push('<span class="pt self" style="left:' + pct(o.self) + '%"></span>');
      const tip = s.name + ' · self ' + (o.self || '–') + ' · you ' + (o.mgr || '–') + (o.prevSelf || o.prevMgr ? ' · last cycle ' + (o.prevMgr || o.prevSelf) : '');
      return '<div class="sk-row" data-tip="' + esc(tip) + '"><div class="sk-name">' + esc(s.name) + '</div><div class="sk-track"><span class="rail"></span>' + [0, 25, 50, 75, 100].map(x => '<span class="tick" style="left:' + x + '%"></span>').join('') + pts.join('') + '</div>' +
        '<div class="sk-val">' + (o.self != null ? o.self : '–') + ' / ' + (o.mgr != null ? o.mgr : '–') + '</div></div>';
    }).join('')).join('');
    return '<div class="grid g-main"><div class="card"><div class="card-head"><h3>All skills</h3><div class="legend"><span><span class="sw" style="background:var(--self)"></span>Self</span><span><span class="sw sq" style="background:var(--mgr)"></span>Your rating</span></div></div>' +
      '<div class="axis5"><span></span><div class="t">' + [1, 2, 3, 4, 5].map((n, i) => '<span style="left:' + i * 25 + '%">' + n + '</span>').join('') + '</div><span class="small" style="text-align:right">self / you</span></div>' +
      '<div class="sk">' + rows + '</div></div>' +
      '<div class="stack"><div class="card"><h3 style="margin-bottom:12px">Strengths</h3>' + (strengths.length ? '<div class="chips">' + strengths.map(s => '<span class="chip good">' + esc(s) + ' · ' + M.val(p.id, s, 'cur') + '</span>').join('') + '</div>' : '<p class="muted small">Nothing at 4+ yet.</p>') + '</div>' +
      '<div class="card"><h3 style="margin-bottom:12px">Areas to improve</h3>' + (gaps.length ? '<div class="chips">' + gaps.map(s => '<span class="chip crit">' + esc(s) + ' · ' + M.val(p.id, s, 'cur') + '</span>').join('') + '</div><button class="btn sm" style="margin-top:14px" data-act="plan" data-person="' + esc(p.id) + '" data-arg="' + esc(gaps.slice(0, 2).join('|')) + '">' + icon('plus') + 'Plan training for these</button>' : '<p class="muted small">No skills below 3.</p>') + '</div>' +
      '<div class="card"><h3 style="margin-bottom:6px">Can train others in</h3><p class="small muted" style="margin-bottom:10px">Skills where they are among the team’s best (4+).</p>' +
      (() => { const t = M.teamSkill.filter(s => s.top.indexOf(p.id) >= 0); return t.length ? '<div class="chips">' + t.map(s => '<span class="chip accent">' + esc(s.skill) + '</span>').join('') + '</div>' : '<p class="muted small">Not yet.</p>'; })() + '</div></div></div>';
  }

  function personProgress(p) {
    const hist = M.history(p.id);
    if (!hist.length) return '<div class="card empty"><div class="big">No history yet</div>Progress appears after their first rating.</div>';
    const cycles = hist.map(h => h.cycle);
    const table = '<div class="table-wrap"><table><thead><tr><th>Skill</th>' + cycles.map(c => '<th class="num" style="text-align:center">' + esc(c.replace('-', ' ')) + '</th>').join('') + '<th class="num" style="text-align:center">Change</th></tr></thead><tbody>' +
      M.skills.map(s => {
        const vals = hist.map(h => (h.skills.Manager[s.name] != null ? h.skills.Manager[s.name] : h.skills.Self[s.name]));
        const firstV = vals.find(v => v != null), lastV = vals.slice().reverse().find(v => v != null);
        return '<tr><td>' + esc(s.name) + '</td>' + vals.map(v => '<td style="text-align:center">' + scoreChip(v) + '</td>').join('') + '<td style="text-align:center">' + (firstV != null && lastV != null && vals.filter(v => v != null).length > 1 ? deltaHtml(lastV - firstV) : '<span class="muted">–</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return '<div class="stack"><div class="card"><div class="card-head"><h3>Average rating by cycle</h3><div class="legend"><span><span class="sw" style="background:var(--self)"></span>Self</span><span><span class="sw sq" style="background:var(--mgr)"></span>Your rating</span></div></div><div id="lc" style="min-height:240px"></div></div>' +
      '<div class="card"><div class="card-head"><h3>Every skill, every cycle</h3><span class="sub">Your rating where available, otherwise self</span></div>' + table + '</div></div>';
  }
  function lineChart(hist, width) {
    const W = Math.max(280, Math.round(width || 640)), H = 240, L = 30, R = 78, T = 14, Bm = 30;
    const n = hist.length;
    const x = i => (n === 1 ? L + (W - L - R) / 2 : L + (i / (n - 1)) * (W - L - R));
    const y = v => T + (1 - (v - 1) / 4) * (H - T - Bm);
    let g = '';
    [1, 2, 3, 4, 5].forEach(v => (g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--border)" stroke-width="1"' + (v === 3 ? ' stroke-dasharray="4 4" stroke="var(--border-strong)"' : '') + '/><text x="' + (L - 10) + '" y="' + (y(v) + 4) + '" font-size="11" text-anchor="end" fill="var(--muted)">' + v + '</text>'));
    hist.forEach((h, i) => (g += '<text x="' + x(i) + '" y="' + (H - 8) + '" font-size="11" text-anchor="middle" fill="var(--muted)">' + esc(h.cycle.replace('-', ' ')) + '</text>'));
    const series = [['self', 'var(--self)', 'Self'], ['mgr', 'var(--mgr)', 'You']];
    // end labels: keep at least 15px apart
    const ends = series.map(([k]) => { const pts = hist.map((h, i) => [i, h[k]]).filter(p => p[1] != null); return pts.length ? y(pts[pts.length - 1][1]) : null; });
    if (ends[0] != null && ends[1] != null && Math.abs(ends[0] - ends[1]) < 15) { const mid = (ends[0] + ends[1]) / 2, up = ends[0] <= ends[1] ? 0 : 1; ends[up] = mid - 8; ends[1 - up] = mid + 8; }
    series.forEach(([k, col, lab], si) => {
      const pts = hist.map((h, i) => [i, h[k]]).filter(p => p[1] != null);
      if (!pts.length) return;
      g += '<polyline fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + pts.map(p => x(p[0]) + ',' + y(p[1])).join(' ') + '"/>';
      pts.forEach(p => (g += (k === 'self' ? '<circle cx="' + x(p[0]) + '" cy="' + y(p[1]) + '" r="5"' : '<rect x="' + (x(p[0]) - 4.5) + '" y="' + (y(p[1]) - 4.5) + '" width="9" height="9" rx="2"') + ' fill="' + col + '" stroke="var(--surface)" stroke-width="2" data-tip="' + esc(lab + ' · ' + hist[p[0]].cycle + ': ' + f1(p[1])) + '"/>'));
      const lp = pts[pts.length - 1];
      g += '<text x="' + (x(lp[0]) + 10) + '" y="' + (ends[si] + 4) + '" font-size="12" font-weight="600" fill="var(--text-2)">' + lab + ' ' + f1(lp[1]) + '</text>';
    });
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;max-width:100%" role="img" aria-label="Average rating per cycle">' + g + '</svg>';
  }

  function personTraining(p) {
    const mine = S.d.training.filter(t => t.personId === p.id);
    const asTrainer = S.d.training.filter(t => t.trainerPersonId === p.id && t.status !== 'Done');
    return '<div class="stack">' + (mine.length ? mine.map(trainingDetail).join('') : '<div class="card empty"><div class="big">No training yet</div><button class="btn primary" style="margin-top:10px" data-act="plan" data-person="' + esc(p.id) + '">' + icon('plus') + 'Plan training</button></div>') +
      (asTrainer.length ? '<div class="card"><h3 style="margin-bottom:10px">Currently training others</h3><div class="chips">' + asTrainer.map(t => '<span class="chip accent">' + esc(M.pById[t.personId] ? M.pById[t.personId].name : '?') + ' · ' + esc(t.skills.join(', ')) + '</span>').join('') + '</div></div>' : '') + '</div>';
  }
  function trainingDetail(t) {
    const p = M.pById[t.personId];
    const cks = S.d.checkins.filter(c => c.trainingId === t.id);
    const progress = t.skills.map(s => { const o = M.get(t.personId, s); const now = o.mgr != null ? o.mgr : o.self; return '<span class="chip">' + esc(s) + ' ' + scoreChip(now) + (t.targetLevel ? ' <span class="muted">→ ' + t.targetLevel + '</span>' : '') + '</span>'; }).join('');
    return '<div class="card"><div class="card-head"><div class="row">' + statusChip(t) + '<h3>' + esc(t.skills.join(', ')) + '</h3></div><div class="row"><button class="btn sm" data-act="edittraining" data-arg="' + esc(t.id) + '">Edit</button></div></div>' +
      '<p class="t2" style="margin-bottom:10px">' + esc(p ? p.name : '') + ' with <b>' + esc(t.trainer) + '</b> (' + (t.trainerType === 'External' ? 'external' : 'team member') + ') · ' + (t.due ? 'due ' + fmtDate(t.due) : 'no due date') + (M.overdue(t) ? ' <span class="chip crit">Overdue</span>' : '') + '</p>' +
      '<div class="chips" style="margin-bottom:14px">' + progress + '</div>' +
      '<div class="row wrap" style="margin-bottom:14px">' + S.d.statuses.map(s => '<button class="btn sm' + (s === t.status ? ' primary' : '') + '" data-act="move" data-arg="' + esc(t.id) + '" data-status="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' +
      '<h4 style="margin-bottom:8px">Check-ins</h4>' +
      (cks.length ? '<div class="attn" style="margin-bottom:10px">' + cks.map(c => '<div class="attn-item"><div class="attn-body"><div>' + esc(c.note) + '</div><div class="small">' + fmtDate(c.date) + ' · ' + esc(c.author.split('@')[0]) + '</div></div></div>').join('') + '</div>' : '<p class="small muted" style="margin-bottom:10px">No notes yet.</p>') +
      '<form class="row ckform" data-id="' + esc(t.id) + '"><input type="text" placeholder="Add a check-in note…" maxlength="500"><button class="btn" type="submit">Add</button></form></div>';
  }
  function wireCheckinForms() {
    $$('.ckform').forEach(f => (f.onsubmit = async e => { e.preventDefault(); const v = $('input', f).value.trim(); if (!v) return; await act('apiAddCheckin', [f.dataset.id, v], 'Check-in added'); }));
  }
  const statusColor = { Planned: 'var(--muted)', 'In training': 'var(--accent)', 'Ready to re-assess': 'var(--warn)', Done: 'var(--good)' };
  const statusChip = t => '<span class="chip"><span class="dot" style="background:' + statusColor[t.status] + '"></span>' + esc(t.status) + '</span>';

  /* ---- manager rating form ---- */
  function rateForm(p) {
    if (!S.rateDraft || S.rateDraft.pid !== p.id) {
      const sc = {}; M.skillNames.forEach(s => { const o = M.get(p.id, s); if (o.mgr != null) sc[s] = o.mgr; });
      S.rateDraft = { pid: p.id, scores: sc, touched: {} };
    }
    const dr = S.rateDraft;
    const byCat = {}; M.skills.forEach(s => (byCat[s.category] = byCat[s.category] || []).push(s));
    const names = S.d.levelNames;
    const done = Object.keys(dr.scores).length;
    return '<div class="card" style="margin-bottom:14px"><div class="row wrap"><div class="spacer"><h3>Your rating for ' + esc(first(p.name)) + '</h3><p class="small muted" style="margin-top:3px">Pre-filled with your last rating. The <span style="color:var(--mgr);font-weight:600">orange line</span> marks what ' + esc(first(p.name)) + ' gave themselves.</p></div>' +
      '<span class="small t2 num" id="rateCount">' + done + ' of ' + M.skills.length + ' rated</span></div></div>' +
      '<div class="rate-list">' + Object.keys(byCat).map(cat => '<div class="cat-title">' + esc(cat) + '</div>' + byCat[cat].map(s => {
        const o = M.get(p.id, s.name), v = dr.scores[s.name];
        return '<div class="rate' + (v ? ' done' : '') + '" data-skill="' + esc(s.name) + '"><div class="rate-top"><span class="nm">' + esc(s.name) + '</span><span class="hint">Self: ' + (o.self || '–') + ' · Your last: ' + (o.mgr || '–') + '</span></div>' +
          '<div class="picks">' + [1, 2, 3, 4, 5].map(n => '<button type="button" class="pick' + (o.self === n ? ' was' : '') + '" aria-pressed="' + (v === n) + '" data-n="' + n + '" title="' + esc(s.levels[n - 1]) + '"><b>' + n + '</b><span>' + names[n - 1] + '</span></button>').join('') + '</div>' +
          '<div class="desc">' + (v ? '<b>' + v + ' · ' + names[v - 1] + ':</b> ' + esc(s.levels[v - 1]) : '<span class="muted">Hover or pick a level to see what it means.</span>') + '</div></div>';
      }).join('')).join('') + '</div>' +
      '<div class="card" style="margin-top:14px"><label class="field">Note (optional)<textarea id="rateNote" placeholder="Anything worth remembering about this review"></textarea></label>' +
      '<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-act="ptab" data-arg="overview">Cancel</button><button class="btn primary" id="rateSave">Save rating</button></div></div>';
  }
  function wireRate(pid) {
    const dr = S.rateDraft, names = S.d.levelNames;
    $$('.rate').forEach(card => {
      const skill = card.dataset.skill, s = M.skills.find(x => x.name === skill);
      const desc = $('.desc', card);
      const show = n => (desc.innerHTML = n ? '<b>' + n + ' · ' + names[n - 1] + ':</b> ' + esc(s.levels[n - 1]) : '<span class="muted">Hover or pick a level to see what it means.</span>');
      $$('.pick', card).forEach(b => {
        b.onmouseenter = () => show(Number(b.dataset.n));
        b.onmouseleave = () => show(dr.scores[skill]);
        b.onclick = () => {
          dr.scores[skill] = Number(b.dataset.n); dr.touched[skill] = true;
          $$('.pick', card).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          card.classList.add('done'); show(dr.scores[skill]);
          $('#rateCount').textContent = Object.keys(dr.scores).length + ' of ' + M.skills.length + ' rated';
        };
      });
    });
    $('#rateSave').onclick = async () => {
      if (!Object.keys(dr.scores).length) return toast('Pick a level for at least one skill.', true);
      const ok = await act('apiSaveManagerRatings', [pid, dr.scores, $('#rateNote').value], 'Rating saved');
      if (ok) { S.rateDraft = null; S.personTab = 'overview'; render(); }
    };
  }

  /* ================= MATRIX ================= */
  function rMatrix() {
    const cats = Array.from(new Set(M.skills.map(s => s.category)));
    const skills = M.skills.filter(s => S.mx.cat === 'all' || s.category === S.mx.cat);
    const mode = S.mx.mode;
    const rowAvg = p => (mode === 'gap' ? avg(skills.map(s => M.val(p.id, s.name, 'gap')).filter(v => v != null)) : M.pAvg(p.id, mode, skills.map(s => s.name)));
    let people = M.people.slice();
    if (S.mx.sort !== 'name') people.sort((a, b) => { const x = rowAvg(a), y = rowAvg(b); if (x == null) return 1; if (y == null) return -1; return S.mx.sort === 'high' ? y - x : x - y; });
    const cls = v => (v == null ? 'na' : mode === 'gap' ? (v >= 2 ? 'gm2' : v === 1 ? 'gm1' : v === 0 ? 'g0' : v === -1 ? 'gp1' : 'gp2') : 'r' + v);
    const label = v => (v == null ? '·' : mode === 'gap' ? (v > 0 ? '+' + v : String(v)) : v);
    const modeName = { cur: 'Current', self: 'Self', mgr: 'Your rating', gap: 'Gap' }[mode];
    const legend = mode === 'gap'
      ? '<span><span class="sw sq gm2"></span>Rates self 2+ higher</span><span><span class="sw sq gm1"></span>+1</span><span><span class="sw sq g0"></span>Agree</span><span><span class="sw sq gp1"></span>−1</span><span><span class="sw sq gp2"></span>Rates self 2+ lower</span>'
      : [1, 2, 3, 4, 5].map(n => '<span><span class="sw sq r' + n + '"></span>' + n + ' ' + S.d.levelNames[n - 1] + '</span>').join('');
    const colAvg = s => { const v = people.map(p => M.val(p.id, s.name, mode)).filter(x => x != null); return avg(v); };
    return '<div class="page-head"><div><h1>Skill matrix</h1><p>Everyone against every skill. “Current” uses your rating where you’ve given one, otherwise the VA’s own.</p></div>' +
      '<div class="row wrap"><div class="seg" role="group" aria-label="View">' + [['cur', 'Current'], ['self', 'Self'], ['mgr', 'Yours'], ['gap', 'Gap']].map(([k, l]) => '<button data-act="mxmode" data-arg="' + k + '" aria-pressed="' + (mode === k) + '">' + l + '</button>').join('') + '</div>' +
      '<select id="mxCat" aria-label="Category" style="width:auto"><option value="all">All categories</option>' + cats.map(c => '<option' + (c === S.mx.cat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
      '<select id="mxSort" aria-label="Sort" style="width:auto"><option value="name">Sort by name</option><option value="high"' + (S.mx.sort === 'high' ? ' selected' : '') + '>Highest first</option><option value="low"' + (S.mx.sort === 'low' ? ' selected' : '') + '>Lowest first</option></select></div></div>' +
      '<div class="card"><div class="legend" style="margin-bottom:14px">' + legend + '<span><span class="sw sq" style="border:1px dashed var(--border-strong)"></span>No rating</span></div>' +
      (people.length ? '<div class="mx-wrap"><table class="mx"><thead><tr><th class="ph"></th>' + skills.map(s => '<th class="sh" title="' + esc(s.name) + '"><span>' + esc(s.name) + '</span></th>').join('') + '<th class="sh"><span><b>Average</b></span></th></tr></thead><tbody>' +
        people.map(p => '<tr><th class="ph"><span class="who" data-act="person" data-arg="' + esc(p.id) + '">' + avatar(p, 'sm') + '<span>' + esc(p.name) + '</span></span></th>' +
          skills.map(s => { const v = M.val(p.id, s.name, mode); const o = M.get(p.id, s.name); return '<td class="c ' + cls(v) + '" data-tip="' + esc(p.name + ' · ' + s.name + ' — self ' + (o.self || '–') + ', you ' + (o.mgr || '–')) + '">' + label(v) + '</td>'; }).join('') +
          '<td class="c" style="background:var(--surface-2);font-weight:700">' + (mode === 'gap' ? (rowAvg(p) == null ? '–' : (rowAvg(p) > 0 ? '+' : '') + f1(rowAvg(p))) : f1(rowAvg(p))) + '</td></tr>').join('') +
        (mode === 'gap' ? '' : '<tr class="avg"><th class="ph small t2">Team avg</th>' + skills.map(s => { const a = colAvg(s); return '<td class="' + (a != null && a < 3 ? 'weak' : '') + '" data-tip="' + esc(s.name + ': team ' + modeName + ' average ' + f1(a)) + '">' + (a != null && a < 3 ? '▲' : '') + f1(a) + '</td>'; }).join('') + '<td></td></tr>') +
        '</tbody></table></div><p class="small muted" style="margin-top:12px">' + (mode === 'gap' ? 'Gap = self-rating minus your rating. Big positive gaps often need coaching; big negative gaps are hidden strengths.' : '▲ marks a team weak spot (average below 3).') + '</p>'
        : '<div class="empty">Add people to see the matrix.</div>') + '</div>';
  }
  afterRender.matrix = () => {
    $('#mxCat').onchange = e => { S.mx.cat = e.target.value; render(); };
    $('#mxSort').onchange = e => { S.mx.sort = e.target.value; render(); };
  };

  /* ================= TRAINING BOARD ================= */
  function rBoard() {
    const cols = S.d.statuses;
    return '<div class="page-head"><div><h1>Training</h1><p>Drag cards between columns, or use the arrows. When someone is ready, re-rate them to see the impact.</p></div>' +
      '<button class="btn primary" data-act="plan">' + icon('plus') + 'Plan training</button></div>' +
      '<div class="board">' + cols.map((c, ci) => {
        const items = M.training.filter(t => t.status === c).sort((a, b) => String(a.due || '9').localeCompare(String(b.due || '9')));
        return '<div class="col" data-status="' + esc(c) + '"><div class="col-head"><span class="dot" style="background:' + statusColor[c] + '"></span>' + esc(c) + '<span class="n">' + items.length + '</span></div>' +
          items.map(t => {
            const p = M.pById[t.personId];
            const od = M.overdue(t);
            return '<div class="tcard" draggable="true" data-id="' + esc(t.id) + '"><div class="who">' + avatar(p, 'sm') + '<div style="min-width:0"><div style="font-weight:600">' + esc(p.name) + '</div><div class="small muted">with ' + esc(t.trainer) + '</div></div></div>' +
              '<div class="chips">' + t.skills.map(s => { const o = M.get(t.personId, s); const v = o.mgr != null ? o.mgr : o.self; return '<span class="chip">' + esc(s) + ' ' + scoreChip(v) + (t.targetLevel ? '<span class="muted">→' + t.targetLevel + '</span>' : '') + '</span>'; }).join('') + '</div>' +
              '<div class="meta' + (od ? ' overdue' : '') + '"><span>' + (t.due ? (od ? 'Overdue · ' : 'Due ') + fmtShort(t.due) : 'No due date') + '</span><span class="moves">' +
              (ci > 0 ? '<button class="btn ghost sm icon" data-act="move" data-arg="' + esc(t.id) + '" data-status="' + esc(cols[ci - 1]) + '" aria-label="Move back">' + icon('left') + '</button>' : '') +
              '<button class="btn ghost sm" data-act="edittraining" data-arg="' + esc(t.id) + '">Open</button>' +
              (ci < cols.length - 1 ? '<button class="btn ghost sm icon" data-act="move" data-arg="' + esc(t.id) + '" data-status="' + esc(cols[ci + 1]) + '" aria-label="Move forward">' + icon('right') + '</button>' : '') + '</span></div></div>';
          }).join('') + (items.length ? '' : '<div class="small muted" style="padding:10px 6px">Nothing here.</div>') + '</div>';
      }).join('') + '</div>';
  }
  afterRender.training = () => {
    $$('.tcard').forEach(c => {
      c.ondragstart = e => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('dragging'); };
      c.ondragend = () => c.classList.remove('dragging');
    });
    $$('.col').forEach(col => {
      col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
      col.ondragleave = () => col.classList.remove('over');
      col.ondrop = e => {
        e.preventDefault(); col.classList.remove('over');
        const id = e.dataTransfer.getData('text/plain'); const t = S.d.training.find(x => x.id === id);
        if (t && t.status !== col.dataset.status) moveTraining(id, col.dataset.status);
      };
    });
  };
  function moveTraining(id, status) {
    const t = S.d.training.find(x => x.id === id); if (!t) return;
    t.status = status; M = model(S.d); render(); // optimistic
    act('apiMoveTraining', [id, status], 'Moved to ' + status);
  }

  /* ================= SKILLS ================= */
  function rSkills() {
    const all = S.d.skills;
    return '<div class="page-head"><div><h1>Skills</h1><p>Each skill has a short description per level, so a 3 means the same thing for everyone. VAs see these when rating themselves.</p></div>' +
      '<button class="btn primary" data-act="editskill" data-arg="">' + icon('plus') + 'Add skill</button></div>' +
      '<div class="card pad-0"><div class="table-wrap"><table><thead><tr><th style="padding-left:20px">Skill</th><th>Team average</th><th class="num">Below 3</th><th>Best at it</th><th></th></tr></thead><tbody>' +
      all.map(s => {
        const t = M.tBy[s.name] || {};
        return '<tr' + (s.active ? '' : ' style="opacity:.55"') + '><td style="padding-left:20px"><div style="font-weight:560">' + esc(s.name) + (s.active ? '' : ' <span class="chip">Hidden</span>') + '</div><div class="small muted">' + esc(s.category) + '</div></td>' +
          '<td style="min-width:170px">' + (t.avg != null ? '<div class="row"><div style="flex:1;height:7px;background:var(--surface-3);border-radius:4px"><div style="height:100%;border-radius:4px;width:' + (t.avg / 5) * 100 + '%;background:' + (t.avg < 3 ? 'var(--crit)' : 'var(--accent)') + '"></div></div><span class="num small" style="width:28px">' + f1(t.avg) + '</span></div>' : '<span class="muted">–</span>') + '</td>' +
          '<td class="num">' + (t.below ? '<span class="chip crit">' + t.below + '</span>' : '0') + '</td>' +
          '<td>' + (t.top && t.top.length ? '<div class="chips">' + t.top.slice(0, 3).map(id => '<span class="chip good">' + esc(first(M.pById[id].name)) + ' · ' + t.best + '</span>').join('') + '</div>' : '<span class="muted small">No one at 4+</span>') + '</td>' +
          '<td style="text-align:right;padding-right:20px"><button class="btn sm" data-act="editskill" data-arg="' + esc(s.name) + '">Edit levels</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* ================= SETTINGS ================= */
  function rSettings() {
    const d = S.d;
    return '<div class="page-head"><div><h1>Settings</h1><p>Who can get in, how often VAs re-rate, and sample data.</p></div></div>' +
      '<div class="grid g-2" style="align-items:start"><form class="card stack" id="setForm"><h3>General</h3>' +
      '<label class="field">Team name<input type="text" id="sTeam" value="' + esc(d.team) + '" maxlength="40"></label>' +
      '<label class="field">Re-rate every (days)<input type="number" id="sDays" min="14" max="365" value="' + esc(d.reassessDays) + '"><span class="small muted" style="font-weight:400">VAs are flagged “re-rate due” after this many days.</span></label>' +
      '<label class="field">Admins (Google accounts)<textarea id="sAdmins" rows="3">' + esc(d.admins.join(', ')) + '</textarea><span class="small muted" style="font-weight:400">Separate with commas. Each admin also needs <b>Editor</b> access to the Google Sheet (Share button in the Sheet).</span></label>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit">Save settings</button></div></form>' +
      '<div class="stack"><div class="card"><h3 style="margin-bottom:8px">Sample data</h3>' + (d.hasSample ? '<p class="t2" style="margin-bottom:14px">Sample people (names start with “Sample ·”) and their ratings and training are in the Sheet so you can explore the app. Remove them once your real team is added.</p><button class="btn danger" data-act="removesample">Remove sample data</button>' : '<p class="t2">No sample data. Everything you see is real.</p>') + '</div>' +
      '<div class="card"><h3 style="margin-bottom:8px">How VAs rate themselves</h3><p class="t2">Each person has a private link (Team → person → Copy personal link). It opens a short page, pre-filled with their last answers, with a description for every level. No Google account needed. If a link is shared by mistake, open the person → Edit → “New link”.</p></div>' +
      '<div class="card"><h3 style="margin-bottom:8px">Where the data lives</h3><p class="t2">Everything is stored in your Google Sheet in the tabs <b>People</b>, <b>Skills</b>, <b>Assessments</b>, <b>Training</b>, <b>Check-ins</b> and <b>Settings</b>. Ratings are never overwritten, so history is kept.</p></div></div></div>';
  }
  afterRender.settings = () => {
    $('#setForm').onsubmit = e => { e.preventDefault(); act('apiSaveSettings', [{ team: $('#sTeam').value, reassessDays: $('#sDays').value, admins: $('#sAdmins').value }], 'Settings saved'); };
  };

  /* ================= MODALS ================= */
  function openModal(html, wide) {
    closeModal();
    const o = document.createElement('div'); o.className = 'overlay'; o.id = 'overlay';
    o.innerHTML = '<div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
    document.body.appendChild(o);
    const f = $('input,select,textarea', o); if (f) setTimeout(() => f.focus(), 30);
    return o;
  }
  function closeModal() { const o = $('#overlay'); if (o) o.remove(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  const mHead = t => '<div class="modal-head"><h2>' + t + '</h2><button class="btn ghost icon" data-act="close" aria-label="Close">' + icon('x') + '</button></div>';

  function personModal(id) {
    const p = id ? M.pById[id] : null;
    const o = openModal(mHead(p ? 'Edit ' + esc(first(p.name)) : 'Add person') +
      '<form id="pf"><div class="modal-body"><label class="field">Full name<input type="text" id="pName" required maxlength="60" value="' + esc(p ? p.name : '') + '"></label>' +
      '<label class="field">Role<input type="text" id="pRole" maxlength="40" value="' + esc(p ? p.role : 'Virtual Assistant') + '"></label>' +
      '<label class="field">Email (optional)<input type="email" id="pEmail" maxlength="80" value="' + esc(p ? p.email : '') + '"></label>' +
      (p ? '<div class="row wrap"><button type="button" class="btn sm" data-act="newlink" data-arg="' + esc(p.id) + '">' + icon('link') + 'New personal link</button><button type="button" class="btn sm danger" data-act="toggleactive" data-arg="' + esc(p.id) + '">' + (p.active ? 'Mark inactive' : 'Reactivate') + '</button></div><p class="small muted">A new link stops the old one working. Inactive people are hidden but their history is kept.</p>' : '') +
      '</div><div class="modal-foot"><button type="button" class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit">' + (p ? 'Save' : 'Add person') + '</button></div></form>');
    $('#pf', o).onsubmit = async e => {
      e.preventDefault();
      const ok = await act('apiSavePerson', [{ id: p ? p.id : '', name: $('#pName').value, role: $('#pRole').value, email: $('#pEmail').value }], p ? 'Saved' : 'Added ' + $('#pName').value);
      if (ok) closeModal();
    };
  }

  function trainingModal(id, presetPerson, presetSkills) {
    const t = id ? S.d.training.find(x => x.id === id) : null;
    const f = t ? { personId: t.personId, trainer: t.trainer, trainerType: t.trainerType, trainerPersonId: t.trainerPersonId, skills: t.skills.slice(), targetLevel: t.targetLevel || '', start: toInput(t.start), due: toInput(t.due), status: t.status }
      : { personId: presetPerson || (M.people[0] && M.people[0].id) || '', trainer: '', trainerType: 'VA', trainerPersonId: '', skills: presetSkills || [], targetLevel: 4, start: '', due: toInput(new Date(Date.now() + 42 * DAY).toISOString()), status: 'Planned' };
    // if a skill was given but no person, pick the weakest person in that skill
    if (!t && !presetPerson && presetSkills && presetSkills.length) {
      const w = M.people.map(p => [p, M.val(p.id, presetSkills[0], 'cur')]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1])[0];
      if (w) f.personId = w[0].id;
    }
    const draw = () => {
      const pid = f.personId;
      const sugg = {};
      f.skills.forEach(s => M.people.filter(p => p.id !== pid).forEach(p => { const v = M.val(p.id, s, 'cur'); if (v >= 4) sugg[p.id] = (sugg[p.id] || 0) + v; }));
      const ranked = Object.keys(sugg).sort((a, b) => sugg[b] - sugg[a]).slice(0, 4);
      const skillPicks = M.skills.map(s => { const v = M.val(pid, s.name, 'cur'); return { s, v }; }).sort((a, b) => (a.v == null ? 9 : a.v) - (b.v == null ? 9 : b.v));
      return mHead(t ? 'Training plan' : 'Plan training') +
        '<form id="tf"><div class="modal-body">' +
        '<label class="field">Who is being trained<select id="tPerson">' + M.people.map(p => '<option value="' + esc(p.id) + '"' + (p.id === pid ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></label>' +
        '<div class="field" style="display:grid;gap:6px"><span style="font-size:13px;font-weight:550;color:var(--text-2)">Skills to work on <span class="muted" style="font-weight:400">· weakest first</span></span><div class="chips" id="tSkills">' +
        skillPicks.map(({ s, v }) => '<label class="chip" style="cursor:pointer;padding:4px 10px;' + (f.skills.indexOf(s.name) >= 0 ? 'background:var(--accent-soft);color:var(--accent-text);border-color:var(--accent)' : '') + '"><input type="checkbox" value="' + esc(s.name) + '"' + (f.skills.indexOf(s.name) >= 0 ? ' checked' : '') + ' style="display:none">' + esc(s.name) + ' ' + scoreChip(v) + '</label>').join('') + '</div></div>' +
        '<div class="field" style="display:grid;gap:8px"><span style="font-size:13px;font-weight:550;color:var(--text-2)">Trainer</span><div class="seg" role="group"><button type="button" data-tt="VA" aria-pressed="' + (f.trainerType !== 'External') + '">Team member</button><button type="button" data-tt="External" aria-pressed="' + (f.trainerType === 'External') + '">Someone external</button></div>' +
        (f.trainerType === 'External' ? '<input type="text" id="tTrainer" placeholder="Trainer’s name" value="' + esc(f.trainer) + '">'
          : '<select id="tTrainerSel"><option value="">Choose a team member…</option>' + M.people.filter(p => p.id !== pid).map(p => '<option value="' + esc(p.id) + '"' + (p.id === f.trainerPersonId ? ' selected' : '') + '>' + esc(p.name) + (sugg[p.id] ? ' ★' : '') + '</option>').join('') + '</select>' +
            (ranked.length ? '<div class="small t2">Suggested (rated 4+ in these skills): ' + ranked.map(id => '<a href="#" data-pickt="' + esc(id) + '">' + esc(M.pById[id].name) + '</a>').join(', ') + '</div>' : (f.skills.length ? '<div class="small muted">No one on the team is rated 4+ in these skills yet. Consider an external trainer.</div>' : ''))) + '</div>' +
        '<div class="grid g-3" style="gap:12px"><label class="field">Target level<select id="tTarget">' + [2, 3, 4, 5].map(n => '<option value="' + n + '"' + (Number(f.targetLevel) === n ? ' selected' : '') + '>' + n + ' · ' + S.d.levelNames[n - 1] + '</option>').join('') + '</select></label>' +
        '<label class="field">Start<input type="date" id="tStart" value="' + esc(f.start) + '"></label><label class="field">Due<input type="date" id="tDue" value="' + esc(f.due) + '"></label></div>' +
        '<label class="field">Status<select id="tStatus">' + S.d.statuses.map(s => '<option' + (s === f.status ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>' +
        (t ? '<div><h4 style="margin-bottom:8px">Check-ins</h4>' + (S.d.checkins.filter(c => c.trainingId === t.id).map(c => '<p class="small" style="margin-bottom:6px"><b>' + fmtShort(c.date) + '</b> · ' + esc(c.note) + '</p>').join('') || '<p class="small muted">None yet.</p>') +
          '<div class="row" style="margin-top:8px"><input type="text" id="tCk" placeholder="Add a check-in note…" maxlength="500"><button type="button" class="btn" id="tCkAdd">Add</button></div></div>' : '') +
        '</div><div class="modal-foot">' + (t ? '<button type="button" class="btn danger" id="tDel" style="margin-right:auto">Delete</button>' : '') + '<button type="button" class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit">' + (t ? 'Save' : 'Create plan') + '</button></div></form>';
    };
    const read = () => {
      const o = $('#overlay'); if (!o) return;
      f.personId = $('#tPerson', o).value;
      f.skills = $$('#tSkills input:checked', o).map(i => i.value);
      if (f.trainerType === 'External') f.trainer = $('#tTrainer', o).value;
      else { f.trainerPersonId = $('#tTrainerSel', o).value; f.trainer = f.trainerPersonId && M.pById[f.trainerPersonId] ? M.pById[f.trainerPersonId].name : ''; }
      f.targetLevel = $('#tTarget', o).value; f.start = $('#tStart', o).value; f.due = $('#tDue', o).value; f.status = $('#tStatus', o).value;
    };
    const mount = () => {
      const o = openModal(draw(), true);
      $('#tPerson', o).onchange = () => { read(); if (f.trainerPersonId === f.personId) { f.trainerPersonId = ''; f.trainer = ''; } mount(); };
      $$('#tSkills input', o).forEach(i => (i.onchange = () => { read(); mount(); }));
      $$('[data-tt]', o).forEach(b => (b.onclick = () => { read(); if (f.trainerType !== b.dataset.tt) { f.trainerType = b.dataset.tt; f.trainer = ''; f.trainerPersonId = ''; } mount(); }));
      $$('[data-pickt]', o).forEach(a => (a.onclick = e => { e.preventDefault(); read(); f.trainerPersonId = a.dataset.pickt; f.trainer = M.pById[a.dataset.pickt].name; mount(); }));
      if ($('#tCkAdd', o)) $('#tCkAdd', o).onclick = async () => { const v = $('#tCk', o).value.trim(); if (!v) return; read(); if (await act('apiAddCheckin', [t.id, v], 'Check-in added')) mount(); };
      if ($('#tDel', o)) $('#tDel', o).onclick = async () => { if (confirm('Delete this training plan and its check-ins?')) { if (await act('apiDeleteTraining', [t.id], 'Deleted')) closeModal(); } };
      $('#tf', o).onsubmit = async e => {
        e.preventDefault(); read();
        if (!f.skills.length) return toast('Pick at least one skill.', true);
        if (!f.trainer.trim()) return toast('Choose or enter a trainer.', true);
        if (await act('apiSaveTraining', [Object.assign({ id: t ? t.id : '' }, f)], t ? 'Saved' : 'Training planned')) closeModal();
      };
    };
    mount();
  }

  function skillModal(name) {
    const s = name ? S.d.skills.find(x => x.name === name) : null;
    const lv = s ? s.levels : ['Little or no experience yet', 'Can do simple tasks with help', 'Does it independently and reliably', 'Handles complex work confidently', 'Expert — could train others'];
    const cats = Array.from(new Set(S.d.skills.map(x => x.category)));
    const o = openModal(mHead(s ? 'Edit ' + esc(s.name) : 'Add skill') + '<form id="sf"><div class="modal-body">' +
      '<div class="grid g-2" style="gap:12px"><label class="field">Skill name<input type="text" id="kName" required maxlength="50" value="' + esc(s ? s.name : '') + '"></label>' +
      '<label class="field">Category<input type="text" id="kCat" list="kCats" maxlength="30" value="' + esc(s ? s.category : '') + '"><datalist id="kCats">' + cats.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist></label></div>' +
      [1, 2, 3, 4, 5].map(i => '<label class="field"><span><span class="score r' + i + '" style="margin-right:6px">' + i + '</span>' + S.d.levelNames[i - 1] + '</span><input type="text" class="kLv" maxlength="120" value="' + esc(lv[i - 1]) + '"></label>').join('') +
      (s ? '<label class="row" style="cursor:pointer"><input type="checkbox" id="kActive"' + (s.active ? ' checked' : '') + '> Show this skill in ratings and the matrix</label>' : '') +
      '</div><div class="modal-foot"><button type="button" class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit">' + (s ? 'Save' : 'Add skill') + '</button></div></form>', true);
    $('#sf', o).onsubmit = async e => {
      e.preventDefault();
      const payload = { originalName: s ? s.name : '', name: $('#kName').value, category: $('#kCat').value, levels: $$('.kLv', o).map(i => i.value), active: s ? $('#kActive').checked : true };
      if (await act('apiSaveSkill', [payload], s ? 'Skill saved' : 'Skill added')) closeModal();
    };
  }

  function linkFor(id) { const p = M.pById[id]; return S.d.vaLinkBase + (S.d.vaLinkBase.indexOf('?') >= 0 ? '&' : '?') + 't=' + encodeURIComponent(p.token); }
  async function copyLink(id) {
    const p = M.pById[id], url = linkFor(id);
    const msg = 'Hi ' + first(p.name) + '! Please rate your skills here (takes about 3 minutes): ' + url;
    try { await navigator.clipboard.writeText(url); toast('Link for ' + first(p.name) + ' copied'); return; } catch (e) { /* iframe may block clipboard */ }
    const o = openModal(mHead('Personal link for ' + esc(first(p.name))) + '<div class="modal-body"><p class="t2">Send this to ' + esc(first(p.name)) + '. It opens their self-assessment, no sign-in needed.</p>' +
      '<input type="text" id="lnk" readonly value="' + esc(url) + '"><label class="field">Message you can paste<textarea id="lnkMsg" readonly rows="3">' + esc(msg) + '</textarea></label></div>' +
      '<div class="modal-foot"><button class="btn" data-act="close">Close</button><button class="btn primary" id="lnkCopy">Copy link</button></div>');
    const inp = $('#lnk', o); inp.select();
    $('#lnkCopy', o).onclick = () => { inp.select(); try { document.execCommand('copy'); toast('Copied'); } catch (e) { toast('Press Ctrl+C to copy', true); } };
  }

  /* ================= global click handling ================= */
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, arg = el.dataset.arg;
    if (el.tagName === 'A') e.preventDefault();
    switch (a) {
      case 'close': closeModal(); break;
      case 'theme': { const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const n = cur === 'dark' ? 'light' : 'dark'; setTheme(n); store.set('tt2_theme', n); break; }
      case 'person': S.personTab = 'overview'; go('person', arg); break;
      case 'rate': S.personTab = 'rate'; S.rateDraft = null; if (parseHash().name === 'person' && parseHash().arg === arg) render(); else go('person', arg); break;
      case 'ptab': S.personTab = arg; render(); break;
      case 'copy': copyLink(arg); break;
      case 'newperson': personModal(null); break;
      case 'editperson': personModal(arg); break;
      case 'newlink': if (confirm('Create a new link? The old one will stop working.')) { if (await act('apiNewLink', [arg], 'New link created')) { closeModal(); copyLink(arg); } } break;
      case 'toggleactive': { const p = M.pById[arg]; if (await act('apiSetPersonActive', [arg, !p.active], p.active ? 'Marked inactive' : 'Reactivated')) closeModal(); break; }
      case 'plan': trainingModal(null, el.dataset.person || null, arg ? arg.split('|').filter(Boolean) : null); break;
      case 'training': case 'edittraining': trainingModal(arg); break;
      case 'move': moveTraining(arg, el.dataset.status); break;
      case 'mxmode': S.mx.mode = arg; render(); break;
      case 'editskill': skillModal(arg || null); break;
      case 'removesample': if (confirm('Remove all sample people, their ratings and training? Your real data is not touched.')) act('apiRemoveSampleData', [], 'Sample data removed'); break;
    }
  });

  /* tooltips */
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (!t) { tip.hidden = true; return; } tip.textContent = t.getAttribute('data-tip'); tip.hidden = false; });
  document.addEventListener('mousemove', e => {
    if (tip.hidden) return;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + tip.offsetWidth > innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
    if (y + tip.offsetHeight > innerHeight - 8) y = e.clientY - tip.offsetHeight - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  document.addEventListener('scroll', () => (tip.hidden = true), true);

  /* ================= start ================= */
  (async function start() {
    try { S.d = await call('apiBootstrap'); M = model(S.d); render(); }
    catch (e) { root.innerHTML = '<div class="boot"><div class="card" style="max-width:420px;text-align:center"><h2>Couldn’t load the portal</h2><p class="t2" style="margin:8px 0 16px">' + esc(e.message) + '</p><button class="btn primary" onclick="location.reload()">Try again</button></div></div>'; }
  })();
})();
