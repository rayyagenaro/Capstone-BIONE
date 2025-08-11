// src/pages/Ketersediaan/hal-ketersediaan.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ketersediaan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { FaUsers, FaCar, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

// Mapping untuk menampilkan label pada tabel dan form select
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

// Modal komponen terpisah
function Modal({ editMode, modalType, formData, handleChange, handleCloseModal, handleSubmit, styles }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>
          {editMode
            ? `Edit ${modalType === 'drivers' ? 'Driver' : 'Vehicle'}`
            : `Tambah ${modalType === 'drivers' ? 'Driver' : 'Vehicle'}`}
        </h3>

        <form onSubmit={handleSubmit} autoComplete="off">
          {modalType === 'drivers' ? (
            <>
              <div className={styles.formGroup}>
                <label>NIP</label>
                <input
                  name="nip"
                  value={formData.nim}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  className={styles.input}
                  autoComplete="off"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Nama</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className={styles.input}
                  autoComplete="off"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  maxLength={20}
                  className={styles.input}
                  autoComplete="off"
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label>Plat Nomor</label>
                <input
                  name="plat_nomor"
                  value={formData.plat_nomor}
                  onChange={handleChange}
                  required
                  maxLength={20}
                  className={styles.input}
                  autoComplete="off"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tahun</label>
                <input
                  name="tahun"
                  value={formData.tahun}
                  onChange={handleChange}
                  required
                  type="number"
                  maxLength={4}
                  className={styles.input}
                  autoComplete="off"
                  min={1990}
                  max={2099}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Vehicle Type</label>
                <select
                  name="vehicle_type_id"
                  value={formData.vehicle_type_id}
                  onChange={handleChange}
                  required
                  className={styles.input}
                >
                  <option value="">Pilih Vehicle Type</option>
                  {VEHICLE_TYPE_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Vehicle Status</label>
                <select
                  name="vehicle_status_id"
                  value={formData.vehicle_status_id}
                  onChange={handleChange}
                  required
                  className={styles.input}
                >
                  <option value="">Pilih Vehicle Status</option>
                  {VEHICLE_STATUS_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className={styles.modalBtnGroup}>
            <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>
              Batal
            </button>
            <button type="submit" className={styles.btnSave}>
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const initialDriver = { id: null, nim: '', name: '', phone: '' };
const initialVehicle = { id: null, plat_nomor: '', tahun: '', vehicle_type_id: '', vehicle_status_id: '' };

export default function Ketersediaan() {
  const [activeTab, setActiveTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [modalType, setModalType] = useState('drivers');
  const [formData, setFormData] = useState(initialDriver);

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' }); // hapus cookie `token`
    } catch (e) {
      // optional: log error
    } finally {
      router.replace('/Signin/hal-signAdmin'); // balik ke login admin
    }
  };

  // ---------- PAGINATION STATE (per tab) ----------
  const [page, setPage] = useState({ drivers: 1, vehicles: 1 });
  const [perPage, setPerPage] = useState({ drivers: 10, vehicles: 10 });
  const tableTopRef = useRef(null);

  // Fetch
  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        fetch('/api/ketersediaanAdmin?type=drivers'),
        fetch('/api/ketersediaanAdmin?type=vehicles'),
      ]);
      const [driversJson, vehiclesJson] = await Promise.all([driversRes.json(), vehiclesRes.json()]);
      setDrivers(driversJson.data || []);
      setVehicles(vehiclesJson.data || []);
    } catch (err) {
      alert('Gagal load data!');
    }
    setLoading(false);
  };

  // Open/close modal
  const handleOpenModal = (type, data = null) => {
    setModalType(type);
    setEditMode(!!data);
    setFormData(data ? { ...data } : (type === 'drivers' ? initialDriver : initialVehicle));
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData(modalType === 'drivers' ? initialDriver : initialVehicle);
    setEditMode(false);
  };

  // Form change & submit
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const type = modalType;
    const url = '/api/ketersediaanAdmin';
    const method = editMode ? 'PUT' : 'POST';
    const body = JSON.stringify({ ...formData, type });

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
      const result = await res.json();
      if (result.success) {
        fetchData();
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
        fetchData();
      } else {
        alert(result.message || 'Gagal menghapus!');
      }
    } catch {
      alert('Gagal menghubungi server!');
    }
  };

  // ---------- DATA AKTIF + PAGINATION ----------
  const activeList = activeTab === 'drivers' ? drivers : vehicles;
  const currentPage = page[activeTab];
  const itemsPerPage = perPage[activeTab];

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(activeList.length / itemsPerPage || 1));
  }, [activeList.length, itemsPerPage]);

  // Koreksi page jika ukuran data berubah
  useEffect(() => {
    if (currentPage > totalPages) {
      setPage((p) => ({ ...p, [activeTab]: 1 }));
    }
  }, [totalPages, currentPage, activeTab]);

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageRows = useMemo(() => activeList.slice(startIdx, endIdx), [activeList, startIdx, endIdx]);

  const onPageChange = useCallback((p) => {
    if (p < 1 || p > totalPages) return;
    setPage((prev) => ({ ...prev, [activeTab]: p }));
    tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeTab, totalPages]);

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setPerPage((prev) => ({ ...prev, [activeTab]: val }));
    setPage((prev) => ({ ...prev, [activeTab]: 1 }));
    tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resultsFrom = activeList.length ? startIdx + 1 : 0;
  const resultsTo = Math.min(endIdx, activeList.length);

  return (
    <>
      <div className={styles.background}>
        {/* SIDEBAR */}
        <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />

        {/* MAIN CONTENT */}
        <main className={styles.mainContent}>
          {/* CARD UTAMA */}
          <div className={styles.cardContainer}>
            <div className={styles.tabButtons}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'drivers' ? styles.tabBtnActive : ''}`}
                onClick={() => { setActiveTab('drivers'); tableTopRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              >
                <FaUsers style={{ marginRight: 8 }} /> Driver
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'vehicles' ? styles.tabBtnActive : ''}`}
                onClick={() => { setActiveTab('vehicles'); tableTopRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              >
                <FaCar style={{ marginRight: 8 }} /> Vehicle
              </button>
            </div>

            <div className={styles.tableWrapper}>
              {/* anchor untuk auto-scroll */}
              <div ref={tableTopRef} />

              {/* Tambah tombol Create/Add */}
              <div className={styles.addRow}>
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={() => handleOpenModal(activeTab)}
                >
                  <FaPlus style={{ marginRight: 6 }} />
                  Tambah {activeTab === 'drivers' ? 'Driver' : 'Vehicle'}
                </button>
              </div>

              {/* Tabel */}
              {loading ? (
                <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
              ) : activeTab === 'drivers' ? (
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
                          <button type="button" className={styles.btnAction} onClick={() => handleOpenModal('drivers', d)} title="Edit">
                            <FaEdit />
                          </button>
                          <button type="button" className={styles.btnActionDelete} onClick={() => handleDelete('drivers', d.id)} title="Delete">
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                          <button type="button" className={styles.btnAction} onClick={() => handleOpenModal('vehicles', v)} title="Edit">
                            <FaEdit />
                          </button>
                          <button type="button" className={styles.btnActionDelete} onClick={() => handleDelete('vehicles', v.id)} title="Delete">
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Controls + Pagination */}
              {!loading && activeList.length > 0 && (
                <div className={styles.paginateArea}>
                  <div className={styles.paginateControls}>
                    <div className={styles.resultsText}>
                      Menampilkan {resultsFrom}-{resultsTo} dari {activeList.length} data
                    </div>
                    <div>
                      <label htmlFor="perPage" className={styles.label}>Items per page:</label>
                      <select
                        id="perPage"
                        className={styles.itemsPerPageDropdown}
                        value={itemsPerPage}
                        onChange={onChangeItemsPerPage}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                  />
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
