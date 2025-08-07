// /pages/Persetujuan/hal-persetujuan.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './persetujuan.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaArrowLeft, FaUsers } from 'react-icons/fa';

// --- KONFIGURASI & HELPER ---
const STATUS_CONFIG = {
    '1': { text: 'Pending', className: styles.statusPending },
    '2': { text: 'Approved', className: styles.statusApproved },
    '3': { text: 'Rejected', className: styles.statusRejected },
};
const TABS = ['All', 'Pending', 'Approved', 'Rejected'];
const TAB_TO_STATUS_ID = { 'Pending': 1, 'Approved': 2, 'Rejected': 3 };

const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diffTime = Math.abs(new Date(end) - new Date(start));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Hari`;
};

// --- SUB-KOMPONEN ---
const Sidebar = React.memo(() => (
    <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}>
            <Image src="/assets/BI_Logo.png" alt="Bank Indonesia" width={110} height={36} priority />
        </div>
        <nav className={styles.navMenu}>
            <ul>
                <li><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamaAdmin'>Beranda</Link></li>
                <li className={styles.active}><FaClipboardList className={styles.menuIcon} /><Link href='/Persetujuan/hal-persetujuan'>Persetujuan Booking</Link></li>
                <li><FaUsers className={styles.menuIcon} /><Link href='/Ketersediaan/hal-ketersediaan'>Ketersediaan</Link></li>
                <li><FaCog className={styles.menuIcon} /><Link href='/Pengaturan/hal-pengaturan'>Pengaturan</Link></li>
            </ul>
        </nav>
        <div className={styles.logout}>
            <Link href="/Login/hal-login"><FaSignOutAlt className={styles.logoutIcon} /> Logout</Link>
        </div>
    </aside>
));
Sidebar.displayName = 'Sidebar';

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

const BookingCard = React.memo(({ booking }) => {
    const router = useRouter();
    const statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: '' };

    return (
        <div className={styles.cardLayanan} onClick={() => router.push(`/DetailsLaporan/hal-detailslaporan?id=${booking.id}`)}>
            <Image src="/assets/D'MOVE.png" alt="D'MOVE" width={70} height={70} className={styles.cardLogo} priority />
            <div className={styles.cardContent}>
                <div className={styles.layananTitle}>{`Booking D'MOVE | ${booking.tujuan}`}</div>
                <div className={styles.layananSub}>{calculateDuration(booking.start_date, booking.end_date)}</div>
                <div className={`${styles.layananStatus} ${statusInfo.className}`}>
                    {statusInfo.text}
                </div>
            </div>
        </div>
    );
});
BookingCard.displayName = 'BookingCard';

// --- KOMPONEN UTAMA ---
export default function PersetujuanBooking() {
    const router = useRouter();
    const [allBookings, setAllBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("All");

    useEffect(() => {
        const fetchAllBookings = async () => {
            setIsLoading(true);
            try {
                // Panggil API tanpa parameter untuk mendapatkan semua booking
                const res = await fetch('/api/booking');
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
        fetchAllBookings();
    }, []);

    const handleTabChange = useCallback((tabName) => setActiveTab(tabName), []);

    const filteredBookings = useMemo(() => {
        if (activeTab === "All") return allBookings;
        const statusId = TAB_TO_STATUS_ID[activeTab];
        return allBookings.filter(item => item.status_id === statusId);
    }, [activeTab, allBookings]);

    return (
        <div className={styles.background}>
            <Sidebar />
            <main className={styles.mainContent}>
                <div className={styles.header}>
                    <div className={styles.logoBIWrapper}><Image src="/assets/D'ONE.png" alt="D'ONE" width={170} height={34} className={styles.logoBI} priority/></div>
                </div>

                <div className={styles.topRowPersetujuan}>
                    <button className={styles.backBtn}>
                        <FaArrowLeft />
                        <Link href="/HalamanUtama/hal-utamaAdmin" passHref legacyBehavior>Kembali</Link>
                    </button>
                </div>

                <div className={styles.boxLayanan}>
                    <div className={styles.titleLayanan}>PERSETUJUAN BOOKING</div>
                    
                    <TabFilter currentTab={activeTab} onTabChange={handleTabChange} />

                    <div className={styles.cardList}>
                        {isLoading ? (
                            <p>Memuat data booking...</p>
                        ) : error ? (
                            <p style={{ color: 'red' }}>Error: {error}</p>
                        ) : filteredBookings.length === 0 ? (
                            <p className={styles.emptyText}>Tidak ada booking dengan status ini.</p>
                        ) : (
                            filteredBookings.map(item => <BookingCard key={item.id} booking={item} />)
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}