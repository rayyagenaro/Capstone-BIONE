// pages/api/logout.js
export default function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  }

  const isProd = process.env.NODE_ENV === 'production';
  const common = `SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`;

  // HttpOnly session cookies (baru + defensif legacy)
  const killHttpOnly = [
    `user_session=; HttpOnly; Path=/; ${common}`,
    `admin_session=; HttpOnly; Path=/; ${common}`,
    // hapus legacy
    `token=; HttpOnly; Path=/; ${common}`,
    `user_token=; HttpOnly; Path=/; ${common}`,
    `admin_token=; HttpOnly; Path=/; ${common}`,
  ];

  // Non-HttpOnly UI cookies
  const killClient = [
    `role=; Path=/; ${common}`,
    `displayName=; Path=/; ${common}`,
  ];

  res.setHeader('Set-Cookie', [...killHttpOnly, ...killClient]);
  return res.status(200).json({ ok: true });
}
