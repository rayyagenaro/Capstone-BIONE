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
const useDropdown = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);
    const ref = useRef(null);
    const handleClickOutside = useCallback((event) => {
        if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    }, []);
    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);
    return { isOpen, setIsOpen, ref };
};

// --- SUB-KOMPONEN ---
function LogoutPopup({ open, onCancel, onLogout }) {
    if (!open) return null;
    return (
        <div className={styles.popupOverlay} onClick={onCancel}>
            <div className={styles.popupBox} onClick={e => e.stopPropagation()}>
                <div className={styles.popupMsg}>Apakah Anda yakin ingin logout?</div>
                <div className={styles.popupButtonRow}>
                    <button className={styles.cancelButton} onClick={onCancel}>Batal</button>
                    <button className={styles.logoutButton} onClick={onLogout}>Ya, Logout</button>
                </div>
            </div>
        </div>
    );
}

const Sidebar = ({ onLogoutClick }) => (
    <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}><Image src="/assets/BI_Logo.png" alt="Bank Indonesia" width={110} height={36} priority /></div>
        <nav className={styles.navMenu}>
            <ul>
                <li className={styles.active}><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser'>Beranda</Link></li>
                <li><FaClipboardList className={styles.menuIcon} /><Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link></li>
                <li><FaCog className={styles.menuIcon} /><Link href='/EditProfile/hal-editprofile'>Pengaturan</Link></li>
            </ul>
        </nav>
        <div className={styles.logout} onClick={onLogoutClick} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
            <FaSignOutAlt className={styles.logoutIcon} />Logout
        </div>
    </aside>
);

const SuccessPopup = ({ onClose }) => (
    <div className={styles.popupOverlay}>
        <div className={styles.popupBox}>
            <button className={styles.popupClose} onClick={onClose}>&times;</button>
            <div className={styles.popupIcon}><svg width="70" height="70" viewBox="0 0 70 70"><circle cx="35" cy="35" r="35" fill="#7EDC89" /><polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <div className={styles.popupMsg}><b>Booking DMOVE Telah Berhasil!</b></div>
        </div>
    </div>
);

