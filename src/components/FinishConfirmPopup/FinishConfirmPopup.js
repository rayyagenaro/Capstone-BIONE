// src/components/FinishConfirmPopup/FinishConfirmPopup.js
import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

/**
 * Popup konfirmasi Finish Booking
 * - Pakai inline style agar tidak perlu CSS tambahan
 * - Tombol reuse class dari module CSS parent via props.styles (btnTolak / btnSetujui)
 *
 * Props:
 *  - show: boolean
 *  - onCancel: fn
 *  - onConfirm: fn
 *  - loading: boolean (ikut state `finishing`)
 *  - styles: CSS module (agar tombol konsisten: btnTolak & btnSetujui)
 */
export default function FinishConfirmPopup({ show, onCancel, onConfirm, loading, styles }) {
  if (!show) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="finishTitle">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={iconWrapStyle}>
            <FaExclamationTriangle style={{ fontSize: 22, color: '#F59E0B' }} />
          </div>
          <h3 id="finishTitle" style={titleStyle}>Finish Booking?</h3>
        </div>

        <div style={bodyStyle}>
          <p style={pStyle}>
            Tindakan ini akan menandai booking sebagai <strong>selesai</strong>.
          </p>

          <p style={pStyle}>
            Driver dan kendaraan yang ditugaskan akan otomatis dikembalikan ke status <strong>Available</strong>.
            Booking tidak bisa diubah lagi setelah difinish. Pastikan perjalanan benar-benar telah selesai.
          </p>
        </div>

        <div style={footerStyle}>
          <button
            type="button"
            onClick={onCancel}
            className={styles?.btnTolak}
            style={{ minWidth: 160 }}
            disabled={loading}
          >
            Batal Finish
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={styles?.btnSetujui}
            style={{ minWidth: 200 }}
            disabled={loading}
          >
            {loading ? 'Memproses…' : 'Ya, Finish Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==== Inline styles (ringan & tidak bentrok CSS Module) ==== */
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
};
const modalStyle = {
  width: '100%', maxWidth: 560, background: '#fff', borderRadius: 16,
  boxShadow: '0 20px 60px rgba(15,23,42,.25)', overflow: 'hidden'
};
const headerStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px 10px 22px' };
const iconWrapStyle = {
  width: 36, height: 36, borderRadius: 9999, background: 'rgba(245,158,11,.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
};
const titleStyle = { margin: 0, fontSize: 20, color: '#111827', fontWeight: 800, letterSpacing: '.01em' };
const bodyStyle = { padding: '0 22px 6px 22px' };
const pStyle = { margin: 0, color: '#374151', lineHeight: 1.5 };
const ulStyle = { margin: '10px 0 0 18px', color: '#4B5563' };
const footerStyle = {
  display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 22px 22px 22px'
};
