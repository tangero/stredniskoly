'use client';

import { useEffect, useState } from 'react';
import { OdberFormular } from './OdberFormular';

// ============================================================================
// Formulář odběru v patičce. Patička je klientská komponenta, proto si stav
// odběru (zapnuto, ročník z registru) dotáhne z /api/novinky/stav.
// Když odběr není zapnutý, nevykreslí se nic.
// ============================================================================

export function OdberPaticka() {
  const [stav, setStav] = useState<{ zapnuto: boolean; rocnik?: string } | null>(null);

  useEffect(() => {
    let zruseno = false;
    fetch('/api/novinky/stav')
      .then((o) => (o.ok ? o.json() : { zapnuto: false }))
      .then((data) => {
        if (!zruseno) setStav(data);
      })
      .catch(() => setStav({ zapnuto: false }));
    return () => {
      zruseno = true;
    };
  }, []);

  if (!stav?.zapnuto || !stav.rocnik) return null;

  return (
    <div>
      <h3 className="font-semibold mb-3 text-sm" style={{ color: '#28313b' }}>
        Termíny e-mailem
      </h3>
      <p className="text-sm mb-2" style={{ color: '#818c99' }}>
        Pošleme ti termíny přijímacího řízení {stav.rocnik} s předstihem.
      </p>
      <OdberFormular rocnik={stav.rocnik} zdroj="paticka" varianta="paticka" />
    </div>
  );
}
