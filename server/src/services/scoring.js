// Pure scoring logic (no DB) - shared by the API and the seed generator.
const CATS = ['fitness', 'training', 'skill', 'tournament', 'discipline'];
const DEFAULT_WEIGHTS = { fitness: .25, training: .2, skill: .25, tournament: .2, discipline: .1 };
const ACTIONS = {
  fitness: 'Follow the strength & conditioning plan and re-test fitness before the next promotion review.',
  training: 'Increase training quality and intensity in scheduled sessions.',
  skill: 'Work on technical and tactical drills with the coach and submit fresh skill evidence.',
  tournament: 'Improve tournament performance before next promotion review - compete in more events.',
  discipline: 'Improve attendance and punctuality across all training sessions.',
};
const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const byDateDesc = arr => [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));
const cap = s => s[0].toUpperCase() + s.slice(1);

function weightsOf(w) {
  const o = { ...DEFAULT_WEIGHTS };
  CATS.forEach(c => { if (w && typeof w[c] === 'number' && w[c] >= 0) o[c] = w[c]; });
  return o;
}
function weightedOverall(s, w) {
  const W = weightsOf(w), tot = CATS.reduce((t, c) => t + W[c], 0) || 1;
  return Math.round((CATS.reduce((t, c) => t + (s[c] || 0) * W[c], 0) / tot) * 10) / 10;
}
// fitness:[{date,score}] sessions:[{present,performance}] skills:[{date,score}] tournaments:[score]
function computeScores({ fitness = [], sessions = [], skills = [], tournaments = [], weights }) {
  const present = sessions.filter(s => s.present);
  const attendance = sessions.length ? (present.length / sessions.length) * 100 : 0;
  const s = {
    fitness: Math.round(byDateDesc(fitness)[0]?.score || 0),
    training: sessions.length ? Math.round(0.6 * avg(present.map(x => x.performance || 0)) + 0.4 * attendance) : 0,
    skill: Math.round(avg(byDateDesc(skills).slice(0, 3).map(x => x.score))),
    tournament: Math.round(avg(tournaments)),
    discipline: Math.round(attendance),
  };
  s.overall = weightedOverall(s, weights);
  return { ...s, attendance: Math.round(attendance), sessionCount: sessions.length };
}
// Eligibility is DECISION SUPPORT only - it never promotes anyone.
function evaluate(s, { rule, medicalStatus, hasNext }) {
  const target = rule?.minCategory || 70;
  const gaps = CATS.filter(c => s[c] < target).map(c => ({ category: c, score: s[c], target, action: ACTIONS[c] }));
  if (!hasNext) return { gaps, checks: [{ label: 'Next academy level', pass: false, detail: 'Athlete is already at the highest level' }], eligible: false };
  const checks = [
    { label: `Overall score ≥ ${rule.minOverall}`, pass: s.overall >= rule.minOverall, detail: `Current ${s.overall}` },
    { label: `Every category ≥ ${target}`, pass: !gaps.length, detail: gaps.length ? `Below target: ${gaps.map(g => cap(g.category)).join(', ')}` : 'No development gaps' },
    { label: `Training sessions ≥ ${rule.minSessions}`, pass: s.sessionCount >= rule.minSessions, detail: `${s.sessionCount} recorded` },
    { label: `Attendance ≥ ${rule.minAttendance}%`, pass: s.attendance >= rule.minAttendance, detail: `${s.attendance}%` },
  ];
  if (rule.requiresMedical) checks.push({ label: 'Medical clearance', pass: medicalStatus === 'Cleared', detail: medicalStatus || 'No record' });
  return { gaps, checks, eligible: checks.every(c => c.pass) };
}
module.exports = { CATS, DEFAULT_WEIGHTS, ACTIONS, weightsOf, weightedOverall, computeScores, evaluate };
