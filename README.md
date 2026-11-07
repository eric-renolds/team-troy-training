# Team Troy Training Portal

A free, manager-only portal for Team Troy: rate VAs' skills, pair VAs with trainers, and keep work notes.
Any VA can be a **trainer and a trainee at the same time**, and one trainer can train many VAs.

- **Website:** this repo, served by GitHub Pages (`index.html`, `styles.css`, `app.js`, `config.js`)
- **Database:** a Google Sheet ("Team Troy Training Portal")
- **API:** `Code.gs`, a Google Apps Script web app that reads and writes that sheet
- **Sign-in:** `signin/Login.gs`, a tiny separate Apps Script that confirms who is signing in with Google

## Pages

| Page | What managers do there |
|---|---|
| Home | Team snapshot, "Needs your attention" (unrated, due for re-rating, overdue training, uncovered skill gaps), biggest skill gaps, trainers, recent activity |
| Team | Search, filter and sort every VA; add VAs |
| VA profile | Skills by category, strengths and focus areas, training (as trainee and as trainer), work notes, rating history |
| Training | Board (Planned → In progress → Completed) and By trainer view; new training with **suggested best-match trainers** |
| Skill matrix | Every VA × every skill, colour-coded 1–10 (red → amber → green); click a cell to re-rate |
| Team notes | Shared notes board for all managers — post, pin, search; new notes from others show a badge |
| Settings | Team name, re-rate interval, managers and their Google emails (who can sign in), skills, light/dark mode |

**Rating scale:** 1–10 (1 Beginner … 6 Competent … 8 Strong … 10 Expert). Ratings from the old 1–5 scale were moved to the `Skill Ratings (old 1-5)` tab.

Search anything with **Ctrl K** (⌘K on Mac).

**Live sync:** every open portal checks the sheet every 10 seconds (and whenever you come back to the tab).
When another manager changes anything, your screen updates and a short message says who changed it.
Updates wait while you're typing or have a dialog open, so nothing you're working on is lost.

## Who can sign in

Managers click **Sign in with Google**. Only Google accounts listed under **Settings → Managers** get in;
anyone else sees "doesn't have access", even with the link. The Google account that owns the Apps Script is
always allowed, so it can't be locked out. Removing someone from the list locks them out immediately.
A sign-in lasts 7 days on that browser. To sign everyone out at once, delete the `sessionSecret` script
property in the API project (Project Settings → Script properties).

How it works: the portal opens the **Team Troy Sign-in** script in a popup. It runs as the person signing in,
can only see their email address, and hands Google's identity token back to the portal. `Code.gs` checks that
token with Google and the Managers list, then issues its own signed 7-day session.

## Set up (one time)

1. **Sign-in script:** create a new Apps Script project, paste `signin/Login.gs` and `signin/appsscript.json`
   (Project Settings → show manifest). Deploy → Web app → Execute as **User accessing the web app** · Access
   **Anyone with Google account**. Open the URL with `?setup=1`, approve, and copy the "sign-in audience".
2. **API:** open the sheet's Apps Script, paste `Code.gs`, set `LOGIN_AUDIENCE`, run `setup()` and approve.
   Deploy → Web app · Execute as **Me** · Access **Anyone** → copy the `/exec` URL.
3. Put both URLs in `config.js` (`API_URL`, `LOGIN_URL`) and commit.
4. Sign in with the owner account and add each manager's Google email in **Settings → Managers**.

Leave `API_URL` empty to explore the portal with sample data.

## Sheet tabs (created by `setup()`)

`VA Team`, `Managers` (who can sign in), `Skill List`, `Skill Ratings` (every rating is kept, so history is never lost), `Trainings`, `Work Notes`, `Portal Settings`, `Team Notes` (created automatically the first time someone posts).
Old v1/v2 tabs are left untouched; `setup()` copies VA names and skills from them the first time.
