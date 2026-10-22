require('dotenv').config();
const c = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  mongo: process.env.MONGO_URI || 'mongodb+srv://rithikasrimz23_db_user:da7ngh6PIBcwSRqt@cluster0.fdq2wzk.mongodb.net/state_sports_academy?retryWrites=true&w=majority',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: process.env.JWT_EXPIRES || '8h',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').split(','),
};
if (!c.jwtSecret) { console.error('JWT_SECRET is not set. Copy .env.example to .env'); process.exit(1); }
module.exports = c;
