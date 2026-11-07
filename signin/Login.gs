/**
 * Team Troy Training Portal — Google sign-in helper
 * -------------------------------------------------
 * A tiny, separate Apps Script project. It runs as the person signing in, asks Google who they are,
 * and passes Google's identity token back to the portal window. It can only see the user's email
 * address (see appsscript.json) and never touches the Google Sheet.
 *
 * Deploy → New deployment → Web app → Execute as: "User accessing the web app"
 *        → Who has access: "Anyone with Google account" → Deploy. Put the /exec URL in config.js → LOGIN_URL.
 */
const PORTAL_ORIGIN = 'https://eric-renolds.github.io';

function doGet(e) {
  const out = { type: 'tt-login' };
  try {
    out.idToken = ScriptApp.getIdentityToken();
    out.email = Session.getActiveUser().getEmail();
    if (!out.idToken) out.error = 'Google did not return a sign-in token.';
  } catch (err) {
    out.error = String((err && err.message) || err);
  }
  // Setup helper: ?setup=1 shows the token audience (the ID the portal's script must trust).
  if (e && e.parameter && e.parameter.setup) {
    const seg = out.idToken ? out.idToken.split('.')[1] : '';
    const aud = seg ? JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(seg + '==='.slice((seg.length + 3) % 4))).getDataAsString()).aud : '';
    return HtmlService.createHtmlOutput('<p style="font:14px sans-serif">Sign-in audience:</p><pre id="aud" style="font:13px monospace">' + aud + '</pre>');
  }
  const t = HtmlService.createTemplate(
    '<!doctype html><p style="font:15px sans-serif;color:#333;margin:24px">Signing you in to Team Troy… you can close this window if it stays open.</p>' +
    '<script>var m = <?!= msg ?>; try { window.top.opener.postMessage(m, <?!= origin ?>); } catch (e) {} setTimeout(function () { try { window.top.close(); } catch (e) {} }, 400);</script>');
  t.msg = JSON.stringify(out).replace(/</g, '\\u003c');
  t.origin = JSON.stringify(PORTAL_ORIGIN);
  return t.evaluate().setTitle('Team Troy sign-in');
}
