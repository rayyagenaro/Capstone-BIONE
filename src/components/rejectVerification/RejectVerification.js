import React, { useEffect, useState } from 'react';
import styles from './RejectVerification.module.css';
import { FaTimes, FaWhatsapp } from 'react-icons/fa';

export default function UserVerificationRejectPopup({
  show,
  onClose,
  onSubmit,                 // (messageText, openWhatsApp:boolean) => void
  loading = false,
  user = {},               // { name, nip, email, phone }
  defaultMessage = '',     // optional override template
  defaultReason = '',      // optional, diinject ke template
}) {
  const [message, setMessage] = useState(defaultMessage || '');
  const [openWhatsApp, setOpenWhatsApp] = useState(true);

  // Prefill message setiap popup dibuka
  useEffect(() => {
    if (!show) return;

    const preset =
      defaultMessage ||
`Halo ${user?.name || ''},

Pengajuan akun BI-ONE Anda *DITOLAK* ❌

Detail:
• Nama : ${user?.name || '-'}
• NIP  : ${user?.nip || '-'}
• Email: ${user?.email || '-'}

Alasan penolakan:
${defaultReason || '— (tuliskan alasan singkat & jelas di sini) —'}

Silakan lengkapi/benahi data Anda lalu ajukan kembali verifikasi.
Terima kasih.`;

    setMessage(preset);
    setOpenWhatsApp(true);
  }, [show, defaultMessage, defaultReason, user]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = (message || '').trim();
    if (!val) {
      alert('Silakan isi pesan penolakan verifikasi.');
      return;
    }
    onSubmit(val, openWhatsApp);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Tolak Verifikasi User</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FaTimes size={18} />
          </button>
        </div>

        <p className={styles.info}>
          Kirim informasi penolakan ke user. Pesan di bawah bisa kamu edit dulu sebelum dikirim.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>Pesan WhatsApp</label>
          <textarea
            className={styles.textarea}
            rows={9}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis pesan penolakan verifikasi…"
          />

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={openWhatsApp}
              onChange={(e) => setOpenWhatsApp(e.target.checked)}
            />
            Buka WhatsApp setelah menolak
          </label>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className={styles.rejectBtn}
              disabled={loading}
            >
              {loading ? 'Memproses…' : (<><FaWhatsapp style={{marginRight:6}}/> Tolak & Kirim</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
