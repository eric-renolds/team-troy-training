/**
 * Team Troy Training Portal v2 — server
 * ------------------------------------
 * One Google web app, two ways in:
 *   • Admins open the app URL and are recognised by their Google account
 *     (listed under ADMINS in the Settings tab). No password.
 *   • VAs open their personal link (…/exec?t=TOKEN) to rate themselves.
 * All data lives in this spreadsheet: People, Skills, Assessments, Training,
 * Check-ins, Settings. Assessments are append-only, so history is never lost.
 *
 * Run setupV2() once after pasting. It is safe to run again.
 */

const V2 = {
  PEOPLE: 'People', SKILLS: 'Skills', ASSESS: 'Assessments', TRAIN: 'Training',
  CHECK: 'Check-ins', SETTINGS: 'Settings',
};
const V2_HEADERS = {
  People: ['ID', 'Name', 'Email', 'Role', 'Active', 'Token', 'Added', 'Sample'],
  Skills: ['Skill Name', 'Category', 'Source (Standard/Custom)', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Active'],
  Assessments: ['Timestamp', 'Person ID', 'Person', 'Skill', 'Score', 'Rater Type', 'Rater', 'Cycle', 'Note', 'Sample'],
  Training: ['ID', 'Person ID', 'Trainer', 'Trainer Type', 'Trainer Person ID', 'Skills', 'Target Level', 'Start', 'Due', 'Status', 'Created', 'Updated', 'Sample'],
  'Check-ins': ['ID', 'Training ID', 'Date', 'Author', 'Note', 'Sample'],
  Settings: ['Key', 'Value', 'Notes'],
};
const TRAINING_STATUSES = ['Planned', 'In training', 'Ready to re-assess', 'Done'];
const DEFAULT_ASSET_BASE = 'https://eric-renolds.github.io/team-troy-training/v2';
const DEFAULT_VA_LINK_BASE = 'https://script.google.com/macros/s/AKfycbwuhc9stk08BbFuZn9IUe1D1Ky8v4S6dra7Ue1QVhBSUu2JtXnxfAd_XV4CDufAMG0/exec';

const LEVEL_NAMES = ['Beginner', 'Basic', 'Competent', 'Strong', 'Expert'];
const GENERIC_RUBRIC = [
  'Little or no experience yet', 'Can do simple tasks with help', 'Does it independently and reliably',
  'Handles complex work confidently', 'Expert — could train others',
];
const RUBRIC = {
  'Email Management': ['Needs guidance to sort and reply to emails', 'Handles routine replies; inbox sometimes backs up', 'Keeps inbox organised with labels; replies on time', 'Runs several inboxes with templates and filters; prioritises well', 'Designs inbox systems and trains others on them'],
  'Calendar & Scheduling': ['Can read a calendar; needs help booking', 'Books simple meetings; occasional conflicts', 'Schedules across time zones without errors', 'Juggles complex calendars and reschedules proactively', 'Owns executive calendars end to end; could train others'],
  'Data Entry & Accuracy': ['Slow, with frequent errors', 'Steady speed; some errors caught in review', 'Accurate and on time with standard data', 'Fast, near error-free, checks own work', 'Builds checks and templates that prevent errors for others'],
  'Microsoft Excel': ['Enters data and does basic formatting', 'Sorts, filters, simple SUM/AVERAGE', 'Uses XLOOKUP/VLOOKUP, IF and pivot tables without help', 'Builds multi-sheet reports, charts and conditional logic', 'Advanced formulas and automation; could teach Excel'],
  'Google Workspace': ['Opens and edits Docs and Sheets', 'Shares files, comments, basic Sheets formulas', 'Organises Drive, uses Forms and Sheets lookups', 'Builds shared templates, filters and data validation', 'Automates workflows and sets team standards'],
  'CRM Tools': ['Can look up a contact', 'Updates records and notes with guidance', 'Manages pipelines, tasks and follow-ups independently', 'Builds views and reports; keeps data clean', 'Configures workflows and automations; trains others'],
  'Project Management Tools': ['Can view tasks assigned to them', 'Updates task status and comments', 'Creates and organises tasks, due dates and boards', 'Runs projects with dependencies and templates', 'Designs team boards and processes'],
  'Written Communication': ['Messages often need rewriting', 'Clear for simple messages; some errors', 'Clear, professional, error-free emails', 'Adapts tone for clients; writes SOPs and summaries', 'Polished writer who edits others’ work'],
  'Verbal Communication': ['Hesitant on calls; needs a script', 'Handles simple calls with notes', 'Confident and clear on client calls', 'Handles difficult conversations calmly', 'Leads meetings and coaches others on calls'],
  'Customer Service': ['Needs help answering questions', 'Resolves common requests with guidance', 'Resolves most issues independently and politely', 'Handles escalations and turns complaints around', 'Sets service standards and trains others'],
  'Internet Research': ['Basic searches; results are hit-or-miss', 'Finds information with some guidance', 'Finds reliable sources quickly and summarises well', 'Deep research with compared sources and structured output', 'Expert researcher who builds research templates'],
  'Problem Solving': ['Waits for instructions when stuck', 'Solves familiar problems; escalates the rest', 'Works through new problems independently', 'Spots root causes and proposes improvements', 'Solves the complex issues others bring to them'],
  'Time Management': ['Often misses deadlines', 'Meets deadlines with reminders', 'Plans own day and meets deadlines reliably', 'Prioritises across clients and flags risks early', 'Highly organised; helps others plan'],
  'Attention to Detail': ['Frequent small mistakes', 'Catches errors when reviewing', 'Work is usually right the first time', 'Consistently error-free; spots others’ errors', 'Builds checklists and QA for the team'],
  'Social Media Management': ['Can post content when it is provided', 'Schedules posts with a tool', 'Plans a content calendar and writes captions', 'Tracks engagement and adjusts the plan', 'Runs accounts end to end; trains others'],
  'Canva / Basic Design': ['Edits text on templates', 'Creates simple graphics from templates', 'Designs on-brand graphics from scratch', 'Builds brand kits and templates; strong layouts', 'Design lead who reviews others’ work'],
  'Basic Bookkeeping': ['Understands invoices and receipts', 'Records transactions with guidance', 'Reconciles accounts and categorises accurately', 'Prepares reports; confident in QuickBooks/Xero', 'Manages books end to end; trains others'],
};

/* ============================ ENTRY POINTS ============================ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.t) return page_('va', { token: String(p.t) }, 'Skills self-assessment');
  const email = currentEmail_();
  if (!isAdmin_(email)) return denied_(email);
  return page_('admin', { email: email }, getSetting_('TEAM_NAME', 'Team Troy') + ' · Training Portal');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Training Portal')
    .addItem('Set up / repair tabs', 'setupV2')
    .addItem('Remove sample data', 'removeSampleDataFromMenu')
    .addToUi();
}

function page_(kind, boot, title) {
  const base = getSetting_('ASSET_BASE', DEFAULT_ASSET_BASE).replace(/\/$/, '');
  const v = encodeURIComponent(getSetting_('ASSET_VERSION', '1'));
  const bootJson = JSON.stringify(Object.assign({ team: getSetting_('TEAM_NAME', 'Team Troy') }, boot)).replace(/</g, '\\u003c');
  const html = '<!doctype html><html lang="en"><head><base target="_top"><meta charset="utf-8">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">' +
    '<link rel="stylesheet" href="' + base + '/app.css?v=' + v + '"></head>' +
    '<body class="' + kind + '"><div id="root"><div class="boot"><div class="spinner"></div></div></div>' +
    '<script>window.BOOT=' + bootJson + ';</script>' +
    '<script src="' + base + '/' + kind + '.js?v=' + v + '"></script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function denied_(email) {
  const msg = email
    ? 'You are signed in as <b>' + esc_(email) + '</b>, which is not on the admin list. Ask an existing admin to add you in Settings.'
    : 'Please sign in with your Google account to open the Training Portal. If you are a VA, use the personal link you were sent.';
  return HtmlService.createHtmlOutput(
    '<div style="font-family:system-ui,sans-serif;max-width:440px;margin:80px auto;padding:24px;text-align:center;color:#1d1d1b">' +
    '<h2 style="margin:0 0 8px">Access restricted</h2><p style="color:#5f5e5a;line-height:1.5">' + msg + '</p></div>')
    .setTitle('Training Portal').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

const esc_ = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ============================ AUTH ============================ */

function currentEmail_() {
  try { return String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) { return ''; }
}
function admins_() {
  return getSetting_('ADMINS', '').split(/[,\s;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
}
function isAdmin_(email) { return !!email && admins_().indexOf(email) >= 0; }
/** For editor/menu-only functions: blocks anonymous calls through the public web app. */
function requireOwnerOrAdmin_() {
  const email = currentEmail_();
  const owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!email || (email !== owner && !isAdmin_(email))) throw new Error('Not authorised.');
  return email;
}
function requireAdmin_() {
  const email = currentEmail_();
  if (!isAdmin_(email)) throw new Error('Not authorised. Sign in with an admin Google account.');
  return email;
}

/* ============================ TABLE HELPERS ============================ */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

/** Returns the sheet, creating it and any missing header columns. */
function table_(name) {
  const headers = V2_HEADERS[name];
  let sh = ss_().getSheetByName(name);
  if (!sh) sh = ss_().insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else {
    const have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);
    const missing = headers.filter(h => have.indexOf(h) < 0);
    if (missing.length) sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  }
  return sh;
}

function read_(name) {
  const sh = table_(name);
  const last = sh.getLastRow(), cols = sh.getLastColumn();
  if (last < 2) return [];
  const values = sh.getRange(1, 1, last, cols).getValues();
  const head = values[0].map(String);
  return values.slice(1).map((r, i) => {
    const o = { _row: i + 2 };
    head.forEach((h, j) => (o[h] = r[j]));
    return o;
  });
}

function append_(name, objs) {
  if (!objs.length) return;
  const sh = table_(name);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const rows = objs.map(o => head.map(h => (o[h] === undefined ? '' : o[h])));
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
}

function update_(name, row, patch) {
  const sh = table_(name);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  Object.keys(patch).forEach(k => {
    const c = head.indexOf(k);
    if (c >= 0) sh.getRange(row, c + 1).setValue(patch[k]);
  });
}

function deleteWhere_(name, pred) {
  const sh = table_(name);
  const rows = read_(name).filter(pred).map(o => o._row).sort((a, b) => b - a);
  rows.forEach(r => sh.deleteRow(r));
  return rows.length;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); SpreadsheetApp.flush(); }
}

