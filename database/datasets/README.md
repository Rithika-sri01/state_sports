# Academy datasets (SYNTHETIC DEMO DATA)

**Every record here is invented for development.** Each row carries `dataOrigin = synthetic-demo`, competition rows also carry `verificationStatus = synthetic-demo` and an **empty `sourceUrl`** (no real source exists). Do not present any of it as real athlete data.

Files come as `.csv` and `.json` (same content). Regenerate with `node generate-datasets.js`.

## The 12 datasets
| # | File | Fields |
|---|---|---|
| 1 | 01_athletes | athleteId, name, dateOfBirth, sport, eventOrPosition, academyLevel |
| 2 | 02_sports_events | sport, event, category, position, measurementUnit |
| 3 | 03_coaches | coachId, name, specialization, assignedAthletes (`;`-separated IDs) |
| 4 | 04_medical_records | athleteId, examinationDate, clearanceStatus, restrictions |
| 5 | 05_fitness_assessments | athleteId, testName, result, unit, assessmentDate, normalizedScore* |
| 6 | 06_training_records | sessionId, sport, date, durationMin, trainingType, coachId |
| 7 | 07_attendance | athleteId, sessionId, attendanceStatus (Present/Late/Absent), performanceRating* |
| 8 | 08_skill_assessments | athleteId, skillName, score, maxScore, evaluator, assessmentDate |
| 9 | 09_competition_results | resultId, athleteId, sport, competition, competitionDate, event, result, resultValue*, unit, rank, performanceScore*, referenceSource*, **sourceUrl**, **verificationStatus** |
| 10 | 10_development_scorecards | athleteId, fitness/training/skill/competition/discipline scores, overallScore, weights |
| 11 | 11_promotion_requests | requestId, athleteId, currentLevel, requestedLevel, eligibility, coachRecommendation, status |
| 12 | 12_selection_decisions | decisionId, requestId, athleteId, decision, reason, reviewer, decisionDate |

\* Extra helper columns: `normalizedScore` / `performanceScore` / `performanceRating` are 0-100 values that feed the scorecard; `resultValue` is the numeric result (athletics); `referenceSource` names where real data for that sport should come from.

## Sport-specific stats (`sport_stats_*`)
Athletics (event, timeSeconds, distanceMetres, bestRank, personalBest) · Football (matches, goals, assists, minutesPlayed, playerPosition) · Badminton (matches, wins, losses, tournamentResults, ranking) · Cricket (matches, runs, battingAverage, wickets, bowlingFigures) · Basketball (games, points, rebounds, assists, fieldGoalPercent) · Volleyball (matches, sets, attacks, blocks, serves, playerPosition).

Size: 30 athletes (5 per sport), **30 competition records per sport** (180 total), 300 attendance rows, 240 fitness rows, 240 skill rows.

## Scorecard rule used
fitness = mean latest normalizedScore · training = mean performanceRating of attended sessions · skill = mean score/maxScore×100 (latest assessment) · competition = mean performanceScore · discipline = attendance % (Late counts as attended) · overall = 0.25 fitness + 0.20 training + 0.25 skill + 0.20 competition + 0.10 discipline.
Eligibility for a promotion request = overall ≥ next-level minimum (65/70/75/80/85) **and** medical Cleared.

## Replacing with real data
* **Competition results (public):** World Athletics, BWF, ESPNcricinfo Statsguru, FIBA, FIVB, Kaggle football datasets. For each row keep the real page in `sourceUrl`, the `competitionDate`, and set `verificationStatus` to `verified` only after you have checked it against that page. Respect each site's terms of use.
* **Private records (medical, attendance, assessments, selection decisions):** only from an authorised academy, with consent.
* Keep the same column names so the loader and app keep working.

## Load into MongoDB
Copy `server/src/seed/loadDatasets.js` into your server folder, then from `/server`: `node src/seed/loadDatasets.js`. Collections are created as `ds_athletes`, `ds_competition_results`, etc. (kept separate from the app's own collections).
