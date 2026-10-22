const r = require('express').Router();
const { MedicalRecord, Athlete } = require('../models');
const { protect, allow } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { wrap, fail, need, pick, esc } = require('../util');
const { latestMedical } = require('../services/decorate');
r.use(['/medical', '/injuries'], allow('medical', 'admin'));

r.get('/medical', wrap(async (req, res) => {
  const f = {}; if (req.query.athlete) f.athlete = req.query.athlete; if (req.query.status) f.status = req.query.status;
  res.json(await MedicalRecord.find(f).sort({ examDate: -1, createdAt: -1 }).limit(300).populate({ path: 'athlete', select: 'name athleteId sport', populate: { path: 'sport', select: 'name' } }).lean());
}));
// one row per athlete with latest status (used by the Records page)
r.get('/medical/overview', wrap(async (req, res) => {
  const f = {}; if (req.query.q) f.$or = [{ name: new RegExp(esc(req.query.q), 'i') }, { athleteId: new RegExp(esc(req.query.q), 'i') }];
  const athletes = await Athlete.find(f).populate('sport level', 'name').sort('name').lean();
  const m = Object.fromEntries((await latestMedical(athletes.map(a => a._id))).map(x => [x._id, x]));
  res.json(athletes.map(a => ({ ...a, medicalStatus: m[a._id]?.status || 'None', lastExam: m[a._id]?.examDate })));
}));
r.post('/medical', allow('medical'), upload.doc.single('certificate'), need('athlete', 'examDate', 'heightCm', 'weightKg', 'bloodGroup', 'condition'), wrap(async (req, res) => {
  res.status(201).json(await MedicalRecord.create({ ...pick(req.body, ['athlete', 'examDate', 'heightCm', 'weightKg', 'bloodGroup', 'condition', 'observations', 'remarks', 'restrictions']), status: 'Pending', examiner: req.user._id, certificateUrl: req.file ? `/uploads/${req.file.filename}` : undefined }));
}));
r.patch('/medical/:id/status', allow('medical'), need('status'), wrap(async (req, res) => {
  const { status, remarks } = req.body;
  if (!['Cleared', 'Failed', 'Under Review', 'Pending'].includes(status)) throw fail(400, 'Invalid status');
  if (['Failed', 'Under Review'].includes(status) && !remarks) throw fail(400, 'Remarks are required when rejecting or sending for review');
  const m = await MedicalRecord.findById(req.params.id); if (!m) throw fail(404, 'Record not found');
  m.status = status; if (remarks) m.remarks = remarks; m.examiner = req.user._id; res.json(await m.save());
}));
r.get('/injuries', wrap(async (req, res) => {
  const rows = await MedicalRecord.find({ 'injuries.0': { $exists: true } }).populate('athlete', 'name athleteId').lean();
  res.json(rows.flatMap(m => m.injuries.map(i => ({ ...i, recordId: m._id, athlete: m.athlete }))).sort((a, b) => new Date(b.date) - new Date(a.date)));
}));
r.post('/injuries', allow('medical'), need('athlete', 'type', 'severity'), wrap(async (req, res) => {
  let m = await MedicalRecord.findOne({ athlete: req.body.athlete }).sort({ examDate: -1 });
  if (!m) m = new MedicalRecord({ athlete: req.body.athlete, status: 'Pending' });
  m.injuries.push({ ...pick(req.body, ['type', 'bodyPart', 'severity', 'date', 'notes']), recordedBy: req.user._id }); res.status(201).json(await m.save());
}));
r.patch('/injuries/:recordId/:injuryId', allow('medical'), need('status'), wrap(async (req, res) => {
  const m = await MedicalRecord.findById(req.params.recordId); const i = m?.injuries.id(req.params.injuryId); if (!i) throw fail(404, 'Injury not found');
  i.status = req.body.status; if (req.body.notes) i.notes = req.body.notes; res.json(await m.save());
}));
module.exports = r;