function getSetting_(key, fallback) {
  const sh = ss_().getSheetByName(V2.SETTINGS);
  if (!sh || sh.getLastRow() < 2) return fallback;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().find(r => String(r[0]) === key);
  return v && String(v[1]).trim() !== '' ? String(v[1]) : fallback;
}
function setSetting_(key, value, note) {
  const rows = read_(V2.SETTINGS);
  const hit = rows.find(r => String(r.Key) === key);
  if (hit) update_(V2.SETTINGS, hit._row, { Value: value });
  else append_(V2.SETTINGS, [{ Key: key, Value: value, Notes: note || '' }]);
}

const iso_ = v => (v instanceof Date ? v.toISOString() : v ? String(v) : '');
const id_ = () => Utilities.getUuid().replace(/-/g, '').slice(0, 10);
const token_ = () => Utilities.getUuid().replace(/-/g, '') .slice(0, 20);
const yes_ = v => String(v === undefined || v === '' ? 'Y' : v).trim().toUpperCase() !== 'N';
const nkey_ = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
function cycleOf_(d) {
  d = d instanceof Date ? d : new Date(d || Date.now());
  return d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1);
}
function toDate_(s) {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d) ? '' : d;
}

/* ============================ SETUP ============================ */

function setupV2() {
  requireOwnerOrAdmin_();
  return withLock_(() => {
    Object.keys(V2_HEADERS).forEach(table_);

    // Settings
    const owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
    const defaults = [
      ['ADMINS', owner, 'Google accounts allowed into the admin app, comma separated'],
      ['TEAM_NAME', 'Team Troy', 'Shown in the app header'],
      ['REASSESS_DAYS', '90', 'Days before a VA is due to re-rate themselves'],
      ['VA_LINK_BASE', DEFAULT_VA_LINK_BASE, 'Web app URL used for VA personal links (deployment that runs as the owner, access: Anyone)'],
      ['ASSET_BASE', DEFAULT_ASSET_BASE, 'Where the app design files are hosted'],
      ['ASSET_VERSION', '1', 'Bump to force browsers to load new design files'],
    ];
    const have = read_(V2.SETTINGS).map(r => String(r.Key));
    append_(V2.SETTINGS, defaults.filter(d => have.indexOf(d[0]) < 0).map(d => ({ Key: d[0], Value: d[1], Notes: d[2] })));

    // Skills: standard list + rubric text where empty
    const skills = read_(V2.SKILLS);
    if (!skills.length) {
      append_(V2.SKILLS, STANDARD_SKILLS.map(s => ({ 'Skill Name': s[0], Category: s[1], 'Source (Standard/Custom)': 'Standard' })));
    }
    read_(V2.SKILLS).forEach(s => {
      const r = RUBRIC[String(s['Skill Name']).trim()] || GENERIC_RUBRIC;
      const patch = {};
      for (let i = 1; i <= 5; i++) if (!String(s['Level ' + i] || '').trim()) patch['Level ' + i] = r[i - 1];
      if (String(s.Active || '').trim() === '') patch.Active = 'Y';
      if (Object.keys(patch).length) update_(V2.SKILLS, s._row, patch);
    });

    migrateLegacy_();
    if (!read_(V2.PEOPLE).length) seedSample_();

    ['VAs', 'Ratings', 'Pairings'].forEach(n => { const sh = ss_().getSheetByName(n); if (sh) try { sh.hideSheet(); } catch (e) {} });
    ss_().getSheets().filter(s => /^form responses/i.test(s.getName())).forEach(s => { try { s.hideSheet(); } catch (e) {} });
    return 'Setup complete';
  });
}

