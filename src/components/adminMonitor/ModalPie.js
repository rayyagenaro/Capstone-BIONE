import React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { MODULES, labelOf } from './shared';

export default function ModalPie({
  styles,
  open, onClose,
  CHART_H,
  pieDataByModule, pieValueFormatter,
  pieCountsMap, selectedModules, pieTotal,
}) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>Detail Booking/Modul</div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalChart} style={{ justifyContent:'center' }}>
            {pieDataByModule.length === 0 ? (
              <div className={styles.empty}>Tidak ada data untuk ditampilkan.</div>
            ) : (
              <PieChart
                height={CHART_H}
                series={[{
                  data: pieDataByModule.map(d => ({
                    id: d.id,
                    value: d.value,
                    label: d.label,
                    color: d.color,
                  })),
                  outerRadius: 120,
                  highlightScope: { fade: 'global', highlight: 'item' },
                  faded: { innerRadius: 40, additionalRadius: -20, color: 'gray' },
                  valueFormatter: pieValueFormatter,
                  arcLabel: (item) =>
                    pieTotal ? `${Math.round((item.value / pieTotal) * 100)}%` : '',
                }]}
                slotProps={{
                  legend: { direction: 'column', position: { vertical: 'middle', horizontal: 'right' } },
                }}
                sx={{
                  '--Charts-legend-itemWidth': 'auto',
                  '& .MuiPieArc-root': { stroke: '#fff', strokeWidth: 1 },
                  '& .MuiPieArc-faded': { opacity: 0.35 },
                }}
              />
            )}
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Layanan</th>
                  <th>Jumlah</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {MODULES
                  .filter((m) => selectedModules.includes(m.value))
                  .map((m) => {
                    const v = pieCountsMap.get(m.serviceKey) || 0;
                    const pct = pieTotal ? Math.round((v / pieTotal) * 100) : 0;
                    return (
                      <tr key={m.serviceKey}>
                        <td>{labelOf(m.serviceKey)}</td>
                        <td>{v}</td>
                        <td>{pct}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
