# REST API reference
Base URL `http://localhost:5000/api`. All routes except `POST /auth/login` need `Authorization: Bearer <JWT>`.
Errors: `{ "message": "..." }` with 400 validation · 401 auth · 403 forbidden · 404 · 409 conflict · 422 criteria not met (adds `checks`).

## Auth
| Method & path | Roles | Notes |
|---|---|---|
| POST `/auth/login` | public | `{email,password}` → `{token,user}` |
| GET `/auth/me` | any | current user |
| POST `/auth/change-password` | any | `{current,password}` |

## Admin – sports, levels, athletes, users
| Method & path | Roles | Notes |
|---|---|---|
| GET `/sports` · `/levels` | any | levels sorted by order |
| POST/PUT `/sports[/:id]` | admin | includes `weights{fitness,training,skill,tournament,discipline}` |
| POST `/levels` · PUT `/levels/:id` | admin | `minOverall,minCategory,minSessions,minAttendance,requiresMedical,criteria[]` |
| GET `/athletes?q&sport&level&active` | admin, coach (own), medical, committee | decorated with latest score, medical status, injured flag |
| POST `/athletes` | admin | optional `email`+`password` creates athlete login; creates a Pending medical record |
| PUT `/athletes/:id` | admin | level is **not** editable |
| PATCH `/athletes/:id/status` | admin | `{active}` |
| GET `/users` · POST `/users` · PATCH `/users/:id/status` | admin | roles: admin, coach, medical, committee |
| GET `/coaches` · PUT `/coaches/:id` · PUT `/coaches/:id/assign` | admin (GET also committee) | assign `{athletes:[ids]}` |

## Coach
| Method & path | Notes |
|---|---|
| GET/POST `/training`, PATCH `/training/:id` | session + attendance `[{athlete,present,performance,remarks}]`, status Scheduled/Completed |
| GET/POST `/skills` | `technical,tactical,consistency,performance` (0-100), `remarks` |
| GET/POST `/fitness` | `speed,endurance,strength,agility,flexibility` |
| GET/POST `/evidence` | multipart: `athlete,title,description,video` |
| GET/POST `/tournaments`, POST `/tournaments/:id/results` | admin/coach create; result `{athlete,score,position,result}` |
| GET/POST `/achievements` | multipart with optional `certificate` |

## Medical Officer
| Method & path | Notes |
|---|---|
| GET `/medical?athlete&status` · GET `/medical/overview?q` | records / latest status per athlete |
| POST `/medical` | multipart: height, weight, blood group, condition, observations, remarks, `certificate` |
| PATCH `/medical/:id/status` | `{status: Cleared|Failed|Under Review, remarks}` (remarks required unless Cleared) |
| GET/POST `/injuries` · PATCH `/injuries/:recordId/:injuryId` | injury alerts & recovery status |

## Athlete profile & scorecard
| Method & path | Notes |
|---|---|
| GET `/athletes/:id/profile` (`me` for athlete) | lifecycle journey, live scorecard, history, medical, training, skills, tournaments, evidence, decisions |
| GET `/scorecards/:id` | `{current, history}`; today's snapshot is upserted |
| POST `/scorecards/recompute-all` | admin, committee |

## Promotion workflow
| Method & path | Roles | Notes |
|---|---|---|
| GET `/promotions?status=open` | coach, committee, admin, athlete (scoped) | |
| POST `/promotions` | coach | `{athlete,recommendation}`; 422 if criteria not met, 409 if already open |
| GET `/decisions` | committee, admin, coach, athlete (scoped) | |
| POST `/decisions` | committee | `{request,decision: Selected|Not Selected|Further Review, remarks}`; **Selected** re-validates eligibility and updates the athlete's level |
| GET `/compare?ids=a,b,c` | committee, admin | 2-4 full profiles |

## Dashboards
GET `/dashboard` (role-specific payload) · GET `/notifications`

## Six-sport / data-integrity additions
* `Sport` has `events[{name,category,unit}]`, `positions[]`, `source{name,url}`; `Athlete.eventOrPosition`; `MedicalRecord.restrictions`; `FitnessAssessment.tests[{name,result,unit}]`.
* `POST /tournaments/:id/results` accepts `event, result, resultValue, unit, sourceUrl, verificationStatus (verified|unverified|synthetic-demo)`. `verified` requires an http(s) `sourceUrl` (400 otherwise).
* `GET /athletes/:id/profile` also returns `stats` (sport-specific statistics).
