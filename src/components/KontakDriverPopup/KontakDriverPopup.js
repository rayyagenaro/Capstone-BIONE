import React from 'react';
import styles from './kontakDriverPopup.module.css';
import { FaTimes } from 'react-icons/fa';

function normalizeIndoPhone(phone = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return digits;
}

export default function KontakDriverPopup({
  show = false,          // ← default false
  onClose = () => {},
  drivers = [],          // ← default kosong, data datang dari parent (assigned_drivers)
}) {
  if (!show) return null;

  const handleHubungi = (name, phone) => {
    const intl = normalizeIndoPhone(phone);
    if (!intl) {
      alert('Nomor HP tidak valid.');
      return;
    }
    const msg = encodeURIComponent(`Halo ${name}, terkait tugas perjalanan D'MOVE...`);
    const url = `https://wa.me/${intl}?text=${msg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBox}>
        <div className={styles.header}>
          <div className={styles.title}>Kontak Driver</div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.note}>
          Tekan <b>Hubungi</b> untuk membuka WhatsApp ke driver terkait.
        </div>

        <div className={styles.table}>
          <div className={`${styles.row} ${styles.rowHead}`}>
            <div className={styles.colName}>Nama</div>
            <div className={styles.colPhone}>No HP</div>
            <div className={styles.colAction}>Aksi</div>
          </div>

          {drivers.map((d, idx) => {
            const intl = normalizeIndoPhone(d.phone);
            const disabled = !intl;
            return (
              <div key={d.id ?? idx} className={styles.row}>
                <div className={styles.colName}>{d.name || 'Tanpa Nama'}</div>
                <div className={styles.colPhone}>{d.phone || '-'}</div>
                <div className={styles.colAction}>
                  <button
                    className={styles.btnHubungi}
                    onClick={() => handleHubungi(d.name, d.phone)}
                    disabled={disabled}                 // ← disable kalau nomor invalid
                    title={disabled ? 'Nomor HP tidak valid' : 'Hubungi via WhatsApp'}
                  >
                    Hubungi
                  </button>
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
  );
}
