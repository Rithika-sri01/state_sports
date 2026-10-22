// Writes ../../../database/*.json (MongoDB Extended JSON) so the DB can be loaded with mongoimport - no Node needed.
const fs = require('fs'), path = require('path'), mongoose = require('mongoose');
const { buildSeed } = require('./data');
const { EJSON } = mongoose.mongo.BSON;
const out = path.join(__dirname, '..', '..', '..', 'database');
fs.mkdirSync(out, { recursive: true });
const data = buildSeed(), t = new Date();
for (const [col, docs] of Object.entries(data)) {
  fs.writeFileSync(path.join(out, col + '.json'), EJSON.stringify(docs.map(d => ({ createdAt: t, updatedAt: t, ...d })), null, 1, { relaxed: true }));
  console.log(col.padEnd(24), docs.length);
}
