// fiturbimeet.js
import React, { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaArrowLeft } from "react-icons/fa";
import DatePicker from "react-datepicker";
import idLocale from "date-fns/locale/id";
import "react-datepicker/dist/react-datepicker.css";

import styles from "./fiturBimeet.module.css";
import SidebarUser from "@/components/SidebarUser/SidebarUser";
import LogoutPopup from "@/components/LogoutPopup/LogoutPopup";

/* ====== FALLBACK ROOMS (kalau API availability belum siap) ====== */
const FALLBACK_ROOMS = [
  { id: 1, name: "Ruang Rapat SP", floor: 2, capacity: 15 },
  { id: 2, name: "Ruang Rapat MI", floor: 3, capacity: 15 },
  { id: 3, name: "Ruangan Blambangan", floor: 4, capacity: 50 },
  { id: 4, name: "Ruangan Jenggolo", floor: 4, capacity: 15 },
  { id: 5, name: "Ruangan Integritas", floor: 4, capacity: 15 },
  { id: 6, name: "Ruangan Profesionalisme", floor: 4, capacity: 15 },
  { id: 7, name: "Ruangan Kahuripan", floor: 5, capacity: 70 },
  { id: 8, name: "Ruangan Singosari", floor: 5, capacity: 300 },
];

/* ====== DIVISI (ringkas) ====== */
const UNIT_KERJA_BI = [
  "Hubungan Masyarakat",
  "Sistem Pembayaran",
  "Pengelolaan Uang Rupiah",
  "Fungsi Data & Statistik Ekonomi & Keuangan",
  "Kelompok Perumusan Kebijakan Daerah",
  "Tim Manajemen Internal",
];

/* ====== POPUP SUKSES ====== */
const SuccessPopup = ({ onClose }) => (
  <div className={styles.popupOverlay}>
    <div className={styles.popupBox}>
      <button className={styles.popupClose} onClick={onClose}>
        &times;
      </button>
      <div className={styles.popupIcon}>
        <svg width="70" height="70" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="35" fill="#7EDC89" />
          <polyline
            points="23,36 33,46 48,29"
            fill="none"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className={styles.popupMsg}>
        <b>Pengajuan BI.MEET Berhasil!</b>
      </div>
    </div>
  </div>
);

