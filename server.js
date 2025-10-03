// server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const DATA_FILE = path.join(__dirname, 'accounts.json');
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());

// Load or init store
let accounts = [];
if (fs.existsSync(DATA_FILE)) {
  try { accounts = JSON.parse(fs.readFileSync(DATA_FILE,'utf8') || '[]'); } catch(e){ accounts = []; }
}
function save(){ fs.writeFileSync(DATA_FILE, JSON.stringify(accounts, null, 2)); }

// nodemailer transporter (configure via .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: (process.env.SMTP_SECURE === 'true'), // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// helpers
function generateCode(){ return Math.floor(100000 + Math.random()*900000).toString(); }
function findAccount(email){ return accounts.find(a => a.email.toLowerCase() === email.toLowerCase()); }

// endpoints
app.post('/api/register', async (req, res) => {
  const { email, displayName, password } = req.body || {};
  if(!email || !displayName || !password) return res.status(400).json({ error:'missing_fields' });
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error:'invalid_email' });

  const existing = findAccount(email);
  if(existing) {
    // if exists but not verified, re-send code; otherwise reject
    if(existing.verified) return res.status(400).json({ error:'exists' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expires = Date.now() + (15*60*1000); // 15 minutes

    if(existing) {
      // update existing unverified
      existing.displayName = displayName;
      existing.passwordHash = passwordHash;
      existing.verified = false;
      existing.code = code;
      existing.codeExpires = expires;
    } else {
      accounts.push({ email, displayName, passwordHash, verified:false, code, codeExpires:expires, messages:[], blocked:[] });
    }
    save();

    // send email
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Your Steal A Bra verification code',
      text: `Your verification code: ${code}\n\nThis code is valid for 15 minutes.`
    };
    await transporter.sendMail(mailOptions);
    return res.json({ message: 'verification_sent' });
  } catch(err){
    console.error('register error', err);
    return res.status(500).json({ error:'server_error' });
  }
});

app.post('/api/verify', (req, res) => {
  const { email, code } = req.body || {};
  if(!email || !code) return res.status(400).json({ error:'missing' });

  const acc = findAccount(email);
  if(!acc) return res.status(404).json({ error:'not_found' });
  if(acc.verified) return res.status(400).json({ error:'already_verified' });
  if(!acc.code || acc.code !== String(code)) return res.status(400).json({ error:'invalid_code' });
  if(Date.now() > acc.codeExpires) return res.status(400).json({ error:'expired' });

  acc.verified = true;
  delete acc.code;
  delete acc.codeExpires;
  save();
  return res.json({ message:'verified' });
});

// list verified traders
app.get('/api/traders', (req,res) => {
  const list = accounts.filter(a=>a.verified).map(a=>({ email: a.email, displayName: a.displayName }));
  res.json(list);
});

// list all accounts (admin/demo)
app.get('/api/accounts', (req,res) => {
  const list = accounts.map(a=>({ email:a.email, displayName:a.displayName, verified:!!a.verified }));
  res.json(list);
});

// simple block/message demo endpoints (no auth)
app.post('/api/block', (req,res) => {
  const { email } = req.body || {};
  // append to a demo blocked list (not per-user, demo only)
  return res.json({ message:'blocked (demo)' });
});
app.post('/api/message', (req,res) => {
  const { email, text } = req.body || {};
  // store in messages array for user if desired; demo just returns ok
  const acc = findAccount(email);
  if(acc) acc.messages = acc.messages || [], acc.messages.push({ text, ts:Date.now() });
  save();
  return res.json({ message:'sent (demo)' });
});

// OPTIONS for CORS preflight
app.options('*', (req, res) => res.sendStatus(200));

// start
app.listen(PORT, () => console.log('Server listening on', PORT));
