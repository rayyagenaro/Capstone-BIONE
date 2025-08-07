import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './statusBooking.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
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
    const [selectedBooking, setSelectedBooking] = useState(null);
    const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/Login/hal-login');
    }

    // --- State untuk Popup Logout
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);

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
            <SidebarUser onLogoutClick={() => setShowLogoutPopup(true)} />
            <main className={styles.mainContent}>
                <div className={styles.bookingBox}>
                    <div className={styles.topRow}>
                        <button className={styles.backBtn} onClick={() => router.back()}><FaArrowLeft /> Kembali</button>
                        <div className={styles.title}>STATUS BOOKING</div>
                    </div>
                    <TabFilter currentTab={activeTab} onTabChange={handleTabChange} />
                    <div className={styles.listArea}>
                        {isLoading && <div className={styles.emptyState}>Memuat booking...</div>}
                        {error && <div className={styles.emptyState} style={{ color: 'red' }}>{error}</div>}
                        {!isLoading && !error && filteredBookings.length === 0 && <div className={styles.emptyState}>Tidak ada booking dengan status ini.</div>}
                        {!isLoading && !error && filteredBookings.map(item => <BookingCard key={item.id} booking={item} onClick={() => handleCardClick(item)} />)}
                    </div>
                </div>
            </main>
            <BookingDetailModal booking={selectedBooking} onClose={closeModal} />
            {/* POPUP LOGOUT */}
            <LogoutPopup 
            open={showLogoutPopup} 
            onCancel={() => setShowLogoutPopup(false)}
            onLogout={handleLogout} 
            /> 
        </div>
    );
}