// --- KOMPONEN UTAMA ---
export default function FiturDmove() {
    const router = useRouter();
    const { isOpen: isVehicleDropdownOpen, setIsOpen: setVehicleDropdownOpen, ref: vehicleDropdownRef } = useDropdown();

    const [fields, setFields] = useState({
        jumlahDriver: '',
        jenisKendaraan: [],
        tujuan: '',
        jumlahOrang: '',
        jumlahKendaraan: 0,
        volumeBarang: '',
        noHp: '',
        keterangan: '',
        file_link: '',
        startDate: new Date(),
        endDate: addDays(new Date(), 1),
    });

    const [errors, setErrors] = useState({});
    const [vehicleTypesOptions, setVehicleTypesOptions] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);

    useEffect(() => {
        setIsLoadingOptions(true);
        fetch('/api/vehicle-types')
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => setVehicleTypesOptions(data))
            .catch(err => console.error("Gagal fetch vehicle types:", err))
            .finally(() => setIsLoadingOptions(false));
    }, []);

    useEffect(() => {
        const totalKendaraan = fields.jenisKendaraan.reduce((sum, vehicle) => sum + vehicle.quantity, 0);
        setFields(prev => ({ ...prev, jumlahKendaraan: totalKendaraan }));
    }, [fields.jenisKendaraan]);

    // Anda harus punya fungsi ini di komponen Anda
    const handleChange = (e) => {
        // Ambil 'name' dan 'value' dari input yang sedang diubah
        const { name, value } = e.target;

        // Update state 'fields' berdasarkan 'name' dari input
        setFields(prevFields => ({
            ...prevFields,
            [name]: value
        }));
    };

    const handleQuantityChange = (option, change) => {
        setFields(prev => {
            const existingVehicle = prev.jenisKendaraan.find(item => item.id === option.id);
            let newSelection = [...prev.jenisKendaraan];
            if (existingVehicle) {
                const newQuantity = existingVehicle.quantity + change;
                if (newQuantity > 0) {
                    newSelection = newSelection.map(item => item.id === option.id ? { ...item, quantity: newQuantity } : item);
                } else {
                    newSelection = newSelection.filter(item => item.id !== option.id);
                }
            } else if (change > 0) {
                newSelection.push({ ...option, quantity: 1 });
            }
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
        if (!fields.tujuan.trim()) err.tujuan = 'Tujuan wajib diisi';
        if (fields.jenisKendaraan.length === 0) err.jenisKendaraan = 'Pilih minimal satu kendaraan';
        if (!fields.noHp.trim()) err.noHp = 'Nomor HP wajib diisi';
        if (!fields.startDate) err.startDate = 'Tanggal mulai wajib diisi';
        if (!fields.endDate) err.endDate = 'Tanggal selesai wajib diisi';
        if (fields.endDate <= fields.startDate) err.endDate = 'Tanggal selesai harus setelah tanggal mulai';
        return err;
    };

    const handleSubmit = async (e) => {
        console.log('1. Fungsi handleSubmit terpanggil.');
        e.preventDefault();
        setSubmitError('');

        const validationErrors = validate();
        console.log('2. Hasil validasi:', validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            console.log('   -> Proses dihentikan karena ada error validasi.');
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setIsSubmitting(true);

        const userDataStr = localStorage.getItem('user');
        if (!userDataStr) {
            console.log('   -> Proses dihentikan karena user data tidak ditemukan di localStorage.');
            setSubmitError("Sesi Anda berakhir. Silakan login kembali.");
            setIsSubmitting(false);
            return;
        }
        const user = JSON.parse(userDataStr);

        const payload = {
            user_id: user.id,
            tujuan: fields.tujuan,
            jumlah_orang: parseInt(fields.jumlahOrang, 10) || null,
            jumlah_kendaraan: fields.jumlahKendaraan,
            volume_kg: parseInt(fields.volumeBarang, 10) || null,
            start_date: fields.startDate.toISOString(),
            end_date: fields.endDate.toISOString(),
            phone: fields.noHp,
            keterangan: fields.keterangan,
            file_link: fields.file_link,
            vehicle_details: fields.jenisKendaraan.map(({ id, quantity }) => ({ id, quantity })),
        };

        console.log('3. PAYLOAD YANG SIAP DIKIRIM:', payload);
        console.log('4. Mencoba mengirim data ke server...');

        try {
            const res = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('5. Respons dari server diterima:', res);

            if (!res.ok) {
                const errorData = await res.json();
                console.error('   -> Server mengembalikan error:', errorData);
                throw new Error(errorData.error || 'Gagal membuat booking.');
            }

            console.log('   -> Booking berhasil!');
            setShowSuccess(true);
        } catch (error) {
            console.error('6. Terjadi error pada blok try-catch:', error.message);
            setSubmitError(error.message);
        } finally {
            console.log('7. Proses selesai, setIsSubmitting(false).');
            setIsSubmitting(false);
        }
    };

    const closeSuccess = () => {
        setShowSuccess(false);
        router.push("/StatusBooking/hal-statusBooking");
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        router.push('/Login/hal-login');
    };

    return (
        <div className={styles.background}>
            <Sidebar onLogoutClick={() => setShowLogoutPopup(true)} />
            <main className={styles.mainContent}>
                <div className={styles.header}>
                    <div className={styles.logoBIWrapper}><Image src="/assets/D'ONE.png" alt="D'ONE" width={170} height={34} priority /></div>
                </div>
                <div className={styles.formBox}>
                    <div className={styles.topRow}>
                        <Link href="/HalamanUtama/hal-utamauser"><button className={styles.backBtn}><FaArrowLeft /> Kembali</button></Link>
                        <div className={styles.logoDmoveWrapper}><Image src="/assets/D'MOVE.png" alt="D'MOVE" width={120} height={85} priority /></div>
                    </div>
                    <form className={styles.formGrid} autoComplete="off" onSubmit={handleSubmit}>
                        <div className={styles.formRow}>
                          <div className={styles.formGroup}><label htmlFor="jumlahDriver">Jumlah Driver</label><input id="jumlahDriver" name="jumlahDriver" type="number" min="1" value={fields.jumlahDriver} onChange={handleChange} className={errors.jumlahDriver ? styles.errorInput : ''} placeholder="Masukkan jumlah driver" />{errors.jumlahDriver && <span className={styles.errorMsg}>{errors.jumlahDriver}</span>}</div>
                            <div className={styles.formGroup}>
                                <label htmlFor="jenisKendaraan">Jenis Kendaraan</label>
                                <div className={`${styles.multiSelectBox} ${errors.jenisKendaraan ? styles.errorInput : ''}`} ref={vehicleDropdownRef} onClick={() => setVehicleDropdownOpen(open => !open)}>
                                    <span className={fields.jenisKendaraan.length ? styles.selectedText : styles.placeholder}>
                                        {isLoadingOptions ? 'Memuat...' : fields.jenisKendaraan.length ? fields.jenisKendaraan.map(v => `${v.name} (${v.quantity})`).join(', ') : 'Pilih Kendaraan'}
                                    </span>
                                    <span className={styles.chevron}>&#9662;</span>
                                    {isVehicleDropdownOpen && (
                                        <div className={styles.multiSelectDropdown}>
                                            {vehicleTypesOptions.map(option => {
                                                const selectedVehicle = fields.jenisKendaraan.find(item => item.id === option.id);
                                                const quantity = selectedVehicle ? selectedVehicle.quantity : 0;
                                                return (
                                                    <div key={option.id} className={styles.quantityOption}>
                                                        <span>{option.name}</span>
                                                        <div className={styles.quantityControl}>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleQuantityChange(option, -1); }} disabled={quantity === 0}>-</button>
                                                            <span>{quantity}</span>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleQuantityChange(option, +1); }}>+</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="jumlahOrang">Jumlah Orang</label>
                                <input id="jumlahOrang" name="jumlahOrang" type="number" min="1" value={fields.jumlahOrang} onChange={handleChange} className={errors.jumlahOrang ? styles.errorInput : ''} />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="jumlahKendaraan">Total Kendaraan</label>
                                <input id="jumlahKendaraan" name="jumlahKendaraan" type="number" value={fields.jumlahKendaraan} readOnly className={styles.readOnlyInput} />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="volumeBarang">Volume Barang (Kg)</label>
                                <input id="volumeBarang" name="volumeBarang" type="number" min="0" value={fields.volumeBarang} onChange={handleChange} className={errors.volumeBarang ? styles.errorInput : ''} />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="startDate">Start Date & Time</label>
                                <DatePicker id="startDate" selected={fields.startDate} onChange={(date) => handleDateChange(date, "startDate")} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam" className={errors.startDate ? styles.errorInput : ''} minDate={new Date()} locale={idLocale} />
                                {errors.startDate && <span className={styles.errorMsg}>{errors.startDate}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="endDate">End Date & Time</label>
                                <DatePicker id="endDate" selected={fields.endDate} onChange={(date) => handleDateChange(date, "endDate")} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam" className={errors.endDate ? styles.errorInput : ''} minDate={fields.startDate} locale={idLocale} />
                                {errors.endDate && <span className={styles.errorMsg}>{errors.endDate}</span>}
                            </div>
                        </div>
                        
                        {/* --- PERBAIKAN TAMPILAN --- */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="noHp">No HP</label>
                                <input id="noHp" name="noHp" type="text" value={fields.noHp} onChange={handleChange} className={errors.noHp ? styles.errorInput : ''} placeholder='Masukkan No HP' />
                                {errors.noHp && <span className={styles.errorMsg}>{errors.noHp}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <label htmlFor="file_link">Link File</label>
                                    <a href="https://onedrive.live.com" target="_blank" rel="noopener noreferrer" style={{ color: "#2667c7", fontWeight: 500, fontSize: 15 }}>Upload di Sini</a>
                                </div>
                                <input id="file_link" name="file_link" type="text" value={fields.file_link} onChange={handleChange} className={errors.file_link ? styles.errorInput : ''} placeholder='Masukkan Link File' />
                                {errors.file_link && <span className={styles.errorMsg}>{errors.file_link}</span>}
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="keterangan">Keterangan Booking</label>
                                <textarea id="keterangan" name="keterangan" rows={2} value={fields.keterangan} onChange={handleChange} className={errors.keterangan ? styles.errorInput : ''} />
                            </div>
                        </div>

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
            <LogoutPopup open={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onLogout={handleLogout} />
        </div>
    );
}