import { drobeckyJsonLd, type Drobek } from '@/lib/drobecky';

/** JSON-LD drobečkové navigace; vkládá se vedle viditelné navigace se stejnými položkami. */
export function DrobeckyJsonLd({ polozky }: { polozky: Drobek[] }) {
  // `<` se escapuje, aby název s „</script>“ nemohl ukončit značku.
  const json = JSON.stringify(drobeckyJsonLd(polozky)).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
