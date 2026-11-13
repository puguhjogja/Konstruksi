/* ==========================================================================
   PUGUH KONSTRUKSI — FULLSTACK BACKEND (Single File)
   Express + better-sqlite3 + JWT + bcrypt
   ========================================================================== */
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'puguh-konstruksi-secret-2026';
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'puguh.db');

/* ================== DATABASE ================== */
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS company (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT, short TEXT, tag TEXT, address TEXT, city TEXT,
  phone TEXT, wa TEXT, email TEXT, website TEXT, director TEXT,
  npwp TEXT, nib TEXT, founded TEXT, logo TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
  role TEXT NOT NULL, status TEXT DEFAULT 'Aktif',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, client TEXT,
  location TEXT, start TEXT, end TEXT, budget REAL DEFAULT 0,
  progress INTEGER DEFAULT 0, status TEXT DEFAULT 'Persiapan'
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT, start TEXT, end TEXT, progress INTEGER DEFAULT 0,
  weight REAL DEFAULT 0, pred TEXT, resource TEXT, critical INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  item TEXT, volume REAL DEFAULT 0, unit TEXT,
  price REAL DEFAULT 0, actual REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, type TEXT, capacity REAL DEFAULT 0, unit TEXT
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT, project INTEGER, projectName TEXT,
  date TEXT, work TEXT, workers TEXT, material TEXT, weather TEXT,
  progress INTEGER, note TEXT, photo TEXT
);
CREATE TABLE IF NOT EXISTS docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, project INTEGER, title TEXT,
  number TEXT, category TEXT, version INTEGER DEFAULT 1,
  date TEXT, owner TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT, project INTEGER, title TEXT,
  priority TEXT, pic TEXT, due TEXT, status TEXT, detail TEXT
);
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, step TEXT,
  date TEXT, status TEXT
);
`);

/* ================== SEED ================== */
(function seed() {
  if (db.prepare('SELECT COUNT(*) c FROM company').get().c === 0) {
    db.prepare(`INSERT INTO company (id,name,short,tag,address,city,phone,wa,email,website,director,npwp,nib,founded,logo)
      VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      'PT PUGUH KARYA NUSANTARA','PUGUH KONSTRUKSI','PROJECT MANAGEMENT',
      'Jl. Raya Kaliurang KM 9 No. 88, Sleman, D.I. Yogyakarta 55581',
      'Sleman, D.I. Yogyakarta','(0274) 555-8888','0812-3456-7890',
      'info@puguhkonstruksi.co.id','www.puguhkonstruksi.co.id',
      'Ir. Puguh Santoso, M.T.','01.234.567.8-901.000','1234567890123','2010',''
    );
  }
  if (db.prepare('SELECT COUNT(*) c FROM users').get().c === 0) {
    const ins = db.prepare('INSERT INTO users (name,email,password,role,status) VALUES (?,?,?,?,?)');
    [
      ['Administrator Puguh','admin@puguhkonstruksi.co.id','admin123','Admin Sistem'],
      ['Ir. Puguh Santoso, M.T.','direktur@puguhkonstruksi.co.id','owner123','Owner'],
      ['Konsultan MK','mk@puguhkonstruksi.co.id','mk123','Konsultan MK'],
      ['Kontraktor Utama','kontraktor@puguhkonstruksi.co.id','kontraktor123','Kontraktor Utama']
    ].forEach(([n,e,p,r]) => ins.run(n, e, bcrypt.hashSync(p, 10), r, 'Aktif'));
  }
  if (db.prepare('SELECT COUNT(*) c FROM projects').get().c === 0) {
    const ip = db.prepare('INSERT INTO projects (name,client,location,start,end,budget,progress,status) VALUES (?,?,?,?,?,?,?,?)');
    ip.run('Pembangunan Gedung Kantor','PT Maju Sejahtera','Yogyakarta','2026-10-01','2027-03-30',2850000000,42,'Berjalan');
    ip.run('Renovasi Jalan & Drainase','Dinas PUPR','Sleman','2026-09-15','2026-12-20',975000000,68,'Berjalan');
    ip.run('Pembangunan Gudang Logistik','CV Sumber Makmur','Bantul','2026-11-01','2027-04-15',1450000000,12,'Persiapan');

    const it = db.prepare('INSERT INTO tasks (project,name,start,end,progress,weight,pred,resource,critical) VALUES (?,?,?,?,?,?,?,?,?)');
    it.run(1,'Pekerjaan Persiapan','2026-10-01','2026-10-15',100,5,'','Mandor + 4 pekerja',0);
    it.run(1,'Pekerjaan Pondasi','2026-10-16','2026-11-20',75,20,'1','Tim struktur',1);
    it.run(1,'Struktur Beton','2026-11-21','2027-01-15',10,35,'2','Tim struktur + alat',1);
    it.run(1,'Arsitektur & Finishing','2027-01-16','2027-03-10',0,30,'3','Tim finishing',0);
    it.run(1,'MEP & Serah Terima','2027-03-11','2027-03-30',0,10,'4','Tim MEP',0);

    const ic = db.prepare('INSERT INTO costs (project,item,volume,unit,price,actual) VALUES (?,?,?,?,?,?)');
    ic.run(1,'Pekerjaan pondasi beton',120,'m³',1250000,98000000);
    ic.run(1,'Besi tulangan',8500,'kg',16500,92000000);
    ic.run(1,'Upah tenaga kerja',1,'ls',185000000,73000000);

    const ir = db.prepare('INSERT INTO resources (name,type,capacity,unit) VALUES (?,?,?,?)');
    ir.run('Tim Struktur','Tenaga Kerja',12,'orang');
    ir.run('Excavator','Alat',1,'unit');
    ir.run('Mandor','Tenaga Kerja',2,'orang');
  }
})();

