import React, { useState, useEffect } from 'react';
import styles from './persetujuanPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function PersetujuanPopup({
  show,
  onClose,
  onSubmit,
  detail,
  driverList = [],
  vehicleList = [],
}) {
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [keterangan, setKeterangan] = useState(detail?.keterangan || '');
  const maxDrivers = Number(detail?.jumlah_driver) || 0;

  useEffect(() => {
    setSelectedDrivers([]);
    setSelectedVehicles([]);
    setKeterangan(detail?.keterangan || '');
  }, [show, detail]);

  if (!show) return null;

  const handleDriverToggle = (id) => {
    if (selectedDrivers.includes(id)) {
      setSelectedDrivers((prev) => prev.filter((d) => d !== id));
    } else if (selectedDrivers.length < maxDrivers) {
      setSelectedDrivers((prev) => [...prev, id]);
    } else {
      alert(`Maksimum driver yang bisa dipilih adalah ${maxDrivers}.`);
    }
  };

  const handleVehicleToggle = (id) => {
    if (selectedVehicles.includes(id)) {
      setSelectedVehicles((prev) => prev.filter((v) => v !== id));
      // Reset driver jika sebelumnya melebihi limit saat kendaraan berkurang
      if (selectedDrivers.length > selectedVehicles.length - 1) {
        setSelectedDrivers([]);
      }
    } else {
      setSelectedVehicles((prev) => [...prev, id]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedVehicles.length) {
      alert('Silakan pilih minimal 1 kendaraan.');
      return;
    }

    if (selectedDrivers.length !== maxDrivers) {
      alert(`Jumlah driver yang dipilih harus tepat ${maxDrivers}.`);
      return;
    }

    const vehicleTypeIds = vehicleList
      .filter((v) => selectedVehicles.includes(v.id))
      .map((v) => v.id);

    // KIRIM ID SAJA
    onSubmit({
      driverIds: selectedDrivers,
      vehicleTypeIds,
      keterangan,
    });
  };

  const selectedDriverNames = driverList
    .filter((d) => selectedDrivers.includes(d.id))
    .map((d) => d.name)
    .join(', ');

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBox}>
        <div className={styles.popupHeader}>
          <div className={styles.popupTitle}>Persetujuan Form D&apos;MOVE</div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes size={24} />
          </button>
        </div>

        <form className={styles.popupForm} onSubmit={handleSubmit}>
          {/* Kendaraan */}
          <label className={styles.formLabel}>Pilih Kendaraan</label>
          <div className={styles.multipleChoiceWrap}>
            {vehicleList.map((vehicle) => (
              <label key={vehicle.id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  value={vehicle.id}
                  checked={selectedVehicles.includes(vehicle.id)}
                  onChange={() => handleVehicleToggle(vehicle.id)}
                  className={styles.checkboxInput}
                />
                <span>{vehicle.name}</span>
              </label>
            ))}
          </div>

          {/* Driver */}
          <label className={styles.formLabel}>Pilih Driver (Max {maxDrivers})</label>
          <div className={styles.multipleChoiceWrap}>
            {driverList.map((driver) => (
              <label key={driver.id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  value={driver.id}
                  checked={selectedDrivers.includes(driver.id)}
                  onChange={() => handleDriverToggle(driver.id)}
                  className={styles.checkboxInput}
                  disabled={
                    !selectedDrivers.includes(driver.id) &&
                    selectedDrivers.length >= maxDrivers
                  }
                />
                <span>{driver.name}</span>
              </label>
            ))}
          </div>

          {/* Nama Driver Terpilih (display only) */}
          <label className={styles.formLabel}>Driver Terpilih</label>
          <input
            className={styles.formInput}
            type="text"
            value={selectedDriverNames}
            readOnly
            placeholder="Driver"
          />

          {/* Keterangan */}
          <label className={styles.formLabel}>Keterangan</label>
          <input
            className={styles.formInput}
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Keterangan"
          />

          <button type="submit" className={styles.submitBtn}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
