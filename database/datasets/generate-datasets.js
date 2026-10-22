// Generates the 12 required datasets + sport-specific stats as JSON and CSV.
// EVERY record is SYNTHETIC (dataOrigin = "synthetic-demo"). Replace with real records as you obtain them.
const fs = require('fs'), path = require('path');
let seed = 2026; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ri = (a, b) => Math.round(a + rnd() * (b - a)), rf = (a, b, d = 2) => +(a + rnd() * (b - a)).toFixed(d);
const clamp = (n, lo = 40, hi = 99) => Math.max(lo, Math.min(hi, Math.round(n))), pad = (n, l = 2) => String(n).padStart(l, '0');
const day = d => new Date(Date.UTC(2026, 9, 18) - d * 864e5).toISOString().slice(0, 10);
const ORIGIN = 'synthetic-demo';
const LEVELS = ['Academy Level 1', 'Academy Level 2', 'District Camp', 'State Camp', 'Elite Camp', 'State Team'], MIN = [0, 65, 70, 75, 80, 85];
const lvl = a => (a < 62 ? 0 : a < 68 ? 1 : a < 74 ? 2 : a < 80 ? 3 : a < 86 ? 4 : 5);
const NAMES = ['Arjun Karthik', 'Divya Lakshmi', 'Harish Kumar', 'Meena Priya', 'Surya Prakash', 'Kavya Shree', 'Naveen Raj', 'Aishwarya Devi', 'Vignesh Murugan', 'Sandhya Rani', 'Praveen Kumar', 'Janani Selvam', 'Gokul Krishnan', 'Harini Balaji', 'Dinesh Babu', 'Nandhini Ravi', 'Santhosh Kumar', 'Ramya Subramani', 'Yuvaraj Sekar', 'Pavithra Anand', 'Tharun Vel', 'Keerthana Mohan', 'Mohammed Imran', 'Deepika Suresh', 'Lokesh Waran', 'Rohit Anand', 'Swetha Narayanan', 'Bharath Kannan', 'Monica Joseph', 'Aravind Pandian'];
const COACHES = ['Ravi Chandran', 'Senthil Nathan', 'Anitha Rajan', 'Muthu Kumaran', 'Lakshmi Narayanan', 'Karthik Subbiah'];
const SPORTS = {
  Athletics: { code: 'ATH', pos: [null], ev: [['100 m', 'Track', 's'], ['200 m', 'Track', 's'], ['400 m', 'Track', 's'], ['800 m', 'Track', 's'], ['Long Jump', 'Field', 'm'], ['Javelin Throw', 'Field', 'm']], src: 'World Athletics', home: 'https://worldathletics.org', skills: ['Start & Reaction', 'Technique', 'Stride Efficiency', 'Race Tactics'] },
  Football: { code: 'FTB', pos: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'], ev: [['Match', 'Team', 'goals']], src: 'Kaggle football datasets', home: 'https://www.kaggle.com/datasets', skills: ['Passing', 'Dribbling', 'Ball Control', 'Positioning'] },
  Badminton: { code: 'BDM', pos: [null], ev: [['Singles', 'Individual', 'games'], ['Doubles', 'Individual', 'games']], src: 'Badminton World Federation', home: 'https://bwfbadminton.com', skills: ['Footwork', 'Smash', 'Net Play', 'Court Awareness'] },
  Cricket: { code: 'CRK', pos: ['Batter', 'Bowler', 'All-rounder', 'Wicket-keeper'], ev: [['T20 Match', 'Team', 'runs'], ['One-Day Match', 'Team', 'runs']], src: 'ESPNcricinfo Statsguru', home: 'https://www.espncricinfo.com', skills: ['Batting Technique', 'Bowling Accuracy', 'Fielding', 'Game Awareness'] },
  Basketball: { code: 'BKB', pos: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'], ev: [['5x5 Game', 'Team', 'points']], src: 'FIBA', home: 'https://www.fiba.basketball', skills: ['Shooting', 'Ball Handling', 'Defense', 'Court Vision'] },
  Volleyball: { code: 'VLB', pos: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero'], ev: [['Match', 'Team', 'sets']], src: 'FIVB', home: 'https://www.fivb.com', skills: ['Serving', 'Spiking', 'Blocking', 'Reception'] },
};
const COMPS = ['District Junior Championship', 'State Junior Championship', 'Inter-Academy Cup', 'Zonal Championship', 'National Junior Meet', 'Regional Open'];
const TESTS = [['30 m Sprint', 's', n => +(5.6 - (n - 50) * 0.02).toFixed(2)], ['Vertical Jump', 'cm', n => Math.round(25 + n * 0.35)], ['Yo-Yo IR1', 'level', n => +(12 + n * 0.08).toFixed(1)], ['Plank Hold', 's', n => Math.round(60 + n * 1.8)]];
const ATH = { '100 m': [13.4, .03, 's'], '200 m': [27.5, .06, 's'], '400 m': [62, .2, 's'], '800 m': [140, .5, 's'], 'Long Jump': [4.8, -.04, 'm'], 'Javelin Throw': [30, -.6, 'm'] };

const D = { athletes: [], sports_events: [], coaches: [], medical_records: [], fitness_assessments: [], training_records: [], attendance: [], skill_assessments: [], competition_results: [], development_scorecards: [], promotion_requests: [], selection_decisions: [] };
const stats = {}, meta = [];
Object.entries(SPORTS).forEach(([sport, c], si) => {
  c.ev.forEach(([event, category, unit]) => c.pos.forEach(position => D.sports_events.push({ sport, event, category, position: position || '', measurementUnit: unit, dataOrigin: ORIGIN })));
  const coachId = `CH-${c.code}`, mine = []; stats[sport] = [];
  for (let k = 0; k < 5; k++) {
    const n = si * 5 + k, ab = ri(58, 94), id = `SSA-${c.code}-${pad(k + 1, 3)}`;
    const pos = sport === 'Athletics' ? c.ev[k % 6][0] : c.pos[k % c.pos.length] || (k % 2 ? 'Singles' : 'Doubles');
    const a = { id, name: NAMES[n], ab, pos, li: lvl(ab - 9), coachId }; mine.push(a);
    D.athletes.push({ athleteId: id, name: a.name, dateOfBirth: `${2004 + ri(0, 6)}-${pad(ri(1, 12))}-${pad(ri(1, 28))}`, sport, eventOrPosition: pos, academyLevel: LEVELS[a.li], dataOrigin: ORIGIN });
  }
  D.coaches.push({ coachId, name: COACHES[si], specialization: `${sport} performance & conditioning`, assignedAthletes: mine.map(a => a.id).join(';'), dataOrigin: ORIGIN });
  const sess = [];
  for (let j = 0; j < 10; j++) { const s = { sessionId: `TS-${c.code}-${pad(j + 1, 3)}`, sport, date: day(90 - 9 * j), durationMin: [60, 90, 75, 120][j % 4], trainingType: ['Technical', 'Fitness', 'Tactical', 'Match Practice', 'Recovery'][j % 5], coachId, dataOrigin: ORIGIN }; sess.push(s); D.training_records.push(s); }

  mine.forEach((a, k) => {
    // medical
    const n = si * 5 + k; let st = 'Cleared', rs = n % 7 === 0 ? 'Avoid high-impact drills for 2 weeks' : 'None', d = 150;
    if (n % 10 === 3) { st = 'Pending'; rs = 'Awaiting examination'; d = 4; } else if (n % 13 === 4) { st = 'Under Review'; rs = 'Light training only until review'; d = 6; } else if (n === 17) { st = 'Failed'; rs = 'No training until re-examination'; d = 12; }
    D.medical_records.push({ athleteId: a.id, examinationDate: day(d), clearanceStatus: st, restrictions: rs, dataOrigin: ORIGIN }); a.med = st;
    // fitness
    let fit = 0; [120, 20].forEach(dd => TESTS.forEach(([name, unit, f]) => { const nn = clamp(a.ab + ri(-8, 8) - (dd === 120 ? 3 : 0)); D.fitness_assessments.push({ athleteId: a.id, testName: name, result: f(nn), unit, assessmentDate: day(dd), normalizedScore: nn, dataOrigin: ORIGIN }); if (dd === 20) fit += nn / 4; }));
    // attendance
    let att = 0, pres = 0, perf = 0;
    sess.forEach(s => { const r = rnd(), status = r < a.ab / 100 ? 'Present' : r < a.ab / 100 + .07 ? 'Late' : 'Absent', ok = status !== 'Absent', pr = ok ? clamp(a.ab + ri(-8, 8)) : ''; att++; if (ok) { pres++; perf += pr; } D.attendance.push({ athleteId: a.id, sessionId: s.sessionId, attendanceStatus: status, performanceRating: pr, dataOrigin: ORIGIN }); });
    // skills
    let skill = 0; [100, 15].forEach(dd => c.skills.forEach(sk => { const sc = Math.max(3, Math.min(10, Math.round((a.ab / 10 + rf(-1, 1)) * 2) / 2)); D.skill_assessments.push({ athleteId: a.id, skillName: sk, score: sc, maxScore: 10, evaluator: COACHES[si], assessmentDate: day(dd), dataOrigin: ORIGIN }); if (dd === 15) skill += sc * 10 / 4; }));
    // competition results (6 per athlete)
    const ds = Array.from({ length: 6 }, () => ri(30, 700)).sort((x, y) => y - x); let comp = 0; const vals = [];
    ds.forEach((dd, q) => {
      const nn = clamp(a.ab + ri(-7, 7)), win = rnd() < nn / 110, W = win ? 'W' : 'L'; let event, result, value = '', unit, rank;
      if (sport === 'Athletics') { event = a.pos; const [b, s, u] = ATH[event]; value = +(b - (nn - 50) * s).toFixed(2); unit = u; result = `${value} ${u}`; rank = Math.max(1, Math.min(8, Math.round((100 - nn) / 6 + ri(0, 2)))); vals.push(value); }
      else { const e = c.ev[q % c.ev.length]; event = e[0]; unit = e[2]; rank = win ? ri(1, 3) : ri(3, 8);
        if (sport === 'Football') { const x = ri(1, 4), y = ri(0, x - 1); result = win ? `W ${x}-${y}` : `L ${y}-${x}`; }
        else if (sport === 'Basketball') { const x = ri(62, 95), y = ri(48, x - 3); result = win ? `W ${x}-${y}` : `L ${y}-${x}`; }
        else if (sport === 'Volleyball') { const y = ri(0, 2); result = win ? `W 3-${y}` : `L ${y}-3`; }
        else if (sport === 'Badminton') { const y = ri(0, 1); result = win ? `W 2-${y}` : `L ${y}-2`; }
        else result = `${W} by ${ri(5, 60)} runs`; }
      comp += nn;
      D.competition_results.push({ resultId: `CR-${a.id}-${q + 1}`, athleteId: a.id, sport, competition: `${COMPS[(q + si) % 6]} (demo)`, competitionDate: day(dd), event, result, resultValue: value, unit, rank, performanceScore: nn, referenceSource: c.src, sourceUrl: '', verificationStatus: 'synthetic-demo', dataOrigin: ORIGIN });
    });
    // sport-specific stats
    const m = ri(10, 30), w = Math.round(m * (.3 + a.ab / 200)); let row;
    if (sport === 'Athletics') { const [, , u] = ATH[a.pos]; const pb = u === 's' ? Math.min(...vals) : Math.max(...vals); row = { athleteId: a.id, event: a.pos, timeSeconds: u === 's' ? pb : '', distanceMetres: u === 'm' ? pb : '', bestRank: Math.max(1, Math.round((100 - a.ab) / 8)), personalBest: `${pb} ${u}` }; }
    else if (sport === 'Football') { const f = { Goalkeeper: 0, Defender: .05, Midfielder: .2, Forward: .5 }[a.pos], g = Math.round(m * f * a.ab / 80); row = { athleteId: a.id, playerPosition: a.pos, matches: m, goals: g, assists: Math.round(m * (a.pos === 'Midfielder' ? .3 : .12)), minutesPlayed: m * ri(55, 85) }; }
    else if (sport === 'Badminton') row = { athleteId: a.id, matches: m + 5, wins: w + 3, losses: m + 5 - w - 3, tournamentResults: ['Round of 16', 'Quarter-final', 'Semi-final', 'Runner-up', 'Winner'][Math.min(4, Math.floor((a.ab - 55) / 8))], ranking: a.ab > 75 ? ri(20, 300) : '' };
    else if (sport === 'Cricket') { const bat = ['Batter', 'All-rounder', 'Wicket-keeper'].includes(a.pos), bowl = ['Bowler', 'All-rounder'].includes(a.pos), runs = bat ? ri(180, 900) : ri(20, 150), outs = Math.max(1, Math.round(m * .8)); row = { athleteId: a.id, playerPosition: a.pos, matches: m, runs, battingAverage: +(runs / outs).toFixed(2), wickets: bowl ? ri(8, 40) : 0, bowlingFigures: bowl ? `${ri(2, 5)}/${ri(15, 40)}` : '' }; }
    else if (sport === 'Basketball') { const g = m + 4; row = { athleteId: a.id, playerPosition: a.pos, games: g, points: g * ri(6, 20), rebounds: g * ri(2, a.pos === 'Center' ? 11 : 6), assists: g * ri(1, a.pos === 'Point Guard' ? 9 : 4), fieldGoalPercent: rf(35, 55, 1) }; }
    else row = { athleteId: a.id, playerPosition: a.pos, matches: m, sets: m * ri(3, 4), attacks: m * ri(8, 25), blocks: m * ri(0, 4), serves: m * ri(2, 8) };
    stats[sport].push({ ...row, dataOrigin: ORIGIN });
    a.card = { fitness: Math.round(fit), training: Math.round(pres ? perf / pres : 0), skill: Math.round(skill), competition: Math.round(comp / 6), discipline: Math.round(pres / att * 100) };
  });
  mine.forEach(a => { const s = a.card, overall = +(s.fitness * .25 + s.training * .2 + s.skill * .25 + s.competition * .2 + s.discipline * .1).toFixed(1); D.development_scorecards.push({ athleteId: a.id, fitnessScore: s.fitness, trainingScore: s.training, skillScore: s.skill, competitionScore: s.competition, disciplineScore: s.discipline, overallScore: overall, weights: 'fitness .25; training .20; skill .25; competition .20; discipline .10', calculatedDate: day(0), dataOrigin: ORIGIN }); a.overall = overall; });
  // promotion requests & decisions (eligible = overall >= next-level minimum AND medical Cleared)
  const el = mine.filter(a => a.li < 5 && a.overall >= MIN[a.li + 1] && a.med === 'Cleared');
  el.forEach((a, i) => { const status = ['Under Review', 'Approved', 'Rejected', 'Further Review'][(i + si) % 4], rid = `PR-${a.id}`;
    D.promotion_requests.push({ requestId: rid, athleteId: a.id, currentLevel: LEVELS[a.li], requestedLevel: LEVELS[a.li + 1], eligibility: 'Eligible', overallScore: a.overall, coachId, coachRecommendation: 'Consistent improvement with supporting evidence; recommended for review.', requestDate: day(ri(20, 40)), status, dataOrigin: ORIGIN });
    if (status !== 'Under Review') D.selection_decisions.push({ decisionId: `SD-${a.id}`, requestId: rid, athleteId: a.id, decision: { Approved: 'Selected', Rejected: 'Not Selected', 'Further Review': 'Further Review' }[status], reason: { Approved: 'Evidence and competition record support promotion.', Rejected: 'Competition consistency below the standard for the next level.', 'Further Review': 'Needs another assessment cycle and updated evidence.' }[status], reviewer: ['Selection Committee - Chair', 'Selection Committee - Member'][i % 2], decisionDate: day(ri(3, 18)), dataOrigin: ORIGIN }); });
});

const csv = rows => { if (!rows.length) return ''; const k = Object.keys(rows[0]); const q = v => { v = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }; return [k.join(','), ...rows.map(r => k.map(c => q(r[c])).join(','))].join('\n') + '\n'; };
const out = __dirname, files = [];
Object.keys(D).forEach((k, i) => files.push([`${pad(i + 1)}_${k}`, D[k]]));
Object.entries(stats).forEach(([s, rows]) => files.push([`sport_stats_${s.toLowerCase()}`, rows]));
files.forEach(([n, rows]) => { fs.writeFileSync(path.join(out, n + '.json'), JSON.stringify(rows, null, 1)); fs.writeFileSync(path.join(out, n + '.csv'), csv(rows)); console.log(n.padEnd(34), String(rows.length).padStart(4)); });
const cr = {}; D.competition_results.forEach(r => (cr[r.sport] = (cr[r.sport] || 0) + 1)); console.log('competition results per sport:', cr);