/** Brings real names / form answers from the first version into the new tabs (once). */
function migrateLegacy_() {
  if (getSetting_('MIGRATED_V1', '') === 'Y') return;
  const people = read_(V2.PEOPLE);
  const known = {};
  people.forEach(p => (known[nkey_(p.Name)] = p));
  const add = [];
  const ensure = name => {
    const k = nkey_(name);
    if (!k || /^va \d{2}$/.test(k) || known[k]) return known[k];
    const p = { ID: id_(), Name: String(name).trim().replace(/\s+/g, ' '), Email: '', Role: 'Virtual Assistant', Active: 'Y', Token: token_(), Added: new Date(), Sample: '' };
    known[k] = p; add.push(p); return p;
  };
  const vas = ss_().getSheetByName('VAs');
  if (vas && vas.getLastRow() > 1) vas.getRange(2, 1, vas.getLastRow() - 1, 1).getValues().forEach(r => ensure(r[0]));

  const skillNames = {};
  read_(V2.SKILLS).forEach(s => (skillNames[nkey_(s['Skill Name'])] = String(s['Skill Name'])));
  const rows = [];
  ss_().getSheets().filter(s => /^form responses/i.test(s.getName()) && s.getLastRow() > 1).forEach(sh => {
    const v = sh.getDataRange().getValues();
    const head = v[0].map(String);
    const nameCol = head.findIndex(h => /name/i.test(h)), tsCol = head.findIndex(h => /timestamp/i.test(h));
    v.slice(1).forEach(r => {
      const p = ensure(r[nameCol]);
      if (!p) return;
      const ts = r[tsCol] instanceof Date ? r[tsCol] : new Date();
      head.forEach((h, i) => {
        const m = h.match(/\[([^\]]+)\]\s*$/);
        const skill = skillNames[nkey_(m ? m[1] : h)];
        const n = String(r[i]).match(/[1-5]/);
        if (skill && n) rows.push({ Timestamp: ts, 'Person ID': p.ID, Person: p.Name, Skill: skill, Score: Number(n[0]), 'Rater Type': 'Self', Rater: p.Name, Cycle: cycleOf_(ts), Note: '' });
      });
    });
  });
  append_(V2.PEOPLE, add);
  append_(V2.ASSESS, rows);
  setSetting_('MIGRATED_V1', 'Y', 'Version 1 data has been imported');
}

