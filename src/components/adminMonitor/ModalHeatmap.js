import React from 'react';
import { DOW_FULL_ID, ghTooltipText } from './shared';

export default function ModalHeatmap({
  styles,
  open, onClose,
  heatmapData,
}) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>Detail Booking/Kalender</div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody} style={{ gridTemplateColumns: '1fr' }}>
          <div className={styles.modalChart} style={{ minHeight: 'auto' }}>
            <div className={`${styles.heatBox} ${styles.heatBig}`}>
              <div className={styles.heatInner}>
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
                        <div className={[styles.heatCell, c.inYear ? styles[`lv${c.level}`] : styles.outYear].join(' ')} />
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
          </div>
        </div>
      </div>
    </div>
  );
}
