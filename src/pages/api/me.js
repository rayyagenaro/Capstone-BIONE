// pages/api/me.js
import { jwtVerify } from 'jose';
export default async function handler(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(200).json({ hasToken: false });
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    res.status(200).json({ hasToken: true, payload });
  } catch (e) {
    res.status(200).json({ hasToken: false, error: String(e) });
  }
}
