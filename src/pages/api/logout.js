// pages/api/logout.js
export default function handler(req, res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`
  );
  res.status(200).json({ ok: true });
}
