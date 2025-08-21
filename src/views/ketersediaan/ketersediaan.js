// src/views/ketersediaan/ketersediaan.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import styles from './ketersediaan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import {
  FaUsers, FaCar, FaUserMd, FaCogs, FaCalendarAlt, FaBuilding,
  FaFileAlt
} from 'react-icons/fa';

// SECTION COMPONENTS
import DriversSection from '@/components/ketersediaan/drive/DriversSection';
import VehiclesSection from '@/components/ketersediaan/drive/VehiclesSection';
import DoctorsSection from '@/components/ketersediaan/care/DoctorsSection';
import RulesSection from '@/components/ketersediaan/care/RulesSection';
import CalendarAdmin from '@/components/ketersediaan/care/CalendarAdmin';
import RoomsSection from '@/components/ketersediaan/meet/RoomsSection';
import DocsUnitsSection from '@/components/ketersediaan/docs/DocsUnitsSection';
import DocsJenisSection from '@/components/ketersediaan/docs/DocsJenisSection';

/* ====== util ====== */
const meetStatusToMap = (arr) => {
  const m = {};
  for (const s of arr) m[s.id] = s.name;
  return m;
};

// --- SORTER BARU: numeric-aware & hoisted ---
function sortArray(arr, field, dir = 'asc') {
  const mul = dir === 'asc' ? 1 : -1;
  return [...arr].sort((a, b) => {
    const va = a?.[field];
    const vb = b?.[field];

    // kalau dua-duanya angka / string angka → urut angka
    const na = Number(va);
    const nb = Number(vb);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) {
      return (na - nb) * mul;
    }

    // fallback teks (kode/nama), tetap “numeric: true” biar 2 < 10
    return String(va ?? '').localeCompare(
      String(vb ?? ''),
      undefined,
      { numeric: true, sensitivity: 'base' }
    ) * mul;
  });
}


const initialDriver = { id: null, nim: '', name: '', phone: '' };
const initialVehicle = { id: null, plat_nomor: '', tahun: '', vehicle_type_id: '', vehicle_status_id: '' };
const initialRoom   = { id: null, name: '', floor: 1, capacity: 1, status_id: 1 };

