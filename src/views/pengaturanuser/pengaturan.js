import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styles from './pengaturan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { useRouter } from 'next/router';
import { FaEdit, FaCheck, FaTimes, FaLock, FaUserShield } from 'react-icons/fa';
import Pagination from '@/components/Pagination/Pagination';

// POPUP: Reject & Verify (dipakai utk USERS)
import UserVerificationRejectPopup from '@/components/rejectVerification/RejectVerification';
import UserVerificationApprovePopup from '@/components/verifyVerification/VerifyVerification';

const TABS = [
  { key: 'verified', label: 'Verified', statusId: 2 },
  { key: 'pending', label: 'Pending', statusId: 1 },
  { key: 'rejected', label: 'Rejected', statusId: 3 },
];

const STATUS_PILL = {
  1: { text: 'Pending', className: styles.pillPending },
  2: { text: 'Verified', className: styles.pillVerified },
  3: { text: 'Rejected', className: styles.pillRejected },
};

// ===== Utils: normalisasi nomor WA =====
const to62 = (p) => {
  if (!p) return '';
  let s = String(p).replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('62')) return s;
  if (s.startsWith('0')) return '62' + s.slice(1);
  return s.match(/^\d+$/) ? '62' + s : '';
};
const waLink = (phone, text) => {
  const n = to62(phone);
  if (!n) return '';
  const t = text ? encodeURIComponent(text) : '';
  return `https://wa.me/${n}${t ? `?text=${t}` : ''}`;
};

