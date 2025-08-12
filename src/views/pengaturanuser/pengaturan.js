import React, { useEffect, useMemo, useState } from 'react';
import styles from './pengaturan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Router from 'next/router';
import { FaEdit, FaCheck, FaTimes, FaLock } from 'react-icons/fa';
import Pagination from '@/components/Pagination/Pagination';

// POPUP: Reject & Verify
import UserVerificationRejectPopup from '@/components/rejectVerification/RejectVerification';
import UserVerificationApprovePopup from '@/components/verifyVerification/VerifyVerification';

const TABS = [
  { key: 'verified',  label: 'Verified',  statusId: 2 },
  { key: 'pending',   label: 'Pending',   statusId: 1 },
  { key: 'rejected',  label: 'Rejected',  statusId: 3 },
];

const STATUS_PILL = {
  1: { text: 'Pending',   className: styles.pillPending },
  2: { text: 'Verified',  className: styles.pillVerified },
  3: { text: 'Rejected',  className: styles.pillRejected },
};

// util kecil untuk wa.me
const to62 = (p) => {
  if (!p) return '';
  let s = String(p).replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('62')) return s;
  if (s.startsWith('0')) return '62' + s.slice(1);
  return '62' + s;
};
const waLink = (phone, text) =>
  `https://wa.me/${to62(phone)}?text=${encodeURIComponent(text || '')}`;

export default function Pengaturan() {
  const [activeTab, setActiveTab] = useState('verified');

  // data & paging
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // admin & popups
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showEditPasswordPopup, setShowEditPasswordPopup] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // edit forms
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '' });
  const [editPasswordForm, setEditPasswordForm] = useState({ id: '', password: '', adminPassword: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editPasswordErrors, setEditPasswordErrors] = useState({});
  const [admin, setAdmin] = useState(null);

  // verification popups
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);

  // ==== Reason (Rejected) modal ====
  const [showReasonPopup, setShowReasonPopup] = useState(false);
  const [reasonUser, setReasonUser] = useState(null); // {name, nip, email, phone, rejection_reason}
  const openReason = (u) => { setReasonUser(u); setShowReasonPopup(true); };
  const closeReason = () => { setShowReasonPopup(false); setReasonUser(null); };

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) setAdmin(JSON.parse(adminData));
  }, []);

  // Fetch users berdasarkan tab, page, limit
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/users?page=${pagination.currentPage}&limit=${itemsPerPage}&verification=${activeTab}`
        );
        const result = await res.json();
        if (res.ok) {
          setUsers(result.data || []);
          setPagination(result.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
        } else {
          setUsers([]);
        }
      } catch (e) {
        console.error('Gagal ambil users:', e);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [activeTab, pagination.currentPage, itemsPerPage]);

  const handlePageChange = (page) => setPagination((p) => ({ ...p, currentPage: page }));
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setPagination((p) => ({ ...p, currentPage: 1 }));
  };

  // ===== Edit User =====
  function openEditPopup(user) {
    setSelectedUser(user);
    setEditForm({ id: user.id, name: user.name, email: user.email, phone: user.phone });
    setEditErrors({});
    setShowEditPopup(true);
  }
  function handleEditChange(e) {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
    setEditErrors({ ...editErrors, [e.target.name]: undefined });
  }
  async function handleEditSubmit(e) {
    e.preventDefault();
    const err = {};
    if (!editForm.name) err.name = 'Nama wajib diisi';
    if (!editForm.phone) err.phone = 'No HP wajib diisi';
    setEditErrors(err);
    if (Object.keys(err).length) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setShowEditPopup(false);
        setUsers((prev) => prev.map((u) => (u.id === editForm.id ? { ...u, ...editForm } : u)));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1400);
      } else {
        alert('Update gagal');
      }
    } catch {
      alert('Update gagal');
    }
  }

  // ===== Change Password =====
  function openEditPasswordPopup(user) {
    setSelectedUser(user);
    setEditPasswordForm({ id: user.id, password: '', adminPassword: '' });
    setEditPasswordErrors({});
    setShowEditPasswordPopup(true);
  }
  function handleEditPasswordChange(e) {
    setEditPasswordForm({ ...editPasswordForm, [e.target.name]: e.target.value });
    setEditPasswordErrors({ ...editPasswordErrors, [e.target.name]: undefined });
  }
  async function handleEditPasswordSubmit(e) {
    e.preventDefault();
    const err = {};
    if (!editPasswordForm.password) err.password = 'Password baru wajib diisi';
    if ((editPasswordForm.password || '').length < 5) err.password = 'Minimal 5 karakter';
    if (!editPasswordForm.adminPassword) err.adminPassword = 'Password admin wajib diisi';
    setEditPasswordErrors(err);
    if (Object.keys(err).length) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editPasswordForm.id,
          password: editPasswordForm.password,
          adminPassword: editPasswordForm.adminPassword,
          emailAdmin: admin?.email || null,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setShowEditPasswordPopup(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1400);
      } else {
        setEditPasswordErrors({ adminPassword: result?.error || 'Verifikasi admin gagal!' });
      }
    } catch {
      setEditPasswordErrors({ adminPassword: 'Update gagal' });
    }
  }

  // ===== Verify / Reject Handlers =====
  function openVerifyUser(user) {
    setSelectedUser(user);
    setShowVerifyPopup(true);
  }
  function openRejectUser(user) {
    setSelectedUser(user);
    setShowRejectPopup(true);
  }

  async function submitVerify(messageText, shouldOpenWA) {
    if (!selectedUser) return;
    try {
      setVerifyLoading(true);
      const res = await fetch('/api/user-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, action: 'verify' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal verifikasi user');

      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));

      if (shouldOpenWA) {
        const link = waLink(selectedUser.phone, messageText);
        window.open(link, '_blank', 'noopener');
      }

      setShowVerifyPopup(false);
      setSelectedUser(null);
      if (users.length === 1) setPagination((p) => ({ ...p, currentPage: 1 }));
    } catch (e) {
      alert(e.message);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function submitReject(reasonText, shouldOpenWA) {
    if (!selectedUser) return;
    try {
      setRejectLoading(true);
      const res = await fetch('/api/user-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, action: 'reject', reason: reasonText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menolak user');

      if (shouldOpenWA) {
        const text = `Halo ${selectedUser?.name || ''},

