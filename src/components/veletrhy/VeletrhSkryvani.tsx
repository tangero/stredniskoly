'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * Skryje upoutávku na veletrh, který mezi sestavením stránky a návštěvou
 * skončil. Stránka školy se revaliduje jednou za hodinu (revalidate = 3600),
 * takže bez tohohle by proběhlá akce visela až hodinu po svém konci.
 *
 * Serverová snapshotu je „vidět“: stránka se staví při revalidate a blok,
 * který právě sestavila, má smysl ukázat. Klientská se vyhodnotí až při
 * hydrataci — pokud akce mezitím skončila, blok zmizí bez hydratační chyby,
 * protože useSyncExternalStore je přesně na tuhle situaci určený.
 *
 * Datum se počítá v českém kalendáři, ale `cesskyDen` z `@/lib/veletrhy`
 * tu záměrně není: ten modul importuje celý datový soubor akcí a client
 * komponenta by si ho stáhla do prohlížeče celý.
 */
export function VeletrhSkryvani({ doKonce, children }: { doKonce: string; children: ReactNode }) {
  const skryt = useSyncExternalStore(
    () => () => {},
    () => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Prague',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()) > doKonce,
    () => false,
  );
  if (skryt) return null;
  return <>{children}</>;
}
