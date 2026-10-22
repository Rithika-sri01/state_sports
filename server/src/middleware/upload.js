const multer = require('multer'), path = require('path'), fs = require('fs'), crypto = require('crypto');
const dir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(dir, { recursive: true });
const storage = multer.diskStorage({
  destination: dir,
  filename: (q, f, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(f.originalname).toLowerCase()),
});
const make = (types, mb) => multer({
  storage, limits: { fileSize: mb * 1024 * 1024 },
  fileFilter: (q, f, cb) => types.some(t => f.mimetype.startsWith(t)) ? cb(null, true)
    : cb(Object.assign(new Error('Unsupported file type'), { status: 400 })),
});
module.exports = { video: make(['video/'], 150), doc: make(['application/pdf', 'image/'], 10) };
