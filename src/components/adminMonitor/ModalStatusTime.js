import React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import { STATUS_COLORS, MODULES, SERVICE_KEYS, labelOf } from './shared';

export default function ModalStatusTime({
  styles,
  open, onClose,
  chartMode,
  barDataset, totalAll,
  monthlyAgg, maxTotal, windowTotal,
}) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>
            {chartMode === 'overview' ? 'Detail Booking/Waktu' : 'Detail Booking/Status'}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {chartMode === 'status' ? (
            <>
              <div className={styles.modalChart}>
                <BarChart
                  dataset={barDataset}
                  layout="horizontal"
                  height={Math.max(400, 44 * barDataset.length + 60)}
                  margin={{ top: 50, right: 20, bottom: 40, left: 110 }}
                  yAxis={[{ scaleType: 'band', dataKey: 'module', tickLabelStyle: { fontSize: 13, fontWeight: 500, fill: '#0f172a' } }]}
                  xAxis={[{ label: 'Jumlah', tickMinStep: 1 }]}
                  series={[
                    { dataKey: 'pending',  label: 'Pending',  stack: 'total', color: STATUS_COLORS.pending  },
                    { dataKey: 'approved', label: 'Approved', stack: 'total', color: STATUS_COLORS.approved },
                    { dataKey: 'rejected', label: 'Rejected', stack: 'total', color: STATUS_COLORS.rejected },
                    { dataKey: 'finished', label: 'Finished', stack: 'total', color: STATUS_COLORS.finished },
                  ]}
                  slotProps={{ tooltip: { trigger: 'item' } }}
                />
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Layanan</th>
                      <th>Pending</th>
                      <th>Approved</th>
                      <th>Rejected</th>
                      <th>Finished</th>
                      <th>Total</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((m) => {
                      const row = barDataset.find(x => x.module === labelOf(m.serviceKey));
                      const t = row ? (row.pending + row.approved + row.rejected + row.finished) : 0;
                      const pct = totalAll ? Math.round((t / totalAll) * 100) : 0;
                      return (
                        <tr key={m.serviceKey}>
                          <td>{labelOf(m.serviceKey)}</td>
                          <td>{row?.pending || 0}</td>
                          <td>{row?.approved || 0}</td>
                          <td>{row?.rejected || 0}</td>
                          <td>{row?.finished || 0}</td>
                          <td>{t}</td>
                          <td>{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className={styles.modalChart}>
                <BarChart
                  xAxis={[{ scaleType: 'band', data: monthlyAgg.data.map(d => d.month) }]}
                  series={[{ data: monthlyAgg.data.map(r => r.total), label: 'Bookings', color: '#2f6ef3' }]}
                  height={420}
                  margin={{ top: 30, right: 20, bottom: 40, left: 70 }}
                  slotProps={{ legend: { hidden: true }, bar: { rx: 12 } }}
                >
                  {maxTotal > 0 && (
                    <ChartsReferenceLine
                      y={maxTotal}
                      label={`Max ${maxTotal.toLocaleString('id-ID')}`}
                      lineStyle={{ strokeDasharray: '4 4' }}
                      labelStyle={{ fontSize: 11, fill: '#111827', background: '#fff' }}
                    />
                  )}
                </BarChart>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      {SERVICE_KEYS.map((k) => (<th key={k}>{labelOf(k)}</th>))}
                      <th>Total</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyAgg.data.map((r) => {
                      const pct = windowTotal ? Math.round((r.total / windowTotal) * 100) : 0;
                      return (
                        <tr key={r.key}>
                          <td>{r.month}</td>
                          {SERVICE_KEYS.map((k) => (<td key={k}>{r[k]}</td>))}
                          <td>{r.total}</td>
                          <td>{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
