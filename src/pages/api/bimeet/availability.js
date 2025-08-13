// /pages/api/bimeet/availability.js
import db from "@/lib/db"; // <-- SESUAIKAN path pool mysql2/promise kamu

// fallback kalau DB belum lengkap
const FALLBACK_ROOMS = [
  { id: 1, name: "SP", floor: 2, capacity: 15 },
  { id: 2, name: "MI", floor: 3, capacity: 15 },
  { id: 3, name: "Blambangan", floor: 4, capacity: 50 },
  { id: 4, name: "Jenggolo", floor: 4, capacity: 15 },
  { id: 5, name: "Integritas", floor: 4, capacity: 15 },
  { id: 6, name: "Profesionalisme", floor: 4, capacity: 15 },
  { id: 7, name: "Kahuripan", floor: 5, capacity: 70 },
  { id: 8, name: "Singosari", floor: 5, capacity: 300 },
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "start & end are required (ISO string)" });
    }

    // Validasi tanggal
    const startDt = new Date(start);
    const endDt = new Date(end);
    if (isNaN(startDt) || isNaN(endDt) || endDt <= startDt) {
      return res.status(400).json({ error: "Invalid datetime range" });
    }

    // --- Ambil dari tabel bimeet_* ---
    try {
      const [rows] = await db.query(
        `
        SELECT
          r.id,
          r.name,
          r.floor,
          r.capacity,
          rs.id   AS status_id,
          rs.name AS status_name,
          -- hitung apakah ada booking bentrok pada [start, end)
          SUM(
            CASE
              WHEN b.id IS NULL THEN 0
              WHEN b.status IN ('pending','approved')
               AND NOT (b.end_datetime <= ? OR b.start_datetime >= ?) THEN 1
              ELSE 0
            END
          ) AS conflicts
        FROM bimeet_rooms r
        JOIN bimeet_room_status rs
          ON rs.id = r.status_id
        LEFT JOIN bimeet_bookings b
          ON b.room_id = r.id
        GROUP BY r.id
        ORDER BY r.floor, r.name
        `,
        [startDt.toISOString(), endDt.toISOString()]
      );

      const data = rows.map((r) => {
        const hasConflict = Number(r.conflicts) > 0;
        const isActive = Number(r.status_id) === 1; // 1 = Available (operasional)
        return {
          id: r.id,
          name: r.name,
          floor: r.floor,
          capacity: r.capacity,
          status_id: r.status_id,
          status_name: r.status_name, // Available / Unavailable / Maintenance
          available: isActive && !hasConflict, // ini yang dipakai UI
        };
      });

      return res.status(200).json({ rooms: data });
    } catch (e) {
      // --- Fallback (DB belum lengkap) ---
      let conflictMap = {};
      try {
        const [crows] = await db.query(
          `
          SELECT room_id, COUNT(*) AS conflicts
          FROM bimeet_bookings
          WHERE NOT (end_datetime <= ? OR start_datetime >= ?)
            AND status IN ('pending','approved')
          GROUP BY room_id
          `,
          [startDt.toISOString(), endDt.toISOString()]
        );
        conflictMap = Object.fromEntries(crows.map((r) => [r.room_id, Number(r.conflicts) > 0]));
      } catch {
        // biarkan kosong
      }

      const data = FALLBACK_ROOMS.map((r) => ({
        ...r,
        status_id: 1,
        status_name: "Available",
        available: !conflictMap[r.id],
      }));

      return res.status(200).json({ rooms: data });
    }
  } catch (err) {
    console.error("bimeet availability error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
