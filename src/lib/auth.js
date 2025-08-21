// lib/auth.js
import { jwtVerify } from 'jose';
import { getNsFromReq } from '@/lib/ns-server';

/**
 * Verify token dan role berdasarkan namespace (ns).
 * 
 * @param {NextApiRequest} req - request Next.js API
 * @param {string[]} roles - role yang diizinkan, default ['user']
 * @returns {Promise<{ok:boolean, reason?:string, error?:string, payload?:object, userId?:number, role?:string, ns?:string}>}
 */
export async function verifyAuth(req, roles = ['user']) {
  try {
    const ns = getNsFromReq(req);

    // Cari token sesuai ns
    const token =
      (ns && (req.cookies?.[`user_session__${ns}`] || req.cookies?.[`admin_session__${ns}`])) ||
      null;

    console.log('=== DEBUG verifyAuth ===');
    console.log('NS:', ns);
    console.log('Token short:', token ? token.slice(0, 20) + '...' : '(null)');
    console.log('Allowed roles:', roles);

    if (!token) return { ok: false, reason: 'NO_TOKEN' };

    const secret = process.env.JWT_SECRET;
    if (!secret) return { ok: false, reason: 'NO_SECRET' };

    let payload;
    try {
      const res = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ['HS256'],
        clockTolerance: 10, // toleransi 10 detik
      });
      payload = res.payload;
      console.log('Decoded payload:', payload);
    } catch (err) {
      console.error('JWT Verify Error:', err.message);
      return { ok: false, reason: 'JWT_INVALID', error: err.message };
    }

    const role = payload?.role || '';
    if (!roles.includes(role)) {
      console.warn('ROLE mismatch:', role);
      return { ok: false, reason: 'ROLE' };
    }

    const userId = Number(payload?.sub ?? payload?.user_id ?? payload?.id);
    return { ok: true, payload, userId, role, ns };
  } catch (e) {
    console.error('verifyAuth fail', e);
    return { ok: false, reason: 'VERIFY_FAIL', error: e.message };
  }
}
