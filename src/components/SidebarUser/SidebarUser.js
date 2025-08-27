// /components/SidebarUser.js
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './SidebarUser.module.css'; // sesuai punyamu
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt } from 'react-icons/fa';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

export default function SidebarAdmin({ onLogout }) {
  const router = useRouter();

  // Ambil ns dari query atau dari asPath (fallback)
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  // Helper untuk menempelkan ?ns= ke href
  const withNs = (href) => {
    if (!ns) return href;
    return href + (href.includes('?') ? '&' : '?') + 'ns=' + encodeURIComponent(ns);
  };

  const menuItems = [
    { href: '/User/HalamanUtama/hal-utamauser', text: 'Beranda',        icon: FaHome },
    { href: '/User/StatusBooking/hal-statusBooking', text: 'Status Booking', icon: FaClipboardList },
    { href: '/User/EditProfile/hal-editprofile',     text: 'Pengaturan',     icon: FaCog },
  ];

  const handleNavigate = (href) => {
    router.push(withNs(href));
  };

  const pathnameOnly = router.asPath.split('?')[0];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoSidebar}>
        <Image
          src="/assets/BI-One-Blue.svg"
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
            return (
              <li
                key={item.href}
                className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                onClick={() => handleNavigate(item.href)}
                onKeyDown={(e) => e.key === 'Enter' && handleNavigate(item.href)}
                role="button"
                tabIndex={0}
              >
                <item.icon className={styles.menuIcon} />
                <span>{item.text}</span>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={styles.logout}
        onClick={() => onLogout?.(ns)}   // ⬅️ kirim ns ke handler logout (opsional)
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
