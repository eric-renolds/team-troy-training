/**
 * Team Troy Training Portal — Google Apps Script API (manager edition)
 * ---------------------------------------------------------------------
 * The website (GitHub Pages) talks to this script; this script reads and writes the Google Sheet.
 *
 * ONE-TIME SETUP
 * 1. Create a new Apps Script project (script.google.com → New project) or open the sheet's own script.
 * 2. Paste this file into Code.gs and check SHEET_ID below, then save.
 * 3. Change MANAGER_PASSWORD below, then run setup() once (Run ▶). Approve the permissions.
 *    It creates the tabs, adds the standard skills and copies VA names from the old portal tabs.
 * 4. Deploy → New deployment → type: Web app → Execute as: Me → Who has access: Anyone → Deploy.
 *    (If you already have a deployment: Deploy → Manage deployments → Edit → Version: New version → Deploy.)
 * 5. Copy the Web app URL (ends in /exec) into config.js on GitHub → API_URL.
 *
 * The password lives only here, never in the public GitHub repo.
 */
const MANAGER_PASSWORD = 'CHANGE-ME';

// The "Team Troy Training Portal" Google Sheet (the long ID in its URL).
const SHEET_ID = '1IGhyXRyjX0BneNg94zqsoXRkriQJb2adwQIDbWqaSHQ';
function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

const TABS = {
  team: { name: 'VA Team', headers: ['ID', 'Name', 'Role', 'Account', 'Start', 'Active'] },
  skills: { name: 'Skill List', headers: ['Skill', 'Category', 'Active'] },
  ratings: { name: 'Skill Ratings', headers: ['Timestamp', 'Person ID', 'Person', 'Skill', 'Score', 'Manager', 'Note'] },
  training: { name: 'Trainings', headers: ['ID', 'Trainee ID', 'Trainee', 'Trainer ID', 'Trainer', 'Skills', 'Target', 'Start', 'Due', 'Status', 'Notes', 'Created', 'Updated'] },
  notes: { name: 'Work Notes', headers: ['ID', 'Person ID', 'Person', 'Date', 'Type', 'Note', 'Manager'] },
  settings: { name: 'Portal Settings', headers: ['Key', 'Value'] },
};

const STANDARD_SKILLS = [
  ['Email Management', 'Administrative'], ['Calendar & Scheduling', 'Administrative'], ['Data Entry & Accuracy', 'Administrative'],
  ['Microsoft Excel', 'Tools'], ['Google Workspace', 'Tools'], ['CRM Tools', 'Tools'], ['Project Management Tools', 'Tools'],
  ['Written Communication', 'Communication'], ['Verbal Communication', 'Communication'], ['Customer Service', 'Communication'],
  ['Internet Research', 'Research & Analysis'], ['Problem Solving', 'Research & Analysis'],
  ['Time Management', 'Professional'], ['Attention to Detail', 'Professional'],
  ['Social Media Management', 'Marketing'], ['Canva / Basic Design', 'Marketing'], ['Basic Bookkeeping', 'Finance'],
];

/* ============================== setup ============================== */

