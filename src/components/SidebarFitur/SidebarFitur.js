// components/SidebarFitur.js
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './SidebarFitur.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers, FaFileAlt, FaAddressBook, FaBook } from 'react-icons/fa';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

export default function SidebarFitur({ onLogout }) {
  const router = useRouter();

  // Ambil ns dari query (utama) atau asPath (fallback)
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  // Helper tempelkan ?ns=
  const withNs = (href) => (ns ? `${href}${href.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}` : href);

  // ⚠️ Tidak ada menu Pengaturan di Admin Fitur
  const menuItems = [
    { href: '/Admin/HalamanUtama/hal-utamaAdmin', text: 'Beranda', icon: FaHome },
    { href: '/Admin/Persetujuan/hal-persetujuan', text: 'Persetujuan Booking', icon: FaClipboardList },
    { href: '/Admin/Ketersediaan/hal-ketersediaan', text: 'Ketersediaan', icon: FaUsers },
    { href: '/Admin/Laporan/hal-laporan',        text: 'Laporan', icon: FaBook },
  ];

  const handleNavigate = (href) => router.push(withNs(href));
  const pathnameOnly = router.asPath.split('?')[0];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoSidebar}>
        <Image
          src="/assets/BI-One-Blue.png"
          alt="Bank Indonesia"
          width={160}
          height={160}
          className={styles.logoDone}
          priority
        />
      </div>

      <nav className={styles.navMenu}>
        <ul>
          {menuItems.map((item) => {
            const isActive = pathnameOnly.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li
                key={item.href}
                className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                onClick={() => handleNavigate(item.href)}
                onKeyDown={(e) => e.key === 'Enter' && handleNavigate(item.href)}
                role="button"
                tabIndex={0}
              >
                <Icon className={styles.menuIcon} />
                <Link href={withNs(item.href)}>{item.text}</Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={styles.logout}
        onClick={() => onLogout?.(ns)}
        onKeyDown={(e) => e.key === 'Enter' && onLogout?.(ns)}
        role="button"
        tabIndex={0}
      >
        <FaSignOutAlt className={styles.logoutIcon} />
        Logout
      </div>
    </aside>
  );
}
