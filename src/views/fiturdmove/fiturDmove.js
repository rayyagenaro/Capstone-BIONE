import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './fiturDmove.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';
import { addDays } from 'date-fns';
import idLocale from 'date-fns/locale/id';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// --- CUSTOM HOOKS ---
// Custom hook untuk mengelola state dan event dropdown
const useDropdown = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);
    const ref = useRef(null);

    const handleClickOutside = useCallback((event) => {
        if (ref.current && !ref.current.contains(event.target)) {
            setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    return { isOpen, setIsOpen, ref };
};

// --- SUB-COMPONENTS ---
const Sidebar = () => (
    <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}><Image src="/assets/BI_Logo.png" alt="Bank Indonesia" width={110} height={36} priority /></div>
        <nav className={styles.navMenu}>
            <ul>
                <li className={styles.active}><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser'>Beranda</Link></li>
                <li><FaClipboardList className={styles.menuIcon} /><Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link></li>
                <li><FaCog className={styles.menuIcon} /><Link href='/EditProfile/hal-editprofile'>Pengaturan</Link></li>
            </ul>
        </nav>
        <div className={styles.logout}>
            <Link href="/Login/hal-login"><FaSignOutAlt className={styles.logoutIcon} />Logout</Link>
        </div>
    </aside>
);

const AvailabilitySection = () => {
    const { isOpen, setIsOpen, ref } = useDropdown();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Hanya fetch jika dropdown dibuka dan data belum ada
        if (isOpen && !data && !loading) {
            setLoading(true);
            setError('');
            fetch('/api/availability')
                .then(res => res.ok ? res.json() : Promise.reject('Gagal mengambil data.'))
                .then(setData)
                .catch(setError)
                .finally(() => setLoading(false));
        }
    }, [isOpen, data, loading]);

    const renderStatus = (count) => (
        count === 0
            ? <span style={{ color: 'red', fontWeight: 'bold' }}>Tidak tersedia</span>
            : count
    );

    return (
        <div className={styles.availabilitySection}>
            <div className={styles.availabilityLabel}>Availability</div>
            <div className={styles.availabilityDropdownWrap} ref={ref}>
                <button type="button" className={styles.availabilityDropdownBtn} onClick={() => setIsOpen(v => !v)}>
                    Lihat Ketersediaan <span className={styles.availChevron}>▼</span>
                </button>
                {isOpen && (
                    <div className={styles.availabilityDropdown}>
                        {loading && <div>Loading...</div>}
                        {error && <div style={{ color: 'red', padding: 4 }}>{error}</div>}
                        {data && (
                            <table>
                                <thead><tr><th>Jenis</th><th>Jumlah</th></tr></thead>
                                <tbody>
                                    <tr><td>Driver</td><td>{renderStatus(data.drivers)}</td></tr>
                                    {Array.isArray(data.vehicles) && data.vehicles.map(v => (
                                        <tr key={v.jenis}><td>{v.jenis}</td><td>{renderStatus(v.jumlah)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const SuccessPopup = ({ onClose }) => (
    <div className={styles.popupOverlay}>
        <div className={styles.popupBox}>
            <button className={styles.popupClose} onClick={onClose}>&times;</button>
            <div className={styles.popupIcon}>
                <svg width="70" height="70" viewBox="0 0 70 70"><circle cx="35" cy="35" r="35" fill="#7EDC89" /><polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className={styles.popupMsg}><b>Booking DMOVE Telah Berhasil!</b></div>
        </div>
    </div>
);


// --- MAIN COMPONENT ---
export default function FiturDmove() {
    const router = useRouter();
    const { isOpen: isVehicleDropdownOpen, setIsOpen: setVehicleDropdownOpen, ref: vehicleDropdownRef } = useDropdown();

    const [fields, setFields] = useState({
        jumlahDriver: '',
        jenisKendaraan: [], // Ini akan menyimpan objek {id, name}
        tujuan: '',
        jumlahOrang: '',
        jumlahKendaraan: '',
        volumeBarang: '',
        noHp: '',
        keterangan: '',
        attachment: '',
        startDate: new Date(),
        endDate: addDays(new Date(), 2),
    });

    const [errors, setErrors] = useState({});
    const [vehicleTypesOptions, setVehicleTypesOptions] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // Fetch vehicle types dari API saat komponen pertama kali dimuat
    useEffect(() => {
        setIsLoadingOptions(true);
        fetch('/api/vehicle-types')
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => setVehicleTypesOptions(data))
            .catch(err => console.error("Gagal fetch vehicle types:", err))
            .finally(() => setIsLoadingOptions(false));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFields(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleJenisKendaraanChange = (option) => {
        setFields(prev => {
            const isSelected = prev.jenisKendaraan.some(item => item.id === option.id);
            const newSelection = isSelected
                ? prev.jenisKendaraan.filter(item => item.id !== option.id)
                : [...prev.jenisKendaraan, option];
            return { ...prev, jenisKendaraan: newSelection };
        });
        if (errors.jenisKendaraan) setErrors(prev => ({ ...prev, jenisKendaraan: null }));
    };

    const handleDateChange = (date, field) => {
        setFields(prev => ({ ...prev, [field]: date }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const validate = () => {
        const err = {};
        if (!fields.jumlahDriver || Number(fields.jumlahDriver) < 1) err.jumlahDriver = 'Isi jumlah driver';
        if (fields.jenisKendaraan.length === 0) err.jenisKendaraan = 'Pilih minimal satu kendaraan';
        if (!fields.tujuan) err.tujuan = 'Isi tujuan booking';
        if (!fields.jumlahOrang) err.jumlahOrang = 'Isi jumlah orang';
        if (!fields.jumlahKendaraan || Number(fields.jumlahKendaraan) < 1) err.jumlahKendaraan = 'Isi jumlah kendaraan valid';
        if (!fields.volumeBarang) err.volumeBarang = 'Isi volume barang';
        if (!fields.startDate) err.startDate = 'Isi tanggal & jam mulai';
        if (!fields.endDate) err.endDate = 'Isi tanggal & jam selesai';
        if (fields.endDate < fields.startDate) err.endDate = 'Tanggal selesai harus setelah tanggal mulai';
        if (!fields.noHp) err.noHp = 'Isi nomor HP';
        if (!fields.keterangan) err.keterangan = 'Isi keterangan booking';
        if (!fields.attachment) err.attachment = 'Isi link file';
        return err;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        const validationErrors = validate();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) return;

        setIsSubmitting(true);

        const userDataStr = localStorage.getItem('user');
        if (!userDataStr) {
            setSubmitError("Sesi Anda berakhir. Silakan login kembali.");
            setIsSubmitting(false);
            return;
        }
        const user = JSON.parse(userDataStr);

        // Siapkan payload untuk dikirim ke API
        const payload = {
            user_id: user.id,
            tujuan: fields.tujuan,
            jumlah_orang: parseInt(String(fields.jumlahOrang).replace(/\D/g, ''), 10) || null,
            jumlah_kendaraan: parseInt(fields.jumlahKendaraan, 10) || null,
            volume_kg: parseInt(String(fields.volumeBarang).replace(/\D/g, ''), 10) || null,
            start_date: fields.startDate.toISOString(),
            end_date: fields.endDate.toISOString(),
            phone: fields.noHp,
            keterangan: fields.keterangan,
            file_link: fields.attachment, // Sesuaikan dengan nama kolom di DB
            vehicle_type_ids: fields.jenisKendaraan.map(v => v.id), // Kirim array of IDs
        };

        try {
            const res = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Gagal membuat booking.');
            }
            setShowSuccess(true);
        } catch (error) {
            setSubmitError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    function closeSuccess() {
        setShowSuccess(false);
        router.push("/StatusBooking/hal-statusBooking");
    }

    return (
        <div className={styles.background}>
            <Sidebar />

            <main className={styles.mainContent}>
                <div className={styles.header}>
                    <div className={styles.logoBIWrapper}><Image src="/assets/D'ONE.png" alt="D'ONE" width={170} height={34} priority /></div>
                </div>

                <div className={styles.formBox}>
                    <div className={styles.topRow}>
                        <Link href="/HalamanUtama/hal-utamauser">
                            <button className={styles.backBtn}><FaArrowLeft /> Kembali</button>
                        </Link>
                        <div className={styles.logoDmoveWrapper}><Image src="/assets/D'MOVE.png" alt="D'MOVE" width={120} height={85} priority /></div>
                        <AvailabilitySection />
                    </div>

                    <form className={styles.formGrid} autoComplete="off" onSubmit={handleSubmit}>
                        {/* JUMLAH DRIVER */}
                        <div className={styles.formRow}>
                             <div className={styles.formGroup}><label htmlFor="jumlahDriver">Jumlah Driver</label><input id="jumlahDriver" name="jumlahDriver" type="number" min={1} value={fields.jumlahDriver} onChange={handleChange} className={errors.jumlahDriver ? styles.errorInput : ''} placeholder="Masukkan jumlah driver" />{errors.jumlahDriver && <span className={styles.errorMsg}>{errors.jumlahDriver}</span>}</div>
                        </div>

                        {/* JENIS KENDARAAN & TUJUAN */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="jenisKendaraan">Jenis Kendaraan</label>
                                <div className={`${styles.multiSelectBox} ${errors.jenisKendaraan ? styles.errorInput : ''}`} ref={vehicleDropdownRef} onClick={() => setVehicleDropdownOpen(open => !open)}>
                                    <span className={fields.jenisKendaraan.length ? styles.selectedText : styles.placeholder}>
                                        {isLoadingOptions ? 'Memuat...' : fields.jenisKendaraan.length ? fields.jenisKendaraan.map(v => v.name).join(', ') : 'Pilih Kendaraan'}
                                    </span>
                                    <span className={styles.chevron}>&#9662;</span>
                                    {isVehicleDropdownOpen && (
                                        <div className={styles.multiSelectDropdown}>
                                            {vehicleTypesOptions.map(option => (
                                                <label key={option.id} className={styles.multiSelectOption}>
                                                    <input type="checkbox" checked={fields.jenisKendaraan.some(item => item.id === option.id)} onChange={() => handleJenisKendaraanChange(option)} />
                                                    <span>{option.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {errors.jenisKendaraan && <span className={styles.errorMsg}>{errors.jenisKendaraan}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="tujuan">Tujuan</label>
                                <input id="tujuan" name="tujuan" type="text" value={fields.tujuan} onChange={handleChange} className={errors.tujuan ? styles.errorInput : ''} placeholder="cth: Kantor Pusat Jakarta" />
                                {errors.tujuan && <span className={styles.errorMsg}>{errors.tujuan}</span>}
                            </div>
                        </div>

                         {/* JUMLAH ORANG, KENDARAAN, VOLUME */}
                        <div className={styles.formRow3}>
                             <div className={styles.formGroup}><label htmlFor="jumlahOrang">Jumlah Orang</label><input id="jumlahOrang" name="jumlahOrang" type="text" value={fields.jumlahOrang} onChange={handleChange} className={errors.jumlahOrang ? styles.errorInput : ''} />{errors.jumlahOrang && <span className={styles.errorMsg}>{errors.jumlahOrang}</span>}</div>
                             <div className={styles.formGroup}><label htmlFor="jumlahKendaraan">Jumlah Kendaraan</label><input id="jumlahKendaraan" name="jumlahKendaraan" type="number" min="1" value={fields.jumlahKendaraan} onChange={handleChange} className={errors.jumlahKendaraan ? styles.errorInput : ''} />{errors.jumlahKendaraan && <span className={styles.errorMsg}>{errors.jumlahKendaraan}</span>}</div>
                             <div className={styles.formGroup}><label htmlFor="volumeBarang">Volume Barang (Kg)</label><input id="volumeBarang" name="volumeBarang" type="text" value={fields.volumeBarang} onChange={handleChange} className={errors.volumeBarang ? styles.errorInput : ''} />{errors.volumeBarang && <span className={styles.errorMsg}>{errors.volumeBarang}</span>}</div>
                        </div>

                        {/* TANGGAL */}
                        <div className={styles.formRow}>
                             <div className={styles.formGroup}><label htmlFor="startDate">Start Date & Time</label><DatePicker id="startDate" selected={fields.startDate} onChange={(date) => handleDateChange(date, "startDate")} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam" className={errors.startDate ? styles.errorInput : ''} minDate={new Date()} locale={idLocale} />{errors.startDate && <span className={styles.errorMsg}>{errors.startDate}</span>}</div>
                             <div className={styles.formGroup}><label htmlFor="endDate">End Date & Time</label><DatePicker id="endDate" selected={fields.endDate} onChange={(date) => handleDateChange(date, "endDate")} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam" className={errors.endDate ? styles.errorInput : ''} minDate={fields.startDate} locale={idLocale} />{errors.endDate && <span className={styles.errorMsg}>{errors.endDate}</span>}</div>
                        </div>

                        {/* NO HP */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="noHp">No HP</label>
                                <input id="noHp" name="noHp" type="text" value={fields.noHp} onChange={handleChange} className={errors.noHp ? styles.errorInput : ''} />
                                {errors.noHp && <span className={styles.errorMsg}>{errors.noHp}</span>}
                            </div>
                        </div>

                        {/* KETERANGAN & ATTACHMENT */}
                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label htmlFor="keterangan">Keterangan Booking</label>
                            <textarea id="keterangan" name="keterangan" rows={2} value={fields.keterangan} onChange={handleChange} className={errors.keterangan ? styles.errorInput : ''} />
                            {errors.keterangan && <span className={styles.errorMsg}>{errors.keterangan}</span>}
                          </div>
                          <div className={styles.formGroup}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <label htmlFor="attachment" style={{ marginBottom: 0 }}>Link File</label>
                              <a
                                href="https://drive.google.com/drive/u/0/folders/1gB0vvv6Bbl7Kc_mX_Nsuywk6BNeyI55k"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#2667c7", fontWeight: 500, fontSize: 15, marginLeft: 15, textDecoration: "underline", cursor: "pointer" }}
                              >
                                Upload di Sini
                              </a>
                            </div>
                            <input
                              id="attachment"
                              name="attachment"
                              type="text"
                              placeholder="Masukkan link file di OneDrive"
                              value={fields.attachment}
                              onChange={handleChange}
                              className={errors.attachment ? styles.errorInput : ''}
                              autoComplete="off"
                            />
                            {errors.attachment && <span className={styles.errorMsg}>{errors.attachment}</span>}
                          </div>
                        </div>

                        {/* TOMBOL SUBMIT */}
                        <div className={styles.buttonWrapper}>
                            <button type="submit" className={styles.bookingBtn} disabled={isSubmitting}>
                                {isSubmitting ? 'Memproses...' : 'Booking'}
                            </button>
                        </div>
                        {submitError && <div className={styles.submitErrorMsg}>{submitError}</div>}
                    </form>
                </div>

                {showSuccess && <SuccessPopup onClose={closeSuccess} />}
            </main>
        </div>
    );
}