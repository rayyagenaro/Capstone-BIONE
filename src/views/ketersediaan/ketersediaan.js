// src/views/ketersediaan/ketersediaan.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import styles from './ketersediaan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import {
  FaUsers, FaCar, FaEdit, FaTrash, FaPlus, FaUserMd, FaCogs, FaCalendarAlt, FaBuilding
} from 'react-icons/fa';

/* ===========================
   Util kecil
=========================== */
const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const SESSIONS = ['12:00', '12:30', '13:00'];
const getMonthMatrix = (year, monthIndex0) => {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const lastOfMonth = new Date(year, monthIndex0 + 1, 0);
  const firstDayIdxSun0 = firstOfMonth.getDay();
  const firstDayIdxMon0 = (firstDayIdxSun0 + 6) % 7;
  const daysInMonth = lastOfMonth.getDate();

  const cells = [];
  for (let i = 0; i < firstDayIdxMon0; i++) {
    const d = new Date(year, monthIndex0, 1 - (firstDayIdxMon0 - i));
    cells.push(d);
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex0, d));
  while (cells.length < 42) {
    const last = cells[cells.length - 1];
    cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  const weeks = [];
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

/* ===========================
   Komponen Kalender Admin BI.CARE (tanpa legenda; klik = Booked merah)
=========================== */
function DoctorCalendarAdmin({ doctorId = 1 }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [bookedMap, setBookedMap] = useState({});         // { 'YYYY-MM-DD': ['12:00', ...] } – termasuk ADMIN_BLOCK
  const [adminMap, setAdminMap] = useState({});           // { 'YYYY-MM-DD': Set('12:00', ...) } – hanya slot ADMIN_BLOCK
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(() => new Set()); // slot-key yang sedang request

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const matrix = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const monthName = cursor.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  const isSameMonth = (d) => d.getMonth() === month && d.getFullYear() === year;
  const isDoctorDay = (d) => {
    const dow = d.getDay(); // 1=Sen, 5=Jum (contoh aturan dasar)
    return dow === 1 || dow === 5;
  };

  const fetchMonth = useCallback(async (y_m) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ketersediaanAdmin?type=bicare_calendar&doctorId=${doctorId}&month=${y_m}&t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed fetch calendar');
      const data = await res.json();

      const map = data.bookedMap || {};
      const admin = {};
      const ab = data.adminBlocks || {};
      for (const [k, arr] of Object.entries(ab)) admin[k] = new Set(arr);

      setBookedMap(map);
      setAdminMap(admin);
    } catch (e) {
      alert('Gagal memuat kalender');
    }
    setLoading(false);
  }, [doctorId]);

  // panggil fetch saat bulan berubah
  const lastYmRef = useRef(null);
  useEffect(() => {
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (lastYmRef.current !== ym) {
      lastYmRef.current = ym;
      fetchMonth(ym);
    }
  }, [year, month, fetchMonth]);

  const isBooked = (dateStr, time) => (bookedMap[dateStr] || []).includes(time);
  const isAdminBlocked = (dateStr, time) => Boolean(adminMap[dateStr]?.has(time));

  // helper optimistic
  const addBookedAdminLocal = (dateStr, time) => {
    setBookedMap(prev => {
      const arr = new Set(prev[dateStr] || []);
      arr.add(time);
      return { ...prev, [dateStr]: Array.from(arr) };
    });
    setAdminMap(prev => {
      const set = new Set(prev[dateStr] || []);
      set.add(time);
      return { ...prev, [dateStr]: set };
    });
  };
  const removeBookedAdminLocal = (dateStr, time) => {
    setBookedMap(prev => {
      const arr = new Set(prev[dateStr] || []);
      arr.delete(time);
      return { ...prev, [dateStr]: Array.from(arr) };
    });
    setAdminMap(prev => {
      const set = new Set(prev[dateStr] || []);
      set.delete(time);
      return { ...prev, [dateStr]: set };
    });
  };

  const toggleSlot = async (dateObj, time) => {
    const dateStr = ymd(dateObj);
    const booked = isBooked(dateStr, time);
    const adminBlocked = isAdminBlocked(dateStr, time);
    const slotKey = `${dateStr}_${time}`;

    if (booked && !adminBlocked) {
      alert('Slot ini sudah dibooking oleh pengguna. Tidak dapat diubah dari sini.');
      return;
    }

    const action = adminBlocked ? 'unblock' : 'block';
    const ok = confirm(
      adminBlocked
        ? `Buka kembali slot ${time} pada ${dateObj.toLocaleDateString('id-ID')}?`
        : `Tutup slot ${time} pada ${dateObj.toLocaleDateString('id-ID')} untuk pasien?`
    );
    if (!ok) return;

    setPending(prev => new Set(prev).add(slotKey));

    // OPTIMISTIC UI: langsung ubah tampilan
    if (action === 'block') addBookedAdminLocal(dateStr, time);
    else removeBookedAdminLocal(dateStr, time);

    try {
      const res = await fetch('/api/ketersediaanAdmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bicare_calendar',
          action,
          doctorId,
          bookingDate: dateStr,
          slotTime: time
        })
      });
      const out = await res.json();

      if (!res.ok || !out.success) {
        const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
        await fetchMonth(ym); // revert via refresh
        alert(out.message || 'Gagal menyimpan perubahan slot.');
        return;
      }

      // refresh untuk sync (juga membuat tampilan USER ikut update sebab source data sama)
      const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
      fetchMonth(ym);
    } catch (e) {
      const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
      await fetchMonth(ym);
      alert('Gagal mengubah slot (jaringan/server).');
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(slotKey);
        return next;
      });
    }
  };

  return (
    <div className={styles.calWrap}>
      <div className={styles.calHeader}>
        <button
          type="button"
          className={styles.calNavBtn}
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Bulan sebelumnya"
        >‹</button>
        <div className={styles.calTitle}>
          {monthName} {loading ? <span className={styles.calLoading}>(memuat...)</span> : null}
        </div>
        <button
          type="button"
          className={styles.calNavBtn}
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Bulan berikutnya"
        >›</button>
      </div>

      {/* Legend dihapus agar persis seperti tampilan user */}

      <div className={styles.calDayNames}>
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
          <div key={d} className={styles.calDayName}>{d}</div>
        ))}
      </div>

      <div className={styles.calGrid}>
        {matrix.map((week, wi) => (
          <React.Fragment key={wi}>
            {week.map((d, di) => {
              const inMonth = isSameMonth(d);
              const dateStr = ymd(d);
              const doctorOpen = inMonth && isDoctorDay(d);

              return (
                <div key={`${wi}-${di}`} className={`${styles.calCell} ${inMonth ? '' : styles.calCellMuted}`}>
                  <div className={styles.calCellHeader}>
                    <span className={styles.calDateNum}>{d.getDate()}</span>
                    {inMonth && isDoctorDay(d) && <span className={styles.calBadgeOpen}>Buka</span>}
                  </div>

                  {doctorOpen ? (
                    <div className={styles.sessionList}>
                      {SESSIONS.map((time) => {
                        const booked = isBooked(dateStr, time);
                        // tampilan konsisten dengan user: Booked = merah, Available = biru
                        const cls = booked ? styles.sessionBooked : styles.sessionAvail;
                        const caption = booked ? '• Booked' : '• Available';
                        const slotKey = `${dateStr}_${time}`;
                        const isPending = pending.has(slotKey);

                        return (
                          <button
                            key={time}
                            type="button"
                            className={`${styles.sessionBtn} ${cls}`}
                            onClick={() => !isPending && toggleSlot(d, time)}
                            aria-label={`Sesi ${time} pada ${d.toLocaleDateString('id-ID')}`}
                            disabled={isPending}
                          >
                            {time} {caption}{isPending ? ' …' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.sessionListOff}>{inMonth ? (isDoctorDay(d) ? '—' : 'Tutup') : ''}</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ==========================================
   Data & UI lain (BI.DRIVE, BI.CARE & BI.MEET → ROOMS)
========================================== */
const VEHICLE_STATUS_MAP = { 1: 'Available', 2: 'Unavailable', 3: 'Maintenance' };
const VEHICLE_TYPE_MAP = {
  1: 'Mobil SUV', 2: 'Mobil MPV', 3: 'Minibus', 4: 'Double Cabin',
  5: 'Truck', 6: 'Kaskeliling', 7: 'Edukator'
};
const VEHICLE_TYPE_OPTIONS = [
  { id: 1, name: 'Mobil SUV' }, { id: 2, name: 'Mobil MPV' }, { id: 3, name: 'Minibus' },
  { id: 4, name: 'Double Cabin' }, { id: 5, name: 'Truck' }, { id: 6, name: 'Kaskeliling' },
  { id: 7, name: 'Edukator' }
];
const VEHICLE_STATUS_OPTIONS = [
  { id: 1, name: 'Available' }, { id: 2, name: 'Unavailable' }, { id: 3, name: 'Maintenance' }
];

/* ======= Modal serbaguna ======= */
function Modal({ editMode, modalType, formData, handleChange, handleCloseModal, handleSubmit, styles }) {
  const titleMap = {
    drivers: 'Driver',
    vehicles: 'Vehicle',
    bicare_doctors: 'Dokter',
    bicare_rules: 'Aturan',
    bimeet_rooms: 'Room'
  };
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>
          {editMode ? `Edit ${titleMap[modalType]}` : `Tambah ${titleMap[modalType]}`}
        </h3>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Drivers */}
          {modalType === 'drivers' && (
            <>
              <div className={styles.formGroup}>
                <label>NIP</label>
                <input name="nim" value={formData.nim || ''} onChange={handleChange} required maxLength={50} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Nama</label>
                <input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Phone</label>
                <input name="phone" value={formData.phone || ''} onChange={handleChange} required maxLength={20} className={styles.input} />
              </div>
            </>
          )}

          {/* Vehicles */}
          {modalType === 'vehicles' && (
            <>
              <div className={styles.formGroup}>
                <label>Plat Nomor</label>
                <input name="plat_nomor" value={formData.plat_nomor || ''} onChange={handleChange} required maxLength={20} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Tahun</label>
                <input name="tahun" type="number" min={1990} max={2099} value={formData.tahun || ''} onChange={handleChange} required className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Vehicle Type</label>
                <select name="vehicle_type_id" value={formData.vehicle_type_id || ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Vehicle Type</option>
                  {VEHICLE_TYPE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Vehicle Status</label>
                <select name="vehicle_status_id" value={formData.vehicle_status_id || ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Vehicle Status</option>
                  {VEHICLE_STATUS_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
              </div>
            </>
          )}

          {/* BI.CARE Doctors */}
          {modalType === 'bicare_doctors' && (
            <>
              <div className={styles.formGroup}>
                <label>Nama Dokter</label>
                <input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Aktif</label>
                <select name="is_active" value={formData.is_active ?? 1} onChange={handleChange} className={styles.input}>
                  <option value={1}>Ya</option>
                  <option value={0}>Tidak</option>
                </select>
              </div>
            </>
          )}

          {/* BI.CARE Rules */}
          {modalType === 'bicare_rules' && (
            <>
              <div className={styles.formGroup}>
                <label>Dokter</label>
                <select name="doctor_id" value={formData.doctor_id || ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Dokter</option>
                  {(formData.doctorOptions || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Hari (MON..SUN)</label>
                <select name="weekday" value={formData.weekday || 'MON'} onChange={handleChange} className={styles.input}>
                  {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Mulai</label>
                <input name="start_time" type="time" value={formData.start_time || ''} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Selesai</label>
                <input name="end_time" type="time" value={formData.end_time || ''} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Slot (menit)</label>
                <input name="slot_minutes" type="number" min={5} max={240} value={formData.slot_minutes || 30} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Aktif</label>
                <select name="is_active" value={formData.is_active ?? 1} onChange={handleChange} className={styles.input}>
                  <option value={1}>Ya</option>
                  <option value={0}>Tidak</option>
                </select>
              </div>
            </>
          )}

          {/* BI.MEET Rooms */}
          {modalType === 'bimeet_rooms' && (
            <>
              <div className={styles.formGroup}>
                <label>Nama Room</label>
                <input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Lantai</label>
                <input name="floor" type="number" min={0} max={100} value={formData.floor ?? ''} onChange={handleChange} required className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Kapasitas</label>
                <input name="capacity" type="number" min={1} max={10000} value={formData.capacity ?? ''} onChange={handleChange} required className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <select name="status_id" value={formData.status_id ?? ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Status</option>
                  {(formData.statusOptions || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className={styles.modalBtnGroup}>
            <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>Batal</button>
            <button type="submit" className={styles.btnSave}>Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==========================================
   Halaman utama
========================================== */
const initialDriver = { id: null, nim: '', name: '', phone: '' };
const initialVehicle = { id: null, plat_nomor: '', tahun: '', vehicle_type_id: '', vehicle_status_id: '' };
const initialRoom   = { id: null, name: '', floor: 1, capacity: 1, status_id: 1 };

export default function Ketersediaan() {
  const router = useRouter();

  // Tabs level-1
  const [mainTab, setMainTab] = useState('drive'); // 'drive' | 'care' | 'meet'

  // SubTabs
  const [subDrive, setSubDrive] = useState('drivers'); // 'drivers'|'vehicles'
  const [subCare, setSubCare] = useState('doctors');   // 'doctors'|'rules'|'calendar'
  const [subMeet, setSubMeet] = useState('rooms');     // saat ini hanya 'rooms'

  // Data drive
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // BI.CARE data
  const [careDoctors, setCareDoctors] = useState([]);          // tabel bicare_doctors
  const [careRules, setCareRules] = useState([]);              // tabel bicare_availability_rules

  // BI.MEET data
  const [meetRooms, setMeetRooms] = useState([]);              // tabel bimeet_rooms
  const [meetStatus, setMeetStatus] = useState([]);            // tabel bimeet_room_status

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [modalType, setModalType] = useState('drivers');
  const [formData, setFormData] = useState(initialDriver);

  // Logout
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const handleLogout = async () => {
    try {
      const ns = new URLSearchParams(location.search).get('ns');
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } catch {}
    router.replace('/Signin/hal-signAdmin');
  };

  // Pagination untuk tabel-tabel
  const [page, setPage] = useState({ drivers: 1, vehicles: 1, care_doctors: 1, care_rules: 1, meet_rooms: 1 });
  const [perPage, setPerPage] = useState({ drivers: 10, vehicles: 10, care_doctors: 10, care_rules: 10, meet_rooms: 10 });
  const tableTopRef = useRef(null);

  /* -------- Fetch awal -------- */
  useEffect(() => { fetchAll(); }, []);
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        driversRes, vehiclesRes,
        careDocRes, careRulesRes,
        roomsRes, statusRes
      ] = await Promise.all([
        fetch('/api/ketersediaanAdmin?type=drivers'),
        fetch('/api/ketersediaanAdmin?type=vehicles'),
        fetch('/api/ketersediaanAdmin?type=bicare_doctors'),
        fetch('/api/ketersediaanAdmin?type=bicare_rules'),
        fetch('/api/ketersediaanAdmin?type=bimeet_rooms'),
        fetch('/api/ketersediaanAdmin?type=bimeet_room_status'),
      ]);
      const [
        driversJson, vehiclesJson,
        careDocJson, careRulesJson,
        roomsJson, statusJson
      ] = await Promise.all([
        driversRes.json(), vehiclesRes.json(),
        careDocRes.json(), careRulesRes.json(),
        roomsRes.json(), statusRes.json()
      ]);

      setDrivers(driversJson.data || []);
      setVehicles(vehiclesJson.data || []);
      setCareDoctors(careDocJson.data || []);
      setCareRules(careRulesJson.data || []);
      setMeetRooms(roomsJson.data || []);
      setMeetStatus(statusJson.data || []);
    } catch {
      alert('Gagal load data!');
    }
    setLoading(false);
  };

  /* -------- Modal helpers -------- */
  const handleOpenModal = (type, data = null) => {
    setModalType(type);
    setEditMode(!!data);

    if (type === 'drivers') setFormData(data ? { ...data } : initialDriver);
    else if (type === 'vehicles') setFormData(data ? { ...data } : initialVehicle);
    else if (type === 'bicare_doctors') setFormData(data ? { ...data } : { id: null, name: '', is_active: 1 });
    else if (type === 'bicare_rules') {
      const doctorOptions = careDoctors;
      setFormData(data ? { ...data, doctorOptions } : {
        id: null, doctor_id: '', weekday: 'MON', start_time: '12:00', end_time: '13:30', slot_minutes: 30, is_active: 1,
        doctorOptions
      });
    } else if (type === 'bimeet_rooms') {
      const statusOptions = meetStatus;
      setFormData(data ? { ...data, statusOptions } : { ...initialRoom, statusOptions });
    }

    setModalOpen(true);
  };
  const handleCloseModal = () => { setModalOpen(false); setEditMode(false); };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = '/api/ketersediaanAdmin';
    const method = editMode ? 'PUT' : 'POST';
    const body = JSON.stringify({ ...formData, type: modalType });

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
      const result = await res.json();
      if (result.success) {
        fetchAll();
        handleCloseModal();
      } else {
        alert(result.message || 'Gagal menyimpan data!');
      }
    } catch {
      alert('Gagal terhubung ke server!');
    }
  };
  const handleDelete = async (type, id) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    try {
      const res = await fetch('/api/ketersediaanAdmin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      });
      const result = await res.json();
      if (result.success) {
        fetchAll();
      } else {
        alert(result.message || 'Gagal menghapus!');
      }
    } catch {
      alert('Gagal menghubungi server!');
    }
  };

  /* -------- Helpers tabel + pagination -------- */
  const meetStatusMap = useMemo(() => {
    const m = {};
    for (const s of meetStatus) m[s.id] = s.name;
    return m;
  }, [meetStatus]);

  const activeList = useMemo(() => {
    if (mainTab === 'drive') return subDrive === 'drivers' ? drivers : vehicles;
    if (mainTab === 'care')  return subCare === 'doctors' ? careDoctors : (subCare === 'rules' ? careRules : []);
    if (mainTab === 'meet')  return subMeet === 'rooms' ? meetRooms : [];
    return [];
  }, [mainTab, subDrive, subCare, subMeet, drivers, vehicles, careDoctors, careRules, meetRooms]);

  const key =
    mainTab === 'drive' ? (subDrive === 'drivers' ? 'drivers' : 'vehicles')
    : mainTab === 'care' ? (subCare === 'doctors' ? 'care_doctors' : 'care_rules')
    : 'meet_rooms';

  const currentPage = page[key] || 1;
  const itemsPerPage = perPage[key] || 10;
  const totalPages = Math.max(1, Math.ceil(activeList.length / (itemsPerPage || 10)));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageRows = useMemo(() => activeList.slice(startIdx, endIdx), [activeList, startIdx, endIdx]);

  useEffect(() => { if (currentPage > totalPages) setPage(p => ({ ...p, [key]: 1 })); }, [totalPages]); // koreksi page
  const onPageChange = useCallback((p) => {
    if (p < 1 || p > totalPages) return;
    setPage((prev) => ({ ...prev, [key]: p }));
    tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [key, totalPages]);
  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setPerPage((prev) => ({ ...prev, [key]: val }));
    setPage((prev) => ({ ...prev, [key]: 1 }));
    tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const resultsFrom = activeList.length ? startIdx + 1 : 0;
  const resultsTo = Math.min(endIdx, activeList.length);

  return (
    <>
      <div className={styles.background}>
        <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />

        <main className={styles.mainContent}>
          <div className={styles.cardContainer}>
            {/* Tabs level-1 */}
            <div className={styles.mainTabs}>
              <button className={`${styles.mainTabBtn} ${mainTab === 'drive' ? styles.mainTabActive : ''}`} onClick={() => setMainTab('drive')}>
                <FaUsers style={{ marginRight: 8 }} /> BI.DRIVE
              </button>
              <button className={`${styles.mainTabBtn} ${mainTab === 'care' ? styles.mainTabActive : ''}`} onClick={() => setMainTab('care')}>
                <FaUserMd style={{ marginRight: 8 }} /> BI.CARE
              </button>
              <button className={`${styles.mainTabBtn} ${mainTab === 'meet' ? styles.mainTabActive : ''}`} onClick={() => setMainTab('meet')}>
                <FaCalendarAlt style={{ marginRight: 8 }} /> BI.MEET
              </button>
            </div>

            {/* SubTabs */}
            {mainTab === 'drive' && (
              <div className={styles.subTabs}>
                <button className={`${styles.subTabBtn} ${subDrive === 'drivers' ? styles.subTabActive : ''}`} onClick={() => setSubDrive('drivers')}>
                  <FaUsers style={{ marginRight: 6 }} /> Driver
                </button>
                <button className={`${styles.subTabBtn} ${subDrive === 'vehicles' ? styles.subTabActive : ''}`} onClick={() => setSubDrive('vehicles')}>
                  <FaCar style={{ marginRight: 6 }} /> Vehicle
                </button>
              </div>
            )}

            {mainTab === 'care' && (
              <div className={styles.subTabs}>
                <button className={`${styles.subTabBtn} ${subCare === 'doctors' ? styles.subTabActive : ''}`} onClick={() => setSubCare('doctors')}>
                  <FaUserMd style={{ marginRight: 6 }} /> Dokter
                </button>
                <button className={`${styles.subTabBtn} ${subCare === 'rules' ? styles.subTabActive : ''}`} onClick={() => setSubCare('rules')}>
                  <FaCogs style={{ marginRight: 6 }} /> Aturan
                </button>
                <button className={`${styles.subTabBtn} ${subCare === 'calendar' ? styles.subTabActive : ''}`} onClick={() => setSubCare('calendar')}>
                  <FaCalendarAlt style={{ marginRight: 6 }} /> Kalender
                </button>
              </div>
            )}

            {mainTab === 'meet' && (
              <div className={styles.subTabs}>
                <button className={`${styles.subTabBtn} ${subMeet === 'rooms' ? styles.subTabActive : ''}`} onClick={() => setSubMeet('rooms')}>
                  <FaBuilding style={{ marginRight: 6 }} /> Rooms
                </button>
              </div>
            )}

            <div className={styles.tableWrapper}>
              <div ref={tableTopRef} />

              {/* ====== BI.CARE → Kalender ====== */}
              {mainTab === 'care' && subCare === 'calendar' ? (
                <div className={styles.calendarBlock}>
                  <DoctorCalendarAdmin doctorId={1} />
                  <p className={styles.calendarHintAdmin}>
                    Klik slot untuk menutup (membuat booking sistem) atau membuka (menghapus booking sistem).
                    Slot yang sudah dibooking pengguna tidak dapat dibuka dari sini.
                  </p>
                </div>
              ) : null}

              {/* ====== DRIVE: DRIVERS ====== */}
              {mainTab === 'drive' && subDrive === 'drivers' && (
                <>
                  <div className={styles.addRow}>
                    <button type="button" className={styles.btnCreate} onClick={() => handleOpenModal('drivers')}>
                      <FaPlus style={{ marginRight: 6 }} /> Tambah Driver
                    </button>
                  </div>
                  {loading ? (
                    <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
                  ) : (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>NIP</th>
                          <th>Nama</th>
                          <th>No. HP</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
                        ) : pageRows.map((d) => (
                          <tr key={d.id}>
                            <td>{d.id}</td>
                            <td>{d.nim}</td>
                            <td>{d.name}</td>
                            <td>{d.phone}</td>
                            <td>
                              <button type="button" className={styles.btnAction} onClick={() => handleOpenModal('drivers', d)} title="Edit"><FaEdit /></button>
                              <button type="button" className={styles.btnActionDelete} onClick={() => handleDelete('drivers', d.id)} title="Delete"><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* ====== DRIVE: VEHICLES ====== */}
              {mainTab === 'drive' && subDrive === 'vehicles' && (
                <>
                  <div className={styles.addRow}>
                    <button type="button" className={styles.btnCreate} onClick={() => handleOpenModal('vehicles')}>
                      <FaPlus style={{ marginRight: 6 }} /> Tambah Vehicle
                    </button>
                  </div>
                  {loading ? (
                    <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
                  ) : (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Plat Nomor</th>
                          <th>Tahun</th>
                          <th>Vehicle Type</th>
                          <th>Vehicle Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
                        ) : pageRows.map((v) => (
                          <tr key={v.id}>
                            <td>{v.id}</td>
                            <td>{v.plat_nomor}</td>
                            <td>{v.tahun}</td>
                            <td>{VEHICLE_TYPE_MAP[v.vehicle_type_id] || v.vehicle_type_id}</td>
                            <td>{VEHICLE_STATUS_MAP[v.vehicle_status_id] || v.vehicle_status_id}</td>
                            <td>
                              <button type="button" className={styles.btnAction} onClick={() => handleOpenModal('vehicles', v)} title="Edit"><FaEdit /></button>
                              <button type="button" className={styles.btnActionDelete} onClick={() => handleDelete('vehicles', v.id)} title="Delete"><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* ====== CARE: DOCTORS ====== */}
              {mainTab === 'care' && subCare === 'doctors' && (
                <>
                  <div className={styles.addRow}>
                    <button type="button" className={styles.btnCreate} onClick={() => handleOpenModal('bicare_doctors')}>
                      <FaPlus style={{ marginRight: 6 }} /> Tambah Dokter
                    </button>
                  </div>
                  {loading ? (
                    <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
                  ) : (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nama</th>
                          <th>Aktif</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
                        ) : pageRows.map((d) => (
                          <tr key={d.id}>
                            <td>{d.id}</td>
                            <td>{d.name}</td>
                            <td>{d.is_active ? 'Ya' : 'Tidak'}</td>
                            <td>
                              <button type="button" className={styles.btnAction} onClick={() => handleOpenModal('bicare_doctors', d)} title="Edit"><FaEdit /></button>
                              <button type="button" className={styles.btnActionDelete} onClick={() => handleDelete('bicare_doctors', d.id)} title="Delete"><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* ====== CARE: RULES ====== */}
              {mainTab === 'care' && subCare === 'rules' && (
                <>
                  <div className={styles.addRow}>
                    <button type="button" className={styles.btnCreate} onClick={() => handleOpenModal('bicare_rules')}>
                      <FaPlus style={{ marginRight: 6 }} /> Tambah Aturan
                    </button>
                  </div>
                  {loading ? (
                    <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
                  ) : (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Dokter</th>
                          <th>Hari</th>
                          <th>Mulai</th>
                          <th>Selesai</th>
                          <th>Slot (mnt)</th>
                          <th>Aktif</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.length === 0 ? (
                          <tr><td colSpan={8} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
                        ) : pageRows.map((r) => (
                          <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{careDoctors.find(d => d.id === r.doctor_id)?.name || r.doctor_id}</td>
                            <td>{r.weekday}</td>
                            <td>{String(r.start_time).slice(0,5)}</td>
                            <td>{String(r.end_time).slice(0,5)}</td>
                            <td>{r.slot_minutes}</td>
                            <td>{r.is_active ? 'Ya' : 'Tidak'}</td>
                            <td>
                              <button type="button" className={styles.btnAction} onClick={() => handleOpenModal('bicare_rules', r)} title="Edit"><FaEdit /></button>
                              <button type="button" className={styles.btnActionDelete} onClick={() => handleDelete('bicare_rules', r.id)} title="Delete"><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* ====== MEET: ROOMS ====== */}
              {mainTab === 'meet' && subMeet === 'rooms' && (
                <>
                  <div className={styles.addRow}>
                    <button type="button" className={styles.btnCreate} onClick={() => handleOpenModal('bimeet_rooms')}>
                      <FaPlus style={{ marginRight: 6 }} /> Tambah Room
                    </button>
                  </div>
                  {loading ? (
                    <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
                  ) : (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nama Room</th>
                          <th>Lantai</th>
                          <th>Kapasitas</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
                        ) : pageRows.map((r) => (
                          <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{r.name}</td>
                            <td>{r.floor}</td>
                            <td>{r.capacity}</td>
                            <td>{meetStatusMap[r.status_id] || r.status_id}</td>
                            <td>
                              <button type="button" className={styles.btnAction} onClick={() => handleOpenModal('bimeet_rooms', r)} title="Edit"><FaEdit /></button>
                              <button type="button" className={styles.btnActionDelete} onClick={() => handleDelete('bimeet_rooms', r.id)} title="Delete"><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* Controls + Pagination (untuk tabel saja) */}
              {(subCare !== 'calendar') && activeList.length > 0 && (
                <div className={styles.paginateArea}>
                  <div className={styles.paginateControls}>
                    <div className={styles.resultsText}>
                      Menampilkan {resultsFrom}-{resultsTo} dari {activeList.length} data
                    </div>
                    <div>
                      <label htmlFor="perPage" className={styles.label}>Items per page:</label>
                      <select id="perPage" className={styles.itemsPerPageDropdown} value={itemsPerPage} onChange={onChangeItemsPerPage}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
                </div>
              )}
            </div>
          </div>
        </main>

        <LogoutPopup
          open={showLogoutPopup}
          onCancel={() => setShowLogoutPopup(false)}
          onLogout={handleLogout}
        />

        {modalOpen && (
          <Modal
            editMode={editMode}
            modalType={modalType}
            formData={formData}
            handleChange={handleChange}
            handleCloseModal={handleCloseModal}
            handleSubmit={handleSubmit}
            styles={styles}
          />
        )}
      </div>
    </>
  );
}
