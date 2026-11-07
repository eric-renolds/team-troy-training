/**
 * Team Troy Training Portal — Google Apps Script API (manager edition)
 * ---------------------------------------------------------------------
 * The website (GitHub Pages) talks to this script; this script reads and writes the Google Sheet.
 *
 * SIGN-IN: managers sign in with Google through the small "Team Troy Sign-in" script (signin/Login.gs).
 * It hands the portal a Google identity token; the 'login' action below checks that token with Google,
 * checks the email against the "Managers" tab (managed in the portal's Settings), and returns a signed
 * 7-day session. Every request re-checks the Managers list, so removing someone locks them out at once.
 * The Google account that owns this script is always allowed, so it can't be locked out.
 *
 * ONE-TIME SETUP
 * 1. Deploy signin/Login.gs as its own Apps Script web app (see the notes in that file) and open its
 *    URL with ?setup=1 to see its "sign-in audience". Paste that into LOGIN_AUDIENCE below.
 * 2. Paste this file into Code.gs, check SHEET_ID, save, then run setup() once (Run ▶) and approve.
 * 3. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy.
 *    (Existing deployment: Deploy → Manage deployments → Edit → Version: New version → Deploy.)
 * 4. Copy the Web app URL (ends in /exec) into config.js → API_URL, and the sign-in URL → LOGIN_URL.
 */
const LOGIN_AUDIENCE = '675995317775-vlomcmubpbklontvccqj9ljc77flpdnq.apps.googleusercontent.com';
const SESSION_DAYS = 7;

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
  managers: { name: 'Managers', headers: ['Name', 'Email', 'Added', 'Added by'] },
  teamNotes: { name: 'Team Notes', headers: ['ID', 'Date', 'Manager', 'Note', 'Pinned', 'Edited'] },
};

const STANDARD_SKILLS = [
  ['Email Management', 'Administrative'], ['Calendar & Scheduling', 'Administrative'], ['Data Entry & Accuracy', 'Administrative'], ['Records & File Management', 'Administrative'], ['Listing Management', 'Administrative'], ['CMA & Market Analysis', 'Administrative'], ['Weekly Reporting', 'Administrative'], ['Open House Coordination', 'Administrative'], ['Transcription', 'Administrative'],
  ['Microsoft Excel', 'Tools'], ['Google Workspace', 'Tools'], ['CRM Tools', 'Tools'], ['Real Estate CRMs (kvCORE, Follow Up Boss, Lofty, CINC, KW Command)', 'Tools'], ['CRM Automations & Drip Campaigns', 'Tools'], ['Project Management Tools', 'Tools'],
  ['Written Communication', 'Communication'], ['Verbal Communication', 'Communication'], ['Customer Service', 'Communication'],
  ['Internet Research', 'Research & Analysis'], ['Problem Solving', 'Research & Analysis'],
  ['Time Management', 'Professional'], ['Attention to Detail', 'Professional'],
  ['Social Media Management', 'Marketing & Social Media'], ['Content Calendar Planning', 'Marketing & Social Media'], ['Social Media Engagement & Community', 'Marketing & Social Media'], ['Paid Ads (Google & Meta)', 'Marketing & Social Media'], ['Audience Research & Retargeting', 'Marketing & Social Media'], ['SEO & Keyword Research', 'Marketing & Social Media'], ['Web Analytics & Reporting', 'Marketing & Social Media'], ['Google Business Profile', 'Marketing & Social Media'], ['Email Marketing & Newsletters', 'Marketing & Social Media'], ['Landing Pages & Lead Capture Forms', 'Marketing & Social Media'], ['Post Scheduling (Meta Business Suite)', 'Marketing & Social Media'], ['Online Reviews & Reputation', 'Marketing & Social Media'], ['Contests & Promotions', 'Marketing & Social Media'],
  ['Graphic Design (Canva / Photoshop / Illustrator)', 'Content Creation'], ['Brand Kits & Brand Consistency', 'Content Creation'], ['Video Editing', 'Content Creation'], ['Real Estate Content Writing', 'Content Creation'], ['Scripts & Podcasts', 'Content Creation'], ['Property Videos & Virtual Tours', 'Content Creation'],
  ['Lead Generation Strategy', 'Lead Generation'], ['Cold Calling', 'Lead Generation'], ['Lead Qualification & Nurturing', 'Lead Generation'], ['FSBO & Expired Listings', 'Lead Generation'], ['Distressed Property Prospecting', 'Lead Generation'], ['Prospect Research & Data Mining', 'Lead Generation'], ['SMS Campaigns', 'Lead Generation'], ['Direct Mail Campaigns', 'Lead Generation'], ['Referral & Partner Outreach', 'Lead Generation'],
  ['Contract-to-Close Coordination', 'Transaction Coordination'], ['Contract & Disclosure Prep', 'Transaction Coordination'], ['Transaction Software (Dotloop, SkySlope, DocuSign)', 'Transaction Coordination'], ['Deadline Tracking', 'Transaction Coordination'], ['Compliance & Fair Housing', 'Transaction Coordination'], ['Title, Escrow & Lender Coordination', 'Transaction Coordination'],
  ['Basic Bookkeeping', 'Finance'],
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

  migrateManagers_();
  const st = readSettings_();
  if (!st.teamName) setSetting_('teamName', 'Team Troy');
  if (!st.reassessDays) setSetting_('reassessDays', '45');
  if (!st.managers) setSetting_('managers', '');
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo', { muteHttpExceptions: true }); // asks for the sign-in check permission
  safeAlert_('Team Troy portal is set up. Now deploy it as a web app (see the notes at the top of Code.gs).');
}

