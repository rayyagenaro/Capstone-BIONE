import React from 'react';

export default function BiStaySection({
  styles, id, detail,
  formatDateTime, mapStatus,
  isPendingGeneric, isUpdatingGeneric,
  onRequestReject, onApproveGeneric,
}) {
  const status = mapStatus(detail);
  const slug = 'bistay';

  return (
    <div className={styles.detailCard}>
      <div className={styles.topRow}>
        <div className={styles.leftTitle}>
          <div className={styles.bookingTitle}>BI-STAY • Detail #{id}</div>
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
              <L styles={styles} label="Nama Pemesan" v={detail.nama_pemesan || '-'} />
              <L styles={styles} label="NIP" v={detail.nip || '-'} />
              <L styles={styles} label="No WA" v={detail.no_wa || '-'} />
              <L styles={styles} label="Status Pegawai (ID)" v={detail.status_pegawai_id ?? '-'} />
              <L styles={styles} label="Asal KPw" v={detail.asal_kpw || '-'} />
              <L styles={styles} label="Keterangan" v={detail.keterangan || '-'} />
            </div>

            <div className={styles.detailColRight}>
              <L styles={styles} label="Jadwal"
                 v={`${formatDateTime(detail.check_in)} → ${formatDateTime(detail.check_out)}`} />
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
