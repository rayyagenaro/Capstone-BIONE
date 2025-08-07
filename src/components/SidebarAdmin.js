// /components/SidebarAdmin.js
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './SidebarAdmin.module.css'; // kita buat file CSS ini juga
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers } from 'react-icons/fa';

export default function SidebarAdmin() {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('admin');
        router.push('/Login/hal-login');
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoSidebar}>
                <Image src="/assets/BI_Logo.png" alt="Bank Indonesia" width={110} height={36} priority />
            </div>
            <nav className={styles.navMenu}>
                <ul>
                    <li className={router.pathname === '/HalamanUtama/hal-utamaAdmin' ? styles.active : ''}>
                        <FaHome className={styles.menuIcon} />
                        <Link href='/HalamanUtama/hal-utamaAdmin'>Beranda</Link>
                    </li>
                    <li className={router.pathname.startsWith('/Persetujuan') ? styles.active : ''}>
                        <FaClipboardList className={styles.menuIcon} />
                        <Link href='/Persetujuan/hal-persetujuan'>Persetujuan Booking</Link>
                    </li>
                    <li className={router.pathname.startsWith('/Ketersediaan') ? styles.active : ''}>
                        <FaUsers className={styles.menuIcon} />
                        <Link href='/Ketersediaan/hal-ketersediaan'>Ketersediaan</Link>
                    </li>
                    <li className={router.pathname.startsWith('/Pengaturan') ? styles.active : ''}>
                        <FaCog className={styles.menuIcon} />
                        <Link href='/Pengaturan/hal-pengaturan'>Pengaturan</Link>
                    </li>
                </ul>
            </nav>
            <div className={styles.logout} onClick={handleLogout} role="button" tabIndex={0}>
                <FaSignOutAlt className={styles.logoutIcon} />Logout
            </div>
        </aside>
    );
}
