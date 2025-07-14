import React, { useState } from 'react';
import styles from './persetujuanPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function PersetujuanPopup({ show, onClose, onSubmit, detail }) {
  const [driver, setDriver] = useState('');
  const [noHp, setNoHp] = useState('');
  const [keterangan, setKeterangan] = useState(detail?.keterangan || '');

  // Dummy list driver
  const driverList = [
    { id: 1, name: 'Fikri Ramadhan', hp: '089876543210' },
    { id: 2, name: 'Budi Santoso', hp: '081223344556' },
    { id: 3, name: 'Dewi Lestari', hp: '082112223334' }
  ];

  // Jika show: false, jangan tampilkan apapun
  if (!show) return null;

  // Jika pilih driver, otomatis isi noHp
  function handleDriverChange(e) {
    setDriver(e.target.value);
    const found = driverList.find(d => d.name === e.target.value);
    setNoHp(found ? found.hp : '');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!driver || !noHp) return;
    // Lakukan aksi submit data
    onSubmit({ driver, noHp, keterangan });
  }

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBox}>
        <div className={styles.popupHeader}>
          <div className={styles.popupTitle}>Persetujuan Form D&#39;MOVE</div>
          <button className={styles.closeBtn} onClick={onClose}><FaTimes size={24}/></button>
        </div>
        <form className={styles.popupForm} onSubmit={handleSubmit}>
          <label className={styles.formLabel}>Driver</label>
          <select
            className={styles.formInput}
            value={driver}
            onChange={handleDriverChange}
            required
          >
            <option value="">Choose Driver</option>
            {driverList.map(driver => (
              <option value={driver.name} key={driver.id}>{driver.name}</option>
            ))}
          </select>

          <label className={styles.formLabel}>No HP Driver</label>
          <input
            className={styles.formInput}
            type="text"
            value={noHp}
            readOnly
            placeholder="No HP Driver"
          />

          <label className={styles.formLabel}>Keterangan</label>
          <input
            className={styles.formInput}
            type="text"
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            placeholder="Keterangan"
          />

          <button type="submit" className={styles.submitBtn}>Submit</button>
        </form>
      </div>
    </div>
  );
}