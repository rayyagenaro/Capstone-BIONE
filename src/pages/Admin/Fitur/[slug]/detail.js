// /src/pages/Admin/Fitur/[slug]/detail.js
import React from 'react';
import { jwtVerify } from 'jose';
import DetailsLaporan from '@/views/detailslaporan/detailsLaporan';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
};

export default function HalamanDetailLayanan() {
  // UI & data di-handle di komponen view (client fetch)
  return <DetailsLaporan />;
}

// SSR guard: pastikan admin_session__{ns} valid & role=admin
export async function getServerSideProps(ctx) {
  const { ns: nsRaw } = ctx.query || {};
  const ns = Array.isArray(nsRaw) ? nsRaw[0] : nsRaw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;

  const from = ctx.resolvedUrl || '/Admin/Fitur/[slug]/detail';

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

    return { props: {} };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
        permanent: false,
      },
    };
  }
}
