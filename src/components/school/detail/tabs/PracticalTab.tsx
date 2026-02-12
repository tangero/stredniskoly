'use client';

import { MapPin, Bus, DollarSign, Phone, ExternalLink } from 'lucide-react';
import type { SchoolInspisData } from '@/types/inspis';

interface PracticalTabProps {
  school: any;
  inspis: SchoolInspisData | null;
}

// Helper functions
function formatTuition(value: number | null): string {
  if (value === null) return 'Neuvedeno';
  if (value === 0) return 'Zdarma';
  return `${value.toLocaleString('cs-CZ')} Kč/rok`;
}

function renderList(values: string[] | null): string {
  if (!values || values.length === 0) return 'Neuvedeno';
  return values.join(', ');
}

// Location card
function LocationCard({ school }: { school: any }) {
  const address = `${school.ulice || ''} ${school.cislo_or || ''}`.trim() || school.adresa || 'Adresa není k dispozici';
  const city = school.obec || 'Město není uvedeno';
  const postalCode = school.psc || '';

  // Google Maps link
  const mapsQuery = encodeURIComponent(`${school.nazev}, ${address}, ${city}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-slate-900">Lokace</h3>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div>
          <div className="text-slate-500">Adresa</div>
          <div className="text-slate-900 font-medium">{address}</div>
        </div>

        <div>
          <div className="text-slate-500">Město</div>
          <div className="text-slate-900 font-medium">
            {city}
            {postalCode && <span className="text-slate-500 ml-2">{postalCode}</span>}
          </div>
        </div>

        {school.kraj && (
          <div>
            <div className="text-slate-500">Kraj</div>
            <div className="text-slate-900 font-medium">{school.kraj}</div>
          </div>
        )}
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
      >
        Ukázat na mapě
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

// Transport card
function TransportCard({ school, inspis }: { school: any; inspis: SchoolInspisData | null }) {
  if (!inspis) {
    return null;
  }

  const hasTransportInfo =
    inspis.dopravni_dostupnost ||
    inspis.linka_mhd ||
    inspis.nejblizsi_zastavka_m !== null ||
    inspis.umisteni_v_obci;

  if (!hasTransportInfo) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bus className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-slate-900">Doprava</h3>
      </div>

      <div className="space-y-3 text-sm">
        {inspis.dopravni_dostupnost && inspis.dopravni_dostupnost.length > 0 && (
          <div>
            <div className="text-slate-500 mb-2">Dostupnost</div>
            <div className="flex flex-wrap gap-1.5">
              {inspis.dopravni_dostupnost.map((transport, idx) => (
                <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                  {transport}
                </span>
              ))}
            </div>
          </div>
        )}

        {inspis.linka_mhd && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-slate-500 mb-1">Linka MHD</div>
            <div className="text-slate-900">{inspis.linka_mhd}</div>
          </div>
        )}

        {inspis.nejblizsi_zastavka_m !== null && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-slate-500 mb-1">Nejbližší zastávka</div>
            <div className="text-slate-900">{inspis.nejblizsi_zastavka_m} m od školy</div>
          </div>
        )}

        {inspis.umisteni_v_obci && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-slate-500 mb-1">Umístění</div>
            <div className="text-slate-900">{inspis.umisteni_v_obci}</div>
          </div>
        )}

        {inspis.bezbariery_pristup && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-slate-500 mb-1">Bezbariérovost</div>
            <div className="text-slate-900">{inspis.bezbariery_pristup}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Surroundings card
function SurroundingsCard({ inspis }: { inspis: SchoolInspisData | null }) {
  if (!inspis || (!inspis.v_blizkosti_skoly || inspis.v_blizkosti_skoly.length === 0)) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">V okolí školy</h3>

      <div className="space-y-2">
        {inspis.v_blizkosti_skoly.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <span className="text-blue-600 font-bold mt-0.5">•</span>
            <span className="text-slate-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Finance card
function FinanceCard({ inspis, school }: { inspis: SchoolInspisData | null; school: any }) {
  if (!inspis) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-slate-900">Školné a poplatky</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-slate-500 mb-1">Roční školné</div>
          <div className="text-2xl font-bold text-slate-900">{formatTuition(inspis.rocni_skolne)}</div>
        </div>

        {school.zrizovatel && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-slate-500 mb-1">Zřizovatel</div>
            <div className="text-slate-900">{school.zrizovatel}</div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <div className="text-slate-500 mb-2">Odhadované náklady</div>
          <div className="space-y-1 text-slate-700">
            <div className="flex justify-between">
              <span>Učebnice</span>
              <span>~2000 Kč/rok</span>
            </div>
            <div className="flex justify-between">
              <span>Pomůcky</span>
              <span>~1000 Kč/rok</span>
            </div>
            <div className="flex justify-between">
              <span>Strava (odhad)</span>
              <span>~15000 Kč/rok</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">* Odhady se mohou lišit</div>
        </div>

        {inspis.stipendium !== null && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Stipendia</span>
              <span className="font-medium text-slate-900">{inspis.stipendium ? 'Ano' : 'Ne'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Communication card
function CommunicationCard({ inspis }: { inspis: SchoolInspisData | null }) {
  if (!inspis) {
    return null;
  }

  const hasCommunicationInfo =
    (inspis.zpusob_informovani_rodicu && inspis.zpusob_informovani_rodicu.length > 0) ||
    (inspis.funkce_sis && inspis.funkce_sis.length > 0);

  if (!hasCommunicationInfo) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-slate-900">Komunikace s rodiči</h3>
      </div>

      <div className="space-y-4 text-sm">
        {inspis.zpusob_informovani_rodicu && inspis.zpusob_informovani_rodicu.length > 0 && (
          <div>
            <div className="text-slate-500 mb-2">Jak škola informuje</div>
            <div className="flex flex-wrap gap-1.5">
              {inspis.zpusob_informovani_rodicu.map((way, idx) => (
                <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                  {way}
                </span>
              ))}
            </div>
          </div>
        )}

        {inspis.funkce_sis && inspis.funkce_sis.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-slate-500 mb-2">Školní informační systém</div>
            <div className="space-y-1">
              {inspis.funkce_sis.map((fn, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-700">
                  <span className="text-green-600 font-bold mt-0.5">✓</span>
                  <span>{fn}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main PracticalTab component
export function PracticalTab({ school, inspis }: PracticalTabProps) {
  return (
    <div className="space-y-6">
      {/* Grid layout */}
      <div className="grid md:grid-cols-2 gap-6">
        <LocationCard school={school} />
        <TransportCard school={school} inspis={inspis} />
        <FinanceCard inspis={inspis} school={school} />
        <CommunicationCard inspis={inspis} />
        <SurroundingsCard inspis={inspis} />
      </div>
    </div>
  );
}
