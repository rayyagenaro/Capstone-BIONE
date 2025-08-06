import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './statusBooking.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaArrowLeft, FaTimes } from 'react-icons/fa';

// --- KONFIGURASI & HELPER ---
const STATUS_CONFIG = {
    '1': { text: 'Pending', className: styles.statusProcess },
    '2': { text: 'Approved', className: styles.statusApproved },
    '3': { text: 'Rejected', className: styles.statusRejected },
};
const TABS = ['All', 'Pending', 'Approved', 'Rejected'];
const TAB_TO_STATUS_ID = { 'Pending': 1, 'Approved': 2, 'Rejected': 3 };

const formatDate = (dateString) => {
    if (!dateString) return 'Tanggal tidak valid';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

// --- SUB-KOMPONEN ---

const Sidebar = React.memo(({ onLogout }) => (
    <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}><Image src="/assets/BI_Logo.png" alt="Bank Indonesia" width={110} height={36} priority /></div>
        <nav className={styles.navMenu}>
            <ul>
                <li><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser'>Beranda</Link></li>
                <li className={styles.active}><FaClipboardList className={styles.menuIcon} /><Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link></li>
                <li><FaCog className={styles.menuIcon} /><Link href='/EditProfile/hal-editprofile'>Pengaturan</Link></li>
            </ul>
        </nav>
        <div className={styles.logout} onClick={onLogout} onKeyDown={(e) => e.key === 'Enter' && onLogout()} role="button" tabIndex={0}>
            <FaSignOutAlt className={styles.logoutIcon}/>Logout
        </div>
    </aside>
));
Sidebar.displayName = 'Sidebar';

const BookingCard = React.memo(({ booking, onClick }) => {
    const statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: styles.statusProcess };
    
    return (
        <div className={styles.bookingCard} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()} role="button" tabIndex={0}>
            <Image src={"/assets/D'MOVE.png"} alt="logo" width={60} height={60} className={styles.cardLogo} />
            <div className={styles.cardDetail}>
                <div className={styles.cardTitle}>{`Booking | ${booking.tujuan || 'Tanpa Tujuan'}`}</div>
                <div className={styles.cardSub}>{`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`}</div>
                {booking.vehicle_types?.length > 0 && (
                    <div className={styles.cardVehicles}>
                        {booking.vehicle_types.map(vt => vt.name).join(', ')}
                    </div>
                )}
                <div className={statusInfo.className}>{statusInfo.text}</div>
            </div>
        </div>
    );
});
BookingCard.displayName = 'BookingCard';

const TabFilter = React.memo(({ currentTab, onTabChange }) => (
    <div className={styles.tabRow}>
        {TABS.map(tabName => (
            <button key={tabName} className={`${styles.tabBtn} ${currentTab === tabName ? styles.tabActive : ""}`} onClick={() => onTabChange(tabName)}>
                {tabName}
            </button>
        ))}
    </div>
));
TabFilter.displayName = 'TabFilter';

const BookingDetailModal = ({ booking, onClose }) => {
    if (!booking) return null;
    const statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: styles.statusProcess };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.modalCloseBtn} onClick={onClose}><FaTimes /></button>
                <h3 className={styles.modalTitle}>Detail Booking</h3>
                <div className={styles.modalBody}>
                    <p><strong>Tujuan:</strong> {booking.tujuan}</p>
                    <p><strong>Mulai:</strong> {formatDate(booking.start_date)}</p>
                    <p><strong>Selesai:</strong> {formatDate(booking.end_date)}</p>
                    <p><strong>Status:</strong> <span className={`${styles.modalStatus} ${statusInfo.className}`}>{statusInfo.text}</span></p>
                    <hr className={styles.modalDivider} />
                    <p><strong>Jenis Kendaraan:</strong> {booking.vehicle_types?.map(vt => vt.name).join(', ') || 'Tidak ada'}</p>
                    <p><strong>Jumlah Kendaraan:</strong> {booking.jumlah_kendaraan || 'N/A'}</p>
                    <p><strong>Jumlah Orang:</strong> {booking.jumlah_orang || 'N/A'}</p>
                    <p><strong>Volume Barang:</strong> {booking.volume_kg ? `${booking.volume_kg} Kg` : 'N/A'}</p>
                    <p><strong>Keterangan:</strong> {booking.keterangan || 'Tidak ada keterangan.'}</p>
                    {booking.file_link && <p><strong>Link File:</strong> <a href={booking.file_link} target="_blank" rel="noopener noreferrer">Lihat Lampiran</a></p>}
                </div>
            </div>
        </div>
    );
};

// --- KOMPONEN UTAMA ---
export default function StatusBooking() {
    const router = useRouter();
    const [allBookings, setAllBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("All");
    const [selectedBooking, setSelectedBooking] = useState(null); // State untuk modal

    useEffect(() => {
        const userDataStr = localStorage.getItem('user');
        if (!userDataStr) {
            setIsLoading(false);
            setError("Silakan login untuk melihat status booking.");
            return;
        }

        const user = JSON.parse(userDataStr);
        const fetchBookings = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/booking?userId=${user.id}`);
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Gagal memuat data booking');
                }
                const data = await res.json();
                setAllBookings(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('user');
        router.push('/Login/hal-login');
    }, [router]);
    
    const handleTabChange = useCallback((tabName) => setActiveTab(tabName), []);
    
    const handleCardClick = useCallback((booking) => setSelectedBooking(booking), []);
    const closeModal = useCallback(() => setSelectedBooking(null), []);

    const filteredBookings = useMemo(() => {
        if (activeTab === "All") return allBookings;
        const statusId = TAB_TO_STATUS_ID[activeTab];
        return allBookings.filter(item => item.status_id === statusId);
    }, [activeTab, allBookings]);

    return (
        <div className={styles.background}>
            <Sidebar onLogout={handleLogout} />

            <main className={styles.mainContent}>
                <div className={styles.header}>
                    <div className={styles.logoBIWrapper}><Image src="/assets/D'ONE.png" alt="D'ONE" width={170} height={34} priority /></div>
                    <form className={styles.searchBar}>
                        <input type="text" placeholder="Search" />
                        <button type="submit"><svg width="20" height="20" fill="#2F4D8E"><circle cx="9" cy="9" r="8" stroke="#2F4D8E" strokeWidth="2" fill="none" /><line x1="15" y1="15" x2="19" y2="19" stroke="#2F4D8E" strokeWidth="2" /></svg></button>
                    </form>
                </div>
                
                <div className={styles.bookingBox}>
                    <div className={styles.topRow}>
                        <button className={styles.backBtn} onClick={() => router.back()}><FaArrowLeft /> Kembali</button>
                        <div className={styles.title}>STATUS BOOKING</div>
                    </div>

                    <TabFilter currentTab={activeTab} onTabChange={handleTabChange} />

                    <div className={styles.listArea}>
                        {isLoading && <div className={styles.emptyState}>Memuat booking...</div>}
                        {error && <div className={styles.emptyState} style={{color: 'red'}}>{error}</div>}
                        {!isLoading && !error && filteredBookings.length === 0 && <div className={styles.emptyState}>Tidak ada booking dengan status ini.</div>}
                        {!isLoading && !error && filteredBookings.map(item => <BookingCard key={item.id} booking={item} onClick={() => handleCardClick(item)} />)}
                    </div>
                </div>
            </main>

            <BookingDetailModal booking={selectedBooking} onClose={closeModal} />
        </div>
    );
}