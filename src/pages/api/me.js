// pages/api/me.js
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');

async function verifyOrNull(token) {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload; // { sub, role, name, email, iat, exp, ... }
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // Parse cookies dari header (andal untuk Pages API)
  const cookies = req.headers.cookie || '';
  const get = (name) =>
    cookies.split('; ').find((c) => c.startsWith(name + '='))?.split('=')[1];

  const userToken = get('user_session');
  const adminToken = get('admin_session');

  const scope = (req.query.scope || req.headers['x-session-scope'] || '').toString().toLowerCase();

  if (scope === 'user') {
    const payload = await verifyOrNull(userToken);
    return res.status(200).json({ scope: 'user', hasToken: !!payload, payload: payload || null });
  }

  if (scope === 'admin') {
    const payload = await verifyOrNull(adminToken);
    return res.status(200).json({ scope: 'admin', hasToken: !!payload, payload: payload || null });
  }

  const [userPayload, adminPayload] = await Promise.all([
    verifyOrNull(userToken),
    verifyOrNull(adminToken),
  ]);

  return res.status(200).json({
    scope: 'both',
    user: { hasToken: !!userPayload, payload: userPayload || null },
    admin: { hasToken: !!adminPayload, payload: adminPayload || null },
  });
}
