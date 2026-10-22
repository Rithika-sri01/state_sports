# State Sports Academy – Athlete Development Lifecycle System

Evidence-based athlete development and progression platform (React · Node/Express · MongoDB · JWT · Axios · Recharts).
It answers: **"Is this athlete ready for the next level based on the complete development history and supporting evidence?"** – not "does this athlete have a high score?"

## Quick start (Windows / Mac / Linux)
Prerequisites: Node.js 18+ and a MongoDB database (MongoDB Atlas free tier or local MongoDB).

```bash
# in the project root (the folder containing this README)
npm install                  # installs the "concurrently" helper
npm run setup                # installs server + client packages

cd server
cp .env.example .env         # Windows: copy .env.example .env
# edit .env -> set JWT_SECRET (any long random text) and MONGO_URI
cd ..

npm run seed                 # loads demo data into MongoDB
npm run dev                  # starts API (5000) and web app (5173) together
```
Open http://localhost:5173 · demo password for every account: **Password@123**

| Role | Email |
|---|---|
| Admin | admin@academy.in |
| Coach | coach.athletics@academy.in (also .football .badminton .cricket .basketball .volleyball) |
| Medical Officer | medical@academy.in |
| Selection Committee | committee@academy.in |
| Athlete | athlete01@academy.in … athlete30@academy.in |

`MONGO_URI` examples: local `mongodb://127.0.0.1:27017/state_sports_academy` · Atlas `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/state_sports_academy?retryWrites=true&w=majority`
(include the database name after the slash; allow your IP in Atlas → Network Access). Never commit or share `.env`.

Run parts separately if you prefer: `cd server && npm run dev` and `cd client && npm run dev`.

## Sports, events and data
Six sports: **Athletics, Football, Badminton, Cricket, Basketball, Volleyball**, each with events/positions, measurement units and the public source real data should come from (Admin → Sports / Levels / Rules → *Events & positions*). Competition results carry **event, result, rank, unit, source URL and verification status**; a result can be marked *Verified* only with a source URL. Each athlete also has sport-specific stats (Athletics times/distances, Football goals/assists, Cricket runs/wickets, …).

> **All bundled records are synthetic demo data** (`dataOrigin = synthetic-demo`, shown as "Synthetic demo" in the UI). Replace them with real public competition data (World Athletics, BWF, ESPNcricinfo, FIBA, FIVB, Kaggle) and obtain medical, attendance, assessment and selection data only from an authorised academy.

### Database
* `npm run seed` – wipes and loads the 16 app collections, or
* `database/import-db.sh [uri]` – same data via `mongoimport` (JSON in `/database`).
* `database/datasets/` – the 12 requested datasets + 6 sport-stat files as **CSV and JSON** (see its README). Load them as separate `ds_*` collections with `npm run load-datasets`.
Regenerate the JSON with `cd server && npm run export-seed`.

## Modules (4 sections each)
| Role | Sections |
|---|---|
| Admin | Dashboard · Athlete Management · Coach & User Management · Sports / Levels / Rules |
| Coach | Dashboard · My Athletes · Training Sessions & Attendance · Skill / Performance Assessment & Evidence |
| Medical Officer | Dashboard · Athlete Medical Records · Medical Examination · Medical Clearance & Injury Alerts |
| Athlete | Dashboard · My Profile & Development Journey · My Development Scorecard · Training / Tournaments / Achievements |
| Selection Committee | Dashboard · Candidate Review & Scorecards · Evidence / Performance Comparison · Decisions & Promotion |

## Try the workflow
Coach → My Athletes → open an *Eligible* athlete → **Recommend for promotion review** → Committee → Decisions & Promotion → Review & decide → *Selected*. The academy level changes **only** at that final decision; the server re-checks eligibility at that moment.
Athletes 08, 11 and 22 are new registrants (medical pending); athlete 06 shows a tournament development gap.

## Scoring (`server/src/services/scoring.js`)
Fitness = latest fitness assessment · Training = 60% mean performance in attended sessions + 40% attendance · Skill = mean of latest 3 assessments · Tournament = mean competition score · Discipline = attendance rate · **Overall = Σ(category × weight)/Σweights**, weights configurable per sport. Promotion rules per level (min overall, min per category, sessions, attendance, medical clearance) are editable in Admin. Gaps below the next-level target produce a recommended action. "Eligible" is decision support only.

## Security
bcrypt hashing · JWT with expiry · role guards + row-level checks (coaches see only their athletes, athletes only themselves) · request validation + Mongoose schema validation · helmet, CORS allow-list, login rate-limit · central error handler · secrets in `.env` · upload type/size limits.

## Folders
`server/` Express API · `client/` React (Vite) · `database/` JSON dump + datasets · `docs/API.md` REST reference · `docker-compose.yml` optional local MongoDB (`docker compose up -d`).

## Production
`npm run build` → serve `client/dist` on the same origin as the API (or set `VITE_API_URL`/`VITE_FILE_URL`), `NODE_ENV=production`, HTTPS, strong `JWT_SECRET`, durable storage for uploads.
