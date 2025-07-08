import Head from 'next/head'
import Image from 'next/image'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect ke halaman login D'ONE setelah 3 detik
    const timer = setTimeout(() => {
      router.push('/Login/hal-login')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <>
      <Head>
        <title>D&#39;ONE - Digital One Systems by Bank Indonesia</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(140deg, #e7ebf5 0%, #b5c3e8 100%)"
      }}>
        <div style={{
          textAlign: "center",
          background: "rgba(255,255,255,0.9)",
          borderRadius: "20px",
          padding: "50px 40px",
          boxShadow: "0 8px 32px 0 rgba(70,90,150,0.12)"
        }}>
          <Image src="/assets/D'ONE.png" alt="D'ONE Logo" width={150} height={90} />
          <h1 style={{ margin: "5px 0 8px 0", color: "#465a96", fontWeight: 700, fontSize: 26 }}>
            Selamat Datang di
            <br />D&#39;ONE
          </h1>
          <p style={{ color: "#465a96", fontWeight: 500, fontSize: 10 }}>
            Digital One Order by Bank Indonesia
          </p>
        </div>
      </div>
    </>
  )
}