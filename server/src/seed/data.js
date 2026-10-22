// Deterministic demo data generator (pure - no DB). Used by seed.js and exportSeed.js
const { Types: { ObjectId } } = require('mongoose');
const bcrypt = require('bcryptjs');
const { CATS, computeScores, evaluate, weightedOverall, weightsOf } = require('../services/scoring');

let seedv = 42; const rnd = () => (seedv = (seedv * 16807) % 2147483647) / 2147483647;
const rint = (a, b) => Math.round(a + rnd() * (b - a));
const clamp = n => Math.max(35, Math.min(99, Math.round(n)));
const DAY = 864e5, now = Date.now(), ago = d => new Date(now - d * DAY), ahead = d => new Date(now + d * DAY);
const pick = a => a[Math.floor(rnd() * a.length)];
const id = () => new ObjectId();
const SRC = { sourceUrl: '', verificationStatus: 'synthetic-demo', dataOrigin: 'synthetic-demo' };
function detail(sport, pos, score) {
  const win = rnd() < score / 110;
  if (sport === 'Athletics') { const [b, s, u] = ATH[pos]; const v = +(b - (score - 50) * s).toFixed(2); return { ...SRC, event: pos, resultValue: v, unit: u, result: `${v} ${u}` }; }
  const ev = SPORT_META[sport].events[0]; let result;
  if (sport === 'Football') { const x = rint(1, 4), y = rint(0, x - 1); result = win ? `W ${x}-${y}` : `L ${y}-${x}`; }
  else if (sport === 'Basketball') { const x = rint(62, 95), y = rint(48, x - 3); result = win ? `W ${x}-${y}` : `L ${y}-${x}`; }
  else if (sport === 'Volleyball') { const y = rint(0, 2); result = win ? `W 3-${y}` : `L ${y}-3`; }
  else if (sport === 'Badminton') { const y = rint(0, 1); result = win ? `W 2-${y}` : `L ${y}-2`; }
  else result = `${win ? 'W' : 'L'} by ${rint(5, 60)} runs`;
  return { ...SRC, event: sport === 'Badminton' ? pos : ev[0], unit: ev[2], result };
}
const fitTests = f => [{ name: '30 m Sprint', result: +(5.6 - (f.speed - 50) * 0.02).toFixed(2), unit: 's' }, { name: 'Yo-Yo IR1', result: +(12 + f.endurance * 0.08).toFixed(1), unit: 'level' }, { name: 'Plank Hold', result: Math.round(60 + f.strength * 1.8), unit: 's' }, { name: 'Vertical Jump', result: Math.round(25 + f.agility * 0.35), unit: 'cm' }, { name: 'Sit & Reach', result: Math.round(8 + f.flexibility * 0.3), unit: 'cm' }];
function statsFor(sport, a) {
  const m = rint(10, 30), w = Math.round(m * (.3 + a.base / 200)), pos = a.eventOrPosition;
  if (sport === 'Athletics') { const [b, s, u] = ATH[pos]; const v = +(b - (a.cat.tournament - 50) * s).toFixed(2); return { event: pos, timeSeconds: u === 's' ? v : null, distanceMetres: u === 'm' ? v : null, bestRank: Math.max(1, Math.round((100 - a.base) / 8)), personalBest: `${v} ${u}` }; }
  if (sport === 'Football') { const f = { Goalkeeper: 0, Defender: .05, Midfielder: .2, Forward: .5 }[pos]; return { playerPosition: pos, matches: m, goals: Math.round(m * f * a.base / 80), assists: Math.round(m * (pos === 'Midfielder' ? .3 : .12)), minutesPlayed: m * rint(55, 85) }; }
  if (sport === 'Badminton') return { matches: m + 5, wins: w + 3, losses: m + 5 - w - 3, tournamentResults: ['Round of 16', 'Quarter-final', 'Semi-final', 'Runner-up', 'Winner'][Math.max(0, Math.min(4, Math.floor((a.base - 55) / 8)))], ranking: a.base > 75 ? rint(20, 300) : null };
  if (sport === 'Cricket') { const bat = ['Batter', 'All-rounder', 'Wicket-keeper'].includes(pos), bowl = ['Bowler', 'All-rounder'].includes(pos), runs = bat ? rint(180, 900) : rint(20, 150); return { playerPosition: pos, matches: m, runs, battingAverage: +(runs / Math.max(1, Math.round(m * .8))).toFixed(2), wickets: bowl ? rint(8, 40) : 0, bowlingFigures: bowl ? `${rint(2, 5)}/${rint(15, 40)}` : null }; }
  if (sport === 'Basketball') { const g = m + 4; return { playerPosition: pos, games: g, points: g * rint(6, 20), rebounds: g * rint(2, pos === 'Center' ? 11 : 6), assists: g * rint(1, pos === 'Point Guard' ? 9 : 4), fieldGoalPercent: +(35 + rnd() * 20).toFixed(1) }; }
  return { playerPosition: pos, matches: m, sets: m * rint(3, 4), attacks: m * rint(8, 25), blocks: m * rint(0, 4), serves: m * rint(2, 8) };
}

