import type { IdentifikaceSkoly } from '@/lib/portal-identifikace';

interface PortalHlavickaSkolyProps {
  skola: IdentifikaceSkoly;
  vstup: 'kód' | 'odkaz';
  /** Úroveň nadpisu podle místa: samostatná stránka h1, karta na /pro-skoly h4. */
  uroven?: 'h1' | 'h2' | 'h3' | 'h4';
}

// Kdo uplatňuje kód, musí na první pohled poznat, ke které škole se hlásí.
export const PortalHlavickaSkoly = ({ skola, vstup, uroven = 'h1' }: PortalHlavickaSkolyProps) => {
  const Nadpis = uroven;
  // Na samostatné stránce je to hlavní nadpis, v kartě jen část formuláře.
  const velikost = uroven === 'h1' ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl';
  return (
  <header className="mb-8 rounded-xl border border-[#c9d4e1] bg-slate-50 p-6">
    <p className="text-sm font-medium text-slate-500 mb-2">Správa profilu školy na Přijímačky na školu</p>
    <Nadpis className={`${velikost} font-bold leading-tight text-slate-900 mb-4`}>{skola.nazev}</Nadpis>
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-700">
      {skola.adresa && (
        <>
          <dt className="text-slate-500">Adresa</dt>
          <dd>{skola.adresa}</dd>
        </>
      )}
      {skola.ico && (
        <>
          <dt className="text-slate-500">IČO</dt>
          <dd>{skola.ico}</dd>
        </>
      )}
      <dt className="text-slate-500">REDIZO</dt>
      <dd>{skola.redizo}</dd>
    </dl>
    {skola.profil && (
      <p className="mt-4">
        <a href={skola.profil} target="_blank" rel="noopener" className="font-medium text-blue-600 hover:underline">
          Zobrazit profil školy na webu ↗
        </a>
      </p>
    )}
    <p className="mt-4 text-sm text-slate-600">
      Pokud to není vaše škola, {vstup} nepoužívejte a napište nám na{' '}
      <a href="mailto:patrick@zandl.cz" className="text-blue-600 hover:underline">
        patrick@zandl.cz
      </a>
      .
    </p>
  </header>
  );
};
