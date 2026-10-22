// Loads database/datasets/*.json into MongoDB as separate collections prefixed "ds_".
// Run from /server:  node src/seed/loadDatasets.js
const fs = require('fs'), path = require('path'), mongoose = require('mongoose');
const cfg = require('../config');
const dir = path.join(__dirname, '..', '..', '..', 'database', 'datasets');
const DATE = /(Date|dateOfBirth)$/i;
(async () => {
  await mongoose.connect(cfg.mongo);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const name = 'ds_' + f.replace(/^\d+_/, '').replace('.json', '');
    const rows = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, DATE.test(k) && v ? new Date(v) : v === '' ? null : v])));
    const col = mongoose.connection.collection(name);
    await col.deleteMany({}); if (rows.length) await col.insertMany(rows);
    console.log(name.padEnd(36), rows.length);
  }
  console.log('\nDone. All records are synthetic (dataOrigin = synthetic-demo).');
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
