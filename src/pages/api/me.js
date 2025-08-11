// pages/api/me.js
import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  try {
    const token =
      req.cookies.token || req.cookies.user_token || req.cookies.admin_token;
    if (!token) return res.status(200).json({ hasToken: false });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(200).json({ hasToken: false, error: 'JWT_SECRET missing' });

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return res.status(200).json({ hasToken: true, payload });
  } catch {
    return res.status(200).json({ hasToken: false });
  }
}
