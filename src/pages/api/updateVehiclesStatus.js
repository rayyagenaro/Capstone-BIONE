// /pages/api/vehicle-status.js
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "PUT") {
    const { vehicleTypeId, newStatusId } = req.body;

    if (!vehicleTypeId || !newStatusId) {
      return res.status(400).json({ error: "vehicleTypeId dan newStatusId wajib diisi" });
    }

    try {
      const query = `UPDATE vehicles SET vehicle_status_id = ? WHERE vehicle_type_id = ?`;
      const [result] = await db.query(query, [newStatusId, vehicleTypeId]);

      return res.status(200).json({ message: "Status kendaraan berhasil diperbarui" });
    } catch (error) {
      return res.status(500).json({ error: "Gagal update status kendaraan", details: error.message });
    }
  } else {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