// Copies the old name-only managers list into the Managers tab (emails are added later in Settings).
function migrateManagers_() {
  const sh = sheet_('managers');
  if (sh.getLastRow() > 1) return;
  const names = String(readSettings_().managers || '').split(/\s*[,;\n]\s*/).filter(String);
  const owner = ownerEmail_();
  if (names.length) sh.getRange(2, 1, names.length, 4).setValues(names.map((n) => [n, '', new Date().toISOString(), 'setup']));
  // Make sure the owner can always see themselves in the list.
  if (owner && !names.length) sh.appendRow(['Owner', owner, new Date().toISOString(), 'setup']);
}

function safeAlert_(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }

/* ============================== web app ============================== */

function doGet() {
  return json_({ ok: true, app: 'Team Troy Training Portal API', hint: 'Open the portal website to use it.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  let me;
  try {
    if (req && req.action === 'login') { me = login_(req.idToken); return json_({ ok: true, session: newSession_(me.email, me.name), me: me }); }
    me = authorize_(req && req.session);
  } catch (err) { return json_({ ok: false, error: err.message, code: err.code || 'signin' }); }
  req.manager = me.name; // every change is recorded under the signed-in manager
  try {
    if (req.action === 'whoami') return json_({ ok: true, me: me });
    if (req.action === 'getAll') { ensureScale10_(); migrateManagers_(); return json_({ ok: true, data: getAll_(), rev: rev_(), me: me }); }
    if (req.action === 'rev') return json_({ ok: true, rev: rev_() });
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      switch (req.action) {
        case 'savePerson': upsert_('team', 'ID', personRow_(req.person)); break;
        case 'saveRatings': (req.rows || []).forEach((r) => (r.manager = me.name)); if (req.note) req.note.manager = me.name; saveRatings_(req.rows || [], req.note); break;
        case 'deleteRatings': deleteRatings_(req.keys || []); break;
        case 'saveTraining': upsert_('training', 'ID', trainingRow_(req.training)); break;
        case 'deleteTraining': deleteWhere_('training', 'ID', req.id); break;
        case 'saveNote': if (req.note) req.note.manager = me.name; appendObj_('notes', noteRow_(req.note)); break;
        case 'deleteNote': deleteWhere_('notes', 'ID', req.id); break;
        case 'deletePerson': deletePerson_(req.id); break;
        case 'saveSkills': saveSkills_(req.skills || []); break;
        case 'saveSettings': saveSettings_(req.settings || {}); break;
        case 'saveManager': saveManager_(req.name, req.email, req.oldEmail, me); break;
        case 'removeManager': removeManager_(req.email, me, req.name); break;
        case 'saveTeamNote': upsert_('teamNotes', 'ID', teamNoteRow_(req.teamNote, me.name)); break;
        case 'deleteTeamNote': deleteWhere_('teamNotes', 'ID', req.id); break;
        default: return json_({ ok: false, error: 'Unknown action' });
      }
      bumpRev_(me.name);
    } finally { lock.releaseLock(); }
    return json_({ ok: true, rev: rev_() });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/* ============================== Google sign-in ============================== */

function authError_(msg, code) { const e = new Error(msg); e.code = code; return e; }
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function ownerEmail_() { try { return normEmail_(Session.getEffectiveUser().getEmail()); } catch (e) { return ''; } }

// Who may use the portal: anyone on the Managers tab with an email, plus the script owner.
function managerFor_(email, googleName) {
  const row = readManagers_().find((m) => m.email === email);
  const owner = email === ownerEmail_();
  if (!row && !owner) throw authError_(email + " doesn't have access to this portal. Ask a manager to add this email in Settings → Managers.", 'denied');
  return { email: email, name: row ? row.name : (googleName || email), owner: owner };
}

// 'login': checks Google's identity token (from the Team Troy Sign-in script) and the Managers list.
function login_(idToken) {
  if (!idToken) throw authError_('Please sign in with Google.', 'signin');
  const t = verifyIdToken_(String(idToken));
  return managerFor_(normEmail_(t.email), t.name);
}

// Every other request carries the portal's own signed session.
function authorize_(session) {
  const s = readSession_(session);
  if (!s) throw authError_('Please sign in with Google.', 'signin');
  return managerFor_(s.email, s.name);
}

// Sessions are "payload.signature", signed with a random secret kept in this script's properties
// (created automatically, never shared). Deleting the 'sessionSecret' property signs everyone out.
function sessionSecret_() {
  const p = PropertiesService.getScriptProperties();
  let k = p.getProperty('sessionSecret');
  if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('sessionSecret', k); }
  return k;
}
function sign_(str) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(str, sessionSecret_())).replace(/=+$/, ''); }
function newSession_(email, name) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify({ e: email, n: name || '', x: Date.now() + SESSION_DAYS * 86400000 })).replace(/=+$/, '');
  return body + '.' + sign_(body);
}
function readSession_(tok) {
  const parts = String(tok || '').split('.');
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) return null;
  let d;
  try { d = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0] + '==='.slice((parts[0].length + 3) % 4))).getDataAsString()); } catch (e) { return null; }
  if (!d || !d.e || !(d.x > Date.now())) throw authError_('Your sign-in has expired. Please sign in again.', 'signin');
  return { email: normEmail_(d.e), name: d.n || '' };
}

