import React, { useState } from 'react';
import styles from './penolakanPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function PenolakanPopup({ show, onClose, onSubmit }) {
  const [alasan, setAlasan] = useState('');

  if (!show) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!alasan.trim()) return;
    onSubmit(alasan);
  }

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBox}>
        <div className={styles.popupHeader}>
          <div className={styles.popupTitle}>Penolakan Form D&#39;MOVE</div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes size={24} />
          </button>
        </div>
        <form className={styles.popupForm} onSubmit={handleSubmit}>
          <label className={styles.formLabel}>Alasan Penolakan</label>
          <textarea
            className={styles.formInput}
            value={alasan}
            onChange={e => setAlasan(e.target.value)}
            rows={4}
            placeholder="Masukkan alasan penolakan..."
            required
          />
          <button type="submit" className={styles.submitBtn}>Submit</button>
        </form>
      </div>
    </div>
  );
}