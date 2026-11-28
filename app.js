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
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
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
    chat: '<path d="M4 5.5h16v11H9.5L5 20.5v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7.5h8M8 11h6"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 19.5h15"/>',
    logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
    pin: '<path d="M9 3.5h6l-1 6.5 3.5 3.5h-11L10 10z"/><path d="M12 13.5v7"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3.5V8h4.5M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 20.5V16h-4.5"/>',
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
  const fmt = (v, opt) => (v ? new Date(/^\d{4}-\d\d-\d\d$/.test(v) ? v + 'T00:00:00' : v).toLocaleDateString(undefined, opt || { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
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
  const agoTime = (v) => { const m = Math.floor((Date.now() - new Date(v)) / 60000); if (!(m >= 0)) return ago(v); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; if (m < 720) return Math.floor(m / 60) + ' h ago'; return ago(v); };
  const one = (n) => (n == null || isNaN(n) ? '—' : (Math.round(n * 10) / 10).toFixed(1));
  const MAX = 10; // rating scale is 1–10
  const lvl = (n) => (!n || isNaN(n) ? 0 : Math.max(1, Math.min(MAX, Math.round(n))));
  const initials = (n) => String(n || '?').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const AV = ['#1E3058', '#8A5E1F', '#2F6B5A', '#6B3F6E', '#2C5C9A', '#9A4A35', '#4F5D2F', '#3D4C7A', '#7A5A2C', '#355E6E'];
  const avColor = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
  const avatar = (p, cls = '') => `<span class="avatar ${cls}" style="background:${avColor(p ? p.id + p.name : '?')}" aria-hidden="true">${esc(initials(p ? p.name : '?'))}</span>`;
  const deltaHtml = (d) => {
    if (d == null || isNaN(d)) return '<span class="delta flat">—</span>';
    if (Math.abs(d) < 0.05) return '<span class="delta flat">±0.0</span>';
    return d > 0 ? `<span class="delta up">▲ ${one(d)}</span>` : `<span class="delta down">▼ ${one(-d)}</span>`;
  };
  const meter = (v) => `<div class="meter"><div class="meter-track"><div class="meter-fill" style="width:${v ? (v / MAX) * 100 : 0}%;background:var(--bar${lvl(v) || 1})"></div></div><span class="meter-val">${one(v)}</span></div>`;
  const segs = (v) => `<div class="segs" aria-label="${v || 0} out of ${MAX}">${Array.from({ length: MAX }, (_, k) => k + 1).map((i) => `<i style="${v && i <= v ? `background:var(--bar${lvl(v)})` : ''}"></i>`).join('')}</div>`;
  const badge = (v, dec) => `<span class="score-badge sc${lvl(v)}">${v ? (dec ? one(v) : Number.isInteger(v) ? v : one(v)) : '0'}</span>`;

  const SCALE = [
    { n: 1, label: 'Beginner', desc: 'no experience yet' },
    { n: 2, label: 'Novice', desc: 'knows the basics in theory' },
    { n: 3, label: 'Learning', desc: 'simple tasks with close help' },
    { n: 4, label: 'Developing', desc: 'simple tasks with some help' },
    { n: 5, label: 'Capable', desc: 'routine tasks, occasional help' },
    { n: 6, label: 'Competent', desc: 'works on their own' },
    { n: 7, label: 'Proficient', desc: 'reliable on most work' },
    { n: 8, label: 'Strong', desc: 'handles complex work' },
    { n: 9, label: 'Advanced', desc: 'the go-to person on the team' },
    { n: 10, label: 'Expert', desc: 'can teach others' },
  ];
  // Thresholds on the 1–10 scale
  const WEAK = 4;          // at or below: a skill gap
  const TRAINER_AVG = 7;   // suggested trainers: average on the chosen skills…
  const TRAINER_MIN = 6;   // …and no chosen skill below this
  const FOCUS = 6;         // at or below: pre-selected as a training focus
  const TARGETS = [6, 7, 8, 9, 10], DEFAULT_TARGET = 8;
  const STATUSES = ['Planned', 'In progress', 'Completed'];
  const STATUS_TONE = { Planned: 'tone-info', 'In progress': 'tone-accent', Completed: 'tone-good' };
  const STATUS_BAR = { Planned: 'var(--info)', 'In progress': 'var(--accent)', Completed: 'var(--good)' };
  const ROLES = ['Junior VA', 'Senior VA', 'Executive VA', 'Jr. AE', 'Senior AE'];
  const DEFAULT_ROLE = 'Junior VA';
  // Seniority for sorting and trainer suggestions; older role names still rank sensibly.
  const ROLE_RANK = { 'Junior VA': 1, VA: 1, 'Senior VA': 2, 'Executive VA': 3, 'Team Lead': 3, 'Jr. AE': 4, 'Account Executive': 5, 'Senior AE': 5 };
  const roleRank = (r) => ROLE_RANK[r] || 0;
  const withRole = (p) => (p ? `${p.name} · ${p.role}` : '—');
  const NOTE_TYPES = { Note: 'tone-info', Win: 'tone-good', Concern: 'tone-bad' };
  const OTHER_CAT = 'Other tools';
  const SKILL_CATALOG = {
    'Administrative': ['Email Management', 'Calendar & Scheduling', 'Data Entry & Accuracy', 'Records & File Management', 'Listing Management', 'CMA & Market Analysis', 'Weekly Reporting', 'Open House Coordination', 'Transcription'],
    'Tools': ['Microsoft Excel', 'Google Workspace', 'CRM Tools', 'Real Estate CRMs (kvCORE, Follow Up Boss, Lofty, CINC, KW Command)', 'CRM Automations & Drip Campaigns', 'Project Management Tools'],
    'Communication': ['Written Communication', 'Verbal Communication', 'Customer Service'],
    'Research & Analysis': ['Internet Research', 'Problem Solving'],
    'Professional': ['Time Management', 'Attention to Detail'],
    'Marketing & Social Media': ['Social Media Management', 'Content Calendar Planning', 'Social Media Engagement & Community', 'Paid Ads (Google & Meta)', 'Audience Research & Retargeting', 'SEO & Keyword Research', 'Web Analytics & Reporting', 'Google Business Profile', 'Email Marketing & Newsletters', 'Landing Pages & Lead Capture Forms', 'Post Scheduling (Meta Business Suite)', 'Online Reviews & Reputation', 'Contests & Promotions'],
    'Content Creation': ['Graphic Design (Canva / Photoshop / Illustrator)', 'Brand Kits & Brand Consistency', 'Video Editing', 'Real Estate Content Writing', 'Scripts & Podcasts', 'Property Videos & Virtual Tours'],
    'Lead Generation': ['Lead Generation Strategy', 'Cold Calling', 'Lead Qualification & Nurturing', 'FSBO & Expired Listings', 'Distressed Property Prospecting', 'Prospect Research & Data Mining', 'SMS Campaigns', 'Direct Mail Campaigns', 'Referral & Partner Outreach'],
    'Transaction Coordination': ['Contract-to-Close Coordination', 'Contract & Disclosure Prep', 'Transaction Software (Dotloop, SkySlope, DocuSign)', 'Deadline Tracking', 'Compliance & Fair Housing', 'Title, Escrow & Lender Coordination'],
    'Finance': ['Basic Bookkeeping'],
  };
  const STANDARD_SKILLS = Object.entries(SKILL_CATALOG).flatMap(([cat, list]) => list.map((n) => [n, cat]));

  /* ------------------------------------------------------------------ sample data */
  function sampleData() {
    let seed = 7;
    const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const now = Date.now();
    const at = (d) => new Date(now - d * DAY).toISOString();
    const names = [
      ['Maria Santos', 'Executive VA', 'Brightline Realty', 8.6], ['Joshua Reyes', 'Senior VA', 'Northwind Health', 8.0],
      ['Angela Cruz', 'Senior VA', 'Brightline Realty', 7.6], ['Mark Villanueva', 'Junior VA', 'Coastal Legal', 5.8],
      ['Kristine Bautista', 'Junior VA', 'Northwind Health', 6.4], ['John Paul Garcia', 'Junior VA', 'Summit Ecom', 5.0],
      ['Patricia Mendoza', 'Senior VA', 'Summit Ecom', 7.8], ['Carlo Ramos', 'Junior VA', 'Coastal Legal', 5.4],
      ['Bea Navarro', 'Junior VA', 'Brightline Realty', 6.0], ['Miguel Torres', 'Junior VA', 'Northwind Health', 4.8],
      ['Hannah Dela Cruz', 'Junior VA', 'Summit Ecom', 6.8], ['Rafael Aquino', 'Junior VA', 'Coastal Legal', 4.4],
      ['Nicole Fernandez', 'Junior VA', 'Brightline Realty', 6.2], ['Ivan Castillo', 'Junior VA', 'Summit Ecom', 4.0],
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
      const offs = skills.map(() => (rnd() - 0.5) * 5.2);
      const sessions = i === 9 || i === 11 ? [150, 72] : [125, 62, 4 + Math.floor(rnd() * 20)];
      sessions.forEach((d, si) => {
        const growth = si * (0.3 + rnd() * 0.5);
        const jitter = skills.map(() => (rnd() < 0.3 ? si * 1.4 : 0));
        const m = managers[(i + si) % 2];
        skills.forEach((s, k) => {
          const score = Math.max(1, Math.min(MAX, Math.round(base + offs[k] + growth + jitter[k] - 0.6)));
          ratings.push({ ts: at(d), personId: p.id, skill: s.name, score, manager: m, note: '', sample: 'Y' });
        });
      });
    });
    const T = (trainee, trainer, sk, status, startAgo, dueIn, target) => ({
      id: 't' + uid(), traineeId: trainee, trainerId: trainer, skills: sk, target: target || DEFAULT_TARGET, status,
      start: isoDay(now - startAgo * DAY), due: isoDay(now + dueIn * DAY), notes: '', created: at(startAgo), updated: at(Math.max(0, startAgo - 3)), sample: 'Y',
    });
    const training = [
      T('p4', 'p1', ['Microsoft Excel', 'Data Entry & Accuracy'], 'In progress', 20, 10),
      T('p6', 'p2', ['CRM Tools', 'Customer Service'], 'In progress', 35, -4),
      T('p8', 'p1', ['Written Communication'], 'Planned', 2, 28),
      T('p10', 'p7', ['Time Management', 'Attention to Detail'], 'In progress', 14, 16),
      T('p12', 'p3', ['Google Workspace', 'Calendar & Scheduling'], 'Planned', 1, 30),
      T('p9', 'p2', ['Problem Solving'], 'Completed', 60, -20),
      T('p5', 'p11', ['Social Media Management'], 'In progress', 10, 20, 7),
      T('p14', 'p11', ['Email Management', 'Google Workspace'], 'Planned', 0, 21, 7),
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
    const M = (d, m, text, pinned) => ({ id: 'm' + uid(), ts: at(d), manager: m, text, pinned: !!pinned, edited: '', sample: 'Y' });
    const teamNotes = [
      M(9, managers[0], 'Reminder: everyone gets re-rated before the end of the month. Split the list — I\'ll take A–M, Eric takes N–Z.', true),
      M(2, managers[1], 'Brightline Realty is adding two listings agents next week. We may need one more VA on that account — Bea and Nicole are the best fit.'),
      M(0.2, managers[1], 'Maria is on leave from the 15th. Joshua is covering her trainees.'),
    ];
    return { people, skills, ratings, training, notes, teamNotes, settings: { teamName: CFG.TEAM_NAME || 'Team Troy', reassessDays: 45, managers } };
  }

  /* ------------------------------------------------------------------ state */
  let DB = null;
  // Live portal: ME comes from the Google account the server verified. Demo: picked on screen.
  let ME = DEMO ? store.get('tt-manager') || '' : '';
  let MEINFO = null; // { name, email, owner }
  let TOKEN = DEMO ? '' : store.get('tt-session') || ''; // portal session (7 days), issued after Google sign-in
  const LOGIN_URL = String(CFG.LOGIN_URL || '').trim();
  const ui = { teamFilter: 'all', teamQuery: '', teamSort: 'name', trainView: 'board', trainQuery: '', matrixCat: 'overview', openCats: {}, matrixQuery: '', vaTab: 'overview' };
  let C = null; // derived cache
  let REV = null; // server revision we last loaded (live sync)

  function normalise(d) {
    if (d && d.va) return d; // a VA's own page data (see renderVA)
    d.people = (d.people || []).map((p) => Object.assign({ role: 'VA', account: '', active: 'Y' }, p));
    d.skills = d.skills || [];
    d.ratings = (d.ratings || []).map((r) => Object.assign({}, r, { score: Number(r.score) })).filter((r) => r.score >= 1 && r.score <= MAX);
    d.training = (d.training || []).map((t) => Object.assign({}, t, { skills: Array.isArray(t.skills) ? t.skills : String(t.skills || '').split(/\s*;\s*/).filter(Boolean), target: Number(t.target) || DEFAULT_TARGET }));
    d.notes = d.notes || [];
    d.teamNotes = (d.teamNotes || []).map((n) => Object.assign({}, n, { pinned: n.pinned === true || n.pinned === 'Y' }));
    d.settings = Object.assign({ teamName: CFG.TEAM_NAME || 'Team Troy', reassessDays: 45, managers: [] }, d.settings || {});
    if (typeof d.settings.managers === 'string') d.settings.managers = d.settings.managers.split(/\s*[,;\n]\s*/).filter(Boolean);
    d.settings.reassessDays = Number(d.settings.reassessDays) || 45;
    d.docs = d.docs || [];
    d.forms = d.forms || [];
    d.clients = (d.clients || []).map((c) => Object.assign({ client: '', vaId: '', span: '', shift: '', status: '', pay: '', amount: '', inv: '', paidTill: '', review: '', invoice: '', phone: '', email: '', state: '', tools: '', business: '', signup: '', dcReason: '', created: '' }, c, { notes: Array.isArray(c.notes) ? c.notes : [], history: Array.isArray(c.history) ? c.history : [] }));
    d.responses = d.responses || [];
    d.managerList = (d.managerList || d.settings.managers.map((n) => ({ name: n, email: '', owner: false }))).map((m) => Object.assign({ email: '', owner: false }, m));
    return d;
  }

  const activePeople = () => DB.people.filter((p) => p.active !== 'N');
  const activeSkills = () => DB.skills.filter((s) => s.active !== 'N');
  const person = (id) => DB.people.find((p) => p.id === id);
  const categories = () => { const c = []; activeSkills().forEach((s) => { if (!c.includes(s.category)) c.push(s.category); }); const i = c.indexOf(OTHER_CAT); if (i >= 0) c.push(c.splice(i, 1)[0]); return c; };
  const skillsIn = (cat) => activeSkills().filter((s) => s.category === cat);
  const catAvg = (pid, cat) => { const m = derive().latest[pid] || {}; const v = skillsIn(cat).map((s) => m[s.name]).filter((x) => x); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const catRated = (pid, cat) => { const m = derive().latest[pid] || {}; return skillsIn(cat).filter((s) => m[s.name]).length; };
  const chev = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

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
      const gaps = weakSkillsRaw(c, p.id).filter((x) => x.v <= WEAK && !covered.has(x.name));
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
      return { p, lv, load, fit: lv - 0.7 * load + 0.15 * roleRank(p.role), min: Math.min(...vals) };
    }).filter((x) => x.lv >= TRAINER_AVG && x.min >= TRAINER_MIN).sort((a, b) => b.fit - a.fit).slice(0, 4);
  }

  /* ------------------------------------------------------------------ API */
  async function api(action, payload) {
    if (DEMO) return { ok: true };
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, session: TOKEN }, payload || {})) });
    const j = await res.json();
    if (!j.ok) {
      const err = new Error(j.error || 'Something went wrong');
      err.code = j.code;
      if (j.code === 'signin' || j.code === 'denied') signOut(j.error, j.code === 'denied');
      throw err;
    }
    if (j.me) setMe(j.me);
    return j;
  }
  function setMe(me) { MEINFO = me; ME = me.name; }

  /* ------------------------------------------------------------------ Google sign-in
     "Sign in with Google" opens the small Team Troy Sign-in script in a popup. Google confirms the account
     there and the popup sends back a Google identity token; the portal's script checks it and the Managers
     list, then returns a 7-day session. */
  let loginPopup = null;
  function startSignIn() {
    const st = $('#login-status');
    if (!LOGIN_URL) { if (st) st.textContent = 'Google sign-in is not set up yet (LOGIN_URL in config.js).'; return; }
    const w = 480, h = 640, x = Math.max(0, (screen.width - w) / 2), y = Math.max(0, (screen.height - h) / 3);
    loginPopup = window.open(LOGIN_URL, 'tt-login', `width=${w},height=${h},left=${x},top=${y}`);
    if (!loginPopup) { if (st) st.textContent = 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'; return; }
    if (st) st.textContent = 'Finish signing in with Google in the window that opened…';
  }
  window.addEventListener('message', async (e) => {
    if (!/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(e.origin) && e.origin !== 'https://script.google.com') return;
    const m = e.data;
    if (!m || m.type !== 'tt-login') return;
    try { if (loginPopup) loginPopup.close(); } catch (x) {}
    if (m.error || !m.idToken) return renderLogin('Google sign-in failed: ' + (m.error || 'no token'), true);
    const st = $('#login-status'); if (st) st.textContent = 'Signing in as ' + (m.email || 'you') + '…';
    try {
      const j = await api('login', { idToken: m.idToken });
      TOKEN = j.session; store.set('tt-session', TOKEN);
      afterSignIn();
    } catch (err) { if (err.code !== 'denied' && err.code !== 'signin') renderLogin(err.message, true); }
  });
  async function afterSignIn() {
    const box = $('#login-status'); if (box) box.textContent = 'Signing in…';
    try { await load(); render.keepScroll = false; render(); }
    catch (err) { if (err.code !== 'denied' && err.code !== 'signin') renderLogin(err.message); }
  }
  function signOut(msg, denied) {
    TOKEN = ''; store.del('tt-session'); ME = ''; MEINFO = null;
    renderLogin(msg || '', denied);
  }
  let inflight = 0;
  async function save(action, payload, mutate, okMsg) {
    mutate(); invalidate(); render();
    if (okMsg) toast(okMsg);
    inflight++;
    try { await api(action, payload); }
    catch (err) { toast('Could not save: ' + err.message, true); await load().catch(() => {}); render(); }
    finally { inflight--; }
  }
  async function load() {
    if (DEMO) { DB = normalise(sampleData()); invalidate(); return; }
    const j = await api('getAll');
    DB = normalise(j.data); REV = j.rev || null; invalidate();
  }

  /* ------------------------------------------------------------------ live sync
     Every change on the server bumps a revision number. Each open portal checks it every
     few seconds (a tiny request) and reloads everything when another manager changed
     something, so all managers always see the same data. Updates wait while you are typing
     or have a dialog open, so nothing you are in the middle of gets wiped. */
  const POLL_MS = 10000;
  let polling = false, pending = null;
  const busy = () => { if ($('dialog[open]') || ui.formDirty || $('#cl-menu.on')) return true; if ($('#cl-panel.on') && $('#cl-panel').contains(document.activeElement) && document.activeElement.matches('input,textarea')) return true; const a = document.activeElement; return !!(a && a.matches && a.matches('#page input:not([type=radio]):not([type=checkbox]), #page textarea, #page select') && (a.value || '').length); };
  async function poll(force) {
    if (DEMO || !TOKEN || !ME || !DB || polling || inflight) return;
    if (document.hidden && !force) return;
    polling = true;
    try {
      const r = await api('rev');
      if (REV && r.rev && r.rev.n === REV.n) return;
      const j = await api('getAll');
      if (inflight) return; // our own save is still going; the next check picks everything up
      pending = { data: normalise(j.data), rev: j.rev || null };
      applyPending();
    } catch (err) {
    } finally { polling = false; }
  }
  function applyPending() {
    if (!pending || busy()) return;
    const { data, rev } = pending; pending = null;
    const prevNotes = new Set((DB.teamNotes || []).map((n) => n.id));
    const fromOther = rev && rev.by && rev.by !== ME && !data.va;
    DB = data; REV = rev; invalidate();
    render();
    if (fromOther) {
      const fresh = DB.teamNotes.filter((n) => !prevNotes.has(n.id) && n.manager !== ME);
      toast(fresh.length ? `${fresh[0].manager} posted a team note` : `Updated with ${rev.by}'s changes`, false, 'refresh');
    }
  }
  setInterval(poll, POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(true); });
  window.addEventListener('focus', () => poll(true));
  document.addEventListener('focusout', () => setTimeout(applyPending, 50));
  document.addEventListener('close', () => setTimeout(applyPending, 50), true);

  /* ------------------------------------------------------------------ toasts */
  function toast(msg, bad, icon) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = (bad ? '' : ic(icon || 'check')) + esc(msg);
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ------------------------------------------------------------------ router & shell */
  const NAV = [
    { id: 'home', href: '#/', label: 'Home', icon: 'home' },
    { id: 'team', href: '#/team', label: 'Team', icon: 'team' },
    { id: 'training', href: '#/training', label: 'Training', icon: 'training' },
    { id: 'matrix', href: '#/matrix', label: 'Skill matrix', icon: 'matrix', short: 'Matrix' },
    { id: 'notes', href: '#/notes', label: 'Team notes', icon: 'chat', short: 'Notes' },
    { id: 'guides', href: '#/guides', label: 'Guidebooks', icon: 'book', short: 'Guides' },
    { id: 'clients', href: '#/clients', label: 'Clients', icon: 'briefcase' },
    { id: 'forms', href: '#/forms', label: 'Forms', icon: 'note' },
  ];
  function route() {
    const parts = (location.hash.replace(/^#\/?/, '').split('?')[0] || '').split('/').filter(Boolean);
    return { page: parts[0] || 'home', id: parts[1], sub: parts[2] };
  }

  function shell(r, crumbs, body) {
    const section = r.page === 'va' ? 'team' : r.page;
    const tabSection = section === 'users' ? 'settings' : section;
    const attn = derive().attention.length;
    const unread = unreadNotes().length;
    const link = (n, mobile) => `<a href="${n.href}" ${section === n.id ? 'aria-current="page"' : ''}>${ic(n.icon)}<span>${mobile && n.short ? n.short : n.label}</span>${!mobile && n.id === 'home' && attn ? `<span class="count" title="Items needing attention">${attn}</span>` : ''}${n.id === 'notes' && unread ? `<span class="${mobile ? 'dot-count' : 'count count-new'}" title="${unread} new note${unread === 1 ? '' : 's'}">${unread}</span>` : ''}</a>`;
    return `<div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#/">${MARK}<div><div class="brand-name">${esc(DB.settings.teamName)}</div><div class="brand-sub">Training Portal</div></div></a>
        <nav class="nav" aria-label="Main">
          ${NAV.map((n) => link(n)).join('')}
          <div class="nav-label">Admin</div>
          ${link({ id: 'users', href: '#/users', label: 'Users', icon: 'user' })}
          ${link({ id: 'settings', href: '#/settings', label: 'Settings', icon: 'settings' })}
        </nav>
        <div class="sidebar-foot">
          <div class="me">${avatar({ id: 'm', name: ME })}<div style="min-width:0"><div class="me-name">${esc(ME)}</div><div class="me-role" title="${esc(MEINFO ? MEINFO.email : '')}">${esc(MEINFO ? MEINFO.email : 'Manager')}</div></div>
          <button type="button" data-act="${DEMO ? 'switch-manager' : 'sign-out'}" title="${DEMO ? 'Switch manager' : 'Sign out'}" aria-label="${DEMO ? 'Switch manager' : 'Sign out'}">${ic(DEMO ? 'swap' : 'logout')}</button></div>
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
    if (!ME) return DEMO ? renderWho() : renderLogin();
    if (DB.va) return renderVA();
    derive();
    const r = route();
    if (r.page !== 'notes') ui.notesNew = null;
    const pages = { home: pageHome, team: pageTeam, va: pageVA, training: pageTraining, matrix: pageMatrix, notes: pageNotes, guides: pageGuides, clients: pageClients, forms: pageForms, users: pageUsers, settings: pageSettings };
    const fn = pages[r.page] || pageHome;
    const out = fn(r);
    const y = window.scrollY;
    $('#app').innerHTML = shell(r, out.crumbs, out.body);
    document.title = (out.title ? out.title + ' · ' : '') + DB.settings.teamName + ' Training Portal';
    if (out.after) out.after();
    if (ui.clOpen) { if (r.page === 'clients') clPanelRefresh(); else clPanelClose(true); }
    if (render.keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
    render.keepScroll = true;
  }
  window.addEventListener('hashchange', () => { render.keepScroll = false; render(); });

  /* ------------------------------------------------------------------ Home */
  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

  /* ------------------------------------------------------------------ Home
     Left column: the work to do (attention, skill gaps, training due) as dropdowns that remember
     whether they are open. Right column: the team feed (notes, trainers, activity). */
  const ATTN_KINDS = [
    { k: 'unrated', label: 'Not rated', tone: 'tone-warn' },
    { k: 'stale', label: 'Re-rate due', tone: 'tone-info' },
    { k: 'overdue', label: 'Training overdue', tone: 'tone-bad' },
    { k: 'gap', label: 'Uncovered gaps', tone: 'tone-accent' },
  ];
  const homeOpen = (key, dflt) => { const v = store.get('tt-home-' + key); return v == null ? dflt : v === '1'; };
  function homeDrop(key, { icon, title, count, tone, summary, body, open, extra }) {
    return `<details class="card home-drop" data-key="${key}" ${homeOpen(key, open) ? 'open' : ''}>
      <summary><span class="dot-icon ${tone}">${ic(icon)}</span>
        <div class="hd-main"><div class="hd-title"><h2>${title}</h2>${count != null ? `<span class="hd-count ${tone}">${count}</span>` : ''}</div><div class="hd-sum">${summary}</div></div>
        ${extra || ''}<span class="hd-chev">${chev}</span></summary>
      <div class="hd-body">${body}</div></details>`;
  }
  function attnList(c) {
    const f = ui.attnFilter || 'all';
    const list = c.attention.filter((a) => f === 'all' || a.kind === f);
    if (!list.length) return '<div class="empty" style="padding:24px">Nothing here.</div>';
    return `<ul class="list attn-list">${list.map((a) => `<li>
      <span class="dot-icon ${a.tone}">${ic(a.icon)}</span>
      <div class="grow"><div class="title">${esc(a.title)}</div><div class="meta">${esc(a.meta)}</div></div>
      <button class="btn btn-sm" data-act="${a.action}" data-id="${esc(a.action === 'open-training' ? a.tid : a.pid)}">${a.label}</button></li>`).join('')}</ul>`;
  }
  function gapRows(c) {
    const cat = ui.gapCat || 'all';
    const all = activeSkills().filter((s) => cat === 'all' || s.category === cat).map((s) => ({ s, v: c.skillAvg[s.name], n: activePeople().filter((p) => c.latest[p.id] && c.latest[p.id][s.name]).length })).filter((x) => x.v != null).sort((a, b) => a.v - b.v);
    if (!all.length) return '<div class="empty" style="padding:24px"><b>No ratings yet</b>Rate a few VAs to see where the team is weakest.</div>';
    const shown = ui.gapAll ? all : all.slice(0, 8);
    return `<div class="gap-rows">${shown.map((g) => `<div class="gap-row"><div><div class="skill-name">${esc(g.s.name)}</div><div class="muted" style="font-size:12px">${esc(g.s.category)} · ${g.n} VA${g.n === 1 ? '' : 's'} rated</div></div>${meter(g.v)}</div>`).join('')}</div>
      ${all.length > 8 ? `<div class="hd-foot"><button class="btn btn-ghost btn-sm" data-act="gap-all">${ui.gapAll ? 'Show fewer' : `Show all ${all.length} skills`}</button></div>` : ''}`;
  }
  function pageHome() {
    const c = derive();
    const ap = activePeople();
    const overdue = DB.training.filter(isOverdue);
    const ratedRecently = ap.filter((p) => daysSince(c.last[p.id]) <= DB.settings.reassessDays).length;
    const trainers = ap.filter((p) => c.load[p.id]).sort((a, b) => c.load[b.id] - c.load[a.id]);
    const counts = {}; c.attention.forEach((a) => (counts[a.kind] = (counts[a.kind] || 0) + 1));
    const rated = activeSkills().map((s) => ({ s, v: c.skillAvg[s.name] })).filter((x) => x.v != null).sort((a, b) => a.v - b.v);
    const weak = rated.filter((x) => x.v <= WEAK).length;
    const soon = DB.training.filter((t) => t.status !== 'Completed' && t.due && daysSince(t.due) >= -14).sort((a, b) => (a.due < b.due ? -1 : 1));
    const firstName = ME.split(' ')[0];
    const kpi = (href, icon, label, value, foot, extra) => `<a class="card kpi kpi-link" href="${href}"><div class="kpi-label">${ic(icon)}${label}<span class="kpi-go">${ic('chevron')}</span></div><div class="kpi-value">${value}</div>${extra || ''}<div class="kpi-foot">${foot}</div></a>`;
    const pct = ap.length ? Math.round((ratedRecently / ap.length) * 100) : 0;

    const attnBody = c.attention.length ? `
      <div class="hd-tabs" role="tablist">${[{ k: 'all', label: 'All' }].concat(ATTN_KINDS).filter((x) => x.k === 'all' || counts[x.k]).map((x) => `<button role="tab" aria-selected="${(ui.attnFilter || 'all') === x.k}" data-act="attn-filter" data-id="${x.k}">${x.label} <span class="n">${x.k === 'all' ? c.attention.length : counts[x.k]}</span></button>`).join('')}</div>
      <div id="attn-list">${attnList(c)}</div>` : '<div class="empty" style="padding:24px"><b>All clear</b>Everyone is rated and training is on schedule.</div>';
    const attnSummary = c.attention.length ? ATTN_KINDS.filter((x) => counts[x.k]).map((x) => `<span class="hd-chip ${x.tone}">${counts[x.k]} ${x.label.toLowerCase()}</span>`).join('') : '<span class="muted">All clear</span>';

    const cats = categories().filter((k) => rated.some((x) => x.s.category === k));
    const gapBody = `${rated.length ? `<div class="hd-tools"><label class="sr-only" for="gap-cat">Category</label><select class="select" id="gap-cat"><option value="all">All categories</option>${cats.map((k) => `<option ${ui.gapCat === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select><a class="btn btn-ghost btn-sm" href="#/matrix">Open matrix ${ic('chevron')}</a></div>` : ''}
      <div id="gap-rows">${gapRows(c)}</div>`;
    const gapSummary = rated.length ? `Lowest: <b>${esc(rated[0].s.name)}</b> ${badge(rated[0].v, true)} · ${weak} skill${weak === 1 ? '' : 's'} at ${WEAK} or below` : '<span class="muted">No ratings yet</span>';

    const soonBody = soon.length ? `<ul class="list">${soon.map((t) => { const a = person(t.traineeId), b = person(t.trainerId); return `<li style="cursor:pointer" data-act="open-training" data-id="${esc(t.id)}">${avatar(a, 'sm')}<div class="grow"><div class="title">${esc(a ? a.name : '—')} <span class="muted" style="font-weight:400">with ${esc(b ? b.name : '—')}</span></div><div class="meta">${esc(t.skills.join(', '))}</div></div><span class="pill plain ${isOverdue(t) ? 'tone-bad' : 'tone-info'}">${isOverdue(t) ? 'Overdue · ' : 'Due '}${fmtShort(t.due)}</span></li>`; }).join('')}</ul>` : '<div class="empty" style="padding:24px">Nothing due in the next two weeks.</div>';

    const body = `
      <section class="hero hero-compact">
        <div><h1>${greeting()}, ${esc(firstName)}</h1><p>${fmt(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })} · ${esc(DB.settings.teamName)}</p></div>
        <div class="actions"><button class="btn" data-act="new-training">${ic('training')}Assign trainer</button><button class="btn btn-accent" data-act="rate">${ic('star')}Rate a VA</button></div>
      </section>
      <div class="grid grid-4" style="margin-bottom:20px">
        ${kpi('#/team', 'team', 'Active VAs', ap.length, `${trainers.length} training others`)}
        ${kpi('#/matrix', 'chart', 'Team skill level', `${one(c.team)} <small>/ 10</small>`, `${deltaHtml(c.team != null && c.teamPrev != null ? c.team - c.teamPrev : null)} since previous ratings`)}
        ${kpi('#/training', 'training', 'Active trainings', c.openT.length, overdue.length ? `<span style="color:var(--bad);font-weight:600">${overdue.length} overdue</span>` : 'All on schedule')}
        ${kpi('#/team', 'clock', 'Rated this cycle', `${ratedRecently} <small>of ${ap.length}</small>`, `Re-rate every ${DB.settings.reassessDays} days`, `<div class="kpi-bar"><i style="width:${pct}%"></i></div>`)}
      </div>
      <div class="home-grid">
        <div class="stack home-main">
          ${homeDrop('attention', { icon: 'alert', title: 'Needs your attention', count: c.attention.length, tone: c.attention.length ? 'tone-warn' : 'tone-good', summary: attnSummary, body: attnBody, open: false })}
          ${homeDrop('gaps', { icon: 'target', title: 'Biggest skill gaps', count: weak || null, tone: 'tone-accent', summary: gapSummary, body: gapBody, open: false })}
          ${homeDrop('soon', { icon: 'clock', title: 'Training due soon', count: soon.length || null, tone: overdue.length ? 'tone-bad' : 'tone-info', summary: soon.length ? `${overdue.length ? `<span class="hd-chip tone-bad">${overdue.length} overdue</span>` : ''}<span class="muted">Next due: ${esc((person(soon[0].traineeId) || {}).name || '—')} · ${fmtShort(soon[0].due)}</span>` : '<span class="muted">Nothing due in the next two weeks</span>', body: soonBody, open: true })}
        </div>
        <div class="stack home-side">
          ${homeNotesCard()}
          <section class="card">
            <div class="card-head"><h2>Trainers</h2><span class="sub">${trainers.length}</span><a class="btn btn-ghost btn-sm right" href="#/training/trainers">All ${ic('chevron')}</a></div>
            ${trainers.length ? `<ul class="list">${trainers.slice(0, 5).map((p) => {
              const ts = c.openT.filter((t) => t.trainerId === p.id).map((t) => person(t.traineeId)).filter(Boolean);
              return `<li>${avatar(p, 'sm')}<div class="grow"><a class="title" href="#/va/${esc(p.id)}" style="text-decoration:none">${esc(p.name)}</a><div class="meta">${ts.map((x) => esc(x.name)).join(', ')}</div></div><span class="pill plain tone-accent">${ts.length}</span></li>`;
            }).join('')}</ul>` : '<div class="empty" style="padding:22px">No trainers yet.</div>'}
          </section>
          <section class="card"><div class="card-head"><h2>Recent activity</h2></div>${activityList(6)}</section>
        </div>
      </div>`;
    return {
      title: 'Home', crumbs: '<b>Home</b>', body,
      after() {
        const gc = $('#gap-cat'); if (gc) gc.addEventListener('change', (e) => { ui.gapCat = e.target.value; ui.gapAll = false; $('#gap-rows').innerHTML = gapRows(derive()); });
        $$('details.home-drop').forEach((d) => d.addEventListener('toggle', () => store.set('tt-home-' + d.dataset.key, d.open ? '1' : '0')));
      },
    };
  }

  function activity() {
    const c = derive(), ev = [];
    DB.people.forEach((p) => (c.hist[p.id] || []).forEach((s) => ev.push({ ts: s.ts, html: `<b>${esc(s.manager)}</b> rated <a href="#/va/${esc(p.id)}">${esc(p.name)}</a> · avg ${one(s.avg)}`, icon: 'star', tone: 'tone-accent' })));
    DB.training.forEach((t) => { const a = person(t.traineeId), b = person(t.trainerId); if (a && b) ev.push({ ts: t.created, html: `<a href="#/va/${esc(b.id)}">${esc(b.name)}</a> is training <a href="#/va/${esc(a.id)}">${esc(a.name)}</a> on ${esc(t.skills.join(', '))}`, icon: 'training', tone: 'tone-info' }); });
    DB.notes.forEach((n) => { const p = person(n.personId); if (p) ev.push({ ts: n.ts, html: `<b>${esc(n.manager)}</b> added a ${esc(n.type.toLowerCase())} on <a href="#/va/${esc(p.id)}">${esc(p.name)}</a>`, icon: 'note', tone: NOTE_TYPES[n.type] || 'tone-info' }); });
    DB.teamNotes.forEach((n) => ev.push({ ts: n.ts, html: `<b>${esc(n.manager)}</b> posted a <a href="#/notes">team note</a>`, icon: 'chat', tone: 'tone-info' }));
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
      role: (a, b) => roleRank(b.role) - roleRank(a.role) || a.name.localeCompare(b.name),
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
          ${[['name', 'Name A–Z'], ['low', 'Lowest skill first'], ['high', 'Highest skill first'], ['rated', 'Longest since rated'], ['role', 'Role (most senior first)']].map(([k, l]) => `<option value="${k}" ${ui.teamSort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
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
          <div class="card-body" style="padding-top:8px">${Object.keys(m).length ? categories().map((cat) => {
            const list = skillsIn(cat), rated = list.filter((s) => m[s.name]), unrated = list.filter((s) => !m[s.name]);
            if (cat === OTHER_CAT && !rated.length) return '';
            return `<details class="group" ${ui.openCats && ui.openCats[cat] ? 'open' : ''} data-cat="${esc(cat)}"><summary>${chev}<span class="g-name">${esc(cat)}</span><span class="g-meta">${rated.length}/${list.length} rated</span>${badge(catAvg(p.id, cat), true)}</summary>
              <div class="g-body">${rated.map((s) => { const v = m[s.name], pv = prevSnap[s.name]; return `<div class="skill-row"><span class="skill-name">${esc(s.name)}</span>${segs(v)}${badge(v)}${v && pv && v !== pv ? deltaHtml(v - pv) : '<span></span>'}<button class="icon-btn del-rating" data-act="del-rating" data-id="${esc(p.id)}" data-skill="${esc(s.name)}" title="Delete this rating" aria-label="Delete rating for ${esc(s.name)}">${ic('trash')}</button></div>`; }).join('')}
              ${cat !== OTHER_CAT ? unrated.map((s) => `<div class="skill-row unrated"><span class="skill-name">${esc(s.name)}</span>${segs(0)}${badge(0)}<span></span><span></span></div>`).join('') : ''}</div></details>`;
          }).join('') : `<div class="empty"><b>Not rated yet</b>Give ${esc(p.name.split(' ')[0])} a first rating to see their skills.<div style="margin-top:12px"><button class="btn btn-primary" data-act="rate" data-id="${esc(p.id)}">${ic('star')}Rate now</button></div></div>`}</div></section>
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
        <section class="card"><div class="card-head"><h2>Rating sessions</h2></div>${h.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>By</th><th>Skills rated</th><th>Level</th><th><span class="sr-only">Delete</span></th></tr></thead><tbody>${h.map((s) => `<tr><td class="nowrap">${fmt(s.ts)}</td><td>${esc(s.manager)}</td><td>${Object.keys(s.scores).length}</td><td>${badge(s.avg, true)}</td><td style="width:44px;text-align:right"><button class="icon-btn" data-act="del-session" data-id="${esc(p.id)}" data-day="${esc(s.day)}" data-manager="${esc(s.manager)}" title="Delete this rating session" aria-label="Delete rating session from ${esc(fmt(s.ts))}">${ic('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No ratings yet.</div>'}</section></div>`;
    }
    const body = `
      <section class="card" style="margin-bottom:20px">
        <div class="profile-head">${avatar(p, 'lg')}
          <div><h1>${esc(p.name)}</h1><div class="meta"><span>${esc(p.role)}</span><span>${esc(p.account || 'No account')}</span><span>Since ${fmt(p.start)}</span><span title="${p.email ? 'Can sign in to their VA page with this Gmail' : 'No Gmail set, so they cannot sign in'}">${p.email ? esc(p.email) : 'No Gmail'}</span>${p.active === 'N' ? '<span class="pill tone-bad">Inactive</span>' : '<span class="pill tone-good">Active</span>'}</div></div>
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
    const y = (v) => T + (1 - (v - 1) / (MAX - 1)) * (H - T - B);
    const d = pts.map((s, i) => `${i ? 'L' : 'M'}${x(s.ts).toFixed(1)},${y(s.avg).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Skill level over time">
      ${[1, 4, 7, 10].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" ${v === 1 ? '' : 'stroke-dasharray="3 4"'}/><text x="${L - 10}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="var(--muted)">${v}</text>`).join('')}
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
      const candidates = activePeople().filter((p) => !(c.asTrainer[p.id] || []).length && (c.avg[p.id] || 0) >= TRAINER_AVG).sort((a, b) => c.avg[b.id] - c.avg[a.id]);
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
      <div class="pair">${avatar(a)}<div class="who"><b>${esc(a ? a.name : '—')} <span class="role-tag">${esc(a ? a.role : '')}</span></b><span>trained by ${esc(b ? withRole(b) : '—')}</span></div></div>
      <div class="chips">${t.skills.map((s) => `<span class="chip">${badge(m[s])} ${esc(s)}</span>`).join('')}</div>
      <div><div class="meter"><div class="meter-track"><div class="meter-fill" style="width:${pct}%;background:var(--accent)"></div></div><span class="muted" style="font-size:12px;white-space:nowrap">${curAvg ? one(curAvg) + ' → ' + t.target : 'Not rated yet · target ' + t.target}</span></div></div>
      <div class="tfoot">${ic('clock').replace('<svg', '<svg style="width:14px;height:14px"')}<span style="${isOverdue(t) ? 'color:var(--bad);font-weight:600' : ''}">${t.status === 'Completed' ? 'Completed' : (isOverdue(t) ? 'Overdue · ' : 'Due ') + fmtShort(t.due)}</span><span class="right">${avatar(b, 'sm')}</span></div>
    </article>`;
  }

  /* ------------------------------------------------------------------ Matrix */
  function pageMatrix() {
    const c = derive();
    const cats = categories();
    if (ui.matrixCat !== 'overview' && !cats.includes(ui.matrixCat)) ui.matrixCat = 'overview';
    const overview = ui.matrixCat === 'overview';
    const q = ui.matrixQuery.trim().toLowerCase();
    const people = activePeople().filter((p) => !q || p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    const skills = overview ? [] : skillsIn(ui.matrixCat);
    const teamCat = (cat) => { const v = people.map((p) => catAvg(p.id, cat)).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const head = overview
      ? `<tr><th class="rowhead" style="vertical-align:bottom;padding:10px 14px">VA</th>${cats.map((k) => `<th class="sk"><button class="sk-link" data-act="mx-cat" data-id="${esc(k)}" title="Open ${esc(k)}">${esc(k)}</button></th>`).join('')}<th class="cat" style="vertical-align:bottom;text-align:center">Overall</th></tr>`
      : `<tr><th class="rowhead" style="vertical-align:bottom;padding:10px 14px">VA</th>${skills.map((s) => `<th class="sk" title="${esc(s.name)}">${esc(s.name)}</th>`).join('')}<th class="cat" style="vertical-align:bottom;text-align:center">Avg</th></tr>`;
    const rows = people.map((p) => {
      const m = c.latest[p.id] || {};
      const cells = overview
        ? cats.map((k) => { const v = catAvg(p.id, k); return `<td class="cell"><button class="sc${lvl(v)}" data-act="mx-cat" data-id="${esc(k)}" aria-label="${esc(p.name)}, ${esc(k)}: ${v ? one(v) : 'not rated'}">${v ? one(v) : '0'}</button></td>`; }).join('')
        : skills.map((s) => `<td class="cell"><button class="sc${lvl(m[s.name])}" data-act="rate" data-id="${esc(p.id)}" data-cat="${esc(ui.matrixCat)}" aria-label="${esc(p.name)}, ${esc(s.name)}: ${m[s.name] || 'not rated'}">${m[s.name] || '0'}</button></td>`).join('');
      const avg = overview ? c.avg[p.id] : catAvg(p.id, ui.matrixCat);
      return `<tr><th class="rowhead" scope="row"><a class="person" href="#/va/${esc(p.id)}" style="text-decoration:none">${avatar(p, 'sm')}<span><span class="nm" style="font-weight:600;display:block">${esc(p.name)}</span><span class="rl">${esc(p.role)}</span></span></a></th>${cells}<td class="cell">${badge(avg, true)}</td></tr>`;
    }).join('');
    const foot = overview
      ? cats.map((k) => `<td><span class="score-badge sc${lvl(teamCat(k))}">${teamCat(k) != null ? one(teamCat(k)) : '0'}</span></td>`).join('') + `<td>${badge(c.team, true)}</td>`
      : skills.map((s) => `<td><span class="score-badge sc${lvl(c.skillAvg[s.name])}">${c.skillAvg[s.name] != null ? one(c.skillAvg[s.name]) : '0'}</span></td>`).join('') + `<td>${badge(teamCat(ui.matrixCat), true)}</td>`;
    const body = `
      <div class="page-head"><div><h1>Skill matrix</h1><p>${overview ? 'Average level per category. Click a category to see its skills.' : 'Every VA against every skill in this category. Click a cell to update a rating.'}</p></div>
        <div class="actions"><div class="legend-10"><span>${SCALE[0].label}</span><span class="ramp">${SCALE.map((s) => `<i class="sc${s.n}" title="${s.n} · ${s.label}: ${s.desc}">${s.n}</i>`).join('')}</span><span>${SCALE[MAX - 1].label}</span></div></div></div>
      <div class="toolbar">
        <label class="search-field">${ic('search')}<span class="sr-only">Search VAs</span><input class="input" id="mx-q" type="search" placeholder="Filter VAs" value="${esc(ui.matrixQuery)}"></label>
      </div>
      <div class="cat-tabs" role="tablist" aria-label="Category"><button role="tab" aria-selected="${overview}" data-act="mx-cat" data-id="overview">Overview</button>${cats.map((k) => `<button role="tab" aria-selected="${ui.matrixCat === k}" data-act="mx-cat" data-id="${esc(k)}">${esc(k)} <span class="n">${skillsIn(k).length}</span></button>`).join('')}</div>
      <section class="card"><div class="matrix-wrap"><table class="matrix ${overview ? 'overview' : ''}">
        <thead>${head}</thead><tbody>${rows}</tbody>
        <tfoot><tr><td class="rowhead" style="text-align:left;padding-left:14px">Team average</td>${foot}</tr></tfoot>
      </table></div></section>`;
    return {
      title: 'Skill matrix', crumbs: overview ? '<b>Skill matrix</b>' : `<a href="#/matrix" data-act="mx-cat" data-id="overview">Skill matrix</a><span>/</span><b>${esc(ui.matrixCat)}</b>`, body,
      after() { $('#mx-q').addEventListener('change', (e) => { ui.matrixQuery = e.target.value; render(); }); },
    };
  }

  /* ------------------------------------------------------------------ Team notes
     A shared board every manager can post to. New notes from other managers show a badge
     until you open this page. */
  const seenKey = () => 'tt-notes-seen|' + ME;
  const unreadNotes = () => { const seen = store.get(seenKey()) || ''; return (DB.teamNotes || []).filter((n) => n.manager !== ME && String(n.ts) > seen); };
  const sortedNotes = () => DB.teamNotes.slice().sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : a.ts < b.ts ? 1 : -1));
  const markNotesSeen = () => { const max = DB.teamNotes.reduce((m, n) => (String(n.ts) > m ? String(n.ts) : m), store.get(seenKey()) || ''); if (max) store.set(seenKey(), max); };

  function noteItem(n, opts) {
    const mine = n.manager === ME, isNew = opts && opts.isNew;
    return `<li class="tnote ${n.pinned ? 'pinned' : ''} ${isNew ? 'is-new' : ''}" data-note="${esc(n.id)}">${avatar({ id: 'm', name: n.manager })}<div class="grow">
      <div class="tnote-head"><b>${esc(n.manager || 'Manager')}</b>${mine ? '<span class="muted">(you)</span>' : ''}<span class="muted" title="${esc(fmt(n.ts, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }))}">· ${agoTime(n.ts)}</span>${n.edited ? '<span class="muted">· edited</span>' : ''}${n.pinned ? `<span class="pill plain tone-accent">${ic('pin')}Pinned</span>` : ''}${isNew ? '<span class="pill plain tone-good">New</span>' : ''}</div>
      <div class="txt">${esc(n.text)}</div>
      ${opts && opts.compact ? '' : `<div class="tnote-actions"><button class="btn btn-ghost btn-sm" data-act="tnote-pin" data-id="${esc(n.id)}">${ic('pin')}${n.pinned ? 'Unpin' : 'Pin'}</button>${mine ? `<button class="btn btn-ghost btn-sm" data-act="tnote-edit" data-id="${esc(n.id)}">${ic('edit')}Edit</button><button class="btn btn-ghost btn-sm btn-danger" data-act="tnote-del" data-id="${esc(n.id)}">${ic('x')}Delete</button>` : ''}</div>`}
    </div></li>`;
  }

  function notesList() {
    const q = (ui.notesQuery || '').trim().toLowerCase();
    const list = sortedNotes().filter((n) => !q || (n.text + ' ' + n.manager).toLowerCase().includes(q));
    if (!DB.teamNotes.length) return '<div class="empty"><b>No team notes yet</b>Post the first one — every manager will see it.</div>';
    if (!list.length) return '<div class="empty"><b>No notes match</b>Try a different search.</div>';
    return `<ul class="list tnotes">${list.map((n) => noteItem(n, { isNew: ui.notesNew && ui.notesNew.has(n.id) })).join('')}</ul>`;
  }

  function pageNotes() {
    ui.notesNew = ui.notesNew || new Set();
    unreadNotes().forEach((n) => ui.notesNew.add(n.id));
    markNotesSeen();
    const others = DB.settings.managers.filter((m) => m !== ME);
    const body = `
      <div class="page-head"><div><h1>Team notes</h1><p>A shared space for managers. Everything posted here is visible to ${others.length ? esc(others.join(', ')) : 'every manager'}.</p></div></div>
      <section class="card composer" style="margin-bottom:20px"><form data-form="tnote" class="card-body">
        <div class="composer-row">${avatar({ id: 'm', name: ME })}<label class="grow"><span class="sr-only">New team note</span><textarea class="textarea" name="text" id="tnote-text" placeholder="Share an update, reminder or decision with the other managers…" required>${esc(ui.noteDraft || '')}</textarea></label></div>
        <div class="composer-foot"><label class="check"><input type="checkbox" name="pinned"> Pin to the top</label><span class="muted hide-sm" style="font-size:12px">Ctrl + Enter to post</span><button class="btn btn-primary">${ic('chat')}Post note</button></div>
      </form></section>
      <div class="toolbar"><label class="search-field">${ic('search')}<span class="sr-only">Search notes</span><input class="input" id="notes-q" type="search" placeholder="Search notes" value="${esc(ui.notesQuery || '')}"></label>
        <span class="muted" style="margin-left:auto">${DB.teamNotes.length} note${DB.teamNotes.length === 1 ? '' : 's'}${DEMO ? '' : ' · updates automatically'}</span></div>
      <section class="card" id="notes-list">${notesList()}</section>`;
    return {
      title: 'Team notes', crumbs: '<b>Team notes</b>', body,
      after() {
        const form = $('[data-form="tnote"]'), ta = $('#tnote-text');
        ta.addEventListener('input', () => { ui.noteDraft = ta.value; });
        ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const f = new FormData(form), text = String(f.get('text') || '').trim();
          if (!text) { ta.focus(); return; }
          const n = { id: 'm' + uid(), ts: new Date().toISOString(), manager: ME, text, pinned: !!f.get('pinned'), edited: '' };
          ui.noteDraft = '';
          ta.blur();
          save('saveTeamNote', { teamNote: n }, () => { DB.teamNotes.push(n); markNotesSeen(); }, 'Note posted for all managers');
        });
        $('#notes-q').addEventListener('input', (e) => { ui.notesQuery = e.target.value; $('#notes-list').innerHTML = notesList(); });
        if (ui.focusComposer) { ui.focusComposer = false; ta.focus(); }
      },
    };
  }

  function homeNotesCard() {
    const unread = new Set(unreadNotes().map((n) => n.id));
    const list = sortedNotes().slice(0, 3);
    return `<section class="card">
      <div class="card-head"><h2>Team notes</h2><span class="sub">${unread.size ? `<span class="pill plain tone-good">${unread.size} new</span>` : 'Shared by all managers'}</span>
        <button class="btn btn-sm right" data-act="tnote-new">${ic('plus')}Post</button><a class="btn btn-ghost btn-sm" href="#/notes">All notes ${ic('chevron')}</a></div>
      ${list.length ? `<ul class="list tnotes">${list.map((n) => noteItem(n, { compact: true, isNew: unread.has(n.id) })).join('')}</ul>` : '<div class="empty">No team notes yet. Post one and every manager will see it.</div>'}
    </section>`;
  }

  function teamNoteDialog(id) {
    const n = DB.teamNotes.find((x) => x.id === id);
    if (!n) return;
    modal({
      title: 'Edit team note', submit: 'Save',
      body: `<label class="field"><span>Note</span><textarea class="textarea" name="text" required style="min-height:140px">${esc(n.text)}</textarea></label>
        <label class="check"><input type="checkbox" name="pinned" ${n.pinned ? 'checked' : ''}> Pin to the top</label>`,
      onSubmit(f) {
        const text = String(f.get('text')).trim();
        const rec = Object.assign({}, n, { text, pinned: !!f.get('pinned'), edited: text !== n.text ? new Date().toISOString() : n.edited });
        save('saveTeamNote', { teamNote: rec }, () => { DB.teamNotes = DB.teamNotes.map((x) => (x.id === id ? rec : x)); }, 'Note updated');
      },
    });
  }

  /* ------------------------------------------------------------------ Guidebooks
     Files sit in a private Drive folder; the portal fetches them through the API for signed-in people only.
     Managers upload, edit, replace and remove; VAs read and download what is shared with everyone. */
  const DOC_GROUPS = ['Skill guidebooks', 'Scripts', 'Role & company'];
  const docCache = {};
  const fmtSize = (b) => (!b ? '' : b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB');
  const docGroups = (docs) => { const g = []; docs.forEach((d) => { if (!g.includes(d.group)) g.push(d.group); }); return g.sort((a, b) => (DOC_GROUPS.indexOf(a) + 1 || 99) - (DOC_GROUPS.indexOf(b) + 1 || 99)); };
  function guidesHtml(docs, admin) {
    const q = (ui.docQuery || '').trim().toLowerCase();
    const list = docs.filter((d) => !q || (d.title + ' ' + d.group).toLowerCase().includes(q));
    if (!docs.length) return `<section class="card"><div class="empty"><b>No documents yet</b>${admin ? 'Upload the first guidebook with the button above.' : 'Your manager hasn\'t added any guidebooks yet.'}</div></section>`;
    if (!list.length) return '<section class="card"><div class="empty"><b>Nothing matches</b>Try a different search.</div></section>';
    return docGroups(list).map((g) => `<section class="card" style="margin-bottom:20px"><div class="card-head"><h2>${esc(g)}</h2><span class="sub">${list.filter((d) => d.group === g).length}</span></div>
      <ul class="list docs">${list.filter((d) => d.group === g).map((d) => `<li>
        <span class="doc-ico">${ic('book')}</span>
        <div class="grow"><div class="title">${esc(d.title)}${admin && d.audience === 'managers' ? ' <span class="pill plain tone-warn">Managers & AEs only</span>' : ''}</div>
          <div class="meta">${[d.pages ? d.pages + ' pages' : '', fmtSize(d.size), /pdf/i.test(d.type || d.name) ? 'PDF' : String(d.name || '').split('.').pop().toUpperCase()].filter(Boolean).join(' · ')}</div></div>
        <div class="doc-actions">
          ${/pdf/i.test(d.type || d.name) ? `<button class="btn btn-sm" data-act="doc-read" data-id="${esc(d.id)}">${ic('eye')}Read</button>` : ''}
          <button class="btn btn-sm ${admin ? 'btn-ghost' : ''}" data-act="doc-download" data-id="${esc(d.id)}">${ic('download')}<span class="hide-sm">Download</span></button>
          ${admin ? `<button class="icon-btn" data-act="doc-edit" data-id="${esc(d.id)}" aria-label="Edit ${esc(d.title)}" title="Edit, replace or remove">${ic('edit')}</button>` : ''}
        </div></li>`).join('')}</ul></section>`).join('');
  }
  function pageGuides() {
    const body = `
      <div class="page-head"><div><h1>Guidebooks</h1><p>Training guidebooks and documents. VAs can read and download everything except files marked "Managers & AEs only".</p></div>
        <div class="actions"><button class="btn btn-primary" data-act="doc-upload">${ic('upload')}Upload</button></div></div>
      <div class="toolbar"><label class="search-field">${ic('search')}<span class="sr-only">Search documents</span><input class="input" id="doc-q" type="search" placeholder="Search guidebooks" value="${esc(ui.docQuery || '')}"></label>
        <span class="muted" style="margin-left:auto">${DB.docs.length} document${DB.docs.length === 1 ? '' : 's'} · stored privately in Google Drive</span></div>
      <div id="docs-list">${guidesHtml(DB.docs, true)}</div>`;
    return { title: 'Guidebooks', crumbs: '<b>Guidebooks</b>', body, after() { $('#doc-q').addEventListener('input', (e) => { ui.docQuery = e.target.value; $('#docs-list').innerHTML = guidesHtml(DB.docs, true); }); } };
  }
  const docList = () => (DB && DB.docs) || [];
  async function fetchDoc(id) {
    if (docCache[id]) return docCache[id];
    const j = await api('getDoc', { id });
    const bin = atob(j.doc.data), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: j.doc.type || 'application/octet-stream' }));
    return (docCache[id] = { url, name: j.doc.name, title: j.doc.title, type: j.doc.type });
  }
  async function withDoc(id, btn, fn) {
    const old = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin-sm"></span>Opening…'; }
    try { fn(await fetchDoc(id)); } catch (e) { toast(e.message || 'Could not open the document', true); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
  }
  function downloadDoc(f) { const a = document.createElement('a'); a.href = f.url; a.download = f.name || f.title; document.body.appendChild(a); a.click(); a.remove(); }
  function readDoc(f) {
    if (window.innerWidth < 760) { window.open(f.url, '_blank'); return; } // phones: use the built-in PDF viewer
    const d = document.createElement('dialog');
    d.className = 'modal reader';
    d.innerHTML = `<div class="modal-head"><div><h2>${esc(f.title)}</h2></div>
      <button type="button" class="btn btn-sm" data-dl>${ic('download')}Download</button><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
      <iframe src="${f.url}#view=FitH" title="${esc(f.title)}"></iframe>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.querySelector('[data-close]').addEventListener('click', () => d.close());
    d.querySelector('[data-dl]').addEventListener('click', () => downloadDoc(f));
    d.showModal();
  }
  const readFileB64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Could not read ' + file.name)); r.readAsDataURL(file); });
  const pdfPages = (b64) => { try { const t = atob(b64); const m = t.match(/\/Type\s*\/Page[^s]/g); return m ? m.length : 0; } catch (e) { return 0; } };
  const titleFromName = (n) => String(n).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  function docDialog(id) {
    const doc = id ? DB.docs.find((x) => x.id === id) : null;
    const groups = Array.from(new Set(DOC_GROUPS.concat(DB.docs.map((x) => x.group))));
    modal({
      title: doc ? 'Edit document' : 'Upload documents', submit: doc ? 'Save' : 'Upload', wide: false,
      danger: doc ? { label: 'Remove', confirm: `Remove "${doc.title}" from the portal?\n\nThe file moves to the Drive trash of the portal account, where it can be restored for 30 days.`, run: () => save('deleteDoc', { id: doc.id }, () => { DB.docs = DB.docs.filter((x) => x.id !== doc.id); delete docCache[doc.id]; }, 'Document removed') } : null,
      body: `${doc ? `<label class="field"><span>Title</span><input class="input" name="title" required value="${esc(doc.title)}"></label>` : `<label class="field"><span>Files</span><input class="input" type="file" name="files" id="doc-files" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt" required><small>PDFs open inside the portal; other files can be downloaded. Up to 15 MB each.</small></label>
          <label class="field" id="doc-title-wrap"><span>Title</span><input class="input" name="title" placeholder="Taken from the file name"><small>For one file. With several files, each uses its file name; you can rename them after.</small></label>`}
        <div class="row2"><label class="field"><span>Group</span><input class="input" name="group" list="doc-groups" value="${esc(doc ? doc.group : 'Skill guidebooks')}" required><datalist id="doc-groups">${groups.map((g) => `<option value="${esc(g)}">`).join('')}</datalist></label>
          <label class="field"><span>Who can see it</span><select class="select" name="audience"><option value="all" ${!doc || doc.audience !== 'managers' ? 'selected' : ''}>Everyone (managers & VAs)</option><option value="managers" ${doc && doc.audience === 'managers' ? 'selected' : ''}>Managers & AEs only</option></select></label></div>
        ${doc ? `<label class="field"><span>Replace file <span class="muted" style="font-weight:400">(optional)</span></span><input class="input" type="file" name="replace" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"><small>Upload a newer version. The old file goes to the Drive trash.</small></label>` : ''}`,
      onSubmit(f, form) {
        const group = String(f.get('group') || '').trim() || 'Other', audience = f.get('audience') === 'managers' ? 'managers' : 'all';
        if (doc) {
          const title = String(f.get('title') || '').trim(), rep = form.elements.replace.files[0];
          if (!rep) { const next = Object.assign({}, doc, { title, group, audience }); save('saveDoc', { doc: next }, () => { DB.docs = DB.docs.map((x) => (x.id === doc.id ? next : x)); }, 'Saved'); return; }
          uploadFiles([rep], { title, group, audience, replaceId: doc.id });
          return;
        }
        const files = Array.from(form.elements.files.files || []);
        if (!files.length) { toast('Choose a file', true); return false; }
        uploadFiles(files, { title: files.length === 1 ? String(f.get('title') || '').trim() : '', group, audience });
      },
    });
  }
  // ---- uploads: duplicate check first, then a progress panel that stays on screen until all files are done
  let uploading = false;
  const normName = (t) => String(t || '').toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '');
  function findDuplicate(file, title) {
    const n = normName(file.name), t = normName(title);
    return DB.docs.find((d) => (d.size && d.size === file.size) || (t && normName(d.title) === t) || normName(d.name) === n) || null;
  }
  function askDuplicates(list) {
    return new Promise((resolve) => {
      const d = document.createElement('dialog');
      d.className = 'modal';
      d.innerHTML = `<div class="modal-form"><div class="modal-head"><div><h2>${list.length === 1 ? 'This file is' : list.length + ' files are'} already uploaded</h2><div class="sub">Matched by file size or title.</div></div></div>
        <div class="modal-body"><ul class="dup-list">${list.map((x) => `<li><b>${esc(x.file.name)}</b><span>${x.match ? 'matches “' + esc(x.match.title) + '”' : 'appears twice in your selection'}</span></li>`).join('')}</ul></div>
        <div class="modal-foot"><button type="button" class="btn" data-v="cancel">Cancel upload</button><button type="button" class="btn" data-v="keep">Upload anyway</button>${list.some((x) => x.match) ? '<button type="button" class="btn" data-v="replace">Replace existing</button>' : ''}<button type="button" class="btn btn-primary" data-v="skip">Skip duplicates</button></div></div>`;
      document.body.appendChild(d);
      let v = 'cancel';
      d.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => { v = b.dataset.v; d.close(); }));
      d.addEventListener('close', () => { d.remove(); resolve(v); });
      d.showModal();
    });
  }
  function progressPanel(total) {
    let el = $('#upload-panel'); if (el) el.remove();
    el = document.createElement('div');
    el.id = 'upload-panel'; el.className = 'upload-panel'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="up-head"><b>Uploading 0 of ${total}</b><span class="up-pct">0%</span></div><div class="up-bar"><i></i></div><div class="up-now muted"></div><ul class="up-list"></ul>`;
    document.body.appendChild(el);
    return {
      start(i, name) { el.querySelector('b').textContent = `Uploading ${i + 1} of ${total}`; el.querySelector('.up-now').textContent = name; },
      step(i, name, ok, msg) {
        const pct = Math.round(((i + 1) / total) * 100);
        el.querySelector('.up-bar i').style.width = pct + '%'; el.querySelector('.up-pct').textContent = pct + '%';
        el.querySelector('.up-list').insertAdjacentHTML('afterbegin', `<li class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${esc(name)}${msg ? ` <span>${esc(msg)}</span>` : ''}</li>`);
      },
      finish(done, failed, skipped) {
        el.classList.add('done');
        el.querySelector('b').textContent = failed ? `${done} uploaded, ${failed} failed` : `${done} uploaded`;
        el.querySelector('.up-now').textContent = skipped ? `${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : 'All done';
        el.querySelector('.up-head').insertAdjacentHTML('beforeend', '<button type="button" class="icon-btn" aria-label="Close">' + ic('x') + '</button>');
        el.querySelector('.up-head .icon-btn').addEventListener('click', () => el.remove());
        if (!failed) setTimeout(() => el.remove(), 8000);
      },
    };
  }
  const leaveGuard = (e) => { e.preventDefault(); e.returnValue = ''; };
  async function uploadFiles(files, opt) {
    if (uploading) { toast('An upload is already running. Wait for it to finish.', true); return; }
    let skipped = 0;
    let jobs = files.map((file) => ({ file, title: opt.title || titleFromName(file.name), replaceId: opt.replaceId || '' }));
    const tooBig = jobs.filter((j) => j.file.size > 15 * 1024 * 1024);
    tooBig.forEach((j) => toast(j.file.name + ' is over 15 MB', true));
    jobs = jobs.filter((j) => j.file.size <= 15 * 1024 * 1024);
    if (!opt.replaceId) {
      const seen = [], dups = [];
      jobs.forEach((j) => {
        const match = findDuplicate(j.file, j.title);
        const twin = seen.find((x) => x.file.size === j.file.size && normName(x.file.name) === normName(j.file.name));
        if (match || twin) dups.push({ file: j.file, match, job: j });
        seen.push(j);
      });
      if (dups.length) {
        const v = await askDuplicates(dups);
        if (v === 'cancel') return;
        if (v === 'skip') {
          // drop files already in the portal, and keep only the first copy of a file picked twice
          const keep = [];
          jobs.forEach((j) => {
            if (dups.some((x) => x.job === j && x.match)) return;
            if (keep.some((k) => k.file.size === j.file.size && normName(k.file.name) === normName(j.file.name))) return;
            keep.push(j);
          });
          skipped = jobs.length - keep.length; jobs = keep;
        }
        if (v === 'replace') dups.forEach((x) => { if (x.match) { x.job.replaceId = x.match.id; x.job.title = x.match.title; } });
      }
    }
    if (!jobs.length) { toast('Nothing new to upload'); return; }
    uploading = true; window.addEventListener('beforeunload', leaveGuard);
    const panel = progressPanel(jobs.length);
    let done = 0, failed = 0;
    for (let i = 0; i < jobs.length; i++) {
      const { file, title, replaceId } = jobs[i];
      panel.start(i, file.name);
      try {
        const data = await readFileB64(file);
        const match = replaceId ? DB.docs.find((d) => d.id === replaceId) : null;
        const doc = { title, group: match ? match.group : opt.group, audience: match ? match.audience : opt.audience, name: file.name, type: file.type || 'application/octet-stream', data, pages: /pdf/i.test(file.type || file.name) ? pdfPages(data) : 0, replaceId };
        inflight++;
        try { await api('uploadDoc', { doc }); } finally { inflight--; }
        if (replaceId) delete docCache[replaceId];
        done++; panel.step(i, title, true, replaceId ? 'replaced' : '');
      } catch (e) { failed++; panel.step(i, file.name, false, e.message); }
    }
    uploading = false; window.removeEventListener('beforeunload', leaveGuard);
    panel.finish(done, failed, skipped);
    if (done) { await load().catch(() => {}); render(); }
  }

  /* ------------------------------------------------------------------ Clients (managers & AEs only)
     Every client with its VA, span, shift, status, payment, billing, links, notes and history.
     The tags work like the dropdowns in the monthly sheet; everything else is edited in the side panel.
     VAs never receive client data from the server. */
  const CL_OPT = {
    shift: [['Full-Time', '#D6E6FA', '#1F5FAD'], ['1st-Half', '#FCEBC4', '#8A5A00'], ['2nd-Half', '#FAD9CC', '#A3401E'], ['Shared-VA', '#E6DEFA', '#6B46C1'], ['Available', '#DDF2D9', '#2E7D32'], ['Trial', '#22546B', '#fff'], ['Left', '#C62828', '#fff']],
    status: [['Satisfied', '#1E7B4F', '#fff'], ['DC', '#C62828', '#fff'], ['Notice Period', '#E05A47', '#fff'], ['New Signup', '#1F5FAD', '#fff'], ['Not satisfied', '#FAD9CC', '#A3401E'], ['Irresponsive', '#8E1F35', '#fff'], ['Concerning', '#E6DEFA', '#6B46C1'], ['Available', '#ECEDEF', '#5F6673']],
    pay: [['Paid', '#1E7B4F', '#fff'], ['Overdue/Concerning', '#FAD4D4', '#B3261E'], ['Notice Period', '#FCEBC4', '#8A5A00'], ['Pending', '#2F3A4A', '#fff'], ['Invoice Date Upnext', '#ECEDEF', '#5F6673'], ['Not Receivable', '#D32F2F', '#fff'], ['Carry Forward', '#1F5FAD', '#fff']],
    span: [['1'], ['0.5'], ['0.25']],
  };
  const CL_LABEL = { shift: 'Shift', status: 'Status', pay: 'Payment', span: 'Span', vaId: 'VA', client: 'Client', inv: 'Invoice date', amount: 'Amount' };
  const CL_UNPAID = ['Overdue/Concerning', 'Pending', 'Not Receivable'];
  const CL_RISK = ['Notice Period', 'Concerning', 'Not satisfied', 'Irresponsive'];
  const DC_REASONS = ['Financial Issues', 'Not satisfied with work', 'Client became irresponsive', 'Hired in-house', 'Other'];
  const isAE = (p) => !!p && /AE/.test(p.role || '');
  const aeOf = (p) => (!p ? null : isAE(p) ? p : person(p.ae) || null);
  const clIsDC = (c) => c.status === 'DC' || c.shift === 'Left';
  const clActive = () => DB.clients.filter((c) => c.client && !clIsDC(c));
  const clMoney = (n) => (n === '' || n == null || isNaN(+n) ? '' : '$' + Number(n).toLocaleString());
  const clSum = (list) => +list.reduce((a, c) => a + (+c.span || 0), 0).toFixed(2);
  const clCol = (k, v) => (CL_OPT[k] || []).find((o) => o[0] === v);
  const clTag = (k, v, id, cls = '') => { const c = clCol(k, v); return `<button type="button" class="cl-tag ${cls} ${v ? '' : 'empty'}" data-cldd="${k}" data-id="${esc(id)}" ${c && c[1] ? `style="background:${c[1]};color:${c[2]}"` : ''}>${esc(v || 'Set')}</button>`; };
  const clDate = (v) => (v ? fmt(v, { day: 'numeric', month: 'short' }) : '');
  function clOrderPeople() {
    const ppl = activePeople().slice();
    const aes = ppl.filter(isAE).sort((a, b) => (ROLE_RANK[b.role] || 0) - (ROLE_RANK[a.role] || 0) || a.name.localeCompare(b.name));
    const out = [];
    aes.forEach((ae) => { out.push(ae); ppl.filter((p) => !isAE(p) && p.ae === ae.id).sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => out.push(p)); });
    ppl.filter((p) => !out.includes(p)).sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => out.push(p));
    return out;
  }

  // ---- saving: one field at a time, with undo
  function clSet(c, k, v, opts = {}) {
    const old = c[k] == null ? '' : c[k];
    v = v == null ? '' : String(v);
    if (String(old) === v) return;
    const nameOf = (x) => (k === 'vaId' ? (person(x) || {}).name || '—' : x || '—');
    save('saveClient', { client: { id: c.id, [k]: v } }, () => {
      c[k] = v;
      if (['vaId', 'span', 'shift', 'status', 'pay'].includes(k)) c.history.unshift({ t: `${CL_LABEL[k]} changed from ${nameOf(old)} to ${nameOf(v)}`, by: ME, at: new Date().toISOString() });
    });
    if (!opts.quiet) clToast(`${c.client || 'Open slot'}: ${CL_LABEL[k] || 'details'} ${CL_LABEL[k] ? '→ ' + nameOf(v) : 'saved'}`, opts.noUndo ? null : () => clSet(c, k, old, { quiet: true }));
    if (k === 'status' && v === 'DC' && !c.dcReason) setTimeout(() => clDcDialog(c), 60);
    clPanelRefresh();
  }
  function clToast(msg, undo) {
    let t = $('#cl-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cl-toast'; t.className = 'cl-toast'; document.body.appendChild(t); }
    t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Undo</button>' : ''}`;
    if (undo) t.querySelector('button').onclick = () => { t.classList.remove('on'); undo(); toast('Change undone'); };
    t.classList.add('on'); clearTimeout(clToast.t); clToast.t = setTimeout(() => t.classList.remove('on'), 5000);
  }

  // ---- page
  function pageClients(r) {
    const f = ui.cl || (ui.cl = { q: '', ae: '', va: '', st: '', pay: '', kpi: '', view: 'active' });
    const act = clActive(), aes = activePeople().filter(isAE);
    const spanFor = (ae) => clSum(act.filter((c) => { const a = aeOf(person(c.vaId)); return a && a.id === ae.id; }));
    const KP = [
      ['span', 'Total span', clSum(act), aes.map((a) => a.name.split(' ')[0] + ' ' + spanFor(a)).join(' · ') || 'all clients', (c) => c.client && !clIsDC(c), ''],
      ['clients', 'Active clients', act.length, `${act.filter((c) => c.status === 'New Signup').length} new signup${act.filter((c) => c.status === 'New Signup').length === 1 ? '' : 's'}`, (c) => c.client && !clIsDC(c), ''],
      ['risk', 'At risk', act.filter((c) => CL_RISK.includes(c.status)).length, `${act.filter((c) => c.status === 'Notice Period').length} on notice`, (c) => CL_RISK.includes(c.status), '#B3261E'],
      ['unpaid', 'Unpaid', clMoney(act.filter((c) => CL_UNPAID.includes(c.pay)).reduce((a, c) => a + (+c.amount || 0), 0)) || '$0', `${act.filter((c) => CL_UNPAID.includes(c.pay)).length} client${act.filter((c) => CL_UNPAID.includes(c.pay)).length === 1 ? '' : 's'}`, (c) => CL_UNPAID.includes(c.pay), '#B3261E'],
      ['review', 'No review link', act.filter((c) => !c.review).length, `${act.filter((c) => !c.invoice).length} without invoice link`, (c) => c.client && !clIsDC(c) && !c.review, '#9A6200'],
      ['open', 'Open slots', DB.clients.filter((c) => c.status === 'Available' && !c.client).length, 'ready for a client', (c) => c.status === 'Available' && !c.client, '#1F5FAD'],
    ];
    const kf = KP.find((k) => k[0] === f.kpi);
    const order = clOrderPeople().map((p) => p.id);
    const q = f.q.toLowerCase();
    const rows = DB.clients.filter((c) => {
      const p = person(c.vaId), ae = aeOf(p);
      return (f.view === 'dc' ? clIsDC(c) : !clIsDC(c)) && (!q || (c.client + ' ' + (p ? p.name : '')).toLowerCase().includes(q)) && (!f.ae || (ae && ae.id === f.ae)) && (!f.va || c.vaId === f.va) && (!f.st || c.status === f.st) && (!f.pay || c.pay === f.pay) && (!kf || kf[4](c));
    }).sort((a, b) => ((order.indexOf(a.vaId) + 1 || 999) - (order.indexOf(b.vaId) + 1 || 999)) || (a.created < b.created ? -1 : 1));
    let h = '', lastAe = null, lastVa = '';
    rows.forEach((c) => {
      const p = person(c.vaId), ae = aeOf(p), aeKey = ae ? ae.id : '-';
      if (f.view === 'active' && aeKey !== lastAe) {
        const mine = act.filter((x) => { const a = aeOf(person(x.vaId)); return (a ? a.id : '-') === aeKey; });
        h += `<tr class="cl-ae"><td colspan="11">${ae ? `${esc(ae.name)} <span class="muted">(${esc(ae.role)})</span>` : '<span class="muted">No AE set</span>'} <span class="muted">· ${mine.length} client${mine.length === 1 ? '' : 's'} · span ${clSum(mine)}</span></td></tr>`;
        lastAe = aeKey; lastVa = '';
      }
      const first = c.vaId !== lastVa || f.view === 'dc'; lastVa = c.vaId;
      const sc = clCol('status', c.status), note = c.notes[0];
      h += `<tr class="cl-row ${clIsDC(c) ? 'is-dc' : ''} ${ui.clOpen === c.id ? 'sel' : ''}" data-id="${esc(c.id)}">
        <td class="cl-va" style="border-left-color:${sc ? sc[1] : 'transparent'}">${first ? `<button type="button" class="cl-link strong" data-cldd="vaId" data-id="${esc(c.id)}">${esc(p ? p.name : 'Removed VA')}</button><small>${esc(p ? p.role : '')}</small>` : `<button type="button" class="cl-link faint" data-cldd="vaId" data-id="${esc(c.id)}" title="Move to another VA">↳ same VA</button>`}</td>
        <td class="cl-client"><input class="cl-in" data-clf="client" data-id="${esc(c.id)}" value="${esc(c.client)}" placeholder="Open slot: type a client"></td>
        <td>${clTag('span', c.span, c.id, 'plain')}</td><td>${clTag('shift', c.shift, c.id)}</td><td>${clTag('status', c.status, c.id)}</td><td>${c.client ? clTag('pay', c.pay, c.id) : ''}</td>
        <td class="hide-sm">${c.client ? `<input type="date" class="cl-in date" data-clf="inv" data-id="${esc(c.id)}" value="${esc(c.inv)}">` : ''}</td>
        <td class="hide-sm">${c.client ? `<input class="cl-in amt" inputmode="decimal" data-clf="amount" data-id="${esc(c.id)}" value="${esc(c.amount)}" placeholder="$">` : ''}</td>
        <td class="hide-sm nowrap">${c.client ? `${c.review ? `<a class="cl-link" href="${esc(c.review)}" target="_blank" rel="noopener">Review ↗</a>` : `<button type="button" class="cl-link faint" data-clopen="${esc(c.id)}">+ Review</button>`} · ${c.invoice ? `<a class="cl-link" href="${esc(c.invoice)}" target="_blank" rel="noopener">Invoice ↗</a>` : `<button type="button" class="cl-link faint" data-clopen="${esc(c.id)}">+ Invoice</button>`}` : ''}</td>
        <td class="hide-sm cl-note" data-clopen="${esc(c.id)}">${note ? `<span class="cl-dot"></span>${esc(note.t.length > 70 ? note.t.slice(0, 70) + '…' : note.t)}` : c.dcReason && clIsDC(c) ? esc(c.dcReason) : '<span class="cl-link faint">+ Note</span>'}</td>
        <td><button type="button" class="icon-btn" data-clopen="${esc(c.id)}" aria-label="Open ${esc(c.client || 'slot')}">${ic('chevron')}</button></td></tr>`;
    });
    const empty = !DB.clients.length ? `<b>No clients yet</b>Add your first client, or ask Claude to import the monthly sheet.` : f.view === 'dc' ? '<b>No discontinued clients</b>Set a client\'s status to DC to move them here with their history.' : '<b>No clients match these filters</b>';
    const opt = (list, v) => list.map(([val, l]) => `<option value="${esc(val)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('');
    const body = `<div class="page-head"><div><h1>Clients</h1><p>Click a tag to change it, type straight into cells, or open a client for everything else. Only managers and AEs can see this page.</p></div>
        <div class="actions"><button class="btn btn-primary" data-act="cl-add">${ic('plus')}Add client</button></div></div>
      <div class="cl-kpis">${KP.map(([k, l, v, s, , c]) => `<button type="button" class="cl-kpi ${f.kpi === k ? 'on' : ''}" data-act="cl-kpi" data-id="${k}"><b style="${c ? 'color:' + c : ''}">${v}</b><span>${l}</span><small>${esc(s)}</small></button>`).join('')}</div>
      <div class="cl-bar"><input class="input" id="cl-q" type="search" placeholder="Search client or VA…" value="${esc(f.q)}">
        <select class="select" data-clfilter="ae"><option value="">All AEs</option>${opt(aes.map((a) => [a.id, a.name]), f.ae)}</select>
        <select class="select" data-clfilter="va"><option value="">All VAs</option>${opt(activePeople().slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => [p.id, p.name]), f.va)}</select>
        <select class="select" data-clfilter="st"><option value="">All statuses</option>${opt(CL_OPT.status.map((o) => [o[0], o[0]]), f.st)}</select>
        <select class="select" data-clfilter="pay"><option value="">All payments</option>${opt(CL_OPT.pay.map((o) => [o[0], o[0]]), f.pay)}</select>
        <div class="cl-seg">${[['active', 'Active'], ['dc', `Discontinued${DB.clients.filter(clIsDC).length ? ' ' + DB.clients.filter(clIsDC).length : ''}`]].map(([k, l]) => `<button type="button" class="${f.view === k ? 'on' : ''}" data-act="cl-view" data-id="${k}">${l}</button>`).join('')}</div>
        ${f.q || f.ae || f.va || f.st || f.pay || f.kpi ? '<button class="btn btn-ghost btn-sm" data-act="cl-clear">Clear</button>' : ''}</div>
      <section class="card cl-card"><div class="cl-wrap"><table class="cl-table"><thead><tr><th>VA</th><th>Client</th><th>Span</th><th>Shift</th><th>Status</th><th>Payment</th><th class="hide-sm">Invoice date</th><th class="hide-sm">Amount</th><th class="hide-sm">Links</th><th class="hide-sm">Latest note</th><th></th></tr></thead>
        <tbody>${h || `<tr><td colspan="11"><div class="empty">${empty}</div></td></tr>`}</tbody></table></div></section>`;
    return {
      title: 'Clients', crumbs: '<b>Clients</b>', body,
      after() {
        const qi = $('#cl-q');
        qi.addEventListener('input', () => { f.q = qi.value; clearTimeout(qi.t); qi.t = setTimeout(() => { render(); const n = $('#cl-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
        $$('[data-clfilter]').forEach((s) => s.addEventListener('change', () => { f[s.dataset.clfilter] = s.value; render(); }));
        $$('.cl-in').forEach((i) => {
          i.addEventListener('change', () => {
            const c = DB.clients.find((x) => x.id === i.dataset.id); if (!c) return;
            const v = i.value.replace(/^\$/, '').trim();
            if (i.dataset.clf === 'client' && !c.client && v && c.status === 'Available') { // typing into an open slot fills it
              const vals = { client: v, status: 'New Signup', pay: c.pay || 'Invoice Date Upnext', shift: c.shift === 'Available' ? 'Full-Time' : c.shift };
              return save('saveClient', { client: Object.assign({ id: c.id }, vals) }, () => { Object.assign(c, vals); c.history.unshift({ t: 'Open slot filled with ' + v, by: ME, at: new Date().toISOString() }); }, v + ' added as a new signup');
            }
            clSet(c, i.dataset.clf, v);
          });
          i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.blur(); });
        });
      },
    };
  }

  // ---- tag dropdowns (same options and colours as the sheet)
  let clMenuFor = null;
  function clMenu(btn) {
    const k = btn.dataset.cldd, c = DB.clients.find((x) => x.id === btn.dataset.id); if (!c) return;
    let m = $('#cl-menu');
    if (!m) { m = document.createElement('div'); m.id = 'cl-menu'; m.className = 'cl-menu'; m.setAttribute('role', 'menu'); document.body.appendChild(m); wireClMenu(m); }
    clMenuFor = { k, c };
    const opts = k === 'vaId' ? clOrderPeople().map((p) => [p.id, null, null, p.name, p.role]) : CL_OPT[k];
    m.innerHTML = `<div class="mh">${CL_LABEL[k]}</div>` + opts.map((o) => `<button type="button" role="menuitem" data-v="${esc(o[0])}">${k === 'vaId' ? `<span>${esc(o[3])} <span class="muted" style="font-size:12px">${esc(o[4])}</span></span>` : k === 'span' ? `<span>${o[0]}</span>` : `<span class="cl-tag" style="background:${o[1]};color:${o[2]}">${esc(o[0])}</span>`}${String(c[k]) === o[0] ? '<span class="chk">✓</span>' : ''}</button>`).join('') + (k !== 'vaId' ? '<button type="button" data-v=""><span class="muted">Clear</span></button>' : '');
    m.classList.add('on');
    const b = btn.getBoundingClientRect(), mh = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(b.left, innerWidth - m.offsetWidth - 10)) + 'px';
    m.style.top = (b.bottom + mh + 8 > innerHeight ? Math.max(8, b.top - mh - 6) : b.bottom + 6) + 'px';
    (m.querySelector('.chk') ? m.querySelector('.chk').closest('button') : m.querySelector('button')).focus();
  }
  function clMenuClose() { const m = $('#cl-menu'); if (m) m.classList.remove('on'); clMenuFor = null; }
  function wireClMenu(m) {
    m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || !clMenuFor) return; const { k, c } = clMenuFor; clMenuClose(); clSet(c, k, b.dataset.v); });
    m.addEventListener('keydown', (e) => { const bs = $$('button', m), i = bs.indexOf(document.activeElement); if (e.key === 'ArrowDown') { e.preventDefault(); (bs[i + 1] || bs[0]).focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); } if (e.key === 'Escape') clMenuClose(); });
  }
  document.addEventListener('click', (e) => {
    const dd = e.target.closest('[data-cldd]'); if (dd) { e.preventDefault(); e.stopPropagation(); clMenu(dd); return; }
    if (!e.target.closest('#cl-menu')) clMenuClose();
    const op = e.target.closest('[data-clopen]'); if (op) { e.preventDefault(); clPanelOpen(op.dataset.clopen); }
  }, true);
  window.addEventListener('scroll', clMenuClose, true);
  window.addEventListener('hashchange', () => { clMenuClose(); clPanelClose(true); });

  // ---- side panel: everything about one client, editable, saves as you go
  function clPanelOpen(id) {
    ui.clOpen = id;
    let p = $('#cl-panel');
    if (!p) {
      p = document.createElement('aside'); p.id = 'cl-panel'; p.className = 'cl-panel'; p.setAttribute('aria-label', 'Client details');
      const s = document.createElement('div'); s.id = 'cl-scrim'; s.className = 'cl-scrim'; s.onclick = () => clPanelClose();
      document.body.append(s, p);
      p.addEventListener('change', (e) => { const i = e.target.closest('[data-clpf]'); const c = DB.clients.find((x) => x.id === ui.clOpen); if (i && c) clSet(c, i.dataset.clpf, i.value.trim(), { noUndo: false }); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.clOpen && !$('#cl-menu.on') && !$('dialog[open]')) clPanelClose(); });
    }
    clPanelRefresh(true);
    p.classList.add('on'); $('#cl-scrim').classList.add('on');
    $$('.cl-row').forEach((t) => t.classList.toggle('sel', t.dataset.id === id));
  }
  function clPanelClose(silent) {
    ui.clOpen = null;
    const p = $('#cl-panel'); if (p) p.classList.remove('on'); const s = $('#cl-scrim'); if (s) s.classList.remove('on');
    if (!silent) $$('.cl-row.sel').forEach((t) => t.classList.remove('sel'));
  }
  function clPanelRefresh(force) {
    const p = $('#cl-panel'), c = ui.clOpen && DB.clients.find((x) => x.id === ui.clOpen);
    if (!p || !c) { if (p && ui.clOpen && !c) clPanelClose(); return; }
    if (!force && p.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')) return; // don't wipe what's being typed
    const st = p.scrollTop, va = person(c.vaId), ae = aeOf(va);
    const inp = (k, l, type = 'text', ph = '', full) => `<label class="field ${full ? 'full' : ''}"><span>${l}</span><input class="input" type="${type}" data-clpf="${k}" value="${esc(c[k])}" placeholder="${esc(ph)}"></label>`;
    const when = (v) => (v && !isNaN(new Date(v)) ? fmt(v, { day: 'numeric', month: 'short', year: 'numeric' }) : v || '');
    p.innerHTML = `<div class="cl-ph"><button type="button" class="icon-btn cl-x" data-act="cl-close" aria-label="Close">${ic('x')}</button>
        <input class="cl-title" data-clpf="client" value="${esc(c.client)}" placeholder="Client name">
        <div class="cl-chips">${clTag('status', c.status, c.id)}${clTag('shift', c.shift, c.id)}${c.client ? clTag('pay', c.pay, c.id) : ''}</div></div>
      <div class="cl-sec"><h3>Assignment</h3><div class="cl-form">
        <div class="field"><span>VA</span><button type="button" class="btn cl-pick" data-cldd="vaId" data-id="${esc(c.id)}">${esc(va ? va.name : 'Choose…')}<span class="muted">▾</span></button></div>
        <div class="field"><span>AE</span><input class="input" value="${esc(ae ? ae.name : 'Not set on the VA')}" disabled></div>
        <div class="field"><span>Span</span><button type="button" class="btn cl-pick" data-cldd="span" data-id="${esc(c.id)}">${esc(c.span || '—')}<span class="muted">▾</span></button></div>
        ${inp('signup', 'Signed up', 'month')}</div></div>
      <div class="cl-sec"><h3>Contact & business</h3><div class="cl-form">
        ${inp('phone', 'Phone', 'tel', '(555) 123-4567')}${inp('email', 'Email', 'email', 'client@email.com')}${inp('state', 'State', 'text', 'e.g. Florida')}${inp('tools', 'Tools', 'text', 'Follow Up Boss, Canva…')}
        <label class="field full"><span>Business details</span><textarea class="textarea" data-clpf="business" placeholder="Team, brokerage, niche, what the VA handles">${esc(c.business)}</textarea></label></div></div>
      <div class="cl-sec"><h3>Billing</h3><div class="cl-form">${inp('amount', 'Monthly amount ($)', 'number')}${inp('inv', 'Invoice date', 'date')}${inp('paidTill', 'Paid till', 'text', 'e.g. May 2027')}
        <div class="field"><span>Payment</span><div>${c.client ? clTag('pay', c.pay, c.id) : '—'}</div></div></div></div>
      <div class="cl-sec"><h3>Links</h3><div class="cl-form">${inp('review', 'Review / feedback link', 'url', 'https://…', 1)}${inp('invoice', 'Invoice link', 'url', 'https://…', 1)}</div></div>
      ${clIsDC(c) ? `<div class="cl-sec"><h3>Discontinued</h3><div class="cl-form"><label class="field full"><span>Reason</span><textarea class="textarea" data-clpf="dcReason">${esc(c.dcReason)}</textarea></label></div></div>` : ''}
      <div class="cl-sec"><h3>Notes</h3><form class="cl-addnote" data-clnote><input class="input" name="t" placeholder="Add a note… (Enter to save)" autocomplete="off"><button class="btn">Add</button></form>
        <ul class="cl-tl">${c.notes.map((n) => `<li>${esc(n.t)}<small>${esc(when(n.at))} · ${esc(n.by || '')}</small></li>`).join('') || '<li class="sys muted">No notes yet</li>'}</ul></div>
      <div class="cl-sec"><h3>History</h3><ul class="cl-tl">${c.history.map((x) => `<li class="sys">${esc(x.t)}<small>${esc(when(x.at))}${x.by ? ' · ' + esc(x.by) : ''}</small></li>`).join('') || '<li class="sys muted">Nothing yet</li>'}</ul></div>
      <div class="cl-pfoot"><span class="muted">Changes save automatically</span><span style="flex:1"></span>${clIsDC(c) ? `<button type="button" class="btn" data-act="cl-restore" data-id="${esc(c.id)}">Restore client</button>` : c.client ? `<button type="button" class="btn btn-danger" data-act="cl-dc" data-id="${esc(c.id)}">Mark as DC</button>` : ''}<button type="button" class="btn btn-ghost btn-danger" data-act="cl-del" data-id="${esc(c.id)}">Delete</button></div>`;
    p.scrollTop = st;
    p.querySelector('[data-clnote]').addEventListener('submit', (e) => {
      e.preventDefault(); const i = e.target.t, v = i.value.trim(); if (!v) return;
      save('addClientNote', { id: c.id, text: v }, () => c.notes.unshift({ t: v, by: ME, at: new Date().toISOString() }), 'Note added');
      clPanelRefresh(true); const n = $('#cl-panel [data-clnote] input'); if (n) n.focus();
    });
  }

  // ---- dialogs
  function clAddDialog() {
    const ppl = clOrderPeople(), f = ui.cl || {};
    const sel = (n, list, v) => `<select class="select" name="${n}">${list.map(([val, l]) => `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    modal({
      title: 'Add client', submit: 'Add client',
      body: `<label class="field"><span>Client name</span><input class="input" name="client" required autocomplete="off"></label>
        <div class="row2"><label class="field"><span>VA</span>${sel('vaId', ppl.map((p) => [p.id, p.name + ' · ' + p.role]), f.va || '')}</label><label class="field"><span>Span</span>${sel('span', CL_OPT.span.map((o) => [o[0], o[0]]), '0.5')}</label></div>
        <div class="row2"><label class="field"><span>Shift</span>${sel('shift', CL_OPT.shift.map((o) => [o[0], o[0]]), '1st-Half')}</label><label class="field"><span>Status</span>${sel('status', CL_OPT.status.map((o) => [o[0], o[0]]), 'New Signup')}</label></div>
        <div class="row2"><label class="field"><span>Monthly amount ($)</span><input class="input" name="amount" type="number" min="0"></label><label class="field"><span>Signed up</span><input class="input" name="signup" type="month" value="${isoDay(new Date()).slice(0, 7)}"></label></div>
        <small class="muted">If this VA has an open slot, the client fills it.</small>`,
      onSubmit(fd) {
        const name = String(fd.get('client')).trim();
        if (DB.clients.some((c) => c.client.toLowerCase() === name.toLowerCase() && !clIsDC(c)) && !confirm(name + ' is already on the list. Add another entry?')) return false;
        const vals = { client: name, vaId: fd.get('vaId'), span: fd.get('span'), shift: fd.get('shift'), status: fd.get('status'), pay: 'Invoice Date Upnext', amount: fd.get('amount') || '', signup: fd.get('signup') || '' };
        const slot = DB.clients.find((c) => c.vaId === vals.vaId && !c.client && c.status === 'Available');
        if (slot) {
          save('saveClient', { client: Object.assign({ id: slot.id }, vals) }, () => { Object.assign(slot, vals); slot.history.unshift({ t: 'Open slot filled with ' + name, by: ME, at: new Date().toISOString() }); }, `${name} added (filled an open slot)`);
          setTimeout(() => clPanelOpen(slot.id), 50);
        } else {
          const c = Object.assign({ id: 'c' + uid(), phone: '', email: '', state: '', tools: '', business: '', inv: '', paidTill: '', review: '', invoice: '', dcReason: '', notes: [], history: [{ t: 'Client added', by: ME, at: new Date().toISOString() }], created: new Date().toISOString() }, vals);
          save('saveClient', { client: Object.assign({ id: c.id }, vals) }, () => DB.clients.push(c), name + ' added');
          setTimeout(() => clPanelOpen(c.id), 50);
        }
      },
    });
  }
  function clDcDialog(c) {
    modal({
      title: `Discontinue ${esc(c.client)}?`, submit: 'Discontinue',
      body: `<p class="muted" style="margin:0">They move to the Discontinued list with their notes and history kept.</p>
        <label class="field"><span>Reason</span><select class="select" name="pre">${DC_REASONS.map((o) => `<option>${o}</option>`).join('')}</select></label>
        <label class="field"><span>Details <span class="muted" style="font-weight:400">(optional)</span></span><textarea class="textarea" name="det"></textarea></label>`,
      onSubmit(fd) {
        const reason = fd.get('pre') + (String(fd.get('det') || '').trim() ? ': ' + String(fd.get('det')).trim() : '');
        save('saveClient', { client: { id: c.id, dcReason: reason, status: 'DC' } }, () => { c.dcReason = reason; c.status = 'DC'; }, c.client + ' moved to Discontinued');
        clPanelRefresh(true);
      },
    });
  }
  function clAction(act, id) {
    const f = ui.cl || (ui.cl = { q: '', ae: '', va: '', st: '', pay: '', kpi: '', view: 'active' }), c = DB.clients.find((x) => x.id === id);
    if (act === 'cl-add') return clAddDialog();
    if (act === 'cl-kpi') { f.kpi = f.kpi === id ? '' : id; if (f.kpi) f.view = 'active'; return render(); }
    if (act === 'cl-view') { f.view = id; f.kpi = ''; return render(); }
    if (act === 'cl-clear') { Object.assign(f, { q: '', ae: '', va: '', st: '', pay: '', kpi: '' }); return render(); }
    if (act === 'cl-close') return clPanelClose();
    if (!c) return;
    if (act === 'cl-dc') return clDcDialog(c);
    if (act === 'cl-restore') { save('saveClient', { client: { id: c.id, status: 'Satisfied', shift: c.shift === 'Left' ? 'Full-Time' : c.shift, dcReason: '' } }, () => { c.history.unshift({ t: 'Restored from Discontinued', by: ME, at: new Date().toISOString() }); c.status = 'Satisfied'; if (c.shift === 'Left') c.shift = 'Full-Time'; c.dcReason = ''; }, c.client + ' restored'); return clPanelRefresh(true); }
    if (act === 'cl-del') {
      if (!confirm(`Delete ${c.client || 'this open slot'} for good?\n\nIts notes and history are deleted too.${c.client && !clIsDC(c) ? ' To keep them, use "Mark as DC" instead.' : ''}`)) return;
      clPanelClose();
      return save('deleteClient', { id: c.id }, () => { DB.clients = DB.clients.filter((x) => x !== c); }, 'Deleted');
    }
  }

  /* ------------------------------------------------------------------ Forms
     Managers build a form, launch it to chosen VAs (they get an email), and see who answered.
     VAs open it from the email or My portal, sign in, and their name is filled in automatically.
     A "repeating" section (e.g. one per client) lets a VA add as many entries as they need. */
  const US_STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
  const Q_TYPES = [['text', 'Short answer'], ['paragraph', 'Paragraph'], ['email', 'Email'], ['phone', 'Phone number'], ['number', 'Number'], ['date', 'Date'], ['select', 'Dropdown'], ['checkboxes', 'Checkboxes']];
  const FORM_STATUS = { draft: ['Draft', 'tone-info'], open: ['Open', 'tone-good'], closed: ['Closed', 'tone-bad'] };
  const fid = (p) => p + Math.random().toString(36).slice(2, 9);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const CLIENT_TEMPLATE = () => ({
    title: 'VA Client Information',
    description: 'Please add every client you currently work with. Add one entry per client.',
    schema: { sections: [{ id: fid('s'), title: 'Your clients', repeat: true, itemLabel: 'client', questions: [
      { id: fid('q'), type: 'text', label: 'Client name', required: true },
      { id: fid('q'), type: 'phone', label: 'Client phone number', required: true },
      { id: fid('q'), type: 'email', label: 'Client email', required: true },
      { id: fid('q'), type: 'select', label: 'State', required: true, options: US_STATES.slice() },
      { id: fid('q'), type: 'paragraph', label: 'Business details', required: true, help: 'What the client does (team, brokerage, niche) and the work you handle for them.' },
      { id: fid('q'), type: 'checkboxes', label: 'Tools you use for this client', required: false, options: ['Follow Up Boss', 'Lofty', 'KW Command', 'BoldTrail', 'Compass', 'Canva', 'Google Workspace', 'Microsoft Office', 'Dotloop', 'SkySlope', 'DocuSign', 'QuickBooks', 'Other'] },
      { id: fid('q'), type: 'text', label: 'Other tools (if any)', required: false },
    ] }] },
  });

  // ---- shared renderer: the fill-in form (VA) and the read-only preview / response view (manager)
  function fieldHtml(q, val, key, ro) {
    const req = q.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
    const help = q.help ? `<small>${esc(q.help)}</small>` : '';
    const attrs = `data-q="${esc(q.id)}" ${key} ${ro ? 'disabled' : ''} ${q.required && !ro ? 'required' : ''}`;
    let input;
    if (q.type === 'paragraph') input = `<textarea class="textarea" ${attrs}>${esc(val || '')}</textarea>`;
    else if (q.type === 'select') input = `<select class="select" ${attrs}><option value="">Choose…</option>${(q.options || []).map((o) => `<option ${val === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (q.type === 'checkboxes') { const v = Array.isArray(val) ? val : []; input = `<div class="check-chips">${(q.options || []).map((o) => `<label><input type="checkbox" ${attrs} value="${esc(o)}" ${v.includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`; }
    else { const t = { email: 'email', phone: 'tel', number: 'number', date: 'date' }[q.type] || 'text'; input = `<input class="input" type="${t}" ${attrs} value="${esc(val || '')}" ${q.type === 'phone' ? 'placeholder="(555) 123-4567"' : ''}>`; }
    return `<div class="field fq" data-qwrap="${esc(q.id)}"><span>${esc(q.label || 'Untitled question')}${req}</span>${input}${help}</div>`;
  }
  function formBodyHtml(schema, answers, ro) {
    answers = answers || {};
    return (schema.sections || []).map((s) => {
      if (!s.repeat) return `<section class="card fsec"><div class="card-head"><h2>${esc(s.title || 'Questions')}</h2></div><div class="card-body fgrid">${(s.questions || []).map((q) => fieldHtml(q, answers[q.id], `data-sec="${esc(s.id)}"`, ro)).join('')}</div></section>`;
      const items = Array.isArray(answers[s.id]) && answers[s.id].length ? answers[s.id] : [{}];
      const label = s.itemLabel || 'entry';
      return `<section class="card fsec" data-rsec="${esc(s.id)}"><div class="card-head"><h2>${esc(s.title || 'Entries')}</h2><span class="sub">${items.length} ${esc(label)}${items.length === 1 ? '' : 's'}</span></div>
        ${items.map((it, i) => `<div class="fitem"><div class="fitem-head"><b>${esc(label.charAt(0).toUpperCase() + label.slice(1))} ${i + 1}</b>${!ro && items.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm btn-danger" data-act="f-del-item" data-sec="${esc(s.id)}" data-idx="${i}">${ic('x')}Remove</button>` : ''}</div>
          <div class="fgrid">${(s.questions || []).map((q) => fieldHtml(q, it[q.id], `data-sec="${esc(s.id)}" data-idx="${i}"`, ro)).join('')}</div></div>`).join('')}
        ${ro ? '' : `<div class="card-body"><button type="button" class="btn" data-act="f-add-item" data-sec="${esc(s.id)}">${ic('plus')}Add another ${esc(label)}</button></div>`}</section>`;
    }).join('');
  }
  function collectAnswers(root, schema) {
    const val = (q, sel) => {
      if (q.type === 'checkboxes') return $$(`input[data-q="${q.id}"]${sel}:checked`, root).map((x) => x.value);
      const el = $(`[data-q="${q.id}"]${sel}`, root); return el ? el.value : '';
    };
    const out = {};
    (schema.sections || []).forEach((s) => {
      if (!s.repeat) { (s.questions || []).forEach((q) => (out[q.id] = val(q, `[data-sec="${s.id}"]:not([data-idx])`))); return; }
      const n = $$(`.fsec[data-rsec="${s.id}"] .fitem`, root).length;
      out[s.id] = Array.from({ length: n }, (_, i) => { const o = {}; (s.questions || []).forEach((q) => (o[q.id] = val(q, `[data-sec="${s.id}"][data-idx="${i}"]`))); return o; });
    });
    return out;
  }
  function checkAnswers(schema, a) {
    const bad = (q, v) => (q.required && (Array.isArray(v) ? !v.length : !String(v || '').trim())) ? 'Please answer: ' + q.label
      : (q.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ? 'Enter a valid email for: ' + q.label : '';
    for (const s of schema.sections || []) {
      if (s.repeat) { for (const it of a[s.id] || []) for (const q of s.questions || []) { const m = bad(q, it[q.id]); if (m) return m; } }
      else for (const q of s.questions || []) { const m = bad(q, a[q.id]); if (m) return m; }
    }
    return '';
  }
  // Flattens responses into table rows: one row per VA, or one per repeating entry (e.g. per client).
  function responseRows(form, responses) {
    const secs = form.schema.sections || [], rep = secs.find((s) => s.repeat), flat = secs.filter((s) => !s.repeat).flatMap((s) => s.questions || []);
    const cols = [{ key: 'person', label: 'VA' }].concat(flat.map((q) => ({ q }))).concat(rep ? (rep.questions || []).map((q) => ({ q, rep: true })) : []).concat([{ key: 'updated', label: 'Last updated' }]);
    const show = (q, v) => (Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v));
    const rows = [];
    responses.forEach((r) => {
      const items = rep ? (r.answers[rep.id] || [{}]) : [null];
      items.forEach((it) => rows.push(cols.map((c) => (c.key === 'person' ? r.person : c.key === 'updated' ? fmt(r.updated, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : show(c.q, c.rep ? (it || {})[c.q.id] : r.answers[c.q.id])))));
    });
    return { cols: cols.map((c) => c.label || c.q.label), rows };
  }
  function downloadCsv(form, responses) {
    const { cols, rows } = responseRows(form, responses);
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [cols].concat(rows).map((r) => r.map(cell).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = form.title.replace(/[^\w\s-]+/g, '').trim() + ' responses.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  // A form being typed into should not be redrawn by live sync, and leaving should ask first.
  const setDirty = (v) => { ui.formDirty = v; if (v) window.addEventListener('beforeunload', leaveGuard); else window.removeEventListener('beforeunload', leaveGuard); };
  window.addEventListener('hashchange', () => { if (ui.formDirty) setDirty(false); });

  // ---- manager: list
  function formStats(f) {
    const resp = DB.responses.filter((r) => r.formId === f.id && f.audience.includes(r.personId));
    return { sent: f.audience.length, done: resp.length, resp };
  }
  function pageForms(r) {
    if (r.id === 'new' || (r.id && r.sub === 'edit')) return pageFormBuilder(r);
    if (r.id) return pageFormDash(r);
    const forms = DB.forms.slice().sort((a, b) => (a.updated < b.updated ? 1 : -1));
    const card = (f) => {
      const st = formStats(f), [lab, tone] = FORM_STATUS[f.status] || FORM_STATUS.draft, pct = st.sent ? Math.round((st.done / st.sent) * 100) : 0;
      return `<a class="card form-card" href="#/forms/${esc(f.id)}"><div class="fc-top"><span class="pill ${tone}">${lab}</span>${f.due ? `<span class="muted" style="font-size:12.5px">Due ${fmtShort(f.due)}</span>` : ''}</div>
        <h3>${esc(f.title)}</h3><div class="muted" style="font-size:12.5px">By ${esc(f.createdBy || '—')} · ${(f.schema.sections || []).reduce((n, s) => n + (s.questions || []).length, 0)} questions</div>
        ${f.status === 'draft' ? '<div class="muted" style="font-size:13px;margin-top:10px">Not sent yet</div>' : `<div class="kpi-bar" style="margin-top:12px"><i style="width:${pct}%"></i></div><div style="font-size:13px;margin-top:6px"><b>${st.done}</b> of ${st.sent} submitted</div>`}</a>`;
    };
    const body = `<div class="page-head"><div><h1>Forms</h1><p>Collect information from VAs. They get an email, sign in, and their name is filled in for them.</p></div>
        <div class="actions"><a class="btn btn-primary" href="#/forms/new">${ic('plus')}New form</a></div></div>
      ${forms.length ? `<div class="form-cards">${forms.map(card).join('')}</div>` : `<section class="card"><div class="empty"><b>No forms yet</b>Create one, or start from the "VA client information" template.<div style="margin-top:12px"><a class="btn btn-primary" href="#/forms/new?template=client">${ic('plus')}Use the VA client template</a></div></div></section>`}`;
    return { title: 'Forms', crumbs: '<b>Forms</b>', body };
  }

  // ---- manager: builder
  function pageFormBuilder(r) {
    const editing = r.id !== 'new' && DB.forms.find((f) => f.id === r.id);
    if (!ui.fdraft || ui.fdraft._for !== (editing ? editing.id : 'new')) {
      const tpl = /template=client/.test(location.hash) ? CLIENT_TEMPLATE() : null;
      ui.fdraft = editing ? Object.assign(clone({ id: editing.id, title: editing.title, description: editing.description, schema: editing.schema, due: editing.due }), { _for: editing.id })
        : Object.assign(tpl || { title: '', description: '', schema: { sections: [{ id: fid('s'), title: '', repeat: false, itemLabel: '', questions: [{ id: fid('q'), type: 'text', label: '', required: true }] }] } }, { _for: 'new', due: '' });
    }
    const f = ui.fdraft, answered = editing && formStats(editing).done;
    const qHtml = (s, q, i, n) => `<div class="bq" data-s="${esc(s.id)}" data-q="${esc(q.id)}">
        <div class="bq-row"><input class="input" data-bf="label" placeholder="Question" value="${esc(q.label)}">
          <select class="select" data-bf="type">${Q_TYPES.map(([k, l]) => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        ${q.type === 'select' || q.type === 'checkboxes' ? `<label class="field"><span>Options <span class="muted" style="font-weight:400">(one per line)</span></span><textarea class="textarea" data-bf="options" rows="4">${esc((q.options || []).join('\n'))}</textarea>${q.type === 'select' ? `<button type="button" class="btn btn-ghost btn-sm" data-act="b-states" style="align-self:flex-start">Fill with the 50 US states</button>` : ''}</label>` : ''}
        <input class="input bq-help" data-bf="help" placeholder="Help text (optional)" value="${esc(q.help || '')}">
        <div class="bq-foot"><label class="check"><input type="checkbox" data-bf="required" ${q.required ? 'checked' : ''}> Required</label>
          <span class="right"><button type="button" class="icon-btn" data-act="b-up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ic('chevron').replace('<svg', '<svg style="transform:rotate(-90deg)"')}</button><button type="button" class="icon-btn" data-act="b-down" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down">${ic('chevron').replace('<svg', '<svg style="transform:rotate(90deg)"')}</button><button type="button" class="icon-btn" data-act="b-delq" aria-label="Delete question">${ic('x')}</button></span></div></div>`;
    const secHtml = (s, si) => `<section class="card bsec" data-s="${esc(s.id)}"><div class="card-body" style="display:flex;flex-direction:column;gap:12px">
        <div class="bsec-head"><input class="input" data-bs="title" placeholder="Section title (e.g. Your clients)" value="${esc(s.title || '')}">${f.schema.sections.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm btn-danger" data-act="b-delsec">Remove section</button>` : ''}</div>
        <label class="check"><input type="checkbox" data-bs="repeat" ${s.repeat ? 'checked' : ''}> VAs can add this section more than once (e.g. once per client)</label>
        ${s.repeat ? `<label class="field" style="max-width:280px"><span>Each entry is a…</span><input class="input" data-bs="itemLabel" placeholder="client" value="${esc(s.itemLabel || '')}"></label>` : ''}
        ${(s.questions || []).map((q, i) => qHtml(s, q, i, s.questions.length)).join('')}
        <div><button type="button" class="btn" data-act="b-addq">${ic('plus')}Add question</button></div></div></section>`;
    const body = `<div class="page-head"><div><h1>${editing ? 'Edit form' : 'New form'}</h1><p>VAs' names are added automatically, so you don't need a "Name" question.</p></div>
        <div class="actions">${!editing ? `<button class="btn" data-act="b-template">${ic('note')}Use VA client template</button>` : ''}<button class="btn btn-primary" data-act="b-save">${ic('check')}${editing ? 'Save changes' : 'Save form'}</button></div></div>
      ${answered ? `<div class="banner">${ic('info')}<span>${answered} VA${answered === 1 ? ' has' : 's have'} already answered. Changing or removing questions can hide their earlier answers.</span></div>` : ''}
      <div id="builder" class="builder">
        <section class="card"><div class="card-body" style="display:flex;flex-direction:column;gap:12px">
          <label class="field"><span>Form title</span><input class="input" data-bt="title" placeholder="e.g. VA Client Information" value="${esc(f.title)}"></label>
          <label class="field"><span>Instructions <span class="muted" style="font-weight:400">(shown on the form and in the email)</span></span><textarea class="textarea" data-bt="description">${esc(f.description || '')}</textarea></label></div></section>
        ${f.schema.sections.map(secHtml).join('')}
        <div><button type="button" class="btn btn-ghost" data-act="b-addsec">${ic('plus')}Add section</button></div>
      </div>`;
    return {
      title: editing ? 'Edit form' : 'New form', crumbs: `<a href="#/forms">Forms</a><span>/</span><b>${editing ? esc(editing.title) : 'New form'}</b>`, body,
      after() {
        $('#builder').addEventListener('input', (e) => {
          const t = e.target, sEl = t.closest('[data-s]'), s = sEl && f.schema.sections.find((x) => x.id === sEl.dataset.s), qEl = t.closest('.bq'), q = qEl && s && s.questions.find((x) => x.id === qEl.dataset.q);
          setDirty(true);
          if (t.dataset.bt) f[t.dataset.bt] = t.value;
          else if (t.dataset.bs && s) { if (t.dataset.bs === 'repeat') { s.repeat = t.checked; if (s.repeat && !s.itemLabel) s.itemLabel = 'client'; render(); } else s[t.dataset.bs] = t.value; }
          else if (t.dataset.bf && q) {
            if (t.dataset.bf === 'required') q.required = t.checked;
            else if (t.dataset.bf === 'options') q.options = t.value.split('\n').map((x) => x.trim()).filter(Boolean);
            else if (t.dataset.bf === 'type') { q.type = t.value; if ((q.type === 'select' || q.type === 'checkboxes') && !(q.options || []).length) q.options = ['Option 1', 'Option 2']; render(); }
            else q[t.dataset.bf] = t.value;
          }
        });
      },
    };
  }
  function builderAction(act, el) {
    const f = ui.fdraft; if (!f) return;
    const sEl = el.closest('[data-s]'), s = sEl && f.schema.sections.find((x) => x.id === sEl.dataset.s), qEl = el.closest('.bq'), qi = qEl && s ? s.questions.findIndex((x) => x.id === qEl.dataset.q) : -1;
    setDirty(true);
    if (act === 'b-addq' && s) s.questions.push({ id: fid('q'), type: 'text', label: '', required: false });
    else if (act === 'b-delq' && s) s.questions.splice(qi, 1);
    else if (act === 'b-up' && s && qi > 0) s.questions.splice(qi - 1, 0, s.questions.splice(qi, 1)[0]);
    else if (act === 'b-down' && s && qi < s.questions.length - 1) s.questions.splice(qi + 1, 0, s.questions.splice(qi, 1)[0]);
    else if (act === 'b-states' && s) s.questions[qi].options = US_STATES.slice();
    else if (act === 'b-addsec') f.schema.sections.push({ id: fid('s'), title: '', repeat: false, itemLabel: '', questions: [{ id: fid('q'), type: 'text', label: '', required: false }] });
    else if (act === 'b-delsec' && s && confirm('Remove this section and its questions?')) f.schema.sections = f.schema.sections.filter((x) => x !== s);
    else if (act === 'b-template') { if ((f.title || f.schema.sections.some((x) => x.questions.some((q) => q.label))) && !confirm('Replace what you have with the VA client template?')) return; ui.fdraft = Object.assign(CLIENT_TEMPLATE(), { _for: 'new', due: '' }); }
    else if (act === 'b-save') return saveDraftForm();
    render();
  }
  async function saveDraftForm() {
    const f = ui.fdraft;
    f.schema.sections.forEach((s) => { s.questions = s.questions.filter((q) => String(q.label || '').trim()); });
    f.schema.sections = f.schema.sections.filter((s) => s.questions.length);
    if (!String(f.title || '').trim()) { toast('Give the form a title', true); render(); return; }
    if (!f.schema.sections.length) { toast('Add at least one question', true); f.schema.sections.push({ id: fid('s'), title: '', repeat: false, questions: [{ id: fid('q'), type: 'text', label: '', required: false }] }); render(); return; }
    const bad = f.schema.sections.flatMap((s) => s.questions).find((q) => (q.type === 'select' || q.type === 'checkboxes') && !(q.options || []).length);
    if (bad) { toast(`Add options for "${bad.label}"`, true); render(); return; }
    const payload = { id: f._for === 'new' ? '' : f._for, title: f.title.trim(), description: f.description || '', schema: f.schema };
    try {
      inflight++; let j; try { j = await api('saveForm', { form: payload }); } finally { inflight--; }
      setDirty(false); ui.fdraft = null;
      await load(); toast('Form saved'); render.keepScroll = false; location.hash = '#/forms/' + (j.result && j.result.id);
    } catch (e) { toast('Could not save: ' + e.message, true); }
  }

  // ---- manager: dashboard for one form
  function pageFormDash(r) {
    const f = DB.forms.find((x) => x.id === r.id);
    if (!f) return { crumbs: '<a href="#/forms">Forms</a> / <b>Not found</b>', body: '<div class="card empty"><b>Form not found</b><a href="#/forms">Back to Forms</a></div>' };
    const st = formStats(f), [lab, tone] = FORM_STATUS[f.status] || FORM_STATUS.draft, tab = ['people', 'responses', 'questions'].includes(r.sub) ? r.sub : f.status === 'draft' ? 'questions' : 'people';
    const pending = f.audience.filter((pid) => !st.resp.some((x) => x.personId === pid));
    const pct = st.sent ? Math.round((st.done / st.sent) * 100) : 0;
    const actions = f.status === 'draft' ? `<a class="btn" href="#/forms/${esc(f.id)}/edit">${ic('edit')}Edit</a><button class="btn btn-primary" data-act="f-launch" data-id="${esc(f.id)}">${ic('chat')}Launch & email VAs</button>`
      : f.status === 'open' ? `<a class="btn btn-ghost" href="#/forms/${esc(f.id)}/edit">${ic('edit')}Edit</a><button class="btn" data-act="f-launch" data-id="${esc(f.id)}">${ic('plus')}Send to more VAs</button>${pending.length ? `<button class="btn" data-act="f-remind" data-id="${esc(f.id)}">${ic('clock')}Remind ${pending.length}</button>` : ''}<button class="btn" data-act="f-status" data-id="${esc(f.id)}" data-s="closed">Close form</button>`
      : `<a class="btn btn-ghost" href="#/forms/${esc(f.id)}/edit">${ic('edit')}Edit</a><button class="btn" data-act="f-status" data-id="${esc(f.id)}" data-s="open">Reopen</button>`;
    let content = '';
    if (tab === 'people') {
      const row = (pid) => { const p = person(pid), resp = st.resp.find((x) => x.personId === pid); return `<li>${avatar(p || { id: pid, name: '?' })}<div class="grow"><div class="title">${esc(p ? p.name : 'Removed VA')} ${p ? `<span class="role-tag">${esc(p.role)}</span>` : ''}</div><div class="meta">${resp ? `Submitted ${fmt(resp.submitted, { day: 'numeric', month: 'short' })}${resp.updated !== resp.submitted ? ' · updated ' + ago(resp.updated) : ''}` : esc(p && p.email ? p.email : '')}</div></div>
        ${resp ? `<span class="pill tone-good">Submitted</span><button class="btn btn-sm" data-act="f-view" data-id="${esc(resp.id)}">View</button>` : '<span class="pill tone-warn">Pending</span>'}</li>`; };
      content = f.audience.length ? `<section class="card"><ul class="list">${st.resp.map((x) => x.personId).concat(pending).map(row).join('')}</ul></section>` : `<section class="card"><div class="empty"><b>Not sent yet</b>Launch the form to email your VAs.</div></section>`;
    } else if (tab === 'responses') {
      const { cols, rows } = responseRows(f, st.resp);
      content = rows.length ? `<section class="card"><div class="table-wrap resp-wrap"><table class="table resp-table"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((rw) => `<tr>${rw.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : '<section class="card"><div class="empty"><b>No responses yet</b>Answers appear here as VAs submit.</div></section>';
    } else content = `<div class="form-preview">${formBodyHtml(f.schema, {}, true)}</div>`;
    const body = `<section class="card form-dash-head"><div class="card-body">
        <div class="fdh-top"><div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h1>${esc(f.title)}</h1><span class="pill ${tone}">${lab}</span></div>
          <div class="muted" style="font-size:13px;margin-top:4px">Created by ${esc(f.createdBy || '—')}${f.launched ? ' · sent ' + fmt(f.launched) : ''}${f.due ? ' · due ' + fmt(f.due) : ''}</div></div>
          <div class="actions">${actions}<button class="btn btn-ghost btn-danger" data-act="f-more" data-id="${esc(f.id)}">Delete</button></div></div>
        ${f.status !== 'draft' ? `<div class="fdh-prog"><div class="kpi-bar"><i style="width:${pct}%"></i></div><span><b>${st.done}</b> of ${st.sent} submitted · ${pending.length} pending</span></div>` : ''}</div>
        <div class="tabs" role="tablist">${[['people', `People <span class="muted">${st.sent || ''}</span>`], ['responses', `Responses <span class="muted">${st.done || ''}</span>`], ['questions', 'Questions']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-act="go" data-id="#/forms/${esc(f.id)}/${k}">${l}</button>`).join('')}
          ${st.done ? `<button class="btn btn-sm btn-ghost right" data-act="f-csv" data-id="${esc(f.id)}" style="margin:6px 0">${ic('download')}Download CSV</button>` : ''}</div></section>
      ${content}`;
    return { title: f.title, crumbs: `<a href="#/forms">Forms</a><span>/</span><b>${esc(f.title)}</b>`, body };
  }
  function launchDialog(id) {
    const f = DB.forms.find((x) => x.id === id); if (!f) return;
    const people = activePeople().filter((p) => p.email).sort((a, b) => a.name.localeCompare(b.name));
    const noMail = activePeople().filter((p) => !p.email && !/AE/.test(p.role));
    const already = (pid) => f.audience.includes(pid);
    modal({
      title: f.status === 'draft' ? 'Launch form' : 'Send to more VAs', sub: esc(f.title), submit: f.status === 'draft' ? 'Launch' : 'Send', wide: false,
      body: `<div class="field"><span>Send to</span><div class="launch-tools"><button type="button" class="btn btn-ghost btn-sm" data-pick="all">Select all</button><button type="button" class="btn btn-ghost btn-sm" data-pick="none">Clear</button></div>
          <div class="launch-list">${people.map((p) => `<label class="check"><input type="checkbox" name="aud" value="${esc(p.id)}" ${already(p.id) ? 'checked disabled' : f.status === 'draft' ? 'checked' : ''}> ${esc(p.name)} <span class="muted">· ${esc(p.role)}${already(p.id) ? ' · already sent' : ''}</span></label>`).join('')}</div>
          ${noMail.length ? `<small>Not listed (no Gmail on their profile): ${noMail.map((p) => esc(p.name)).join(', ')}</small>` : ''}</div>
        <label class="field"><span>Due date <span class="muted" style="font-weight:400">(optional)</span></span><input class="input" type="date" name="due" value="${esc(f.due || '')}"></label>
        <label class="check"><input type="checkbox" name="notify" checked> Email them a link now</label>`,
      onMount(d) { $$('[data-pick]', d).forEach((b) => b.addEventListener('click', () => $$('input[name=aud]:not(:disabled)', d).forEach((x) => (x.checked = b.dataset.pick === 'all')))); },
      onSubmit(fd, form) {
        const aud = $$('input[name=aud]:checked:not(:disabled)', form).map((x) => x.value);
        if (!aud.length && f.status !== 'draft') { toast('Choose at least one VA', true); return false; }
        if (!aud.length) { toast('Choose at least one VA', true); return false; }
        (async () => {
          toast('Sending…', false, 'chat');
          try { inflight++; let j; try { j = await api('launchForm', { id, audience: aud, due: fd.get('due') || '', notify: !!fd.get('notify') }); } finally { inflight--; }
            const res = j.result || {}; await load(); render();
            toast(fd.get('notify') ? `Emailed ${res.sent} VA${res.sent === 1 ? '' : 's'}${res.failed && res.failed.length ? ` · ${res.failed.length} failed` : ''}` : 'Form opened', !!(res.failed && res.failed.length));
          } catch (e) { toast('Could not launch: ' + e.message, true); }
        })();
      },
    });
  }
  function viewResponse(rid) {
    const r = DB.responses.find((x) => x.id === rid), f = r && DB.forms.find((x) => x.id === r.formId); if (!r || !f) return;
    modal({ title: esc(r.person), sub: `${esc(f.title)} · submitted ${fmt(r.submitted)}${r.updated !== r.submitted ? ', updated ' + fmt(r.updated) : ''}`, wide: true, submit: 'Close', body: `<div class="form-preview">${formBodyHtml(f.schema, r.answers, true)}</div>`, onSubmit() {} });
  }
  function formMore(id) {
    const f = DB.forms.find((x) => x.id === id); if (!f) return;
    const n = formStats(f).done;
    if (!confirm(`Delete "${f.title}"${n ? ` and its ${n} response${n === 1 ? '' : 's'}` : ''}?\n\nThis cannot be undone.${f.status === 'open' ? ' To stop new answers but keep everything, use "Close form" instead.' : ''}`)) return;
    save('deleteForm', { id }, () => { DB.forms = DB.forms.filter((x) => x.id !== id); DB.responses = DB.responses.filter((x) => x.formId !== id); }, 'Form deleted');
    location.hash = '#/forms';
  }

  // ---- VA: list and fill-in
  const vaFormsPending = () => (DB.forms || []).filter((f) => f.status === 'open' && !f.response);
  function vaFormsPage() {
    const list = (DB.forms || []).slice().sort((a, b) => (a.status === b.status ? (a.due || '9') < (b.due || '9') ? -1 : 1 : a.status === 'open' ? -1 : 1));
    const row = (f) => `<li style="cursor:pointer" data-act="go" data-id="#/forms/${esc(f.id)}"><span class="doc-ico">${ic('note')}</span><div class="grow"><div class="title">${esc(f.title)}</div><div class="meta">${f.due ? 'Due ' + fmt(f.due) : 'No due date'}${f.response ? ' · last saved ' + ago(f.response.updated) : ''}</div></div>
      ${f.status === 'closed' ? '<span class="pill tone-bad">Closed</span>' : f.response ? '<span class="pill tone-good">Submitted</span>' : '<span class="pill tone-warn">To do</span>'}</li>`;
    return `<div class="page-head"><div><h1>Forms</h1><p>Forms your manager asked you to fill in. You can update your answers until a form closes.</p></div></div>
      ${list.length ? `<section class="card"><ul class="list">${list.map(row).join('')}</ul></section>` : '<section class="card"><div class="empty"><b>Nothing to fill in</b>When your manager sends you a form, it appears here and in your email.</div></section>'}`;
  }
  function vaFormFill(id) {
    const f = (DB.forms || []).find((x) => x.id === id);
    if (!f) return `<section class="card"><div class="empty"><b>Form not found</b>It may have been removed, or it wasn't sent to you. <a href="#/forms">Back to Forms</a></div></section>`;
    const ro = f.status !== 'open', p = DB.profile || {};
    const ans = (ui.fanswers && ui.fanswers._for === id) ? ui.fanswers : (f.response ? f.response.answers : {});
    return `<section class="card" style="margin-bottom:20px"><div class="card-body">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h1 style="margin:0">${esc(f.title)}</h1>${ro ? '<span class="pill tone-bad">Closed</span>' : f.response ? '<span class="pill tone-good">Submitted</span>' : ''}</div>
        ${f.description ? `<p class="muted" style="white-space:pre-wrap;margin:8px 0 0">${esc(f.description)}</p>` : ''}
        <div class="fill-who">${avatar({ id: 'm', name: p.name || ME })}<div><div style="font-weight:600">${esc(p.name || ME)}</div><div class="muted" style="font-size:12.5px">${esc(p.role || 'VA')} · filled in automatically</div></div>${f.due ? `<span class="pill plain ${!ro && daysSince(f.due) > 0 ? 'tone-bad' : 'tone-info'} right">Due ${fmt(f.due)}</span>` : ''}</div>
        ${ro ? '<div class="banner" style="margin:14px 0 0">' + ic('info') + '<span>This form is closed, so your answers can no longer be changed.</span></div>' : f.response ? `<div class="muted" style="font-size:13px;margin-top:12px">You submitted this on ${fmt(f.response.submitted)}. Change anything below and save again.</div>` : ''}
      </div></section>
      <form id="va-form" novalidate>${formBodyHtml(f.schema, ans, ro)}
        ${ro ? '' : `<div class="fill-actions"><span class="req-note"><span class="req">*</span> required</span><button class="btn btn-primary">${ic('check')}${f.response ? 'Save changes' : 'Submit'}</button></div>`}</form>`;
  }
  function wireVaForm(id) {
    const form = $('#va-form'); if (!form) return;
    const f = DB.forms.find((x) => x.id === id);
    form.addEventListener('input', () => setDirty(true));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const a = collectAnswers(form, f.schema), msg = checkAnswers(f.schema, a);
      if (msg) { toast(msg, true); return; }
      const btn = form.querySelector('.fill-actions .btn'); btn.disabled = true; btn.innerHTML = '<span class="spin-sm"></span>Saving…';
      try {
        inflight++; try { await api('submitForm', { formId: id, answers: a }); } finally { inflight--; }
        setDirty(false); ui.fanswers = null; await load(); render(); toast(f.response ? 'Your changes are saved' : 'Thank you! Your answers are submitted');
      } catch (err) { toast(err.message, true); btn.disabled = false; btn.innerHTML = ic('check') + (f.response ? 'Save changes' : 'Submit'); }
    });
  }
  function repeatItem(el, add) {
    const root = el.closest('form, .form-preview, #page'), id = route().id;
    const f = DB.va ? DB.forms.find((x) => x.id === id) : null; if (!f) return;
    const a = collectAnswers(root, f.schema), sid = el.dataset.sec;
    a[sid] = a[sid] || [];
    if (add) a[sid].push({}); else a[sid].splice(Number(el.dataset.idx), 1);
    ui.fanswers = Object.assign(a, { _for: id }); setDirty(true); render.keepScroll = true; render();
    if (add) { const items = $$(`.fsec[data-rsec="${sid}"] .fitem`); const last = items[items.length - 1]; if (last) { last.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = last.querySelector('input,textarea,select'); if (i) i.focus(); } }
  }

  /* ------------------------------------------------------------------ VA view ("My Portal")
     What a signed-in VA sees. The server only sends their own profile and the trainings they are in:
     no ratings, targets, notes, other VAs or manager data ever reach this page. */
  function renderVA() {
    const d = DB, p = d.profile || {};
    const mine = (d.training || []).filter((t) => t.as === 'trainee'), teach = (d.training || []).filter((t) => t.as === 'trainer');
    const open = (l) => l.filter((t) => t.status !== 'Completed').sort((a, b) => (a.due < b.due ? -1 : 1));
    const done = (l) => l.filter((t) => t.status === 'Completed');
    const item = (t) => `<li>${avatar({ id: t.with, name: t.with })}<div class="grow"><div class="title">${esc(t.as === 'trainee' ? 'Trainer: ' : 'Trainee: ')}${esc(t.with || '—')} <span class="role-tag">${esc(t.withRole || '')}</span></div>
      <div class="chips" style="margin-top:6px">${t.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>
      <div style="text-align:right"><span class="pill ${STATUS_TONE[t.status] || 'tone-info'}">${esc(t.status)}</span><div class="meta" style="${t.status !== 'Completed' && t.due && daysSince(t.due) > 0 ? 'color:var(--bad);font-weight:600' : ''}">${t.status === 'Completed' ? 'Done' : t.due ? (daysSince(t.due) > 0 ? 'Overdue · ' : 'Due ') + fmtShort(t.due) : ''}</div></div></li>`;
    const section = (title, sub, list, empty) => `<section class="card"><div class="card-head"><h2>${title}</h2><span class="sub">${sub}</span></div>${list.length ? `<ul class="list">${list.map(item).join('')}</ul>` : `<div class="empty">${empty}</div>`}</section>`;
    const first = String(p.name || ME).split(' ')[0];
    const vr = route(), onGuides = vr.page === 'guides', onForms = vr.page === 'forms';
    const pend = vaFormsPending().length;
    const vnav = (m) => [['#/', 'home', 'My portal', !onGuides && !onForms], ['#/forms', 'note', 'Forms', onForms, pend], ['#/guides', 'book', 'Guidebooks', onGuides]].map(([h, i, l, cur, n]) => `<a href="${h}" ${cur ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${n ? `<span class="${m ? 'dot-count' : 'count count-new'}">${n}</span>` : ''}</a>`).join('');
    const formsCard = (d.forms || []).length ? `<section class="card" style="margin-bottom:20px"><div class="card-head"><h2>Forms to fill</h2><span class="sub">${pend ? `<span class="pill plain tone-warn">${pend} to do</span>` : 'All done'}</span><a class="btn btn-ghost btn-sm right" href="#/forms">Open ${ic('chevron')}</a></div>
            ${pend ? `<ul class="list">${vaFormsPending().map((f) => `<li style="cursor:pointer" data-act="go" data-id="#/forms/${esc(f.id)}"><span class="doc-ico">${ic('note')}</span><div class="grow"><div class="title">${esc(f.title)}</div><div class="meta">${f.due ? 'Due ' + fmt(f.due) : 'No due date'}</div></div><span class="btn btn-sm btn-primary">Fill in</span></li>`).join('')}</ul>` : ''}</section>` : '';
    const guidesPage = `<div class="page-head"><div><h1>Guidebooks</h1><p>Read the training guidebooks here or download them to keep.</p></div></div>
          <div class="toolbar"><label class="search-field">${ic('search')}<span class="sr-only">Search guidebooks</span><input class="input" id="doc-q" type="search" placeholder="Search guidebooks" value="${esc(ui.docQuery || '')}"></label></div>
          <div id="docs-list">${guidesHtml(d.docs || [], false)}</div>`;
    $('#app').innerHTML = `<div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#/">${MARK}<div><div class="brand-name">${esc(d.settings.teamName)}</div><div class="brand-sub">Training Portal</div></div></a>
        <nav class="nav" aria-label="Main">${vnav()}</nav>
        <div class="sidebar-foot"><div class="me">${avatar({ id: 'm', name: ME })}<div style="min-width:0"><div class="me-name">${esc(ME)}</div><div class="me-role" title="${esc(MEINFO ? MEINFO.email : '')}">${esc(p.role || 'VA')}</div></div>
          <button type="button" data-act="sign-out" title="Sign out" aria-label="Sign out">${ic('logout')}</button></div></div>
      </aside>
      <div class="main">
        <header class="topbar"><a class="mobile-brand" href="#/">${MARK}<b>${esc(d.settings.teamName)}</b></a><span class="right"><button type="button" class="btn btn-sm btn-ghost va-signout" data-act="sign-out">${ic('logout')}Sign out</button></span></header>
        <main class="page" id="page">${onForms ? (vr.id ? vaFormFill(vr.id) : vaFormsPage()) : onGuides ? guidesPage : `
          <section class="hero"><div><h1>${greeting()}, ${esc(first)}</h1><p>${fmt(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })} · ${esc(p.role || 'VA')}${p.account ? ' · ' + esc(p.account) : ''}</p></div></section>
          ${formsCard}
          <div class="grid grid-2e" style="align-items:start;margin-bottom:20px">
            ${section('My training', 'Skills you are learning', open(mine), 'No training assigned right now.')}
            ${teach.length ? section('Training others', 'VAs you are helping', open(teach), 'Nobody to train right now.') : `<section class="card"><div class="card-head"><h2>Quizzes</h2><span class="sub">Coming soon</span></div><div class="card-body muted">Practice quizzes and skill assessments will appear here, one for each skill guidebook.</div></section>`}
          </div>
          ${teach.length ? `<section class="card" style="margin-bottom:20px"><div class="card-head"><h2>Quizzes</h2><span class="sub">Coming soon</span></div><div class="card-body muted">Practice quizzes and skill assessments will appear here, one for each skill guidebook.</div></section>` : ''}
          <section class="card" style="margin-bottom:20px"><div class="card-head"><h2>Guidebooks</h2><span class="sub">${(d.docs || []).length} to read or download</span><a class="btn btn-ghost btn-sm right" href="#/guides">Open ${ic('chevron')}</a></div></section>
          ${done(mine).length + done(teach).length ? section('Completed', 'Finished trainings', done(mine).concat(done(teach)), '') : ''}`}
        </main>
      </div>
      <nav class="tabbar va-tabbar" aria-label="Main">${vnav(true)}</nav></div>`;
    document.title = (onForms ? 'Forms' : onGuides ? 'Guidebooks' : 'My portal') + ' · ' + d.settings.teamName + ' Training Portal';
    if (onForms && vr.id) wireVaForm(vr.id);
    const dq = $('#doc-q'); if (dq) dq.addEventListener('input', (e) => { ui.docQuery = e.target.value; $('#docs-list').innerHTML = guidesHtml(d.docs || [], false); });
  }

  /* ------------------------------------------------------------------ Users
     Who can sign in. Each manager signs in with the Google account (Gmail) listed here. */
  function pageUsers() {
    const list = DB.managerList;
    const ready = list.filter((m) => m.email).length;
    const body = `
      <div class="page-head"><div><h1>Users</h1><p>Only the Google accounts listed here can sign in to the portal. Add a manager's Gmail and they can sign in straight away.</p></div></div>
      <div class="grid grid-2e" style="align-items:start">
        <section class="card"><div class="card-head"><h2>Managers</h2><span class="sub">${ready} of ${list.length} can sign in</span></div>
          ${list.length ? `<ul class="list">${list.map((m, i) => {
            const you = MEINFO ? m.email && m.email === MEINFO.email : m.name === ME;
            return `<li>${avatar({ id: 'm', name: m.name })}<div class="grow"><div class="title">${esc(m.name)} ${you ? '<span class="pill plain tone-info">You</span>' : ''}${m.owner ? ' <span class="pill plain tone-accent">Owner</span>' : ''}</div>
              <div class="meta">${m.email ? esc(m.email) : '<span style="color:var(--warn);font-weight:600">No Gmail yet — can\'t sign in</span>'}</div></div>
              <button class="btn btn-sm ${m.email ? 'btn-ghost' : ''}" data-act="edit-manager" data-id="${i}">${ic('edit')}${m.email ? 'Edit' : 'Add Gmail'}</button>
              ${!you && !m.owner ? `<button class="btn btn-sm btn-ghost btn-danger" data-act="del-manager" data-id="${i}">Remove</button>` : ''}</li>`;
          }).join('')}</ul>` : '<div class="empty">No managers yet.</div>'}
        </section>
        <div class="stack">
          <section class="card"><div class="card-head"><h2>Add a manager</h2></div>
            <form class="card-body" data-form="manager" style="display:flex;flex-direction:column;gap:14px">
              <label class="field"><span>Name</span><input class="input" name="name" placeholder="e.g. Jeff Hardy" required autocomplete="off"><small>Shown on the ratings and notes they make.</small></label>
              <label class="field"><span>Gmail / Google account</span><input class="input" type="email" name="email" placeholder="name@gmail.com" required autocomplete="off"><small>The Google account they will sign in with.</small></label>
              <div><button class="btn btn-primary">${ic('plus')}Add manager</button></div>
            </form></section>
          <section class="card card-pad"><h3 class="mini-title">How it works</h3>
            <ul class="how">
              <li>They open the portal link and click <b>Sign in with Google</b>.</li>
              <li>The first time, Google asks them to allow the portal to see their email address.</li>
              <li>Removing someone locks them out right away.</li>
              <li>The Google account that owns the portal (marked <b>Owner</b>) always has access.</li>
            </ul></section>
        </div>
      </div>`;
    return {
      title: 'Users', crumbs: '<b>Users</b>', body,
      after() {
        $('[data-form="manager"]').addEventListener('submit', (e) => {
          e.preventDefault(); const f = new FormData(e.target);
          const name = String(f.get('name') || '').trim(), email = String(f.get('email') || '').trim().toLowerCase();
          if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Enter a name and a valid Gmail address', true); return; }
          if (DB.managerList.some((m) => m.email === email)) { toast(email + ' is already a manager', true); return; }
          // If this name is already listed without a Gmail, fill theirs in instead of adding a duplicate.
          const i = DB.managerList.findIndex((m) => !m.email && m.name.toLowerCase() === name.toLowerCase());
          saveManagerRec(i, { name, email });
        });
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
          <section class="card"><div class="card-head"><h2>Users</h2><span class="sub">${DB.managerList.length} manager${DB.managerList.length === 1 ? '' : 's'} can sign in</span><a class="btn btn-sm right" href="#/users">${ic('user')}Manage users</a></div>
            <div class="card-body muted" style="font-size:13px">Add or remove the Gmail accounts that can sign in on the Users page.</div></section>
          <section class="card"><div class="card-head"><h2>Appearance</h2></div><div class="card-body">
            <div class="seg" role="group" aria-label="Colour scheme">${[['system', `System (currently ${sysDark ? 'dark' : 'light'})`], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button type="button" aria-pressed="${currentScheme() === k}" data-act="scheme" data-id="${k}">${l}</button>`).join('')}</div></div></section>
          <section class="card"><div class="card-head"><h2>Data</h2></div><div class="card-body" style="display:flex;flex-direction:column;gap:8px">
            <div><span class="pill ${DEMO ? 'tone-warn' : 'tone-good'}">${DEMO ? 'Sample data' : 'Connected to Google Sheet'}</span></div>
            <p class="muted" style="margin:0">${DEMO ? 'Paste your Apps Script web app URL into <code>config.js</code> to switch to your real team. Changes made here are not saved.' : 'Every change is saved to the Team Troy Google Sheet. You can open the sheet any time to read or export the data.'}</p></div></section>
        </div>
        <section class="card"><div class="card-head"><h2>Skills</h2><span class="sub">${activeSkills().length} active</span><button class="btn btn-sm right" data-act="add-skill">${ic('plus')}Add skill</button></div>
          <div class="card-body" style="padding-top:8px">${[...new Set(DB.skills.map((k) => k.category))].sort((a, b) => (a === OTHER_CAT) - (b === OTHER_CAT)).map((cat) => {
            const list = DB.skills.map((k, i) => ({ k, i })).filter((x) => x.k.category === cat);
            return `<details class="group"><summary>${chev}<span class="g-name">${esc(cat)}</span><span class="g-meta">${list.filter((x) => x.k.active !== 'N').length} active${list.some((x) => x.k.active === 'N') ? ` · ${list.filter((x) => x.k.active === 'N').length} hidden` : ''}</span></summary>
              <ul class="g-list">${list.map(({ k, i }) => `<li><span class="${k.active === 'N' ? 'muted' : ''}">${esc(k.name)}</span>${k.active === 'N' ? '<span class="pill tone-bad">Hidden</span>' : ''}<button class="icon-btn" data-act="edit-skill" data-id="${i}" aria-label="Edit ${esc(k.name)}">${ic('edit')}</button></li>`).join('')}</ul></details>`;
          }).join('')}</div></section>
      </div>`;
    return {
      title: 'Settings', crumbs: '<b>Settings</b>', body,
      after() {
        $('[data-form="team"]').addEventListener('submit', (e) => {
          e.preventDefault(); const f = new FormData(e.target);
          const next = Object.assign({}, DB.settings, { teamName: f.get('teamName').trim(), reassessDays: Number(f.get('reassessDays')) });
          save('saveSettings', { settings: { teamName: next.teamName, reassessDays: next.reassessDays } }, () => { DB.settings = next; }, 'Settings saved');
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
  const personOptions = (sel, exclude) => activePeople().filter((p) => p.id !== exclude).sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(withRole(p))}</option>`).join('');

  function rateDialog(pid, openCat) {
    const c = derive();
    const keyOf = (name) => 'r_' + btoa(unescape(encodeURIComponent(name))).replace(/[=+/]/g, '');
    const row = (name, v, isNew) => `<div class="rate-row" data-name="${esc(name.toLowerCase())}"><div><div class="nm">${esc(name)}${isNew ? ' <span class="pill plain tone-accent">New</span>' : ''}</div><div class="hint" data-hint>${v ? `Current: ${v} · ${SCALE[v - 1].label}` : 'Not rated yet (0)'}</div></div>
          <fieldset class="scale" aria-label="${esc(name)}" data-skill="${esc(name)}">${SCALE.map((x) => `<label title="${x.n} · ${x.label}: ${x.desc}"><input type="radio" name="${keyOf(name)}" value="${x.n}" ${v === x.n ? 'checked' : ''}><span>${x.n}</span></label>`).join('')}</fieldset></div>`;
    const renderList = (id) => {
      const m = c.latest[id] || {};
      const cats = categories().filter((k) => k !== OTHER_CAT);
      const first = openCat && cats.includes(openCat) ? openCat : cats[0];
      const groups = cats.map((cat) => {
        const list = skillsIn(cat), done = list.filter((s) => m[s.name]).length;
        return `<details class="group" data-cat="${esc(cat)}" ${cat === first ? 'open' : ''}><summary>${chev}<span class="g-name">${esc(cat)}</span><span class="g-meta" data-count>${done}/${list.length} rated</span></summary>
          <div class="g-body">${list.map((s) => row(s.name, m[s.name])).join('')}</div></details>`;
      }).join('');
      const others = skillsIn(OTHER_CAT).filter((s) => m[s.name]);
      return groups + `<details class="group" data-cat="${OTHER_CAT}" ${others.length || openCat === OTHER_CAT ? 'open' : ''}><summary>${chev}<span class="g-name">${OTHER_CAT}</span><span class="g-meta" data-count>${others.length ? others.length + ' rated' : 'Add anything not listed'}</span></summary>
        <div class="g-body" id="other-rows">${others.map((s) => row(s.name, m[s.name])).join('')}</div>
        <div class="add-other"><div class="add-other-title">${ic('plus')}Add a skill or tool that isn't listed</div>
          <div class="add-other-row"><label class="field grow"><span class="sr-only">Skill or tool name</span><input class="input" id="new-skill-name" placeholder="e.g. Podio, Canva Pro, Spanish speaking" list="all-skills" autocomplete="off"></label>
          <label class="field"><span class="sr-only">Category</span><select class="select" id="new-skill-cat">${[OTHER_CAT].concat(cats).map((k) => `<option>${esc(k)}</option>`).join('')}</select></label>
          <button type="button" class="btn" id="new-skill-add">Add</button></div>
          <datalist id="all-skills">${DB.skills.map((s) => `<option value="${esc(s.name)}">`).join('')}</datalist></div></details>`;
    };
    const firstPid = pid || (activePeople()[0] || {}).id;
    const added = [];
    modal({
      title: 'Rate skills', sub: 'Open a category and tap a level. Skills you leave alone keep their current score.', wide: true, submit: 'Save ratings',
      body: `<div class="row2"><label class="field"><span>VA</span><select class="select" name="pid" ${pid ? 'disabled' : ''}>${personOptions(firstPid)}</select></label>
        <label class="field"><span>Date</span><input class="input" type="date" name="date" value="${isoDay(new Date())}" max="${isoDay(new Date())}"></label></div>
        <div class="rate-tools"><label class="search-field" style="flex:1;width:auto">${ic('search')}<span class="sr-only">Find a skill</span><input class="input" id="rate-q" type="search" placeholder="Find a skill…" autocomplete="off"></label>
          <details class="scale-help"><summary>What do 1–10 mean?</summary><div class="scale-key">${SCALE.map((x) => `<span><b>${x.n}</b> ${x.label} — ${x.desc}</span>`).join('')}</div></details></div>
        <div class="rate-list" id="rate-list">${renderList(firstPid)}</div>
        <label class="field"><span>Note <span class="muted" style="font-weight:400">(optional)</span></span><textarea class="textarea" name="note" placeholder="Anything worth remembering about this rating?"></textarea></label>`,
      onMount(d, form) {
        const sel = form.elements.pid;
        const list = $('#rate-list', d);
        const updateCount = (g) => {
          if (!g) return;
          const total = $$('.rate-row', g).length, done = $$('.rate-row', g).filter((r) => r.querySelector('input:checked')).length;
          const el = g.querySelector('[data-count]');
          if (el) el.textContent = g.dataset.cat === OTHER_CAT ? (done ? done + ' rated' : 'Add anything not listed') : `${done}/${total} rated`;
        };
        const wireAdd = () => {
          const addBtn = $('#new-skill-add', d), nameIn = $('#new-skill-name', d), catSel = $('#new-skill-cat', d);
          const add = () => {
            const name = nameIn.value.trim().replace(/\s+/g, ' ');
            if (!name) { nameIn.focus(); return; }
            const existing = DB.skills.find((s) => s.name.toLowerCase() === name.toLowerCase()) || added.find((s) => s.name.toLowerCase() === name.toLowerCase());
            const existingRow = existing && list.querySelector(`.rate-row[data-name="${CSS.escape(existing.name.toLowerCase())}"]`);
            if (existingRow) {
              const g = existingRow.closest('details'); g.open = true;
              existingRow.scrollIntoView({ block: 'center', behavior: 'smooth' }); existingRow.classList.add('flash'); setTimeout(() => existingRow.classList.remove('flash'), 1600);
              toast(`"${existing.name}" is already in ${existing.category}`); nameIn.value = ''; return;
            }
            const rec = existing ? { name: existing.name, category: existing.category, active: 'Y', reactivate: true } : { name, category: catSel.value, active: 'Y' };
            added.push(rec);
            const target = rec.category === OTHER_CAT ? $('#other-rows', d) : list.querySelector(`details[data-cat="${CSS.escape(rec.category)}"] .g-body`);
            target.insertAdjacentHTML('beforeend', row(rec.name, null, true));
            const g = target.closest('details'); g.open = true; updateCount(g);
            target.lastElementChild.scrollIntoView({ block: 'center', behavior: 'smooth' });
            nameIn.value = '';
          };
          addBtn.addEventListener('click', add);
          nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
        };
        wireAdd();
        sel.addEventListener('change', () => { added.length = 0; list.innerHTML = renderList(sel.value); wireAdd(); });
        $('#rate-q', d).addEventListener('input', (e) => {
          const q = e.target.value.trim().toLowerCase();
          $$('details.group', list).forEach((g) => {
            let any = false;
            $$('.rate-row', g).forEach((r) => { const hit = !q || r.dataset.name.includes(q); r.hidden = !hit; any = any || hit; });
            g.hidden = !!q && !any && g.dataset.cat !== OTHER_CAT;
            if (q && any) g.open = true;
          });
        });
        form.addEventListener('change', (e) => {
          if (e.target.type !== 'radio' || !e.target.closest('.scale')) return;
          const x = SCALE[Number(e.target.value) - 1];
          e.target.closest('.rate-row').querySelector('[data-hint]').innerHTML = `<b style="color:var(--ink)">${x.n} · ${x.label}</b> — ${x.desc}`;
          updateCount(e.target.closest('details'));
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
        const ratedNames = new Set(rows.map((r) => r.skill));
        const newSkills = added.filter((s) => ratedNames.has(s.name));
        if (newSkills.length) {
          const next = DB.skills.filter((s) => !newSkills.some((n) => n.reactivate && n.name === s.name)).concat(newSkills.map(({ name, category }) => ({ name, category, active: 'Y' })));
          save('saveSkills', { skills: newSkills.map(({ name, category }) => ({ name, category, active: 'Y' })) }, () => { DB.skills = next; });
        }
        save('saveRatings', { rows, note: note ? { id: 'n' + uid(), personId: id, ts, type: 'Note', text: 'Rating note: ' + note, manager: ME } : null }, () => {
          DB.ratings.push(...rows);
          if (note) DB.notes.push({ id: 'n' + uid(), personId: id, ts, type: 'Note', text: 'Rating note: ' + note, manager: ME });
        }, `Saved ${rows.length} rating${rows.length === 1 ? '' : 's'} for ${p ? p.name : 'VA'}${newSkills.length ? ` · added ${newSkills.length} new skill${newSkills.length === 1 ? '' : 's'}` : ''}`);
      },
    });
  }

  function trainingDialog(opts) {
    const c = derive();
    const t = opts.id ? DB.training.find((x) => x.id === opts.id) : null;
    const traineeId = t ? t.traineeId : opts.traineeId || '';
    const trainerPre = t ? t.trainerId : opts.trainerId || '';
    const defaultSkills = (id) => weakSkills(id).filter((s) => s.v <= FOCUS).slice(0, 2).map((s) => s.name);
    const chosen = t ? t.skills : traineeId ? defaultSkills(traineeId) : [];
    const skillChips = (sel, id) => { const m = c.latest[id] || {}; return categories().map((cat) => { const list = skillsIn(cat); const n = list.filter((s) => sel.includes(s.name)).length; return `<details class="group compact" data-cat="${esc(cat)}" ${n ? 'open' : ''}><summary>${chev}<span class="g-name">${esc(cat)}</span><span class="g-meta" data-count>${n ? n + ' selected' : ''}</span></summary><div class="check-chips g-body">${list.map((s) => `<label data-name="${esc(s.name.toLowerCase())}"><input type="checkbox" name="skills" value="${esc(s.name)}" ${sel.includes(s.name) ? 'checked' : ''}><span>${esc(s.name)}${m[s.name] ? ` <b style="opacity:.6">${m[s.name]}</b>` : ''}</span></label>`).join('')}</div></details>`; }).join(''); };
    const suggestHtml = (tid, skills, current) => {
      const list = suggestTrainers(tid, skills);
      if (!tid || !skills.length) return '<div class="muted">Choose a trainee and at least one focus skill to see suggested trainers.</div>';
      if (!list.length) return `<div class="muted">No one averages ${TRAINER_AVG}+ (with no skill under ${TRAINER_MIN}) on these skills yet — pick a trainer below.</div>`;
      return list.map((x, i) => `<label><input type="radio" name="suggested" value="${esc(x.p.id)}" ${current === x.p.id || (!current && i === 0) ? 'checked' : ''}>${avatar(x.p)}<div class="grow"><div style="font-weight:600">${esc(x.p.name)} ${i === 0 ? '<span class="best">· Best match</span>' : ''}</div><div class="why">${esc(x.p.role)} · level ${one(x.lv)} in ${skills.length === 1 ? esc(skills[0]) : 'these skills'} · training ${x.load} VA${x.load === 1 ? '' : 's'} now</div></div>${badge(x.lv, true)}</label>`).join('');
    };
    modal({
      title: t ? 'Training' : 'New training', sub: t ? `Started ${fmt(t.start)}` : 'Choose a trainee, what they need to learn, and who will train them.', wide: true, submit: t ? 'Save changes' : 'Assign trainer',
      danger: t ? { label: 'Delete', confirm: 'Delete this training?', run: () => save('deleteTraining', { id: t.id }, () => { DB.training = DB.training.filter((x) => x.id !== t.id); }, 'Training deleted') } : null,
      body: `<label class="field"><span>Trainee</span><select class="select" name="traineeId" required><option value="">Select a VA…</option>${personOptions(traineeId)}</select></label>
        <div class="field"><span>Focus skills</span><small>Their lowest-rated skills are pre-selected. The number shows their current level.</small>
          <label class="search-field" style="width:100%">${ic('search')}<span class="sr-only">Find a skill</span><input class="input" id="tr-q" type="search" placeholder="Find a skill…" autocomplete="off"></label>
          <div class="skill-picker" id="tr-skills">${skillChips(chosen, traineeId)}</div></div>
        <div class="field"><span>Suggested trainers</span><div class="suggest" id="tr-suggest">${suggestHtml(traineeId, chosen, trainerPre)}</div></div>
        <label class="field"><span>Or choose any trainer</span><select class="select" name="trainerOther"><option value="">— Use the suggestion above —</option>${personOptions(trainerPre, traineeId)}</select></label>
        <div class="row3"><label class="field"><span>Target level</span><select class="select" name="target">${TARGETS.map((n) => `<option value="${n}" ${(t ? t.target : DEFAULT_TARGET) === n ? 'selected' : ''}>${n} · ${SCALE[n - 1].label}</option>`).join('')}</select></label>
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
        $('#tr-skills', d).addEventListener('change', (e) => { const g = e.target.closest('details'); if (g) { const n = $$('input:checked', g).length; g.querySelector('[data-count]').textContent = n ? n + ' selected' : ''; } refresh(); });
        $('#tr-q', d).addEventListener('input', (e) => {
          const q = e.target.value.trim().toLowerCase();
          $$('#tr-skills details', d).forEach((g) => { let any = false; $$('label', g).forEach((l) => { const hit = !q || l.dataset.name.includes(q); l.hidden = !hit; any = any || hit; }); g.hidden = !!q && !any; if (q && any) g.open = true; });
        });
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
        <div class="row2"><label class="field"><span>Role</span><select class="select" name="role">${(p && !ROLES.includes(p.role) ? [p.role].concat(ROLES) : ROLES).map((r) => `<option ${(p ? p.role : DEFAULT_ROLE) === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
          <label class="field"><span>Client / account</span><input class="input" name="account" value="${esc(p ? p.account : '')}"></label></div>
        <div class="row2"><label class="field"><span>Start date</span><input class="input" type="date" name="start" value="${esc(p ? p.start : isoDay(new Date()))}"></label>
          <label class="field"><span>Status</span><select class="select" name="active"><option value="Y" ${!p || p.active !== 'N' ? 'selected' : ''}>Active</option><option value="N" ${p && p.active === 'N' ? 'selected' : ''}>Inactive</option></select></label></div>
        ${(() => { const aes = activePeople().filter((x) => /AE/.test(x.role || '') && (!p || x.id !== p.id)); return `<label class="field"><span>AE <span class="muted" style="font-weight:400">(groups their clients on the Clients page)</span></span><select class="select" name="ae"><option value="">None</option>${aes.map((a) => `<option value="${esc(a.id)}" ${p && p.ae === a.id ? 'selected' : ''}>${esc(a.name)} · ${esc(a.role)}</option>`).join('')}</select></label>`; })()}
        <label class="field"><span>Gmail <span class="muted" style="font-weight:400">(optional)</span></span><input class="input" type="email" name="email" value="${esc(p ? p.email || '' : '')}" placeholder="name@gmail.com" autocomplete="off"><small>Lets this VA sign in to see their own training and quizzes. They never see ratings, notes or other VAs. Leave empty to keep them out.</small></label>`,
      onSubmit(f) {
        const name = String(f.get('name')).trim().replace(/\s+/g, ' ');
        if (DB.people.some((x) => x.name.toLowerCase() === name.toLowerCase() && (!p || x.id !== p.id))) { toast(name + ' is already on the team', true); return false; }
        const email = String(f.get('email') || '').trim().toLowerCase();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Enter a valid Gmail address', true); return false; }
        if (email && DB.people.some((x) => x.email === email && (!p || x.id !== p.id))) { toast(email + ' is already used by another VA', true); return false; }
        const rec = Object.assign({}, p || { id: 'p' + uid() }, { name, role: f.get('role'), account: String(f.get('account')).trim(), start: f.get('start'), active: f.get('active'), email, ae: f.get('ae') || '' });
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
        save('saveSkills', { skills: [rec] }, () => { DB.skills = next; }, k ? 'Skill saved' : 'Skill added');
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
    const pages = [['Home', '#/'], ['Team', '#/team'], ['Training', '#/training'], ['Trainers', '#/training/trainers'], ['Skill matrix', '#/matrix'], ['Team notes', '#/notes'], ['Guidebooks', '#/guides'], ['Clients', '#/clients'], ['Forms', '#/forms'], ['Users', '#/users'], ['Settings', '#/settings']];
    const actions = [['Rate a VA', () => rateDialog()], ['New training', () => trainingDialog({})], ['Add VA', () => personDialog()], ['Post a team note', () => newTeamNote()]];
    let items = [], sel = 0;
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      const ppl = DB.people.filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.account).toLowerCase().includes(q)).slice(0, 7);
      const pg = pages.filter(([l]) => !q || l.toLowerCase().includes(q));
      const ac = actions.filter(([l]) => !q || l.toLowerCase().includes(q));
      items = [];
      let html = '';
      if (ppl.length) { html += '<li class="palette-group" role="presentation">VAs</li>'; ppl.forEach((p) => { items.push(() => { location.hash = '#/va/' + p.id; }); html += `<li role="option" data-i="${items.length - 1}">${avatar(p, 'sm')}<span>${esc(p.name)}</span><span class="k">${esc(p.role)}${p.account ? ' · ' + esc(p.account) : ''}</span></li>`; }); }
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
      if (!DB.settings.managers.includes(n)) { const next = Object.assign({}, DB.settings, { managers: DB.settings.managers.concat(n) }); DB.settings = next; api('addManager', { name: n }).catch(() => {}); }
      render.keepScroll = false; render();
    };
    $$('#who [data-name]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.name)));
    $('#who').addEventListener('submit', (e) => { e.preventDefault(); const n = String(new FormData(e.target).get('name') || '').trim(); if (n) pick(n); });
  }

  function renderLogin(err, denied) {
    $('#app').innerHTML = `<div class="login"><div class="login-art"><a class="brand" style="padding:0">${MARK}<div><div class="brand-name">${esc(CFG.TEAM_NAME || 'Team Troy')}</div><div class="brand-sub">Training Portal</div></div></a>
      <div><h2>Grow every VA on the team.</h2><p>Rate skills, pair VAs with the right trainer and keep track of how everyone is doing.</p></div><div style="color:#8E99B3;font-size:12px">Managers only</div></div>
      <div class="login-form"><div class="login-box" id="login"><div><h1>Sign in</h1><p class="muted" style="margin:6px 0 0">Use the Gmail account your manager added for you.</p></div>
        ${err ? `<div class="err ${denied ? 'err-box' : ''}" role="alert">${esc(err)}</div>` : ''}
        <button type="button" class="gsi-btn" id="gsi-btn">${GLOGO}<span>Sign in with Google</span></button>
        <div id="login-status" class="muted" style="font-size:12.5px;min-height:18px"></div></div></div></div>`;
    $('#gsi-btn').addEventListener('click', startSignIn);
  }
  const GLOGO = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.7l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

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
      case 'rate': return rateDialog(id, el.dataset.cat);
      case 'mx-cat': e.preventDefault(); ui.matrixCat = id; render.keepScroll = false; if (location.hash !== '#/matrix') location.hash = '#/matrix'; else render(); return;
      case 'assign': return trainingDialog({ traineeId: id });
      case 'assign-as-trainer': return trainingDialog({ trainerId: id });
      case 'new-training': return trainingDialog({});
      case 'open-training': return trainingDialog({ id });
      case 'note': return noteDialog(id);
      case 'del-note': if (confirm('Delete this note?')) save('deleteNote', { id }, () => { DB.notes = DB.notes.filter((n) => n.id !== id); }, 'Note deleted'); return;
      case 'edit-person': return personDialog(id);
      case 'remove-person': { const p = person(id); if (p && confirm(`Remove ${p.name} from the team?\n\nThis deletes their ratings, notes and trainings for good. To keep their history, edit them and set Status to Inactive instead.`)) removePerson(id); return; }
      case 'add-person': return personDialog();
      case 'del-rating': return deleteSkillRating(id, el.dataset.skill);
      case 'del-session': return deleteSession(id, el.dataset.day, el.dataset.manager);
      case 'tnote-new': return newTeamNote();
      case 'cl-add': case 'cl-kpi': case 'cl-view': case 'cl-clear': case 'cl-close': case 'cl-dc': case 'cl-restore': case 'cl-del': return clAction(el.dataset.act, id);
      case 'b-addq': case 'b-delq': case 'b-up': case 'b-down': case 'b-states': case 'b-addsec': case 'b-delsec': case 'b-template': case 'b-save': return builderAction(el.dataset.act, el);
      case 'f-launch': return launchDialog(id);
      case 'f-remind': return (async () => { try { toast('Sending reminders…', false, 'clock'); inflight++; let j; try { j = await api('remindForm', { id }); } finally { inflight--; } const r = j.result || {}; toast(`Reminded ${r.sent} VA${r.sent === 1 ? '' : 's'}${r.failed && r.failed.length ? ' · ' + r.failed.length + ' failed' : ''}`, !!(r.failed && r.failed.length)); } catch (e2) { toast(e2.message, true); } })();
      case 'f-status': { const st = el.dataset.s; const f = DB.forms.find((x) => x.id === id); if (st === 'closed' && !confirm('Close this form? VAs will no longer be able to submit or change answers. You can reopen it later.')) return; return save('setFormStatus', { id, status: st }, () => { f.status = st; }, st === 'closed' ? 'Form closed' : 'Form reopened'); }
      case 'f-view': return viewResponse(id);
      case 'f-csv': { const f = DB.forms.find((x) => x.id === id); return downloadCsv(f, formStats(f).resp); }
      case 'f-more': return formMore(id);
      case 'f-add-item': return repeatItem(el, true);
      case 'f-del-item': return repeatItem(el, false);
      case 'attn-filter': ui.attnFilter = id; $$('.hd-tabs [data-act=attn-filter]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === id))); $('#attn-list').innerHTML = attnList(derive()); return;
      case 'gap-all': ui.gapAll = !ui.gapAll; $('#gap-rows').innerHTML = gapRows(derive()); return;
      case 'doc-read': return withDoc(id, el, readDoc);
      case 'doc-download': return withDoc(id, el, downloadDoc);
      case 'doc-upload': return docDialog();
      case 'doc-edit': return docDialog(id);
      case 'tnote-edit': return teamNoteDialog(id);
      case 'tnote-pin': { const n = DB.teamNotes.find((x) => x.id === id); if (!n) return; const rec = Object.assign({}, n, { pinned: !n.pinned }); return save('saveTeamNote', { teamNote: rec }, () => { DB.teamNotes = DB.teamNotes.map((x) => (x.id === id ? rec : x)); }, rec.pinned ? 'Pinned for everyone' : 'Unpinned'); }
      case 'tnote-del': if (confirm('Delete this team note for all managers?')) save('deleteTeamNote', { id }, () => { DB.teamNotes = DB.teamNotes.filter((n) => n.id !== id); }, 'Note deleted'); return;
      case 'add-skill': return skillDialog();
      case 'edit-skill': return skillDialog(Number(id));
      case 'team-filter': ui.teamFilter = id; return render();
      case 'go': location.hash = id; return;
      case 'palette': return palette();
      case 'scheme': setScheme(id); return render();
      case 'switch-manager': ME = ''; store.del('tt-manager'); return render();
      case 'sign-out': if (confirm('Sign out of the portal?')) signOut('You signed out.'); return;
      case 'edit-manager': return managerDialog(Number(id));
      case 'del-manager': {
        const m = DB.managerList[Number(id)]; if (!m) return;
        if (!confirm(`Remove ${m.name}${m.email ? ' (' + m.email + ')' : ''} as a manager?\n\nThey won't be able to open the portal any more.`)) return;
        const list = DB.managerList.filter((x) => x !== m);
        return save('removeManager', { email: m.email, name: m.name }, () => { DB.managerList = list; DB.settings.managers = list.map((x) => x.name); }, m.name + ' removed');
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (DB && ME && !DB.va && !$('dialog[open]')) palette(); }
    if (e.key === 'Enter' && e.target.matches('.tcard')) e.target.click();
  });
  document.addEventListener('toggle', (e) => { const g = e.target; if (g.matches && g.matches('#page details.group[data-cat]')) ui.openCats[g.dataset.cat] = g.open; }, true);
  window.addEventListener('storage', (e) => { if (e.key === 'tt-color-scheme') $('meta[name="color-scheme"]').content = e.newValue || 'light dark'; });

  /* ------------------------------------------------------------------ deleting ratings
     Every rating is a row in the sheet. Deleting a skill's rating removes all of that VA's rows for the
     skill, so it shows 0 (not rated) instead of falling back to an older score. Deleting a session removes
     that day's rows by that manager. */
  function deleteRatings(rows, msg) {
    const keys = rows.map((r) => ({ ts: r.ts, personId: r.personId, skill: r.skill }));
    save('deleteRatings', { keys }, () => { const gone = new Set(rows); DB.ratings = DB.ratings.filter((r) => !gone.has(r)); }, msg);
  }
  function deleteSkillRating(pid, skill) {
    const p = person(pid);
    const list = DB.ratings.filter((r) => r.personId === pid && r.skill === skill).sort((a, b) => (a.ts < b.ts ? -1 : 1));
    if (!p || !list.length) return;
    const last = list[list.length - 1], older = list.length - 1;
    const msg = `Delete ${p.name}'s rating for "${skill}"?\n\nCurrent score ${last.score}/${MAX}, rated by ${last.manager || 'a manager'} on ${fmt(last.ts)}.` +
      (older ? `\nThis also removes ${older} earlier rating${older === 1 ? '' : 's'} for this skill.` : '') +
      `\n\nThe skill goes back to 0 (not rated) and is left out of averages. This cannot be undone.`;
    if (confirm(msg)) deleteRatings(list, `${skill} reset to 0 for ${p.name}`);
  }
  function deleteSession(pid, day, manager) {
    const p = person(pid);
    const rows = DB.ratings.filter((r) => r.personId === pid && isoDay(r.ts) === day && r.manager === manager);
    if (!p || !rows.length) return;
    if (confirm(`Delete the whole rating session for ${p.name}?\n\n${rows.length} skill rating${rows.length === 1 ? '' : 's'} by ${manager || 'a manager'} on ${fmt(rows[0].ts)}.\n\nThis cannot be undone.`)) deleteRatings(rows, `Deleted ${rows.length} rating${rows.length === 1 ? '' : 's'} for ${p.name}`);
  }

  function saveManagerRec(i, rec) {
    const old = i >= 0 ? DB.managerList[i] : null;
    const list = DB.managerList.slice();
    if (old) list[i] = Object.assign({}, old, rec); else list.push(Object.assign({ owner: false }, rec));
    save('saveManager', { name: rec.name, email: rec.email, oldEmail: old ? old.email : '' }, () => { DB.managerList = list; DB.settings.managers = list.map((x) => x.name); },
      old ? `${rec.name} updated` : `${rec.name} can now sign in with ${rec.email}`);
  }
  function managerDialog(i) {
    const m = DB.managerList[i]; if (!m) return;
    modal({
      title: m.email ? 'Edit manager' : 'Add Google email', submit: 'Save',
      body: `<label class="field"><span>Name</span><input class="input" name="name" required value="${esc(m.name)}"><small>Shown on ratings and notes they make.</small></label>
        <label class="field"><span>Google email</span><input class="input" type="email" name="email" required value="${esc(m.email || '')}" placeholder="name@gmail.com" ${m.owner ? 'readonly' : ''}><small>${m.owner ? "The owner's email can't be changed." : 'The Google account they sign in with.'}</small></label>`,
      onSubmit(f) {
        const name = String(f.get('name') || '').trim(), email = String(f.get('email') || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Enter a valid Google email', true); return false; }
        if (DB.managerList.some((x, j) => j !== i && x.email === email)) { toast(email + ' is already a manager', true); return false; }
        saveManagerRec(i, { name, email });
      },
    });
  }

  function newTeamNote() { ui.focusComposer = true; if (location.hash === '#/notes') render(); else { render.keepScroll = false; location.hash = '#/notes'; } }

  /* ------------------------------------------------------------------ boot */
  async function boot() {
    $('#app').innerHTML = '<div class="loading"><div><div class="spinner"></div>Loading Team Troy…</div></div>';
    if (DEMO) { await load(); if (PREVIEW && !ME) ME = DB.settings.managers[0]; return render(); }
    if (!TOKEN) return renderLogin();
    try { await load(); render(); } catch (err) { if (err.code !== 'denied' && err.code !== 'signin') renderLogin(err.message); }
  }
  boot();
})();
