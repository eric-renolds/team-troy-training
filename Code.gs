/**
 * Team Troy Training Portal — Google Apps Script API
 * ---------------------------------------------------
 * Paste this whole file into Extensions → Apps Script of the Team Troy sheet.
 * 1. Run setup() once (creates the tabs and placeholder data).
 * 2. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * 3. Put the Web app URL into config.js on GitHub.
 *
 * The password lives ONLY here (this script is private to your Google account).
 * Change it any time, then Deploy → Manage deployments → Edit → New version.
 */
const DASHBOARD_PASSWORD = 'CHANGE-ME'; // set your real password in your own Apps Script copy only

const TAB = { VAS: 'VAs', SKILLS: 'Skills', PAIRINGS: 'Pairings', RATINGS: 'Ratings' };
const PAIRING_HEADERS = ['ID', 'VA Name', 'Trainer Name', 'Trainer Type', 'Target Skills', 'Date Assigned'];

const STANDARD_SKILLS = [
  ['Email Management', 'Administrative'],
  ['Calendar & Scheduling', 'Administrative'],
  ['Data Entry & Accuracy', 'Administrative'],
  ['Microsoft Excel', 'Tools'],
  ['Google Workspace', 'Tools'],
  ['CRM Tools', 'Tools'],
  ['Project Management Tools', 'Tools'],
  ['Written Communication', 'Communication'],
  ['Verbal Communication', 'Communication'],
  ['Customer Service', 'Communication'],
  ['Internet Research', 'Research & Analysis'],
  ['Problem Solving', 'Research & Analysis'],
  ['Time Management', 'Professional'],
  ['Attention to Detail', 'Professional'],
  ['Social Media Management', 'Marketing'],
  ['Canva / Basic Design', 'Marketing'],
  ['Basic Bookkeeping', 'Finance'],
];

/* ============================ SETUP ============================ */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const vas = getOrCreate_(ss, TAB.VAS, ['VA Name', 'Email (optional)', 'Active (Y/N)']);
  if (vas.getLastRow() < 2) {
    const rows = [];
    for (let i = 1; i <= 16; i++) rows.push(['VA ' + String(i).padStart(2, '0'), '', 'Y']);
    vas.getRange(2, 1, rows.length, 3).setValues(rows);
  }

  const skills = getOrCreate_(ss, TAB.SKILLS, ['Skill Name', 'Category', 'Source (Standard/Custom)']);
  if (skills.getLastRow() < 2) {
    const rows = STANDARD_SKILLS.map(s => [s[0], s[1], 'Standard']);
    skills.getRange(2, 1, rows.length, 3).setValues(rows);
  }

  getOrCreate_(ss, TAB.PAIRINGS, PAIRING_HEADERS);

  // Demo ratings so the dashboard has something to show. Once a Google Form is
  // linked (its "Form Responses" tab exists), the dashboard ignores this tab.
  const skillNames = STANDARD_SKILLS.map(s => s[0]);
  const ratings = getOrCreate_(ss, TAB.RATINGS, ['Timestamp', 'VA Name'].concat(skillNames));
  if (ratings.getLastRow() < 2) {
    const rows = [];
    const now = new Date();
    for (let i = 1; i <= 12; i++) {
      const row = [new Date(now.getTime() - i * 86400000), 'VA ' + String(i).padStart(2, '0')];
      skillNames.forEach((_, j) => row.push(1 + ((i * 7 + j * 3 + (i * j) % 4) % 5)));
      rows.push(row);
    }
    ratings.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  const first = ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first);
  SpreadsheetApp.flush();
  return 'Setup complete';
}

function getOrCreate_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ============================ API ============================ */

