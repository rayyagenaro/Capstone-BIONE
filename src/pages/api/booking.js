// /pages/api/booking.js
import db from "@/lib/db";

// --- PERUBAHAN 1: Update helper function ---
// Sekarang menerima 'vehicleDetails' dan memasukkan 3 nilai (termasuk quantity)
function formatInsertBookingVehicleTypes(bookingId, vehicleDetails) {
    if (!Array.isArray(vehicleDetails) || vehicleDetails.length === 0) {
        return { query: "", values: [] };
    }
    // Placeholder sekarang untuk 3 kolom: (?, ?, ?)
    const placeholder = vehicleDetails.map(() => "(?, ?, ?)").join(", ");
    
    // Query INSERT sekarang menyertakan kolom 'quantity'
    // Pastikan tabel Anda bernama 'booking_vehicle_types' dan memiliki kolom 'quantity'
    const query = `INSERT INTO booking_vehicle_types (booking_id, vehicle_type_id, quantity) VALUES ${placeholder}`;
    
    // Values sekarang mengambil id dan quantity dari setiap objek detail
    const values = vehicleDetails.flatMap(detail => [bookingId, detail.id, detail.quantity]);
    
    return { query, values };
}

export default async function handler(req, res) {
    
    // --- Method GET (Mengambil Data) ---
    if (req.method === "GET") {
        const { userId, bookingId, status } = req.query;

        try {
            let whereClause = '';
            const queryParams = [];

            if (bookingId) {
                whereClause = 'WHERE b.id = ?';
                queryParams.push(bookingId);
            } else if (userId) {
                whereClause = 'WHERE b.user_id = ?';
                queryParams.push(userId);
            } else if (status === 'pending') {
                whereClause = 'WHERE b.status_id = 1';
            }
            
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
                ${whereClause} 
                GROUP BY b.id
                ORDER BY b.created_at DESC
            `;

            const [results] = await db.query(query, queryParams);

            if (bookingId && results.length === 0) {
                return res.status(404).json({ error: "Booking tidak ditemukan." });
            }

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
            
            const responseData = bookingId ? processedResults[0] : processedResults;
            return res.status(200).json(responseData);

        } catch (error) {
            console.error("Get Bookings API Error:", error); 
            return res.status(500).json({ error: "Gagal mengambil data booking.", details: error.message });
        }
    }

    // --- Method PUT (Update Status Booking) ---
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
    
    // --- Method POST (Menyimpan Data Booking) ---
    if (req.method === "POST") {
        // --- PERUBAHAN 2: Baca 'vehicle_details' dari body ---
        const {
            user_id, tujuan, jumlah_orang, jumlah_kendaraan, volume_kg,
            start_date, end_date, phone, keterangan, file_link, vehicle_details
        } = req.body;

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const bookingQuery = `
                INSERT INTO bookings 
                  (user_id, status_id, tujuan, jumlah_orang, jumlah_kendaraan, volume_kg, start_date, end_date, phone, keterangan, file_link) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const bookingValues = [
                user_id, 1, tujuan, jumlah_orang, jumlah_kendaraan, 
                volume_kg, start_date, end_date, phone, keterangan, file_link
            ];
            const [result] = await connection.query(bookingQuery, bookingValues);
            const newBookingId = result.insertId;

            // --- PERUBAHAN 3: Kirim 'vehicle_details' ke helper function ---
            const { query: typesQuery, values: typesValues } = formatInsertBookingVehicleTypes(newBookingId, vehicle_details);
            
            if (typesQuery) {
                await connection.query(typesQuery, typesValues);
            }
            
            await connection.commit();
            return res.status(201).json({ id: newBookingId, message: "Booking berhasil dibuat." });

        } catch (error) {
            await connection.rollback();
            console.error("Booking API Error (Transaction):", error); 
            return res.status(500).json({ error: "Gagal menyimpan data booking.", details: error.message });
        } finally {
            connection.release();
        }
    }

    res.setHeader("Allow", ["GET", "POST", "PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}