// pages/api/booking.js
import db from "@/lib/db";

function formatInsertBookingVehicleTypes(bookingId, vehicleTypeIds) {
    if (!Array.isArray(vehicleTypeIds) || vehicleTypeIds.length === 0) {
        return { query: "", values: [] };
    }
    const placeholder = vehicleTypeIds.map(() => "(?, ?)").join(", ");
    // !!! PENTING: Pastikan nama tabel 'booking_vehicle_types' ini SAMA PERSIS
    // dengan nama tabel pivot di database Anda.
    const query = `INSERT INTO booking_vehicle_types (booking_id, vehicle_type_id) VALUES ${placeholder}`;
    const values = vehicleTypeIds.flatMap(typeId => [bookingId, typeId]);
    return { query, values };
}

export default async function handler(req, res) {
    // --- Method GET (Mengambil Data Booking) ---
    if (req.method === "GET") {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: "User ID diperlukan" });
        }

        try {
            // Menggunakan GROUP_CONCAT yang lebih kompatibel daripada JSON_ARRAYAGG
            const query = `
                SELECT 
                    b.*, -- Mengambil semua kolom dari tabel bookings
                    CONCAT('[', 
                        IF(COUNT(vt.id) > 0,
                            GROUP_CONCAT(
                                DISTINCT JSON_OBJECT('id', vt.id, 'name', vt.name)
                                SEPARATOR ','
                            ),
                            ''
                        )
                    , ']') AS vehicle_types
                FROM 
                    bookings b
                LEFT JOIN 
                    booking_vehicle_types bv ON b.id = bv.booking_id -- !!! PENTING: Sesuaikan nama tabel ini
                LEFT JOIN 
                    vehicle_types vt ON bv.vehicle_type_id = vt.id -- !!! PENTING: Sesuaikan nama tabel ini
                WHERE 
                    b.user_id = ?
                GROUP BY 
                    b.id
                ORDER BY 
                    b.created_at DESC
            `;

            const [bookings] = await db.query(query, [userId]);

            // Proses data untuk mengubah string vehicle_types menjadi array JSON
            const processedBookings = bookings.map(booking => {
                let parsedVehicleTypes = [];
                try {
                    // Coba parse string JSON dari database
                    if (booking.vehicle_types && booking.vehicle_types.length > 2) {
                       parsedVehicleTypes = JSON.parse(booking.vehicle_types);
                    }
                } catch (e) {
                    console.error(`Gagal parse JSON untuk booking ID ${booking.id}:`, booking.vehicle_types);
                    parsedVehicleTypes = []; // Jadikan array kosong jika gagal
                }
                return {
                    ...booking,
                    vehicle_types: Array.isArray(parsedVehicleTypes) ? parsedVehicleTypes.filter(vt => vt && vt.id !== null) : [],
                };
            });
            
            return res.status(200).json(processedBookings);

        } catch (error) {
            // Log ini akan muncul di terminal Next.js Anda
            console.error("Get Bookings API Error:", error); 
            return res.status(500).json({ error: "Gagal mengambil data booking.", details: error.message });
        }
    }

    // --- Method POST (Menyimpan Data Booking) ---
    if (req.method === "POST") {
        const {
            user_id, tujuan, jumlah_orang, jumlah_kendaraan, volume_kg,
            start_date, end_date, phone, keterangan, vehicle_type_ids, attachment // 'attachment' dari frontend
        } = req.body;

        if (!user_id || !tujuan || !start_date || !end_date || !phone || !Array.isArray(vehicle_type_ids) || vehicle_type_ids.length === 0) {
            return res.status(400).json({ error: "Field wajib tidak boleh kosong." });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Menambahkan kolom 'file_link' sesuai dengan form Anda
            const bookingQuery = `
                INSERT INTO bookings 
                  (user_id, status_id, tujuan, jumlah_orang, jumlah_kendaraan, volume_kg, start_date, end_date, phone, keterangan, file_link) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const bookingValues = [
                user_id, 1, tujuan, jumlah_orang, jumlah_kendaraan, 
                volume_kg, start_date, end_date, phone, keterangan, attachment // Menggunakan 'attachment'
            ];

            const [result] = await connection.query(bookingQuery, bookingValues);
            const newBookingId = result.insertId;

            const { query: typesQuery, values: typesValues } = formatInsertBookingVehicleTypes(newBookingId, vehicle_type_ids);
            
            if (typesQuery) {
                await connection.query(typesQuery, typesValues);
            }
            
            await connection.commit();

            return res.status(201).json({
                id: newBookingId,
                message: "Booking berhasil dibuat."
            });

        } catch (error) {
            await connection.rollback();
            // Log ini juga akan muncul di terminal
            console.error("Booking API Error (Transaction):", error); 
            return res.status(500).json({ error: "Gagal menyimpan data booking.", details: error.message });
        } finally {
            connection.release();
        }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}