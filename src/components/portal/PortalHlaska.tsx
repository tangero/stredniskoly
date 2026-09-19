import Link from 'next/link';
import { PortalObalka } from '@/components/portal/PortalEditace';

interface PortalHlaskaProps {
  nadpis: string;
  children: React.ReactNode;
}

/** Jednoduchá stránka portálu se sdělením a návratem na /pro-skoly. */
export const PortalHlaska = ({ nadpis, children }: PortalHlaskaProps) => (
  <PortalObalka>
    <div className="max-w-xl mx-auto py-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-3">{nadpis}</h1>
      <div className="text-slate-600 mb-6 space-y-4">{children}</div>
      <Link href="/pro-skoly#vstup" className="text-blue-600 font-medium hover:underline">
        ← Zpět na Portál pro školy
      </Link>
    </div>
  </PortalObalka>
);
