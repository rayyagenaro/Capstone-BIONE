// /src/components/ServiceCards/CardShell.jsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ServiceCards.module.css';


const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
};

export default function CardShell({ ns, loading, err, data }) {
  if (loading) return <div className={styles.skeletonCard} />;
  if (err) return <div className={styles.errorBox}>Error: {err}</div>;
  if (!data) return null;

  const nsSafe = typeof ns === 'string' && NS_RE.test(ns) ? ns : '';

  return (
    <div className={styles.card}>
      <Image
        src={data.logo}
        alt={data.name}
        width={500}
        height={100}
        className={styles.cardLogo}
        priority
      />
      <div className={styles.cardTitle}>{String(data.name || '').toUpperCase()}</div>
      <div className={styles.cardDesc}>{data.desc}</div>

      <div className={styles.cardFooter}>
        <span className={styles.badge}>{data.pending} masuk</span>
        <Link
          href={withNs(`/Admin/Fitur/${data.slug}/hal-queue`, nsSafe)}
          className={styles.manageBtn}
        >
          Lihat Pesanan
        </Link>
      </div>
    </div>
  );
}
