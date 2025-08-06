import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ketersediaan.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers, FaCar, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export default function Ketersediaan() {
  const [activeTab, setActiveTab] = useState('driver');

  // Dummy data driver
  const driverData = [
    { id: 1, nim: '110001', nama: 'Fikri Ramadhan', phone: '081234567890' },
    { id: 2, nim: '110002', nama: 'Budi Santoso', phone: '082233445566' },
    { id: 3, nim: '110003', nama: 'Dewi Lestari', phone: '087812345678' },
  ];

  // Dummy data vehicle
  const vehicleData = [
    { id: 1, plat: 'N 1234 XX', tahun: '2022', type: 'SUV', status: 'Tersedia' },
    { id: 2, plat: 'B 5678 YY', tahun: '2021', type: 'MPV', status: 'Tidak Tersedia' },
    { id: 3, plat: 'D 4321 ZZ', tahun: '2023', type: 'Sedan', status: 'Tersedia' },
  ];

  // Dummy functions for actions
  function handleEdit(type, id) {
    alert('Edit ' + type + ' ID: ' + id);
  }
  function handleDelete(type, id) {
    if (window.confirm('Yakin ingin menghapus data ini?')) {
      alert('Data berhasil dihapus (' + type + ' ID: ' + id + ')');
    }
  }
  function handleCreate(type) {
    alert('Tambah data baru ' + (type === 'driver' ? 'Driver' : 'Vehicle'));
  }

  return (
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
              className={`${styles.tabBtn} ${activeTab === 'driver' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('driver')}
            >
              <FaUsers style={{ marginRight: 8 }} /> Driver
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'vehicle' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('vehicle')}
            >
              <FaCar style={{ marginRight: 8 }} /> Vehicle
            </button>
          </div>
          <div className={styles.tableWrapper}>
            {/* Tambah tombol Create/Add */}
            <div className={styles.addRow}>
              <button
                className={styles.btnCreate}
                onClick={() => handleCreate(activeTab)}
              >
                <FaPlus style={{ marginRight: 6 }} />
                Tambah {activeTab === 'driver' ? 'Driver' : 'Vehicle'}
              </button>
            </div>
            {/* Table driver */}
            {activeTab === 'driver' ? (
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
                  {driverData.map((d) => (
                    <tr key={d.id}>
                      <td>{d.id}</td>
                      <td>{d.nim}</td>
                      <td>{d.nama}</td>
                      <td>{d.phone}</td>
                      <td>
                        <button className={styles.btnAction} onClick={() => handleEdit('driver', d.id)} title="Edit">
                          <FaEdit />
                        </button>
                        <button className={styles.btnActionDelete} onClick={() => handleDelete('driver', d.id)} title="Delete">
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
                  {vehicleData.map((v) => (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td>{v.plat}</td>
                      <td>{v.tahun}</td>
                      <td>{v.type}</td>
                      <td className={v.status === 'Tersedia' ? styles.statusTersedia : styles.statusTidak}>
                        {v.status}
                      </td>
                      <td>
                        <button className={styles.btnAction} onClick={() => handleEdit('vehicle', v.id)} title="Edit">
                          <FaEdit />
                        </button>
                        <button className={styles.btnActionDelete} onClick={() => handleDelete('vehicle', v.id)} title="Delete">
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
    </div>
  );
}