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

// Slug layanan yang didukung (termasuk bimeal)
const ALLOWED_SLUGS = new Set(['dmove', 'bicare', 'bimeal', 'bimeet', 'bimail', 'bistay']);

export default function HalamanDetailLayanan({ slug, ns, id }) {
  // UI & data di-handle di komponen view (client fetch)
  return <DetailsLaporan slug={slug} ns={ns} id={id} />;
}

// SSR guard: pastikan admin_session__{ns} valid & role=admin
export async function getServerSideProps(ctx) {
  const { ns: nsRaw, slug: slugRaw, id: idRaw } = ctx.query || {};
  const ns = Array.isArray(nsRaw) ? nsRaw[0] : nsRaw;
  const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;
  const id = Number(Array.isArray(idRaw) ? idRaw[0] : idRaw);

  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;
  const slugValid = typeof slug === 'string' && ALLOWED_SLUGS.has(slug.toLowerCase()) ? slug.toLowerCase() : null;
  const idValid = Number.isFinite(id) && id > 0 ? id : null;

  const from = ctx.resolvedUrl || '/Admin/Fitur/[slug]/detail';

  // Wajib punya ns, slug valid, dan id valid
  if (!nsValid || !slugValid || !idValid) {
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

    if (String(payload?.role || '').toLowerCase() !== 'admin') {
      return {
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
          permanent: false,
        },
      };
    }

    return { props: { slug: slugValid, ns: nsValid, id: idValid } };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
        permanent: false,
      },
    };
  }
}
