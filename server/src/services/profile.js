const { Athlete, MedicalRecord, FitnessAssessment, TrainingSession, SkillAssessment, Tournament, Achievement, TrainingEvidence, PromotionRequest, SelectionDecision, SportStat } = require('../models');
const { buildScorecard, history } = require('./scorecard');
const { fail } = require('../util');

function buildJourney({ athlete, medical, fitness, training, skills, tournaments, scorecard, promotions, decisions }) {
  const m = medical[0], req = promotions[0], dec = decisions[0];
  const closed = req && ['Approved', 'Rejected'].includes(req.status);
  const steps = [
    { name: 'Registration', done: true, date: athlete.registeredAt, detail: 'Registered at the academy' },
    { name: 'Medical Verification', done: m?.status === 'Cleared', failed: m?.status === 'Failed', date: m?.examDate, detail: m ? m.status : 'Not started' },
    { name: 'Fitness Assessment', done: fitness.length > 0, date: fitness[0]?.date, detail: fitness.length ? `Latest score ${fitness[0].score}/100` : 'Pending' },
    { name: 'Training', done: training.some(t => t.present), date: training.find(t => t.present)?.date, detail: `${training.filter(t => t.present).length} sessions attended` },
    { name: 'Skill Assessment', done: skills.length > 0, date: skills[0]?.date, detail: skills.length ? `Latest score ${skills[0].score}/100` : 'Pending' },
    { name: 'Tournament', done: tournaments.some(t => t.result), date: tournaments.find(t => t.result)?.date, detail: `${tournaments.filter(t => t.result).length} tournaments played` },
    { name: 'Development Scorecard', done: scorecard.overall > 0 && !scorecard.gaps.length, date: scorecard.computedAt, detail: scorecard.gaps.length ? `Gap: ${scorecard.gaps.map(g => g.category).join(', ')}` : `Overall ${scorecard.overall}/100` },
    { name: 'Promotion Review', done: !!req, date: req?.createdAt, detail: req ? `Coach recommended - ${req.status}` : 'Not requested' },
    { name: 'Selection Committee', done: !!closed, date: closed ? dec?.decidedAt : null, detail: dec ? dec.decision : 'Awaiting committee' },
    { name: 'Next Level', done: dec?.decision === 'Selected', date: dec?.decision === 'Selected' ? dec.decidedAt : null, detail: dec?.decision === 'Selected' ? 'Promoted' : 'Not yet promoted' },
  ];
  let cur = false;
  steps.forEach(s => { s.status = s.failed ? 'failed' : s.done ? 'done' : !cur ? 'current' : 'pending'; if (s.status === 'failed' || s.status === 'current') cur = true; });
  return steps;
}

async function loadProfile(id) {
  const athlete = await Athlete.findById(id).populate('sport level').populate('coach', 'name').lean();
  if (!athlete) throw fail(404, 'Athlete not found');
  const [medical, fitness, sessions, skills, tours, achievements, evidence, promotions, decisions, live, hist, stat] = await Promise.all([
    MedicalRecord.find({ athlete: id }).sort({ examDate: -1 }).lean(),
    FitnessAssessment.find({ athlete: id }).sort({ date: -1 }).lean(),
    TrainingSession.find({ 'attendance.athlete': id, status: 'Completed' }).sort({ date: -1 }).populate('coach', 'name').lean(),
    SkillAssessment.find({ athlete: id }).sort({ date: -1 }).lean(),
    Tournament.find({ $or: [{ 'results.athlete': id }, { sport: athlete.sport._id, date: { $gte: new Date() } }] }).sort({ date: -1 }).lean(),
    Achievement.find({ athlete: id }).sort({ date: -1 }).lean(),
    TrainingEvidence.find({ athlete: id }).sort({ date: -1 }).populate('coach', 'name').lean(),
    PromotionRequest.find({ athlete: id }).sort({ createdAt: -1 }).populate('fromLevel toLevel', 'name').lean(),
    SelectionDecision.find({ athlete: id }).sort({ decidedAt: -1 }).populate('fromLevel toLevel decidedBy', 'name').lean(),
    buildScorecard(id), history(id), SportStat.findOne({ athlete: id }).lean(),
  ]);
  const training = sessions.map(s => { const e = s.attendance.find(x => String(x.athlete) === String(id)); return { _id: s._id, title: s.title, type: s.type, date: s.date, durationMin: s.durationMin, coach: s.coach?.name, present: e.present, performance: e.performance, remarks: e.remarks }; });
  const tournaments = tours.map(t => { const r = t.results.find(x => String(x.athlete) === String(id)); return { _id: t._id, name: t.name, date: t.date, venue: t.venue, level: t.level, upcoming: new Date(t.date) >= new Date(), result: r || null }; });
  const journey = buildJourney({ athlete, medical, fitness, training, skills, tournaments, scorecard: live, promotions, decisions });
  return { athlete, journey, scorecard: live, history: hist, medical, fitness, training, skills, tournaments, achievements, evidence, promotions, decisions, stats: stat?.stats || null };
}
module.exports = { loadProfile };
