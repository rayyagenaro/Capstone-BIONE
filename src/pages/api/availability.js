// pages/api/availability.js
import db from '@/lib/db'; // Pastikan import koneksi database MySQL-mu

export default async function handler(req, res) {
  try {
    // Hitung jumlah driver
    const [driversRows] = await db.query('SELECT COUNT(*) as total FROM drivers');
    const totalDrivers = driversRows[0]?.total ?? 0;

    // Hitung jumlah kendaraan per jenis
    // Misal fieldnya: jenis (ubah kalau di DB kamu beda)
    const [vehicleRows] = await db.query(
      'SELECT jenis, COUNT(*) as jumlah FROM vehicles GROUP BY jenis'
    );

    // Format hasil
    res.status(200).json({
      drivers: totalDrivers,
      vehicles: vehicleRows, // [{jenis: 'SUV', jumlah: 3}, ...]
    });
  } catch (err) {
    console.error('Error fetch availability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
