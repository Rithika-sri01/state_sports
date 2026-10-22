const r = require('express').Router();
const { protect } = require('../middleware/auth');
r.use('/auth', require('./auth'));
r.use(protect); // everything below requires a valid JWT; each route adds its own role check
['admin', 'coach', 'medical', 'athlete', 'committee', 'dashboard'].forEach(m => r.use(require('./' + m)));
module.exports = r;
