import React from 'react';

export default function BiMealSection({
  styles, id, detail,
  formatDateTime, mapStatus,
  isPendingGeneric, isUpdatingGeneric,
  onRequestReject, onApproveGeneric,
}) {
  const status = mapStatus(detail);
  const slug = 'bimeal';

  return (
    <div className={styles.detailCard}>
      <div className={styles.topRow}>
        <div className={styles.leftTitle}>
          <div className={styles.bookingTitle}>BI-MEAL • Detail #{id}</div>
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
              <L styles={styles} label="Nama PIC" v={detail.nama_pic || '-'} />
              <L styles={styles} label="No. WA PIC" v={detail.no_wa_pic || '-'} />
            </div>

            <div className={styles.detailColRight}>
              <L styles={styles} label="Waktu Pesanan" v={formatDateTime(detail.waktu_pesanan)} />
              <L styles={styles} label="Unit Kerja" v={detail.unit_kerja || '-'} />
              <L styles={styles} label="Status" v={detail.status_name || (detail.status_id === 1 ? 'Pending' : detail.status_id ?? '-')} />
            </div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailColLeft}>
              <div className={styles.detailLabel}>Pesanan</div>
              <div className={styles.detailValue}>
                {Array.isArray(detail.items) && detail.items.length ? (
                  <ul style={{ margin: 0 }}>
                    {detail.items.map((it) => (
                      <li key={it.id}>{it.nama_pesanan} ({it.jumlah})</li>
                    ))}
                  </ul>
                ) : ('-')}
              </div>
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