function seedSample_() {
  const names = [['Sample · Ana Reyes', 'Senior VA'], ['Sample · Ben Cruz', 'Virtual Assistant'], ['Sample · Carla Diaz', 'Virtual Assistant'],
    ['Sample · Dan Lim', 'Virtual Assistant'], ['Sample · Ella Tan', 'Team Lead'], ['Sample · Faye Santos', 'Virtual Assistant']];
  const skills = read_(V2.SKILLS).filter(s => yes_(s.Active)).map(s => String(s['Skill Name']));
  const now = new Date();
  const people = names.map((n, i) => ({ ID: id_(), Name: n[0], Email: '', Role: n[1], Active: 'Y', Token: token_(), Added: new Date(now.getTime() - 200 * 864e5), Sample: 'Y' }));
  const rows = [];
  people.forEach((p, i) => {
    [[150, -1], [20, 0]].forEach(([daysAgo, shift], c) => {
      const ts = new Date(now.getTime() - (daysAgo + i) * 864e5);
      skills.forEach((s, j) => {
        const base = 1 + ((i * 5 + j * 3 + (i * j) % 3) % 5);
        const self = Math.max(1, Math.min(5, base + shift + (c === 1 && j % 4 === 0 ? 1 : 0)));
        rows.push({ Timestamp: ts, 'Person ID': p.ID, Person: p.Name, Skill: s, Score: self, 'Rater Type': 'Self', Rater: p.Name, Cycle: cycleOf_(ts), Note: '', Sample: 'Y' });
        if (i < 4) {
          const mgr = Math.max(1, Math.min(5, self - ((i + j) % 3 === 0 ? 1 : 0) + ((i + j) % 7 === 0 ? 1 : 0)));
          rows.push({ Timestamp: new Date(ts.getTime() + 2 * 864e5), 'Person ID': p.ID, Person: p.Name, Skill: s, Score: mgr, 'Rater Type': 'Manager', Rater: 'Sample manager', Cycle: cycleOf_(ts), Note: '', Sample: 'Y' });
        }
      });
    });
  });
  const due = d => new Date(now.getTime() + d * 864e5);
  const tr = [
    { ID: id_(), 'Person ID': people[1].ID, Trainer: people[0].Name, 'Trainer Type': 'VA', 'Trainer Person ID': people[0].ID, Skills: 'Microsoft Excel', 'Target Level': 4, Start: due(-20), Due: due(25), Status: 'In training', Created: due(-20), Updated: due(-3), Sample: 'Y' },
    { ID: id_(), 'Person ID': people[2].ID, Trainer: 'Sample external coach', 'Trainer Type': 'External', 'Trainer Person ID': '', Skills: 'Customer Service, Verbal Communication', 'Target Level': 4, Start: due(-40), Due: due(-5), Status: 'In training', Created: due(-40), Updated: due(-10), Sample: 'Y' },
    { ID: id_(), 'Person ID': people[3].ID, Trainer: people[4].Name, 'Trainer Type': 'VA', 'Trainer Person ID': people[4].ID, Skills: 'Time Management', 'Target Level': 3, Start: due(-60), Due: due(-2), Status: 'Ready to re-assess', Created: due(-60), Updated: due(-2), Sample: 'Y' },
    { ID: id_(), 'Person ID': people[5].ID, Trainer: people[0].Name, 'Trainer Type': 'VA', 'Trainer Person ID': people[0].ID, Skills: 'CRM Tools', 'Target Level': 3, Start: '', Due: due(45), Status: 'Planned', Created: due(-1), Updated: due(-1), Sample: 'Y' },
  ];
  const ck = [
    { ID: id_(), 'Training ID': tr[0].ID, Date: due(-3), Author: 'Sample manager', Note: 'Covered XLOOKUP and pivot tables. Practising on the weekly report next.', Sample: 'Y' },
    { ID: id_(), 'Training ID': tr[1].ID, Date: due(-10), Author: 'Sample manager', Note: 'Two role-play calls done; confidence improving.', Sample: 'Y' },
  ];
  append_(V2.PEOPLE, people);
  append_(V2.ASSESS, rows);
  append_(V2.TRAIN, tr);
  append_(V2.CHECK, ck);
}

