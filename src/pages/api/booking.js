// pages/api/booking.js
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID diperlukan" });
    }

    try {
      // --- QUERY YANG DISERDERHANAKAN (TANPA JOIN) ---
      // Query ini hanya mengambil data dari tabel 'bookings'
      const query = `
        SELECT 
          id,
          tujuan,
          start_date,
          end_date,
          status_id,
          vehicle_type_id
        FROM bookings
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;
      
      const [bookings] = await db.query(query, [userId]);
      
      return res.status(200).json(bookings);

    } catch (error) {
      console.error("Get Bookings API Error:", error);
      return res.status(500).json({ error: "Gagal mengambil data booking dari database." });
    }
  }


  // --- BAGIAN 2: Menangani POST Request ---
  if (req.method === "POST") {
    // Ambil data dari body request
    const {
      user_id,
      vehicle_type_id,
      lokasi,
      tujuan,
      jumlah_orang,
      jumlah_kendaraan,
      volume_kg,
      start_date,
      end_date,
      phone,
      keterangan,
    } = req.body;

    // Validasi input dasar
    if (!user_id || !tujuan || !start_date || !end_date || !phone) {
      return res.status(400).json({ error: "Field wajib (user, tujuan, tanggal, no hp) tidak boleh kosong." });
    }

    try {
      const initial_status_id = 1; // Status 'Pending'

      const query = `
        INSERT INTO bookings 
          (user_id, vehicle_type_id, status_id, lokasi, tujuan, jumlah_orang, jumlah_kendaraan, volume_kg, start_date, end_date, phone, keterangan) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        user_id, vehicle_type_id, initial_status_id, lokasi, tujuan, jumlah_orang,
        jumlah_kendaraan, volume_kg, start_date, end_date, phone, keterangan,
      ];

      const [result] = await db.query(query, values);

      return res.status(201).json({
        id: result.insertId,
        message: "Booking berhasil dibuat dan sedang menunggu persetujuan."
      });

    } catch (error) {
      console.error("Booking API Error:", error);
      return res.status(500).json({ error: "Gagal menyimpan data booking ke database." });
    }
  }

  // --- BAGIAN 3: Menangani Metode Lainnya ---
  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}