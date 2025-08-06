import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './halamanUtamaAdmin.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers } from 'react-icons/fa';

// Helper function untuk menghitung durasi
const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Hari`;
};

// Konfigurasi Status
const STATUS_CONFIG = {
    '1': { text: 'Process', className: styles.layananStatusProcess },
    // Tambahkan status lain jika perlu ditampilkan di halaman lain
};

export default function HalamanUtamaAdmin() {
    const router = useRouter();
    const [namaAdmin, setNamaAdmin] = useState('');
    
    // State untuk data booking dari API
    const [incomingBookings, setIncomingBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Mengambil nama admin dan data booking saat komponen dimuat
    useEffect(() => {
        // Ambil nama admin dari localStorage
        const adminStr = localStorage.getItem('admin');
        if (adminStr) {
            try {
                const admin = JSON.parse(adminStr);
                setNamaAdmin(admin.nama || 'Admin');
            } catch {
                setNamaAdmin('Admin');
            }
        } else {
            // Jika tidak ada data admin, mungkin arahkan ke login
            router.push('/Login/hal-login');
        }

        // Fetch data booking untuk admin (tanpa userId)
        const fetchAdminBookings = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/booking'); // Panggil API tanpa query userId
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Gagal memuat data booking');
                }
                const data = await res.json();
                setIncomingBookings(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAdminBookings();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('admin');
        router.push('/Login/hal-login');
    };

    return (
        <div className={styles.background}>
            {/* SIDEBAR */}
            <aside className={styles.sidebar}>
                 <div className={styles.logoSidebar}>
                     <Image src="/assets/BI_Logo.png" alt="Bank Indonesia" width={110} height={36} className={styles.logoDone} priority />
                 </div>
                 <nav className={styles.navMenu}>
                     <ul>
                         <li className={styles.active}><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamaAdmin'>Beranda</Link></li>
                         <li><FaClipboardList className={styles.menuIcon} /><Link href='/Persetujuan/hal-persetujuan'>Persetujuan Booking</Link></li>
                         <li><FaUsers className={styles.menuIcon} /><Link href='/Ketersediaan/hal-ketersediaan'>Ketersediaan</Link></li>
                         <li><FaCog className={styles.menuIcon} /><Link href='/Pengaturan/hal-pengaturan'>Pengaturan</Link></li>
                     </ul>
                 </nav>
                 <div className={styles.logout} onClick={handleLogout} role="button" tabIndex={0} style={{cursor: 'pointer'}}>
                     <FaSignOutAlt className={styles.logoutIcon} />
                     Logout
                 </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={styles.mainContent}>
                <div className={styles.header}>
                    <div className={styles.logoBIWrapper}>
                        <Image src="/assets/D'ONE.png" alt="D'ONE" width={170} height={34} className={styles.logoBI} priority/>
                    </div>
                </div>

                <div className={styles.greeting}>
                    Selamat datang, {namaAdmin}
                    <div className={styles.adminText}>Admin</div>
                </div>

                <div className={styles.boxLayanan}>
                    <div className={styles.titleLayanan}>LAYANAN MASUK</div>
                    <div className={styles.cardList}>
                        {isLoading ? (
                            <p>Memuat layanan...</p>
                        ) : error ? (
                            <p style={{ color: 'red' }}>Error: {error}</p>
                        ) : incomingBookings.length === 0 ? (
                            <p>Tidak ada layanan masuk saat ini.</p>
                        ) : (
                            incomingBookings.map(booking => {
                                const statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: '' };
                                return (
                                    <div
                                        key={booking.id}
                                        className={styles.cardLayanan}
                                        onClick={() => router.push(`/DetailsLaporan/hal-detailslaporan?id=${booking.id}`)} // Arahkan ke halaman persetujuan
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Image src={"/assets/D'MOVE.png"} alt="D'MOVE" width={70} height={70} className={styles.cardLogo} priority />
                                        <div className={styles.cardContent}>
                                            <div className={styles.layananTitle}>{`Booking D'MOVE | ${booking.tujuan}`}</div>
                                            <div className={styles.layananSub}>{calculateDuration(booking.start_date, booking.end_date)}</div>
                                            <div className={`${styles.layananStatus} ${statusInfo.className}`}>{statusInfo.text}</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}