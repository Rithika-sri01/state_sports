const jwt = require('jsonwebtoken');
const cfg = require('../config');
const { User, Coach, Athlete } = require('../models');
const { fail, wrap } = require('../util');

const protect = wrap(async (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw fail(401, 'Authentication required');
  const { id } = jwt.verify(h.slice(7), cfg.jwtSecret);
  const user = await User.findById(id);
  if (!user || !user.active) throw fail(401, 'Account not found or deactivated');
  req.user = user;
  if (user.role === 'coach') req.coach = await Coach.findOne({ user: user._id });
  if (user.role === 'athlete') req.athlete = await Athlete.findOne({ user: user._id });
  next();
});

const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(fail(403, 'You are not permitted to access this resource'));

// Row-level access: coaches only see assigned athletes, athletes only themselves.
async function athleteAccess(req, id) {
  const a = await Athlete.findById(id);
  if (!a) throw fail(404, 'Athlete not found');
  const { role } = req.user;
  if (role === 'athlete' && String(req.athlete?._id) !== String(a._id)) throw fail(403, 'Access denied');
  if (role === 'coach' && String(a.coach) !== String(req.coach?._id)) throw fail(403, 'Athlete is not assigned to you');
  return a;
}
const sign = user => jwt.sign({ id: user._id, role: user.role }, cfg.jwtSecret, { expiresIn: cfg.jwtExpires });
module.exports = { protect, allow, athleteAccess, sign };