export default function Pengaturan() {
  const router = useRouter();

  // ==== NEW: tipe data yang dikelola (users | admins) ====
  const [entityType, setEntityType] = useState('users'); // 'users' | 'admins'

  // tab status
  const [activeTab, setActiveTab] = useState('verified');

  // data & paging
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // admin & popups
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  // ==== USER edit state (tetap) ====
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showEditPasswordPopup, setShowEditPasswordPopup] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '' });
  const [editPasswordForm, setEditPasswordForm] = useState({ id: '', password: '', adminPassword: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editPasswordErrors, setEditPasswordErrors] = useState({});
  const [admin, setAdmin] = useState(null);

  // verification popups (USER)
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);

  // Reason (Rejected) popup (dipakai di kedua tipe)
  const [showReasonPopup, setShowReasonPopup] = useState(false);
  const [reasonRow, setReasonRow] = useState(null);
  const openReason = (u) => { setReasonRow(u); setShowReasonPopup(true); };
  const closeReason = () => { setShowReasonPopup(false); setReasonRow(null); };

  // ===== admin info dari localStorage (client-only) =====
  useEffect(() => {
    try {
      const adminData = typeof window !== 'undefined' ? localStorage.getItem('admin') : null;
      if (adminData) setAdmin(JSON.parse(adminData));
    } catch { /* ignore */ }
  }, []);

  const activeStatusId = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.statusId,
    [activeTab]
  );

  const baseUrl = useMemo(
    () => (entityType === 'users' ? '/api/users' : '/api/admins'),
    [entityType]
  );

  const query = useMemo(
    () => `?page=${pagination.currentPage}&limit=${itemsPerPage}&verification=${activeTab}`,
    [pagination.currentPage, itemsPerPage, activeTab]
  );

  // ===== Fetch rows dengan AbortController & error state =====
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg('');
    (async () => {
      try {
        const res = await fetch(`${baseUrl}${query}`, { signal: ac.signal, cache: 'no-store' });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(result?.error || 'Gagal mengambil data');
        }
        setRows(Array.isArray(result.data) ? result.data : []);
        setPagination(result.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
      } catch (e) {
        if (e.name !== 'AbortError') {
          setRows([]);
          setErrorMsg(e.message || 'Terjadi kesalahan jaringan');
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [baseUrl, query]);

  const handlePageChange = (page) => setPagination((p) => ({ ...p, currentPage: page }));
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setPagination((p) => ({ ...p, currentPage: 1 }));
  };

  // ===== USER EDIT =====
  function openEditPopup(user) {
    setSelectedUser(user);
    setEditForm({ id: user.id, name: user.name || '', email: user.email || '', phone: user.phone || '' });
    setEditErrors({});
    setShowEditPopup(true);
  }
  function handleEditChange(e) {
    setEditForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setEditErrors((errs) => ({ ...errs, [e.target.name]: undefined }));
  }
  async function handleEditSubmit(e) {
    e.preventDefault();
    const err = {};
    if (!editForm.name?.trim()) err.name = 'Nama wajib diisi';
    if (!editForm.phone?.trim()) err.phone = 'No HP wajib diisi';
    setEditErrors(err);
    if (Object.keys(err).length) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Update gagal');

      setShowEditPopup(false);
      setRows((prev) => prev.map((u) => (u.id === editForm.id ? { ...u, ...editForm } : u)));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1400);
    } catch (e) {
      alert(e.message || 'Update gagal');
    }
  }

  // ===== USER Change Password =====
  function openEditPasswordPopup(user) {
    setSelectedUser(user);
    setEditPasswordForm({ id: user.id, password: '', adminPassword: '' });
    setEditPasswordErrors({});
    setShowEditPasswordPopup(true);
  }
  function handleEditPasswordChange(e) {
    setEditPasswordForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setEditPasswordErrors((errs) => ({ ...errs, [e.target.name]: undefined }));
  }
  async function handleEditPasswordSubmit(e) {
    e.preventDefault();
    const err = {};
    if (!editPasswordForm.password) err.password = 'Password baru wajib diisi';
    else if ((editPasswordForm.password || '').length < 5) err.password = 'Minimal 5 karakter';
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
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result?.error || 'Verifikasi admin gagal!');
      }
      setShowEditPasswordPopup(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1400);
    } catch (e) {
      setEditPasswordErrors((errs) => ({ ...errs, adminPassword: e.message || 'Update gagal' }));
    }
  }

  // ===== USER Verify / Reject =====
  function openVerifyUser(user) { setSelectedUser(user); setShowVerifyPopup(true); }
  function openRejectUser(user) { setSelectedUser(user); setShowRejectPopup(true); }

  const afterRowRemoved = useCallback(() => {
    // kalau yang tersisa di halaman ini sisa 0, balik ke page 1 biar gak mentok
    setPagination((p) => {
      const next = { ...p };
      // biarkan API yang hitung ulang totalPages saat fetch berikutnya
      if (rows.length <= 1 && p.currentPage > 1) next.currentPage = 1;
      return next;
    });
  }, [rows.length]);

  async function submitVerifyUser(messageText, shouldOpenWA) {
    if (!selectedUser) return;
    try {
      setVerifyLoading(true);
      const res = await fetch('/api/user-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, action: 'verify' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Gagal verifikasi user');

      if (shouldOpenWA && selectedUser.phone) {
        const link = waLink(selectedUser.phone, messageText || '');
        if (link) window.open(link, '_blank', 'noopener');
      }

      // hapus baris secara aman
      setRows((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setSelectedUser(null);
      setShowVerifyPopup(false);
      afterRowRemoved();
    } catch (e) {
      alert(e.message || 'Gagal verifikasi user');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function submitRejectUser(reasonText, shouldOpenWA) {
    if (!selectedUser) return;
    const reason = (reasonText || '').trim();
    if (!reason) return alert('Alasan penolakan wajib diisi.');
    try {
      setRejectLoading(true);
      const res = await fetch('/api/user-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, action: 'reject', reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Gagal menolak user');

      if (shouldOpenWA && selectedUser.phone) {
        const text = `Halo ${selectedUser?.name || ''},

Pengajuan akun BI-ONE *DITOLAK* ❌

Alasan:
${reason}

Silakan melakukan pendaftaran ulang/konfirmasi data. Terima kasih.`;
        const link = waLink(selectedUser.phone, text);
        if (link) window.open(link, '_blank', 'noopener');
      }

      setRows((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setSelectedUser(null);
      setShowRejectPopup(false);
      afterRowRemoved();
    } catch (e) {
      alert(e.message || 'Gagal menolak user');
    } finally {
      setRejectLoading(false);
    }
  }

  // ===== ADMIN Verify / Reject =====
  async function verifyAdmin(row) {
    if (!row) return;
    try {
      if (!confirm(`Verifikasi admin "${row.nama}"?`)) return;
      const res = await fetch('/api/admin-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // NOTE: jika perlu kirim serviceIds, tambahkan di sini.
        body: JSON.stringify({ adminId: row.id, action: 'verify' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Gagal verifikasi admin');

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      afterRowRemoved();
      alert('Admin berhasil diverifikasi.');
    } catch (e) {
      alert(e.message || 'Gagal verifikasi admin');
    }
  }

  async function rejectAdmin(row) {
    if (!row) return;
    const reason = prompt(`Alasan penolakan untuk admin "${row.nama}" (wajib):`, '') || '';
    if (!reason.trim()) return alert('Alasan wajib diisi.');
    try {
      const res = await fetch('/api/admin-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: row.id, action: 'reject', reason: reason.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Gagal menolak admin');

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      afterRowRemoved();
      alert('Admin berhasil ditolak.');
    } catch (e) {
      alert(e.message || 'Gagal menolak admin');
    }
  }

  // ===== Logout =====
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

  const pillOf = (id) => STATUS_PILL[id] || STATUS_PILL[1];

  // ==== kolom dinamis: colSpan & header ====
  const colSpan = useMemo(() => {
    if (entityType === 'users') {
      // ID, Nama, NIP, Phone, Email, Status, [Password kalau verified], Aksi
      return activeStatusId === 2 ? 8 : 7;
    }
    // admins: ID, Nama, Email, Role, Status, Aksi
    return 6;
  }, [entityType, activeStatusId]);

  const renderTableHead = () => {
    if (entityType === 'users') {
      return (
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
      );
    }
    return (
      <tr>
        <th style={{ width: 55 }}>ID</th>
        <th>Nama</th>
        <th>Email</th>
        <th>Role</th>
        <th style={{ width: 140 }}>Status</th>
        <th style={{ width: activeStatusId === 1 ? 220 : 140 }}>Aksi</th>
      </tr>
    );
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={colSpan} style={{ textAlign: 'center', color: '#888' }}>
            Memuat data...
          </td>
        </tr>
      );
    }

    if (errorMsg) {
      return (
        <tr>
          <td colSpan={colSpan} style={{ textAlign: 'center', color: '#b04141' }}>
            {errorMsg}
          </td>
        </tr>
      );
    }

    if (!rows.length) {
      return (
        <tr>
          <td colSpan={colSpan} style={{ textAlign: 'center', color: '#888' }}>
            {activeTab === 'verified'
              ? `Belum ada ${entityType === 'users' ? 'user' : 'admin'} terverifikasi.`
              : activeTab === 'pending'
              ? `Tidak ada ${entityType === 'users' ? 'user' : 'admin'} pending.`
              : `Tidak ada ${entityType === 'users' ? 'user' : 'admin'} ditolak.`}
          </td>
        </tr>
      );
    }

    if (entityType === 'users') {
      return rows.map((u) => {
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
            </td>

            {activeStatusId === 2 && (
              <td>
                <button
                  className={styles.editBtn}
                  onClick={() => openEditPasswordPopup(u)}
                  aria-label={`Ganti password untuk ${u.name}`}
                >
                  <FaLock style={{ marginRight: 4 }} /> Ganti Password
                </button>
              </td>
            )}

            <td className={styles.actionCell}>
              {/* Edit */}
              <button
                className={styles.editGhostBtn}
                onClick={() => openEditPopup(u)}
                aria-label={`Edit user ${u.name}`}
              >
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
      });
    }

    // entityType === 'admins'
    return rows.map((a) => {
      const pill = pillOf(a.verification_id);
      const roleText = Number(a.role_id) === 1 ? 'Super Admin' : 'Admin Fitur';
      return (
        <tr key={a.id}>
          <td>{a.id}</td>
          <td style={{ fontWeight: 'bold' }}>{a.nama}</td>
          <td>{a.email}</td>
          <td>
            <span title={`role_id=${a.role_id}`}>{roleText}</span>
            {Array.isArray(a.services) && a.services.length > 0 && (
              <div style={{ fontSize: 12, color: '#5a6aa3', marginTop: 4 }}>
                Layanan: {a.services.join(', ')}
              </div>
            )}
          </td>
          <td>
            <span className={`${styles.statusPill} ${pill.className}`}>{pill.text}</span>
          </td>
          <td className={styles.actionCell}>
            {activeStatusId === 1 ? (
              <div className={styles.splitGroup}>
                <button
                  className={`${styles.splitBtn} ${styles.approve}`}
                  onClick={() => verifyAdmin(a)}
                  title="Verifikasi admin"
                  disabled={loading}
                >
                  <FaUserShield style={{ marginRight: 6 }} /> Verifikasi
                </button>
                <button
                  className={`${styles.splitBtn} ${styles.reject}`}
                  onClick={() => rejectAdmin(a)}
                  title="Tolak admin"
                  disabled={loading}
                >
                  <FaTimes style={{ marginRight: 6 }} /> Tolak
                </button>
              </div>
            ) : (
              <>
                {a.verification_id === 3 && a.rejection_reason && (
                  <button
                    type="button"
                    className={styles.reasonBtn || styles.editBtn}
                    onClick={() =>
                      openReason({
                        ...a,
                        name: a.nama, // agar popup tetap bisa baca "name"
                      })
                    }
                    title="Lihat alasan penolakan"
                    style={{ marginLeft: 8 }}
                  >
                    Lihat Alasan
                  </button>
                )}
              </>
            )}
          </td>
        </tr>
      );
    });
  };

  const resultsRangeText = useMemo(() => {
    if (!pagination?.totalItems) return '';
    const start = (pagination.currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems);
    return `Results: ${start} - ${end} of ${pagination.totalItems}`;
  }, [pagination, itemsPerPage]);

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.tableBox}>
          <div className={styles.tableTopRow}>
            <div className={styles.tableTitle}>PENGATURAN</div>
          </div>

          {/* ==== NEW: Switch Users vs Admins ==== */}
          <div className={styles.tabsRow} style={{ marginTop: 6, marginBottom: 8 }}>
            <button
              className={`${styles.tabBtn} ${entityType === 'users' ? styles.tabActive : ''}`}
              onClick={() => { setEntityType('users'); setPagination((p) => ({ ...p, currentPage: 1 })); }}
              type="button"
            >
              Users
            </button>
            <button
              className={`${styles.tabBtn} ${entityType === 'admins' ? styles.tabActive : ''}`}
              onClick={() => { setEntityType('admins'); setPagination((p) => ({ ...p, currentPage: 1 })); }}
              type="button"
            >
              Admins
            </button>
          </div>

          {/* Tabs status */}
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
              <thead>{renderTableHead()}</thead>
              <tbody>{renderTableBody()}</tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalItems > 0 && (
            <>
              <div className={styles.paginationControls}>
                <span className={styles.resultsText}>{resultsRangeText}</span>
                <div>
                  <label htmlFor="itemsPerPage" className={styles.label}>Items per page:</label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className={styles.itemsPerPageDropdown}
                    aria-label="Items per page"
                  >
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

      {/* Edit Popup (USER) */}
      {showEditPopup && entityType === 'users' && (
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

      {/* Change Password Popup (USER) */}
      {showEditPasswordPopup && entityType === 'users' && (
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

      {/* Reject Verification Popup (USER) */}
      <UserVerificationRejectPopup
        show={entityType === 'users' && showRejectPopup}
        loading={rejectLoading}
        onClose={() => setShowRejectPopup(false)}
        onSubmit={submitRejectUser}   // (reasonText[, shouldOpenWA]) => void
      />

      {/* Verify (Approve) Verification Popup (USER) */}
      <UserVerificationApprovePopup
        show={entityType === 'users' && showVerifyPopup}
        loading={verifyLoading}
        onClose={() => setShowVerifyPopup(false)}
        onSubmit={submitVerifyUser}   // (messageText, shouldOpenWA) => void
        user={selectedUser || undefined}
      />

      {/* Reason (Rejected) Popup */}
      {showReasonPopup && reasonRow && (
        <div className={styles.popupOverlay} onClick={closeReason}>
          <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTitle}>Alasan Penolakan</div>

            <div style={{marginBottom: 12, color: '#41507a', fontSize: 14}}>
              <div><strong>Nama:</strong> {reasonRow.name || reasonRow.nama || '-'}</div>
              {'nip' in reasonRow && <div><strong>NIP:</strong> {reasonRow.nip || '-'}</div>}
              {'phone' in reasonRow && <div><strong>Phone:</strong> {reasonRow.phone || '-'}</div>}
              <div><strong>Email:</strong> {reasonRow.email || '-'}</div>
            </div>

            <label className={styles.label} style={{marginBottom: 6}}>Alasan</label>
            <div
              style={{
                background:'#fff8f8', border:'1.2px solid #e4b9b9', borderRadius:10,
                padding:'12px 14px', color:'#7a1c1c', fontSize:15, lineHeight:1.45,
                whiteSpace:'pre-wrap'
              }}
            >
              {reasonRow.rejection_reason || '-'}
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
        <div className={styles.toastSuccess} role="status" aria-live="polite">
          <FaCheck style={{ marginRight: 6 }} />
          Update berhasil!
        </div>
      )}
    </div>
  );
}
