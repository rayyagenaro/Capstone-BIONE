import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './signup.module.css';

export default function Signup() {
  const [fields, setFields] = useState({
    nama: '',
    nim: '',
    hp: '',
    email: '',
    password: '',
    konfirmasi: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Validasi wajib isi & password sama
  function validate() {
    const e = {};
    if (!fields.nama) e.nama = "Nama wajib diisi";
    if (!fields.nim) e.nim = "NIM wajib diisi";
    if (!fields.hp) e.hp = "No HP wajib diisi";
    if (!fields.email) e.email = "Email wajib diisi";
    if (!fields.password) e.password = "Kata sandi wajib diisi";
    if (!fields.konfirmasi) e.konfirmasi = "Konfirmasi kata sandi wajib diisi";
    if (fields.password && fields.konfirmasi && fields.password !== fields.konfirmasi) {
      e.konfirmasi = "Konfirmasi tidak sama";
    }
    return e;
  }

  function handleChange(e) {
    setFields({ ...fields, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    setSubmitted(true);
    if (Object.keys(err).length === 0) {
      alert('Registrasi berhasil!\n' + JSON.stringify(fields, null, 2));
      // Kirim data ke API di sini...
    }
  }

  // Cek boleh daftar
  const bolehDaftar = Object.values(fields).every(x => !!x) && fields.password === fields.konfirmasi;

  return (
    <div className={styles.background}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.logoWrap}>
          <Image
            src="/assets/D'ONE Putih.png"
            alt="D'ONE"
            width={75}
            height={40}
            className={styles.logoDone}
            priority
          />
        </div>
        <div className={styles.menu}>
          <Link href="/Signin/hal-sign" className={styles.signIn}>Sign In</Link>
          <Link href="/SignUp/hal-signup" className={styles.signUp}>Sign Up</Link>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          <Image
            src="/assets/BI_Logo.png"
            alt="Bank Indonesia"
            width={120}
            height={34}
            className={styles.logoBI}
            priority
          />

          <div className={styles.cardTitle}>Register Akun</div>
          <div className={styles.cardSubtitle}>Isi data di bawah ini dengan sesuai!</div>

          <form className={styles.form} autoComplete="off" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="nama"
                type="text"
                placeholder="Nama Lengkap"
                value={fields.nama}
                onChange={handleChange}
              />
              {submitted && errors.nama && <div className={styles.errorMsg}>{errors.nama}</div>}
            </div>
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="nim"
                type="text"
                placeholder="NIM"
                value={fields.nim}
                onChange={handleChange}
              />
              {submitted && errors.nim && <div className={styles.errorMsg}>{errors.nim}</div>}
            </div>
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="hp"
                type="text"
                placeholder="Nomor Handphone"
                value={fields.hp}
                onChange={handleChange}
              />
              {submitted && errors.hp && <div className={styles.errorMsg}>{errors.hp}</div>}
            </div>
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="email"
                type="email"
                placeholder="Email"
                value={fields.email}
                onChange={handleChange}
              />
              {submitted && errors.email && <div className={styles.errorMsg}>{errors.email}</div>}
            </div>
            <div className={styles.formGroup} style={{ position: "relative" }}>
              <input
                className={styles.input}
                name="password"
                type={showPass ? "text" : "password"}
                placeholder="Kata Sandi"
                value={fields.password}
                onChange={handleChange}
              />
              <span className={styles.eyeIcon} onClick={() => setShowPass(x => !x)} tabIndex={0}>
                {showPass ? (
                  <svg width="22" height="22" fill="none"><path d="M2 2L22 22" stroke="#777" strokeWidth="2" /><path d="M17.94 17.94C16.13 19.25 13.88 20 12 20C7 20 2.73 16.11 1 12C1.65 10.48 2.63 9.09 3.86 7.98M8.46 5.29C9.62 5.09 10.78 5 12 5C17 5 21.27 8.89 23 13C22.38 14.55 21.44 16 20.21 17.13" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="3" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/></svg>
                ) : (
                  <svg width="22" height="22" fill="none"><path d="M1 12C2.73 16.11 7 20 12 20C17 20 21.27 16.11 23 12C21.27 7.89 17 4 12 4C7 4 2.73 7.89 1 12Z" stroke="#bbb" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#bbb" strokeWidth="2"/></svg>
                )}
              </span>
              {submitted && errors.password && <div className={styles.errorMsg}>{errors.password}</div>}
            </div>
            <div className={styles.formGroup} style={{ position: "relative" }}>
              <input
                className={styles.input}
                name="konfirmasi"
                type={showConf ? "text" : "password"}
                placeholder="Konfirmasi Kata Sandi"
                value={fields.konfirmasi}
                onChange={handleChange}
              />
              <span className={styles.eyeIcon} onClick={() => setShowConf(x => !x)} tabIndex={0}>
                {showConf ? (
                  <svg width="22" height="22" fill="none"><path d="M2 2L22 22" stroke="#777" strokeWidth="2" /><path d="M17.94 17.94C16.13 19.25 13.88 20 12 20C7 20 2.73 16.11 1 12C1.65 10.48 2.63 9.09 3.86 7.98M8.46 5.29C9.62 5.09 10.78 5 12 5C17 5 21.27 8.89 23 13C22.38 14.55 21.44 16 20.21 17.13" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="3" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/></svg>
                ) : (
                  <svg width="22" height="22" fill="none"><path d="M1 12C2.73 16.11 7 20 12 20C17 20 21.27 16.11 23 12C21.27 7.89 17 4 12 4C7 4 2.73 7.89 1 12Z" stroke="#bbb" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#bbb" strokeWidth="2"/></svg>
                )}
              </span>
              {submitted && errors.konfirmasi && <div className={styles.errorMsg}>{errors.konfirmasi}</div>}
            </div>
            <button
              type="submit"
              className={styles.button}
              disabled={!bolehDaftar}
              style={{ opacity: bolehDaftar ? 1 : 0.5, cursor: bolehDaftar ? 'pointer' : 'not-allowed' }}
            >
              Daftar
            </button>
          </form>

          <div className={styles.registerArea}>
            Punya Akun? <Link href="/Signin/hal-sign" className={styles.registerLink}>Masuk ke Akunmu</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
