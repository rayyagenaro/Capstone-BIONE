import React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import { IconBarsFill, IconBarsOutline, STATUS_COLORS } from './shared';

export default function OverviewStatusCard({
  styles,
  CHART_H,
  chartMode, setChartMode,
  overviewService, setOverviewService,
  overviewYear, setOverviewYear, overviewYearOptions,
  allowedModules,
  monthlyAgg, maxTotal, windowTotal,
  barDataset, sortByStatus, setSortByStatus,
  onOpenDetail,
}) {
  return (
    <section className={styles.card} style={{ '--chart-h': `${CHART_H}px` }}>
      <div className={styles.cardHeadRow}>
        <div className={styles.cardHead} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={styles.kpiLogo}>
            {chartMode === 'status' ? <IconBarsFill /> : <IconBarsOutline />}
          </span>
          {chartMode === 'overview' ? 'Booking/Waktu' : 'Booking/Status'}
        </div>

        <div className={styles.actions}>
          {chartMode === 'overview' ? (
            <>
              <select className={styles.kpiSelect} value={overviewService} onChange={(e) => setOverviewService(e.target.value)}>
                <option value="all">Semua</option>
                {allowedModules.map((m) => (
                  <option key={m.serviceKey} value={m.serviceKey}>{m.label}</option>
                ))}
              </select>

              <select
                className={styles.kpiSelect}
                value={overviewYear}
                onChange={(e) => setOverviewYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ marginLeft: 8 }}
              >
                <option value="all">Semua</option>
                {overviewYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          ) : (
            <div className={styles.sortGroup}>
              <label htmlFor="sortBy">Sort by</label>
              <select id="sortBy" value={sortByStatus} onChange={(e) => setSortByStatus(e.target.value)}>
                <option value="all">Semua</option>
                <option value="today">Hari ini</option>
                <option value="week">Minggu ini</option>
                <option value="month">Bulan ini</option>
                <option value="year">Tahun ini</option>
              </select>
            </div>
          )}

          <button className={styles.viewBtn} onClick={onOpenDetail}>Details</button>
        </div>
      </div>

      {chartMode === 'overview' ? (
        <div className={styles.miniChartBox}>
          <BarChart
            xAxis={[{ scaleType: 'band', data: monthlyAgg.data.map(d => d.month) }]}
            series={[{ data: monthlyAgg.data.map(r => r.total), label: 'Bookings', color: '#2f6ef3' }]}
            height={CHART_H}
            margin={{ top: 20, right: 12, bottom: 28, left: 40 }}
            slotProps={{ legend: { hidden: true }, bar: { rx: 12 } }}
            sx={{
              '--Charts-axis-label-fontSize': '12px',
              '--Charts-axis-tickLabel-fontSize': '12px',
              '& .MuiBarElement-root': { opacity: 0.35, transition: 'opacity .2s ease' },
              '& .MuiBarElement-root:hover': { opacity: 1 },
              '& .MuiChartsHighlightElement-root': { opacity: 0 },
            }}
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
      ) : (
        <div className={styles.chartBox}>
          {barDataset.length === 0 ? (
            <div className={styles.empty}>Tidak ada data untuk ditampilkan.</div>
          ) : (
            <BarChart
              dataset={barDataset}
              layout="horizontal"
              height={CHART_H}
              margin={{ top: 10, right: 30, bottom: 40, left: 60 }}
              yAxis={[{
                scaleType: 'band',
                dataKey: 'module',
                tickLabelStyle: { fontSize: 12, fontWeight: 500, fill: '#0f172a' },
              }]}
              xAxis={[{ label: 'Jumlah', tickMinStep: 1 }]}
              series={[
                { dataKey: 'pending',  label: 'Pending',  stack: 'total', color: STATUS_COLORS.pending  },
                { dataKey: 'approved', label: 'Approved', stack: 'total', color: STATUS_COLORS.approved },
                { dataKey: 'rejected', label: 'Rejected', stack: 'total', color: STATUS_COLORS.rejected },
                { dataKey: 'finished', label: 'Finished', stack: 'total', color: STATUS_COLORS.finished },
              ]}
              slotProps={{ legend: { hidden: true }, tooltip: { trigger: 'item' } }}
              sx={{ width: '100%', '--Charts-axis-label-fontSize': '13px', '--Charts-axis-tickLabel-fontSize': '12px' }}
            />
          )}
        </div>
      )}

      <div className={styles.cardFoot}>
        <div className={styles.footLeft}>
          {chartMode === 'overview' && <>Total booking:<b>{windowTotal.toLocaleString('id-ID')}</b></>}
        </div>

        <div className={styles.switchWrap}>
          <div className={styles.switchTrack}>
            <button
              className={`${styles.tabBtn} ${chartMode === 'overview' ? styles.tabBtnActive : ''}`}
              onClick={() => setChartMode('overview')}
            >
              <span className={styles.tabIcon}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke">
                    <rect x="3"  y="10" width="4" height="10" rx="2" />
                    <rect x="10" y="6"  width="4" height="14" rx="2" />
                    <rect x="17" y="3"  width="4" height="17" rx="2" />
                  </g>
                </svg>
              </span>
              <span>Waktu</span>
            </button>

            <button
              className={`${styles.tabBtn} ${chartMode === 'status' ? styles.tabBtnActive : ''}`}
              onClick={() => setChartMode('status')}
            >
              <span className={styles.tabIcon}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3"  y="10" width="4" height="10" rx="1.5"></rect>
                  <rect x="10" y="6"  width="4" height="14" rx="1.5"></rect>
                  <rect x="17" y="3"  width="4" height="17" rx="1.5"></rect>
                </svg>
              </span>
              <span>Status</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
