const r = require('express').Router();
const { Athlete, Coach, Sport, AcademyLevel, TrainingSession, SkillAssessment, MedicalRecord, Tournament, Achievement, TrainingEvidence, PromotionRequest, SelectionDecision, DevelopmentScorecard } = require('../models');
const { wrap, OPEN } = require('../util');
const { decorate, latestMedical } = require('../services/decorate');
const { loadProfile } = require('../services/profile');
const day = 864e5;
const count = (items, key) => { const m = {}; items.forEach(i => { const k = key(i); m[k] = (m[k] || 0) + 1; }); return m; };

async function activities(limit = 8) {
  const [t, s, m, d, e] = await Promise.all([
    TrainingSession.find().sort({ date: -1 }).limit(4).populate('coach', 'name').lean(),
    SkillAssessment.find().sort({ date: -1 }).limit(4).populate('athlete', 'name').lean(),
    MedicalRecord.find().sort({ updatedAt: -1 }).limit(4).populate('athlete', 'name').lean(),
    SelectionDecision.find().sort({ decidedAt: -1 }).limit(3).populate('athlete', 'name').lean(),
    TrainingEvidence.find().sort({ date: -1 }).limit(3).populate('athlete', 'name').lean(),
  ]);
  return [
    ...t.map(x => ({ type: 'Training', text: `${x.coach?.name} logged "${x.title}"`, date: x.date })),
    ...s.map(x => ({ type: 'Assessment', text: `Skill assessment for ${x.athlete?.name}: ${x.score}/100`, date: x.date })),
    ...m.map(x => ({ type: 'Medical', text: `Medical record for ${x.athlete?.name}: ${x.status}`, date: x.updatedAt })),
    ...d.map(x => ({ type: 'Decision', text: `${x.athlete?.name}: ${x.decision}`, date: x.decidedAt })),
    ...e.map(x => ({ type: 'Evidence', text: `Evidence "${x.title}" added for ${x.athlete?.name}`, date: x.date })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

r.get('/dashboard', wrap(async (req, res) => {
  const role = req.user.role;
  if (role === 'admin') {
    const [athletes, coaches, open, med, sel, sports, levels, events, acts] = await Promise.all([
      Athlete.find({}, 'sport level active').lean(), Coach.find().populate('user', 'active').lean(), PromotionRequest.countDocuments({ status: { $in: OPEN } }), latestMedical(),
      SelectionDecision.find({ decision: 'Selected' }).sort({ decidedAt: -1 }).limit(5).populate('athlete', 'name').populate('fromLevel toLevel', 'name').lean(),
      Sport.find().lean(), AcademyLevel.find().sort('order').lean(), Tournament.find({ date: { $gte: new Date() } }).sort('date').limit(5).populate('sport', 'name').lean(), activities(),
    ]);
    const L = count(athletes, a => a.level), S = count(athletes, a => a.sport);
    return res.json({
      totalAthletes: athletes.length, activeAthletes: athletes.filter(a => a.active).length, activeCoaches: coaches.filter(c => c.user?.active).length,
      pendingReviews: open + med.filter(m => ['Pending', 'Under Review'].includes(m.status)).length, openPromotions: open, promotions: await SelectionDecision.countDocuments({ decision: 'Selected' }),
      byLevel: levels.map(l => ({ name: l.name, count: L[l._id] || 0 })), bySport: sports.map(s => ({ name: s.name, count: S[s._id] || 0 })),
      recentActivities: acts, recentPromotions: sel, upcomingEvents: events,
    });
  }
  if (role === 'coach') {
    const mine = await Athlete.find({ coach: req.coach._id }).populate('sport level').lean(), ids = mine.map(a => a._id);
    const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(+start + day);
    const [sessions, today, skills, reqs] = await Promise.all([
      TrainingSession.find({ coach: req.coach._id }).sort({ date: -1 }).limit(60).lean(), TrainingSession.find({ coach: req.coach._id, date: { $gte: start, $lt: end } }).lean(),
      SkillAssessment.aggregate([{ $match: { athlete: { $in: ids } } }, { $sort: { date: -1 } }, { $group: { _id: '$athlete', date: { $first: '$date' } } }]),
      PromotionRequest.find({ athlete: { $in: ids }, status: { $in: OPEN } }).populate('athlete', 'name').populate('toLevel', 'name').lean(),
    ]);
    const last = Object.fromEntries(skills.map(s => [s._id, s.date]));
    const pending = mine.filter(a => !last[a._id] || Date.now() - new Date(last[a._id]) > 30 * day).map(a => ({ _id: a._id, name: a.name, athleteId: a.athleteId, lastAssessed: last[a._id] || null }));
    const weeks = [5, 4, 3, 2, 1, 0].map(w => {
      const from = Date.now() - (w + 1) * 7 * day, to = Date.now() - w * 7 * day; const ss = sessions.filter(s => s.status === 'Completed' && +new Date(s.date) >= from && +new Date(s.date) < to);
      const ent = ss.flatMap(s => s.attendance); return { week: w === 0 ? 'This wk' : `${w}w ago`, sessions: ss.length, attendance: ent.length ? Math.round(ent.filter(e => e.present).length / ent.length * 100) : 0 };
    });
    const dec = await decorate(mine);
    return res.json({
      myAthletes: mine.length, todaysTraining: today.length, pendingAssessments: pending.length, promotionRequests: reqs.length, today, pending, requests: reqs, weeks,
      performance: dec.map(a => ({ name: a.name.split(' ')[0], overall: a.score?.overall || 0 })).sort((a, b) => b.overall - a.overall),
      recentSessions: sessions.filter(s => s.status === 'Completed').slice(0, 5).map(s => ({ _id: s._id, title: s.title, type: s.type, date: s.date, durationMin: s.durationMin, present: s.attendance.filter(a => a.present).length, total: s.attendance.length })),
    });
  }
  if (role === 'medical') {
    const [med, recent, inj] = await Promise.all([latestMedical(), MedicalRecord.find().sort({ updatedAt: -1 }).limit(6).populate('athlete', 'name athleteId').lean(), MedicalRecord.aggregate([{ $unwind: '$injuries' }, { $match: { 'injuries.status': 'Active' } }, { $group: { _id: '$athlete' } }])]);
    const c = count(med, m => m.status);
    return res.json({ pending: c.Pending || 0, cleared: c.Cleared || 0, underReview: c['Under Review'] || 0, failed: c.Failed || 0, injured: inj.length, chart: ['Pending', 'Cleared', 'Under Review', 'Failed'].map(n => ({ name: n, count: c[n] || 0 })), recent });
  }
  if (role === 'athlete') {
    if (!req.athlete) return res.status(404).json({ message: 'No athlete profile linked to this account' });
    const p = await loadProfile(req.athlete._id), sc = p.scorecard, passed = sc.checks.filter(c => c.pass).length;
    return res.json({ athlete: p.athlete, scorecard: sc, progress: sc.checks.length ? Math.round(passed / sc.checks.length * 100) : 100, history: p.history, fitnessScore: sc.fitness, trainingScore: sc.training, skillScore: sc.skill, recentTraining: p.training.slice(0, 5), upcoming: p.tournaments.filter(t => t.upcoming).slice(0, 4), achievements: p.achievements.slice(0, 4), journey: p.journey });
  }
  // committee
  const [athletes, open, decisions, sports] = await Promise.all([Athlete.find({ active: true }).populate('sport').lean(), PromotionRequest.find({ status: { $in: OPEN } }).populate('athlete', 'name athleteId').populate('toLevel', 'name').lean(), SelectionDecision.find().sort({ decidedAt: -1 }).limit(6).populate('athlete', 'name').populate('toLevel', 'name').lean(), Sport.find().lean()]);
  const dec = await decorate(athletes), withScore = dec.filter(a => a.score);
  const buckets = [['< 60', 0, 60], ['60-69', 60, 70], ['70-79', 70, 80], ['80-89', 80, 90], ['90+', 90, 101]];
  return res.json({
    eligible: dec.filter(a => a.score?.eligible).length, underReview: open.length, selected: await SelectionDecision.countDocuments({ decision: 'Selected' }), promotionRequests: open.length, open, recentDecisions: decisions,
    sportPerformance: sports.map(s => { const g = withScore.filter(a => String(a.sport._id) === String(s._id)); return { name: s.name, avg: g.length ? Math.round(g.reduce((t, a) => t + a.score.overall, 0) / g.length) : 0 }; }),
    distribution: buckets.map(([name, lo, hi]) => ({ name, count: withScore.filter(a => a.score.overall >= lo && a.score.overall < hi).length })),
  });
}));

r.get('/notifications', wrap(async (req, res) => {
  const role = req.user.role, n = [];
  if (role === 'admin' || role === 'medical') { const m = (await latestMedical()).filter(x => ['Pending', 'Under Review'].includes(x.status)).length; if (m) n.push({ text: `${m} medical verification(s) pending`, to: role === 'medical' ? '/medical/clearance' : '/admin/athletes' }); }
  if (role === 'admin' || role === 'committee') { const o = await PromotionRequest.countDocuments({ status: { $in: OPEN } }); if (o) n.push({ text: `${o} promotion request(s) awaiting committee`, to: role === 'committee' ? '/committee/decisions' : '/admin' }); }
  if (role === 'coach') { const mine = await Athlete.find({ coach: req.coach?._id }, '_id').lean(); const sk = await SkillAssessment.aggregate([{ $match: { athlete: { $in: mine.map(a => a._id) } } }, { $group: { _id: '$athlete', d: { $max: '$date' } } }]); const fresh = sk.filter(s => Date.now() - new Date(s.d) < 30 * day).length; if (mine.length - fresh > 0) n.push({ text: `${mine.length - fresh} athlete(s) need a skill assessment`, to: '/coach/assessment' }); }
  if (role === 'athlete' && req.athlete) { const d = await SelectionDecision.findOne({ athlete: req.athlete._id }).sort({ decidedAt: -1 }).lean(); if (d) n.push({ text: `Latest committee decision: ${d.decision}`, to: '/athlete/journey' }); const t = await Tournament.countDocuments({ sport: req.athlete.sport, date: { $gte: new Date() } }); if (t) n.push({ text: `${t} upcoming tournament(s) for your sport`, to: '/athlete/activity' }); }
  res.json(n);
}));
module.exports = r;
