/* Team Troy Training Portal — manager app.
   Managers rate VAs, pair VAs with trainers (any VA can be a trainer AND a trainee),
   and keep notes. Data lives in a Google Sheet behind a small Apps Script API (Code.gs).
   With no API_URL in config.js the app runs on sample data. */
(function () {
  'use strict';

  const CFG = window.TT_CONFIG || {};
  const API_URL = String(CFG.API_URL || '').trim();
  const DEMO = !API_URL;
  const PREVIEW = !!CFG.PREVIEW;

  /* ------------------------------------------------------------------ storage */
  const store = {
    get(k, sess) { if (PREVIEW) return null; try { return (sess ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set(k, v, sess) { if (PREVIEW) return; try { (sess ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} },
    del(k, sess) { if (PREVIEW) return; try { (sess ? sessionStorage : localStorage).removeItem(k); } catch (e) {} },
  };

  /* ------------------------------------------------------------------ icons */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.5 1.9 5 5.4"/>',
    training: '<path d="M3 8.5 12 4l9 4.5-9 4.5z"/><path d="M7 10.8V16c0 1.4 2.2 3 5 3s5-1.6 5-3v-5.2"/><path d="M21 8.5V14"/>',
    matrix: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    note: '<path d="M5 3.5h10l4 4V20.5H5z"/><path d="M14.5 3.5V8h4.5M8.5 12.5h7M8.5 16h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h13M17 12l4 4-4 4M21 16H8"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 8v.01"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    sort: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7l-.8-3h-5.4z"/>',
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  const MARK = `<svg class="brand-mark" viewBox="0 0 40 46" aria-hidden="true">
    <path d="M20 1.5 37.5 7v15.2c0 10.4-7.2 18.3-17.5 22.3C9.7 40.5 2.5 32.6 2.5 22.2V7z" fill="#1E3058" stroke="#C9A25E" stroke-width="2"/>
    <path d="M20 6.5 32.5 10.4v11.5c0 7.6-5 13.6-12.5 16.8-7.5-3.2-12.5-9.2-12.5-16.8V10.4z" fill="none" stroke="#C9A25E" stroke-opacity=".35" stroke-width="1"/>
    <text x="20" y="27.5" text-anchor="middle" font-family="Marcellus, Georgia, serif" font-size="15" fill="#F3E2C0" letter-spacing=".5">TT</text></svg>`;

  /* ------------------------------------------------------------------ helpers */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const DAY = 86400000;
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const toDate = (v) => (v ? new Date(v) : null);
  const isoDay = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const fmt = (v, opt) => (v ? new Date(v).toLocaleDateString(undefined, opt || { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const fmtShort = (v) => fmt(v, { day: 'numeric', month: 'short' });
  const daysSince = (v) => (v ? Math.floor((today0() - new Date(isoDay(v) + 'T00:00:00')) / DAY) : Infinity);
  const ago = (v) => {
    const d = daysSince(v);
    if (d === Infinity) return 'never';
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 30) return d + ' days ago';
    const m = Math.round(d / 30);
    return m + (m === 1 ? ' month ago' : ' months ago');
  };
  const one = (n) => (n == null || isNaN(n) ? '—' : (Math.round(n * 10) / 10).toFixed(1));
  const lvl = (n) => (n == null || isNaN(n) ? 0 : Math.max(1, Math.min(5, Math.round(n))));
  const initials = (n) => String(n || '?').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const AV = ['#1E3058', '#8A5E1F', '#2F6B5A', '#6B3F6E', '#2C5C9A', '#9A4A35', '#4F5D2F', '#3D4C7A', '#7A5A2C', '#355E6E'];
  const avColor = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
  const avatar = (p, cls = '') => `<span class="avatar ${cls}" style="background:${avColor(p ? p.id + p.name : '?')}" aria-hidden="true">${esc(initials(p ? p.name : '?'))}</span>`;
  const deltaHtml = (d) => {
    if (d == null || isNaN(d)) return '<span class="delta flat">—</span>';
    if (Math.abs(d) < 0.05) return '<span class="delta flat">±0.0</span>';
    return d > 0 ? `<span class="delta up">▲ ${one(d)}</span>` : `<span class="delta down">▼ ${one(-d)}</span>`;
  };
  const meter = (v) => `<div class="meter"><div class="meter-track"><div class="meter-fill" style="width:${v ? (v / 5) * 100 : 0}%;background:var(--bar${lvl(v) || 1})"></div></div><span class="meter-val">${one(v)}</span></div>`;
  const segs = (v) => `<div class="segs" aria-label="${v || 0} out of 5">${[1, 2, 3, 4, 5].map((i) => `<i style="${v && i <= v ? `background:var(--bar${v})` : ''}"></i>`).join('')}</div>`;
  const badge = (v, dec) => `<span class="score-badge sc${lvl(v)}">${v ? (dec ? one(v) : Number.isInteger(v) ? v : one(v)) : '–'}</span>`;

  const SCALE = [
    { n: 1, label: 'Beginner', desc: 'little or no experience' },
    { n: 2, label: 'Basic', desc: 'simple tasks with help' },
    { n: 3, label: 'Competent', desc: 'works on their own' },
    { n: 4, label: 'Strong', desc: 'handles complex work' },
    { n: 5, label: 'Expert', desc: 'can teach others' },
  ];
  const STATUSES = ['Planned', 'In progress', 'Completed'];
  const STATUS_TONE = { Planned: 'tone-info', 'In progress': 'tone-accent', Completed: 'tone-good' };
  const STATUS_BAR = { Planned: 'var(--info)', 'In progress': 'var(--accent)', Completed: 'var(--good)' };
  const ROLES = ['VA', 'Senior VA', 'Team Lead', 'Account Executive'];
  const NOTE_TYPES = { Note: 'tone-info', Win: 'tone-good', Concern: 'tone-bad' };
  const STANDARD_SKILLS = [
    ['Email Management', 'Administrative'], ['Calendar & Scheduling', 'Administrative'], ['Data Entry & Accuracy', 'Administrative'],
    ['Microsoft Excel', 'Tools'], ['Google Workspace', 'Tools'], ['CRM Tools', 'Tools'], ['Project Management Tools', 'Tools'],
    ['Written Communication', 'Communication'], ['Verbal Communication', 'Communication'], ['Customer Service', 'Communication'],
    ['Internet Research', 'Research & Analysis'], ['Problem Solving', 'Research & Analysis'],
    ['Time Management', 'Professional'], ['Attention to Detail', 'Professional'],
    ['Social Media Management', 'Marketing'], ['Canva / Basic Design', 'Marketing'], ['Basic Bookkeeping', 'Finance'],
  ];

  /* ------------------------------------------------------------------ sample data */
  function sampleData() {
    let seed = 7;
    const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const now = Date.now();
    const at = (d) => new Date(now - d * DAY).toISOString();
    const names = [
      ['Maria Santos', 'Team Lead', 'Brightline Realty', 4.3], ['Joshua Reyes', 'Senior VA', 'Northwind Health', 4.0],
      ['Angela Cruz', 'Senior VA', 'Brightline Realty', 3.8], ['Mark Villanueva', 'VA', 'Coastal Legal', 2.9],
      ['Kristine Bautista', 'VA', 'Northwind Health', 3.2], ['John Paul Garcia', 'VA', 'Summit Ecom', 2.5],
      ['Patricia Mendoza', 'Senior VA', 'Summit Ecom', 3.9], ['Carlo Ramos', 'VA', 'Coastal Legal', 2.7],
      ['Bea Navarro', 'VA', 'Brightline Realty', 3.0], ['Miguel Torres', 'VA', 'Northwind Health', 2.4],
      ['Hannah Dela Cruz', 'VA', 'Summit Ecom', 3.4], ['Rafael Aquino', 'VA', 'Coastal Legal', 2.2],
      ['Nicole Fernandez', 'VA', 'Brightline Realty', 3.1], ['Ivan Castillo', 'VA', 'Summit Ecom', 2.0],
    ];
    const people = names.map(([name, role, account], i) => ({
      id: 'p' + (i + 1), name, role, account, start: isoDay(now - (60 + Math.floor(rnd() * 700)) * DAY), active: 'Y', sample: 'Y',
    }));
    const skills = STANDARD_SKILLS.map(([name, category]) => ({ name, category, active: 'Y' }));
    const ratings = [];
    const managers = ['Troy Gilmore', 'Eric Renolds'];
    people.forEach((p, i) => {
      if (i === 13) return; // newest VA, not rated yet
      const base = names[i][3];
      const offs = skills.map(() => (rnd() - 0.5) * 2.6);
      const sessions = i === 9 || i === 11 ? [150, 72] : [125, 62, 4 + Math.floor(rnd() * 20)];
      sessions.forEach((d, si) => {
        const growth = si * (0.15 + rnd() * 0.25);
        const jitter = skills.map(() => (rnd() < 0.3 ? si * 0.7 : 0));
        const m = managers[(i + si) % 2];
        skills.forEach((s, k) => {
          const score = Math.max(1, Math.min(5, Math.round(base + offs[k] + growth + jitter[k] - 0.3)));
          ratings.push({ ts: at(d), personId: p.id, skill: s.name, score, manager: m, note: '', sample: 'Y' });
        });
      });
    });
    const T = (trainee, trainer, sk, status, startAgo, dueIn, target) => ({
      id: 't' + uid(), traineeId: trainee, trainerId: trainer, skills: sk, target: target || 4, status,
      start: isoDay(now - startAgo * DAY), due: isoDay(now + dueIn * DAY), notes: '', created: at(startAgo), updated: at(Math.max(0, startAgo - 3)), sample: 'Y',
    });
    const training = [
      T('p4', 'p1', ['Microsoft Excel', 'Data Entry & Accuracy'], 'In progress', 20, 10),
      T('p6', 'p2', ['CRM Tools', 'Customer Service'], 'In progress', 35, -4),
      T('p8', 'p1', ['Written Communication'], 'Planned', 2, 28),
      T('p10', 'p7', ['Time Management', 'Attention to Detail'], 'In progress', 14, 16),
      T('p12', 'p3', ['Google Workspace', 'Calendar & Scheduling'], 'Planned', 1, 30),
      T('p9', 'p2', ['Problem Solving'], 'Completed', 60, -20),
      T('p5', 'p11', ['Social Media Management'], 'In progress', 10, 20, 3),
      T('p14', 'p11', ['Email Management', 'Google Workspace'], 'Planned', 0, 21, 3),
    ];
    const N = (pid, d, type, text, m) => ({ id: 'n' + uid(), personId: pid, ts: at(d), type, text, manager: m || managers[0], sample: 'Y' });
    const notes = [
      N('p1', 3, 'Win', 'Client praised the new listing workflow she set up. Ready to mentor two more VAs.'),
      N('p6', 5, 'Concern', 'Missed two CRM follow-ups this week. Discussed with Joshua — extra shadowing on Thursdays.', managers[1]),
      N('p4', 8, 'Note', 'Excel sessions going well — now comfortable with VLOOKUP and pivot tables.'),
      N('p10', 12, 'Concern', 'Late on 3 deliverables. Agreed on a daily task plan with Patricia.'),
      N('p11', 6, 'Win', 'Handled the Summit Ecom holiday inbox alone. Strong candidate to train Ivan.', managers[1]),
      N('p2', 18, 'Note', 'Covering Northwind training while Maria is on leave next month.'),
      N('p14', 1, 'Note', 'Started this week on Summit Ecom. Paired with Hannah for onboarding.'),
      N('p7', 25, 'Win', 'Built a reusable order-tracking template the whole account now uses.'),
    ];
    return { people, skills, ratings, training, notes, settings: { teamName: CFG.TEAM_NAME || 'Team Troy', reassessDays: 45, managers } };
  }

  /* ------------------------------------------------------------------ state */
  let DB = null;
  let ME = store.get('tt-manager') || '';
  let PW = store.get('tt-pw', true) || '';
  const ui = { teamFilter: 'all', teamQuery: '', teamSort: 'name', trainView: 'board', trainQuery: '', matrixCat: 'all', matrixQuery: '', vaTab: 'overview' };
  let C = null; // derived cache

  function normalise(d) {
    d.people = (d.people || []).map((p) => Object.assign({ role: 'VA', account: '', active: 'Y' }, p));
    d.skills = d.skills || [];
    d.ratings = (d.ratings || []).map((r) => Object.assign({}, r, { score: Number(r.score) })).filter((r) => r.score >= 1 && r.score <= 5);
    d.training = (d.training || []).map((t) => Object.assign({}, t, { skills: Array.isArray(t.skills) ? t.skills : String(t.skills || '').split(/\s*;\s*/).filter(Boolean), target: Number(t.target) || 4 }));
    d.notes = d.notes || [];
    d.settings = Object.assign({ teamName: CFG.TEAM_NAME || 'Team Troy', reassessDays: 45, managers: [] }, d.settings || {});
    if (typeof d.settings.managers === 'string') d.settings.managers = d.settings.managers.split(/\s*[,;\n]\s*/).filter(Boolean);
    d.settings.reassessDays = Number(d.settings.reassessDays) || 45;
    return d;
  }

  const activePeople = () => DB.people.filter((p) => p.active !== 'N');
  const activeSkills = () => DB.skills.filter((s) => s.active !== 'N');
  const person = (id) => DB.people.find((p) => p.id === id);
  const categories = () => { const c = []; activeSkills().forEach((s) => { if (!c.includes(s.category)) c.push(s.category); }); return c; };

  function derive() {
    if (C) return C;
    const sorted = DB.ratings.slice().sort((a, b) => (a.ts < b.ts ? -1 : 1));
    const latest = {}, last = {}, sessions = {};
    sorted.forEach((r) => {
      (latest[r.personId] = latest[r.personId] || {})[r.skill] = r.score;
      last[r.personId] = r.ts;
      const key = isoDay(r.ts) + '|' + r.manager;
      const ps = (sessions[r.personId] = sessions[r.personId] || {});
      (ps[key] = ps[key] || { day: isoDay(r.ts), ts: r.ts, manager: r.manager, scores: {} }).scores[r.skill] = r.score;
    });
    const skillNames = activeSkills().map((s) => s.name);
    const avgMap = (m) => { const v = skillNames.map((s) => m && m[s]).filter((x) => x); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const avg = {}, prev = {}, hist = {};
    DB.people.forEach((p) => {
      avg[p.id] = avgMap(latest[p.id]);
      // running snapshot after each session
      const snap = {}; const h = [];
      Object.values(sessions[p.id] || {}).sort((a, b) => (a.ts < b.ts ? -1 : 1)).forEach((s) => { Object.assign(snap, s.scores); h.push({ ...s, avg: avgMap(snap), snapshot: { ...snap } }); });
      hist[p.id] = h;
      prev[p.id] = h.length > 1 ? h[h.length - 2].avg : null;
    });
    const openT = DB.training.filter((t) => t.status !== 'Completed');
    const asTrainee = {}, asTrainer = {};
    DB.training.forEach((t) => { (asTrainee[t.traineeId] = asTrainee[t.traineeId] || []).push(t); (asTrainer[t.trainerId] = asTrainer[t.trainerId] || []).push(t); });
    const load = {}; openT.forEach((t) => { load[t.trainerId] = (load[t.trainerId] || 0) + 1; });
    const skillAvg = {};
    skillNames.forEach((s) => {
      const v = activePeople().map((p) => latest[p.id] && latest[p.id][s]).filter((x) => x);
      skillAvg[s] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    });
    const teamVals = activePeople().map((p) => avg[p.id]).filter((x) => x != null);
    const teamPrevVals = activePeople().map((p) => (prev[p.id] != null ? prev[p.id] : avg[p.id])).filter((x) => x != null);
    const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    C = { latest, last, hist, avg, prev, asTrainee, asTrainer, load, openT, skillAvg, team: mean(teamVals), teamPrev: mean(teamPrevVals) };
    C.attention = attention();
    return C;
  }
  const invalidate = () => { C = null; };
  const isOverdue = (t) => t.status !== 'Completed' && t.due && daysSince(t.due) > 0;
  const currentTrainer = (pid) => (derive().asTrainee[pid] || []).filter((t) => t.status !== 'Completed').map((t) => person(t.trainerId)).filter(Boolean);
  const weakSkills = (pid) => { const m = derive().latest[pid] || {}; return activeSkills().map((s) => ({ name: s.name, v: m[s.name] })).filter((x) => x.v).sort((a, b) => a.v - b.v); };

  function attention() {
    const c = C, out = [], days = DB.settings.reassessDays;
    activePeople().forEach((p) => {
      const d = daysSince(c.last[p.id]);
      if (d === Infinity) out.push({ kind: 'unrated', pid: p.id, tone: 'tone-warn', icon: 'star', title: `${p.name} hasn't been rated yet`, meta: `${p.role} · ${p.account || 'No account'}`, action: 'rate', label: 'Rate now', w: 3 });
      else if (d > days) out.push({ kind: 'stale', pid: p.id, tone: 'tone-info', icon: 'clock', title: `Re-rate ${p.name}`, meta: `Last rated ${ago(c.last[p.id])}`, action: 'rate', label: 'Rate', w: 2 });
    });
    DB.training.filter(isOverdue).forEach((t) => {
      const a = person(t.traineeId), b = person(t.trainerId);
      if (!a) return;
      out.push({ kind: 'overdue', tid: t.id, pid: a.id, tone: 'tone-bad', icon: 'alert', title: `Training overdue: ${a.name}`, meta: `${t.skills.join(', ')} · with ${b ? b.name : '—'} · due ${fmtShort(t.due)}`, action: 'open-training', label: 'Review', w: 4 });
    });
    activePeople().forEach((p) => {
      const covered = new Set((c.asTrainee[p.id] || []).filter((t) => t.status !== 'Completed').flatMap((t) => t.skills));
      const gaps = weakSkillsRaw(c, p.id).filter((x) => x.v <= 2 && !covered.has(x.name));
      if (gaps.length >= 2) out.push({ kind: 'gap', pid: p.id, tone: 'tone-accent', icon: 'target', title: `${p.name} has ${gaps.length} weak skills not covered by training`, meta: gaps.slice(0, 3).map((g) => g.name).join(', ') + (gaps.length > 3 ? '…' : ''), action: 'assign', label: 'Assign trainer', w: 1 });
    });
    return out.sort((a, b) => b.w - a.w);
  }
  function weakSkillsRaw(c, pid) { const m = c.latest[pid] || {}; return activeSkills().map((s) => ({ name: s.name, v: m[s.name] })).filter((x) => x.v).sort((a, b) => a.v - b.v); }

  function suggestTrainers(traineeId, skills) {
    const c = derive();
    if (!skills.length) return [];
    return activePeople().filter((p) => p.id !== traineeId).map((p) => {
      const m = c.latest[p.id] || {};
      const vals = skills.map((s) => m[s] || 0);
      const lv = vals.reduce((a, b) => a + b, 0) / vals.length;
      const load = c.load[p.id] || 0;
      return { p, lv, load, fit: lv - 0.35 * load + (p.role !== 'VA' ? 0.15 : 0), min: Math.min(...vals) };
    }).filter((x) => x.lv >= 3.5 && x.min >= 3).sort((a, b) => b.fit - a.fit).slice(0, 4);
  }

  /* ------------------------------------------------------------------ API */
  async function api(action, payload) {
    if (DEMO) return { ok: true };
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, password: PW, manager: ME }, payload || {})) });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Something went wrong');
    return j;
  }
  async function save(action, payload, mutate, okMsg) {
    mutate(); invalidate(); render();
    if (okMsg) toast(okMsg);
    try { await api(action, payload); }
    catch (err) { toast('Could not save: ' + err.message, true); await load(); }
  }
  async function load() {
    if (DEMO) { DB = normalise(sampleData()); invalidate(); return; }
    const j = await api('getAll');
    DB = normalise(j.data); invalidate();
  }

  /* ------------------------------------------------------------------ toasts */
  function toast(msg, bad) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = (bad ? '' : ic('check')) + esc(msg);
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ------------------------------------------------------------------ router & shell */
  const NAV = [
    { id: 'home', href: '#/', label: 'Home', icon: 'home' },
    { id: 'team', href: '#/team', label: 'Team', icon: 'team' },
    { id: 'training', href: '#/training', label: 'Training', icon: 'training' },
    { id: 'matrix', href: '#/matrix', label: 'Skill matrix', icon: 'matrix', short: 'Matrix' },
  ];
  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    return { page: parts[0] || 'home', id: parts[1], sub: parts[2] };
  }

  function shell(r, crumbs, body) {
    const section = r.page === 'va' ? 'team' : r.page;
    const attn = derive().attention.length;
    const link = (n, mobile) => `<a href="${n.href}" ${section === n.id ? 'aria-current="page"' : ''}>${ic(n.icon)}<span>${mobile && n.short ? n.short : n.label}</span>${!mobile && n.id === 'home' && attn ? `<span class="count" title="Items needing attention">${attn}</span>` : ''}</a>`;
    return `<div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#/">${MARK}<div><div class="brand-name">${esc(DB.settings.teamName)}</div><div class="brand-sub">Training Portal</div></div></a>
        <nav class="nav" aria-label="Main">
          ${NAV.map((n) => link(n)).join('')}
          <div class="nav-label">Admin</div>
          ${link({ id: 'settings', href: '#/settings', label: 'Settings', icon: 'settings' })}
        </nav>
        <div class="sidebar-foot">
          <div class="me">${avatar({ id: 'm', name: ME })}<div><div class="me-name">${esc(ME)}</div><div class="me-role">Manager</div></div>
          <button type="button" data-act="switch-manager" title="Switch manager" aria-label="Switch manager">${ic('swap')}</button></div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <a class="mobile-brand" href="#/">${MARK}<b>${esc(DB.settings.teamName)}</b></a>
          <nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav>
          <button type="button" class="search-btn" data-act="palette" aria-label="Search">${ic('search')}<span class="lbl">Search VAs, pages…</span><span class="kbd">Ctrl K</span></button>
        </header>
        <main class="page" id="page">${DEMO ? `<div class="banner">${ic('info')}<span>You're viewing <b>sample data</b>. Connect your Google Sheet in <code>config.js</code> to use real VAs.</span></div>` : ''}${body}</main>
      </div>
      <nav class="tabbar" aria-label="Main">${NAV.map((n) => link(n, true)).join('')}${link({ id: 'settings', href: '#/settings', label: 'Settings', icon: 'settings' }, true)}</nav>
    </div>`;
  }

  function render() {
    if (!DB) return;
    if (!ME) return renderWho();
    derive();
    const r = route();
    const pages = { home: pageHome, team: pageTeam, va: pageVA, training: pageTraining, matrix: pageMatrix, settings: pageSettings };
    const fn = pages[r.page] || pageHome;
    const out = fn(r);
    const y = window.scrollY;
    $('#app').innerHTML = shell(r, out.crumbs, out.body);
    document.title = (out.title ? out.title + ' · ' : '') + DB.settings.teamName + ' Training Portal';
    if (out.after) out.after();
    if (render.keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
    render.keepScroll = true;
  }
  window.addEventListener('hashchange', () => { render.keepScroll = false; render(); });

  /* ------------------------------------------------------------------ Home */
  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

  function pageHome() {
    const c = derive();
    const ap = activePeople();
    const due = c.attention.filter((a) => a.kind === 'unrated' || a.kind === 'stale').length;
    const overdue = DB.training.filter(isOverdue).length;
    const trainers = ap.filter((p) => c.load[p.id]).sort((a, b) => c.load[b.id] - c.load[a.id]);
    const gaps = activeSkills().map((s) => ({ s, v: c.skillAvg[s.name] })).filter((x) => x.v != null).sort((a, b) => a.v - b.v).slice(0, 6);
    const kpi = (icon, label, value, foot) => `<div class="card kpi"><div class="kpi-label">${ic(icon)}${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`;
    const firstName = ME.split(' ')[0];
    const body = `
      <section class="hero">
        <div><h1>${greeting()}, ${esc(firstName)}</h1><p>${fmt(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })} · Here's how ${esc(DB.settings.teamName)} is doing.</p></div>
        <div class="actions"><button class="btn" data-act="new-training">${ic('training')}Assign trainer</button><button class="btn btn-accent" data-act="rate">${ic('star')}Rate a VA</button></div>
      </section>
      <div class="grid grid-4" style="margin-bottom:20px">
        ${kpi('team', 'Active VAs', ap.length, `${ap.filter((p) => c.load[p.id]).length} currently training others`)}
        ${kpi('chart', 'Team skill level', `${one(c.team)} <small>/ 5</small>`, `${deltaHtml(c.team != null && c.teamPrev != null ? c.team - c.teamPrev : null)} since previous ratings`)}
        ${kpi('training', 'Active trainings', c.openT.length, overdue ? `<span style="color:var(--bad);font-weight:600">${overdue} overdue</span>` : 'All on schedule')}
        ${kpi('clock', 'Due for rating', due, `Re-rate every ${DB.settings.reassessDays} days`)}
      </div>
      <div class="grid grid-2" style="margin-bottom:20px">
        <section class="card">
          <div class="card-head"><h2>Needs your attention</h2><span class="sub">${c.attention.length} item${c.attention.length === 1 ? '' : 's'}</span></div>
          ${c.attention.length ? `<ul class="list">${c.attention.slice(0, 7).map((a) => `<li>
            <span class="dot-icon ${a.tone}">${ic(a.icon)}</span>
            <div class="grow"><div class="title">${esc(a.title)}</div><div class="meta">${esc(a.meta)}</div></div>
            <button class="btn btn-sm" data-act="${a.action}" data-id="${esc(a.action === 'open-training' ? a.tid : a.pid)}">${a.label}</button></li>`).join('')}</ul>
            ${c.attention.length > 7 ? `<div class="card-body muted" style="border-top:1px solid var(--line)">+ ${c.attention.length - 7} more on the Team page</div>` : ''}`
            : `<div class="empty"><b>All clear</b>Everyone is rated and training is on schedule.</div>`}
        </section>
        <section class="card">
          <div class="card-head"><h2>Biggest skill gaps</h2><span class="sub">Team average</span><a class="btn btn-ghost btn-sm right" href="#/matrix">Open matrix ${ic('chevron')}</a></div>
          <div class="card-body">${gaps.length ? gaps.map((g) => `<div class="skill-row" style="grid-template-columns:minmax(120px,1fr) 1.2fr"><div><div class="skill-name">${esc(g.s.name)}</div><div class="muted" style="font-size:12px">${esc(g.s.category)}</div></div>${meter(g.v)}</div>`).join('') : '<div class="empty">No ratings yet.</div>'}</div>
        </section>
      </div>
      <div class="grid grid-2e">
        <section class="card">
          <div class="card-head"><h2>Trainers</h2><span class="sub">Who is training whom</span><a class="btn btn-ghost btn-sm right" href="#/training/trainers">All trainers ${ic('chevron')}</a></div>
          ${trainers.length ? `<ul class="list">${trainers.slice(0, 5).map((p) => {
            const ts = c.openT.filter((t) => t.trainerId === p.id).map((t) => person(t.traineeId)).filter(Boolean);
            return `<li>${avatar(p)}<div class="grow"><a class="title" href="#/va/${esc(p.id)}" style="text-decoration:none">${esc(p.name)}</a><div class="meta">${ts.map((x) => esc(x.name)).join(', ')}</div></div><div class="avatar-stack">${ts.slice(0, 4).map((x) => avatar(x, 'sm')).join('')}</div><span class="pill plain tone-accent">${ts.length} trainee${ts.length === 1 ? '' : 's'}</span></li>`;
          }).join('')}</ul>` : '<div class="empty"><b>No trainers yet</b>Assign one from a VA\'s profile.</div>'}
        </section>
        <section class="card">
          <div class="card-head"><h2>Recent activity</h2></div>
          ${activityList(8)}
        </section>
      </div>`;
    return { title: 'Home', crumbs: '<b>Home</b>', body };
  }

  function activity() {
    const c = derive(), ev = [];
    DB.people.forEach((p) => (c.hist[p.id] || []).forEach((s) => ev.push({ ts: s.ts, html: `<b>${esc(s.manager)}</b> rated <a href="#/va/${esc(p.id)}">${esc(p.name)}</a> · avg ${one(s.avg)}`, icon: 'star', tone: 'tone-accent' })));
    DB.training.forEach((t) => { const a = person(t.traineeId), b = person(t.trainerId); if (a && b) ev.push({ ts: t.created, html: `<a href="#/va/${esc(b.id)}">${esc(b.name)}</a> is training <a href="#/va/${esc(a.id)}">${esc(a.name)}</a> on ${esc(t.skills.join(', '))}`, icon: 'training', tone: 'tone-info' }); });
    DB.notes.forEach((n) => { const p = person(n.personId); if (p) ev.push({ ts: n.ts, html: `<b>${esc(n.manager)}</b> added a ${esc(n.type.toLowerCase())} on <a href="#/va/${esc(p.id)}">${esc(p.name)}</a>`, icon: 'note', tone: NOTE_TYPES[n.type] || 'tone-info' }); });
    return ev.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }
  function activityList(n) {
    const ev = activity().slice(0, n);
    if (!ev.length) return '<div class="empty">Nothing yet.</div>';
    return `<ul class="list">${ev.map((e) => `<li><span class="dot-icon ${e.tone}">${ic(e.icon)}</span><div class="grow" style="font-size:13px">${e.html}<div class="meta">${ago(e.ts)}</div></div></li>`).join('')}</ul>`;
  }

  /* ------------------------------------------------------------------ Team */
  function teamRows() {
    const c = derive(), q = ui.teamQuery.trim().toLowerCase();
    const attnIds = new Set(c.attention.map((a) => a.pid));
    let rows = DB.people.filter((p) => {
      if (ui.teamFilter === 'inactive') return p.active === 'N';
      if (p.active === 'N') return false;
      if (ui.teamFilter === 'attention') return attnIds.has(p.id);
      if (ui.teamFilter === 'training') return currentTrainer(p.id).length > 0;
      if (ui.teamFilter === 'trainers') return (c.load[p.id] || 0) > 0;
      return true;
    });
    if (q) rows = rows.filter((p) => (p.name + ' ' + p.account + ' ' + p.role).toLowerCase().includes(q));
    const by = {
      name: (a, b) => a.name.localeCompare(b.name),
      high: (a, b) => (c.avg[b.id] || 0) - (c.avg[a.id] || 0),
      low: (a, b) => (c.avg[a.id] || 9) - (c.avg[b.id] || 9),
      rated: (a, b) => daysSince(c.last[b.id]) - daysSince(c.last[a.id]),
    };
    return rows.sort(by[ui.teamSort] || by.name);
  }
  function teamTable() {
    const c = derive(), rows = teamRows();
    if (!rows.length) return '<div class="empty"><b>No VAs match</b>Try a different filter or search.</div>';
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>VA</th><th class="hide-sm">Account</th><th>Skill level</th><th class="hide-sm">Change</th><th class="hide-sm">Trained by</th><th class="hide-sm">Trains</th><th class="hide-sm">Last rated</th><th><span class="sr-only">Open</span></th></tr></thead>
      <tbody>${rows.map((p) => {
        const tr = currentTrainer(p.id);
        const n = c.load[p.id] || 0;
        const d = daysSince(c.last[p.id]);
        return `<tr class="click" data-href="#/va/${esc(p.id)}">
          <td><div class="person">${avatar(p)}<div><a class="nm" href="#/va/${esc(p.id)}" style="text-decoration:none">${esc(p.name)}</a><div class="rl">${esc(p.role)}</div></div></div></td>
          <td class="hide-sm muted">${esc(p.account || '—')}</td>
          <td style="min-width:150px">${c.avg[p.id] != null ? meter(c.avg[p.id]) : '<span class="pill plain tone-warn">Not rated</span>'}</td>
          <td class="hide-sm">${deltaHtml(c.prev[p.id] != null && c.avg[p.id] != null ? c.avg[p.id] - c.prev[p.id] : null)}</td>
          <td class="hide-sm">${tr.length ? `<span class="person">${avatar(tr[0], 'sm')}<span>${esc(tr[0].name)}${tr.length > 1 ? ` +${tr.length - 1}` : ''}</span></span>` : '<span class="muted">—</span>'}</td>
          <td class="hide-sm">${n ? `<span class="pill plain tone-accent">${n} VA${n === 1 ? '' : 's'}</span>` : '<span class="muted">—</span>'}</td>
          <td class="hide-sm nowrap ${d > DB.settings.reassessDays ? '' : 'muted'}" style="${d > DB.settings.reassessDays && d !== Infinity ? 'color:var(--warn);font-weight:600' : ''}">${ago(c.last[p.id])}</td>
          <td style="width:40px;color:var(--muted)">${ic('chevron')}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }
  function pageTeam() {
    const c = derive();
    const attnIds = new Set(c.attention.map((a) => a.pid));
    const ap = activePeople();
    const f = [
      ['all', 'All', ap.length], ['attention', 'Needs attention', ap.filter((p) => attnIds.has(p.id)).length],
      ['training', 'In training', ap.filter((p) => currentTrainer(p.id).length).length], ['trainers', 'Trainers', ap.filter((p) => c.load[p.id]).length],
      ['inactive', 'Inactive', DB.people.length - ap.length],
    ];
    const body = `
      <div class="page-head"><div><h1>Team</h1><p>${ap.length} active VAs · click anyone to see their skills, training and notes.</p></div>
        <div class="actions"><button class="btn" data-act="add-person">${ic('plus')}Add VA</button><button class="btn btn-primary" data-act="rate">${ic('star')}Rate a VA</button></div></div>
      <div class="toolbar">
        <label class="search-field">${ic('search')}<span class="sr-only">Search team</span><input class="input" id="team-q" type="search" placeholder="Search by name or account" value="${esc(ui.teamQuery)}"></label>
        <div class="filters" role="group" aria-label="Filter">${f.map(([k, l, n]) => `<button class="filter" data-act="team-filter" data-id="${k}" aria-pressed="${ui.teamFilter === k}">${l}<span class="n">${n}</span></button>`).join('')}</div>
        <label style="margin-left:auto" class="nowrap"><span class="sr-only">Sort</span><select class="select" id="team-sort">
          ${[['name', 'Name A–Z'], ['low', 'Lowest skill first'], ['high', 'Highest skill first'], ['rated', 'Longest since rated']].map(([k, l]) => `<option value="${k}" ${ui.teamSort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <section class="card" id="team-table">${teamTable()}</section>`;
    return {
      title: 'Team', crumbs: '<b>Team</b>', body,
      after() {
        $('#team-q').addEventListener('input', (e) => { ui.teamQuery = e.target.value; $('#team-table').innerHTML = teamTable(); });
        $('#team-sort').addEventListener('change', (e) => { ui.teamSort = e.target.value; $('#team-table').innerHTML = teamTable(); });
      },
    };
  }

  /* ------------------------------------------------------------------ VA profile */
  function pageVA(r) {
    const p = person(r.id);
    if (!p) return { crumbs: '<a href="#/team">Team</a> / <b>Not found</b>', body: '<div class="card empty"><b>VA not found</b><a href="#/team">Back to Team</a></div>' };
    const c = derive();
    const tab = ['overview', 'training', 'notes', 'history'].includes(r.sub) ? r.sub : 'overview';
    const m = c.latest[p.id] || {};
    const trainedBy = (c.asTrainee[p.id] || []);
    const trains = (c.asTrainer[p.id] || []);
    const myNotes = DB.notes.filter((n) => n.personId === p.id).sort((a, b) => (a.ts < b.ts ? 1 : -1));
    const tabs = [['overview', 'Skills'], ['training', `Training <span class="muted">${trainedBy.length + trains.length || ''}</span>`], ['notes', `Notes <span class="muted">${myNotes.length || ''}</span>`], ['history', 'History']];
    let content = '';
    if (tab === 'overview') {
      const ranked = weakSkills(p.id);
      const strengths = ranked.slice().reverse().slice(0, 3), gaps = ranked.slice(0, 3);
      const prevSnap = (c.hist[p.id] || []).length > 1 ? c.hist[p.id][c.hist[p.id].length - 2].snapshot : {};
      content = `<div class="grid grid-2">
        <section class="card"><div class="card-head"><h2>Skills</h2><span class="sub">Latest rating ${c.last[p.id] ? '· ' + fmt(c.last[p.id]) : ''}</span><button class="btn btn-sm right" data-act="rate" data-id="${esc(p.id)}">${ic('star')}Rate</button></div>
          <div class="card-body">${Object.keys(m).length ? categories().map((cat) => `<div class="cat-title">${esc(cat)}</div>${activeSkills().filter((s) => s.category === cat).map((s) => {
            const v = m[s.name], pv = prevSnap[s.name];
            return `<div class="skill-row"><span class="skill-name">${esc(s.name)}</span>${segs(v)}${badge(v)}${v && pv && v !== pv ? deltaHtml(v - pv) : '<span></span>'}</div>`;
          }).join('')}`).join('') : `<div class="empty"><b>Not rated yet</b>Give ${esc(p.name.split(' ')[0])} a first rating to see their skills.<div style="margin-top:12px"><button class="btn btn-primary" data-act="rate" data-id="${esc(p.id)}">${ic('star')}Rate now</button></div></div>`}</div></section>
        <div class="stack va-side">
          <section class="card card-pad"><div class="stat-row">
            <div class="stat"><div class="l">Skill level</div><div class="v">${one(c.avg[p.id])}</div></div>
            <div class="stat"><div class="l">Change</div><div class="v" style="font-size:18px;padding-top:4px">${deltaHtml(c.prev[p.id] != null && c.avg[p.id] != null ? c.avg[p.id] - c.prev[p.id] : null)}</div></div>
            <div class="stat"><div class="l">Trains</div><div class="v">${c.load[p.id] || 0}</div></div></div></section>
          ${ranked.length ? `<section class="card card-pad"><h3 class="mini-title">Strengths</h3><div class="chips">${strengths.map((s) => `<span class="chip">${badge(s.v)} ${esc(s.name)}</span>`).join('')}</div>
            <h3 class="mini-title" style="margin-top:16px">Focus areas</h3><div class="chips">${gaps.map((s) => `<span class="chip">${badge(s.v)} ${esc(s.name)}</span>`).join('')}</div>
            <button class="btn btn-sm" style="margin-top:16px" data-act="assign" data-id="${esc(p.id)}">${ic('training')}Find a trainer for these</button></section>` : ''}
          <section class="card"><div class="card-head"><h2>Training</h2></div>${pairList(trainedBy.filter((t) => t.status !== 'Completed'), 'trainee', `Not being trained right now.`)}${trains.filter((t) => t.status !== 'Completed').length ? `<div class="card-body" style="padding-bottom:4px"><h3 class="mini-title">Training others</h3></div>${pairList(trains.filter((t) => t.status !== 'Completed'), 'trainer', '')}` : ''}</section>
        </div></div>`;
    } else if (tab === 'training') {
      content = `<div class="grid grid-2e">
        <section class="card"><div class="card-head"><h2>Being trained</h2><span class="sub">${esc(p.name.split(' ')[0])} as trainee</span><button class="btn btn-sm right" data-act="assign" data-id="${esc(p.id)}">${ic('plus')}Assign trainer</button></div>${pairList(trainedBy, 'trainee', 'No trainers assigned yet.')}</section>
        <section class="card"><div class="card-head"><h2>Training others</h2><span class="sub">${esc(p.name.split(' ')[0])} as trainer</span><button class="btn btn-sm right" data-act="assign-as-trainer" data-id="${esc(p.id)}">${ic('plus')}Add trainee</button></div>${pairList(trains, 'trainer', 'Not training anyone yet.')}</section></div>`;
    } else if (tab === 'notes') {
      content = `<section class="card"><div class="card-head"><h2>Work notes</h2><span class="sub">Wins, concerns and day-to-day observations</span><button class="btn btn-sm btn-primary right" data-act="note" data-id="${esc(p.id)}">${ic('plus')}Add note</button></div>
        <div class="card-body">${myNotes.length ? `<ul class="timeline">${myNotes.map((n) => `<li><span class="dot-icon ${NOTE_TYPES[n.type] || 'tone-info'}">${ic(n.type === 'Win' ? 'trophy' : n.type === 'Concern' ? 'alert' : 'note')}</span><div>
          <div class="when"><span class="pill plain ${NOTE_TYPES[n.type] || 'tone-info'}">${esc(n.type)}</span> ${fmt(n.ts)} · ${esc(n.manager)} <button class="icon-btn" style="padding:3px;vertical-align:middle" data-act="del-note" data-id="${esc(n.id)}" aria-label="Delete note">${ic('x')}</button></div>
          <div class="txt">${esc(n.text)}</div></div></li>`).join('')}</ul>` : '<div class="empty"><b>No notes yet</b>Keep a running log of how this VA is doing.</div>'}</div></section>`;
    } else {
      const h = (c.hist[p.id] || []).slice().reverse();
      content = `<div class="grid grid-2e"><section class="card"><div class="card-head"><h2>Skill level over time</h2></div><div class="card-body">${lineChart(c.hist[p.id] || [])}</div></section>
        <section class="card"><div class="card-head"><h2>Rating sessions</h2></div>${h.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>By</th><th>Skills rated</th><th>Level</th></tr></thead><tbody>${h.map((s) => `<tr><td class="nowrap">${fmt(s.ts)}</td><td>${esc(s.manager)}</td><td>${Object.keys(s.scores).length}</td><td>${badge(s.avg, true)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No ratings yet.</div>'}</section></div>`;
    }
    const body = `
      <section class="card" style="margin-bottom:20px">
        <div class="profile-head">${avatar(p, 'lg')}
          <div><h1>${esc(p.name)}</h1><div class="meta"><span>${esc(p.role)}</span><span>${esc(p.account || 'No account')}</span><span>Since ${fmt(p.start)}</span>${p.active === 'N' ? '<span class="pill tone-bad">Inactive</span>' : '<span class="pill tone-good">Active</span>'}</div></div>
          <div class="actions"><button class="btn btn-ghost btn-danger" data-act="remove-person" data-id="${esc(p.id)}">${ic('x')}Remove</button><button class="btn" data-act="edit-person" data-id="${esc(p.id)}">${ic('edit')}Edit</button><button class="btn" data-act="note" data-id="${esc(p.id)}">${ic('note')}Add note</button><button class="btn" data-act="assign" data-id="${esc(p.id)}">${ic('training')}Assign trainer</button><button class="btn btn-primary" data-act="rate" data-id="${esc(p.id)}">${ic('star')}Rate skills</button></div>
        </div>
        <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-act="go" data-id="#/va/${esc(p.id)}/${k}">${l}</button>`).join('')}</div>
      </section>${content}`;
    return { title: p.name, crumbs: `<a href="#/team">Team</a><span>/</span><b>${esc(p.name)}</b>`, body };
  }

  function pairList(list, as, emptyMsg) {
    if (!list.length) return emptyMsg ? `<div class="empty">${emptyMsg}</div>` : '';
    return `<ul class="list">${list.map((t) => {
      const other = person(as === 'trainee' ? t.trainerId : t.traineeId);
      return `<li style="cursor:pointer" data-act="open-training" data-id="${esc(t.id)}">${avatar(other)}<div class="grow"><div class="title">${as === 'trainee' ? 'Trainer: ' : 'Trainee: '}${esc(other ? other.name : '—')}</div><div class="meta">${esc(t.skills.join(', '))} · target ${t.target}</div></div>
        <div style="text-align:right"><span class="pill ${STATUS_TONE[t.status]}">${esc(t.status)}</span><div class="meta" style="${isOverdue(t) ? 'color:var(--bad);font-weight:600' : ''}">${t.status === 'Completed' ? 'Done' : 'Due ' + fmtShort(t.due)}</div></div></li>`;
    }).join('')}</ul>`;
  }

  function lineChart(h) {
    const pts = h.filter((s) => s.avg != null);
    if (pts.length < 2) return '<div class="empty">Rate this VA at least twice to see a trend.</div>';
    const W = 520, H = 200, L = 30, R = 12, T = 12, B = 28;
    const t0 = new Date(pts[0].ts).getTime(), t1 = new Date(pts[pts.length - 1].ts).getTime() || t0 + 1;
    const x = (t) => L + ((new Date(t).getTime() - t0) / (t1 - t0 || 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - 1) / 4) * (H - T - B);
    const d = pts.map((s, i) => `${i ? 'L' : 'M'}${x(s.ts).toFixed(1)},${y(s.avg).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Skill level over time">
      ${[1, 2, 3, 4, 5].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" ${v === 1 ? '' : 'stroke-dasharray="3 4"'}/><text x="${L - 10}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="var(--muted)">${v}</text>`).join('')}
      <path d="${d} L${x(pts[pts.length - 1].ts)},${y(1)} L${x(pts[0].ts)},${y(1)} Z" fill="var(--accent)" opacity=".1"/>
      <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
      ${pts.map((s) => `<circle cx="${x(s.ts)}" cy="${y(s.avg)}" r="4.5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.5"><title>${fmt(s.ts)}: ${one(s.avg)}</title></circle><text x="${x(s.ts)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="var(--muted)">${fmtShort(s.ts)}</text>`).join('')}
    </svg>`;
  }

  /* ------------------------------------------------------------------ Training */
  function pageTraining(r) {
    const c = derive();
    const view = r.id === 'trainers' ? 'trainers' : 'board';
    const q = ui.trainQuery.trim().toLowerCase();
    const match = (t) => { if (!q) return true; const a = person(t.traineeId), b = person(t.trainerId); return [a && a.name, b && b.name, t.skills.join(' ')].join(' ').toLowerCase().includes(q); };
    let content;
    if (view === 'board') {
      content = `<div class="board">${STATUSES.map((st) => {
        const list = DB.training.filter((t) => t.status === st && match(t)).sort((a, b) => (a.due < b.due ? -1 : 1));
        return `<section class="col" aria-label="${st}"><div class="col-head"><span class="bar" style="background:${STATUS_BAR[st]}"></span>${st}<span class="n">${list.length}</span></div>
          ${list.length ? list.map(tcard).join('') : '<div class="empty" style="padding:20px">Nothing here.</div>'}</section>`;
      }).join('')}</div>`;
    } else {
      const trainers = activePeople().filter((p) => (c.asTrainer[p.id] || []).length).sort((a, b) => (c.load[b.id] || 0) - (c.load[a.id] || 0));
      const candidates = activePeople().filter((p) => !(c.asTrainer[p.id] || []).length && (c.avg[p.id] || 0) >= 3.6).sort((a, b) => c.avg[b.id] - c.avg[a.id]);
      content = `<div class="grid grid-2e" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${trainers.map((p) => {
        const open = (c.asTrainer[p.id] || []).filter((t) => t.status !== 'Completed');
        const done = (c.asTrainer[p.id] || []).length - open.length;
        const top = weakSkills(p.id).slice().reverse().slice(0, 3);
        return `<section class="card trainer-card"><div class="trainer-top">${avatar(p)}<div class="grow" style="flex:1"><a href="#/va/${esc(p.id)}" style="text-decoration:none;font-weight:600">${esc(p.name)}</a><div class="muted" style="font-size:12.5px">${esc(p.role)} · level ${one(c.avg[p.id])}</div></div>
          <div style="text-align:right"><div class="load" title="${open.length} active trainees">${[0, 1, 2, 3].map((i) => `<i class="${i < open.length ? 'on' : ''}"></i>`).join('')}</div><div class="muted" style="font-size:12px;margin-top:4px">${open.length} active · ${done} done</div></div></div>
          ${open.length ? `<ul class="list" style="margin:0 -20px">${open.map((t) => { const a = person(t.traineeId); return `<li style="cursor:pointer;padding:10px 20px" data-act="open-training" data-id="${esc(t.id)}">${avatar(a, 'sm')}<div class="grow"><div class="title" style="font-size:13px">${esc(a ? a.name : '—')}</div><div class="meta">${esc(t.skills.join(', '))}</div></div><span class="pill ${STATUS_TONE[t.status]}">${t.status}</span></li>`; }).join('')}</ul>` : '<div class="muted">No active trainees.</div>'}
          <div><div class="mini-title" style="margin-bottom:6px">Best at</div><div class="chips">${top.map((s) => `<span class="chip">${badge(s.v)} ${esc(s.name)}</span>`).join('')}</div></div>
          <button class="btn btn-sm" data-act="assign-as-trainer" data-id="${esc(p.id)}">${ic('plus')}Add trainee</button></section>`;
      }).join('')}</div>
      ${candidates.length ? `<section class="card" style="margin-top:20px"><div class="card-head"><h2>Could train others</h2><span class="sub">Strong VAs who aren't training anyone yet</span></div><ul class="list">${candidates.slice(0, 6).map((p) => `<li>${avatar(p)}<div class="grow"><a class="title" href="#/va/${esc(p.id)}" style="text-decoration:none">${esc(p.name)}</a><div class="meta">Level ${one(c.avg[p.id])} · best at ${esc(weakSkills(p.id).slice(-2).map((s) => s.name).join(', '))}</div></div><button class="btn btn-sm" data-act="assign-as-trainer" data-id="${esc(p.id)}">Add trainee</button></li>`).join('')}</ul></section>` : ''}`;
    }
    const body = `
      <div class="page-head"><div><h1>Training</h1><p>Pair VAs with trainers. Any VA can be a trainer and a trainee at the same time.</p></div>
        <div class="actions"><button class="btn btn-primary" data-act="new-training">${ic('plus')}New training</button></div></div>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="View"><button aria-pressed="${view === 'board'}" data-act="go" data-id="#/training">Board</button><button aria-pressed="${view === 'trainers'}" data-act="go" data-id="#/training/trainers">By trainer</button></div>
        ${view === 'board' ? `<label class="search-field">${ic('search')}<span class="sr-only">Search training</span><input class="input" id="train-q" type="search" placeholder="Search VA, trainer or skill" value="${esc(ui.trainQuery)}"></label>` : ''}
        <span class="muted" style="margin-left:auto">${c.openT.length} active · ${DB.training.filter(isOverdue).length} overdue</span>
      </div>${content}`;
    return {
      title: 'Training', crumbs: `<a href="#/training">Training</a>${view === 'trainers' ? '<span>/</span><b>By trainer</b>' : ''}`, body,
      after() { const i = $('#train-q'); if (i) i.addEventListener('change', (e) => { ui.trainQuery = e.target.value; render(); }); },
    };
  }

  function tcard(t) {
    const c = derive(), a = person(t.traineeId), b = person(t.trainerId);
    const m = c.latest[t.traineeId] || {};
    const cur = t.skills.map((s) => m[s] || 0);
    const curAvg = cur.length ? cur.reduce((x, y) => x + y, 0) / cur.length : 0;
    const pct = Math.min(100, Math.round((curAvg / t.target) * 100));
    return `<article class="tcard" data-act="open-training" data-id="${esc(t.id)}" tabindex="0">
      <div class="pair">${avatar(a)}<div class="who"><b>${esc(a ? a.name : '—')}</b><span>trained by ${esc(b ? b.name : '—')}</span></div></div>
      <div class="chips">${t.skills.map((s) => `<span class="chip">${badge(m[s])} ${esc(s)}</span>`).join('')}</div>
      <div><div class="meter"><div class="meter-track"><div class="meter-fill" style="width:${pct}%;background:var(--accent)"></div></div><span class="muted" style="font-size:12px;white-space:nowrap">${curAvg ? one(curAvg) + ' → ' + t.target : 'Not rated yet · target ' + t.target}</span></div></div>
      <div class="tfoot">${ic('clock').replace('<svg', '<svg style="width:14px;height:14px"')}<span style="${isOverdue(t) ? 'color:var(--bad);font-weight:600' : ''}">${t.status === 'Completed' ? 'Completed' : (isOverdue(t) ? 'Overdue · ' : 'Due ') + fmtShort(t.due)}</span><span class="right">${avatar(b, 'sm')}</span></div>
    </article>`;
  }

  /* ------------------------------------------------------------------ Matrix */
  function pageMatrix() {
    const c = derive();
    const cats = categories();
    const skills = activeSkills().filter((s) => ui.matrixCat === 'all' || s.category === ui.matrixCat);
    const q = ui.matrixQuery.trim().toLowerCase();
    const people = activePeople().filter((p) => !q || p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    const groups = []; skills.forEach((s) => { const g = groups[groups.length - 1]; if (g && g.cat === s.category) g.n++; else groups.push({ cat: s.category, n: 1 }); });
    const body = `
      <div class="page-head"><div><h1>Skill matrix</h1><p>Every VA against every skill. Click a cell to update a rating.</p></div>
        <div class="actions"><div class="legend">${SCALE.map((s) => `<span><i class="sc${s.n}"></i>${s.n} ${s.label}</span>`).join('')}</div></div></div>
      <div class="toolbar">
        <label class="search-field">${ic('search')}<span class="sr-only">Search VAs</span><input class="input" id="mx-q" type="search" placeholder="Filter VAs" value="${esc(ui.matrixQuery)}"></label>
        <label><span class="sr-only">Category</span><select class="select" id="mx-cat"><option value="all">All categories</option>${cats.map((k) => `<option ${ui.matrixCat === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
      </div>
      <section class="card"><div class="matrix-wrap"><table class="matrix">
        <thead><tr><th class="rowhead" rowspan="2" style="vertical-align:bottom;padding:10px 14px">VA</th>${groups.map((g) => `<th class="cat" colspan="${g.n}">${esc(g.cat)}</th>`).join('')}<th class="cat" rowspan="2" style="vertical-align:bottom;text-align:center">Avg</th></tr>
          <tr>${skills.map((s) => `<th class="sk" title="${esc(s.name)}">${esc(s.name)}</th>`).join('')}</tr></thead>
        <tbody>${people.map((p) => { const m = c.latest[p.id] || {}; return `<tr><th class="rowhead" scope="row"><a class="person" href="#/va/${esc(p.id)}" style="text-decoration:none">${avatar(p, 'sm')}<span class="nm" style="font-weight:600">${esc(p.name)}</span></a></th>
          ${skills.map((s) => `<td class="cell"><button class="sc${lvl(m[s.name])}" data-act="rate" data-id="${esc(p.id)}" aria-label="${esc(p.name)}, ${esc(s.name)}: ${m[s.name] || 'not rated'}">${m[s.name] || '–'}</button></td>`).join('')}
          <td class="cell">${badge(c.avg[p.id], true)}</td></tr>`; }).join('')}</tbody>
        <tfoot><tr><td class="rowhead" style="text-align:left;padding-left:14px">Team average</td>${skills.map((s) => `<td><span class="score-badge sc${lvl(c.skillAvg[s.name])}">${one(c.skillAvg[s.name])}</span></td>`).join('')}<td>${badge(c.team, true)}</td></tr></tfoot>
      </table></div></section>`;
    return {
      title: 'Skill matrix', crumbs: '<b>Skill matrix</b>', body,
      after() {
        $('#mx-cat').addEventListener('change', (e) => { ui.matrixCat = e.target.value; render(); });
        $('#mx-q').addEventListener('change', (e) => { ui.matrixQuery = e.target.value; render(); });
      },
    };
  }

  /* ------------------------------------------------------------------ Settings */
  function currentScheme() { const m = $('meta[name="color-scheme"]'); return m.content === 'light' || m.content === 'dark' ? m.content : 'system'; }
  function setScheme(v) {
    $('meta[name="color-scheme"]').content = v === 'system' ? 'light dark' : v;
    if (v === 'system') store.del('tt-color-scheme'); else store.set('tt-color-scheme', v);
  }
  function pageSettings() {
    const s = DB.settings;
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const body = `
      <div class="page-head"><div><h1>Settings</h1><p>Team details, managers, skills and appearance.</p></div></div>
      <div class="grid grid-2e" style="align-items:start">
        <div class="stack">
          <section class="card"><div class="card-head"><h2>Team</h2></div><form class="card-body" data-form="team" style="display:flex;flex-direction:column;gap:14px">
            <label class="field"><span>Team name</span><input class="input" name="teamName" value="${esc(s.teamName)}" required></label>
            <label class="field"><span>Re-rate every</span><select class="select" name="reassessDays">${[30, 45, 60, 90].map((d) => `<option value="${d}" ${s.reassessDays === d ? 'selected' : ''}>${d} days</option>`).join('')}</select><small>VAs not rated within this window appear under "Needs your attention".</small></label>
            <div><button class="btn btn-primary">Save</button></div></form></section>
          <section class="card"><div class="card-head"><h2>Managers</h2><span class="sub">Up to 3 people use this portal</span></div>
            <ul class="list">${s.managers.map((m) => `<li>${avatar({ id: 'm', name: m })}<div class="grow"><div class="title">${esc(m)}</div>${m === ME ? '<div class="meta">You</div>' : ''}</div>${s.managers.length > 1 && m !== ME ? `<button class="btn btn-sm btn-ghost btn-danger" data-act="del-manager" data-id="${esc(m)}">Remove</button>` : ''}</li>`).join('')}</ul>
            ${s.managers.length < 3 ? `<form class="card-body" data-form="manager" style="display:flex;gap:8px;border-top:1px solid var(--line)"><label class="sr-only" for="mgr-name">Manager name</label><input class="input" id="mgr-name" name="name" placeholder="Full name" required><button class="btn">${ic('plus')}Add</button></form>` : ''}</section>
          <section class="card"><div class="card-head"><h2>Appearance</h2></div><div class="card-body">
            <div class="seg" role="group" aria-label="Colour scheme">${[['system', `System (currently ${sysDark ? 'dark' : 'light'})`], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button type="button" aria-pressed="${currentScheme() === k}" data-act="scheme" data-id="${k}">${l}</button>`).join('')}</div></div></section>
          <section class="card"><div class="card-head"><h2>Data</h2></div><div class="card-body" style="display:flex;flex-direction:column;gap:8px">
            <div><span class="pill ${DEMO ? 'tone-warn' : 'tone-good'}">${DEMO ? 'Sample data' : 'Connected to Google Sheet'}</span></div>
            <p class="muted" style="margin:0">${DEMO ? 'Paste your Apps Script web app URL into <code>config.js</code> to switch to your real team. Changes made here are not saved.' : 'Every change is saved to the Team Troy Google Sheet. You can open the sheet any time to read or export the data.'}</p></div></section>
        </div>
        <section class="card"><div class="card-head"><h2>Skills</h2><span class="sub">${activeSkills().length} active</span><button class="btn btn-sm right" data-act="add-skill">${ic('plus')}Add skill</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Skill</th><th>Category</th><th>Status</th><th><span class="sr-only">Edit</span></th></tr></thead><tbody>
          ${DB.skills.map((k, i) => `<tr><td style="font-weight:500">${esc(k.name)}</td><td class="muted">${esc(k.category)}</td><td>${k.active === 'N' ? '<span class="pill tone-bad">Hidden</span>' : '<span class="pill tone-good">Active</span>'}</td><td><button class="icon-btn" data-act="edit-skill" data-id="${i}" aria-label="Edit ${esc(k.name)}">${ic('edit')}</button></td></tr>`).join('')}
          </tbody></table></div></section>
      </div>`;
    return {
      title: 'Settings', crumbs: '<b>Settings</b>', body,
      after() {
        $('[data-form="team"]').addEventListener('submit', (e) => {
          e.preventDefault(); const f = new FormData(e.target);
          const next = Object.assign({}, DB.settings, { teamName: f.get('teamName').trim(), reassessDays: Number(f.get('reassessDays')) });
          save('saveSettings', { settings: next }, () => { DB.settings = next; }, 'Settings saved');
        });
        const mf = $('[data-form="manager"]');
        if (mf) mf.addEventListener('submit', (e) => {
          e.preventDefault(); const n = new FormData(e.target).get('name').trim(); if (!n) return;
          const next = Object.assign({}, DB.settings, { managers: DB.settings.managers.concat(n) });
          save('saveSettings', { settings: next }, () => { DB.settings = next; }, n + ' added as a manager');
        });
      },
    };
  }

  /* ------------------------------------------------------------------ dialogs */
  function modal({ title, sub, body, submit = 'Save', wide, danger, onSubmit, onMount }) {
    const d = document.createElement('dialog');
    d.className = 'modal' + (wide ? ' wide' : '');
    d.innerHTML = `<form class="modal-form" method="dialog" novalidate>
      <div class="modal-head"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">${danger ? `<button type="button" class="btn btn-ghost btn-danger left" data-danger>${danger.label}</button>` : ''}<button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" value="ok">${submit}</button></div></form>`;
    document.body.appendChild(d);
    const form = d.querySelector('form');
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    if (danger) d.querySelector('[data-danger]').addEventListener('click', () => { if (confirm(danger.confirm)) { d.close(); danger.run(); } });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const firstBad = $$('[required]', form).find((el) => !String(el.value).trim());
      if (firstBad) { firstBad.focus(); firstBad.reportValidity && firstBad.reportValidity(); return; }
      const res = onSubmit(new FormData(form), form);
      if (res !== false) d.close();
    });
    d.showModal();
    if (onMount) onMount(d, form);
    return d;
  }
  const personOptions = (sel, exclude) => activePeople().filter((p) => p.id !== exclude).sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');

  function rateDialog(pid) {
    const c = derive();
    const renderList = (id) => {
      const m = c.latest[id] || {};
      return categories().map((cat) => `<div class="rate-cat">${esc(cat)}</div>${activeSkills().filter((s) => s.category === cat).map((s) => {
        const v = m[s.name];
        const key = 'r_' + btoa(unescape(encodeURIComponent(s.name))).replace(/=/g, '');
        return `<div class="rate-row"><div><div class="nm">${esc(s.name)}</div><div class="hint" data-hint>${v ? `Current: ${v} · ${SCALE[v - 1].label}` : 'Not rated yet'}</div></div>
          <fieldset class="scale" aria-label="${esc(s.name)}" data-skill="${esc(s.name)}">${SCALE.map((x) => `<label title="${x.n} · ${x.label}: ${x.desc}"><input type="radio" name="${key}" value="${x.n}" ${v === x.n ? 'checked' : ''}><span>${x.n}</span></label>`).join('')}</fieldset></div>`;
      }).join('')}`).join('');
    };
    const first = pid || (activePeople()[0] || {}).id;
    modal({
      title: 'Rate skills', sub: 'Tap a level for each skill. Unchanged skills keep their current score.', wide: true, submit: 'Save ratings',
      body: `<div class="row2"><label class="field"><span>VA</span><select class="select" name="pid" ${pid ? 'disabled' : ''}>${personOptions(first)}</select></label>
        <label class="field"><span>Date</span><input class="input" type="date" name="date" value="${isoDay(new Date())}" max="${isoDay(new Date())}"></label></div>
        <div class="scale-key">${SCALE.map((x) => `<span><b>${x.n}</b> ${x.label} — ${x.desc}</span>`).join('')}</div>
        <div class="rate-list" id="rate-list">${renderList(first)}</div>
        <label class="field"><span>Note <span class="muted" style="font-weight:400">(optional)</span></span><textarea class="textarea" name="note" placeholder="Anything worth remembering about this rating?"></textarea></label>`,
      onMount(d, form) {
        const sel = form.elements.pid;
        sel.addEventListener('change', () => { $('#rate-list', d).innerHTML = renderList(sel.value); });
        form.addEventListener('change', (e) => {
          if (e.target.type !== 'radio') return;
          const x = SCALE[Number(e.target.value) - 1];
          e.target.closest('.rate-row').querySelector('[data-hint]').innerHTML = `<b style="color:var(--ink)">${x.n} · ${x.label}</b> — ${x.desc}`;
        });
      },
      onSubmit(f, form) {
        const id = form.elements.pid.value;
        const p = person(id);
        const dt = f.get('date') || isoDay(new Date());
        const ts = dt === isoDay(new Date()) ? new Date().toISOString() : new Date(dt + 'T12:00:00').toISOString();
        const rows = $$('fieldset.scale', form).map((fs) => { const ch = fs.querySelector('input:checked'); return ch ? { ts, personId: id, skill: fs.dataset.skill, score: Number(ch.value), manager: ME, note: '' } : null; }).filter(Boolean);
        if (!rows.length) { toast('Pick at least one level', true); return false; }
        const note = String(f.get('note') || '').trim();
        if (note) rows[0].note = note;
        save('saveRatings', { rows, note: note ? { id: 'n' + uid(), personId: id, ts, type: 'Note', text: 'Rating note: ' + note, manager: ME } : null }, () => {
          DB.ratings.push(...rows);
          if (note) DB.notes.push({ id: 'n' + uid(), personId: id, ts, type: 'Note', text: 'Rating note: ' + note, manager: ME });
        }, `Saved ${rows.length} ratings for ${p ? p.name : 'VA'}`);
      },
    });
  }

  function trainingDialog(opts) {
    const c = derive();
    const t = opts.id ? DB.training.find((x) => x.id === opts.id) : null;
    const traineeId = t ? t.traineeId : opts.traineeId || '';
    const trainerPre = t ? t.trainerId : opts.trainerId || '';
    const defaultSkills = (id) => weakSkills(id).filter((s) => s.v <= 3).slice(0, 2).map((s) => s.name);
    const chosen = t ? t.skills : traineeId ? defaultSkills(traineeId) : [];
    const skillChips = (sel, id) => { const m = c.latest[id] || {}; return activeSkills().map((s) => `<label><input type="checkbox" name="skills" value="${esc(s.name)}" ${sel.includes(s.name) ? 'checked' : ''}><span>${esc(s.name)}${m[s.name] ? ` <b style="opacity:.6">${m[s.name]}</b>` : ''}</span></label>`).join(''); };
    const suggestHtml = (tid, skills, current) => {
      const list = suggestTrainers(tid, skills);
      if (!tid || !skills.length) return '<div class="muted">Choose a trainee and at least one focus skill to see suggested trainers.</div>';
      if (!list.length) return '<div class="muted">No one is rated 3.5+ on all of these skills yet — pick a trainer below.</div>';
      return list.map((x, i) => `<label><input type="radio" name="suggested" value="${esc(x.p.id)}" ${current === x.p.id || (!current && i === 0) ? 'checked' : ''}>${avatar(x.p)}<div class="grow"><div style="font-weight:600">${esc(x.p.name)} ${i === 0 ? '<span class="best">· Best match</span>' : ''}</div><div class="why">Level ${one(x.lv)} in ${skills.length === 1 ? esc(skills[0]) : 'these skills'} · training ${x.load} VA${x.load === 1 ? '' : 's'} now</div></div>${badge(x.lv, true)}</label>`).join('');
    };
    modal({
      title: t ? 'Training' : 'New training', sub: t ? `Started ${fmt(t.start)}` : 'Choose a trainee, what they need to learn, and who will train them.', wide: true, submit: t ? 'Save changes' : 'Assign trainer',
      danger: t ? { label: 'Delete', confirm: 'Delete this training?', run: () => save('deleteTraining', { id: t.id }, () => { DB.training = DB.training.filter((x) => x.id !== t.id); }, 'Training deleted') } : null,
      body: `<label class="field"><span>Trainee</span><select class="select" name="traineeId" required><option value="">Select a VA…</option>${personOptions(traineeId)}</select></label>
        <div class="field"><span>Focus skills</span><small>Their lowest-rated skills are pre-selected. The number shows their current level.</small><div class="check-chips" id="tr-skills">${skillChips(chosen, traineeId)}</div></div>
        <div class="field"><span>Suggested trainers</span><div class="suggest" id="tr-suggest">${suggestHtml(traineeId, chosen, trainerPre)}</div></div>
        <label class="field"><span>Or choose any trainer</span><select class="select" name="trainerOther"><option value="">— Use the suggestion above —</option>${personOptions(trainerPre, traineeId)}</select></label>
        <div class="row3"><label class="field"><span>Target level</span><select class="select" name="target">${[3, 4, 5].map((n) => `<option value="${n}" ${(t ? t.target : 4) === n ? 'selected' : ''}>${n} · ${SCALE[n - 1].label}</option>`).join('')}</select></label>
          <label class="field"><span>Start</span><input class="input" type="date" name="start" value="${esc(t ? t.start : isoDay(new Date()))}"></label>
          <label class="field"><span>Due</span><input class="input" type="date" name="due" value="${esc(t ? t.due : isoDay(Date.now() + 28 * DAY))}"></label></div>
        <label class="field"><span>Status</span><select class="select" name="status">${STATUSES.map((s) => `<option ${(t ? t.status : 'Planned') === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="field"><span>Notes</span><textarea class="textarea" name="notes" placeholder="Plan, schedule, materials…">${esc(t ? t.notes : '')}</textarea></label>`,
      onMount(d, form) {
        const pre = trainerPre && !suggestTrainers(traineeId, chosen).some((x) => x.p.id === trainerPre);
        if (pre) form.elements.trainerOther.value = trainerPre;
        const refresh = () => {
          const tid = form.elements.traineeId.value;
          const sk = $$('input[name="skills"]:checked', form).map((i) => i.value);
          $('#tr-suggest', d).innerHTML = suggestHtml(tid, sk, form.elements.trainerOther.value ? '' : (form.querySelector('input[name="suggested"]:checked') || {}).value);
        };
        form.elements.traineeId.addEventListener('change', () => {
          const tid = form.elements.traineeId.value;
          $('#tr-skills', d).innerHTML = skillChips(defaultSkills(tid), tid);
          form.elements.trainerOther.innerHTML = `<option value="">— Use the suggestion above —</option>${personOptions('', tid)}`;
          refresh();
        });
        $('#tr-skills', d).addEventListener('change', refresh);
      },
      onSubmit(f) {
        const traineeId2 = f.get('traineeId');
        const trainerId = f.get('trainerOther') || f.get('suggested');
        const skills = f.getAll('skills');
        if (!skills.length) { toast('Pick at least one focus skill', true); return false; }
        if (!trainerId) { toast('Choose a trainer', true); return false; }
        if (trainerId === traineeId2) { toast('A VA cannot train themselves', true); return false; }
        const rec = Object.assign({}, t || { id: 't' + uid(), created: new Date().toISOString() }, {
          traineeId: traineeId2, trainerId, skills, target: Number(f.get('target')), start: f.get('start'), due: f.get('due'), status: f.get('status'), notes: String(f.get('notes') || '').trim(), updated: new Date().toISOString(),
        });
        const a = person(traineeId2), b = person(trainerId);
        save('saveTraining', { training: rec }, () => { DB.training = DB.training.filter((x) => x.id !== rec.id).concat(rec); }, t ? 'Training updated' : `${b.name} will train ${a.name}`);
      },
    });
  }

  function noteDialog(pid) {
    const p = person(pid);
    modal({
      title: 'Add note', sub: p ? esc(p.name) : '', submit: 'Add note',
      body: `<div class="field"><span>Type</span><div class="check-chips">${Object.keys(NOTE_TYPES).map((k, i) => `<label><input type="radio" name="type" value="${k}" ${i === 0 ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div></div>
        <label class="field"><span>Note</span><textarea class="textarea" name="text" required placeholder="What happened? e.g. client feedback, missed deadline, great work…" style="min-height:120px"></textarea></label>`,
      onSubmit(f) {
        const n = { id: 'n' + uid(), personId: pid, ts: new Date().toISOString(), type: f.get('type'), text: String(f.get('text')).trim(), manager: ME };
        save('saveNote', { note: n }, () => { DB.notes.push(n); }, 'Note added');
      },
    });
  }

  function personDialog(pid) {
    const p = pid ? person(pid) : null;
    modal({
      title: p ? 'Edit VA' : 'Add VA', submit: p ? 'Save' : 'Add VA',
      danger: p ? { label: 'Remove VA', confirm: `Remove ${p.name} from the team?\n\nThis deletes their ratings, notes and trainings for good. To keep their history, set Status to Inactive instead.`, run: () => removePerson(p.id) } : null,
      body: `<label class="field"><span>Full name</span><input class="input" name="name" required value="${esc(p ? p.name : '')}" autocomplete="off"></label>
        <div class="row2"><label class="field"><span>Role</span><select class="select" name="role">${ROLES.map((r) => `<option ${(p ? p.role : 'VA') === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
          <label class="field"><span>Client / account</span><input class="input" name="account" value="${esc(p ? p.account : '')}"></label></div>
        <div class="row2"><label class="field"><span>Start date</span><input class="input" type="date" name="start" value="${esc(p ? p.start : isoDay(new Date()))}"></label>
          <label class="field"><span>Status</span><select class="select" name="active"><option value="Y" ${!p || p.active !== 'N' ? 'selected' : ''}>Active</option><option value="N" ${p && p.active === 'N' ? 'selected' : ''}>Inactive</option></select></label></div>`,
      onSubmit(f) {
        const name = String(f.get('name')).trim().replace(/\s+/g, ' ');
        if (DB.people.some((x) => x.name.toLowerCase() === name.toLowerCase() && (!p || x.id !== p.id))) { toast(name + ' is already on the team', true); return false; }
        const rec = Object.assign({}, p || { id: 'p' + uid() }, { name, role: f.get('role'), account: String(f.get('account')).trim(), start: f.get('start'), active: f.get('active') });
        save('savePerson', { person: rec }, () => { DB.people = DB.people.filter((x) => x.id !== rec.id).concat(rec); }, p ? 'Saved' : name + ' added');
        if (!p) { render.keepScroll = false; location.hash = '#/va/' + rec.id; }
      },
    });
  }

  function removePerson(id) {
    const p = person(id);
    if (!p) return;
    render.keepScroll = false;
    if (location.hash.indexOf('#/va/' + id) === 0) location.hash = '#/team';
    save('deletePerson', { id }, () => {
      DB.people = DB.people.filter((x) => x.id !== id);
      DB.ratings = DB.ratings.filter((r) => r.personId !== id);
      DB.notes = DB.notes.filter((n) => n.personId !== id);
      DB.training = DB.training.filter((t) => t.traineeId !== id && t.trainerId !== id);
    }, p.name + ' removed from the team');
  }

  function skillDialog(i) {
    const k = i != null ? DB.skills[i] : null;
    const cats = [...new Set(DB.skills.map((s) => s.category))];
    modal({
      title: k ? 'Edit skill' : 'Add skill', submit: k ? 'Save' : 'Add skill',
      body: `<label class="field"><span>Skill name</span><input class="input" name="name" required value="${esc(k ? k.name : '')}" ${k ? 'readonly' : ''}>${k ? '<small>Names can\'t be changed once rated — hide it and add a new one instead.</small>' : ''}</label>
        <label class="field"><span>Category</span><input class="input" name="category" list="cat-list" required value="${esc(k ? k.category : '')}"><datalist id="cat-list">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label class="field"><span>Status</span><select class="select" name="active"><option value="Y">Active</option><option value="N" ${k && k.active === 'N' ? 'selected' : ''}>Hidden</option></select></label>`,
      onSubmit(f) {
        const rec = { name: String(f.get('name')).trim(), category: String(f.get('category')).trim(), active: f.get('active') };
        if (!k && DB.skills.some((s) => s.name.toLowerCase() === rec.name.toLowerCase())) { toast('That skill already exists', true); return false; }
        const next = DB.skills.slice(); if (k) next[i] = rec; else next.push(rec);
        save('saveSkills', { skills: next }, () => { DB.skills = next; }, k ? 'Skill saved' : 'Skill added');
      },
    });
  }

  /* ------------------------------------------------------------------ command palette */
  function palette() {
    const d = document.createElement('dialog');
    d.className = 'palette';
    d.innerHTML = `<div class="palette-input">${ic('search')}<input type="text" placeholder="Search VAs, pages or actions…" aria-label="Search" autocomplete="off"></div><ul class="palette-list" role="listbox"></ul>`;
    document.body.appendChild(d);
    const input = $('input', d), list = $('ul', d);
    const pages = [['Home', '#/'], ['Team', '#/team'], ['Training', '#/training'], ['Trainers', '#/training/trainers'], ['Skill matrix', '#/matrix'], ['Settings', '#/settings']];
    const actions = [['Rate a VA', () => rateDialog()], ['New training', () => trainingDialog({})], ['Add VA', () => personDialog()]];
    let items = [], sel = 0;
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      const ppl = DB.people.filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.account).toLowerCase().includes(q)).slice(0, 7);
      const pg = pages.filter(([l]) => !q || l.toLowerCase().includes(q));
      const ac = actions.filter(([l]) => !q || l.toLowerCase().includes(q));
      items = [];
      let html = '';
      if (ppl.length) { html += '<li class="palette-group" role="presentation">VAs</li>'; ppl.forEach((p) => { items.push(() => { location.hash = '#/va/' + p.id; }); html += `<li role="option" data-i="${items.length - 1}">${avatar(p, 'sm')}<span>${esc(p.name)}</span><span class="k">${esc(p.account || p.role)}</span></li>`; }); }
      if (ac.length) { html += '<li class="palette-group" role="presentation">Actions</li>'; ac.forEach(([l, fn]) => { items.push(fn); html += `<li role="option" data-i="${items.length - 1}"><span class="dot-icon tone-accent" style="width:26px;height:26px">${ic('plus')}</span><span>${l}</span></li>`; }); }
      if (pg.length) { html += '<li class="palette-group" role="presentation">Pages</li>'; pg.forEach(([l, h]) => { items.push(() => { location.hash = h; }); html += `<li role="option" data-i="${items.length - 1}"><span class="dot-icon tone-info" style="width:26px;height:26px">${ic('chevron')}</span><span>${l}</span></li>`; }); }
      list.innerHTML = html || '<li class="palette-group">No results</li>';
      sel = 0; mark();
    };
    const mark = () => $$('[role="option"]', list).forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === sel)));
    const go = (i) => { const fn = items[i]; d.close(); if (fn) fn(); };
    input.addEventListener('input', draw);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); mark(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); e.preventDefault(); }
      else if (e.key === 'Enter') { go(sel); e.preventDefault(); }
    });
    list.addEventListener('click', (e) => { const li = e.target.closest('[role="option"]'); if (li) go(Number(li.dataset.i)); });
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => d.remove());
    draw(); d.showModal(); input.focus();
  }

  /* ------------------------------------------------------------------ manager pick & sign in */
  function renderWho() {
    const ms = DB.settings.managers.length ? DB.settings.managers : [];
    $('#app').innerHTML = `<div class="login"><div class="login-art"><a class="brand" style="padding:0">${MARK}<div><div class="brand-name">${esc(DB.settings.teamName)}</div><div class="brand-sub">Training Portal</div></div></a>
      <div><h2>Grow every VA on the team.</h2><p>Rate skills, pair VAs with the right trainer and keep track of how everyone is doing — all in one place.</p></div><div style="color:#8E99B3;font-size:12px">For ${esc(DB.settings.teamName)} managers</div></div>
      <div class="login-form"><form class="login-box" id="who">
        <div><h1>Who's managing today?</h1><p class="muted" style="margin:6px 0 0">Your name is saved with every rating and note.</p></div>
        <div class="who-list">${ms.map((m) => `<button type="button" data-name="${esc(m)}">${avatar({ id: 'm', name: m })}${esc(m)}</button>`).join('')}</div>
        ${ms.length < 3 ? `<label class="field"><span>${ms.length ? 'Someone else' : 'Your name'}</span><div style="display:flex;gap:8px"><input class="input" name="name" placeholder="Full name"><button class="btn btn-primary">Continue</button></div></label>` : ''}
      </form></div></div>`;
    const pick = (n) => {
      ME = n; store.set('tt-manager', n);
      if (!DB.settings.managers.includes(n)) { const next = Object.assign({}, DB.settings, { managers: DB.settings.managers.concat(n) }); DB.settings = next; api('saveSettings', { settings: next }).catch(() => {}); }
      render.keepScroll = false; render();
    };
    $$('#who [data-name]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.name)));
    $('#who').addEventListener('submit', (e) => { e.preventDefault(); const n = String(new FormData(e.target).get('name') || '').trim(); if (n) pick(n); });
  }

  function renderLogin(err) {
    $('#app').innerHTML = `<div class="login"><div class="login-art"><a class="brand" style="padding:0">${MARK}<div><div class="brand-name">${esc(CFG.TEAM_NAME || 'Team Troy')}</div><div class="brand-sub">Training Portal</div></div></a>
      <div><h2>Grow every VA on the team.</h2><p>Rate skills, pair VAs with the right trainer and keep track of how everyone is doing.</p></div><div style="color:#8E99B3;font-size:12px">Managers only</div></div>
      <div class="login-form"><form class="login-box" id="login"><div><h1>Sign in</h1><p class="muted" style="margin:6px 0 0">Enter the manager password.</p></div>
        <label class="field"><span>Password</span><input class="input" type="password" name="pw" autocomplete="current-password" required autofocus></label>
        <div class="err" role="alert">${esc(err || '')}</div><button class="btn btn-primary" style="padding:11px">Sign in</button></form></div></div>`;
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault();
      PW = new FormData(e.target).get('pw');
      e.target.querySelector('button').textContent = 'Signing in…';
      try { await load(); store.set('tt-pw', PW, true); render(); }
      catch (err2) { PW = ''; renderLogin(err2.message); }
    });
  }

  /* ------------------------------------------------------------------ global events */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) {
      const row = e.target.closest('tr[data-href]');
      if (row && !e.target.closest('a,button')) location.hash = row.dataset.href;
      return;
    }
    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'rate': return rateDialog(id);
      case 'assign': return trainingDialog({ traineeId: id });
      case 'assign-as-trainer': return trainingDialog({ trainerId: id });
      case 'new-training': return trainingDialog({});
      case 'open-training': return trainingDialog({ id });
      case 'note': return noteDialog(id);
      case 'del-note': if (confirm('Delete this note?')) save('deleteNote', { id }, () => { DB.notes = DB.notes.filter((n) => n.id !== id); }, 'Note deleted'); return;
      case 'edit-person': return personDialog(id);
      case 'remove-person': { const p = person(id); if (p && confirm(`Remove ${p.name} from the team?\n\nThis deletes their ratings, notes and trainings for good. To keep their history, edit them and set Status to Inactive instead.`)) removePerson(id); return; }
      case 'add-person': return personDialog();
      case 'add-skill': return skillDialog();
      case 'edit-skill': return skillDialog(Number(id));
      case 'team-filter': ui.teamFilter = id; return render();
      case 'go': location.hash = id; return;
      case 'palette': return palette();
      case 'scheme': setScheme(id); return render();
      case 'switch-manager': ME = ''; store.del('tt-manager'); return render();
      case 'del-manager': {
        if (!confirm(`Remove ${id} as a manager?`)) return;
        const next = Object.assign({}, DB.settings, { managers: DB.settings.managers.filter((m) => m !== id) });
        return save('saveSettings', { settings: next }, () => { DB.settings = next; }, id + ' removed');
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (DB && ME && !$('dialog[open]')) palette(); }
    if (e.key === 'Enter' && e.target.matches('.tcard')) e.target.click();
  });
  window.addEventListener('storage', (e) => { if (e.key === 'tt-color-scheme') $('meta[name="color-scheme"]').content = e.newValue || 'light dark'; });

  /* ------------------------------------------------------------------ boot */
  async function boot() {
    $('#app').innerHTML = '<div class="loading"><div><div class="spinner"></div>Loading Team Troy…</div></div>';
    if (DEMO) { await load(); if (PREVIEW && !ME) ME = DB.settings.managers[0]; return render(); }
    if (!PW) return renderLogin();
    try { await load(); render(); } catch (err) { PW = ''; store.del('tt-pw', true); renderLogin(err.message); }
  }
  boot();
})();
