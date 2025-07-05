import styles from './AuthLayout.module.css'

export default function AuthLayout({ children }) {
  return (
    <div className={styles.authContainer}>
      <header className={styles.header}>
        <div className={styles.logoGroup}>
          <img src="/assets/logo_lalits.png" alt="Lalits Logo" className={styles.logo} />
          <span className={styles.brand}>Lalits</span>
        </div>
        <div className={styles.authLinks}>
          <a href="#" className={styles.signIn}>Sign In</a>
          <a href="#" className={styles.signUp}>Sign Up</a>
        </div>
      </header>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}