function verifyIdToken_(token) {
  const cache = CacheService.getScriptCache();
  const key = 'tok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw authError_('Your sign-in has expired. Please sign in again.', 'signin');
  const t = JSON.parse(res.getContentText());
  const now = Math.floor(Date.now() / 1000);
  if (t.aud !== LOGIN_AUDIENCE) throw authError_('Sign-in is not set up for this portal yet.', 'signin');
  if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') throw authError_('Invalid sign-in.', 'signin');
  if (String(t.email_verified) !== 'true') throw authError_('Your Google email is not verified.', 'denied');
  if (Number(t.exp) <= now) throw authError_('Your sign-in has expired. Please sign in again.', 'signin');
  const out = { email: t.email, name: t.name || '' };
  cache.put(key, JSON.stringify(out), Math.max(1, Math.min(600, Number(t.exp) - now - 30)));
  return out;
}

/* ============================== managers ============================== */

function readManagers_() {
  return read_('managers').map((m) => ({ name: String(m.Name || '').trim(), email: normEmail_(m.Email), added: m.Added, addedBy: m['Added by'] })).filter((m) => m.name || m.email);
}
// Adds a manager, or updates one: matched by their previous email, or by name when they have no email yet.
function saveManager_(name, email, oldEmail, me) {
  const n = String(name || '').trim(), em = normEmail_(email), old = normEmail_(oldEmail);
  if (!n) throw new Error('Name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Enter a valid Google email address');
  const sh = sheet_('managers'), last = sh.getLastRow();
  const vals = last > 1 ? sh.getRange(2, 1, last - 1, 2).getValues() : [];
  if (vals.some((r) => normEmail_(r[1]) === em && em !== old)) throw new Error(em + ' is already a manager');
  for (let i = 0; i < vals.length; i++) {
    const rowName = String(vals[i][0]).trim().toLowerCase(), rowEmail = normEmail_(vals[i][1]);
    if ((old && rowEmail === old) || (!old && !rowEmail && rowName === n.toLowerCase())) {
      sh.getRange(i + 2, 1, 1, 2).setValues([[n, em]]);
      return;
    }
  }
  if (vals.length >= 10) throw new Error('There are already 10 managers');
  sh.appendRow([n, em, new Date().toISOString(), me.name]);
}
function removeManager_(email, me, name) {
  const em = normEmail_(email);
  if (!em) { if (name) deleteWhere_('managers', 'Name', String(name).trim()); return; } // a row that never got an email
  if (em === me.email) throw new Error("You can't remove yourself");
  if (em === ownerEmail_()) throw new Error("The portal owner can't be removed");
  deleteWhere_('managers', 'Email', em);
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
    training: read_('training').map((t) => ({ id: t.ID, traineeId: t['Trainee ID'], trainerId: t['Trainer ID'], skills: String(t.Skills || '').split(/\s*;\s*/).filter(String), target: Number(t.Target) || 8, start: t.Start, due: t.Due, status: t.Status || 'Planned', notes: t.Notes, created: t.Created, updated: t.Updated })),
    notes: read_('notes').map((n) => ({ id: n.ID, personId: n['Person ID'], ts: n.Date, type: n.Type || 'Note', text: n.Note, manager: n.Manager })),
    teamNotes: read_('teamNotes').map((n) => ({ id: n.ID, ts: n.Date, manager: n.Manager, text: n.Note, pinned: String(n.Pinned || '').toUpperCase() === 'Y', edited: n.Edited })),
    managerList: readManagers_().map((m) => ({ name: m.name, email: m.email, owner: !!m.email && m.email === ownerEmail_() })),
    settings: (function () { const s = readSettings_(); return { teamName: s.teamName || 'Team Troy', reassessDays: Number(s.reassessDays) || 45, managers: readManagers_().map((m) => m.name) }; })(),
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
  const out = rows.filter((r) => team[r.personId] && Number(r.score) >= 1 && Number(r.score) <= 10)
    .map((r) => [r.ts || new Date().toISOString(), r.personId, team[r.personId], r.skill, Number(r.score), r.manager || '', r.note || '']);
  if (!out.length) return;
  const sh = sheet_('ratings');
  sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
  if (note && note.text) appendObj_('notes', noteRow_(note));
}

