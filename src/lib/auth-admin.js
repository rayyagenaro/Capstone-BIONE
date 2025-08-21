// lib/auth-admin.js
export async function verifyAdmin(req) {
  const ns = getNsFromReq(req);
  const cookieName = `admin_session__${ns}`;
  const token = req.cookies?.[cookieName];

  console.log('[DEBUG verifyAdmin] ns=', ns, 'cookieName=', cookieName, 'token ada?', !!token);

  if (!token) return { ok: false, reason: 'NO_TOKEN' };

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    console.log('[DEBUG verifyAdmin] payload=', payload);
    return { ok: true, payload };
  } catch (e) {
    console.error('[DEBUG verifyAdmin] jwtVerify error=', e);
    return { ok: false, reason: 'INVALID_TOKEN' };
  }
}
