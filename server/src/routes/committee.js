const r = require('express').Router();
const { PromotionRequest, SelectionDecision, Athlete } = require('../models');
const { allow, athleteAccess } = require('../middleware/auth');
const { wrap, fail, need, OPEN } = require('../util');
const { buildScorecard } = require('../services/scorecard');
const { loadProfile } = require('../services/profile');

r.get('/promotions', allow('coach', 'committee', 'admin', 'athlete'), wrap(async (req, res) => {
  const f = {}; if (req.query.status) f.status = req.query.status === 'open' ? { $in: OPEN } : req.query.status;
  if (req.user.role === 'coach') f.athlete = { $in: (await Athlete.find({ coach: req.coach._id }, '_id')).map(a => a._id) };
  if (req.user.role === 'athlete') f.athlete = req.athlete?._id;
  res.json(await PromotionRequest.find(f).sort({ createdAt: -1 }).populate({ path: 'athlete', select: 'name athleteId sport', populate: { path: 'sport', select: 'name' } }).populate('fromLevel toLevel scorecard').populate('requestedBy', 'name').lean());
}));

// Workflow step: Eligibility Check -> Coach Recommendation. The server re-checks eligibility; it never trusts the client.
r.post('/promotions', allow('coach'), need('athlete', 'recommendation'), wrap(async (req, res) => {
  const a = await athleteAccess(req, req.body.athlete);
  if (String(req.body.recommendation).trim().length < 10) throw fail(400, 'Recommendation must be at least 10 characters');
  if (!a.active) throw fail(400, 'Athlete is inactive');
  if (await PromotionRequest.exists({ athlete: a._id, status: { $in: OPEN } })) throw fail(409, 'A promotion request is already open for this athlete');
  const sc = await buildScorecard(a._id);
  if (!sc.eligible) throw fail(422, 'Athlete does not yet meet the promotion criteria', { checks: sc.checks });
  res.status(201).json(await PromotionRequest.create({ athlete: a._id, fromLevel: a.level, toLevel: sc.nextLevel._id, scorecard: sc._id, requestedBy: req.user._id, recommendation: req.body.recommendation }));
}));

r.get('/decisions', allow('committee', 'admin', 'coach', 'athlete'), wrap(async (req, res) => {
  const f = {};
  if (req.user.role === 'coach') f.athlete = { $in: (await Athlete.find({ coach: req.coach._id }, '_id')).map(a => a._id) };
  if (req.user.role === 'athlete') f.athlete = req.athlete?._id;
  res.json(await SelectionDecision.find(f).sort({ decidedAt: -1 }).limit(200).populate('athlete', 'name athleteId').populate('fromLevel toLevel', 'name').populate('decidedBy', 'name').lean());
}));

// Workflow step: Selection Committee Review -> Final Decision -> Promotion / Selection.
// A high score never promotes by itself: the level changes only here, after a human decision.
r.post('/decisions', allow('committee'), need('request', 'decision', 'remarks'), wrap(async (req, res) => {
  const { decision, remarks } = req.body;
  if (!['Selected', 'Not Selected', 'Further Review'].includes(decision)) throw fail(400, 'Invalid decision');
  if (String(remarks).trim().length < 10) throw fail(400, 'Please record the reasoning (min 10 characters)');
  const pr = await PromotionRequest.findById(req.body.request); if (!pr) throw fail(404, 'Request not found');
  if (!OPEN.includes(pr.status)) throw fail(409, 'This request has already been decided');
  if (decision === 'Selected') {
    const a = await Athlete.findById(pr.athlete);
    if (String(a.level) !== String(pr.fromLevel)) throw fail(409, 'Athlete level changed since the request was raised');
    const sc = await buildScorecard(pr.athlete);
    if (!sc.eligible) throw fail(422, 'Athlete no longer satisfies the eligibility criteria', { checks: sc.checks });
    a.level = pr.toLevel; await a.save();
  }
  pr.status = { Selected: 'Approved', 'Not Selected': 'Rejected', 'Further Review': 'Further Review' }[decision]; await pr.save();
  res.status(201).json(await SelectionDecision.create({ request: pr._id, athlete: pr.athlete, fromLevel: pr.fromLevel, toLevel: pr.toLevel, decision, remarks, decidedBy: req.user._id }));
}));

r.get('/compare', allow('committee', 'admin'), wrap(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 4);
  if (ids.length < 2) throw fail(400, 'Select at least two athletes to compare');
  res.json(await Promise.all(ids.map(loadProfile)));
}));
module.exports = r;
