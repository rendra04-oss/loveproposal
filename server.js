import express from 'express';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const db = new Database(path.join(__dirname, 'data.sqlite'));
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'ganti-password-admin';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

 db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  score INTEGER DEFAULT 0,
  final_answer TEXT,
  user_agent TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);
`);

const now = () => new Date().toISOString();

app.post('/api/session', (req, res) => {
  const name = String(req.body?.name || 'Seseorang').slice(0, 80);
  const id = nanoid(12);
  db.prepare('INSERT INTO sessions (id,name,started_at,user_agent) VALUES (?,?,?,?)')
    .run(id, name, now(), req.headers['user-agent'] || '');
  res.json({ id, name });
});

app.post('/api/event', (req, res) => {
  const { sessionId, type, payload } = req.body || {};
  if (!sessionId || !type) return res.status(400).json({ error: 'Missing sessionId/type' });
  const session = db.prepare('SELECT id FROM sessions WHERE id=?').get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  db.prepare('INSERT INTO events (session_id,type,payload,created_at) VALUES (?,?,?,?)')
    .run(sessionId, String(type).slice(0, 80), JSON.stringify(payload ?? {}), now());
  if (type === 'score') {
    const score = Math.max(0, Math.min(100, Number(payload?.score || 0)));
    db.prepare('UPDATE sessions SET score=? WHERE id=?').run(score, sessionId);
  }
  if (type === 'completed') {
    db.prepare('UPDATE sessions SET completed_at=?, final_answer=? WHERE id=?')
      .run(now(), String(payload?.answer || '').slice(0, 80), sessionId);
  }
  res.json({ ok: true });
});

app.get('/api/admin/history', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  const sessions = db.prepare(`SELECT id,name,started_at,completed_at,score,final_answer FROM sessions ORDER BY started_at DESC`).all();
  const events = db.prepare(`SELECT session_id,type,payload,created_at FROM events ORDER BY created_at ASC`).all()
    .map(e => ({...e, payload: (()=>{try{return JSON.parse(e.payload)}catch{return {}}})()}));
  res.json({ sessions, events });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Romantic site running on http://localhost:${PORT}`));
