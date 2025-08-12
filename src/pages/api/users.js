import db from "@/lib/db";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  // ================= GET (dengan status & filter) =================
  if (req.method === "GET") {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // filter opsional ?vstatus=Pending|Verified|Rejected atau angka 1/2/3
      const rawStatus = (req.query.vstatus || '').toString().trim();
      let where = '';
      const params = [];

      if (rawStatus) {
        if (/^\d+$/.test(rawStatus)) {
          where = 'WHERE u.verification_status_id = ?';
          params.push(parseInt(rawStatus, 10));
        } else {
          where = 'WHERE vs.name = ?';
          params.push(rawStatus);
        }
      }

      const [[{ totalItems }]] = await db.query(
        `SELECT COUNT(*) AS totalItems
           FROM users u
           JOIN verification_status vs ON vs.id = u.verification_status_id
           ${where}`,
        params
      );

      const [users] = await db.query(
        `SELECT u.id, u.name, u.email, u.phone, u.nip,
                u.verification_status_id, vs.name AS verification_status_name,
                u.rejection_reason
           FROM users u
           JOIN verification_status vs ON vs.id = u.verification_status_id
           ${where}
           ORDER BY u.id ASC
           LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalPages = Math.ceil(totalItems / limit);

      return res.status(200).json({
        data: users,
        pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit },
      });

    } catch (err) {
      console.error("API GET Error:", err);
      return res.status(500).json({ error: "Gagal mengambil data user." });
    }
  }

  // ================= PUT (tidak diubah) =================
  if (req.method === "PUT") {
    const { id, name, phone, password, adminPassword, emailAdmin } = req.body;

    if (name && phone && id && !password) {
      try {
        await db.query("UPDATE users SET name = ?, phone = ? WHERE id = ?", [name, phone, id]);
        return res.status(200).json({ message: "User berhasil diupdate" });
      } catch (err) {
        return res.status(500).json({ error: "Gagal update user." });
      }
    }

    // Ganti password user oleh admin (butuh verifikasi admin)
    if (password && id && adminPassword && emailAdmin) {
      try {
        const [adminRows] = await db.query(
          "SELECT password FROM admins WHERE email = ? LIMIT 1",
          [emailAdmin]
        );
        if (!adminRows?.length) {
          return res.status(400).json({ error: "Email admin tidak ditemukan. Hubungi developer." });
        }
        const adminHash = adminRows[0].password;
        const ok = await bcrypt.compare(adminPassword, adminHash);
        if (!ok) return res.status(401).json({ error: "Password admin salah." });

        const newHash = await bcrypt.hash(password, 10);
        await db.query("UPDATE users SET password = ? WHERE id = ?", [newHash, id]);
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
