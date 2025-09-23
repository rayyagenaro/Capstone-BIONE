import db from '@/lib/db';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    const [rows] = await db.query(
      `SELECT b.id, b.nama_pic, b.no_wa_pic, b.unit_kerja, b.waktu_pesanan, b.status_id,
              i.nama_pesanan, i.jumlah
       FROM bimeal_bookings b
       LEFT JOIN bimeal_booking_items i ON i.booking_id = b.id
       WHERE b.id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });

    const booking = rows[0];
    const items = rows.map(r => ({ nama: r.nama_pesanan, jumlah: r.jumlah })).filter(i => i.nama);

    // set header untuk PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=nota-bimeal-${id}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header / Logo
    doc.fontSize(18).font('Helvetica-Bold').text('Nota Pesanan BI-MEAL', { align: 'center' });
    doc.moveDown();

    // Garis
    // doc.moveTo(50, 100).lineTo(550, 100).stroke();

    // Info Booking
    doc.fontSize(12).font('Helvetica');
    doc.text(`Nama PIC      : ${booking.nama_pic}`);
    doc.text(`No. WA PIC    : ${booking.no_wa_pic}`);
    doc.text(`Unit Kerja    : ${booking.unit_kerja}`);
    doc.text(`Tanggal Pesan : ${new Date(booking.waktu_pesanan).toLocaleString('id-ID')}`);
    doc.moveDown();

    // Judul tabel
    doc.fontSize(13).font('Helvetica-Bold').text('Pesanan:', { underline: true });
    doc.moveDown(0.5);

    // Table header
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('No', 50, doc.y, { continued: true });
    doc.text('Nama Pesanan', 100, doc.y, { continued: true });
    doc.text('Jumlah', 400);

    // Garis bawah header
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();

    // ⬇️ Tambahkan jarak ekstra setelah garis
    doc.moveDown(1.5);

    // Items
    doc.font('Helvetica');
    items.forEach((it, idx) => {
      doc.text(idx + 1, 50, doc.y, { continued: true });
      doc.text(it.nama, 100, doc.y, { continued: true });
      doc.text(it.jumlah.toString(), 400);
    });


    // Footer
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica-Oblique').text('Terima kasih atas pemesanan Anda.', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
