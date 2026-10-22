const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const oid = (ref, o = {}) => ({ type: Schema.Types.ObjectId, ref, ...o });
const T = { timestamps: true };
const score = { type: Number, min: [0, 'Score must be 0-100'], max: [100, 'Score must be 0-100'], required: true };
const ROLES = ['admin', 'coach', 'medical', 'athlete', 'committee'];
const MED = ['Pending', 'Cleared', 'Failed', 'Under Review'];
const mean = (...n) => Math.round(n.reduce((a, b) => a + b, 0) / n.length);

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true },
  phone: String, active: { type: Boolean, default: true },
}, T));

const Sport = model('Sport', new Schema({
  name: { type: String, required: true, unique: true, trim: true }, code: String, description: String,
  active: { type: Boolean, default: true },
  events: [{ name: String, category: String, unit: String }], positions: [String], source: { name: String, url: String },
  // configurable weights for the Overall Development Score (normalised at calculation time)
  weights: { fitness: { type: Number, default: .25 }, training: { type: Number, default: .2 }, skill: { type: Number, default: .25 }, tournament: { type: Number, default: .2 }, discipline: { type: Number, default: .1 } },
}, T));

const AcademyLevel = model('AcademyLevel', new Schema({
  name: { type: String, required: true, unique: true }, order: { type: Number, required: true, unique: true },
  description: String, criteria: [String],
  // promotion rule = what an athlete must satisfy to ENTER this level
  minOverall: { type: Number, default: 0 }, minCategory: { type: Number, default: 0 },
  minSessions: { type: Number, default: 0 }, minAttendance: { type: Number, default: 0 },
  requiresMedical: { type: Boolean, default: true },
}, T));

const Coach = model('Coach', new Schema({
  user: oid('User', { required: true, unique: true }), name: { type: String, required: true },
  sport: oid('Sport', { required: true }), specialization: String, experience: Number, phone: String,
}, T));

const Athlete = model('Athlete', new Schema({
  athleteId: { type: String, unique: true }, name: { type: String, required: true, trim: true },
  dob: { type: Date, required: true }, gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone: String, district: String, guardian: String, eventOrPosition: String,
  sport: oid('Sport', { required: true, index: true }), level: oid('AcademyLevel', { required: true, index: true }),
  coach: oid('Coach', { default: null }), user: oid('User'),
  active: { type: Boolean, default: true }, registeredAt: { type: Date, default: Date.now },
}, T));

const MedicalRecord = model('MedicalRecord', new Schema({
  athlete: oid('Athlete', { required: true, index: true }), examDate: { type: Date, default: Date.now },
  heightCm: { type: Number, min: 80, max: 260 }, weightKg: { type: Number, min: 20, max: 250 },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''] },
  condition: String, observations: String, remarks: String, restrictions: String, certificateUrl: String,
  status: { type: String, enum: MED, default: 'Pending' }, examiner: oid('User'),
  injuries: [{
    type: { type: String, required: true }, bodyPart: String, severity: { type: String, enum: ['Minor', 'Moderate', 'Severe'], default: 'Minor' },
    date: { type: Date, default: Date.now }, status: { type: String, enum: ['Active', 'Recovering', 'Recovered'], default: 'Active' },
    notes: String, recordedBy: oid('User'),
  }],
}, T));

const fit = new Schema({
  athlete: oid('Athlete', { required: true, index: true }), date: { type: Date, default: Date.now },
  speed: score, endurance: score, strength: score, agility: score, flexibility: score, score: Number, tests: [{ name: String, result: Number, unit: String }], remarks: String, assessor: oid('User'),
}, T);
fit.pre('validate', function (n) { this.score = mean(this.speed, this.endurance, this.strength, this.agility, this.flexibility); n(); });
const FitnessAssessment = model('FitnessAssessment', fit);

const TrainingSession = model('TrainingSession', new Schema({
  sport: oid('Sport', { required: true }), coach: oid('Coach', { required: true }),
  title: { type: String, required: true }, type: { type: String, enum: ['Technical', 'Tactical', 'Fitness', 'Match Practice', 'Recovery'], required: true },
  date: { type: Date, required: true }, durationMin: { type: Number, min: 10, max: 480, required: true },
  status: { type: String, enum: ['Scheduled', 'Completed'], default: 'Completed' }, remarks: String,
  attendance: [{ athlete: oid('Athlete', { required: true }), present: { type: Boolean, default: false }, performance: { type: Number, min: 0, max: 100, default: 0 }, remarks: String }],
}, T));
TrainingSession.schema.index({ 'attendance.athlete': 1 });

