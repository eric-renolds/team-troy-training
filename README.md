# Team Troy Training Portal

A free dashboard to monitor Team Troy's VA skills and pair VAs with trainers.

- **Frontend:** this repo, hosted on GitHub Pages (static HTML/CSS/JS).
- **Database:** a Google Sheet ("Team Troy Training Portal").
- **API:** a Google Apps Script web app bound to that sheet (`Code.gs` in this repo is a copy with the password removed).

## Google Sheet tabs

| Tab | What it holds | Edit it to… |
|---|---|---|
| `VAs` | VA Name, Email (optional), Active (Y/N) | filled automatically: anyone who submits the form is added. Optionally pre-add names so "not submitted yet" is accurate; set Active = N to hide someone or a duplicate |
| `Skills` | Skill Name, Category, Source | add the team's custom skills (Source = Custom) |
| `Pairings` | ID, VA, Trainer, Trainer Type, Target Skills, Date | written by the dashboard; safe to read |
| `Ratings` | demo ratings | ignored automatically once a Google Form is linked |

## Connecting the Google Form (skill capture)

1. In the form, add a **short answer** question titled `Your Name` (the name must match the `VAs` tab).
2. Add the skills either as one **multiple-choice grid** (rows = skill names, columns = 1–5) or as separate 1–5 questions titled exactly like the skill names.
3. Responses → **Link to Sheets** → *Select existing spreadsheet* → choose "Team Troy Training Portal".
4. The dashboard reads the `Form Responses` tab automatically, and uses each VA's **latest** submission. Any form column it can't match to a skill is listed in a banner.

## Changing the password

The password is stored only in the private Apps Script project (`DASHBOARD_PASSWORD` at the top of Code.gs), not in this public repo. To change it: edit it there → **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.

## Changing the API URL

Edit `config.js` → `API_URL`. Leave it empty to preview with demo data.

## Skills form (already created)

- **Share with VAs:** https://docs.google.com/forms/d/e/1FAIpQLSdYnMugPxZp6OBOhQMBi9aN1mRK4biAJCxQ4RVKYeOtIgA8Gg/viewform
- **Edit:** https://docs.google.com/forms/d/11xX6Iyzrv9dj2-wcszLJ6WN2DPltQP57IHPyDH_Ingk/edit
- VAs **type their own name** (free text). Matching ignores capitals and extra spaces, so `maria santos` and `Maria  Santos` count as one person, but `Maria` and `Maria Santos` would be two; fix a typo by editing the name in the `Form Responses 1` tab.
- The `VA 01…16` placeholders are hidden automatically once real responses arrive.
- After changing the `Skills` tab, open the sheet → **Training Portal → Create / update skills form** to refresh the skill grids.
- The sample `Ratings` tab is used until the first real form response arrives; then the dashboard switches to `Form Responses 1`.
