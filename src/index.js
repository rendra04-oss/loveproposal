const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' }
});

const now = () => new Date().toISOString();
const clean = (value, max = 200) => String(value ?? '').slice(0, max);

async function handleApi(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'POST' && url.pathname === '/api/session') {
    const body = await request.json().catch(() => ({}));
    const name = clean(body.name || 'Seseorang', 80) || 'Seseorang';
    const id = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    const started = now();
    await env.DB.prepare(
      'INSERT INTO sessions (id,name,started_at,user_agent) VALUES (?,?,?,?)'
    ).bind(id, name, started, request.headers.get('user-agent') || '').run();
    return json({ id, name });
  }

  if (method === 'POST' && url.pathname === '/api/event') {
    const body = await request.json().catch(() => ({}));
    const sessionId = clean(body.sessionId, 40);
    const type = clean(body.type, 80);
    const payload = body.payload ?? {};
    if (!sessionId || !type) return json({ error: 'Missing sessionId/type' }, 400);
    const session = await env.DB.prepare('SELECT id FROM sessions WHERE id=?').bind(sessionId).first();
    if (!session) return json({ error: 'Session not found' }, 404);
    await env.DB.prepare(
      'INSERT INTO events (session_id,type,payload,created_at) VALUES (?,?,?,?)'
    ).bind(sessionId, type, JSON.stringify(payload), now()).run();
    if (type === 'score') {
      const score = Math.max(0, Math.min(100, Number(payload?.score || 0)));
      await env.DB.prepare('UPDATE sessions SET score=? WHERE id=?').bind(score, sessionId).run();
    }
    if (type === 'completed') {
      await env.DB.prepare('UPDATE sessions SET completed_at=?, final_answer=? WHERE id=?')
        .bind(now(), clean(payload?.answer, 80), sessionId).run();
    }
    return json({ ok: true });
  }

  if (method === 'GET' && url.pathname === '/api/admin/history') {
    const key = request.headers.get('x-admin-key');
    if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ error: 'Unauthorized' }, 401);
    const sessions = await env.DB.prepare(
      'SELECT id,name,started_at,completed_at,score,final_answer FROM sessions ORDER BY started_at DESC'
    ).all();
    const events = await env.DB.prepare(
      'SELECT session_id,type,payload,created_at FROM events ORDER BY created_at ASC'
    ).all();
    return json({
      sessions: sessions.results,
      events: events.results.map(e => ({
        ...e,
        payload: (() => { try { return JSON.parse(e.payload || '{}'); } catch { return {}; } })()
      }))
    });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  }
};