export default function KetersediaanPage() {
  const router = useRouter();

  // Tabs
  const [mainTab, setMainTab]   = useState('drive');  // 'drive' | 'care' | 'meet' | 'docs'
  const [subDrive, setSubDrive] = useState('drivers'); // 'drivers'|'vehicles'
  const [subCare, setSubCare]   = useState('doctors'); // 'doctors'|'rules'|'calendar'
  const [subMeet, setSubMeet]   = useState('rooms');   // 'rooms'
  const [subDocs, setSubDocs]   = useState('units');   // 'units'|'jenis'

  // Data
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [careDoctors, setCareDoctors] = useState([]);
  const [careRules, setCareRules] = useState([]);
  const [meetRooms, setMeetRooms] = useState([]);
  const [meetStatus, setMeetStatus] = useState([]);
  const [docsUnits, setDocsUnits] = useState([]); // {id, code, name}
  const [docsJenis, setDocsJenis] = useState([]); // {id, kode, nama}

  // DOCS search & sort
  const [docsUnitsSearch, setDocsUnitsSearch] = useState('');
  const [docsUnitsSort,   setDocsUnitsSort]   = useState({ field: 'id',   dir: 'asc' }); // 'id'|'code'|'name'
  const [docsJenisSearch, setDocsJenisSearch] = useState('');
  const [docsJenisSort,   setDocsJenisSort]   = useState({ field: 'id',   dir: 'asc' }); // 'id'|'kode'|'nama'

  // Modal CRUD (1 modal serbaguna, logika di halaman)
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [modalType, setModalType] = useState('drivers'); // drivers|vehicles|bicare_doctors|bicare_rules|bimeet_rooms|bimail_units|bimail_jenis
  const [formData, setFormData]   = useState(initialDriver);
  const [currentDoctorId, setCurrentDoctorId] = useState(null);

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

  /* ===== View data (filter + sort) ===== */
  const docsUnitsPrepared = useMemo(() => {
    const q = docsUnitsSearch.toLowerCase().trim();
    const filtered = (docsUnits || []).filter(u =>
      !q || u.code?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)
    );
    return sortArray(filtered, docsUnitsSort.field, docsUnitsSort.dir);
  }, [docsUnits, docsUnitsSearch, docsUnitsSort]);

  const docsJenisPrepared = useMemo(() => {
    const q = docsJenisSearch.toLowerCase().trim();
    const filtered = (docsJenis || []).filter(j =>
      !q || j.kode?.toLowerCase().includes(q) || j.nama?.toLowerCase().includes(q)
    );
    return sortArray(filtered, docsJenisSort.field, docsJenisSort.dir);
  }, [docsJenis, docsJenisSearch, docsJenisSort]);

  /* -------- Pagination (disimpan per-sub tabel) -------- */
  const [page, setPage] = useState({
    drivers: 1, vehicles: 1, care_doctors: 1, care_rules: 1, meet_rooms: 1,
    docs_units: 1, docs_jenis: 1
  });
  const [perPage, setPerPage] = useState({
    drivers: 10, vehicles: 10, care_doctors: 10, care_rules: 10, meet_rooms: 10,
    docs_units: 10, docs_jenis: 10
  });
  const tableTopRef = useRef(null);

  /* -------- Fetch awal -------- */
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        driversRes, vehiclesRes,
        careDocRes, careRulesRes,
        roomsRes, statusRes,
        docsUnitsRes, docsJenisRes
      ] = await Promise.all([
        fetch('/api/ketersediaanAdmin?type=drivers'),
        fetch('/api/ketersediaanAdmin?type=vehicles'),
        fetch('/api/ketersediaanAdmin?type=bicare_doctors'),
        fetch('/api/ketersediaanAdmin?type=bicare_rules'),
        fetch('/api/ketersediaanAdmin?type=bimeet_rooms'),
        fetch('/api/ketersediaanAdmin?type=bimeet_room_status'),
        fetch('/api/ketersediaanAdmin?type=bimail_units'),
        fetch('/api/ketersediaanAdmin?type=bimail_jenis'),
      ]);

      const [
        driversJson, vehiclesJson,
        careDocJson, careRulesJson,
        roomsJson, statusJson,
        docsUnitsJson, docsJenisJson
      ] = await Promise.all([
        driversRes.json(), vehiclesRes.json(),
        careDocRes.json(), careRulesRes.json(),
        roomsRes.json(), statusRes.json(),
        docsUnitsRes.json(), docsJenisRes.json()
      ]);

      setDrivers(driversJson.data || []);
      setVehicles(vehiclesJson.data || []);

      // dokter & calendar default
      const docs = careDocJson.data || [];
      setCareDoctors(docs);
      setCurrentDoctorId(prev => {
        if (prev && docs.some(d => d.id === prev)) return prev;
        return docs[0]?.id ?? null;
      });

      setCareRules(careRulesJson.data || []);
      setMeetRooms(roomsJson.data || []);
      setMeetStatus(statusJson.data || []);

      setDocsUnits(docsUnitsJson.data || []); // {id, code, name}
      setDocsJenis(docsJenisJson.data || []); // {id, kode, nama}
    } catch {
      alert('Gagal load data!');
    }
    setLoading(false);
  };

  /* -------- Sort togglers (BI.DOCS) -------- */
  const toggleSortUnits = (field) => {
    setDocsUnitsSort(s => s.field === field ? { field, dir: (s.dir === 'asc' ? 'desc':'asc') } : { field, dir:'asc' });
  };
  const toggleSortJenis = (field) => {
    setDocsJenisSort(s => s.field === field ? { field, dir: (s.dir === 'asc' ? 'desc':'asc') } : { field, dir:'asc' });
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
      setFormData(
        data
          ? { ...data, doctorOptions }
          : { id: null, doctor_id: '', weekday: 'MON', start_time: '12:00', end_time: '13:30', slot_minutes: 30, is_active: 1, doctorOptions }
      );
    } else if (type === 'bimeet_rooms') {
      const statusOptions = meetStatus;
      setFormData(data ? { ...data, statusOptions } : { ...initialRoom, statusOptions });
    } else if (type === 'bimail_units') {
      // BI.DOCS → Unit Kerja
      setFormData(data ? { ...data } : { id: null, code: '', name: '' });
    } else if (type === 'bimail_jenis') {
      // BI.DOCS → Jenis Dokumen
      setFormData(data ? { ...data } : { id: null, kode: '', nama: '' });
    }

    setModalOpen(true);
  };

  const handleCloseModal = () => { setModalOpen(false); setEditMode(false); };
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ketersediaanAdmin', {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type: modalType }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchAll();
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

  /* -------- Pagination helpers -------- */
  const activeList = useMemo(() => {
    if (mainTab === 'drive') return subDrive === 'drivers' ? drivers : vehicles;
    if (mainTab === 'care')  return subCare === 'doctors' ? careDoctors : (subCare === 'rules' ? careRules : []);
    if (mainTab === 'meet')  return subMeet === 'rooms' ? meetRooms : [];
    if (mainTab === 'docs')  return subDocs === 'units' ? docsUnitsPrepared : docsJenisPrepared;
    return [];
  }, [mainTab, subDrive, subCare, subMeet, subDocs,
      drivers, vehicles, careDoctors, careRules, meetRooms,
      docsUnitsPrepared, docsJenisPrepared]);

  const key =
    mainTab === 'drive' ? (subDrive === 'drivers' ? 'drivers' : 'vehicles')
    : mainTab === 'care' ? (subCare === 'doctors' ? 'care_doctors' : 'care_rules')
    : mainTab === 'meet' ? 'meet_rooms'
    : /* docs */ (subDocs === 'units' ? 'docs_units' : 'docs_jenis');

  const currentPage  = page[key] || 1;
  const itemsPerPage = perPage[key] || 10;
  const totalPages   = Math.max(1, Math.ceil(activeList.length / (itemsPerPage || 10)));
  const startIdx     = (currentPage - 1) * itemsPerPage;
  const endIdx       = startIdx + itemsPerPage;
  const pageRows     = useMemo(() => activeList.slice(startIdx, endIdx), [activeList, startIdx, endIdx]);

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
  const resultsTo   = Math.min(endIdx, activeList.length);
  const meetStatusMap = useMemo(() => meetStatusToMap(meetStatus), [meetStatus]);

  return (
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
            <button className={`${styles.mainTabBtn} ${mainTab === 'docs' ? styles.mainTabActive : ''}`} onClick={() => setMainTab('docs')}>
              <FaFileAlt style={{ marginRight: 8 }} /> BI.DOCS
            </button>
          </div>

          {/* SubTabs */}
          {mainTab === 'drive' && (
            <div className={styles.subTabs}>
              <button className={`${styles.subTabBtn} ${subDrive === 'drivers' ? styles.subTabActive : ''}`} onClick={() => setSubDrive('drivers')}>
                Driver
              </button>
              <button className={`${styles.subTabBtn} ${subDrive === 'vehicles' ? styles.subTabActive : ''}`} onClick={() => setSubDrive('vehicles')}>
                Vehicle
              </button>
            </div>
          )}

          {mainTab === 'care' && (
            <div className={styles.subTabs}>
              <button className={`${styles.subTabBtn} ${subCare === 'doctors' ? styles.subTabActive : ''}`} onClick={() => setSubCare('doctors')}>
                Dokter
              </button>
              <button className={`${styles.subTabBtn} ${subCare === 'rules' ? styles.subTabActive : ''}`} onClick={() => setSubCare('rules')}>
                Aturan
              </button>
              <button className={`${styles.subTabBtn} ${subCare === 'calendar' ? styles.subTabActive : ''}`} onClick={() => setSubCare('calendar')}>
                Kalender
              </button>
            </div>
          )}

          {mainTab === 'meet' && (
            <div className={styles.subTabs}>
              <button className={`${styles.subTabBtn} ${subMeet === 'rooms' ? styles.subTabActive : ''}`} onClick={() => setSubMeet('rooms')}>
                Rooms
              </button>
            </div>
          )}

          {mainTab === 'docs' && (
            <div className={styles.subTabs}>
              <button className={`${styles.subTabBtn} ${subDocs === 'units' ? styles.subTabActive : ''}`} onClick={() => setSubDocs('units')}>
                Unit Kerja
              </button>
              <button className={`${styles.subTabBtn} ${subDocs === 'jenis' ? styles.subTabActive : ''}`} onClick={() => setSubDocs('jenis')}>
                Jenis Dokumen
              </button>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <div ref={tableTopRef} />

            {/* CARE → Kalender */}
            {mainTab === 'care' && subCare === 'calendar' && (
              <div className={styles.calendarBlock}>
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12, gap:8 }}>
                  <label htmlFor="pickDoctor" style={{ fontWeight:600 }}>Pilih Dokter:</label>
                  <select
                    id="pickDoctor"
                    value={currentDoctorId ?? ''}
                    onChange={(e) => setCurrentDoctorId(Number(e.target.value) || null)}
                    className={styles.input}
                  >
                    {(careDoctors || []).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <CalendarAdmin
                  doctorId={currentDoctorId || (careDoctors[0]?.id ?? 1)}
                  styles={styles}
                />

                <p className={styles.calendarHintAdmin}>
                  Klik slot untuk menutup (membuat booking sistem) atau membuka (menghapus booking sistem).
                  Slot yang sudah dibooking pengguna tidak dapat dibuka dari sini.
                </p>
              </div>
            )}

            {/* DRIVE: Drivers */}
            {mainTab === 'drive' && subDrive === 'drivers' && (
              <DriversSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                onAdd={() => handleOpenModal('drivers')}
                onEdit={(row) => handleOpenModal('drivers', row)}
                onDelete={(id) => handleDelete('drivers', id)}
              />
            )}

            {/* DRIVE: Vehicles */}
            {mainTab === 'drive' && subDrive === 'vehicles' && (
              <VehiclesSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                onAdd={() => handleOpenModal('vehicles')}
                onEdit={(row) => handleOpenModal('vehicles', row)}
                onDelete={(id) => handleDelete('vehicles', id)}
              />
            )}

            {/* CARE: Doctors */}
            {mainTab === 'care' && subCare === 'doctors' && (
              <DoctorsSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                onAdd={() => handleOpenModal('bicare_doctors')}
                onEdit={(row) => handleOpenModal('bicare_doctors', row)}
                onDelete={(id) => handleDelete('bicare_doctors', id)}
              />
            )}

            {/* CARE: Rules */}
            {mainTab === 'care' && subCare === 'rules' && (
              <RulesSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                doctors={careDoctors}
                onAdd={() => handleOpenModal('bicare_rules')}
                onEdit={(row) => handleOpenModal('bicare_rules', row)}
                onDelete={(id) => handleDelete('bicare_rules', id)}
              />
            )}

            {/* MEET: Rooms */}
            {mainTab === 'meet' && subMeet === 'rooms' && (
              <RoomsSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                statusMap={meetStatusMap}
                onAdd={() => handleOpenModal('bimeet_rooms')}
                onEdit={(row) => handleOpenModal('bimeet_rooms', row)}
                onDelete={(id) => handleDelete('bimeet_rooms', id)}
              />
            )}

            {/* DOCS: Units */}
            {mainTab === 'docs' && subDocs === 'units' && (
              <DocsUnitsSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                onAdd={() => handleOpenModal('bimail_units')}
                onEdit={(row) => handleOpenModal('bimail_units', row)}
                onDelete={(type, id) => handleDelete(type, id)}
                searchValue={docsUnitsSearch}
                onSearchChange={setDocsUnitsSearch}
                sortField={docsUnitsSort.field}
                sortDir={docsUnitsSort.dir}
                onSort={toggleSortUnits}
              />
            )}

            {/* DOCS: Jenis */}
            {mainTab === 'docs' && subDocs === 'jenis' && (
              <DocsJenisSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                onAdd={() => handleOpenModal('bimail_jenis')}
                onEdit={(row) => handleOpenModal('bimail_jenis', row)}
                onDelete={(type, id) => handleDelete(type, id)}
                searchValue={docsJenisSearch}
                onSearchChange={setDocsJenisSearch}
                sortField={docsJenisSort.field}
                sortDir={docsJenisSort.dir}
                onSort={toggleSortJenis}
              />
            )}

            {/* Pagination (untuk tabel saja) */}
            {!(mainTab === 'care' && subCare === 'calendar') && activeList.length > 0 && (
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
          handleChange={(e) => handleChange(e)}
          handleCloseModal={handleCloseModal}
          handleSubmit={handleSubmit}
          styles={styles}
        />
      )}
    </div>
  );
}

