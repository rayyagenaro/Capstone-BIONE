import React, { useEffect, useState } from 'react';
import styles from './pengaturan.module.css';
import Image from 'next/image';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Router from 'next/router';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers, FaEdit, FaCarAlt, FaCheck, FaTimes, FaLock } from 'react-icons/fa';
import Pagination from '@/components/Pagination/Pagination'; // <-- 1. IMPORT KOMPONEN PAGINATION

export default function Pengaturan() {
  // --- STATE LAMA (TETAP DIPAKAI) ---
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

  // --- 2. STATE BARU UNTUK PAGINATION ---
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10 item per halaman

  // Ambil data admin dari localStorage saat komponen mount
  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      setAdmin(JSON.parse(adminData));
    }
  }, []);

  // --- 3. useEffect DIUBAH UNTUK MENGAMBIL DATA PER HALAMAN ---
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Kirim parameter page dan limit ke API
        const res = await fetch(`/api/users?page=${pagination.currentPage}&limit=${itemsPerPage}`);
        const result = await res.json();
        
        if (res.ok) {
          setUsers(result.data || []);
          setPagination(result.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error("Gagal mengambil data user:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [pagination.currentPage, itemsPerPage]); // Akan fetch ulang jika halaman atau itemsPerPage berubah

  // --- FUNGSI POPUP (TIDAK ADA PERUBAHAN) ---
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

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' }); // hapus cookie `token`
    } catch (e) {
      // optional: log error
    } finally {
      router.replace('/Signin/hal-signAdmin'); // balik ke login admin
    }
  };
  
  // --- 4. FUNGSI HANDLER BARU UNTUK PAGINATION ---
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset ke halaman 1
  };

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
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
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>Memuat data...</td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((u) => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>Data user tidak ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* --- 5. UI PAGINATION DITAMBAHKAN DI SINI --- */}
          {pagination.totalItems > 0 && (
            <>
              <div className={styles.paginationControls}>
                <span className={styles.resultsText}>
                  Results: {((pagination.currentPage - 1) * itemsPerPage) + 1} - {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems}
                </span>
                <select value={itemsPerPage} onChange={handleItemsPerPageChange} className={styles.itemsPerPageDropdown}>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
              
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}

        </div>
      </main>
      
      {/* --- SEMUA POPUP TETAP SAMA --- */}
      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />

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

      {showEditPasswordPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowEditPasswordPopup(false)}>
          <div className={styles.popupBox} onClick={e => e.stopPropagation()}>
            <div className={styles.popupTitle}><FaLock style={{marginRight:7}}/> Ganti Password User</div>
            <form className={styles.popupForm} onSubmit={handleEditPasswordSubmit} autoComplete="off">
              <label>Password Baru</label>
              <input name="password" type="password" value={editPasswordForm.password} onChange={handleEditPasswordChange} autoFocus />
              {editPasswordErrors.password && <span className={styles.errorMsg}>{editPasswordErrors.password}</span>}
              <label>Password Admin</label>
              <input name="adminPassword" type="password" value={editPasswordForm.adminPassword} onChange={handleEditPasswordChange} placeholder="Masukkan password akun admin" />
              {editPasswordErrors.adminPassword && <span className={styles.errorMsg}>{editPasswordErrors.adminPassword}</span>}
              <div className={styles.popupActionRow}>
                <button className={styles.saveBtn} type="submit"><FaCheck /> Simpan</button>
                <button className={styles.cancelBtn} type="button" onClick={() => setShowEditPasswordPopup(false)}><FaTimes /> Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className={styles.toastSuccess}><FaCheck style={{marginRight:6}}/>Update berhasil!</div>
      )}
    </div>
  );
}