function removeSampleData_() {
  [V2.CHECK, V2.TRAIN, V2.ASSESS, V2.PEOPLE].forEach(t => deleteWhere_(t, r => String(r.Sample).toUpperCase() === 'Y'));
}
function removeSampleDataFromMenu() { requireOwnerOrAdmin_(); withLock_(removeSampleData_); }

/* ============================ ADMIN API ============================ */

function bootstrap_() {
  const people = read_(V2.PEOPLE).filter(r => String(r.ID).trim()).map(r => ({
    id: String(r.ID), name: String(r.Name).trim(), email: String(r.Email || ''), role: String(r.Role || ''),
    active: yes_(r.Active), token: String(r.Token || ''), added: iso_(r.Added), sample: String(r.Sample).toUpperCase() === 'Y',
  }));
  const skills = read_(V2.SKILLS).filter(r => String(r['Skill Name']).trim()).map(r => ({
    name: String(r['Skill Name']).trim(), category: String(r.Category || 'Other').trim(), source: String(r['Source (Standard/Custom)'] || 'Standard'),
    levels: [1, 2, 3, 4, 5].map(i => String(r['Level ' + i] || GENERIC_RUBRIC[i - 1])), active: yes_(r.Active),
  }));
  const assessments = read_(V2.ASSESS).filter(r => String(r['Person ID']).trim() && Number(r.Score)).map(r => ({
    ts: iso_(r.Timestamp), personId: String(r['Person ID']), skill: String(r.Skill), score: Number(r.Score),
    type: String(r['Rater Type']) === 'Manager' ? 'Manager' : 'Self', rater: String(r.Rater || ''), cycle: String(r.Cycle || ''), note: String(r.Note || ''),
  })).sort((a, b) => a.ts.localeCompare(b.ts));
  const training = read_(V2.TRAIN).filter(r => String(r.ID).trim()).map(r => ({
    id: String(r.ID), personId: String(r['Person ID']), trainer: String(r.Trainer || ''), trainerType: String(r['Trainer Type']) === 'External' ? 'External' : 'VA',
    trainerPersonId: String(r['Trainer Person ID'] || ''), skills: String(r.Skills || '').split(',').map(s => s.trim()).filter(Boolean),
    targetLevel: Number(r['Target Level']) || null, start: iso_(r.Start), due: iso_(r.Due),
    status: TRAINING_STATUSES.indexOf(String(r.Status)) >= 0 ? String(r.Status) : 'Planned', created: iso_(r.Created), updated: iso_(r.Updated),
  }));
  const checkins = read_(V2.CHECK).filter(r => String(r.ID).trim()).map(r => ({
    id: String(r.ID), trainingId: String(r['Training ID']), date: iso_(r.Date), author: String(r.Author || ''), note: String(r.Note || ''),
  })).sort((a, b) => b.date.localeCompare(a.date));
  return {
    me: currentEmail_(), admins: admins_(), team: getSetting_('TEAM_NAME', 'Team Troy'),
    reassessDays: Number(getSetting_('REASSESS_DAYS', '90')) || 90, vaLinkBase: getSetting_('VA_LINK_BASE', DEFAULT_VA_LINK_BASE),
    cycle: cycleOf_(new Date()), now: new Date().toISOString(), statuses: TRAINING_STATUSES, levelNames: LEVEL_NAMES,
    people, skills, assessments, training, checkins, hasSample: people.some(p => p.sample),
  };
}

