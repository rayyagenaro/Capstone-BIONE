import React, { useEffect, useMemo, useState } from 'react';
import styles from './KontakDriverPopup.module.css';
import { FaTimes } from 'react-icons/fa';

// util: normalisasi nomor ke format 62xxxxxxxxx
const to62 = (p) => {
  if (!p) return '';
  let s = String(p).replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('62')) return s;
  if (s.startsWith('0')) return '62' + s.slice(1);
  return '62' + s;
};
const waLink = (phone, text) =>
  `https://wa.me/${to62(phone)}?text=${encodeURIComponent(text || '')}`;

const fmt = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(d);
  }
};

/**
 * Props:
 *  - show, onClose
 *  - drivers: [{id, name, phone}]
 *  - booking: { tujuan, start_date, end_date }
 *  - template (opsional): string dengan {name}, {tujuan}, {start}, {end}
 */
export default function KontakDriverPopup({
  show = true,
  onClose = () => {},
  drivers = [],
  booking = {},
  template,
}) {
  const { tujuan, start_date, end_date } = booking || {};

  const defaultTemplate = useMemo(
    () => `Halo {name}, terkait tugas perjalanan BI.DRIVE.

Tujuan   : {tujuan}
Mulai    : {start}
Selesai  : {end}

Mohon konfirmasi kesiapan ya. Terima kasih.`,
    []
  );

  const [message, setMessage] = useState('');

  // prefill saat popup dibuka
  useEffect(() => {
    if (!show) return;
    const base = template || defaultTemplate;
    const seeded = base
      .replaceAll('{tujuan}', tujuan || '-')
      .replaceAll('{start}', fmt(start_date))
      .replaceAll('{end}', fmt(end_date));
    setMessage(seeded);
  }, [show, template, defaultTemplate, tujuan, start_date, end_date]);

  if (!show) return null;

  // build pesan final per-driver
  const buildMsgFor = (driverName) =>
    (message || '').replaceAll('{name}', driverName || '');

  return (
    <div className={styles.popupOverlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Kontak Driver</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FaTimes />
          </button>
        </div>

        {/* editor pesan */}
        <div className={styles.msgInfo}>
          Kirim pesan konfirmasi ke driver. Pesan di bawah bisa kamu <b>edit</b>.
        </div>

        <div className={styles.msgBox}>
          <label className={styles.msgLabel}>Pesan WhatsApp</label>
          <textarea
            className={styles.msgTextarea}
            rows={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis pesan untuk driver…"
            spellCheck={false}
          />
        </div>

        {/* daftar driver */}
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.rowHead}`}>
            <div className={styles.colName}>Nama</div>
            <div className={styles.colPhone}>No HP</div>
            <div className={styles.colAction}>Aksi</div>
          </div>

          {/* area yang discroll */}
          <div className={styles.tableScroll}>
            {drivers.map((d) => {
              const disabled = !to62(d.phone);
              const href = waLink(d.phone, buildMsgFor(d.name));
              return (
                <div key={d.id} className={styles.row}>
                  <div className={styles.colName}>{d.name}</div>
                  <div className={styles.colPhone}>{d.phone || '-'}</div>
                  <div className={styles.colAction}>
                    {disabled ? (
                      <button className={styles.btnHubungi} disabled>Hubungi</button>
                    ) : (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.btnHubungi}
                        title="Buka WhatsApp dengan pesan ini"
                      >
                        Hubungi
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {drivers.length === 0 && (
              <div className={styles.empty}>Belum ada driver untuk ditampilkan.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
