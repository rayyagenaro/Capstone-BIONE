// pages/api/booking.js
import db from "@/lib/db";

// Helper function ini tidak berubah
function formatInsertBookingVehicleTypes(bookingId, vehicleTypeIds) {
    if (!Array.isArray(vehicleTypeIds) || vehicleTypeIds.length === 0) {
        return { query: "", values: [] };
    }
    const placeholder = vehicleTypeIds.map(() => "(?, ?)").join(", ");
    const query = `INSERT INTO booking_vehicle_types (booking_id, vehicle_type_id) VALUES ${placeholder}`;
    const values = vehicleTypeIds.flatMap(typeId => [bookingId, typeId]);
    return { query, values };
}

export default async function handler(req, res) {
    
    // --- Method GET (Mengambil Data) ---
    if (req.method === "GET") {
        const { userId, bookingId } = req.query; // Tambahkan bookingId

        try {
            let whereClause = '';
            const queryParams = [];

            // --- LOGIKA BARU UNTUK MENGAMBIL DATA ---
            if (bookingId) {
                // Prioritas: Jika ada bookingId, ambil satu data spesifik
                whereClause = 'WHERE b.id = ?';
                queryParams.push(bookingId);
            } else if (userId) {
                // Jika ada userId, ambil booking untuk user tersebut
                whereClause = 'WHERE b.user_id = ?';
                queryParams.push(userId);
            } else {
                // Jika tidak ada keduanya (request dari admin), ambil booking yang 'Pending'
                whereClause = 'WHERE b.status_id = 1';
            }
            // --- AKHIR LOGIKA BARU ---

            const query = `
                SELECT 
                    b.*,
                    u.name as user_name,
                    CONCAT('[', 
                        IF(COUNT(vt.id) > 0, GROUP_CONCAT(DISTINCT JSON_OBJECT('id', vt.id, 'name', vt.name) SEPARATOR ','), '')
                    , ']') AS vehicle_types
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.id
                LEFT JOIN booking_vehicle_types bv ON b.id = bv.booking_id
                LEFT JOIN vehicle_types vt ON bv.vehicle_type_id = vt.id
                ${whereClause} 
                GROUP BY b.id
                ORDER BY b.created_at DESC
            `;

            const [results] = await db.query(query, queryParams);

            // Jika mencari berdasarkan bookingId dan tidak ditemukan, kirim 404
            if (bookingId && results.length === 0) {
                return res.status(404).json({ error: "Booking tidak ditemukan." });
            }

            // Proses data untuk mengubah string vehicle_types menjadi array JSON
            const processedResults = results.map(booking => {
                let parsedVehicleTypes = [];
                try {
                    if (booking.vehicle_types && booking.vehicle_types.length > 2) {
                       parsedVehicleTypes = JSON.parse(booking.vehicle_types);
                    }
                } catch (e) { parsedVehicleTypes = []; }
                return {
                    ...booking,
                    vehicle_types: Array.isArray(parsedVehicleTypes) ? parsedVehicleTypes.filter(vt => vt && vt.id !== null) : [],
                };
            });
            
            // Jika mencari satu booking, kembalikan objek. Jika list, kembalikan array.
            const responseData = bookingId ? processedResults[0] : processedResults;
            return res.status(200).json(responseData);

        } catch (error) {
            console.error("Get Bookings API Error:", error); 
            return res.status(500).json({ error: "Gagal mengambil data booking.", details: error.message });
        }
    }

    // --- Method PUT (Update Status Booking) BARU ---
    if (req.method === "PUT") {
        const { bookingId, newStatusId } = req.body;

        if (!bookingId || !newStatusId) {
            return res.status(400).json({ error: "Booking ID dan Status baru diperlukan." });
        }

        try {
            const query = "UPDATE bookings SET status_id = ? WHERE id = ?";
            const [result] = await db.query(query, [newStatusId, bookingId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Booking tidak ditemukan untuk diupdate." });
            }

            return res.status(200).json({ message: "Status booking berhasil diperbarui." });

        } catch (error) {
            console.error("Update Booking Status Error:", error);
            return res.status(500).json({ error: "Gagal memperbarui status booking.", details: error.message });
        }
    }

    res.setHeader("Allow", ["GET", "POST", "PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}