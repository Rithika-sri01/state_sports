const r = require('express').Router();
const { Athlete } = require('../models');
const { allow, athleteAccess } = require('../middleware/auth');
const { wrap, fail } = require('../util');
const { loadProfile } = require('../services/profile');
const { buildScorecard, history } = require('../services/scorecard');

const resolve = (req) => (req.params.id === 'me' ? req.athlete?._id : req.params.id);
// Complete development profile (journey + scorecard + evidence + history)
r.get('/athletes/:id/profile', wrap(async (req, res) => {
  const id = resolve(req); if (!id) throw fail(404, 'No athlete profile linked to this account');
  await athleteAccess(req, id); res.json(await loadProfile(id));
}));
r.get('/scorecards/:id', wrap(async (req, res) => {
  const id = resolve(req); if (!id) throw fail(404, 'No athlete profile linked to this account');
  await athleteAccess(req, id); res.json({ current: await buildScorecard(id), history: await history(id) });
}));
r.post('/scorecards/recompute-all', allow('admin', 'committee'), wrap(async (req, res) => {
  const ids = (await Athlete.find({ active: true }, '_id').lean()).map(a => a._id);
  for (const id of ids) await buildScorecard(id);
  res.json({ recomputed: ids.length });
}));
module.exports = r;
