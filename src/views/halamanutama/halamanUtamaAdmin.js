// /pages/HalamanUtama/hal-utamaAdmin.js
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './halamanUtamaAdmin.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';

// Helper function untuk menghitung durasi
const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Menambahkan penanganan jika durasi 0 hari, dianggap 1 hari
    return `${diffDays === 0 ? 1 : diffDays} Hari`;
};

// Konfigurasi Status untuk tampilan
const STATUS_CONFIG = {
    '1': { text: 'Pending', className: styles.layananStatusProcess },
};

export default function HalamanUtamaAdmin() {
    const router = useRouter();
    const [namaAdmin, setNamaAdmin] = useState('');
    const [incomingBookings, setIncomingBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);

    useEffect(() => {
        const adminStr = localStorage.getItem('admin');
        if (adminStr) {
            try {
                const admin = JSON.parse(adminStr);
                setNamaAdmin(admin.nama || 'Admin');
            } catch (e) {
                // Jika data di localStorage tidak valid, hapus dan redirect
                localStorage.removeItem('admin');
                router.push('/Login/hal-login');
                return;
            }
        } else {
            // Jika tidak ada data admin, langsung redirect
            router.push('/Login/hal-login');
            return; // Hentikan eksekusi useEffect
        }

        const fetchIncomingBookings = async () => {
            setIsLoading(true);
            setError(null); // Reset error setiap kali fetch
            try {
                const res = await fetch('/api/booking?status=pending');
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

        fetchIncomingBookings();
    }, [router]); // dependency array hanya perlu router

    const handleLogout = () => {
        localStorage.removeItem('admin');
        router.push('/Login/hal-login');
    };

    return (
        <div className={styles.background}>
            <SidebarAdmin onLogoutClick={() => setShowLogoutPopup(true)} />
            <main className={styles.mainContent}>
                <div className={styles.greeting}>
                    Selamat datang, {namaAdmin}
                    <div className={styles.adminText}>Admin</div>
                </div>
                <div className={styles.boxLayanan}>
                    <div className={styles.titleLayanan}>LAYANAN MASUK</div>
                    <div className={styles.cardList}>
                        {isLoading ? (
                            <p className={styles.loadingText}>Memuat layanan...</p>
                        ) : error ? (
                            <p className={styles.errorText}>Error: {error}</p>
                        ) : incomingBookings.length === 0 ? (
                            <div className={styles.emptyStateContainer}>
                                <Image src="/assets/no-requests.svg" alt="Tidak ada permintaan" width={120} height={120} />
                                <p className={styles.emptyText}>Belum ada permintaan booking baru.</p>
                            </div>
                        ) : (
                            incomingBookings.map(booking => {
                                const statusInfo = STATUS_CONFIG[booking.status_id];
                                return (
                                    <div
                                        key={booking.id}
                                        className={styles.cardLayanan}
                                        onClick={() => router.push(`/DetailsLaporan/hal-detailslaporan?id=${booking.id}`)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <Image src={"/assets/D'MOVE.png"} alt="D'MOVE" width={70} height={70} className={styles.cardLogo} priority />
                                        <div className={styles.cardContent}>
                                            <div className={styles.layananTitle}>{`Booking D'MOVE | ${booking.tujuan}`}</div>
                                            <div className={styles.layananSub}>{calculateDuration(booking.start_date, booking.end_date)}</div>
                                            {statusInfo && <div className={`${styles.layananStatus} ${statusInfo.className}`}>{statusInfo.text}</div>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
            <LogoutPopup
                open={showLogoutPopup}
                onCancel={() => setShowLogoutPopup(false)}
                onLogout={handleLogout}
            />
        </div>
    );
}