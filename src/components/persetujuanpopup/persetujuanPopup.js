import React, { useState, useEffect, useMemo } from 'react';
import styles from './persetujuanPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function PersetujuanPopup({
  show,
  onClose,
  onSubmit,
  detail,                 // berisi booking, termasuk vehicle_types: [{id(type_id), name, quantity}]
  driverList = [],        // array drivers: { id, name, hp, driver_status_id | status_id }
  vehicleList = [],       // array vehicles (unit): { id, plat_nomor, tahun, vehicle_type_id, vehicle_status_id }
}) {
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [keterangan, setKeterangan] = useState(detail?.keterangan || '');

  const maxDrivers = Number(detail?.jumlah_driver) || 0;

  // Map “kuota per tipe” dari booking
  const requiredByType = useMemo(() => {
    const map = new Map();
    (detail?.vehicle_types || []).forEach(vt => {
      // vt.id = vehicle_type_id, vt.quantity = jumlah unit type ini yang diminta
      map.set(Number(vt.id), Number(vt.quantity) || 0);
    });
    return map;
  }, [detail]);

  // Total unit kendaraan yang diminta
  const totalVehiclesRequired = useMemo(
    () => Array.from(requiredByType.values()).reduce((a, b) => a + b, 0),
    [requiredByType]
  );

  // Filter drivers: hanya available
  const filteredDrivers = useMemo(() => {
    return (driverList || []).filter(d => {
      const s = Number(d.driver_status_id ?? d.status_id ?? d.status);
      return s === 1; // 1 = Available
    });
  }, [driverList]);

  // Filter vehicles (unit): hanya available & tipenya ada di booking
  const allowedTypeIds = useMemo(
    () => new Set((detail?.vehicle_types || []).map(vt => Number(vt.id))),
    [detail]
  );

  const filteredVehicles = useMemo(() => {
    return (vehicleList || []).filter(v => {
      const statusOk = Number(v.vehicle_status_id) === 1; // 1 = Available
      const typeOk = allowedTypeIds.has(Number(v.vehicle_type_id));
      return statusOk && typeOk;
    });
  }, [vehicleList, allowedTypeIds]);

  // Hitung terpilih per type untuk batasi sesuai kuota
  const selectedCountByType = useMemo(() => {
    const map = new Map();
    selectedVehicles.forEach(vid => {
      const v = filteredVehicles.find(x => x.id === vid);
      if (!v) return;
      const t = Number(v.vehicle_type_id);
      map.set(t, (map.get(t) || 0) + 1);
    });
    return map;
  }, [selectedVehicles, filteredVehicles]);

  useEffect(() => {
    setSelectedDrivers([]);
    setSelectedVehicles([]);
    setKeterangan(detail?.keterangan || '');
  }, [show, detail]);

  if (!show) return null;

  // Toggle driver (batasi jumlah = maxDrivers)
  const handleDriverToggle = (id) => {
    if (selectedDrivers.includes(id)) {
      setSelectedDrivers(prev => prev.filter(d => d !== id));
      return;
    }
    if (selectedDrivers.length >= maxDrivers) {
      alert(`Maksimum driver yang bisa dipilih adalah ${maxDrivers}.`);
      return;
    }
    setSelectedDrivers(prev => [...prev, id]);
  };

  // Toggle vehicle unit dengan batas total & per tipe
  const handleVehicleToggle = (id) => {
    const isSelected = selectedVehicles.includes(id);
    if (isSelected) {
      setSelectedVehicles(prev => prev.filter(v => v !== id));
      return;
    }

    // Batas total
    if (selectedVehicles.length >= totalVehiclesRequired) {
      alert(`Maksimum kendaraan yang bisa dipilih adalah ${totalVehiclesRequired} unit.`);
      return;
    }

    // Batas per tipe
    const vehicle = filteredVehicles.find(v => v.id === id);
    if (!vehicle) return;

    const typeId = Number(vehicle.vehicle_type_id);
    const requiredForType = requiredByType.get(typeId) || 0;
    const selectedForType = selectedCountByType.get(typeId) || 0;

    if (selectedForType >= requiredForType) {
      // opsional: cari nama tipe dari detail untuk pesan yang lebih informatif
      const typeName = (detail?.vehicle_types || []).find(vt => Number(vt.id) === typeId)?.name || `Tipe ${typeId}`;
      alert(`Kuota ${typeName} sudah terpenuhi (maks ${requiredForType}).`);
      return;
    }

    setSelectedVehicles(prev => [...prev, id]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (totalVehiclesRequired > 0 && selectedVehicles.length !== totalVehiclesRequired) {
      alert(`Kamu harus memilih tepat ${totalVehiclesRequired} kendaraan.`);
      return;
    }

    if (maxDrivers > 0 && selectedDrivers.length !== maxDrivers) {
      alert(`Jumlah driver yang dipilih harus tepat ${maxDrivers}.`);
      return;
    }

    onSubmit({
      driverIds: selectedDrivers,     // kirim ID driver
      vehicleIds: selectedVehicles,   // kirim ID unit kendaraan
      keterangan,
    });
  };

  const selectedDriverNames = filteredDrivers
    .filter(d => selectedDrivers.includes(d.id))
    .map(d => d.name)
    .join(', ');

  // Helper tampilkan label kendaraan (plat + tipe)
  const vehicleLabel = (v) => {
    const typeName = (detail?.vehicle_types || []).find(t => Number(t.id) === Number(v.vehicle_type_id))?.name || `Type ${v.vehicle_type_id}`;
    return `${v.plat_nomor ?? v.plate ?? v.id} — ${typeName}`;
  };

  // Disabled state untuk checkbox kendaraan (kalau sudah penuh total atau per tipe)
  const isVehicleDisabled = (v) => {
    if (selectedVehicles.includes(v.id)) return false; // selalu boleh unselect
    if (selectedVehicles.length >= totalVehiclesRequired) return true;
    const typeId = Number(v.vehicle_type_id);
    const requiredForType = requiredByType.get(typeId) || 0;
    const selectedForType = selectedCountByType.get(typeId) || 0;
    return selectedForType >= requiredForType;
  };

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBox}>
        <div className={styles.popupHeader}>
          <div className={styles.popupTitle}>Persetujuan Form D&apos;MOVE</div>
          <button className={styles.closeBtn} onClick={onClose}><FaTimes size={24} /></button>
        </div>

        <form className={styles.popupForm} onSubmit={handleSubmit}>
          {/* Kendaraan (hanya available & sesuai tipe booking) */}
          <label className={styles.formLabel}>
            Pilih Kendaraan
            {totalVehiclesRequired ? ` (butuh ${totalVehiclesRequired} unit)` : ''}
          </label>
          <div className={styles.multipleChoiceWrap}>
            {filteredVehicles.length === 0 && (
              <div className={styles.emptyHint}>Tidak ada kendaraan available yang sesuai tipe.</div>
            )}
            {filteredVehicles.map(vehicle => (
              <label key={vehicle.id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  value={vehicle.id}
                  checked={selectedVehicles.includes(vehicle.id)}
                  onChange={() => handleVehicleToggle(vehicle.id)}
                  className={styles.checkboxInput}
                  disabled={isVehicleDisabled(vehicle)}
                />
                <span>{vehicleLabel(vehicle)}</span>
              </label>
            ))}
          </div>

          {/* Driver (hanya available) */}
          <label className={styles.formLabel}>Pilih Driver (Max {maxDrivers})</label>
          <div className={styles.multipleChoiceWrap}>
            {filteredDrivers.length === 0 && (
              <div className={styles.emptyHint}>Tidak ada driver yang available.</div>
            )}
            {filteredDrivers.map(driver => (
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

          <button type="submit" className={styles.submitBtn}>Submit</button>
        </form>
      </div>
    </div>
  );
}