function apiBootstrap() { requireAdmin_(); return bootstrap_(); }

function apiSavePerson(p) {
  requireAdmin_();
  return withLock_(() => {
    const name = String(p && p.name || '').trim().replace(/\s+/g, ' ');
    if (!name) throw new Error('Name is required.');
    const rows = read_(V2.PEOPLE);
    if (rows.some(r => nkey_(r.Name) === nkey_(name) && String(r.ID) !== String(p.id || ''))) throw new Error('Someone called "' + name + '" already exists.');
    const hit = p.id && rows.find(r => String(r.ID) === String(p.id));
    if (hit) {
      update_(V2.PEOPLE, hit._row, { Name: name, Email: String(p.email || '').trim(), Role: String(p.role || '').trim() });
      if (nkey_(hit.Name) !== nkey_(name)) read_(V2.ASSESS).filter(a => String(a['Person ID']) === String(p.id)).forEach(a => update_(V2.ASSESS, a._row, { Person: name }));
    } else {
      append_(V2.PEOPLE, [{ ID: id_(), Name: name, Email: String(p.email || '').trim(), Role: String(p.role || 'Virtual Assistant').trim(), Active: 'Y', Token: token_(), Added: new Date(), Sample: '' }]);
    }
    return bootstrap_();
  });
}

function apiSetPersonActive(id, active) {
  requireAdmin_();
  return withLock_(() => {
    const hit = read_(V2.PEOPLE).find(r => String(r.ID) === String(id));
    if (!hit) throw new Error('Person not found.');
    update_(V2.PEOPLE, hit._row, { Active: active ? 'Y' : 'N' });
    return bootstrap_();
  });
}

function apiNewLink(id) {
  requireAdmin_();
  return withLock_(() => {
    const hit = read_(V2.PEOPLE).find(r => String(r.ID) === String(id));
    if (!hit) throw new Error('Person not found.');
    update_(V2.PEOPLE, hit._row, { Token: token_() });
    return bootstrap_();
  });
}

function apiSaveManagerRatings(personId, scores, note) {
  const email = requireAdmin_();
  return withLock_(() => {
    const person = read_(V2.PEOPLE).find(r => String(r.ID) === String(personId));
    if (!person) throw new Error('Person not found.');
    const skills = activeSkillNames_();
    const now = new Date();
    const rows = Object.keys(scores || {}).filter(s => skills.indexOf(s) >= 0 && [1, 2, 3, 4, 5].indexOf(Number(scores[s])) >= 0)
      .map(s => ({ Timestamp: now, 'Person ID': person.ID, Person: person.Name, Skill: s, Score: Number(scores[s]), 'Rater Type': 'Manager', Rater: email, Cycle: cycleOf_(now), Note: String(note || ''), Sample: person.Sample || '' }));
    if (!rows.length) throw new Error('Rate at least one skill.');
    append_(V2.ASSESS, rows);
    return bootstrap_();
  });
}

