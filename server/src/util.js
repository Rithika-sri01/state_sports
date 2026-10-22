const fail = (status, message, extra) => Object.assign(new Error(message), { status, ...extra });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const need = (...fields) => (req, res, next) => {
  const miss = fields.filter(k => req.body[k] === undefined || req.body[k] === null || req.body[k] === '');
  miss.length ? next(fail(400, `Missing required field(s): ${miss.join(', ')}`)) : next();
};
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pick = (o, keys) => keys.reduce((a, k) => (o[k] !== undefined ? ((a[k] = o[k]), a) : a), {});
const OPEN = ['Under Review', 'Further Review'];
module.exports = { fail, wrap, need, esc, pick, OPEN };
