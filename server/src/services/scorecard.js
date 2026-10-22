const { Athlete, AcademyLevel, FitnessAssessment, TrainingSession, SkillAssessment, Tournament, MedicalRecord, DevelopmentScorecard } = require('../models');
const { computeScores, evaluate, weightsOf } = require('./scoring');
const { fail } = require('../util');

// Calculates the live scorecard and upserts today's snapshot (history powers the progress chart).
async function buildScorecard(athleteId, { save = true } = {}) {
  const a = await Athlete.findById(athleteId).populate('sport level').lean();
  if (!a) throw fail(404, 'Athlete not found');
  const id = a._id;
  const [next, fitness, sess, skills, tours, med] = await Promise.all([
    AcademyLevel.findOne({ order: a.level.order + 1 }).lean(),
    FitnessAssessment.find({ athlete: id }).lean(),
    TrainingSession.find({ 'attendance.athlete': id, status: 'Completed' }).select('attendance').lean(),
    SkillAssessment.find({ athlete: id }).lean(),
    Tournament.find({ 'results.athlete': id }).select('results').lean(),
    MedicalRecord.findOne({ athlete: id }).sort({ examDate: -1 }).lean(),
  ]);
  const weights = weightsOf(a.sport.weights);
  const sessions = sess.map(s => s.attendance.find(x => String(x.athlete) === String(id)));
  const tournaments = tours.map(t => t.results.find(x => String(x.athlete) === String(id)).score);
  const s = computeScores({ fitness, sessions, skills, tournaments, weights });
  const ev = evaluate(s, { rule: next, medicalStatus: med?.status, hasNext: !!next });
  const payload = { athlete: id, level: a.level._id, day: new Date().toISOString().slice(0, 10), fitness: s.fitness, training: s.training, skill: s.skill, tournament: s.tournament, discipline: s.discipline, overall: s.overall, weights, ...ev, computedAt: new Date() };
  let doc = payload;
  if (save) doc = (await DevelopmentScorecard.findOneAndUpdate({ athlete: id, day: payload.day }, payload, { upsert: true, new: true, setDefaultsOnInsert: true }).lean());
  return { ...doc, attendance: s.attendance, sessionCount: s.sessionCount, medicalStatus: med?.status || 'None', nextLevel: next ? { _id: next._id, name: next.name, minOverall: next.minOverall } : null };
}
const history = id => DevelopmentScorecard.find({ athlete: id }).sort('computedAt').select('day overall fitness training skill tournament discipline computedAt').lean();
module.exports = { buildScorecard, history };
