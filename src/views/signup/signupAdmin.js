import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './signupadmin.module.css';

export default function SignupAdmin() {
  const router = useRouter();

  const [fields, setFields] = useState({
    nama: '',
    email: '',
    password: '',
    konfirmasi: ''
  });

  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  function validate() {
    const e = {};
    if (!fields.nama) e.nama = 'Nama wajib diisi';
    if (!fields.email) e.email = 'Email wajib diisi';
    if (!fields.password) e.password = 'Kata sandi wajib diisi';
    if (!fields.konfirmasi) e.konfirmasi = 'Konfirmasi wajib diisi';
    if (fields.password && fields.konfirmasi && fields.password !== fields.konfirmasi) {
      e.konfirmasi = 'Konfirmasi tidak cocok';
    }
    return e;
  }

  function handleChange(e) {
    setFields({ ...fields, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    setSubmitted(true);

    if (Object.keys(err).length === 0) {
      try {
        const res = await fetch('/api/registerAdmin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: fields.nama,
            email: fields.email,
            password: fields.password
          })
        });

        const data = await res.json();
        if (res.ok) {
          setShowSuccess(true);
          window.location.href = '/Signin/hal-signAdmin';
        } else {
          alert(data.error || 'Terjadi kesalahan saat mendaftar admin');
        }
      } catch {
        alert('Gagal menghubungi server');
      }
    }
  }

  const bolehDaftar =
    Object.values(fields).every(Boolean) && fields.password === fields.konfirmasi;

  function handleBack() {
    // samakan rute balik seperti di signin admin
    router.push('/Login/hal-login');
  }

  return (
    <div className={styles.background}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.logoWrap}>
          <Image
            src="/assets/Logo BI Putih.png"
            alt="Bank Indonesia Logo"
            width={180}
            height={50}
            priority
          />
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          {/* HEADER: logo center, tombol back absolute di kiri */}
          <div className={styles.cardHeaderRowMod}>
            <button
              className={styles.backBtn}
              type="button"
              onClick={handleBack}
              aria-label="Kembali"
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <circle cx="14" cy="12" r="11" fill="#fff" />
                <path d="M15 5l-7 7 7 7" stroke="#2F4D8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.headerLogoWrapper}>
              <Image
                src="/assets/BI-One-Blue.png"
                alt="BI One Logo"
                width={180}
                height={60}
                priority
              />
            </div>
          </div>

          <div className={styles.cardTitle}>Registrasi Admin</div>
          <div className={styles.cardSubtitle}>Buat akun admin dengan aman</div>

          <form className={styles.form} autoComplete="off" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="nama"
                type="text"
                placeholder="Nama Admin"
                value={fields.nama}
                onChange={handleChange}
              />
              {submitted && errors.nama && <div className={styles.errorMsg}>{errors.nama}</div>}
            </div>

            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="email"
                type="email"
                placeholder="Email Admin"
                value={fields.email}
                onChange={handleChange}
              />
              {submitted && errors.email && <div className={styles.errorMsg}>{errors.email}</div>}
            </div>

            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <input
                className={styles.input}
                name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="Kata Sandi"
                value={fields.password}
                onChange={handleChange}
              />
              <span className={styles.eyeIcon} onClick={() => setShowPass(s => !s)} />
              {submitted && errors.password && <div className={styles.errorMsg}>{errors.password}</div>}
            </div>

            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <input
                className={styles.input}
                name="konfirmasi"
                type={showConf ? 'text' : 'password'}
                placeholder="Konfirmasi Kata Sandi"
                value={fields.konfirmasi}
                onChange={handleChange}
              />
              <span className={styles.eyeIcon} onClick={() => setShowConf(s => !s)} />
              {submitted && errors.konfirmasi && <div className={styles.errorMsg}>{errors.konfirmasi}</div>}
            </div>

            <button
              type="submit"
              className={styles.button}
              disabled={!bolehDaftar}
              style={{ opacity: bolehDaftar ? 1 : 0.5, cursor: bolehDaftar ? 'pointer' : 'not-allowed' }}
            >
              Daftar Admin
            </button>
          </form>

          {showSuccess && (
            <div className={styles.popupOverlay}>
              <div className={styles.popupBox}>
                <div className={styles.popupIcon}>
                  <svg width="70" height="70" viewBox="0 0 70 70">
                    <circle cx="35" cy="35" r="35" fill="#7EDC89" />
                    <polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={styles.popupMsg}><b>Berhasil Sign Up</b></div>
              </div>
            </div>
          )}

          <div className={styles.registerArea}>
            Sudah punya akun admin?
            <Link href="/Signin/hal-signAdmin" className={styles.registerLink}>Masuk di sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
