const r = require('express').Router();
const { Athlete, TrainingSession, SkillAssessment, FitnessAssessment, TrainingEvidence, Tournament, Achievement } = require('../models');
const { protect, allow, athleteAccess } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { wrap, fail, need, pick } = require('../util');

const found = d => { if (!d) throw fail(404, 'Not found'); return d; };
const checkMine = async (req, entries) => {
  const ids = entries.map(e => e.athlete); if (!ids.length) throw fail(400, 'Select at least one athlete');
  if (await Athlete.countDocuments({ _id: { $in: ids }, coach: req.coach._id }) !== new Set(ids.map(String)).size) throw fail(403, 'All athletes must be assigned to you');
};

// ---- Training sessions & attendance
r.get('/training', allow('coach', 'admin'), wrap(async (req, res) => {
  const f = req.user.role === 'coach' ? { coach: req.coach._id } : {};
  res.json(await TrainingSession.find(f).sort({ date: -1 }).populate('sport', 'name').populate('coach', 'name').populate('attendance.athlete', 'name athleteId').lean());
}));
r.post('/training', allow('coach'), need('title', 'type', 'date', 'durationMin'), wrap(async (req, res) => {
  await checkMine(req, req.body.attendance || []);
  res.status(201).json(await TrainingSession.create({ ...pick(req.body, ['title', 'type', 'date', 'durationMin', 'remarks', 'status', 'attendance']), sport: req.coach.sport, coach: req.coach._id }));
}));
r.patch('/training/:id', allow('coach'), wrap(async (req, res) => {
  const t = found(await TrainingSession.findOne({ _id: req.params.id, coach: req.coach._id }));
  if (req.body.attendance) { await checkMine(req, req.body.attendance); }
  Object.assign(t, pick(req.body, ['title', 'type', 'date', 'durationMin', 'remarks', 'status', 'attendance'])); res.json(await t.save());
}));

// ---- Skill assessment, fitness, evidence
r.get('/skills', allow('coach', 'admin', 'committee'), wrap(async (req, res) => {
  const f = {}; if (req.query.athlete) { await athleteAccess(req, req.query.athlete); f.athlete = req.query.athlete; }
  else if (req.user.role === 'coach') f.athlete = { $in: (await Athlete.find({ coach: req.coach._id }, '_id')).map(a => a._id) };
  res.json(await SkillAssessment.find(f).sort({ date: -1 }).limit(200).populate('athlete', 'name athleteId').lean());
}));
r.post('/skills', allow('coach'), need('athlete', 'technical', 'tactical', 'consistency', 'performance'), wrap(async (req, res) => {
  await athleteAccess(req, req.body.athlete);
  res.status(201).json(await SkillAssessment.create({ ...pick(req.body, ['athlete', 'technical', 'tactical', 'consistency', 'performance', 'remarks', 'date']), coach: req.coach._id }));
}));
r.get('/fitness', allow('coach', 'admin', 'medical', 'committee'), wrap(async (req, res) => {
  const f = {}; if (req.query.athlete) f.athlete = req.query.athlete;
  res.json(await FitnessAssessment.find(f).sort({ date: -1 }).limit(200).populate('athlete', 'name athleteId').lean());
}));
r.post('/fitness', allow('coach'), need('athlete', 'speed', 'endurance', 'strength', 'agility', 'flexibility'), wrap(async (req, res) => {
  await athleteAccess(req, req.body.athlete);
  res.status(201).json(await FitnessAssessment.create({ ...pick(req.body, ['athlete', 'speed', 'endurance', 'strength', 'agility', 'flexibility', 'remarks', 'date']), assessor: req.user._id }));
}));
r.get('/evidence', allow('coach', 'admin', 'committee', 'athlete'), wrap(async (req, res) => {
  const f = {};
  if (req.query.athlete) { await athleteAccess(req, req.query.athlete); f.athlete = req.query.athlete; }
  else if (req.user.role === 'coach') f.athlete = { $in: (await Athlete.find({ coach: req.coach._id }, '_id')).map(a => a._id) };
  else if (req.user.role === 'athlete') f.athlete = req.athlete?._id;
  res.json(await TrainingEvidence.find(f).sort({ date: -1 }).limit(100).populate('athlete', 'name athleteId').populate('coach', 'name').lean());
}));
r.post('/evidence', allow('coach'), upload.video.single('video'), need('athlete', 'title'), wrap(async (req, res) => {
  await athleteAccess(req, req.body.athlete);
  const last = await SkillAssessment.findOne({ athlete: req.body.athlete }).sort({ date: -1 });
  res.status(201).json(await TrainingEvidence.create({ ...pick(req.body, ['athlete', 'title', 'description']), coach: req.coach._id, skillAssessment: req.body.skillAssessment || last?._id, videoUrl: req.file ? `/uploads/${req.file.filename}` : undefined }));
}));

// ---- Tournaments & achievements
r.get('/tournaments', wrap(async (req, res) => {
  const f = {}; if (req.query.upcoming) f.date = { $gte: new Date() };
  res.json(await Tournament.find(f).sort({ date: -1 }).populate('sport', 'name').populate('results.athlete', 'name athleteId').lean());
}));
r.post('/tournaments', allow('admin', 'coach'), need('name', 'sport', 'date', 'venue'), wrap(async (req, res) => res.status(201).json(await Tournament.create(pick(req.body, ['name', 'sport', 'date', 'venue', 'level'])))));
r.post('/tournaments/:id/results', allow('coach', 'admin'), need('athlete', 'score'), wrap(async (req, res) => {
  await athleteAccess(req, req.body.athlete);
  if (req.body.sourceUrl && !/^https?:\/\//.test(req.body.sourceUrl)) throw fail(400, 'Source URL must start with http:// or https://');
  if (req.body.verificationStatus === 'verified' && !req.body.sourceUrl) throw fail(400, 'A source URL is required to mark a result as verified');
  const t = found(await Tournament.findById(req.params.id));
  const row = pick(req.body, ['athlete', 'position', 'score', 'result', 'remarks', 'event', 'resultValue', 'unit', 'sourceUrl', 'verificationStatus']), i = t.results.findIndex(x => String(x.athlete) === String(row.athlete));
  i >= 0 ? Object.assign(t.results[i], row) : t.results.push(row); res.json(await t.save());
}));
r.get('/achievements', wrap(async (req, res) => {
  const f = {}; if (req.query.athlete) { await athleteAccess(req, req.query.athlete); f.athlete = req.query.athlete; }
  res.json(await Achievement.find(f).sort({ date: -1 }).limit(100).populate('athlete', 'name').lean());
}));
r.post('/achievements', allow('coach', 'admin'), upload.doc.single('certificate'), need('athlete', 'title'), wrap(async (req, res) => {
  await athleteAccess(req, req.body.athlete);
  res.status(201).json(await Achievement.create({ ...pick(req.body, ['athlete', 'title', 'category', 'date', 'description']), certificateUrl: req.file ? `/uploads/${req.file.filename}` : undefined }));
}));
module.exports = r;
