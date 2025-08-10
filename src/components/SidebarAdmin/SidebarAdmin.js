// /components/SidebarAdmin.js
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './SidebarAdmin.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers } from 'react-icons/fa';

export default function SidebarAdmin({ onLogout }) {
    const router = useRouter();
    const menuItems = [
        { href: '/Admin/HalamanUtama/hal-utamaAdmin', text: 'Beranda', icon: FaHome },
        { href: '/Admin/Persetujuan/hal-persetujuan', text: 'Persetujuan Booking', icon: FaClipboardList },
        { href: '/Admin/Ketersediaan/hal-ketersediaan', text: 'Ketersediaan', icon: FaUsers },
        { href: '/Admin/Pengaturan/hal-pengaturan', text: 'Pengaturan', icon: FaCog },
    ];

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoSidebar}>
                <Image 
                src="/assets/BI-One-Blue.png" 
                alt="Bank Indonesia" 
                width={160} 
                height={160} 
                className={styles.logoDone}
                priority />
            </div>
            <nav className={styles.navMenu}>
                <ul>
                    {menuItems.map((item) => {
                        const isActive = router.pathname.startsWith(item.href);
                        return (
                            <li key={item.href} className={isActive ? styles.active : ''}>
                                <item.icon className={styles.menuIcon} />
                                <Link href={item.href}>{item.text}</Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div 
                className={styles.logout} 
                onClick={onLogout} 
                role="button" 
                tabIndex={0}
            >
                <FaSignOutAlt className={styles.logoutIcon} />Logout
            </div>
        </aside>
    );
}