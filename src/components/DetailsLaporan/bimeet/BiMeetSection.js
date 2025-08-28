import React from 'react';

export default function BiMeetSection({
  styles, id, detail,
  formatDateTime, mapStatus,
  isPendingGeneric, isUpdatingGeneric,
  onRequestReject, onApproveGeneric,
}) {
  const status = mapStatus(detail);
  const slug = 'bimeet';

  return (
    <div className={styles.detailCard}>
      <div className={styles.topRow}>
        <div className={styles.leftTitle}>
          <div className={styles.bookingTitle}>BI-MEET • Detail #{id}</div>
          {status && (
            <span className={`${status.className} ${styles.headerStatus}`}>
              <span className={status.dot} /> {status.text}
            </span>
          )}
        </div>
      </div>

      {!detail ? (
        <div className={styles.emptyText}>Data belum tersedia.</div>
      ) : (
        <>
          <div className={styles.detailRow}>
            <div className={styles.detailColLeft}>
              <L styles={styles} label="ID" v={detail.id} />
              <L styles={styles} label="Ruang"
                 v={`${detail.room_name || '-'}${detail.room_floor != null ? ` (Lantai ${detail.room_floor})` : ''}`} />
              <L styles={styles} label="Unit Kerja" v={detail.unit_kerja || '-'} />
              <L styles={styles} label="Judul/Agenda" v={detail.title || '-'} />
              <L styles={styles} label="Deskripsi" v={detail.description || '-'} />
              <L styles={styles} label="PIC" v={detail.pic_name || '-'} />
              <L styles={styles} label="No Kontak" v={detail.contact_phone || '-'} />
            </div>

            <div className={styles.detailColRight}>
              <L styles={styles} label="Waktu"
                 v={`${formatDateTime(detail.start_datetime)} → ${formatDateTime(detail.end_datetime)}`} />
              <L styles={styles} label="Peserta" v={detail.participants ?? '-'} />
              <L styles={styles} label="Status ID" v={detail.status_id ?? '-'} />
              {detail.reject_reason && <L styles={styles} label="Alasan Penolakan" v={detail.reject_reason} />}
              <L styles={styles} label="Created At" v={formatDateTime(detail.created_at)} />
              <L styles={styles} label="Updated At" v={formatDateTime(detail.updated_at)} />
            </div>
          </div>

          {isPendingGeneric(slug, detail) && (
            <div className={styles.actionBtnRow} style={{ marginTop: 16 }}>
              <button className={styles.btnTolak} onClick={onRequestReject} disabled={isUpdatingGeneric}>
                {isUpdatingGeneric ? 'Memproses...' : 'Tolak'}
              </button>
              <button className={styles.btnSetujui} onClick={onApproveGeneric} disabled={isUpdatingGeneric}>
                {isUpdatingGeneric ? 'Memproses...' : 'Setujui'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function L({ styles, label, v }) { return (<><div className={styles.detailLabel}>{label}</div><div className={styles.detailValue}>{v}</div></>); }
