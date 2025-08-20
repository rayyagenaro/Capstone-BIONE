import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';

const ymd = (d) => {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const getMonthMatrix = (year, monthIndex0) => {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const lastOfMonth  = new Date(year, monthIndex0 + 1, 0);
  const firstDayIdxSun0 = firstOfMonth.getDay();
  const firstDayIdxMon0 = (firstDayIdxSun0 + 6) % 7;
  const daysInMonth = lastOfMonth.getDate();
  const cells = [];
  for (let i = 0; i < firstDayIdxMon0; i++) cells.push(new Date(year, monthIndex0, 1 - (firstDayIdxMon0 - i)));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex0, d));
  while (cells.length < 42) { const l = cells[cells.length-1]; cells.push(new Date(l.getFullYear(), l.getMonth(), l.getDate()+1)); }
  const weeks = []; for (let i=0; i<42; i+=7) weeks.push(cells.slice(i,i+7)); return weeks;
};
const SESSIONS = ['12:00','12:30','13:00'];

export default function CalendarAdmin({ doctorId = 1, styles }) {
    const today = new Date();
    const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [bookedMap, setBookedMap] = useState({});
    const [adminMap, setAdminMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState(() => new Set());

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const matrix = useMemo(() => getMonthMatrix(year, month), [year, month]);
    const monthName = cursor.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    const isSameMonth = (d) => d.getMonth() === month && d.getFullYear() === year;
    const isDoctorDay = (d) => { const dow = d.getDay(); return dow === 1 || dow === 5; };

    // ganti isi fetchMonth jadi mengambil dari /api/BIcare/booked
    const toHHMM = (t) => String(t).slice(0,5);

    const fetchMonth = useCallback(async (y_m) => {
    setLoading(true);
    try {
        // gunakan endpoint yang sama seperti di user
        const res = await fetch(
        `/api/BIcare/booked?doctorId=${doctorId}&month=${y_m}&t=${Date.now()}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
        );
        if (!res.ok) throw new Error('fetch calendar fail');
        const data = await res.json();

        // NORMALISASI -> simpan sebagai HH:MM
        const map = {};
        for (const [k, arr] of Object.entries(data.bookedMap || {})) {
        map[k] = (arr || []).map(toHHMM);
        }
        const admin = {};
        for (const [k, arr] of Object.entries(data.adminBlocks || {})) {
        admin[k] = new Set((arr || []).map(toHHMM));
        }

        setBookedMap(map);
        setAdminMap(admin);
    } catch (e) {
        alert('Gagal memuat kalender');
    }
    setLoading(false);
    }, [doctorId]);

    // (opsional) guard kalau suatu saat ada data HH:MM:SS yang lolos:
    const isBooked = (dateStr, time) => {
    const arr = bookedMap[dateStr] || [];
    return arr.includes(time) || arr.includes(`${time}:00`);
    };
    const isAdminBlocked = (dateStr, time) => {
    const s = adminMap[dateStr];
    return !!(s && (s.has(time) || s.has(`${time}:00`)));
    };


  const lastYmRef = useRef(null);
  useEffect(() => {
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (lastYmRef.current !== ym) {
      lastYmRef.current = ym;
      fetchMonth(ym);
    }
  }, [year, month, fetchMonth]);

  const addBookedAdminLocal = (dateStr, time) => {
    setBookedMap(prev => { const arr = new Set(prev[dateStr] || []); arr.add(time); return { ...prev, [dateStr]: Array.from(arr) }; });
    setAdminMap(prev => { const set = new Set(prev[dateStr] || []); set.add(time); return { ...prev, [dateStr]: set }; });
  };
  const removeBookedAdminLocal = (dateStr, time) => {
    setBookedMap(prev => { const arr = new Set(prev[dateStr] || []); arr.delete(time); return { ...prev, [dateStr]: Array.from(arr) }; });
    setAdminMap(prev => { const set = new Set(prev[dateStr] || []); set.delete(time); return { ...prev, [dateStr]: set }; });
  };

  const toggleSlot = async (dateObj, time) => {
    const dateStr = ymd(dateObj);
    const booked = isBooked(dateStr, time);
    const adminBlocked = isAdminBlocked(dateStr, time);
    const slotKey = `${dateStr}_${time}`;

    if (booked && !adminBlocked) {
      alert('Slot ini sudah dibooking pengguna. Tidak dapat diubah dari sini.');
      return;
    }

    const action = adminBlocked ? 'unblock' : 'block';
    const ok = confirm(
      adminBlocked
        ? `Buka kembali slot ${time} pada ${dateObj.toLocaleDateString('id-ID')}?`
        : `Tutup slot ${time} pada ${dateObj.toLocaleDateString('id-ID')} untuk pasien?`
    );
    if (!ok) return;

    setPending(prev => new Set(prev).add(slotKey));
    if (action === 'block') addBookedAdminLocal(dateStr, time);
    else removeBookedAdminLocal(dateStr, time);

    try {
      const res = await fetch('/api/ketersediaanAdmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bicare_calendar', action, doctorId, bookingDate: dateStr, slotTime: time })
      });
      const out = await res.json();
      if (!res.ok || !out.success) {
        const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
        await fetchMonth(ym);
        alert(out.message || 'Gagal menyimpan perubahan slot.');
        return;
      }
      const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
      fetchMonth(ym);
    } catch (e) {
      const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
      await fetchMonth(ym);
      alert('Gagal mengubah slot (jaringan/server).');
    } finally {
      setPending(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
    }
  };

  return (
    <div className={styles.calWrap}>
      <div className={styles.calHeader}>
        <button type="button" className={styles.calNavBtn} onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Bulan sebelumnya">‹</button>
        <div className={styles.calTitle}>{monthName} {loading ? <span className={styles.calLoading}>(memuat...)</span> : null}</div>
        <button type="button" className={styles.calNavBtn} onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Bulan berikutnya">›</button>
      </div>

      <div className={styles.calDayNames}>
        {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d) => <div key={d} className={styles.calDayName}>{d}</div>)}
      </div>

      <div className={styles.calGrid}>
        {matrix.map((week, wi) => (
          <React.Fragment key={wi}>
            {week.map((d, di) => {
              const inMonth = isSameMonth(d);
              const dateStr = ymd(d);
              const doctorOpen = inMonth && isDoctorDay(d);
              return (
                <div key={`${wi}-${di}`} className={`${styles.calCell} ${inMonth ? '' : styles.calCellMuted}`}>
                  <div className={styles.calCellHeader}>
                    <span className={styles.calDateNum}>{d.getDate()}</span>
                    {inMonth && isDoctorDay(d) && <span className={styles.calBadgeOpen}>Buka</span>}
                  </div>

                  {doctorOpen ? (
                    <div className={styles.sessionList}>
                    {SESSIONS.map((time) => {
                    const adminBlocked  = isAdminBlocked(dateStr, time);
                    const bookedByUser  = isBooked(dateStr, time) && !adminBlocked;

                    const slotKey   = `${dateStr}_${time}`;
                    const isPending = pending.has(slotKey);

                    const disabled  = isPending || bookedByUser;   // bookedByUser -> tidak bisa diklik
                    const state     = adminBlocked ? 'admin' : (bookedByUser ? 'booked' : 'open');

                    const cls = (adminBlocked || bookedByUser)
                        ? styles.sessionBooked
                        : styles.sessionAvail;

                    const caption = adminBlocked
                        ? '• Ditutup'
                        : (bookedByUser ? '• Booked' : '• Available');

                    return (
                        <button
                        key={time}
                        type="button"
                        className={`${styles.sessionBtn} ${cls}`}
                        data-state={state}
                        disabled={disabled}
                        onClick={disabled ? undefined : () => toggleSlot(d, time)}
                        title={
                            adminBlocked ? 'Ditutup Admin'
                            : (bookedByUser ? 'Sudah dibooking user' : 'Tersedia')
                        }
                        aria-label={`Sesi ${time} pada ${d.toLocaleDateString('id-ID')}`}
                        >
                        {time} {caption}{isPending ? ' …' : ''}
                        </button>
                    );
                    })}
                    </div>
                  ) : (
                    <div className={styles.sessionListOff}>{inMonth ? 'Tutup' : ''}</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
