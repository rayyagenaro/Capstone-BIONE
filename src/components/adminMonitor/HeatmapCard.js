import React from 'react';
import { IconHeat, DOW_FULL_ID, ghTooltipText } from './shared';

export default function HeatmapCard({
  styles,
  heatmapData,
  hmService, setHmService,
  hmYear, setHmYear, hmYearOptions,
  onOpenDetail,
}) {
  return (
    <section className={styles.heatCard}>
      <div className={styles.cardHeadRow}>
        <div className={styles.cardHead} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={styles.kpiLogo}><IconHeat /></span>
          Booking/Kalender
        </div>

        <div className={styles.actions}>
          <select className={styles.kpiSelect} value={hmService} onChange={(e) => setHmService(e.target.value)}>
            <option value="all">Semua</option>
            {/* opsi layanan di-emit dari parent agar konsisten */}
            {/* Parent bisa supply MODULES kalau mau spesifik */}
          </select>

          <select
            className={styles.kpiSelect}
            value={hmYear}
            onChange={(e) => setHmYear(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          >
            {hmYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <button className={styles.viewBtn} onClick={onOpenDetail}>Details</button>
        </div>
      </div>

      <div className={styles.heatBox}>
        <div className={styles.heatInner}>
          {/* Label bulan */}
          <div
            className={styles.heatMonthRow}
            style={{ gridTemplateColumns: `repeat(${heatmapData.weeksCount}, var(--heat-cell))` }}
          >
            {heatmapData.monthTicks.map((t) => (
              <span key={t.label + t.col} style={{ gridColumn: t.col + 1 }}>
                {t.label}
              </span>
            ))}
          </div>

          <div className={styles.heatWrap}>
            <div className={styles.heatWeekdayColFull}>
              {DOW_FULL_ID.map((d) => (<span key={d}>{d}</span>))}
            </div>

            <div
              className={styles.heatGrid}
              style={{ gridTemplateColumns: `repeat(${heatmapData.weeksCount}, var(--heat-cell))` }}
            >
              {heatmapData.cells.map((c) => (
                <div key={c.key} className={styles.hmCell}>
                  <div
                    className={[
                      styles.heatCell,
                      c.inYear ? styles[`lv${c.level}`] : styles.outYear,
                    ].join(' ')}
                  />
                  <span className={styles.hmTip}>{ghTooltipText(c.date, c.count)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.heatLegend}>
            <span>Less</span>
            <i className={`${styles.heatSwatch} ${styles.lv0}`} />
            <i className={`${styles.heatSwatch} ${styles.lv1}`} />
            <i className={`${styles.heatSwatch} ${styles.lv2}`} />
            <i className={`${styles.heatSwatch} ${styles.lv3}`} />
            <i className={`${styles.heatSwatch} ${styles.lv4}`} />
            <span>More</span>
          </div>
        </div>
      </div>

      <div className={styles.cardFoot}><div/></div>
    </section>
  );
}
