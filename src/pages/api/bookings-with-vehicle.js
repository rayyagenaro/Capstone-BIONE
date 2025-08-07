import db from "@/lib/db";

export default async function handler(req, res) {
  const { bookingId } = req.query;

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID tidak diberikan" });
  }

  try {
    const query = `
      SELECT 
        b.*,
        u.name as user_name,
        CONCAT('[', 
          IF(COUNT(vt.id) > 0, GROUP_CONCAT(DISTINCT JSON_OBJECT('id', vt.id, 'name', vt.name, 'quantity', bv.quantity)), '')
        , ']') AS vehicle_types
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN booking_vehicle_types bv ON b.id = bv.booking_id
      LEFT JOIN vehicle_types vt ON bv.vehicle_type_id = vt.id
      WHERE b.id = ?
      GROUP BY b.id
    `;

    const [results] = await db.query(query, [bookingId]);

    if (results.length === 0) {
      return res.status(404).json({ error: "Booking tidak ditemukan." });
    }

    const booking = results[0];
    let parsedVehicleTypes = [];

    try {
      if (booking.vehicle_types && booking.vehicle_types.length > 2) {
        parsedVehicleTypes = JSON.parse(booking.vehicle_types);
      }
    } catch (e) {
      parsedVehicleTypes = [];
    }

    booking.vehicle_types = Array.isArray(parsedVehicleTypes) 
      ? parsedVehicleTypes.filter(vt => vt && vt.id !== null) 
      : [];

    return res.status(200).json(booking);
  } catch (error) {
    console.error("Error API bookings-with-vehicle:", error);
    return res.status(500).json({ error: "Gagal mengambil data booking." });
  }
}
