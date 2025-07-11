import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './login.module.css';

export default function Login() {
  return (
    <div className={styles.background}>
      <div className={styles.bgImage}></div>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <Image
          src="/assets/D'ONE Putih.png"
          alt="D'ONE Logo Putih"
          width={90}
          height={90}
          className={styles.logoOnly}
          priority
        />
        <div className={styles.menu}>
          <span className={styles.signIn}><Link href="/Signin/hal-sign" passHref legacyBehavior>Sign In</Link></span>
          <span className={styles.signUp}><Link href="/Signup/hal-sign" passHref legacyBehavior>Sign Up</Link></span>
        </div>
      </div>

      {/* CARD */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Image
            src="/assets/BI_Logo.png"
            alt="Bank Indonesia"
            width={120}
            height={44}
            className={styles.cardBankLogo}
            priority
          />
          <div className={styles.welcome}>Selamat datang di</div>
        </div>
        <div className={styles.logoDoneWrapper}>
          <Image
            src="/assets/D'ONE.png"
            alt="D'ONE Logo"
            width={220}
            height={110}
            className={styles.logoLarge}
            priority
          />
        </div>
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
        <Link href="/Signin/hal-signAdmin" passHref legacyBehavior>
          <button className={styles.buttonAdmin}>Masuk Sebagai Admin</button>
        </Link>
      </div>
    </div>
  );
}