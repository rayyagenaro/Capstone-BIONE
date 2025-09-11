import React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { IconPie } from './shared';

export default function PieCard({
  styles,
  CHART_H,
  pieDataByModule,
  pieValueFormatter,
  sortByPie, setSortByPie,
  onOpenDetail,
}) {
  return (
    <section className={styles.card} style={{ '--chart-h': `${CHART_H}px` }}>
      <div className={styles.cardHeadRow}>
        <div className={styles.cardHead} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={styles.kpiLogo}><IconPie /></span>
          Booking/Modul
        </div>

        <div className={styles.actions}>
          <div className={styles.sortGroup}>
            <label htmlFor="sortByPie">Sort by</label>
            <select id="sortByPie" value={sortByPie} onChange={(e)=>setSortByPie(e.target.value)}>
              <option value="all">Semua</option>
              <option value="today">Hari ini</option>
              <option value="week">Minggu ini</option>
              <option value="month">Bulan ini</option>
              <option value="year">Tahun ini</option>
            </select>
          </div>

          <button className={styles.viewBtn} onClick={onOpenDetail}>Details</button>
        </div>
      </div>

      <div className={styles.miniChartBox} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
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
              arcLabel: (item) => {
                const total = pieDataByModule.reduce((s, x) => s + x.value, 0);
                return total ? `${Math.round((item.value / total) * 100)}%` : '';
              },
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

      <div className={styles.cardFoot}><div/></div>
    </section>
  );
}
