// pages/api/logout.js
export default function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  }

  const isProd = process.env.NODE_ENV === 'production';
  const base = `Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`;

  // hapus semua variasi cookie yang mungkin ada
  res.setHeader('Set-Cookie', [
    `token=; HttpOnly; ${base}`,
    `user_token=; HttpOnly; ${base}`,
    `admin_token=; HttpOnly; ${base}`,
    `role=; ${base}`,
    `displayName=; ${base}`,
  ]);

  return res.status(200).json({ ok: true });
}
