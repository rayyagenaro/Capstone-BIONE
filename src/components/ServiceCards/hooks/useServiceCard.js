// /src/components/ServiceCards/hooks/useServiceCard.js
import { useEffect, useState } from 'react';

export function useServiceCard(serviceId) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        // ⬇️ semua komponen call API yang sama, beda hanya ID
        const r = await fetch(`/api/admin/service/${serviceId}`, { cache: 'no-store' });
        if (!r.ok) throw new Error('Gagal memuat layanan');
        const d = await r.json();
        if (!active) return;
        setData(d);
      } catch (e) {
        if (!active) return;
        setErr(e.message || 'Terjadi kesalahan');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [serviceId]);

  return { data, err, loading };
}
