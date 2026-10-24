# Team Troy Training Portal

A free, manager-only portal for Team Troy: rate VAs' skills, pair VAs with trainers, and keep work notes.
Any VA can be a **trainer and a trainee at the same time**, and one trainer can train many VAs.

- **Website:** this repo, served by GitHub Pages (`index.html`, `styles.css`, `app.js`, `config.js`)
- **Database:** a Google Sheet ("Team Troy Training Portal")
- **API:** `Code.gs`, a Google Apps Script web app bound to that sheet (the password lives only in the private script)

## Pages

| Page | What managers do there |
|---|---|
| Home | Team snapshot, "Needs your attention" (unrated, due for re-rating, overdue training, uncovered skill gaps), biggest skill gaps, trainers, recent activity |
| Team | Search, filter and sort every VA; add VAs |
| VA profile | Skills by category, strengths and focus areas, training (as trainee and as trainer), work notes, rating history |
| Training | Board (Planned → In progress → Completed) and By trainer view; new training with **suggested best-match trainers** |
| Skill matrix | Every VA × every skill, colour-coded; click a cell to re-rate |
| Settings | Team name, re-rate interval, managers (up to 3), skills, light/dark mode |

Search anything with **Ctrl K** (⌘K on Mac).

## Set up (one time)

1. Open the Google Sheet → **Extensions → Apps Script**, paste `Code.gs`, set `MANAGER_PASSWORD`, run `setup()`.
2. **Deploy → New deployment → Web app** · Execute as **Me** · Who has access **Anyone** → copy the `/exec` URL.
3. Paste that URL into `config.js` → `API_URL`, commit. Managers open the GitHub Pages link and sign in with the password.

Leave `API_URL` empty to explore the portal with sample data.

## Sheet tabs (created by `setup()`)

`VA Team`, `Skill List`, `Skill Ratings` (every rating is kept, so history is never lost), `Trainings`, `Work Notes`, `Portal Settings`.
Old v1/v2 tabs are left untouched; `setup()` copies VA names and skills from them the first time.

## Changing the password

Edit `MANAGER_PASSWORD` in Apps Script → **Deploy → Manage deployments → Edit → Version: New version → Deploy**. The URL stays the same.