function doGet() {
  return json_({ ok: true, message: 'Team Troy Training API is running. Use the dashboard to access data.' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Bad request' });
  }
  if (!req || req.password !== DASHBOARD_PASSWORD) {
    Utilities.sleep(800); // slows down password guessing
    return json_({ ok: false, error: 'Incorrect password' });
  }
  try {
    switch (req.action) {
      case 'login': return json_({ ok: true });
      case 'getData': return json_({ ok: true, data: getData_() });
      case 'savePairing': return json_({ ok: true, pairing: savePairing_(req.pairing) });
      case 'deletePairing': deletePairing_(req.id); return json_({ ok: true });
      default: return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================ READ ============================ */

function rows_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

const norm_ = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

function getData_() {
  const vas = rows_(TAB.VAS)
    .filter(r => String(r[0]).trim() && String(r[2] || 'Y').trim().toUpperCase() !== 'N')
    .map(r => ({ name: String(r[0]).trim() }));

  const skills = rows_(TAB.SKILLS)
    .filter(r => String(r[0]).trim())
    .map(r => ({ name: String(r[0]).trim(), category: String(r[1] || 'Other').trim(), source: String(r[2] || 'Standard').trim() }));

  const pairings = rows_(TAB.PAIRINGS)
    .filter(r => String(r[0]).trim())
    .map(r => ({
      id: String(r[0]), va: String(r[1]), trainer: String(r[2]), trainerType: String(r[3] || 'VA'),
      skills: String(r[4] || '').split(',').map(s => s.trim()).filter(Boolean),
      date: r[5] instanceof Date ? r[5].toISOString() : String(r[5] || ''),
    }));

  return Object.assign({ vas, skills, pairings, generatedAt: new Date().toISOString() }, readRatings_(skills));
}

/** Finds the ratings tab: a linked Google Form response tab first, else "Ratings". */
function ratingsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const form = ss.getSheets().find(s => /^form responses/i.test(s.getName()) && s.getLastRow() > 1);
  return form || ss.getSheetByName(TAB.RATINGS);
}

function readRatings_(skills) {
  const sh = ratingsSheet_();
  const out = { ratings: [], ratingsSource: sh ? sh.getName() : null, unmatchedColumns: [] };
  if (!sh || sh.getLastRow() < 2) return out;

  const values = sh.getDataRange().getValues();
  const headers = values[0].map(h => String(h));
  const skillByNorm = {};
  skills.forEach(s => (skillByNorm[norm_(s.name)] = s.name));

  let tsCol = -1, nameCol = -1;
  const skillCols = []; // [colIndex, skillName]
  headers.forEach((h, i) => {
    // Google Form grid questions look like "Rate your skills [Microsoft Excel]"
    const m = h.match(/\[([^\]]+)\]\s*$/);
    const key = norm_(m ? m[1] : h);
    if (skillByNorm[key]) { skillCols.push([i, skillByNorm[key]]); return; }
    if (tsCol < 0 && /timestamp/i.test(h)) { tsCol = i; return; }
    if (nameCol < 0 && /name/i.test(h)) { nameCol = i; return; }
    if (!/e-?mail|score/i.test(h) && h.trim()) out.unmatchedColumns.push(m ? m[1] : h);
  });
  if (nameCol < 0) throw new Error('Ratings tab needs a column whose title contains "Name".');

  const latest = {}; // VA (normalised) -> submission, latest wins
  values.slice(1).forEach(r => {
    const name = String(r[nameCol] || '').trim();
    if (!name) return;
    const ts = tsCol >= 0 && r[tsCol] instanceof Date ? r[tsCol] : null;
    const ratings = {};
    skillCols.forEach(([c, skill]) => {
      const n = String(r[c]).match(/[1-5]/);
      if (n) ratings[skill] = Number(n[0]);
    });
    const key = norm_(name);
    const prev = latest[key];
    if (!prev || !ts || !prev.ts || ts >= prev.ts) latest[key] = { name, ts, ratings };
  });

  out.ratings = Object.values(latest).map(x => ({ va: x.name, timestamp: x.ts ? x.ts.toISOString() : null, ratings: x.ratings }));
  return out;
}

/* ============================ WRITE ============================ */

function savePairing_(p) {
  if (!p || !String(p.va || '').trim() || !String(p.trainer || '').trim()) throw new Error('VA and trainer are required.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getOrCreate_(SpreadsheetApp.getActiveSpreadsheet(), TAB.PAIRINGS, PAIRING_HEADERS);
    const skills = (p.skills || []).map(s => String(s).trim()).filter(Boolean).join(', ');
    const type = p.trainerType === 'External' ? 'External' : 'VA';
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
    const idx = p.id ? ids.indexOf(String(p.id)) : -1;
    if (idx >= 0) {
      const row = idx + 2;
      sh.getRange(row, 2, 1, 4).setValues([[p.va.trim(), p.trainer.trim(), type, skills]]);
      return { id: p.id };
    }
    const id = Utilities.getUuid().slice(0, 8);
    sh.appendRow([id, p.va.trim(), p.trainer.trim(), type, skills, new Date()]);
    return { id };
  } finally {
    lock.releaseLock();
  }
}

function deletePairing_(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.PAIRINGS);
    if (!sh || sh.getLastRow() < 2) return;
    const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]));
    const idx = ids.indexOf(String(id));
    if (idx >= 0) sh.deleteRow(idx + 2);
  } finally {
    lock.releaseLock();
  }
}
