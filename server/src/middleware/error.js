const cfg = require('../config');
module.exports = (err, req, res, next) => {
  let status = err.status || 500, msg = err.message;
  if (err.name === 'ValidationError') { status = 400; msg = Object.values(err.errors).map(e => e.message).join('; '); }
  else if (err.name === 'CastError') { status = 400; msg = `Invalid value for ${err.path}`; }
  else if (err.code === 11000) { status = 409; msg = 'Duplicate value: ' + Object.keys(err.keyValue || {}).join(', '); }
  else if (['JsonWebTokenError', 'TokenExpiredError'].includes(err.name)) { status = 401; msg = 'Invalid or expired token'; }
  else if (err.name === 'MulterError') status = 400;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 && cfg.env === 'production' ? 'Server error' : msg, ...(err.checks && { checks: err.checks }) });
};