export default function FiturBimeet() {
  const router = useRouter();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showAvail, setShowAvail] = useState(false);

  // ====== FORM STATE (tanggal sebagai Date)
  const [fields, setFields] = useState({
    roomId: "",
    unitKerja: "",
    agenda: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000),
    picName: "",
    picPhone: "",
    participants: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});

  // ====== AVAILABILITY STATE (dari API baru)
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState("");
  const [availRooms, setAvailRooms] = useState([]); // {id,name,floor,capacity,status_name,available}

  // Ambil data availability tiap kali tanggal berubah ATAU dropdown dibuka
  useEffect(() => {
    const fetchAvail = async () => {
      setAvailError("");
      setAvailLoading(true);
      try {
        const qs = new URLSearchParams({
          start: fields.startDate.toISOString(),
          end: fields.endDate.toISOString(),
        });
        const r = await fetch(`/api/bimeet/availability?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const list = Array.isArray(j?.rooms) ? j.rooms : [];
        setAvailRooms(
          list.length
            ? list
            : FALLBACK_ROOMS.map((x) => ({
                ...x,
                status_name: "Available",
                available: true,
              }))
        );
      } catch (e) {
        setAvailError(e.message || "Gagal mengambil data");
        setAvailRooms(
          FALLBACK_ROOMS.map((x) => ({
            ...x,
            status_name: "Available",
            available: true,
          }))
        );
      } finally {
        setAvailLoading(false);
      }
    };

    if (showAvail) fetchAvail();
  }, [fields.startDate, fields.endDate, showAvail]);

  // Gunakan availRooms untuk select options (kalau kosong, pakai fallback)
  const roomOptions = useMemo(() => {
    const base = availRooms.length ? availRooms : FALLBACK_ROOMS;
    return [...base].sort((a, b) =>
      a.floor === b.floor ? a.name.localeCompare(b.name) : a.floor - b.floor
    );
  }, [availRooms]);

  const selectedRoom = useMemo(
    () => roomOptions.find((r) => String(r.id) === String(fields.roomId)),
    [fields.roomId, roomOptions]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const handleDateChange = (date, key) => {
    setFields((prev) => ({ ...prev, [key]: date }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const durationText = useCallback(() => {
    const ms = fields.endDate - fields.startDate;
    if (!ms || ms <= 0 || Number.isNaN(ms)) return "-";
    const mins = Math.round(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h} jam ${m} menit`;
    if (h) return `${h} jam`;
    return `${m} menit`;
  }, [fields.startDate, fields.endDate]);

  // ====== VALIDASI
  const validate = () => {
    const er = {};
    if (!fields.roomId) er.roomId = "Pilih ruangan terlebih dahulu";
    if (!fields.unitKerja) er.unitKerja = "Unit kerja wajib dipilih";
    if (!fields.agenda.trim()) er.agenda = "Agenda rapat wajib diisi";
    if (!fields.startDate) er.startDate = "Mulai pemakaian wajib diisi";
    if (!fields.endDate) er.endDate = "Selesai pemakaian wajib diisi";
    if (fields.endDate && fields.startDate && fields.endDate <= fields.startDate)
      er.endDate = "Selesai harus setelah mulai";
    if (!fields.picName.trim()) er.picName = "Nama PIC wajib diisi";
    if (!fields.picPhone.trim()) er.picPhone = "Nomor WA PIC wajib diisi";
    if (!fields.participants || Number(fields.participants) <= 0)
      er.participants = "Jumlah peserta wajib diisi";
    if (selectedRoom && Number(fields.participants) > (selectedRoom.capacity || 0))
      er.participants = `Melebihi kapasitas (${selectedRoom.capacity} Orang).`;

    // jika di availability statusnya tidak available → blokir
    if (fields.roomId) {
      const r = availRooms.find((x) => String(x.id) === String(fields.roomId));
      if (r && r.available === false) {
        er.roomId = `Ruangan "${r.name}" sedang tidak tersedia (${
          r.status_name || "Booked/Maintenance"
        }).`;
      }
    }
    return er;
  };

  // ====== SUBMIT
  const submit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const er = validate();
    if (Object.keys(er).length) {
      setErrors(er);
      return;
    }

    setIsSubmitting(true);
    try {
      const meRes = await fetch("/api/me?scope=user", { cache: "no-store" });
      const me = await meRes.json();
      if (!me?.hasToken || !me?.payload?.sub) {
        setIsSubmitting(false);
        setSubmitError("Sesi Anda berakhir. Silakan login kembali.");
        return;
      }

      const payload = {
        user_id: me.payload.sub,
        room_id: Number(fields.roomId),
        unit_kerja: fields.unitKerja,
        title: fields.agenda,
        description: fields.notes || null,
        start_datetime: fields.startDate.toISOString(),
        end_datetime: fields.endDate.toISOString(),
        participants: Number(fields.participants),
        contact_phone: fields.picPhone,
        pic_name: fields.picName,
      };

      const res = await fetch("/api/bimeet/createbooking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const t = await res.text();
          if (t) msg += ` – ${t}`;
        } catch {}
        throw new Error(msg);
      }

      setShowSuccess(true);
    } catch (err) {
      setSubmitError(err.message || "Gagal membuat pengajuan BI.MEET.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccess = () => {
    setShowSuccess(false);
    router.push("/User/StatusBooking/hal-statusBooking");
  };
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/Signin/hal-sign");
    }
  };

  /* ====== BADGE Ketersediaan (kolom tunggal) ====== */
  const StatusBadge = ({ status, available }) => {
    const s = String(status || "").toLowerCase();
    let color = "#1f8f4e";
    let text = "Tersedia";

    if (s === "maintenance") {
      color = "#d35400";
      text = "Maintenance";
    } else if (available === false) {
      color = "#c0392b";
      text = "Tidak tersedia";
    }
    return <span style={{ fontWeight: 700, color }}>{text}</span>;
  };

  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          {/* TOP ROW */}
          <div className={styles.topRow}>

              <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
              </button>
            

            <div className={styles.logoWrapper}>
              <Image src="/assets/D'ROOM.svg" alt="BI.MEET" width={180} height={85} priority />
            </div>

            <div className={styles.availabilitySection}>
              <div className={styles.availabilityLabel}>Availability</div>
              <div className={styles.availabilityDropdownWrap}>
                <button
                  type="button"
                  className={styles.availabilityDropdownBtn}
                  onClick={() => setShowAvail((v) => !v)}
                >
                  Lihat Ketersediaan <span className={styles.availChevron}>▼</span>
                </button>

                {showAvail && (
                  <div className={styles.availabilityDropdown}>
                    {availLoading && <div>Memuat...</div>}
                    {availError && (
                      <div style={{ color: "red", paddingBottom: 8 }}>
                        {availError}
                      </div>
                    )}
                    {!availLoading && (
                      <table>
                        <thead>
                          <tr>
                            <th>Ruangan</th>
                            <th>Lantai</th>
                            <th>Kapasitas</th>
                            {/* Kolom Status DIHAPUS */}
                            <th>Ketersediaan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomOptions.map((r) => (
                            <tr key={r.id}>
                              <td>{r.name}</td>
                              <td>{r.floor}</td>
                              <td>{r.capacity} Orang</td>
                              {/* Sel Status DIHAPUS */}
                              <td>
                                <StatusBadge
                                  status={r.status_name}
                                  available={r.available !== false}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FORM */}
          <form className={styles.formGrid} autoComplete="off" onSubmit={submit}>
            {/* Ruangan */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="roomId">Ruangan Rapat yang Digunakan</label>
                <select
                  id="roomId"
                  name="roomId"
                  value={fields.roomId}
                  onChange={handleChange}
                  className={`${styles.selectReset} ${errors.roomId ? styles.errorInput : ""}`}
                >
                  <option value="">— Pilih Ruangan —</option>
                  {[2, 3, 4, 5].map((lt) => (
                    <optgroup key={lt} label={`Lantai ${lt}`}>
                      {roomOptions
                        .filter((r) => r.floor === lt)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.capacity} Orang)
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                {errors.roomId && <span className={styles.errorMsg}>{errors.roomId}</span>}
              </div>
            </div>

            {/* Unit Kerja */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="unitKerja">Unit Kerja (Divisi)</label>
                <select
                  id="unitKerja"
                  name="unitKerja"
                  value={fields.unitKerja}
                  onChange={handleChange}
                  className={`${styles.selectReset} ${errors.unitKerja ? styles.errorInput : ""}`}
                >
                  <option value="">— Pilih Unit Kerja —</option>
                  {UNIT_KERJA_BI.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                {errors.unitKerja && <span className={styles.errorMsg}>{errors.unitKerja}</span>}
              </div>
            </div>

            {/* Agenda */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="agenda">Agenda Rapat</label>
                <input
                  id="agenda"
                  name="agenda"
                  type="text"
                  placeholder="cth: Koordinasi Proyek X"
                  value={fields.agenda}
                  onChange={handleChange}
                  className={errors.agenda ? styles.errorInput : ""}
                />
                {errors.agenda && <span className={styles.errorMsg}>{errors.agenda}</span>}
              </div>
            </div>

            {/* Waktu & Durasi */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="startDate">Mulai Pemakaian</label>
                <DatePicker
                  id="startDate"
                  selected={fields.startDate}
                  onChange={(d) => handleDateChange(d, "startDate")}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd MMMM yyyy HH:mm"
                  timeCaption="Jam"
                  className={errors.startDate ? styles.errorInput : ""}
                  minDate={new Date()}
                  locale={idLocale}
                />
                {errors.startDate && <span className={styles.errorMsg}>{errors.startDate}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="endDate">Selesai Pemakaian</label>
                <DatePicker
                  id="endDate"
                  selected={fields.endDate}
                  onChange={(d) => handleDateChange(d, "endDate")}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd MMMM yyyy HH:mm"
                  timeCaption="Jam"
                  className={errors.endDate ? styles.errorInput : ""}
                  minDate={fields.startDate}
                  locale={idLocale}
                />
                {errors.endDate && <span className={styles.errorMsg}>{errors.endDate}</span>}
              </div>

              <div className={styles.formGroup}>
                <label>Durasi</label>
                <input type="text" readOnly value={durationText()} className={styles.readOnlyInput} />
              </div>
            </div>

            {/* PIC & WA */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="picName">Nama PIC Pemesanan</label>
                <input
                  id="picName"
                  name="picName"
                  type="text"
                  value={fields.picName}
                  onChange={handleChange}
                  className={errors.picName ? styles.errorInput : ""}
                />
                {errors.picName && <span className={styles.errorMsg}>{errors.picName}</span>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="picPhone">Nomor WA PIC</label>
                <input
                  id="picPhone"
                  name="picPhone"
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={fields.picPhone}
                  onChange={handleChange}
                  className={errors.picPhone ? styles.errorInput : ""}
                />
                {errors.picPhone && <span className={styles.errorMsg}>{errors.picPhone}</span>}
              </div>
            </div>

            {/* Peserta */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="participants">Jumlah Peserta</label>
                <input
                  id="participants"
                  name="participants"
                  type="number"
                  min="1"
                  value={fields.participants}
                  onChange={handleChange}
                  className={errors.participants ? styles.errorInput : ""}
                />
                {errors.participants && (
                  <span className={styles.errorMsg}>{errors.participants}</span>
                )}
              </div>
            </div>

            {/* Keterangan */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="notes">Keterangan</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={fields.notes}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Submit */}
            <div className={styles.buttonWrapper}>
              <button type="submit" className={styles.bookingBtn} disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Booking"}
              </button>
            </div>

            {submitError && (
              <div className={styles.errorMsg} style={{ textAlign: "center", marginTop: 8 }}>
                {submitError}
              </div>
            )}
          </form>
        </div>
      </main>

      {showSuccess && <SuccessPopup onClose={closeSuccess} />}
      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
