'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { cesskyDen } from '@/lib/veletrhy-pocty';

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
 * Den se počítá stejnou funkcí jako serverový filtr (`zobrazitelneAkce`),
 * aby se server a klient nerozešly v tom, kdy akce skončila. Bere se
 * z listového modulu `@/lib/veletrhy-pocty`, ne z `@/lib/veletrhy`: ten
 * importuje celý datový soubor akcí a klient by si ho stáhl do prohlížeče.
 */
export function VeletrhSkryvani({ doKonce, children }: { doKonce: string; children: ReactNode }) {
  const skryt = useSyncExternalStore(
    () => () => {},
    () => cesskyDen() > doKonce,
    () => false,
  );
  if (skryt) return null;
  return <>{children}</>;
}
