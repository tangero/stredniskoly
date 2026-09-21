import type { IdentifikaceSkoly } from '@/lib/portal-identifikace';

interface PortalHlavickaSkolyProps {
  skola: IdentifikaceSkoly;
  vstup: 'kód' | 'odkaz';
  /** Úroveň nadpisu podle místa: samostatná stránka h1, karta na /pro-skoly h4. */
  uroven?: 'h1' | 'h2' | 'h3' | 'h4';
}

// Velikost musí klesat s úrovní: h4 v kartě na /pro-skoly visí pod h3 „Máme
// přihlašovací kód“ (text-xl), takže větší písmo by pořadí nadpisů převrátilo.
const VELIKOST = {
  h1: 'text-3xl md:text-4xl',
  h2: 'text-2xl md:text-3xl',
  h3: 'text-xl',
  h4: 'text-lg',
} as const;

// Kdo uplatňuje kód, musí na první pohled poznat, ke které škole se hlásí.
export const PortalHlavickaSkoly = ({ skola, vstup, uroven = 'h1' }: PortalHlavickaSkolyProps) => {
  const Nadpis = uroven;
  // Samostatná stránka si odsazení řeší sama, v kartě ho dává `space-y` formuláře.
  const odsazeni = uroven === 'h1' ? 'mb-8' : '';
  return (
  <header className={`${odsazeni} rounded-xl border border-[#c9d4e1] bg-slate-50 p-6`}>
    <p className="text-sm font-medium text-slate-500 mb-2">Správa profilu školy na Přijímačky na školu</p>
    {/* Katalog název mít nemusí; prázdný nadpis by zbyl jako mezera. Škola je pak
        určená řádky níž — REDIZO má vždycky a právě podle něj se kód páruje. */}
    {skola.nazev && (
      <Nadpis className={`${VELIKOST[uroven]} font-bold leading-tight text-slate-900 mb-4`}>{skola.nazev}</Nadpis>
    )}
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
