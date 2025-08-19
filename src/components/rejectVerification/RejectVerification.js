// components/rejectVerification/RejectVerification.jsx
import React, { useEffect, useMemo, useState } from 'react';
import styles from './RejectVerification.module.css';
import { FaTimes, FaWhatsapp, FaChevronDown, FaChevronUp } from 'react-icons/fa';

/**
 * Popup Tolak Verifikasi (UNTUK USER & ADMIN)
 * 
 * Props:
 * - show: boolean
 * - onClose: () => void
 * - onSubmit: (reasonText: string, openWhatsApp: boolean) => void
 * - loading?: boolean
 * - person?: { name?: string, nip?: string, email?: string, phone?: string }
 * - titleText?: string
 * - infoText?: string
 * - previewBuilder?: (person, reason) => string   // optional builder WA message
 * - placeholderReason?: string
 */
export default function RejectVerificationPopup({
  show,
  onClose,
  onSubmit,
  loading = false,
  person = {},
  titleText = 'Tolak Verifikasi User',
  infoText = 'Kirim informasi penolakan ke user. Isi alasan singkat di bawah, lalu kirim.',
  previewBuilder,
  placeholderReason = '— (tuliskan alasan singkat & jelas di sini) —',
}) {
  const [reason, setReason] = useState('');
  const [openWhatsApp, setOpenWhatsApp] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (show) {
      setReason('');
      setOpenWhatsApp(true);
      setShowPreview(true);
    }
  }, [show]);

  const previewText = useMemo(() => {
    if (typeof previewBuilder === 'function') {
      return previewBuilder(person, reason || placeholderReason);
    }
    // fallback (template untuk USER)
    return `Halo ${person?.name || ''},

Pengajuan akun BI-ONE Anda *DITOLAK* ❌

Detail:
• Nama : ${person?.name || '-'}
• NIP  : ${person?.nip || '-'}
• Email: ${person?.email || '-'}

Alasan penolakan:
${reason || placeholderReason}

Silakan lengkapi/benahi data Anda lalu ajukan kembali verifikasi.
Terima kasih.`;
  }, [person, reason, placeholderReason, previewBuilder]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = (reason || '').trim();
    if (!trimmed) {
      alert('Alasan penolakan wajib diisi.');
      return;
    }
    // KIRIM HANYA "reason" ke parent -> DB
    onSubmit(trimmed, openWhatsApp);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>{titleText}</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FaTimes size={18} />
          </button>
        </div>

        <p className={styles.info}>{infoText}</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>Alasan Penolakan</label>
          <textarea
            className={styles.textarea}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholderReason}
          />

          {/* Toggle Preview */}
          <button
            type="button"
            className={styles.previewToggle}
            onClick={() => setShowPreview(s => !s)}
            aria-expanded={showPreview}
          >
            {showPreview ? <FaChevronUp /> : <FaChevronDown />}
            <span>Preview Pesan WhatsApp</span>
          </button>

          {showPreview && (
            <pre className={styles.previewBox}>{previewText}</pre>
          )}

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={openWhatsApp}
              onChange={(e) => setOpenWhatsApp(e.target.checked)}
            />
            Buka WhatsApp setelah menolak
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className={styles.rejectBtn} disabled={loading}>
              {loading ? 'Memproses…' : (<><FaWhatsapp style={{marginRight:6}}/> Tolak & Kirim</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
