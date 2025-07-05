import Image from 'next/image'
import styles from './AuthDataContainer.module.css'

export default function AuthCardLayout({ title, subtitle, children, footer }) {
  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.animateFadeIn}`}>
        <div className={styles.logo}>
          <Image src="/assets/logo_lalits.png" alt="Lalits Logo" width={60} height={60} />
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {children}

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
