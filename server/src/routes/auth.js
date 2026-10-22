const r = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { protect, sign } = require('../middleware/auth');
const { wrap, fail, need } = require('../util');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Too many login attempts. Try again later.' } });
const out = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });

r.post('/login', limiter, need('email', 'password'), wrap(async (req, res) => {
  const u = await User.findOne({ email: String(req.body.email).toLowerCase().trim() }).select('+password');
  if (!u || !(await bcrypt.compare(String(req.body.password), u.password))) throw fail(401, 'Invalid email or password');
  if (!u.active) throw fail(403, 'This account has been deactivated');
  res.json({ token: sign(u), user: out(u) });
}));
r.get('/me', protect, (req, res) => res.json(out(req.user)));
r.post('/change-password', protect, need('current', 'password'), wrap(async (req, res) => {
  const u = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(req.body.current, u.password))) throw fail(400, 'Current password is incorrect');
  if (String(req.body.password).length < 8) throw fail(400, 'New password must be at least 8 characters');
  u.password = await bcrypt.hash(req.body.password, 10); await u.save(); res.json({ message: 'Password updated' });
}));
module.exports = r;
