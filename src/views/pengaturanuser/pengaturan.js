// pages/Pengaturan/pengaturan.js
import React, { useEffect, useState } from 'react';
import styles from './pengaturan.module.css';
import Image from 'next/image';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers, FaEdit, FaCarAlt, FaCheck, FaTimes, FaLock } from 'react-icons/fa';

export default function Pengaturan() {
  const [users, setUsers] = useState([]);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showEditPasswordPopup, setShowEditPasswordPopup] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '' });
  const [editPasswordForm, setEditPasswordForm] = useState({ id: '', password: '', adminPassword: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editPasswordErrors, setEditPasswordErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [admin, setAdmin] = useState(null);

  // Ambil data admin dari localStorage saat komponen mount
  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      setAdmin(JSON.parse(adminData));
    }
  }, []);

  // Fetch users dari API
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  function openEditPopup(user) {
    setSelectedUser(user);
    setEditForm({ id: user.id, name: user.name, email: user.email, phone: user.phone });
    setShowEditPopup(true);
    setEditErrors({});
  }

  function openEditPasswordPopup(user) {
    setSelectedUser(user);
    setEditPasswordForm({ id: user.id, password: '', adminPassword: '' });
    setEditPasswordErrors({});
    setShowEditPasswordPopup(true);
  }

  function handleEditChange(e) {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
    setEditErrors({ ...editErrors, [e.target.name]: undefined });
  }

  function handleEditPasswordChange(e) {
    setEditPasswordForm({ ...editPasswordForm, [e.target.name]: e.target.value });
    setEditPasswordErrors({ ...editPasswordErrors, [e.target.name]: undefined });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const err = {};
    if (!editForm.name) err.name = 'Nama wajib diisi';
    if (!editForm.phone) err.phone = 'No HP wajib diisi';
    setEditErrors(err);
    if (Object.keys(err).length > 0) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setShowEditPopup(false);
        setShowSuccess(true);
        setUsers(users =>
          users.map(u => (u.id === editForm.id ? { ...u, ...editForm } : u))
        );
        setTimeout(() => setShowSuccess(false), 1600);
      } else {
        alert('Update gagal');
      }
    } catch {
      alert('Update gagal');
    }
  }

  async function handleEditPasswordSubmit(e) {
    e.preventDefault();
    const err = {};
    if (!editPasswordForm.password) err.password = 'Password baru wajib diisi';
    if (editPasswordForm.password.length < 5) err.password = 'Minimal 5 karakter';
    if (!editPasswordForm.adminPassword) err.adminPassword = 'Password admin wajib diisi';
    setEditPasswordErrors(err);
    if (Object.keys(err).length > 0) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editPasswordForm.id,
          password: editPasswordForm.password,
          adminPassword: editPasswordForm.adminPassword,
          emailAdmin: admin?.email || null, // kirim email admin
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setShowEditPasswordPopup(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1600);
      } else {
        setEditPasswordErrors({ adminPassword: result?.error || 'Verifikasi admin gagal!' });
      }
    } catch {
      setEditPasswordErrors({ adminPassword: 'Update gagal' });
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin');
    setShowLogoutPopup(false);
    window.location.href = '/Login/hal-login';
  };

  return (
    <div className={styles.background}>
      {/* SIDEBAR */}
      <SidebarAdmin />

      <main className={styles.mainContent}>
        <div className={styles.header}>
          <div className={styles.logoBIWrapper}><Image src="/assets/BI-One-Blue.png" alt="BI-One" width={130} height={50} priority/></div>
        </div>
        <div className={styles.tableBox}>
          <div className={styles.tableTopRow}>
            <div className={styles.tableTitle}>PENGATURAN USER</div>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: 55 }}>ID</th>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Password</th>
                  <th style={{ width: 90 }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td style={{ fontWeight: 'bold' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                    <td>
                      <button className={styles.editBtn} onClick={() => openEditPasswordPopup(u)}>
                        <FaLock style={{marginRight: 4}}/> Ganti Password
                      </button>
                    </td>
                    <td>
                      <button className={styles.editBtn} onClick={() => openEditPopup(u)}>
                        <FaEdit style={{ marginRight: 5 }} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>Data user tidak ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* POPUP EDIT USER */}
      {showEditPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowEditPopup(false)}>
          <div className={styles.popupBox} onClick={e => e.stopPropagation()}>
            <div className={styles.popupTitle}>Edit User</div>
            <form className={styles.popupForm} onSubmit={handleEditSubmit} autoComplete="off">
              <label htmlFor="editName">Nama</label>
              <input id="editName" name="name" type="text" value={editForm.name} onChange={handleEditChange} autoFocus />
              {editErrors.name && <span className={styles.errorMsg}>{editErrors.name}</span>}
              <label htmlFor="editEmail">Email</label>
              <input id="editEmail" name="email" type="text" value={editForm.email} disabled />
              <label htmlFor="editPhone">Phone</label>
              <input id="editPhone" name="phone" type="text" value={editForm.phone} onChange={handleEditChange} />
              {editErrors.phone && <span className={styles.errorMsg}>{editErrors.phone}</span>}
              <div className={styles.popupActionRow}>
                <button className={styles.saveBtn} type="submit"><FaCheck /> Simpan</button>
                <button className={styles.cancelBtn} type="button" onClick={() => setShowEditPopup(false)}><FaTimes /> Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP EDIT PASSWORD */}
      {showEditPasswordPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowEditPasswordPopup(false)}>
          <div className={styles.popupBox} onClick={e => e.stopPropagation()}>
            <div className={styles.popupTitle}><FaLock style={{marginRight:7}}/> Ganti Password User</div>
            <form className={styles.popupForm} onSubmit={handleEditPasswordSubmit} autoComplete="off">
              <label>Password Baru</label>
              <input
                name="password"
                type="password"
                value={editPasswordForm.password}
                onChange={handleEditPasswordChange}
                autoFocus
              />
              {editPasswordErrors.password && <span className={styles.errorMsg}>{editPasswordErrors.password}</span>}
              <label>Password Admin</label>
              <input
                name="adminPassword"
                type="password"
                value={editPasswordForm.adminPassword}
                onChange={handleEditPasswordChange}
                placeholder="Masukkan password akun admin"
              />
              {editPasswordErrors.adminPassword && <span className={styles.errorMsg}>{editPasswordErrors.adminPassword}</span>}
              <div className={styles.popupActionRow}>
                <button className={styles.saveBtn} type="submit"><FaCheck /> Simpan</button>
                <button className={styles.cancelBtn} type="button" onClick={() => setShowEditPasswordPopup(false)}><FaTimes /> Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP LOGOUT */}
      {showLogoutPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowLogoutPopup(false)}>
          <div className={styles.popupBox} onClick={e => e.stopPropagation()}>
            <div className={styles.popupMsg}>Apakah Anda yakin ingin logout?</div>
            <div className={styles.popupActionRow}>
              <button className={styles.cancelBtn} onClick={() => setShowLogoutPopup(false)}><FaTimes /> Batal</button>
              <button className={styles.saveBtn} onClick={handleLogout}><FaSignOutAlt /> Ya, Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Success */}
      {showSuccess && (
        <div className={styles.toastSuccess}><FaCheck style={{marginRight:6}}/>Update berhasil!</div>
      )}
    </div>
  );
}
