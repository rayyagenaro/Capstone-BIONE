import { db } from '@/lib/db';

function generateKodeLaporanAngka() {
  return Math.floor(100000000 + Math.random() * 900000000); // 9 digit angka
}

export default async function handler(req, res) {
  const { q } = req.query;

  try {
    switch (q) {
      case 'register-user':
        if (req.method === 'POST') {
          const { nama, telepon, email, password } = req.body;

          if (!nama || !email || !password) {
            return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
          }

          try {
            const [check] = await db.query('SELECT akun_id FROM akun WHERE email = ?', [email]);
            if (check.length > 0) {
              return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
            }

            const [penggunaResult] = await db.query('INSERT INTO pengguna () VALUES ()');
            const pengguna_id = penggunaResult.insertId;

            const [akunResult] = await db.query(
              `INSERT INTO akun (email, password, nama_lengkap, pengguna_id, admin_id) 
              VALUES (?, ?, ?, ?, ?)`,
              [email, password, nama, pengguna_id, null]
            );

            const akun_id = akunResult.insertId;

            await db.query(
              `INSERT INTO profile (akun_id, nomor_hp, foto_profil_blob) VALUES (?, ?, ?)`,
              [akun_id, telepon || null, null]
            );

            return res.status(200).json({ success: true });
          } catch (err) {
            console.error('🔥 ERROR register-user:', err.message, err.stack);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan server (register-user)' });
          }
        }
        break;


      case 'login-user':
        if (req.method === 'POST') {
          try {
            const { email, password } = req.body;
            const [rows] = await db.query(
              'SELECT * FROM akun WHERE email = ? AND password = ?',
              [email, password]
            );

            if (rows.length > 0) {
              return res.status(200).json({ success: true, user: rows[0] });
            } else {
              return res.status(401).json({ success: false, message: 'Email atau password salah' });
            }
          } catch (err) {
            console.error('🔥 ERROR login-user:', err);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan server (login-user)' });
          }
        }
        break;

      case 'login-admin':
        if (req.method === 'POST') {
          try {
            const { email, password } = req.body;
            const [rows] = await db.query(
              `SELECT pengguna_id, admin_id, nama_lengkap, email
              FROM akun
              WHERE email = ? AND password = ? AND admin_id IS NOT NULL`,
              [email, password]
            );

            if (rows.length > 0) {
              return res.status(200).json({ success: true, user: rows[0] });
            } else {
              return res.status(401).json({ success: false, message: 'Email atau password salah atau bukan admin' });
            }
          } catch (err) {
            console.error('🔥 ERROR login-admin:', err);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan server (login-admin)' });
          }
        }
        break;


      
      case 'laporan-kehilangan':
        if (req.method === 'POST') {
          const { nama, deskripsi, lokasi, kategori, urgensi, pengguna_id, fotoBarangBase64, fotoLokasiBase64 } = req.body;

          if (!pengguna_id || !nama || !deskripsi || !lokasi || !kategori || !urgensi) {
            return res.status(400).json({ message: 'Data tidak lengkap' });
          }

          try {
            function generateLaporanId() {
              return Math.floor(100 + Math.random() * 300);
            }

            let laporan_id = generateLaporanId();
            let isUnique = false;

            while (!isUnique) {
              const [check] = await db.query('SELECT 1 FROM laporan WHERE laporan_id = ?', [laporan_id]);
              if (check.length === 0) {
                isUnique = true;
              } else {
                laporan_id = generateLaporanId();
              }
            }

            await db.execute(
              `INSERT INTO laporan (laporan_id, pengguna_id, admin_id, jenis_laporan, lokasi_kejadian, status_laporan, tanggal_laporan)
              VALUES (?, ?, NULL, 'kehilangan', ?, 'verifikasi', NOW())`,
              [laporan_id, pengguna_id, lokasi]
            );

            const bufferFoto = fotoBarangBase64 ? Buffer.from(fotoBarangBase64, 'base64') : null;

            let bufferFotoLokasi = null;
            if (Array.isArray(fotoLokasiBase64) && fotoLokasiBase64.length > 0) {
              bufferFotoLokasi = Buffer.from(fotoLokasiBase64[0], 'base64');
            }

            await db.execute(
              `INSERT INTO barang (laporan_id, nama_barang, deskripsi_barang, foto_barang, kategori_barang, urgensi_barang, foto_lokasi)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [laporan_id, nama, deskripsi, bufferFoto, kategori, urgensi, bufferFotoLokasi]
            );

            return res.status(201).json({ message: 'Laporan kehilangan berhasil disimpan', laporan_id });

          } catch (err) {
            console.error('❌ Gagal menyimpan laporan:', err);
            return res.status(500).json({ message: 'Gagal menyimpan laporan' });
          }
        }
        break;

      case 'laporan-penemuan':
        if (req.method === 'POST') {
          const {
            pengguna_id,
            namaBarang,
            kategori,
            deskripsiBarang,
            urgensi,
            lokasiPenemuan,
            fotoBarangBase64,
            fotoLokasiBase64
          } = req.body;

          // Validasi data wajib
          if (!pengguna_id || !namaBarang || !kategori || !deskripsiBarang || !urgensi || !lokasiPenemuan || !fotoBarangBase64 || !fotoLokasiBase64) {
            return res.status(400).json({ success: false, message: 'Semua data wajib diisi!' });
          }

          const conn = await db.getConnection();
          await conn.beginTransaction();

          try {
            const tanggalSekarang = new Date();

            // 1. Insert ke laporan
            const [laporanResult] = await conn.query(
              `INSERT INTO laporan (
                pengguna_id,
                jenis_laporan,
                tanggal_laporan,
                lokasi_kejadian,
                detail_laporan,
                status_laporan,
                tanggal_diperbarui
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                pengguna_id,
                'Penemuan Barang',
                tanggalSekarang,
                lokasiPenemuan,
                deskripsiBarang,
                'verifikasi',
                tanggalSekarang
              ]
            );

            const laporanId = laporanResult.insertId;

            // 2. Insert ke barang
            const bufferFotoBarang = Buffer.from(fotoBarangBase64, 'base64');
            const bufferFotoLokasi = Buffer.from(fotoLokasiBase64, 'base64');
            await conn.query(
              `INSERT INTO barang (
                laporan_id,
                nama_barang,
                deskripsi_barang,
                kategori_barang,
                urgensi_barang,
                foto_barang,
                foto_lokasi
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                laporanId,
                namaBarang,
                deskripsiBarang,
                kategori,
                urgensi,
                bufferFotoBarang,
                bufferFotoLokasi
              ]
            );

            await conn.commit();
            conn.release();

            return res.status(200).json({ success: true, message: 'Laporan penemuan berhasil disimpan.', laporan_id: laporanId });
          } catch (err) {
            await conn.rollback();
            conn.release();
            console.error('🔥 ERROR laporan-penemuan POST:', err.message);
            return res.status(500).json({ success: false, message: 'Gagal menyimpan laporan.' });
          }
        }

        if (req.method === 'GET') {
          const { laporan_id } = req.query;

          if (!laporan_id) {
            return res.status(400).json({ success: false, message: 'laporan_id wajib diisi' });
          }

          try {
            const [rows] = await db.query(
              `SELECT 
                b.nama_barang, 
                b.deskripsi_barang, 
                b.kategori_barang, 
                b.urgensi_barang, 
                l.lokasi_kejadian, 
                TO_BASE64(b.foto_barang) AS foto_barang_base64,
                TO_BASE64(b.foto_lokasi) AS foto_lokasi_base64
              FROM barang b
              JOIN laporan l ON b.laporan_id = l.laporan_id
              WHERE b.laporan_id = ?`,
              [laporan_id]
            );

            console.log('✅ Data dari database:', rows);

            if (rows.length > 0) {
              return res.status(200).json({ success: true, data: rows[0] });
            } else {
              return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
            }
          } catch (err) {
            console.error('🔥 ERROR laporan-penemuan GET:', err.message);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data laporan.' });
          }
        }

        break;

      case 'list-laporan':
        if (req.method === 'GET') {
          try {
            const [rows] = await db.query(`
              SELECT 
                l.laporan_id,
                l.jenis_laporan,
                l.tanggal_laporan,
                a.nama_lengkap AS nama_pengguna,
                b.nama_barang,
                b.urgensi_barang,
                b.foto_barang 
              FROM laporan l
              JOIN akun a ON l.pengguna_id = a.pengguna_id
              JOIN barang b ON l.laporan_id = b.laporan_id
              ORDER BY l.tanggal_laporan DESC
              LIMIT 5
            `);

            
            const formattedLaporan = rows.map(row => {
              let foto_barang_base64 = null;
              if (row.foto_barang && Buffer.isBuffer(row.foto_barang)) {
                foto_barang_base64 = `data:image/jpeg;base64,${row.foto_barang.toString('base64')}`;
              }
              return {
                laporan_id: row.laporan_id,
                jenis_laporan: row.jenis_laporan,
                tanggal_laporan: row.tanggal_laporan,
                nama_pengguna: row.nama_pengguna,
                nama_barang: row.nama_barang,
                urgensi_barang: row.urgensi_barang,
                foto_barang_base64, // <--- INI YANG DIPAKAI DI FRONTEND
              };
            });

            return res.status(200).json({ success: true, laporan: formattedLaporan });
          } catch (err) {
            console.error('🔥 ERROR list-laporan GET:', err.message);
            return res.status(500).json({ success: false, message: 'Gagal mengambil daftar laporan.' });
          }
        }
        break;


     case 'detail-user':
      if (req.method === 'GET') {
        const { pengguna_id } = req.query;

        if (!pengguna_id) {
          return res.status(400).json({ success: false, message: 'pengguna_id diperlukan' });
        }

        try {
          const [rows] = await db.query(
            `SELECT a.nama_lengkap, a.email, p.foto_profil_blob
            FROM akun a
            LEFT JOIN profile p ON a.akun_id = p.akun_id
            WHERE a.pengguna_id = ?`,
            [pengguna_id]
          );

          if (rows.length > 0) {
            const user = rows[0];

            // Jika ada foto dan bertipe buffer, ubah ke base64
            if (user.foto_profil_blob && Buffer.isBuffer(user.foto_profil_blob)) {
              user.foto_profil_blob = user.foto_profil_blob.toString('base64');
            }

            return res.status(200).json({ success: true, user });
          } else {
            return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
          }
        } catch (err) {
          console.error('🔥 ERROR detail-user:', err);
          return res.status(500).json({ success: false, message: 'Terjadi kesalahan server (detail-user)' });
        }
      }
      break;



      case 'edit-profile':
      if (req.method === 'GET') {
        const { pengguna_id } = req.query;

        if (!pengguna_id) {
          return res.status(400).json({ success: false, message: 'pengguna_id wajib diisi.' });
        }

        try {
          const [rows] = await db.query(
            `SELECT a.nama_lengkap, a.email, p.foto_profil_blob
            FROM akun a
            LEFT JOIN profile p ON a.akun_id = p.akun_id
            WHERE a.pengguna_id = ?`,
            [pengguna_id]
          );

          if (rows.length > 0) {
            const user = rows[0];

            if (user.foto_profil_blob && Buffer.isBuffer(user.foto_profil_blob)) {
              user.foto_profil_blob = user.foto_profil_blob.toString('base64');
            }

            return res.status(200).json({ success: true, user });
          } else {
            return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
          }
        } catch (err) {
          console.error('🔥 ERROR edit-profile GET:', err.message);
          return res.status(500).json({ success: false, message: 'Terjadi kesalahan server (edit-profile GET)' });
        }
      }

      if (req.method === 'PUT') {
        const { pengguna_id, nama_lengkap, foto_profil_blob } = req.body;

        if (!pengguna_id || !nama_lengkap) {
          return res.status(400).json({ success: false, message: 'pengguna_id dan nama_lengkap wajib diisi.' });
        }

        try {

          const [result] = await db.query(
            `UPDATE akun SET nama_lengkap = ? WHERE pengguna_id = ?`,
            [nama_lengkap, pengguna_id]
          );

          if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
          }

          if (foto_profil_blob) {
            const [akunRow] = await db.query(
              `SELECT akun_id FROM akun WHERE pengguna_id = ?`,
              [pengguna_id]
            );

            if (akunRow.length > 0) {
              const akun_id = akunRow[0].akun_id;
              const [checkProfile] = await db.query(
                `SELECT profile_id FROM profile WHERE akun_id = ?`,
                [akun_id]
              );

              if (checkProfile.length === 0) {
                await db.query(
                  `INSERT INTO profile (akun_id, foto_profil_blob) VALUES (?, ?)`,
                  [akun_id, Buffer.from(foto_profil_blob, 'base64')]
                );
              } else {
                await db.query(
                  `UPDATE profile SET foto_profil_blob = ? WHERE akun_id = ?`,
                  [Buffer.from(foto_profil_blob, 'base64'), akun_id]
                );
              }
            }
          }

          return res.status(200).json({ success: true, message: 'Profil berhasil diperbarui.' });
        } catch (err) {
          console.error('🔥 ERROR edit-profile PUT:', err.message, err.stack);
          return res.status(500).json({ success: false, message: 'Terjadi kesalahan server (edit-profile PUT)' });
        }
      }

      break;

      case 'update-password':
        if (req.method === 'POST') {
          const { pengguna_id, password } = req.body;

          if (!pengguna_id || !password) {
            return res.status(400).json({ success: false, message: 'pengguna_id dan password wajib diisi.' });
          }

          try {
            const [result] = await db.query(
              `UPDATE akun SET password = ? WHERE pengguna_id = ?`,
              [password, pengguna_id]
            );

            if (result.affectedRows === 0) {
              return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
            }

            return res.status(200).json({ success: true, message: 'Password berhasil diperbarui.' });
          } catch (err) {
            console.error('🔥 ERROR update-password:', err.message, err.stack);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan server (update-password)' });
          }
        }
        break;

        case 'get-laporan':
          if (req.method === 'GET') {
            try {
              const { status, search, id, pengguna_id } = req.query;

              let sqlQuery = `
                SELECT
                  L.laporan_id AS id,
                  L.jenis_laporan AS type,
                  B.deskripsi_barang AS description,
                  L.status_laporan AS status,
                  L.tanggal_laporan AS postDate,
                  L.lokasi_kejadian AS locationDetails,
                  B.nama_barang AS title,
                  B.foto_barang AS imageUrl,
                  B.kategori_barang AS category,
                  B.urgensi_barang AS urgency,
                  B.foto_lokasi AS locationImageUrl,
                  AK.nama_lengkap AS contactName,      
                  PR.nomor_hp AS contactPhone,         
                  PR.foto_profil_blob AS contactProfilePic
                FROM laporan AS L
                JOIN pengguna AS P ON L.pengguna_id = P.pengguna_id
                JOIN akun AS AK ON P.pengguna_id = AK.pengguna_id 
                LEFT JOIN profile AS PR ON AK.akun_id = PR.akun_id   
                LEFT JOIN barang AS B ON L.laporan_id = B.laporan_id
                WHERE 1=1
              `;

              const queryParams = [];

              if (pengguna_id) {
                sqlQuery += ` AND P.pengguna_id = ?`;
                queryParams.push(pengguna_id);
              }

              if (id) {
                sqlQuery += ` AND L.laporan_id = ?`;
                queryParams.push(id);
              } else {
                if (status) {
                  sqlQuery += ` AND L.status_laporan = ?`;
                  queryParams.push(status);
                }
                if (search) {
                  const searchTerm = `%${search.toLowerCase()}%`;
                  sqlQuery += ` AND (L.detail_laporan LIKE ? OR L.laporan_id LIKE ? OR L.jenis_laporan LIKE ? OR B.nama_barang LIKE ?)`;
                  queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
                }
                sqlQuery += ` ORDER BY L.tanggal_laporan DESC`;
              }

              const [rows] = await db.execute(sqlQuery, queryParams);

              // Statistik global
              const [statsRows] = await db.execute(`
                SELECT
                    COUNT(*) AS totalReports,
                    SUM(CASE WHEN status_laporan = 'Selesai' THEN 1 ELSE 0 END) AS doneCount,
                    SUM(CASE WHEN status_laporan = 'Proses' THEN 1 ELSE 0 END) AS processCount,
                    SUM(CASE WHEN status_laporan = 'verifikasi' THEN 1 ELSE 0 END) AS verifiedCount
                FROM laporan;
              `);
              const globalStats = statsRows[0];

              // Helper untuk konversi Buffer ke DataURL
              function bufferToDataUrl(buffer, mime = 'image/jpeg') {
                if (!buffer || !Buffer.isBuffer(buffer)) return null;
                return `data:${mime};base64,${buffer.toString('base64')}`;
              }

              const formattedReports = rows.map(row => {
                // Konversi foto barang dan foto profil contact (jika ada)
                const imageUrl = bufferToDataUrl(row.imageUrl) || '/assets/placeholder-image.jpg';
                const locationImageUrl = bufferToDataUrl(row.locationImageUrl) || null;
                const contactProfilePic = bufferToDataUrl(row.contactProfilePic) || '/assets/placeholder-profile.jpg';

                return {
                  id: row.id,
                  type: row.type,
                  title: row.title || (row.description ? row.description.substring(0, 50) + '...' : 'Tanpa Judul'),
                  description: row.description,
                  status: row.status,
                  postDate: row.postDate,
                  postedBy: row.postedBy,
                  imageUrl: imageUrl,
                  locationImageUrl: locationImageUrl,
                  category: row.category,
                  urgency: row.urgency,
                  locationDetails: row.locationDetails,
                  contact: {
                    name: row.contactName || 'Tidak Tersedia',
                    profilePic: contactProfilePic,
                    whatsappLink: row.contactPhone ? `https://wa.me/${row.contactPhone.replace(/\D/g, '')}` : '#',
                    contactPath: row.contactPath
                  }
                };
              });

              if (id) {
                if (formattedReports.length > 0) {
                  return res.status(200).json(formattedReports[0]);
                } else {
                  return res.status(404).json({ message: 'Laporan tidak ditemukan' });
                }
              } else {
                return res.status(200).json({ reports: formattedReports, stats: globalStats });
              }
            } catch (err) {
              console.error('🔥 ERROR get-laporan GET:', err.message, err.stack);
              return res.status(500).json({ success: false, message: 'Gagal mengambil daftar laporan.' });
            }
          }
          break;

      case 'update-laporan-status': // <--- KASUS BARU DITAMBAHKAN UNTUK UPDATE STATUS
        if (req.method === 'POST') {
          const { laporan_id, newStatus } = req.body;

          if (!laporan_id || !newStatus) {
            return res.status(400).json({ success: false, message: 'ID laporan dan status baru diperlukan.' });
          }

          try {
            const [result] = await db.execute(
              `UPDATE laporan SET status_laporan = ?, tanggal_diperbarui = NOW() WHERE laporan_id = ?`,
              [newStatus, laporan_id]
            );

            if (result.affectedRows === 0) {
              return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan atau status sudah sama.' });
            }

            return res.status(200).json({ success: true, message: `Status laporan ${laporan_id} berhasil diperbarui menjadi ${newStatus}.` });
          } catch (err) {
            console.error('❌ Gagal memperbarui status laporan:', err);
            return res.status(500).json({ success: false, message: 'Gagal memperbarui status laporan.' });
          }
        }
        break;
      
      case 'cari-barang':
        if (req.method === 'GET') {
          const { keyword = '', kategori = '', lokasi = '', startDate = '', endDate = '' } = req.query;
          let sql = `
            SELECT 
              b.barang_id, b.laporan_id, b.nama_barang, b.deskripsi_barang, 
              b.kategori_barang, b.urgensi_barang, b.foto_barang,
              l.jenis_laporan, l.tanggal_laporan, l.lokasi_kejadian
            FROM barang b
            JOIN laporan l ON b.laporan_id = l.laporan_id
            WHERE 1=1
          `;
          let params = [];

          // Keyword: nama_barang/deskripsi_barang LIKE
          if (keyword) {
            sql += ' AND (b.nama_barang LIKE ? OR b.deskripsi_barang LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
          }
          // Multi kategori (support multiple, eg. kategori=KUNCI,HP)
          if (kategori) {
            const kategoriArr = kategori.split(',').map(k => k.trim()).filter(Boolean);
            if (kategoriArr.length > 0) {
              sql += ` AND b.kategori_barang IN (${kategoriArr.map(() => '?').join(',')})`;
              params.push(...kategoriArr);
            }
          }
          // Filter Lokasi
          if (lokasi) {
            sql += ' AND l.lokasi_kejadian LIKE ?';
            params.push(`%${lokasi}%`);
          }
          // Filter tanggal (rentang)
          if (startDate) {
            sql += ' AND l.tanggal_laporan >= ?';
            params.push(startDate);
          }
          if (endDate) {
            sql += ' AND l.tanggal_laporan <= ?';
            params.push(endDate);
          }

          sql += ' ORDER BY b.barang_id DESC';

          try {
            const [rows] = await db.query(sql, params);

            const data = rows.map(row => {
              let foto_barang_base64 = null;
              if (row.foto_barang && Buffer.isBuffer(row.foto_barang)) {
                foto_barang_base64 = `data:image/jpeg;base64,${row.foto_barang.toString('base64')}`;
              }
              return {
                barang_id: row.barang_id,
                laporan_id: row.laporan_id,
                nama_barang: row.nama_barang,
                deskripsi_barang: row.deskripsi_barang,
                kategori_barang: row.kategori_barang,
                urgensi_barang: row.urgensi_barang,
                foto_barang_base64,
                jenis_laporan: row.jenis_laporan || '-',
                tanggal_laporan: row.tanggal_laporan || '',
                lokasi_kejadian: row.lokasi_kejadian || '',
              };
            });

            return res.status(200).json({ success: true, data });
          } catch (error) {
            console.error('❌ Error cari-barang:', error);
            return res.status(500).json({ success: false, message: 'Gagal mencari barang' });
          }
        }
        break;

      
      case 'detail-laporan':
        if (req.method === 'GET') {
          const { laporan_id } = req.query;

          if (!laporan_id) {
            return res.status(400).json({ success: false, message: 'laporan_id wajib diisi' });
          }

          try {
            // Ambil data laporan dan barang
            const [rows] = await db.query(
              `SELECT 
                  l.laporan_id,
                  l.pengguna_id,
                  l.jenis_laporan,
                  l.tanggal_laporan,
                  l.lokasi_kejadian,
                  l.detail_laporan,
                  l.status_laporan,
                  l.tanggal_diperbarui,
                  b.nama_barang,
                  b.deskripsi_barang,
                  b.kategori_barang,
                  b.urgensi_barang,
                  b.foto_barang,
                  b.foto_lokasi
              FROM laporan l
              LEFT JOIN barang b ON l.laporan_id = b.laporan_id
              WHERE l.laporan_id = ?
              LIMIT 1`,
              [laporan_id]
            );

            if (rows.length === 0) {
              return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
            }

            const laporan = rows[0];

            // Konversi foto barang/lokasi ke base64 jika ada
            let fotoBarangBase64 = null;
            if (laporan.foto_barang && Buffer.isBuffer(laporan.foto_barang)) {
              fotoBarangBase64 = laporan.foto_barang.toString('base64');
            }

            let fotoLokasiBase64 = null;
            if (laporan.foto_lokasi && Buffer.isBuffer(laporan.foto_lokasi)) {
              fotoLokasiBase64 = laporan.foto_lokasi.toString('base64');
            }

            // Ambil kontak (nama, no hp, foto profil)
            let contact = null;
            if (laporan.pengguna_id) {
              const [contactRows] = await db.query(
                `SELECT 
                    a.nama_lengkap,
                    p.nomor_hp,
                    p.foto_profil_blob
                FROM pengguna u
                LEFT JOIN akun a ON u.pengguna_id = a.pengguna_id
                LEFT JOIN profile p ON a.akun_id = p.akun_id
                WHERE u.pengguna_id = ?
                LIMIT 1`,
                [laporan.pengguna_id]
              );
              if (contactRows.length > 0) {
                const c = contactRows[0];
                // Konversi foto profil ke base64
                let photoUrl = '/placeholder-avatar.png';
                if (c.foto_profil_blob && Buffer.isBuffer(c.foto_profil_blob)) {
                  photoUrl = `data:image/png;base64,${c.foto_profil_blob.toString('base64')}`;
                }
                contact = {
                  name: c.nama_lengkap || '-',
                  photoUrl,
                  whatsapp: c.nomor_hp || ''
                };
              }
            }

            // Return response ke frontend
            return res.status(200).json({
              success: true,
              data: {
                id: laporan.laporan_id,
                type: laporan.jenis_laporan,
                datePosted: laporan.tanggal_laporan,
                locationDetails: laporan.lokasi_kejadian,
                status: laporan.status_laporan,
                dateUpdated: laporan.tanggal_diperbarui,
                itemName: laporan.nama_barang,
                description: laporan.deskripsi_barang,
                category: laporan.kategori_barang,
                urgency: laporan.urgensi_barang,
                imageUrl: fotoBarangBase64 
                  ? `data:image/png;base64,${fotoBarangBase64}` 
                  : '/assets/gambar_kunci.png',
                locationPhotoUrl: fotoLokasiBase64 
                  ? `data:image/png;base64,${fotoLokasiBase64}` 
                  : null,
                contact // <--- Sudah include name, photoUrl (foto profil), whatsapp
              }
            });
          } catch (err) {
            console.error('🔥 ERROR detail-laporan:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil detail laporan' });
          }
        }
        break;

      
      default:
        return res.status(400).json({ message: 'Query tidak dikenal' });
    }
  } catch (error) {
    console.error('🔥 DB Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