// Removes specific rating rows, matched on timestamp + person + skill.
function deleteRatings_(keys) {
  if (!keys.length) return;
  const want = {}; keys.forEach((k) => (want[[k.ts, k.personId, k.skill].join('|')] = 1));
  const sh = sheet_('ratings'), last = sh.getLastRow(), w = TABS.ratings.headers.length;
  if (last < 2) return;
  const rows = sh.getRange(2, 1, last - 1, w).getValues();
  const norm = (c) => (c instanceof Date ? c.toISOString() : String(c));
  const keep = rows.filter((r) => !want[[norm(r[0]), norm(r[1]), norm(r[3])].join('|')]);
  if (keep.length === rows.length) return;
  sh.getRange(2, 1, last - 1, w).clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, w).setValues(keep.map((r) => r.map(norm)));
}

function trainingRow_(t) {
  if (!t || !t.traineeId || !t.trainerId) throw new Error('Trainee and trainer are required');
  if (t.traineeId === t.trainerId) throw new Error('A VA cannot train themselves');
  const now = new Date().toISOString();
  return {
    ID: t.id || id_('t'), 'Trainee ID': t.traineeId, Trainee: nameOf_(t.traineeId), 'Trainer ID': t.trainerId, Trainer: nameOf_(t.trainerId),
    Skills: (t.skills || []).join('; '), Target: Number(t.target) || 8, Start: t.start || '', Due: t.due || '', Status: t.status || 'Planned',
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

// Merge, never replace: each skill sent is added or updated by name, so two managers
// editing skills at the same time can't wipe out each other's changes.
function saveSkills_(skills) {
  const sh = sheet_('skills'), last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 3).getValues().filter((r) => String(r[0]).trim()) : [];
  const at = {}; rows.forEach((r, i) => (at[String(r[0]).trim().toLowerCase()] = i));
  skills.filter((s) => String(s.name || '').trim()).forEach((s) => {
    const r = [String(s.name).trim(), String(s.category || 'Other').trim(), s.active === 'N' ? 'N' : 'Y'];
    const k = r[0].toLowerCase();
    if (k in at) rows[at[k]] = r; else { at[k] = rows.length; rows.push(r); }
  });
  if (last > 1) sh.getRange(2, 1, last - 1, 3).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, 3).setValues(rows);
}

