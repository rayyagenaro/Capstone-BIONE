import React, { useState, useEffect, useMemo } from 'react';
import styles from './persetujuanPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function PersetujuanPopup({
  show,
  onClose,
  onSubmit,
  detail,                 // booking: { jumlah_driver, keterangan, vehicle_types: [{id(type_id), name, quantity}] }
  driverList = [],        // drivers: { id, name, phone?, driver_status_id }
  vehicleList = [],       // vehicles UNIT: { id, plat_nomor, tahun, vehicle_type_id, vehicle_status_id }
}) {
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [keterangan, setKeterangan] = useState(detail?.keterangan || '');

  const maxDrivers = Number(detail?.jumlah_driver) || 0;

  // kuota per tipe dari booking
  const requiredByType = useMemo(() => {
    const map = new Map();
    (detail?.vehicle_types || []).forEach(vt => {
      map.set(Number(vt.id), Number(vt.quantity) || 0);
    });
    return map;
  }, [detail]);

  // total unit yang diminta
  const totalVehiclesRequired = useMemo(
    () => Array.from(requiredByType.values()).reduce((a, b) => a + b, 0),
    [requiredByType]
  );

  // driver available
  const filteredDrivers = useMemo(
    () => (driverList || []).filter(d => Number(d.driver_status_id ?? d.status_id ?? d.status) === 1),
    [driverList]
  );

  // kendaraan available & sesuai tipe booking
  const allowedTypeIds = useMemo(
    () => new Set((detail?.vehicle_types || []).map(vt => Number(vt.id))),
    [detail]
  );

  const filteredVehicles = useMemo(
    () => (vehicleList || []).filter(v =>
      Number(v.vehicle_status_id) === 1 && allowedTypeIds.has(Number(v.vehicle_type_id))
    ),
    [vehicleList, allowedTypeIds]
  );

  // kelompokkan kendaraan per tipe untuk render per section
  const vehiclesByType = useMemo(() => {
    const map = new Map();
    filteredVehicles.forEach(v => {
      const t = Number(v.vehicle_type_id);
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(v);
    });
    // opsional: sort per type & per unit id
    map.forEach(arr => arr.sort((a, b) => a.id - b.id));
    return map;
  }, [filteredVehicles]);

  // hitung yang terpilih per tipe (untuk disable)
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

  // toggle driver
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

  // toggle vehicle unit (batasi total & per tipe)
  const handleVehicleToggle = (id) => {
    const isSelected = selectedVehicles.includes(id);
    if (isSelected) {
      setSelectedVehicles(prev => prev.filter(v => v !== id));
      return;
    }

    // batas total
    if (selectedVehicles.length >= totalVehiclesRequired) {
      alert(`Maksimum kendaraan yang bisa dipilih adalah ${totalVehiclesRequired} unit.`);
      return;
    }

    const vehicle = filteredVehicles.find(v => v.id === id);
    if (!vehicle) return;

    const typeId = Number(vehicle.vehicle_type_id);
    const requiredForType = requiredByType.get(typeId) || 0;
    const selectedForType = selectedCountByType.get(typeId) || 0;

    if (selectedForType >= requiredForType) {
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
      driverIds: selectedDrivers,
      vehicleIds: selectedVehicles,
      keterangan,
    });
  };

  const selectedDriverNames = filteredDrivers
    .filter(d => selectedDrivers.includes(d.id))
    .map(d => d.name)
    .join(', ');

  const vehicleLabel = (v) => {
    const typeName =
      (detail?.vehicle_types || []).find(t => Number(t.id) === Number(v.vehicle_type_id))?.name
      || `Tipe ${v.vehicle_type_id}`;
    return `${v.plat_nomor ?? v.plate ?? v.id} — ${typeName}`;
  };

  const isVehicleDisabled = (v) => {
    if (selectedVehicles.includes(v.id)) return false; // boleh uncheck
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
          {/* === 2 columns layout === */}
          <div className={styles.columns}>
            {/* LEFT: kendaraan (group per type) */}
            <div className={styles.col}>
              <label className={styles.formLabel}>
                Pilih Kendaraan{totalVehiclesRequired ? ` (butuh ${totalVehiclesRequired} unit)` : ''}
              </label>

              {detail?.vehicle_types?.map((t) => {
                const typeId = Number(t.id);
                const list = vehiclesByType.get(typeId) || [];
                const required = requiredByType.get(typeId) || 0;
                const selectedForType = selectedCountByType.get(typeId) || 0;

                return (
                  <div key={typeId} className={styles.typeSection}>
                    <div className={styles.typeHeader}>
                      <span className={styles.typeTitle}>
                        {required} unit {t.name}
                      </span>
                      <span className={styles.typeCounter}>
                        {selectedForType}/{required}
                      </span>
                    </div>

                    <div className={styles.scrollBox}>
                      {list.length === 0 && (
                        <div className={styles.emptyHintSmall}>Tidak ada unit {t.name} yang available.</div>
                      )}
                      {list.map(vehicle => (
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
                  </div>
                );
              })}
            </div>

            {/* RIGHT: drivers */}
            <div className={styles.col}>
              <label className={styles.formLabel}>
                Pilih Driver{maxDrivers ? ` (Max ${maxDrivers})` : ''}
              </label>
              <div className={styles.scrollBox}>
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

              {/* Nama Driver Terpilih */}
              <label className={styles.formLabel}>Driver Terpilih</label>
              <input
                className={styles.formInput}
                type="text"
                value={selectedDriverNames}
                readOnly
                placeholder="Driver"
              />
            </div>
          </div>

          {/* Keterangan + Submit (di bawah 2 kolom) */}
          <div className={styles.footerRow}>
            <div className={styles.keteranganCol}>
              <label className={styles.formLabel}>Keterangan</label>
              <input
                className={styles.formInput}
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Keterangan"
              />
            </div>
            <button type="submit" className={styles.submitBtn}>Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
