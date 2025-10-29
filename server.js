const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pdfGenerator = require('./utils/pdfGenerator');

const app = express();
app.use(express.json());

const FRONTEND_URL = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: FRONTEND_URL === '*' ? true : FRONTEND_URL }));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_dev_secret';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const USERS_PATH = path.join(DATA_DIR, 'users.json');
const AUDITS_PATH = path.join(DATA_DIR, 'audits.json');
const CHECKLISTS_PATH = path.join(DATA_DIR, 'checklists.json');

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

// ensure default files exist
if (!fs.existsSync(USERS_PATH)) writeJson(USERS_PATH, { users: [] });
if (!fs.existsSync(AUDITS_PATH)) writeJson(AUDITS_PATH, { audits: [] });
if (!fs.existsSync(CHECKLISTS_PATH)) writeJson(CHECKLISTS_PATH, { checklists: [] });

// Ensure default admin user
(function ensureAdmin() {
  const data = readJson(USERS_PATH, { users: [] });
  if (!data.users || data.users.length === 0) {
    const hash = bcrypt.hashSync('password', 10);
    data.users = [{
      id: 'u-1',
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: hash,
      role: 'admin'
    }];
    writeJson(USERS_PATH, data);
    console.log('Usuario admin por defecto creado: admin@example.com / password');
  } else {
    // fill empty hash if needed
    if (!data.users[0].passwordHash) {
      data.users[0].passwordHash = bcrypt.hashSync('password', 10);
      writeJson(USERS_PATH, data);
    }
  }
})();

// Middleware Auth
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.userId };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const users = readJson(USERS_PATH, { users: [] }).users || [];
  const u = users.find(x => x.email === email);
  if (!u) return res.status(400).json({ error: 'Credenciales inválidas' });
  const ok = bcrypt.compareSync(password, u.passwordHash || '');
  if (!ok) return res.status(400).json({ error: 'Credenciales inválidas' });
  const token = jwt.sign({ userId: u.id }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  const data = readJson(USERS_PATH, { users: [] });
  const users = data.users || [];
  if (users.find(x => x.email === email)) return res.status(400).json({ error: 'Usuario ya existe' });
  const id = 'u-' + Date.now();
  const passwordHash = bcrypt.hashSync(password, 10);
  users.push({ id, name, email, passwordHash, role: 'auditor' });
  data.users = users;
  writeJson(USERS_PATH, data);
  res.status(201).json({ message: 'Usuario creado' });
});

// Checklists
app.get('/api/checklists/defaults', (_req, res) => {
  let data = readJson(CHECKLISTS_PATH, { checklists: [] });
  if (!data.checklists || data.checklists.length === 0) {
    data = {
      checklists: [
        {
          name: 'ISO 9001 - Default', standard: 'ISO 9001', version: '1.0', items: [
            { id: '9001-1', text: 'Existe un proceso documentado de gestión de la calidad', weight: 3 },
            { id: '9001-2', text: 'Se realizan revisiones de desempeño periódicas', weight: 2 },
            { id: '9001-3', text: 'Se mide la satisfacción del cliente', weight: 2 },
            { id: '9001-4', text: 'Los procesos cuentan con indicadores definidos', weight: 3 }
          ]
        },
        {
          name: 'ISO 14001 - Default', standard: 'ISO 14001', version: '1.0', items: [
            { id: '14001-1', text: 'Existe política ambiental documentada', weight: 3 },
            { id: '14001-2', text: 'Se identifican aspectos e impactos ambientales', weight: 3 },
            { id: '14001-3', text: 'Hay controles operacionales para riesgos ambientales', weight: 2 },
            { id: '14001-4', text: 'Se registran no conformidades ambientales', weight: 2 }
          ]
        }
      ]
    };
    writeJson(CHECKLISTS_PATH, data);
  }
  res.json(data.checklists);
});

// Audits
app.get('/api/audits', auth, (req, res) => {
  const all = readJson(AUDITS_PATH, { audits: [] }).audits || [];
  res.json(all.filter(a => a.createdBy === req.user.id).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/audits', auth, (req, res) => {
  const { name, standard, checklist, score, notes, auditor } = req.body;
  const data = readJson(AUDITS_PATH, { audits: [] });
  const audits = data.audits || [];
  const id = 'a-' + Date.now();
  const createdAt = new Date().toISOString();
  const audit = { _id: id, id, name, standard, checklist, score, notes: notes||'', auditor: auditor||'', createdAtAudit: createdAt, createdAt, createdBy: req.user.id };
  audits.unshift(audit);
  data.audits = audits;
  writeJson(AUDITS_PATH, data);
  res.status(201).json(audit);
});

app.get('/api/reports/:id/pdf', auth, async (req, res) => {
  const { id } = req.params;
  const audits = readJson(AUDITS_PATH, { audits: [] }).audits || [];
  const a = audits.find(x => (x._id || x.id) === id);
  if (!a) return res.status(404).json({ error: 'No encontrado' });
  try {
    const buffer = await pdfGenerator(a);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${a.name || 'informe'}.pdf"`);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: 'Error generando PDF' });
  }
});

app.listen(PORT, () => console.log(`AuditoIso backend en http://localhost:${PORT}`));
