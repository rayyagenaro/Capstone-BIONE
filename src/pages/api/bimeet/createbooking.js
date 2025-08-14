// /pages/api/bimeet/createbooking.js
import { jwtVerify } from "jose";
import db from "@/lib/db"; // sesuaikan: file ini ada di /pages/api/bimeet/, database.js di /pages/api/

// util: pastikan format DATETIME MySQL: "YYYY-MM-DD HH:MM:SS"
function toSqlDateTime(isoOrDate) {
  const d = new Date(isoOrDate);
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day} ${h}:${mi}:${s}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    // ===== Auth
    const token = req.cookies?.user_session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      clockTolerance: 10,
    });

    // ===== Body
    const {
      user_id,
      room_id,
      unit_kerja,
      title,
      description,
      start_datetime,
      end_datetime,
      participants,
      contact_phone,
      pic_name,
    } = req.body || {};

    // ===== Validasi
    const miss = [];
    if (!room_id) miss.push("room_id");
    if (!unit_kerja) miss.push("unit_kerja");
    if (!title) miss.push("title");
    if (!start_datetime) miss.push("start_datetime");
    if (!end_datetime) miss.push("end_datetime");
    if (!participants) miss.push("participants");
    if (!contact_phone) miss.push("contact_phone");
    if (!pic_name) miss.push("pic_name");
    if (miss.length) return res.status(400).json({ error: `Field wajib: ${miss.join(", ")}` });

    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
      return res.status(400).json({ error: "Rentang waktu tidak valid" });
    }

    // ===== Kapasitas ruangan
    const [rooms] = await db.query("SELECT capacity FROM bimeet_rooms WHERE id = ?", [room_id]);
    if (!rooms.length) return res.status(404).json({ error: "Ruangan tidak ditemukan" });
    if (Number(participants) > Number(rooms[0].capacity)) {
      return res.status(400).json({ error: `Melebihi kapasitas (${rooms[0].capacity} org)` });
    }

    // ===== Cek bentrok
    // HANYA booking Approved (status_id = 2) yang mengunci ruangan
    const [conflict] = await db.query(
      `SELECT id FROM bimeet_bookings
       WHERE room_id = ?
         AND status_id = 2
         AND NOT (end_datetime <= ? OR start_datetime >= ?)
       LIMIT 1`,
      [room_id, toSqlDateTime(start), toSqlDateTime(end)]
    );
    if (conflict.length) {
      return res.status(409).json({ error: "Jadwal bentrok dengan pemakaian lain" });
    }

    // ===== Insert
    // Default status PENDING = 1 (lihat tabel booking_statuses)
    const [result] = await db.query(
      `INSERT INTO bimeet_bookings
        (user_id, room_id, unit_kerja, title, description,
         start_datetime, end_datetime, participants, contact_phone, pic_name, status_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        user_id || payload.sub,
        room_id,
        unit_kerja,
        title,
        description || null,
        toSqlDateTime(start),
        toSqlDateTime(end),
        Number(participants),
        contact_phone,
        pic_name,
      ]
    );

    return res.status(200).json({ ok: true, id: result.insertId });
  } catch (e) {
    // tampilkan detail supaya mudah debug
    console.error("createbooking error:", e);
    return res.status(500).json({
      error: "Server error",
      message: e?.message,
      code: e?.code,
      sqlMessage: e?.sqlMessage,
      sqlState: e?.sqlState,
    });
  }
}
