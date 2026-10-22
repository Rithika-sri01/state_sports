const mongoose = require('mongoose');
const cfg = require('../config');
const M = require('../models');
const { buildSeed } = require('./data');
const MAP = { users: 'User', sports: 'Sport', academylevels: 'AcademyLevel', coaches: 'Coach', athletes: 'Athlete', medicalrecords: 'MedicalRecord', fitnessassessments: 'FitnessAssessment', trainingsessions: 'TrainingSession', skillassessments: 'SkillAssessment', tournaments: 'Tournament', achievements: 'Achievement', trainingevidences: 'TrainingEvidence', developmentscorecards: 'DevelopmentScorecard', promotionrequests: 'PromotionRequest', selectiondecisions: 'SelectionDecision', sportstats: 'SportStat' };
(async () => {
  await mongoose.connect(cfg.mongo); console.log('Connected:', cfg.mongo);
  const data = buildSeed();
  for (const [k, name] of Object.entries(MAP)) { await M[name].deleteMany({}); await M[name].insertMany(data[k]); console.log(`  ${name.padEnd(22)} ${data[k].length}`); }
  console.log('\nSeed complete. Demo password for every account: Password@123');
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