Pengajuan akun BI-ONE *DITOLAK* ❌

Alasan:
${reasonText}

Silakan melakukan pendaftaran ulang/konfirmasi data. Terima kasih.`;
        const link = waLink(selectedUser.phone, text);
        window.open(link, '_blank', 'noopener');
      }

      setShowRejectPopup(false);
      setSelectedUser(null);
      setUsers((prev) => prev.filter((u) => u.id !== json.id));
      if (users.length === 1) setPagination((p) => ({ ...p, currentPage: 1 }));
    } catch (e) {
      alert(e.message);
    } finally {
      setRejectLoading(false);
    }
  }

  // ===== Logout =====
  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); }
    finally { Router.replace('/Signin/hal-signAdmin'); }
  };

  const pillOf = (id) => STATUS_PILL[id] || STATUS_PILL[1];
  const activeStatusId = useMemo(() => TABS.find((t) => t.key === activeTab)?.statusId, [activeTab]);

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.tableBox}>
          <div className={styles.tableTopRow}>
            <div className={styles.tableTitle}>PENGATURAN USER</div>
          </div>

          {/* Tabs */}
          <div className={styles.tabsRow}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.tabBtn} ${activeTab === t.key ? styles.tabActive : ''}`}
                onClick={() => { setActiveTab(t.key); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: 55 }}>ID</th>
                  <th>Nama</th>
                  <th>NIP</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th style={{ width: 140 }}>Status</th>
                  {activeStatusId === 2 && <th>Password</th>}
                  <th style={{ width: activeStatusId === 1 ? 260 : 180 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={activeStatusId === 2 ? 8 : 7} style={{ textAlign: 'center', color: '#888' }}>
                      Memuat data...
                    </td>
                  </tr>
                ) : users.length ? (
                  users.map((u) => {
                    const pill = pillOf(u.verification_status_id);
                    return (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td style={{ fontWeight: 'bold' }}>{u.name}</td>
                        <td>{u.nip || '-'}</td>
                        <td>{u.phone || '-'}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`${styles.statusPill} ${pill.className}`}>{pill.text}</span>
                          {/* tidak ada tulisan alasan di sini lagi */}
                        </td>

                        {activeStatusId === 2 && (
                          <td>
                            <button className={styles.editBtn} onClick={() => openEditPasswordPopup(u)}>
                              <FaLock style={{ marginRight: 4 }} /> Ganti Password
                            </button>
                          </td>
                        )}

                        <td className={styles.actionCell}>
                          {/* Edit */}
                          <button className={styles.editGhostBtn} onClick={() => openEditPopup(u)}>
                            <FaEdit style={{ marginRight: 6 }} /> Edit User
                          </button>

                          {/* Pending: Verifikasi / Tolak */}
                          {activeStatusId === 1 && (
                            <div className={styles.splitGroup}>
                              <button
                                className={`${styles.splitBtn} ${styles.approve}`}
                                onClick={() => openVerifyUser(u)}
                                title="Verifikasi user"
                              >
                                <FaCheck style={{ marginRight: 6 }} /> Verifikasi
                              </button>
                              <button
                                className={`${styles.splitBtn} ${styles.reject}`}
                                onClick={() => openRejectUser(u)}
                                title="Tolak verifikasi"
                              >
                                <FaTimes style={{ marginRight: 6 }} /> Tolak
                              </button>
                            </div>
                          )}

                          {/* Rejected: Lihat Alasan */}
                          {u.verification_status_id === 3 && u.rejection_reason && (
                            <button
                              type="button"
                              className={styles.reasonBtn || styles.editBtn}
                              onClick={() => openReason(u)}
                              title="Lihat alasan penolakan"
                              style={{ marginLeft: 8 }}
                            >
                              Lihat Alasan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={activeStatusId === 2 ? 8 : 7} style={{ textAlign: 'center', color: '#888' }}>
                      {activeTab === 'verified'
                        ? 'Belum ada user terverifikasi.'
                        : activeTab === 'pending'
                        ? 'Tidak ada user pending.'
                        : 'Tidak ada user ditolak.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalItems > 0 && (
            <>
              <div className={styles.paginationControls}>
                <span className={styles.resultsText}>
                  Results: {((pagination.currentPage - 1) * itemsPerPage) + 1} - {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems}
                </span>
                <div>
                  <label htmlFor="itemsPerPage" className={styles.label}>Items per page:</label>
                  <select id="itemsPerPage" value={itemsPerPage} onChange={handleItemsPerPageChange} className={styles.itemsPerPageDropdown}>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
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

      {/* Logout */}
      <LogoutPopup open={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onLogout={handleLogout} />

      {/* Edit Popup */}
      {showEditPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowEditPopup(false)}>
          <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
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

      {/* Change Password Popup */}
      {showEditPasswordPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowEditPasswordPopup(false)}>
          <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTitle}><FaLock style={{ marginRight: 7 }} /> Ganti Password User</div>
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

      {/* Reject Verification Popup */}
      <UserVerificationRejectPopup
        show={showRejectPopup}
        loading={rejectLoading}
        onClose={() => setShowRejectPopup(false)}
        onSubmit={submitReject}            // (reasonText[, shouldOpenWA]) => void
      />

      {/* Verify (Approve) Verification Popup */}
      <UserVerificationApprovePopup
        show={showVerifyPopup}
        loading={verifyLoading}
        onClose={() => setShowVerifyPopup(false)}
        onSubmit={submitVerify}            // (messageText, shouldOpenWA) => void
        user={selectedUser || undefined}   // untuk prefill pesan
      />

      {/* Reason (Rejected) Popup */}
      {showReasonPopup && reasonUser && (
        <div className={styles.popupOverlay} onClick={closeReason}>
          <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTitle}>Alasan Penolakan</div>

            <div style={{marginBottom: 12, color: '#41507a', fontSize: 14}}>
              <div><strong>Nama:</strong> {reasonUser.name || '-'}</div>
              <div><strong>NIP:</strong> {reasonUser.nip || '-'}</div>
              <div><strong>Email:</strong> {reasonUser.email || '-'}</div>
              <div><strong>Phone:</strong> {reasonUser.phone || '-'}</div>
            </div>

            <label className={styles.label} style={{marginBottom: 6}}>Alasan</label>
            <div
              style={{
                background:'#fff8f8', border:'1.2px solid #e4b9b9', borderRadius:10,
                padding:'12px 14px', color:'#7a1c1c', fontSize:15, lineHeight:1.45,
                whiteSpace:'pre-wrap'
              }}
            >
              {reasonUser.rejection_reason || '-'}
            </div>

            <div className={styles.popupActionRow}>
              <button className={styles.cancelBtn} type="button" onClick={closeReason}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className={styles.toastSuccess}>
          <FaCheck style={{ marginRight: 6 }} />
          Update berhasil!
        </div>
      )}
    </div>
  );
}