/* ====== Modal serbaguna ====== */
function Modal({ editMode, modalType, formData, handleChange, handleCloseModal, handleSubmit, styles }) {
  const VEHICLE_TYPE_OPTIONS = [
    { id: 1, name: 'Mobil SUV' }, { id: 2, name: 'Mobil MPV' }, { id: 3, name: 'Minibus' },
    { id: 4, name: 'Double Cabin' }, { id: 5, name: 'Truck' }, { id: 6, name: 'Kaskeliling' }, { id: 7, name: 'Edukator' }
  ];
  const VEHICLE_STATUS_OPTIONS = [
    { id: 1, name: 'Available' }, { id: 2, name: 'Unavailable' }, { id: 3, name: 'Maintenance' }
  ];

  const titleMap = {
    drivers: 'Driver',
    vehicles: 'Vehicle',
    bicare_doctors: 'Dokter',
    bicare_rules: 'Aturan',
    bimeet_rooms: 'Room',
    bimail_units: 'Unit Kerja',
    bimail_jenis: 'Jenis Dokumen'
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>
          {editMode ? `Edit ${titleMap[modalType]}` : `Tambah ${titleMap[modalType]}`}
        </h3>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* DRIVERS */}
          {modalType === 'drivers' && (
            <>
              <div className={styles.formGroup}><label>NIP</label><input name="nim" value={formData.nim || ''} onChange={handleChange} required maxLength={50} className={styles.input} /></div>
              <div className={styles.formGroup}><label>Nama</label><input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} /></div>
              <div className={styles.formGroup}><label>Phone</label><input name="phone" value={formData.phone || ''} onChange={handleChange} required maxLength={20} className={styles.input} /></div>
            </>
          )}

          {/* VEHICLES */}
          {modalType === 'vehicles' && (
            <>
              <div className={styles.formGroup}><label>Plat Nomor</label><input name="plat_nomor" value={formData.plat_nomor || ''} onChange={handleChange} required maxLength={20} className={styles.input} /></div>
              <div className={styles.formGroup}><label>Tahun</label><input name="tahun" type="number" min={1990} max={2099} value={formData.tahun || ''} onChange={handleChange} required className={styles.input} /></div>
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

          {/* CARE: DOCTORS */}
          {modalType === 'bicare_doctors' && (
            <>
              <div className={styles.formGroup}><label>Nama Dokter</label><input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} /></div>
              <div className={styles.formGroup}>
                <label>Aktif</label>
                <select name="is_active" value={formData.is_active ?? 1} onChange={handleChange} className={styles.input}>
                  <option value={1}>Ya</option><option value={0}>Tidak</option>
                </select>
              </div>
            </>
          )}

          {/* CARE: RULES */}
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
              <div className={styles.formGroup}><label>Mulai</label><input name="start_time" type="time" value={formData.start_time || ''} onChange={handleChange} className={styles.input} /></div>
              <div className={styles.formGroup}><label>Selesai</label><input name="end_time" type="time" value={formData.end_time || ''} onChange={handleChange} className={styles.input} /></div>
              <div className={styles.formGroup}><label>Slot (menit)</label><input name="slot_minutes" type="number" min={5} max={240} value={formData.slot_minutes || 30} onChange={handleChange} className={styles.input} /></div>
              <div className={styles.formGroup}>
                <label>Aktif</label>
                <select name="is_active" value={formData.is_active ?? 1} onChange={handleChange} className={styles.input}>
                  <option value={1}>Ya</option><option value={0}>Tidak</option>
                </select>
              </div>
            </>
          )}

          {/* MEET: ROOMS */}
          {modalType === 'bimeet_rooms' && (
            <>
              <div className={styles.formGroup}><label>Nama Room</label><input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} /></div>
              <div className={styles.formGroup}><label>Lantai</label><input name="floor" type="number" min={0} max={100} value={formData.floor ?? ''} onChange={handleChange} required className={styles.input} /></div>
              <div className={styles.formGroup}><label>Kapasitas</label><input name="capacity" type="number" min={1} max={10000} value={formData.capacity ?? ''} onChange={handleChange} required className={styles.input} /></div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <select name="status_id" value={formData.status_id ?? ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Status</option>
                  {(formData.statusOptions || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </>
          )}

          {/* DOCS: Unit Kerja */}
          {modalType === 'bimail_units' && (
            <>
              <div className={styles.formGroup}><label>Kode Unit</label><input name="code" value={formData.code || ''} onChange={handleChange} required maxLength={50} className={styles.input} /></div>
              <div className={styles.formGroup}><label>Nama Unit</label><input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={120} className={styles.input} /></div>
            </>
          )}

          {/* DOCS: Jenis Dokumen */}
          {modalType === 'bimail_jenis' && (
            <>
              <div className={styles.formGroup}><label>Kode</label><input name="kode" value={formData.kode || ''} onChange={handleChange} required maxLength={50} className={styles.input} /></div>
              <div className={styles.formGroup}><label>Nama Jenis</label><input name="nama" value={formData.nama || ''} onChange={handleChange} required maxLength={150} className={styles.input} /></div>
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