function apiSaveTraining(t) {
  requireAdmin_();
  return withLock_(() => {
    if (!t || !t.personId) throw new Error('Choose who is being trained.');
    if (!String(t.trainer || '').trim()) throw new Error('Choose or enter a trainer.');
    const skills = (t.skills || []).map(s => String(s).trim()).filter(Boolean);
    if (!skills.length) throw new Error('Pick at least one skill.');
    const status = TRAINING_STATUSES.indexOf(t.status) >= 0 ? t.status : 'Planned';
    const person = read_(V2.PEOPLE).find(r => String(r.ID) === String(t.personId));
    const rec = {
      'Person ID': String(t.personId), Trainer: String(t.trainer).trim(), 'Trainer Type': t.trainerType === 'External' ? 'External' : 'VA',
      'Trainer Person ID': t.trainerType === 'External' ? '' : String(t.trainerPersonId || ''), Skills: skills.join(', '),
      'Target Level': Number(t.targetLevel) || '', Start: toDate_(t.start), Due: toDate_(t.due), Status: status, Updated: new Date(),
    };
    const hit = t.id && read_(V2.TRAIN).find(r => String(r.ID) === String(t.id));
    if (hit) update_(V2.TRAIN, hit._row, rec);
    else append_(V2.TRAIN, [Object.assign({ ID: id_(), Created: new Date(), Sample: person && person.Sample || '' }, rec)]);
    return bootstrap_();
  });
}

function apiMoveTraining(id, status) {
  requireAdmin_();
  if (TRAINING_STATUSES.indexOf(status) < 0) throw new Error('Unknown status.');
  return withLock_(() => {
    const hit = read_(V2.TRAIN).find(r => String(r.ID) === String(id));
    if (!hit) throw new Error('Training not found.');
    const patch = { Status: status, Updated: new Date() };
    if (status === 'In training' && !hit.Start) patch.Start = new Date();
    update_(V2.TRAIN, hit._row, patch);
    return bootstrap_();
  });
}

function apiDeleteTraining(id) {
  requireAdmin_();
  return withLock_(() => {
    deleteWhere_(V2.CHECK, r => String(r['Training ID']) === String(id));
    deleteWhere_(V2.TRAIN, r => String(r.ID) === String(id));
    return bootstrap_();
  });
}

function apiAddCheckin(trainingId, note) {
  const email = requireAdmin_();
  return withLock_(() => {
    const t = read_(V2.TRAIN).find(r => String(r.ID) === String(trainingId));
    if (!t) throw new Error('Training not found.');
    if (!String(note || '').trim()) throw new Error('Write a short note.');
    append_(V2.CHECK, [{ ID: id_(), 'Training ID': t.ID, Date: new Date(), Author: email, Note: String(note).trim(), Sample: t.Sample || '' }]);
    update_(V2.TRAIN, t._row, { Updated: new Date() });
    return bootstrap_();
  });
}

function apiSaveSkill(s) {
  requireAdmin_();
  return withLock_(() => {
    const name = String(s && s.name || '').trim();
    if (!name) throw new Error('Skill name is required.');
    const rows = read_(V2.SKILLS);
    const orig = String(s.originalName || '');
    if (rows.some(r => nkey_(r['Skill Name']) === nkey_(name) && nkey_(r['Skill Name']) !== nkey_(orig))) throw new Error('That skill already exists.');
    const levels = (s.levels || []).slice(0, 5);
    const rec = { 'Skill Name': name, Category: String(s.category || 'Other').trim() || 'Other', Active: s.active === false ? 'N' : 'Y' };
    for (let i = 1; i <= 5; i++) rec['Level ' + i] = String(levels[i - 1] || GENERIC_RUBRIC[i - 1]).trim();
    const hit = orig && rows.find(r => nkey_(r['Skill Name']) === nkey_(orig));
    if (hit) {
      update_(V2.SKILLS, hit._row, rec);
      if (nkey_(orig) !== nkey_(name)) {
        read_(V2.ASSESS).filter(a => nkey_(a.Skill) === nkey_(orig)).forEach(a => update_(V2.ASSESS, a._row, { Skill: name }));
        read_(V2.TRAIN).forEach(t => {
          const list = String(t.Skills || '').split(',').map(x => x.trim());
          if (list.some(x => nkey_(x) === nkey_(orig))) update_(V2.TRAIN, t._row, { Skills: list.map(x => (nkey_(x) === nkey_(orig) ? name : x)).join(', ') });
        });
      }
    } else {
      append_(V2.SKILLS, [Object.assign({ 'Source (Standard/Custom)': 'Custom' }, rec)]);
    }
    return bootstrap_();
  });
}

