const express = require('express'), cors = require('cors'), helmet = require('helmet'), morgan = require('morgan'), path = require('path'), mongoose = require('mongoose');
const cfg = require('./config');
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: cfg.clientUrl }));
app.use(express.json({ limit: '1mb' }));
if (cfg.env !== 'test') app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/sports-videos', express.static(path.join(__dirname, '..', '..', 'sports videos')));
app.get('/api/health', (q, res) => res.json({ ok: true }));
app.use('/api', require('./routes'));
app.use('/api', (q, res) => res.status(404).json({ message: 'Endpoint not found' }));
app.use(require('./middleware/error'));
module.exports = app;
if (require.main === module) {
  mongoose.connect(cfg.mongo).then(() => {
    console.log('MongoDB connected');
    app.listen(cfg.port, () => console.log(`API running on http://localhost:${cfg.port}`));
  }).catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
}