/* ================== AUTH MIDDLEWARE ================== */
const ROLES = {
  'Admin Sistem':    { create:true, edit:true,  delete:true,  backup:true,  admin:true,  companyEdit:true,  approve:true  },
  'Owner':           { create:false,edit:false, delete:false, backup:true,  admin:false, companyEdit:false, approve:true  },
  'Konsultan MK':    { create:true, edit:true,  delete:false, backup:false, admin:false, companyEdit:false, approve:true  },
  'Kontraktor Utama':{ create:true, edit:true,  delete:true,  backup:false, admin:false, companyEdit:false, approve:false },
  'Sub-kontraktor':  { create:true, edit:true,  delete:false, backup:false, admin:false, companyEdit:false, approve:false },
  'Tamu':            { create:false,edit:false, delete:false, backup:false, admin:false, companyEdit:false, approve:false }
};

function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'Token tidak ada' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token tidak valid' }); }
}
function requirePerm(action) {
  return (req, res, next) => {
    const p = ROLES[req.user?.role] || ROLES['Tamu'];
    if (!p[action]) return res.status(403).json({ error: 'Hak akses tidak mencukupi' });
    next();
  };
}

/* ================== GENERIC CRUD ================== */
function makeCrud(table, columns, filterField = null) {
  const r = express.Router();
  r.get('/', authRequired, (req, res) => {
    let sql = `SELECT * FROM ${table}`, params = [];
    if (filterField && req.query[filterField] != null) { sql += ` WHERE ${filterField}=?`; params.push(req.query[filterField]); }
    sql += ' ORDER BY id ASC';
    res.json(db.prepare(sql).all(...params));
  });
  r.get('/:id', authRequired, (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Tidak ditemukan' });
    res.json(row);
  });
  r.post('/', authRequired, requirePerm('create'), (req, res) => {
    const cols = columns.filter(c => req.body[c] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'Body kosong' });
    const r2 = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`)
      .run(...cols.map(c => req.body[c]));
    res.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(r2.lastInsertRowid));
  });
  r.put('/:id', authRequired, requirePerm('edit'), (req, res) => {
    const cols = columns.filter(c => req.body[c] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'Body kosong' });
    const r2 = db.prepare(`UPDATE ${table} SET ${cols.map(c=>c+'=?').join(',')} WHERE id=?`)
      .run(...cols.map(c => req.body[c]), req.params.id);
    if (!r2.changes) return res.status(404).json({ error: 'Tidak ditemukan' });
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id));
  });
  r.delete('/:id', authRequired, requirePerm('delete'), (req, res) => {
    const r2 = db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);
    if (!r2.changes) return res.status(404).json({ error: 'Tidak ditemukan' });
    res.json({ ok: true });
  });
  return r;
}

/* ================== APP ================== */
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* --- AUTH --- */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email & password wajib' });
  const u = db.prepare('SELECT * FROM users WHERE LOWER(email)=?').get(String(email).toLowerCase());
  if (!u || !bcrypt.compareSync(password, u.password)) return res.status(401).json({ error: 'Email atau kata sandi salah.' });
  if (u.status !== 'Aktif') return res.status(403).json({ error: 'Akun belum aktif.' });
  const token = jwt.sign({ id:u.id, role:u.role, name:u.name, email:u.email }, JWT_SECRET, { expiresIn:'12h' });
  res.json({ token, user:{ id:u.id, name:u.name, email:u.email, role:u.role, status:u.status } });
});
app.post('/api/auth/guest', (req, res) => {
  const token = jwt.sign({ id:null, role:'Tamu', name:'Tamu', email:null }, JWT_SECRET, { expiresIn:'6h' });
  res.json({ token, user:{ id:null, name:'Tamu', email:null, role:'Tamu', status:'Guest' } });
});
app.get('/api/auth/me', authRequired, (req, res) => {
  if (req.user.id == null) return res.json({ user:{ id:null, role:'Tamu', name:'Tamu' } });
  const u = db.prepare('SELECT id,name,email,role,status FROM users WHERE id=?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'User tidak ditemukan' });
  res.json({ user:u });
});

/* --- CRUD --- */
app.use('/api/projects',  makeCrud('projects', ['name','client','location','start','end','budget','progress','status']));
app.use('/api/tasks',     makeCrud('tasks',    ['project','name','start','end','progress','weight','pred','resource','critical'], 'project'));
app.use('/api/costs',     makeCrud('costs',    ['project','item','volume','unit','price','actual'], 'project'));
app.use('/api/resources', makeCrud('resources',['name','type','capacity','unit']));
app.use('/api/reports',   makeCrud('reports',  ['project','projectName','date','work','workers','material','weather','progress','note','photo'], 'project'));
app.use('/api/docs',      makeCrud('docs',     ['project','title','number','category','version','date','owner','status']));
app.use('/api/issues',    makeCrud('issues',   ['project','title','priority','pic','due','status','detail']));
app.use('/api/approvals', makeCrud('approvals',['title','step','date','status']));

/* --- USERS (admin) --- */
app.get('/api/users', authRequired, requirePerm('admin'), (req, res) => {
  res.json(db.prepare('SELECT id,name,email,role,status FROM users ORDER BY id').all());
});
app.post('/api/users', authRequired, requirePerm('admin'), (req, res) => {
  const { name, email, password, role, status } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Field wajib kurang' });
  if (db.prepare('SELECT id FROM users WHERE LOWER(email)=?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'Email sudah terdaftar' });
  const r = db.prepare('INSERT INTO users (name,email,password,role,status) VALUES (?,?,?,?,?)')
    .run(name, email, bcrypt.hashSync(password, 10), role, status || 'Aktif');
  res.status(201).json(db.prepare('SELECT id,name,email,role,status FROM users WHERE id=?').get(r.lastInsertRowid));
});
app.put('/api/users/:id', authRequired, requirePerm('admin'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Tidak ditemukan' });
  const { name, email, password, role, status } = req.body;
  db.prepare('UPDATE users SET name=?,email=?,password=?,role=?,status=? WHERE id=?').run(
    name ?? u.name, email ?? u.email,
    password ? bcrypt.hashSync(password, 10) : u.password,
    role ?? u.role, status ?? u.status, req.params.id
  );
  res.json(db.prepare('SELECT id,name,email,role,status FROM users WHERE id=?').get(req.params.id));
});
app.delete('/api/users/:id', authRequired, requirePerm('admin'), (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Tidak bisa hapus diri sendiri' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

/* --- COMPANY --- */
app.get('/api/company', (req, res) => res.json(db.prepare('SELECT * FROM company WHERE id=1').get()));
app.put('/api/company', authRequired, requirePerm('companyEdit'), (req, res) => {
  const c = db.prepare('SELECT * FROM company WHERE id=1').get();
  const fields = ['name','short','tag','address','city','phone','wa','email','website','director','npwp','nib','founded','logo'];
  const merged = {};
  for (const f of fields) merged[f] = req.body[f] !== undefined ? req.body[f] : c[f];
  db.prepare(`UPDATE company SET name=?,short=?,tag=?,address=?,city=?,phone=?,wa=?,email=?,website=?,director=?,npwp=?,nib=?,founded=?,logo=? WHERE id=1`)
    .run(...fields.map(f => merged[f]));
  res.json(db.prepare('SELECT * FROM company WHERE id=1').get());
});

/* --- BACKUP --- */
const TABLES = ['projects','tasks','costs','resources','reports','docs','issues','approvals'];
app.get('/api/backup/export', authRequired, requirePerm('backup'), (req, res) => {
  const company = db.prepare('SELECT * FROM company WHERE id=1').get();
  const users = db.prepare('SELECT id,name,email,role,status FROM users').all();
  const payload = { company, users, meta:{ exportedAt:new Date().toISOString(), appVersion:'1.2.0' } };
  for (const t of TABLES) payload[t] = db.prepare(`SELECT * FROM ${t}`).all();
  res.setHeader('Content-Disposition', `attachment; filename="puguh-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json(payload);
});
app.post('/api/backup/restore', authRequired, requirePerm('backup'), (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Payload tidak valid' });
  const tx = db.transaction(() => {
    for (const t of TABLES) {
      db.prepare(`DELETE FROM ${t}`).run();
      if (Array.isArray(data[t])) for (const row of data[t]) {
        const cols = Object.keys(row).filter(k => k !== 'id');
        if (!cols.length) continue;
        db.prepare(`INSERT INTO ${t} (id, ${cols.join(',')}) VALUES (?, ${cols.map(()=>'?').join(',')})`)
          .run(row.id, ...cols.map(c => row[c]));
      }
    }
    if (data.company) {
      const c = data.company;
      db.prepare(`UPDATE company SET name=?,short=?,tag=?,address=?,city=?,phone=?,wa=?,email=?,website=?,director=?,npwp=?,nib=?,founded=?,logo=? WHERE id=1`)
        .run(c.name, c.short, c.tag, c.address, c.city, c.phone, c.wa, c.email, c.website, c.director, c.npwp, c.nib, c.founded, c.logo || '');
    }
  });
  try { tx(); res.json({ ok:true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* --- SPA FALLBACK --- */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

/* --- START --- */
app.listen(PORT, () => {
  console.log(`\n🚀 Puguh Konstruksi: http://localhost:${PORT}\n`);
  console.log('📧 Login demo:');
  console.log('   admin@puguhkonstruksi.co.id / admin123');
  console.log('   direktur@puguhkonstruksi.co.id / owner123');
  console.log('   mk@puguhkonstruksi.co.id / mk123');
  console.log('   kontraktor@puguhkonstruksi.co.id / kontraktor123\n');
});