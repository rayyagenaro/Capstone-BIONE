import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './signupAdmin.module.css';

const ROLES = [
  { label: 'Super Admin', value: 1 },
  { label: 'Admin Fitur', value: 2 },
];

export default function SignupAdmin() {
  const router = useRouter();

  const [fields, setFields] = useState({
    nama: '',
    email: '',
    password: '',
    konfirmasi: '',
    role_id: '',
  });

  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); // maks 2
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const roleIsAdminFitur = String(fields.role_id) === '2';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch('/api/services', { cache: 'no-store' });
        if (!active) return;
        if (r.ok) {
          const data = await r.json();
          setServices(Array.isArray(data) ? data : []);
        } else {
          setServices([]);
        }
      } catch {
        setServices([]);
      }
    })();
    return () => { active = false; };
  }, []);

  function validate() {
    const e = {};
    if (!fields.nama) e.nama = 'Nama wajib diisi';
    if (!fields.email) e.email = 'Email wajib diisi';
    if (!fields.password) e.password = 'Kata sandi wajib diisi';
    if (!fields.konfirmasi) e.konfirmasi = 'Konfirmasi wajib diisi';
    if (fields.password && fields.konfirmasi && fields.password !== fields.konfirmasi) {
      e.konfirmasi = 'Konfirmasi tidak cocok';
    }
    if (!fields.role_id) e.role_id = 'Pilih role';

    if (roleIsAdminFitur) {
      if (selectedServices.length < 1) e.services = 'Pilih minimal 1 layanan';
      if (selectedServices.length > 2) e.services = 'Maksimal pilih 2 layanan';
    }
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));

    if (name === 'role_id' && value === '1') {
      setSelectedServices([]);
      setErrors(prev => ({ ...prev, services: undefined }));
    }
  }

  function toggleService(id) {
    setSelectedServices(prev => {
      const exists = prev.includes(id);
      if (exists) {
        const next = prev.filter(x => x !== id);
        if (submitted) setErrors(s => ({ ...s, services: undefined }));
        return next;
        }
      if (prev.length >= 2) {
        setErrors(s => ({ ...s, services: 'Maksimal pilih 2 layanan' }));
        return prev;
      }
      const next = [...prev, id];
      if (submitted) setErrors(s => ({ ...s, services: undefined }));
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    setSubmitted(true);

    if (Object.keys(err).length === 0) {
      try {
        const payload = {
          nama: fields.nama,
          email: fields.email,
          password: fields.password,
          role_id: Number(fields.role_id),
          service_ids: roleIsAdminFitur ? selectedServices : [],
        };

        const res = await fetch('/api/registerAdmin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok) {
          setShowSuccess(true);
          router.replace('/Signin/hal-signAdmin');
        } else {
          alert(data.error || 'Terjadi kesalahan saat mendaftar admin');
        }
      } catch {
        alert('Gagal menghubungi server');
      }
    }
  }

  const bolehDaftar =
    fields.nama &&
    fields.email &&
    fields.password &&
    fields.konfirmasi &&
    fields.role_id &&
    fields.password === fields.konfirmasi &&
    (!roleIsAdminFitur || (selectedServices.length >= 1 && selectedServices.length <= 2));

  function handleBack() {
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
          {/* HEADER */}
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

            {/* SERVICES untuk Admin Fitur */}
            
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.mutedText}>Pilih Layanan (maks 2)</label>
                  <span className={styles.badgeSmall} aria-live="polite">
                    {selectedServices.length} / 2
                  </span>
                </div>

                <div className={styles.checkboxGrid} role="group" aria-label="Pilih layanan">
                  {services.length === 0 ? (
                    <div className={styles.mutedText}>Daftar layanan kosong / gagal diambil</div>
                  ) : (
                    services.map((s) => {
                      const id = s.id;
                      const checked = selectedServices.includes(id);
                      const disabled = !checked && selectedServices.length >= 2;

                      return (
                        <label
                          key={id}
                          className={[
                            styles.checkboxItem,
                            checked ? styles.checked : '',
                            disabled ? styles.disabled : '',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleService(id)}
                          />
                          <span>{s.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>

                {submitted && errors.services && (
                  <div className={styles.errorMsg}>{errors.services}</div>
                )}
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
