// /src/components/ServiceCards/ServicesCards.js
import React from 'react';
import styles from './ServiceCards.module.css';
import DmoveCard from './DmoveCard';
import BicareCard from './BicareCard';
import BimealCard from './BimealCard';
import BimeetCard from './BimeetCard';
import BidocsCard from './BidocsCard';
import BistayCard from './BistayCard';

export default function ServicesCards({ ns }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.cardsGrid}>
        <DmoveCard ns={ns} />
        <BicareCard ns={ns} />
        <BimealCard ns={ns} />
        <BimeetCard ns={ns} />
        <BidocsCard ns={ns} />
        <BistayCard ns={ns} />
      </div>
    </div>
  );
}
