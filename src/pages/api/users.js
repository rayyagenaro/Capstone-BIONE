import db from "@/lib/db";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const [users] = await db.query(
        "SELECT id, name, email, phone FROM users ORDER BY id ASC"
      );
      return res.status(200).json(users);
    } catch (err) {
      return res.status(500).json({ error: "Gagal mengambil user." });
    }
  }

  if (req.method === "PUT") {
    const { id, name, phone, password, adminPassword, emailAdmin } = req.body;

    // Update data profile (tanpa password)
    if (name && phone && id && !password) {
      try {
        await db.query(
          "UPDATE users SET name = ?, phone = ? WHERE id = ?",
          [name, phone, id]
        );
        return res.status(200).json({ message: "User berhasil diupdate" });
      } catch (err) {
        return res.status(500).json({ error: "Gagal update user." });
      }
    }

    // --- GANTI PASSWORD USER oleh ADMIN ---
    if (password && id && adminPassword && emailAdmin) {
      try {
        const [adminRows] = await db.query(
          "SELECT password FROM admins WHERE email = ? LIMIT 1",
          [emailAdmin]
        );
        if (!adminRows || adminRows.length === 0) {
          return res.status(400).json({ error: "Email admin tidak ditemukan. Hubungi developer." });
        }
        const adminHash = adminRows[0].password;
        const ok = await bcrypt.compare(adminPassword, adminHash);
        if (!ok) {
          return res.status(401).json({ error: "Password admin salah." });
        }
        const newHash = await bcrypt.hash(password, 10);
        await db.query(
          "UPDATE users SET password = ? WHERE id = ?",
          [newHash, id]
        );
        return res.status(200).json({ message: "Password user berhasil diupdate" });
      } catch (err) {
        return res.status(500).json({ error: "Gagal update password user." });
      }
    }

    return res.status(400).json({ error: "Data tidak lengkap." });
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
