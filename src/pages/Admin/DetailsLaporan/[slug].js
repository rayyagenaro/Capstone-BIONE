// /src/pages/Admin/DetailsLaporan/[slug].js
import React from 'react';
import { jwtVerify } from 'jose';
import DetailsLaporanView from '@/views/detailslaporan/detailsLaporan';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
};

export default function DetailsLaporanPage(props) {
  // Semua UI ada di views/detailslaporan/detailsLaporan.js
  return <DetailsLaporanView {...props} />;
}

// ===== SSR guard: cek cookie namespaced admin_session__{ns}
export async function getServerSideProps(ctx) {
  const { ns: nsRaw } = ctx.query;
  const ns = Array.isArray(nsRaw) ? nsRaw[0] : nsRaw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;

  const from = ctx.resolvedUrl || '/Admin/DetailsLaporan/[slug]';

  if (!nsValid) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  const cookieName = `admin_session__${nsValid}`;
  const token = ctx.req.cookies?.[cookieName] || null;

  if (!token) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
        permanent: false,
      },
    };
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('missing-secret');

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });

    if (payload?.role !== 'admin') {
      return {
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
          permanent: false,
        },
      };
    }

    return { props: { initialAdminName: payload?.name || 'Admin' } };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
        permanent: false,
      },
    };
  }
}