const SPORTS = [
  ['Athletics', 'ATH', 'Track & field events', { fitness: .3, training: .2, skill: .2, tournament: .2, discipline: .1 }],
  ['Football', 'FTB', 'Association football', { fitness: .2, training: .2, skill: .3, tournament: .2, discipline: .1 }],
  ['Badminton', 'BDM', 'Singles & doubles', { fitness: .2, training: .2, skill: .3, tournament: .2, discipline: .1 }],
  ['Cricket', 'CRK', 'Batting, bowling & fielding', { fitness: .2, training: .2, skill: .3, tournament: .2, discipline: .1 }],
  ['Basketball', 'BKB', '5x5 basketball', { fitness: .25, training: .2, skill: .25, tournament: .2, discipline: .1 }],
  ['Volleyball', 'VLB', 'Indoor volleyball', { fitness: .25, training: .2, skill: .25, tournament: .2, discipline: .1 }],
];
// events, positions and the reference source where REAL public results should be collected from
const SPORT_META = {
  Athletics: { events: [['100 m', 'Track', 's'], ['200 m', 'Track', 's'], ['400 m', 'Track', 's'], ['800 m', 'Track', 's'], ['Long Jump', 'Field', 'm'], ['Javelin Throw', 'Field', 'm']], positions: [], source: ['World Athletics', 'https://worldathletics.org'] },
  Football: { events: [['Match', 'Team', 'goals']], positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'], source: ['Kaggle football datasets', 'https://www.kaggle.com/datasets'] },
  Badminton: { events: [['Singles', 'Individual', 'games'], ['Doubles', 'Individual', 'games']], positions: [], source: ['Badminton World Federation', 'https://bwfbadminton.com'] },
  Cricket: { events: [['T20 Match', 'Team', 'runs'], ['One-Day Match', 'Team', 'runs']], positions: ['Batter', 'Bowler', 'All-rounder', 'Wicket-keeper'], source: ['ESPNcricinfo Statsguru', 'https://www.espncricinfo.com'] },
  Basketball: { events: [['5x5 Game', 'Team', 'points']], positions: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'], source: ['FIBA', 'https://www.fiba.basketball'] },
  Volleyball: { events: [['Match', 'Team', 'sets']], positions: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero'], source: ['FIVB', 'https://www.fivb.com'] },
};
const ATH = { '100 m': [13.4, .03, 's'], '200 m': [27.5, .06, 's'], '400 m': [62, .2, 's'], '800 m': [140, .5, 's'], 'Long Jump': [4.8, -.04, 'm'], 'Javelin Throw': [30, -.6, 'm'] };
const L = (name, description, minOverall, minCategory, minSessions, minAttendance, criteria) => ({ name, description, minOverall, minCategory, minSessions, minAttendance, requiresMedical: true, criteria });
const LEVELS = [
  L('Academy Level 1', 'Entry level - foundation skills and conditioning', 0, 0, 0, 0, ['Registration completed', 'Medical verification completed', 'Baseline fitness assessment recorded']),
  L('Academy Level 2', 'Structured technical development', 65, 55, 6, 70, ['Overall development score of 65+', 'No category below 55', 'Minimum 70% attendance', 'Medical clearance valid']),
  L('District Camp', 'District-level competitive exposure', 70, 60, 8, 75, ['Overall development score of 70+', 'No category below 60', 'At least one tournament result', 'Coach recommendation']),
  L('State Camp', 'State-level preparation camp', 75, 65, 10, 75, ['Overall development score of 75+', 'No category below 65', 'Consistent skill assessments', 'Coach recommendation and committee review']),
  L('Elite Camp', 'High-performance elite training', 80, 68, 12, 80, ['Overall development score of 80+', 'No category below 68', '80% attendance', 'Evidence videos reviewed by committee']),
  L('State Team', 'Represents the state in national competitions', 85, 70, 12, 80, ['Overall development score of 85+', 'No category below 70', 'Clean medical clearance', 'Final selection committee approval']),
];
const NAMES = ['Arjun Karthik', 'Divya Lakshmi', 'Harish Kumar', 'Meena Priya', 'Surya Prakash', 'Kavya Shree', 'Naveen Raj', 'Aishwarya Devi', 'Vignesh Murugan', 'Sandhya Rani', 'Praveen Kumar', 'Janani Selvam', 'Gokul Krishnan', 'Harini Balaji', 'Dinesh Babu', 'Nandhini Ravi', 'Santhosh Kumar', 'Ramya Subramani', 'Yuvaraj Sekar', 'Pavithra Anand', 'Tharun Vel', 'Keerthana Mohan', 'Mohammed Imran', 'Deepika Suresh', 'Lokesh Waran', 'Rohit Anand', 'Swetha Narayanan', 'Bharath Kannan', 'Monica Joseph', 'Aravind Pandian'];
const COACHES = ['Ravi Chandran', 'Senthil Nathan', 'Anitha Rajan', 'Muthu Kumaran', 'Lakshmi Narayanan', 'Karthik Subbiah'];
const DISTRICTS = ['Erode', 'Coimbatore', 'Salem', 'Chennai', 'Madurai', 'Tiruppur', 'Trichy', 'Namakkal'];
const TYPES = ['Technical', 'Fitness', 'Tactical', 'Match Practice', 'Recovery'];
const TITLES = ['Fundamentals drill', 'Conditioning circuit', 'Tactical walk-through', 'Practice match', 'Speed & agility', 'Recovery & mobility'];
const EVID = ['Technique drill - front angle', 'Match-practice clip', 'Speed and agility drill', 'Footwork analysis', 'Endurance block recording'];
const VIDEO_FILES = [
  '/sports-videos/athletics/13338679_1080_1920_30fps.mp4',
  '/sports-videos/athletics/15786525_2160_3840_25fps.mp4',
  '/sports-videos/athletics/8456719-hd_1080_1920_25fps.mp4',
  '/sports-videos/football/18234770-uhd_3840_2160_60fps.mp4',
  '/sports-videos/football/6077690-uhd_3840_2160_25fps.mp4',
  '/sports-videos/football/6084028-uhd_2160_3840_25fps.mp4',
];
const VIDEO = () => pick(VIDEO_FILES);

function buildSeed() {
  const hash = bcrypt.hashSync('Password@123', 10), day = d => d.toISOString().slice(0, 10);
  const users = [], coaches = [], athletes = [], medical = [], fitness = [], sessions = [], skills = [], tournaments = [], achievements = [], evidence = [], cards = [], requests = [], decisions = [];
  const U = (name, email, role, extra = {}) => { const u = { _id: id(), name, email, password: hash, role, active: true, phone: `+91 9${rint(100000000, 999999999)}`, ...extra }; users.push(u); return u; };
  const sports = SPORTS.map(([name, code, description, weights]) => { const M = SPORT_META[name]; return { _id: id(), name, code, description, weights, active: true, events: M.events.map(([n, category, unit]) => ({ name: n, category, unit })), positions: M.positions, source: { name: M.source[0], url: M.source[1] } }; });
  const levels = LEVELS.map((l, i) => ({ _id: id(), order: i + 1, ...l }));
  U('Dr. Meenakshi Sundaram', 'admin@academy.in', 'admin'); const med = U('Dr. Priya Raghavan', 'medical@academy.in', 'medical');
  const chair = U('Selection Committee - Chair', 'committee@academy.in', 'committee'); U('Selection Committee - Member', 'committee2@academy.in', 'committee');
  sports.forEach((sp, i) => { const u = U(COACHES[i], `coach.${sp.name.toLowerCase()}@academy.in`, 'coach'); coaches.push({ _id: id(), user: u._id, name: u.name, sport: sp._id, specialization: `${sp.name} performance`, experience: rint(6, 18), phone: u.phone }); });

  const idx = [0, 0, 1, 1, 2, 2, 3, 3, 4, 0, 1, 2, 3, 4, 1, 2, 3, 0, 1, 2, 3, 4, 5, 2, 3, 1, 2, 3, 4, 0];
  const boosted = [2, 8, 13, 16, 19, 26, 28], newbies = [7, 10, 21], medBlock = { 7: 'Under Review', 10: 'Pending', 21: 'Pending' };
  NAMES.forEach((name, i) => {
    const sport = sports[i % 6], coach = coaches[i % 6], li = idx[i], isNew = newbies.includes(i);
    const k5 = Math.floor(i / 6), M = SPORT_META[sport.name], pos = sport.name === 'Athletics' ? M.events[k5 % M.events.length][0] : M.positions.length ? M.positions[k5 % M.positions.length] : (k5 % 2 ? 'Singles' : 'Doubles');
    const u = U(name, `athlete${String(i + 1).padStart(2, '0')}@academy.in`, 'athlete');
    let base = [60, 68, 74, 79, 84, 89][li] + rint(-4, 5);
    if (boosted.includes(i) && li < 5) base = levels[li + 1].minOverall + rint(6, 10);
    const cat = {}; CATS.forEach(c => (cat[c] = clamp(base + rint(-5, 5))));
    if (boosted.includes(i)) cat.discipline = clamp(Math.max(cat.discipline, 92));
    if (i === 5) { cat.tournament = clamp(base - 22); cat.discipline = 93; }
    const a = { _id: id(), athleteId: `SSA-2026-${String(i + 1).padStart(4, '0')}`, name, dob: new Date(2004 + rint(0, 5), rint(0, 11), rint(1, 28)), gender: ['Divya Lakshmi', 'Meena Priya', 'Kavya Shree', 'Aishwarya Devi', 'Sandhya Rani', 'Janani Selvam', 'Harini Balaji', 'Nandhini Ravi', 'Ramya Subramani', 'Pavithra Anand', 'Keerthana Mohan', 'Deepika Suresh', 'Swetha Narayanan', 'Monica Joseph'].includes(name) ? 'Female' : 'Male', phone: `+91 9${rint(100000000, 999999999)}`, district: pick(DISTRICTS), guardian: `${name.split(' ')[1]} (Parent)`, sport: sport._id, eventOrPosition: pos, level: levels[li]._id, coach: coach._id, user: u._id, active: i !== 17, registeredAt: ago(isNew ? 10 : rint(200, 420)), cat, isNew, li, base };
    athletes.push(a);
  });

  // medical records (history: 1-2 records per athlete)
  athletes.forEach((a, i) => {
    const mk = (status, d, extra = {}) => medical.push({ _id: id(), athlete: a._id, examDate: ago(d), heightCm: rint(158, 190), weightKg: rint(52, 86), bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'O-', 'B-']), condition: status === 'Failed' ? 'Stress-related knee strain' : 'Fit for sports training', restrictions: status === 'Failed' ? 'No training until re-examination' : status === 'Cleared' ? (i % 7 === 0 ? 'Avoid high-impact drills for 2 weeks' : 'None') : 'Awaiting decision', observations: 'Cardio-respiratory and musculoskeletal examination completed.', remarks: status === 'Failed' ? 'Re-examination required after physiotherapy.' : 'No contraindications noted.', status, examiner: users.find(u => u.role === 'medical')._id, injuries: [], ...extra });
    if (a.isNew) return mk(medBlock[i], 3);
    if (i === 4) mk('Failed', 210);
    mk('Cleared', 150);
    if (i === 15) mk('Under Review', 3, { remarks: 'Re-examination after ankle sprain.' });
    const last = medical.filter(m => String(m.athlete) === String(a._id)).sort((x, y) => y.examDate - x.examDate)[0];
    if (i === 3) last.injuries.push({ _id: id(), type: 'Ankle sprain', bodyPart: 'Right ankle', severity: 'Moderate', date: ago(18), status: 'Recovering', notes: 'Physio 3x/week.', recordedBy: med._id });
    if (i === 12) last.injuries.push({ _id: id(), type: 'Hamstring strain', bodyPart: 'Left hamstring', severity: 'Moderate', date: ago(9), status: 'Active', notes: 'Rest for 2 weeks.', recordedBy: med._id });
    if (i === 18) last.injuries.push({ _id: id(), type: 'Shoulder soreness', bodyPart: 'Right shoulder', severity: 'Minor', date: ago(5), status: 'Active', notes: 'Reduce overhead load.', recordedBy: med._id });
    if (i === 1) last.injuries.push({ _id: id(), type: 'Shin splints', bodyPart: 'Left shin', severity: 'Minor', date: ago(70), status: 'Recovered', recordedBy: med._id });
  });

  // training sessions per sport (completed history + scheduled today)
  sports.forEach((sp, si) => {
    const coach = coaches[si], group = athletes.filter(a => String(a.sport) === String(sp._id) && !a.isNew);
    for (let k = 0; k < 14; k++) sessions.push({ _id: id(), sport: sp._id, coach: coach._id, title: `${TITLES[k % 6]}`, type: TYPES[k % 5], date: ago(84 - 6 * k), durationMin: [60, 90, 75, 120][k % 4], status: 'Completed', remarks: 'Session completed as planned.', attendance: group.map(a => { const present = rnd() < a.cat.discipline / 100; return { athlete: a._id, present, performance: present ? clamp(a.cat.training + rint(-6, 6)) : 0, remarks: present ? '' : 'Absent' }; }) });
    const t = new Date(); t.setHours(6, 30, 0, 0);
    sessions.push({ _id: id(), sport: sp._id, coach: coach._id, title: 'Morning conditioning', type: 'Fitness', date: t, durationMin: 90, status: 'Scheduled', remarks: 'Scheduled - mark attendance after the session.', attendance: group.map(a => ({ athlete: a._id, present: false, performance: 0 })) });
    // tournaments
    [['Inter-Academy Cup', 75, 'Inter-Academy', 'SDAT Stadium, Chennai'], ['District Championship', 25, 'District', 'District Sports Complex, Erode']].forEach(([n, d, lv, venue]) => {
      const res = group.map(a => ({ athlete: a._id, pos: a.eventOrPosition, score: clamp(a.cat.tournament + rint(-5, 5)) })).sort((x, y) => y.score - x.score).map(({ pos, ...r }, p) => ({ ...r, ...detail(sp.name, pos, r.score), position: p + 1, remarks: p === 0 ? 'Gold' : p === 1 ? 'Silver' : p === 2 ? 'Bronze' : 'Participant' }));
      tournaments.push({ _id: id(), name: `${sp.name} ${n}`, sport: sp._id, date: ago(d), venue, level: lv, results: res });
    });
    tournaments.push({ _id: id(), name: `${sp.name} State Open`, sport: sp._id, date: ahead(18 + si * 3), venue: 'Jawaharlal Nehru Stadium, Chennai', level: 'State', results: [] });
    tournaments.push({ _id: id(), name: `${sp.name} South Zone Meet`, sport: sp._id, date: ahead(45 + si * 2), venue: 'Kanteerava Stadium, Bengaluru', level: 'National', results: [] });
  });

  athletes.forEach((a, i) => {
    if (a.isNew) return;
    const coach = coaches.find(c => String(c.sport) === String(a.sport));
    [120, 60, 10].forEach((d, k) => { const base = a.cat.fitness - (2 - k) * 3; const t = () => clamp(base + rint(-6, 6)); const f = { speed: t(), endurance: t(), strength: t(), agility: t(), flexibility: t() }; fitness.push({ _id: id(), athlete: a._id, date: ago(d), ...f, score: Math.round(Object.values(f).reduce((s, x) => s + x, 0) / 5), tests: fitTests(f), remarks: 'Periodic fitness test', assessor: coach.user }); });
    const mine = [];
    [100, 70, 40, 12].forEach((d, k) => { const base = a.cat.skill - (3 - k) * 2; const t = () => clamp(base + rint(-5, 5)); const s = { technical: t(), tactical: t(), consistency: t(), performance: t() }; const doc = { _id: id(), athlete: a._id, coach: coach._id, date: ago(d), ...s, score: Math.round(Object.values(s).reduce((x, y) => x + y, 0) / 4), remarks: pick(['Good progress on fundamentals.', 'Needs sharper decision-making under pressure.', 'Consistent effort; maintain intensity.']) }; skills.push(doc); mine.push(doc); });
    evidence.push({ _id: id(), athlete: a._id, coach: coach._id, skillAssessment: mine[3]._id, title: pick(EVID), description: 'Training clip reviewed with the coach and linked to the latest skill assessment.', videoUrl: VIDEO(), date: ago(rint(3, 40)) });
    if (a.base >= 74) achievements.push({ _id: id(), athlete: a._id, title: pick(['District Championship - Medal', 'Best Performer - Academy Camp', 'State Level Participation Certificate']), category: pick(['Medal', 'Certificate', 'Award']), date: ago(rint(20, 150)), description: 'Recognised for outstanding performance.' });
  });

  // scorecards: monthly history + live snapshot, using the same pure scoring code as the API
  const evalFor = new Map();
  athletes.forEach((a, i) => {
    const sport = sports.find(s => String(s._id) === String(a.sport)), next = levels[a.li + 1], w = weightsOf(sport.weights);
    const f = fitness.filter(x => String(x.athlete) === String(a._id)), sk = skills.filter(x => String(x.athlete) === String(a._id));
    const ses = sessions.filter(s => s.status === 'Completed').map(s => s.attendance.find(x => String(x.athlete) === String(a._id))).filter(Boolean);
    const tr = tournaments.flatMap(t => t.results.filter(x => String(x.athlete) === String(a._id)).map(x => x.score));
    const s = computeScores({ fitness: f, sessions: ses, skills: sk, tournaments: tr, weights: w });
    const medStatus = medical.filter(m => String(m.athlete) === String(a._id)).sort((x, y) => y.examDate - x.examDate)[0]?.status;
    const ev = evaluate(s, { rule: next, medicalStatus: medStatus, hasNext: !!next }); evalFor.set(String(a._id), { s, ev });
    const steps = a.isNew ? [0] : [150, 120, 90, 60, 30, 0], g = Object.fromEntries(CATS.map(c => [c, rint(1, 4)]));
    steps.forEach(d => { const k = d / 30, last = d === 0; const sc = last ? s : Object.fromEntries(CATS.map(c => [c, clamp(s[c] - Math.round(k * g[c]))]));
      const overall = last ? s.overall : weightedOverall(sc, w);
      cards.push({ _id: id(), athlete: a._id, level: a.level, day: day(ago(d)), ...Object.fromEntries(CATS.map(c => [c, sc[c]])), overall, weights: w, gaps: last ? ev.gaps : [], checks: last ? ev.checks : [], eligible: last ? ev.eligible : false, computedAt: ago(d) });
    });
  });
  const latest = id => cards.find(c => String(c.athlete) === String(id) && c.day === day(new Date()));

  // promotion workflow demo: open requests for eligible athletes, plus historic decisions
  const act = athletes.filter(a => a.active);
  const eligible = act.filter(a => evalFor.get(String(a._id)).ev.eligible);
  eligible.slice(0, 3).forEach((a, k) => { if (k === 2) return; requests.push({ _id: id(), athlete: a._id, fromLevel: a.level, toLevel: levels[a.li + 1]._id, scorecard: latest(a._id)._id, requestedBy: coaches.find(c => String(c.sport) === String(a.sport)).user, recommendation: 'Consistent improvement across all categories with strong evidence videos. Recommended for promotion.', status: 'Under Review', createdAt: ago(4) }); });
  const past = act.filter(a => a.li >= 1 && !eligible.includes(a) && !a.isNew);
  const [p1, p2, p3] = past;
  if (p1) { const r = { _id: id(), athlete: p1._id, fromLevel: levels[p1.li - 1]._id, toLevel: p1.level, requestedBy: coaches.find(c => String(c.sport) === String(p1.sport)).user, recommendation: 'Met all criteria after two strong tournament results.', status: 'Approved', createdAt: ago(50) }; requests.push(r); decisions.push({ _id: id(), request: r._id, athlete: p1._id, fromLevel: r.fromLevel, toLevel: r.toLevel, decision: 'Selected', remarks: 'Evidence and tournament record support promotion.', decidedBy: chair._id, decidedAt: ago(45) }); }
  if (p2) { const r = { _id: id(), athlete: p2._id, fromLevel: p2.level, toLevel: levels[p2.li + 1]._id, requestedBy: coaches.find(c => String(c.sport) === String(p2.sport)).user, recommendation: 'Good attendance; coach recommends review.', status: 'Rejected', createdAt: ago(40) }; requests.push(r); decisions.push({ _id: id(), request: r._id, athlete: p2._id, fromLevel: r.fromLevel, toLevel: r.toLevel, decision: 'Not Selected', remarks: 'Tournament consistency is below the expected standard for the next level.', decidedBy: chair._id, decidedAt: ago(30) }); }
  if (p3) { const r = { _id: id(), athlete: p3._id, fromLevel: p3.level, toLevel: levels[p3.li + 1]?._id || p3.level, requestedBy: coaches.find(c => String(c.sport) === String(p3.sport)).user, recommendation: 'Borderline case - requesting committee review.', status: 'Further Review', createdAt: ago(14) }; requests.push(r); decisions.push({ _id: id(), request: r._id, athlete: p3._id, fromLevel: r.fromLevel, toLevel: r.toLevel, decision: 'Further Review', remarks: 'Need one more assessment cycle and updated video evidence.', decidedBy: chair._id, decidedAt: ago(10) }); }

  const sportstats = athletes.filter(a => !a.isNew).map(a => ({ _id: id(), athlete: a._id, sport: a.sport, stats: statsFor(sports.find(x => String(x._id) === String(a.sport)).name, a), dataOrigin: 'synthetic-demo' }));
  return { users, sports, academylevels: levels, coaches, athletes: athletes.map(({ cat, isNew, li, base, ...a }) => a), medicalrecords: medical, fitnessassessments: fitness, trainingsessions: sessions, skillassessments: skills, tournaments, achievements, trainingevidences: evidence, developmentscorecards: cards, promotionrequests: requests, selectiondecisions: decisions, sportstats };
}
module.exports = { buildSeed };