function setup() {
  Object.keys(TABS).forEach((k) => sheet_(k));
  const ss = ss_();

  // Skills: copy from the old v2 "Skills" tab if it exists, otherwise use the standard list.
  if (sheet_('skills').getLastRow() < 2) {
    let rows = [];
    const old = ss.getSheetByName('Skills');
    if (old && old.getLastRow() > 1) {
      rows = old.getRange(2, 1, old.getLastRow() - 1, 2).getValues().filter((r) => String(r[0]).trim()).map((r) => [String(r[0]).trim(), String(r[1] || 'Other').trim(), 'Y']);
    }
    if (!rows.length) rows = STANDARD_SKILLS.map((s) => [s[0], s[1], 'Y']);
    sheet_('skills').getRange(2, 1, rows.length, 3).setValues(rows);
  }

  // VA names: copy from the old portal tabs (v2 "People", v1 "VAs"), skipping placeholders and sample rows.
  if (sheet_('team').getLastRow() < 2) {
    const seen = {}, rows = [];
    const add = (name, role, active) => {
      const n = String(name || '').trim().replace(/\s+/g, ' ');
      const k = n.toLowerCase();
      if (!n || seen[k] || /^va \d{2}$/.test(k) || /^sample/.test(k)) return;
      seen[k] = 1;
      rows.push([id_('p'), n, role || 'VA', '', '', active === 'N' ? 'N' : 'Y']);
    };
    const people = ss.getSheetByName('People');
    if (people && people.getLastRow() > 1) {
      const v = people.getDataRange().getValues(), h = v.shift();
      const ix = (c) => h.indexOf(c);
      v.forEach((r) => { if (String(r[ix('Sample')] || '') !== 'Y') add(r[ix('Name')], 'VA', String(r[ix('Active')] || 'Y').toUpperCase().charAt(0)); });
    }
    const vas = ss.getSheetByName('VAs');
    if (vas && vas.getLastRow() > 1) vas.getRange(2, 1, vas.getLastRow() - 1, 1).getValues().forEach((r) => add(r[0]));
    if (rows.length) sheet_('team').getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  const st = readSettings_();
  if (!st.teamName) setSetting_('teamName', 'Team Troy');
  if (!st.reassessDays) setSetting_('reassessDays', '45');
  if (!st.managers) setSetting_('managers', '');
  safeAlert_('Team Troy portal is set up. Now deploy it as a web app (see the notes at the top of Code.gs).');
}

function safeAlert_(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }

/* ============================== web app ============================== */

function doGet() {
  return json_({ ok: true, app: 'Team Troy Training Portal API', hint: 'Open the portal website to use it.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  if (!req || String(req.password) !== MANAGER_PASSWORD) {
    Utilities.sleep(700);
    return json_({ ok: false, error: 'Incorrect password' });
  }
  try {
    if (req.action === 'getAll') return json_({ ok: true, data: getAll_() });
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      switch (req.action) {
        case 'savePerson': upsert_('team', 'ID', personRow_(req.person)); break;
        case 'saveRatings': saveRatings_(req.rows || [], req.note); break;
        case 'saveTraining': upsert_('training', 'ID', trainingRow_(req.training)); break;
        case 'deleteTraining': deleteWhere_('training', 'ID', req.id); break;
        case 'saveNote': appendObj_('notes', noteRow_(req.note)); break;
        case 'deleteNote': deleteWhere_('notes', 'ID', req.id); break;
        case 'deletePerson': deletePerson_(req.id); break;
        case 'saveSkills': saveSkills_(req.skills || []); break;
        case 'saveSettings': saveSettings_(req.settings || {}); break;
        default: return json_({ ok: false, error: 'Unknown action' });
      }
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ============================== read ============================== */

function getAll_() {
  const team = read_('team'), byId = {};
  team.forEach((p) => (byId[p.ID] = p));
  return {
    people: team.map((p) => ({ id: p.ID, name: p.Name, role: p.Role || 'VA', account: p.Account, start: p.Start, active: String(p.Active || 'Y').toUpperCase() === 'N' ? 'N' : 'Y' })),
    skills: read_('skills').map((s) => ({ name: s.Skill, category: s.Category || 'Other', active: String(s.Active || 'Y').toUpperCase() === 'N' ? 'N' : 'Y' })),
    ratings: read_('ratings').map((r) => ({ ts: r.Timestamp, personId: r['Person ID'], skill: r.Skill, score: Number(r.Score), manager: r.Manager, note: r.Note })),
    training: read_('training').map((t) => ({ id: t.ID, traineeId: t['Trainee ID'], trainerId: t['Trainer ID'], skills: String(t.Skills || '').split(/\s*;\s*/).filter(String), target: Number(t.Target) || 4, start: t.Start, due: t.Due, status: t.Status || 'Planned', notes: t.Notes, created: t.Created, updated: t.Updated })),
    notes: read_('notes').map((n) => ({ id: n.ID, personId: n['Person ID'], ts: n.Date, type: n.Type || 'Note', text: n.Note, manager: n.Manager })),
    settings: (function () { const s = readSettings_(); return { teamName: s.teamName || 'Team Troy', reassessDays: Number(s.reassessDays) || 45, managers: String(s.managers || '').split(/\s*[,;\n]\s*/).filter(String) }; })(),
  };
}

/* ============================== write ============================== */

function nameOf_(id) { const p = read_('team').find((r) => r.ID === id); return p ? p.Name : ''; }

function personRow_(p) {
  if (!p || !String(p.name || '').trim()) throw new Error('Name is required');
  return { ID: p.id || id_('p'), Name: String(p.name).trim(), Role: p.role || 'VA', Account: p.account || '', Start: p.start || '', Active: p.active === 'N' ? 'N' : 'Y' };
}

function saveRatings_(rows, note) {
  const team = {}; read_('team').forEach((p) => (team[p.ID] = p.Name));
  const out = rows.filter((r) => team[r.personId] && Number(r.score) >= 1 && Number(r.score) <= 5)
    .map((r) => [r.ts || new Date().toISOString(), r.personId, team[r.personId], r.skill, Number(r.score), r.manager || '', r.note || '']);
  if (!out.length) return;
  const sh = sheet_('ratings');
  sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
  if (note && note.text) appendObj_('notes', noteRow_(note));
}

function trainingRow_(t) {
  if (!t || !t.traineeId || !t.trainerId) throw new Error('Trainee and trainer are required');
  if (t.traineeId === t.trainerId) throw new Error('A VA cannot train themselves');
  const now = new Date().toISOString();
  return {
    ID: t.id || id_('t'), 'Trainee ID': t.traineeId, Trainee: nameOf_(t.traineeId), 'Trainer ID': t.trainerId, Trainer: nameOf_(t.trainerId),
    Skills: (t.skills || []).join('; '), Target: Number(t.target) || 4, Start: t.start || '', Due: t.due || '', Status: t.status || 'Planned',
    Notes: t.notes || '', Created: t.created || now, Updated: now,
  };
}

function noteRow_(n) {
  if (!n || !String(n.text || '').trim()) throw new Error('Note text is required');
  return { ID: n.id || id_('n'), 'Person ID': n.personId, Person: nameOf_(n.personId), Date: n.ts || new Date().toISOString(), Type: n.type || 'Note', Note: String(n.text).trim(), Manager: n.manager || '' };
}

function deletePerson_(id) {
  if (!id) throw new Error('Missing VA');
  deleteWhere_('team', 'ID', id);
  deleteWhere_('ratings', 'Person ID', id);
  deleteWhere_('notes', 'Person ID', id);
  deleteWhere_('training', 'Trainee ID', id);
  deleteWhere_('training', 'Trainer ID', id);
}

function saveSkills_(skills) {
  const sh = sheet_('skills');
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 3).clearContent();
  const rows = skills.filter((s) => String(s.name || '').trim()).map((s) => [String(s.name).trim(), String(s.category || 'Other').trim(), s.active === 'N' ? 'N' : 'Y']);
  if (rows.length) sh.getRange(2, 1, rows.length, 3).setValues(rows);
}

function saveSettings_(s) {
  if (s.teamName != null) setSetting_('teamName', String(s.teamName));
  if (s.reassessDays != null) setSetting_('reassessDays', String(Number(s.reassessDays) || 45));
  if (s.managers != null) setSetting_('managers', (s.managers || []).slice(0, 10).join(', '));
}

/* ============================== sheet helpers ============================== */

function sheet_(key) {
  const t = TABS[key], ss = ss_();
  let sh = ss.getSheetByName(t.name);
  if (!sh) {
    sh = ss.insertSheet(t.name);
    sh.getRange(1, 1, 1, t.headers.length).setValues([t.headers]).setFontWeight('bold').setBackground('#14213D').setFontColor('#F3E2C0');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), t.headers.length).setNumberFormat('@'); // keep dates as plain text
  }
  return sh;
}

function read_(key) {
  const sh = sheet_(key);
  if (sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues(), h = v.shift().map(String);
  return v.filter((r) => r.some((c) => c !== '')).map((r) => {
    const o = {};
    h.forEach((k, i) => { const c = r[i]; o[k] = c instanceof Date ? c.toISOString() : c === '' || c == null ? '' : typeof c === 'number' ? c : String(c); });
    return o;
  });
}

function appendObj_(key, obj) {
  const sh = sheet_(key), h = TABS[key].headers;
  sh.appendRow(h.map((k) => (obj[k] == null ? '' : obj[k])));
}

function upsert_(key, idCol, obj) {
  const sh = sheet_(key), h = TABS[key].headers, col = h.indexOf(idCol);
  const row = h.map((k) => (obj[k] == null ? '' : obj[k]));
  const last = sh.getLastRow();
  if (last > 1) {
    const ids = sh.getRange(2, col + 1, last - 1, 1).getValues().map((r) => String(r[0]));
    const i = ids.indexOf(String(obj[idCol]));
    if (i >= 0) { sh.getRange(i + 2, 1, 1, h.length).setValues([row]); return; }
  }
  sh.appendRow(row);
}

function deleteWhere_(key, idCol, id) {
  const sh = sheet_(key), col = TABS[key].headers.indexOf(idCol), last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, col + 1, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) sh.deleteRow(i + 2);
}

function readSettings_() {
  const o = {};
  read_('settings').forEach((r) => { o[r.Key] = r.Value; });
  return o;
}

function setSetting_(k, v) {
  const sh = sheet_('settings'), last = sh.getLastRow();
  if (last > 1) {
    const keys = sh.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0]));
    const i = keys.indexOf(k);
    if (i >= 0) { sh.getRange(i + 2, 2).setValue(v); return; }
  }
  sh.appendRow([k, v]);
}

function id_(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
