const { DevelopmentScorecard, MedicalRecord } = require('../models');
const latestMedical = (ids) => MedicalRecord.aggregate([...(ids ? [{ $match: { athlete: { $in: ids } } }] : []), { $sort: { examDate: -1, createdAt: -1 } }, { $group: { _id: '$athlete', status: { $first: '$status' }, examDate: { $first: '$examDate' }, updatedAt: { $first: '$updatedAt' } } }]);
// attach latest score snapshot, medical status and injury flag to a list of lean athletes
async function decorate(list) {
  const ids = list.map(a => a._id);
  const [sc, med, inj] = await Promise.all([
    DevelopmentScorecard.aggregate([{ $match: { athlete: { $in: ids } } }, { $sort: { computedAt: -1 } }, { $group: { _id: '$athlete', sc: { $first: '$$ROOT' } } }]),
    latestMedical(ids),
    MedicalRecord.aggregate([{ $match: { athlete: { $in: ids } } }, { $unwind: '$injuries' }, { $match: { 'injuries.status': 'Active' } }, { $group: { _id: '$athlete' } }]),
  ]);
  const S = Object.fromEntries(sc.map(x => [x._id, x.sc])), M = Object.fromEntries(med.map(x => [x._id, x.status])), I = new Set(inj.map(x => String(x._id)));
  return list.map(a => ({ ...a, score: S[a._id] || null, medicalStatus: M[a._id] || 'None', injured: I.has(String(a._id)) }));
}
module.exports = { decorate, latestMedical };