function apiSaveSettings(o) {
  const email = requireAdmin_();
  return withLock_(() => {
    if (o.team !== undefined) setSetting_('TEAM_NAME', String(o.team).trim() || 'Team Troy');
    if (o.reassessDays !== undefined) setSetting_('REASSESS_DAYS', String(Math.max(14, Math.min(365, Number(o.reassessDays) || 90))));
    if (o.admins !== undefined) {
      const list = String(o.admins).split(/[,\s;]+/).map(s => s.trim().toLowerCase()).filter(s => /@/.test(s));
      if (list.indexOf(email) < 0) list.unshift(email); // you can't remove yourself
      setSetting_('ADMINS', Array.from(new Set(list)).join(', '));
    }
    return bootstrap_();
  });
}

function apiRemoveSampleData() {
  requireAdmin_();
  return withLock_(() => { removeSampleData_(); return bootstrap_(); });
}

function activeSkillNames_() {
  return read_(V2.SKILLS).filter(r => String(r['Skill Name']).trim() && yes_(r.Active)).map(r => String(r['Skill Name']).trim());
}

/* ============================ VA (PERSONAL LINK) API ============================ */

function personByToken_(token) {
  const t = String(token || '').trim();
  if (t.length < 12) return null;
  return read_(V2.PEOPLE).find(r => String(r.Token) === t && yes_(r.Active)) || null;
}

function apiVaLoad(token) {
  const p = personByToken_(token);
  if (!p) throw new Error('This link is not valid any more. Ask your team lead for a new one.');
  const skills = read_(V2.SKILLS).filter(r => String(r['Skill Name']).trim() && yes_(r.Active)).map(r => ({
    name: String(r['Skill Name']).trim(), category: String(r.Category || 'Other').trim(),
    levels: [1, 2, 3, 4, 5].map(i => String(r['Level ' + i] || GENERIC_RUBRIC[i - 1])),
  }));
  const mine = read_(V2.ASSESS).filter(a => String(a['Person ID']) === String(p.ID) && String(a['Rater Type']) !== 'Manager' && Number(a.Score))
    .map(a => ({ ts: iso_(a.Timestamp), skill: String(a.Skill), score: Number(a.Score), cycle: String(a.Cycle) }))
    .sort((a, b) => a.ts.localeCompare(b.ts));
  const last = {};
  mine.forEach(a => (last[a.skill] = a.score));
  const lastTs = mine.length ? mine[mine.length - 1].ts : '';
  const byCycle = {};
  mine.forEach(a => { (byCycle[a.cycle] = byCycle[a.cycle] || {})[a.skill] = a.score; });
  const history = Object.keys(byCycle).sort().map(c => { const v = Object.values(byCycle[c]); return { cycle: c, avg: v.reduce((x, y) => x + y, 0) / v.length }; });
  return { name: String(p.Name), first: String(p.Name).replace(/^Sample · /, '').split(' ')[0], team: getSetting_('TEAM_NAME', 'Team Troy'), skills, last, lastTs, history, levelNames: LEVEL_NAMES, cycle: cycleOf_(new Date()) };
}

function apiVaSubmit(token, scores, note) {
  const p = personByToken_(token);
  if (!p) throw new Error('This link is not valid any more. Ask your team lead for a new one.');
  return withLock_(() => {
    const skills = activeSkillNames_();
    const missing = skills.filter(s => [1, 2, 3, 4, 5].indexOf(Number(scores && scores[s])) < 0);
    if (missing.length) throw new Error('Please rate every skill (missing: ' + missing.slice(0, 3).join(', ') + (missing.length > 3 ? '…' : '') + ').');
    const before = apiVaLoad(token).last;
    const now = new Date();
    append_(V2.ASSESS, skills.map(s => ({ Timestamp: now, 'Person ID': p.ID, Person: p.Name, Skill: s, Score: Number(scores[s]), 'Rater Type': 'Self', Rater: p.Name, Cycle: cycleOf_(now), Note: String(note || '').slice(0, 2000), Sample: p.Sample || '' })));
    return { ok: true, changes: skills.filter(s => before[s] && before[s] !== Number(scores[s])).map(s => ({ skill: s, from: before[s], to: Number(scores[s]) })) };
  });
}
