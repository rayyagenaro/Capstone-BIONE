import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './login.module.css';

export default function Login() {
  return (
    <div className={styles.background}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <Image
          src="/assets/D'ONE Putih.png"
          alt="D'ONE Logo Putih"
          width={100}  // Perbesar logo sesuai kebutuhan
          height={100}
          className={styles.logoOnly}
          priority
        />
        <div className={styles.menu}>
          <span className={styles.signIn}>Sign In</span>
          <span className={styles.signUp}>Sign Up</span>
        </div>
      </div>

      {/* CARD */}
      <div className={styles.card}>
        {/* Row Selamat Datang + Logo BI */}
        <div className={styles.cardRowHeader}>
          <Image
            src="/assets/BI_Logo.png"
            alt="Bank Indonesia"
            width={400}
            height={200}
            className={styles.cardBankLogo}
            priority
          />
          <span className={styles.welcome}>Selamat datang di</span>
        </div>

        {/* Logo D'ONE tengah */}
        <div className={styles.logoDoneWrapper}>
          <Image
            src="/assets/D'ONE.png"
            alt="D'ONE Logo"
            width={200}
            height={100}
            className={styles.logoLarge}
            priority
          />
        </div>

        {/* Judul Card */}
        <div className={styles.cardTitle}>
          Digital One Order<br />By Bank Indonesia
        </div>
        <Link href="/Signin/hal-sign" passHref legacyBehavior>
          <button className={styles.button}>Masuk</button>
        </Link>
        <div className={styles.orSection}>
          <span className={styles.orLine}></span>
          <span className={styles.orText}>Atau</span>
          <span className={styles.orLine}></span>
        </div>
        <button className={styles.buttonAdmin}>Masuk Sebagai Admin</button>
      </div>
    </div>
  );
}