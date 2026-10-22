const r = require('express').Router();
const bcrypt = require('bcryptjs');
const { Sport, AcademyLevel, Athlete, User, Coach, MedicalRecord } = require('../models');
const { protect, allow } = require('../middleware/auth');
const { wrap, fail, need, esc, pick } = require('../util');
const { decorate } = require('../services/decorate');
const { CATS } = require('../services/scoring');


const cleanWeights = w => {
  const o = {}; CATS.forEach(c => { const v = Number(w[c]); if (isNaN(v) || v < 0 || v > 1) throw fail(400, `Weight for ${c} must be between 0 and 1`); o[c] = v; });
  if (!Object.values(o).some(v => v > 0)) throw fail(400, 'At least one weight must be greater than 0'); return o;
};
const found = d => { if (!d) throw fail(404, 'Not found'); return d; };

// ---- Sports
r.get('/sports', wrap(async (q, res) => res.json(await Sport.find().sort('name').lean())));
r.post('/sports', allow('admin'), need('name'), wrap(async (req, res) => {
  const b = pick(req.body, ['name', 'code', 'description', 'active', 'events', 'positions', 'source']); if (req.body.weights) b.weights = cleanWeights(req.body.weights);
  res.status(201).json(await Sport.create(b));
}));
r.put('/sports/:id', allow('admin'), wrap(async (req, res) => {
  const b = pick(req.body, ['name', 'code', 'description', 'active', 'events', 'positions', 'source']); if (req.body.weights) b.weights = cleanWeights(req.body.weights);
  res.json(found(await Sport.findByIdAndUpdate(req.params.id, b, { new: true, runValidators: true })));
}));

// ---- Academy levels & promotion rules
const LF = ['name', 'description', 'criteria', 'minOverall', 'minCategory', 'minSessions', 'minAttendance', 'requiresMedical'];
r.get('/levels', wrap(async (q, res) => res.json(await AcademyLevel.find().sort('order').lean())));
r.post('/levels', allow('admin'), need('name'), wrap(async (req, res) => {
  const last = await AcademyLevel.findOne().sort('-order'); res.status(201).json(await AcademyLevel.create({ ...pick(req.body, LF), order: (last?.order || 0) + 1 }));
}));
r.put('/levels/:id', allow('admin'), wrap(async (req, res) => {
  const b = pick(req.body, LF);
  ['minOverall', 'minCategory', 'minAttendance'].forEach(k => { if (b[k] !== undefined && (b[k] < 0 || b[k] > 100)) throw fail(400, `${k} must be 0-100`); });
  res.json(found(await AcademyLevel.findByIdAndUpdate(req.params.id, b, { new: true, runValidators: true })));
}));

// ---- Athletes
const AF = ['name', 'dob', 'gender', 'phone', 'district', 'guardian', 'sport', 'eventOrPosition'];
r.get('/athletes', allow('admin', 'coach', 'medical', 'committee'), wrap(async (req, res) => {
  const { q, sport, level, active } = req.query, f = {};
  if (req.user.role === 'coach') f.coach = req.coach?._id;
  if (sport) f.sport = sport; if (level) f.level = level; if (active === 'true' || active === 'false') f.active = active === 'true';
  if (q) f.$or = [{ name: new RegExp(esc(q), 'i') }, { athleteId: new RegExp(esc(q), 'i') }];
  const list = await Athlete.find(f).populate('sport level').populate('coach', 'name').sort('name').lean();
  res.json(await decorate(list));
}));
r.post('/athletes', allow('admin'), need('name', 'dob', 'gender', 'sport', 'level'), wrap(async (req, res) => {
  const { email, password } = req.body; let user;
  const count = await Athlete.countDocuments();
  if (email) {
    if (!password || String(password).length < 8) throw fail(400, 'Login password (min 8 chars) is required with a login email');
    user = await User.create({ name: req.body.name, email, role: 'athlete', password: await bcrypt.hash(password, 10) });
  }
  const a = await Athlete.create({ ...pick(req.body, [...AF, 'level', 'coach']), coach: req.body.coach || null, athleteId: `SSA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`, user: user?._id });
  await MedicalRecord.create({ athlete: a._id, status: 'Pending', remarks: 'Awaiting initial medical verification' });
  res.status(201).json(a);
}));
// level is deliberately NOT editable here - it only changes through the committee decision workflow
r.put('/athletes/:id', allow('admin'), wrap(async (req, res) => {
  const b = pick(req.body, [...AF, 'coach']); if (b.coach === '') b.coach = null;
  res.json(found(await Athlete.findByIdAndUpdate(req.params.id, b, { new: true, runValidators: true })));
}));
r.patch('/athletes/:id/status', allow('admin'), wrap(async (req, res) => {
  res.json(found(await Athlete.findByIdAndUpdate(req.params.id, { active: !!req.body.active }, { new: true })));
}));

// ---- Users & coaches
r.get('/users', allow('admin'), wrap(async (q, res) => res.json(await User.find().sort('role name').lean())));
r.post('/users', allow('admin'), need('name', 'email', 'password', 'role'), wrap(async (req, res) => {
  const { role, password } = req.body;
  if (!['admin', 'coach', 'medical', 'committee'].includes(role)) throw fail(400, 'Athlete logins are created from Athlete Management');
  if (String(password).length < 8) throw fail(400, 'Password must be at least 8 characters');
  if (role === 'coach' && !req.body.sport) throw fail(400, 'Sport is required for a coach');
  const u = await User.create({ ...pick(req.body, ['name', 'email', 'role', 'phone']), password: await bcrypt.hash(password, 10) });
  if (role === 'coach') await Coach.create({ user: u._id, name: u.name, phone: u.phone, ...pick(req.body, ['sport', 'specialization', 'experience']) });
  res.status(201).json(u);
}));
r.patch('/users/:id/status', allow('admin'), wrap(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw fail(400, 'You cannot deactivate your own account');
  res.json(found(await User.findByIdAndUpdate(req.params.id, { active: !!req.body.active }, { new: true })));
}));
r.get('/coaches', allow('admin', 'committee'), wrap(async (q, res) => {
  const [coaches, counts] = await Promise.all([Coach.find().populate('sport', 'name').populate('user', 'email active').lean(), Athlete.aggregate([{ $match: { coach: { $ne: null } } }, { $group: { _id: '$coach', n: { $sum: 1 } } }])]);
  const C = Object.fromEntries(counts.map(c => [c._id, c.n]));
  res.json(coaches.map(c => ({ ...c, athleteCount: C[c._id] || 0 })));
}));
r.put('/coaches/:id', allow('admin'), wrap(async (req, res) => res.json(found(await Coach.findByIdAndUpdate(req.params.id, pick(req.body, ['sport', 'specialization', 'experience', 'phone']), { new: true, runValidators: true })))));
r.put('/coaches/:id/assign', allow('admin'), wrap(async (req, res) => {
  const ids = req.body.athletes || []; found(await Coach.findById(req.params.id));
  await Athlete.updateMany({ coach: req.params.id, _id: { $nin: ids } }, { coach: null });
  await Athlete.updateMany({ _id: { $in: ids } }, { coach: req.params.id });
  res.json({ assigned: ids.length });
}));
module.exports = r;
