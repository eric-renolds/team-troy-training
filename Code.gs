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

/* ============================ GOOGLE FORM ============================ */

const FORM_TITLE = 'Team Troy – VA Skills Self-Assessment';
const SCALE = ['1 - Beginner', '2 - Basic', '3 - Competent', '4 - Strong', '5 - Expert'];

/** Adds a "Training Portal" menu to the sheet. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Training Portal')
    .addItem('Create / update skills form', 'syncSkillForm')
    .addToUi();
}

/**
 * Creates the skills form (first run) or updates it (later runs) from the
 * VAs and Skills tabs. Run it again whenever you change VA names or skills.
 * Responses go to this spreadsheet's "Form Responses" tab automatically.
 */
function syncSkillForm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  let form = null;
  const id = props.getProperty('FORM_ID');
  if (id) { try { form = FormApp.openById(id); } catch (e) { form = null; } }
  const created = !form;

  if (!form) {
    form = FormApp.create(FORM_TITLE);
    props.setProperty('FORM_ID', form.getId());
    form.setDescription(
      'Rate yourself honestly on each skill. This is not a test: it helps us pair you with the right trainer.\n\n' +
      '1 - Beginner: little or no experience\n2 - Basic: can do simple tasks with help\n' +
      '3 - Competent: can do it on my own\n4 - Strong: confident, handle complex tasks\n5 - Expert: could teach others\n\n' +
      'Takes about 3 minutes. You can submit again later; we use your latest answers.');
    form.setConfirmationMessage('Thanks! Your skill ratings have been recorded.');
    form.setAllowResponseEdits(false);
    form.setProgressBar(true);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  }

  const skills = rows_(TAB.SKILLS).filter(r => String(r[0]).trim())
    .map(r => ({ name: String(r[0]).trim(), category: String(r[1] || 'Other').trim() }));
  const byCat = {};
  skills.forEach(s => (byCat[s.category] = byCat[s.category] || []).push(s.name));

  // 1. Name: free-text box (an older dropdown version is replaced)
  form.getItems(FormApp.ItemType.LIST).filter(i => i.getTitle() === 'Your Name').forEach(i => form.deleteItem(i));
  const found = form.getItems(FormApp.ItemType.TEXT).find(i => i.getTitle() === 'Your Name');
  let nameItem;
  if (found) nameItem = found.asTextItem();
  else { nameItem = form.addTextItem().setTitle('Your Name'); form.moveItem(nameItem.getIndex(), 0); }
  nameItem.setRequired(true)
    .setHelpText('Enter your full name (first and last). Please spell it the same way every time you fill this in.');

  // 2. One 1–5 grid per skill category
  const grids = {};
  form.getItems(FormApp.ItemType.GRID).forEach(i => (grids[i.getTitle()] = i.asGridItem()));
  Object.keys(byCat).forEach(cat => {
    const title = 'Rate your skills: ' + cat;
    const g = grids[title] || form.addGridItem().setTitle(title);
    g.setRows(byCat[cat]).setColumns(SCALE).setRequired(true);
  });

  // 3. Optional comments
  const hasComments = form.getItems(FormApp.ItemType.PARAGRAPH_TEXT).some(i => i.getTitle() === 'Comments (optional)');
  if (!hasComments) form.addParagraphTextItem().setTitle('Comments (optional)')
    .setHelpText('A skill you want training on, or a tool we missed?');

  const msg = (created ? 'Form created.' : 'Form updated.') +
    '\nShare with VAs: ' + form.getPublishedUrl() + '\nEdit form: ' + form.getEditUrl();
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* run from editor: see log */ }
  return msg;
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

const PLACEHOLDER_VA_ = /^VA \d{2}$/;

function getData_() {
  const skills = rows_(TAB.SKILLS)
    .filter(r => String(r[0]).trim())
    .map(r => ({ name: String(r[0]).trim(), category: String(r[1] || 'Other').trim(), source: String(r[2] || 'Standard').trim() }));

  // Ratings first: with real form data, anyone who submits joins the VA list.
  const ratingsInfo = readRatings_(skills);
  const fromForm = /^form responses/i.test(ratingsInfo.ratingsSource || '');
  if (fromForm) addMissingVAs_(ratingsInfo.ratings.map(r => r.va));

  let vas = rows_(TAB.VAS)
    .filter(r => String(r[0]).trim() && String(r[2] || 'Y').trim().toUpperCase() !== 'N')
    .map(r => ({ name: String(r[0]).trim() }));
  if (fromForm) vas = vas.filter(v => !PLACEHOLDER_VA_.test(v.name)); // drop "VA 01…16" once real data exists

  const pairings = rows_(TAB.PAIRINGS)
    .filter(r => String(r[0]).trim())
    .map(r => ({
      id: String(r[0]), va: String(r[1]), trainer: String(r[2]), trainerType: String(r[3] || 'VA'),
      skills: String(r[4] || '').split(',').map(s => s.trim()).filter(Boolean),
      date: r[5] instanceof Date ? r[5].toISOString() : String(r[5] || ''),
    }));

  return Object.assign({ vas, skills, pairings, generatedAt: new Date().toISOString() }, ratingsInfo);
}

/** Appends submitters who aren't in the VAs tab yet (matching ignores case and extra spaces). */
function addMissingVAs_(names) {
  const sh = getOrCreate_(SpreadsheetApp.getActiveSpreadsheet(), TAB.VAS, ['VA Name', 'Email (optional)', 'Active (Y/N)']);
  const known = new Set(rows_(TAB.VAS).map(r => norm_(r[0])));
  const add = [];
  names.forEach(n => { const k = norm_(n); if (k && !known.has(k)) { known.add(k); add.push([String(n).trim().replace(/\s+/g, ' '), '', 'Y']); } });
  if (!add.length) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setValues(add); } finally { lock.releaseLock(); }
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
    if (!/e-?mail|score|comment/i.test(h) && h.trim()) out.unmatchedColumns.push(m ? m[1] : h);
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