const sk = new Schema({
  athlete: oid('Athlete', { required: true, index: true }), coach: oid('Coach', { required: true }), date: { type: Date, default: Date.now },
  technical: score, tactical: score, consistency: score, performance: score, score: Number, remarks: String,
}, T);
sk.pre('validate', function (n) { this.score = mean(this.technical, this.tactical, this.consistency, this.performance); n(); });
const SkillAssessment = model('SkillAssessment', sk);

const Tournament = model('Tournament', new Schema({
  name: { type: String, required: true }, sport: oid('Sport', { required: true }), date: { type: Date, required: true }, venue: { type: String, required: true },
  level: { type: String, enum: ['Inter-Academy', 'District', 'State', 'National'], default: 'District' },
  results: [{ athlete: oid('Athlete', { required: true }), position: Number, score: score, result: String, remarks: String, event: String, resultValue: Number, unit: String, sourceUrl: String, verificationStatus: { type: String, enum: ['verified', 'unverified', 'synthetic-demo'], default: 'unverified' }, dataOrigin: String }],
}, T));

const Achievement = model('Achievement', new Schema({
  athlete: oid('Athlete', { required: true, index: true }), title: { type: String, required: true },
  category: { type: String, enum: ['Medal', 'Certificate', 'Record', 'Award'], default: 'Certificate' },
  date: { type: Date, default: Date.now }, description: String, certificateUrl: String,
}, T));

const TrainingEvidence = model('TrainingEvidence', new Schema({
  athlete: oid('Athlete', { required: true, index: true }), coach: oid('Coach'), skillAssessment: oid('SkillAssessment'),
  title: { type: String, required: true }, description: String, videoUrl: String, date: { type: Date, default: Date.now },
}, T));

const sc = new Schema({
  athlete: oid('Athlete', { required: true, index: true }), level: oid('AcademyLevel'), day: { type: String, required: true },
  fitness: Number, training: Number, skill: Number, tournament: Number, discipline: Number, overall: Number,
  weights: Object, gaps: [{ category: String, score: Number, target: Number, action: String }],
  checks: [{ label: String, pass: Boolean, detail: String }], eligible: { type: Boolean, default: false }, computedAt: { type: Date, default: Date.now },
}, T);
sc.index({ athlete: 1, day: 1 }, { unique: true });
const DevelopmentScorecard = model('DevelopmentScorecard', sc);

const PromotionRequest = model('PromotionRequest', new Schema({
  athlete: oid('Athlete', { required: true, index: true }), fromLevel: oid('AcademyLevel', { required: true }), toLevel: oid('AcademyLevel', { required: true }),
  scorecard: oid('DevelopmentScorecard'), requestedBy: oid('User', { required: true }), recommendation: { type: String, required: true, minlength: 10 },
  status: { type: String, enum: ['Under Review', 'Approved', 'Rejected', 'Further Review'], default: 'Under Review' },
}, T));

const SelectionDecision = model('SelectionDecision', new Schema({
  request: oid('PromotionRequest', { required: true }), athlete: oid('Athlete', { required: true, index: true }),
  fromLevel: oid('AcademyLevel'), toLevel: oid('AcademyLevel'),
  decision: { type: String, enum: ['Selected', 'Not Selected', 'Further Review'], required: true },
  remarks: { type: String, required: true, minlength: 10 }, decidedBy: oid('User', { required: true }), decidedAt: { type: Date, default: Date.now },
}, T));

const SportStat = model('SportStat', new Schema({ athlete: oid('Athlete', { required: true, unique: true }), sport: oid('Sport', { required: true }), stats: Object, dataOrigin: String }, T));

module.exports = { SportStat, ROLES, User, Sport, AcademyLevel, Coach, Athlete, MedicalRecord, FitnessAssessment, TrainingSession, SkillAssessment, Tournament, Achievement, TrainingEvidence, DevelopmentScorecard, PromotionRequest, SelectionDecision };
