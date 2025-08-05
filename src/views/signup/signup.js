import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './signup.module.css';

export default function Signup() {
  const [fields, setFields] = useState({
    nama: '',
    nip: '',
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
    if (!fields.nip) e.nip = "NIP wajib diisi";
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

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    setSubmitted(true);

    if (Object.keys(err).length === 0) {
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: fields.nama,
            nip: fields.nip,
            hp: fields.hp,
            email: fields.email,
            password: fields.password,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          alert('Registrasi berhasil!');
          // Redirect ke halaman login jika mau
          window.location.href = '/Signin/hal-sign';
        } else {
          alert(data.error || 'Terjadi kesalahan saat mendaftar');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Gagal terhubung ke server');
      }
    }
  }

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
            {/* Nama */}
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

            {/* NIP */}
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="nip"
                type="text"
                placeholder="NIP"
                value={fields.nip}
                onChange={handleChange}
              />
              {submitted && errors.nip && <div className={styles.errorMsg}>{errors.nip}</div>}
            </div>

            {/* HP */}
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

            {/* Email */}
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

            {/* Password */}
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
                {/* (Ikon eye SVG tidak diubah) */}
              </span>
              {submitted && errors.password && <div className={styles.errorMsg}>{errors.password}</div>}
            </div>

            {/* Konfirmasi */}
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
                {/* (Ikon eye SVG tidak diubah) */}
              </span>
              {submitted && errors.konfirmasi && <div className={styles.errorMsg}>{errors.konfirmasi}</div>}
            </div>

            {/* Tombol Daftar */}
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
