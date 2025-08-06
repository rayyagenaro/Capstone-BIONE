// pages/api/booking.js
import db from "@/lib/db";

/**
 * Helper function to format a bulk insert query for the pivot table.
 * @param {number} bookingId The ID of the parent booking.
 * @param {number[]} vehicleTypeIds An array of vehicle type IDs.
 * @returns {{query: string, values: any[]}} An object containing the SQL query string and the flat array of values.
 */
function formatInsertBookingVehicleTypes(bookingId, vehicleTypeIds) {
    if (!Array.isArray(vehicleTypeIds) || vehicleTypeIds.length === 0) {
        // Return an empty query if there are no vehicle types to insert
        return { query: "", values: [] };
    }
    const placeholder = vehicleTypeIds.map(() => "(?, ?)").join(", ");
    // Note the table name change to 'booking_vehicle_types' to match earlier suggestions
    const query = `INSERT INTO booking_vehicle_types (booking_id, vehicle_type_id) VALUES ${placeholder}`;
    const values = vehicleTypeIds.flatMap(typeId => [bookingId, typeId]);
    return { query, values };
}

export default async function handler(req, res) {
    // Handle GET requests to fetch user's bookings
    if (req.method === "GET") {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: "User ID diperlukan." });
        }

        try {
            const query = `
                SELECT 
                    b.id, b.tujuan, b.start_date, b.end_date, b.status_id, b.created_at,
                    -- Use JSON_ARRAYAGG for cleaner aggregation into a JSON array, requires MySQL 5.7+
                    -- This avoids the CONCAT and manual JSON parsing issues.
                    JSON_ARRAYAGG(
                        JSON_OBJECT('id', vt.id, 'name', vt.name)
                    ) AS vehicle_types
                FROM 
                    bookings b
                LEFT JOIN 
                    booking_vehicle_types bv ON b.id = bv.booking_id
                LEFT JOIN 
                    vehicle_types vt ON bv.vehicle_type_id = vt.id
                WHERE 
                    b.user_id = ?
                GROUP BY 
                    b.id
                ORDER BY 
                    b.created_at DESC
            `;

            const [bookings] = await db.query(query, [userId]);

            // Post-process to handle cases where a booking has no vehicles
            const processedBookings = bookings.map(booking => ({
                ...booking,
                // If the first vehicle type is null (from LEFT JOIN on no match), return an empty array.
                vehicle_types: booking.vehicle_types[0]?.id === null ? [] : booking.vehicle_types
            }));
            
            return res.status(200).json(processedBookings);

        } catch (error) {
            console.error("Get Bookings API Error:", error);
            return res.status(500).json({ error: "Gagal mengambil data booking dari database." });
        }
    }

    // Handle POST requests to create a new booking
    if (req.method === "POST") {
        const {
            user_id, tujuan, jumlah_orang, jumlah_kendaraan, volume_kg,
            start_date, end_date, phone, keterangan, vehicle_type_ids
        } = req.body;

        // Simplified validation check
        if (!user_id || !tujuan || !start_date || !end_date || !phone || !Array.isArray(vehicle_type_ids) || vehicle_type_ids.length === 0) {
            return res.status(400).json({ error: "Field wajib (user, tujuan, tanggal, no hp, dan minimal 1 tipe kendaraan) tidak boleh kosong." });
        }

        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const bookingQuery = `
                INSERT INTO bookings 
                  (user_id, status_id, tujuan, jumlah_orang, jumlah_kendaraan, volume_kg, start_date, end_date, phone, keterangan) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            // The value '1' represents the initial status ID, e.g., 'Menunggu Persetujuan'
            const bookingValues = [
                user_id, 1, tujuan, jumlah_orang, jumlah_kendaraan, 
                volume_kg, start_date, end_date, phone, keterangan
            ];

            const [result] = await connection.query(bookingQuery, bookingValues);
            const newBookingId = result.insertId;

            // Insert related vehicle types into the pivot table
            const { query: typesQuery, values: typesValues } = formatInsertBookingVehicleTypes(newBookingId, vehicle_type_ids);
            
            // Only execute the query if it's not empty
            if (typesQuery) {
                await connection.query(typesQuery, typesValues);
            }
            
            await connection.commit();

            return res.status(201).json({
                id: newBookingId,
                message: "Booking berhasil dibuat dan sedang menunggu persetujuan."
            });

        } catch (error) {
            await connection.rollback();
            console.error("Booking API Error (Transaction):", error);
            return res.status(500).json({ error: "Gagal menyimpan data booking. Semua perubahan telah dibatalkan." });
        } finally {
            connection.release();
        }
    }

    // If method is not GET or POST, return 405 Method Not Allowed
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}