function teamNoteRow_(n, manager) {
  if (!n || !String(n.text || '').trim()) throw new Error('Note text is required');
  const old = n.id ? read_('teamNotes').find((r) => r.ID === n.id) : null;
  return {
    ID: n.id || id_('m'), Date: old ? old.Date : (n.ts || new Date().toISOString()), Manager: old ? old.Manager : (n.manager || manager || ''),
    Note: String(n.text).trim(), Pinned: n.pinned ? 'Y' : '', Edited: old && String(old.Note) !== String(n.text).trim() ? new Date().toISOString() : (old ? old.Edited : ''),
  };
}

/* ============================== 1–10 scale switch ============================== */
// Ratings are out of 10. The first time the new version loads, ratings made on the old 1–5 scale
// are moved to a "Skill Ratings (old 1-5)" tab (kept, not deleted) so everyone starts fresh,
// and training targets set on the old scale are doubled. Runs once.
const OLD_RATINGS_TAB = 'Skill Ratings (old 1-5)';
function ensureScale10_() {
  if (String(readSettings_().scale || '') === '10') return;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (String(readSettings_().scale || '') === '10') return;
    const ss = ss_(), sh = sheet_('ratings'), last = sh.getLastRow(), w = TABS.ratings.headers.length;
    if (last > 1) {
      let arch = ss.getSheetByName(OLD_RATINGS_TAB);
      if (!arch) {
        arch = ss.insertSheet(OLD_RATINGS_TAB);
        arch.getRange(1, 1, 1, w).setValues([TABS.ratings.headers.map((h) => (h === 'Score' ? 'Score (out of 5)' : h))]).setFontWeight('bold').setBackground('#14213D').setFontColor('#F3E2C0');
        arch.setFrozenRows(1);
      }
      const vals = sh.getRange(2, 1, last - 1, w).getValues();
      arch.getRange(arch.getLastRow() + 1, 1, vals.length, w).setNumberFormat('@').setValues(vals.map((r) => r.map((c) => (c instanceof Date ? c.toISOString() : String(c)))));
      sh.getRange(2, 1, last - 1, w).clearContent();
    }
    const tr = sheet_('training'), tl = tr.getLastRow();
    if (tl > 1) {
      const rg = tr.getRange(2, TABS.training.headers.indexOf('Target') + 1, tl - 1, 1);
      rg.setValues(rg.getValues().map(([v]) => [Number(v) >= 1 && Number(v) <= 5 ? String(Number(v) * 2) : v]));
    }
    setSetting_('scale', '10');
    bumpRev_('');
  } finally { lock.releaseLock(); }
}

/* ============================== live sync ============================== */
// Every change bumps a revision number. Open portals poll it cheaply and reload when it changes.
function rev_() { const p = PropertiesService.getScriptProperties(); return { n: Number(p.getProperty('rev') || 0), by: p.getProperty('revBy') || '' }; }
function bumpRev_(by) { const p = PropertiesService.getScriptProperties(); p.setProperties({ rev: String(Number(p.getProperty('rev') || 0) + 1), revBy: String(by || '') }); }

function saveSettings_(s) {
  if (s.teamName != null) setSetting_('teamName', String(s.teamName));
  if (s.reassessDays != null) setSetting_('reassessDays', String(Number(s.reassessDays) || 45));
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
