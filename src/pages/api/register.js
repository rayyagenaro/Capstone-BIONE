import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nama, nip, hp, email, password } = req.body;

  if (!nama || !nip || !hp || !email || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  try {
    // Cek apakah email sudah terdaftar
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan ke database -> default Pending (1) & alasan null
    await db.query(
      `INSERT INTO users
        (name, email, phone, nip, password, verification_status_id, rejection_reason)
       VALUES (?, ?, ?, ?, ?, 1, NULL)`,
      [nama, email, hp, nip, hashedPassword]
    );

    return res.status(201).json({
      message: 'Registrasi berhasil. Akun menunggu verifikasi admin.'
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan di server' });
  }
}
