import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ketersediaan.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers, FaCar, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

// Mapping untuk menampilkan label pada tabel dan form select
const VEHICLE_STATUS_MAP = {
  1: 'Available',
  2: 'Unavailable',
  3: 'Maintenance'
};
const VEHICLE_TYPE_MAP = {
  1: 'Mobil SUV',
  2: 'Mobil MPV',
  3: 'Minibus',
  4: 'Double Cabin',
  5: 'Truck',
  6: 'Kaskeliling',
  7: 'Edukator'
};
const VEHICLE_TYPE_OPTIONS = [
  { id: 1, name: 'Mobil SUV' },
  { id: 2, name: 'Mobil MPV' },
  { id: 3, name: 'Minibus' },
  { id: 4, name: 'Double Cabin' },
  { id: 5, name: 'Truck' },
  { id: 6, name: 'Kaskeliling' },
  { id: 7, name: 'Edukator' }
];
const VEHICLE_STATUS_OPTIONS = [
  { id: 1, name: 'Available' },
  { id: 2, name: 'Unavailable' },
  { id: 3, name: 'Maintenance' }
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
                <label>NIM</label>
                <input
                  name="nim"
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

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleOpenModal = (type, data = null) => {
    setModalType(type);
    setEditMode(!!data);
    setFormData(
      data
        ? { ...data }
        : type === 'drivers'
        ? initialDriver
        : initialVehicle
    );
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData(modalType === 'drivers' ? initialDriver : initialVehicle);
    setEditMode(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const type = modalType;
    const url = '/api/ketersediaanAdmin';
    const method = editMode ? 'PUT' : 'POST';
    const body = JSON.stringify({ ...formData, type });

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
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

  return (
    <>
      <div className={styles.background}>
        {/* SIDEBAR */}
        <aside className={styles.sidebar}>
          <div className={styles.logoSidebar}>
            <Image
              src="/assets/BI_Logo.png"
              alt="Bank Indonesia"
              width={110}
              height={36}
              className={styles.logoDone}
              priority
            />
          </div>
          <nav className={styles.navMenu}>
            <ul>
              <li>
                <FaHome className={styles.menuIcon} />
                <Link href='/HalamanUtama/hal-utamaAdmin'>Beranda</Link>
              </li>
              <li>
                <FaClipboardList className={styles.menuIcon} />
                <Link href='/Persetujuan/hal-persetujuan'>Persetujuan Booking</Link>
              </li>
              <li className={styles.active}>
                <FaUsers className={styles.menuIcon} />
                <Link href='/Ketersediaan/hal-ketersediaan'>Ketersediaan</Link>
              </li>
              <li>
                <FaCog className={styles.menuIcon} />
                <Link href='/Pengaturan/hal-pengaturan'>Pengaturan</Link>
              </li>
            </ul>
          </nav>
          <div className={styles.logout}>
            <Link href="/Login/hal-login" passHref legacyBehavior>
              <FaSignOutAlt className={styles.logoutIcon} />
            </Link>
            Logout
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className={styles.mainContent}>
          {/* HEADER/NAVBAR */}
          <div className={styles.header}>
            <div className={styles.logoBIWrapper}>
              <Image
                src="/assets/D'ONE.png"
                alt="D'ONE"
                width={170}
                height={34}
                className={styles.logoBI}
                priority
              />
            </div>
          </div>

          {/* CARD UTAMA */}
          <div className={styles.cardContainer}>
            <div className={styles.tabButtons}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'drivers' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('drivers')}
              >
                <FaUsers style={{ marginRight: 8 }} /> Driver
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'vehicles' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('vehicles')}
              >
                <FaCar style={{ marginRight: 8 }} /> Vehicle
              </button>
            </div>
            <div className={styles.tableWrapper}>
              {/* Tambah tombol Create/Add */}
              <div className={styles.addRow}>
                <button
                  className={styles.btnCreate}
                  onClick={() => handleOpenModal(activeTab)}
                >
                  <FaPlus style={{ marginRight: 6 }} />
                  Tambah {activeTab === 'drivers' ? 'Driver' : 'Vehicle'}
                </button>
              </div>
              {/* Tabel Driver */}
              {loading ? (
                <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
              ) : activeTab === 'drivers' ? (
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>NIM</th>
                      <th>Nama</th>
                      <th>Phone</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
                    )}
                    {drivers.map((d) => (
                      <tr key={d.id}>
                        <td>{d.id}</td>
                        <td>{d.nim}</td>
                        <td>{d.name}</td>
                        <td>{d.phone}</td>
                        <td>
                          <button className={styles.btnAction} onClick={() => handleOpenModal('drivers', d)} title="Edit">
                            <FaEdit />
                          </button>
                          <button className={styles.btnActionDelete} onClick={() => handleDelete('drivers', d.id)} title="Delete">
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Tabel Vehicle
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
                    {vehicles.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
                    )}
                    {vehicles.map((v) => (
                      <tr key={v.id}>
                        <td>{v.id}</td>
                        <td>{v.plat_nomor}</td>
                        <td>{v.tahun}</td>
                        <td>{VEHICLE_TYPE_MAP[v.vehicle_type_id] || v.vehicle_type_id}</td>
                        <td>{VEHICLE_STATUS_MAP[v.vehicle_status_id] || v.vehicle_status_id}</td>
                        <td>
                          <button className={styles.btnAction} onClick={() => handleOpenModal('vehicles', v)} title="Edit">
                            <FaEdit />
                          </button>
                          <button className={styles.btnActionDelete} onClick={() => handleDelete('vehicles', v.id)} title="Delete">
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
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