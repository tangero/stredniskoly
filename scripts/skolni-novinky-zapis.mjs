#!/usr/bin/env node
// ============================================================================
// Zápis sklizené dávky školních novinek do databáze.
//
//   node --experimental-strip-types scripts/skolni-novinky-zapis.mjs --export-stav stav.json
//   node --experimental-strip-types scripts/skolni-novinky-zapis.mjs --davka davka.json
//
// Dělba se sklízečem (docs/skolske-novinky-rss-2027.md, oddíl 3.2): pravidla
// klasifikace jsou v Pythonu, přístup k databázi v Node – stejný ovladač
// a stejný způsob transakcí jako zbytek projektu. Dávku jde uložit, prohlédnout
// a přehrát znovu, aniž by se cokoli stáhlo podruhé.
//
// Co tenhle skript dělá a co zásadně nedělá:
//
//  * **nic nemaže.** Zmizení položky z krátkého feedu není zrušení události.
//  * **změnu ukládá jako novou verzi**, ne přepisem: bez zobrazovaných polí
//    a extrahovaných tvrzení nejde poznat význam opravy (překlep vs. zrušený
//    termín) ani rekonstruovat, co už bylo čtenářům sděleno.
//  * **frontu změn zapisuje v téže transakci** jako změnu položky. Pořadí
//    „commit → navazující akce → záznam" by mělo mezeru, ve které proces zemře
//    a opakování nemá co obnovit (oddíl 3.7, nález N8). Web sám na frontě
//    nestojí – blok novinek má vlastní API s šedesátisekundovou cache.
//  * **výpadek zdroje nesmaže obsah**: chybný pokus jen zvýší `chyby_v_rade`
//    a odsune další kontrolu; uložené položky platí dál.
// ============================================================================

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { Pool } from '@neondatabase/serverless';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Za jak dlouho zdroj znovu zkusit. Klidný feed méně často, blízký termín častěji. */
const ODSTUP_HODIN = { ok: 12, bezeZmeny: 24, blizkyTermin: 3 };
/** Odstupňované opakování po chybě, aby se nedostupný web netloukl dokola. */
const ODSTUP_PO_CHYBE_HODIN = [1, 4, 12, 24, 48, 96];
/** Termín do tolika dnů zrychluje kontrolu zdroje. */
const BLIZKY_TERMIN_DNU = 3;

function pripojeni() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(join(KOREN, '.env.local'), 'utf8');
    const radek = env.split('\n').find((r) => r.startsWith('DATABASE_URL='));
    if (radek) return radek.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  } catch {
    // .env.local nemusí existovat.
  }
  throw new Error('DATABASE_URL není nastavený (prostředí ani .env.local)');
}

/** Stav zdrojů pro sklízeč: co poslat v podmíněném požadavku a co je splatné. */
async function exportStav(klient, kam) {
  const { rows } = await klient.query(
    `select redizo, etag, modified_since, dalsi_kontrola_at
       from skola_feed where aktivni order by redizo`,
  );
  const zdroje = rows.map((r) => ({
    redizo: r.redizo,
    etag: r.etag,
    modified_since: r.modified_since,
    dalsi_kontrola_at: r.dalsi_kontrola_at ? new Date(r.dalsi_kontrola_at).toISOString() : null,
  }));
  writeFileSync(kam, `${JSON.stringify({ zdroje }, null, 1)}\n`, 'utf8');
  console.log(`Stav ${zdroje.length} zdrojů → ${kam}`);
}

function dalsiKontrola(zdroj, polozky) {
  const hodin = (() => {
    if (zdroj.stav === 'chyba') {
      const i = Math.min(zdroj.chybyVRade ?? 1, ODSTUP_PO_CHYBE_HODIN.length) - 1;
      return ODSTUP_PO_CHYBE_HODIN[Math.max(i, 0)];
    }
    // Zdroj se známou blízkou událostí se kontroluje častěji: oprava místa nebo
    // času zveřejněná ráno v den konání se jinak k nikomu nedostane včas.
    const hranice = new Date(Date.now() + BLIZKY_TERMIN_DNU * 86400_000).toISOString().slice(0, 10);
    const blizky = (polozky ?? []).some((p) => (p.terminy ?? []).some((t) => t <= hranice));
    if (blizky) return ODSTUP_HODIN.blizkyTermin;
    return zdroj.stav === 'beze_zmeny' ? ODSTUP_HODIN.bezeZmeny : ODSTUP_HODIN.ok;
  })();
  return new Date(Date.now() + hodin * 3600_000);
}

/**
 * Co se s uloženou položkou stalo proti tomu, co přinesla sklizeň.
 *
 * Otisk obsahu nestačí: pravidla klasifikace se mění častěji než články škol
 * (oddíl 3.7, nález N8). Kdyby se porovnával jen otisk, oprava pravidel by se
 * projevila až u položek, které škola sama přepíše – a protože feed je klouzavé
 * okno o pár položkách, u většiny už nikdy. Rozdílná verze pravidel je proto
 * sama o sobě důvod k přepsání řádku, i když se text článku nezměnil.
 *
 * `prepocitana` se od `zmenena` liší jen původem: obsah je tentýž, změnilo se
 * jen to, co jsme z něj vyvodili. Běh si obojí počítá zvlášť, aby se v přehledu
 * nedalo splést „školy vydaly opravy" s „přepnuli jsme verzi pravidel".
 */
export function zmenaProtiUlozene(stara, p) {
  if (stara.otisk_obsahu !== p.otisk_obsahu) return 'zmenena';
  if (stara.verze_pravidel !== p.verze_pravidel) return 'prepocitana';
  return 'beze_zmeny';
}

/** Jedna položka: nová, změněná, nebo beze změny. Vrací, co se stalo. */
async function ulozPolozku(klient, redizo, p) {
  const { rows } = await klient.query(
    `select id, otisk_obsahu, verze_pravidel from skola_novinka
      where redizo = $1 and identita = $2`,
    [redizo, p.identita],
  );
  const stara = rows[0];
  const spolecne = [
    p.otisk_obsahu, p.titulek, p.url, p.publikovano,
    JSON.stringify(p.tridy ?? []), JSON.stringify(p.jistota ?? {}), p.stav_sdeleni,
    p.zobrazeni, p.zpusobily_email, p.duvod, JSON.stringify(p.terminy ?? []),
    p.konec_platnosti, p.verze_pravidel,
  ];

  let id;
  let zmena;
  if (!stara) {
    id = randomUUID();
    await klient.query(
      `insert into skola_novinka (id, redizo, identita, otisk_obsahu, titulek, url, publikovano,
         tridy, jistota, stav, zobrazeni, zpusobily_email, duvod, terminy, konec_platnosti, verze_pravidel)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14::jsonb, $15, $16)`,
      [id, redizo, p.identita, ...spolecne],
    );
    zmena = 'nova';
  } else if (zmenaProtiUlozene(stara, p) === 'beze_zmeny') {
    return { zmena: 'beze_zmeny' };
  } else {
    id = stara.id;
    await klient.query(
      `update skola_novinka set otisk_obsahu = $2, titulek = $3, url = $4, publikovano = $5,
         tridy = $6::jsonb, jistota = $7::jsonb, stav = $8, zobrazeni = $9, zpusobily_email = $10,
         duvod = $11, terminy = $12::jsonb, konec_platnosti = $13, verze_pravidel = $14, zmeneno = now()
       where id = $1`,
      [id, ...spolecne],
    );
    zmena = zmenaProtiUlozene(stara, p);
  }

  await klient.query(
    `insert into skola_novinka_verze (id, novinka_id, otisk, zobrazovana_pole, extrahovana_tvrzeni, verze_pravidel)
     values ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [randomUUID(), id, p.otisk_obsahu, JSON.stringify(p.zobrazovana_pole ?? {}),
     JSON.stringify(p.extrahovana_tvrzeni ?? {}), p.verze_pravidel],
  );
  return { zmena };
}

async function zapisDavku(klient, davka) {
  const behId = randomUUID();
  let novych = 0;
  let zmenenych = 0;
  let prepoctenych = 0;
  let zdrojuOk = 0;

  await klient.query(
    `insert into sklizen_beh (id, zahajeno, zdroju_zkouseno, verze_pravidel)
     values ($1, $2, $3, $4)`,
    [behId, davka.meta.zahajeno, davka.meta.zdroju_zkouseno, davka.meta.verze_pravidel],
  );

  for (const zdroj of davka.zdroje) {
    // Každý zdroj má vlastní transakci: jeden rozbitý web nesmí zahodit
    // úspěšnou sklizeň ostatních.
    await klient.query('begin');
    try {
      const dotcena = new Set();
      if (zdroj.stav === 'ok') {
        zdrojuOk += 1;
        for (const p of zdroj.polozky ?? []) {
          const { zmena } = await ulozPolozku(klient, zdroj.redizo, p);
          if (zmena === 'nova') novych += 1;
          if (zmena === 'zmenena') zmenenych += 1;
          if (zmena === 'prepocitana') prepoctenych += 1;
          if (zmena !== 'beze_zmeny') dotcena.add(zdroj.redizo);
        }
      }

      const chyba = zdroj.stav === 'chyba';
      const { rows } = await klient.query(
        `select chyby_v_rade from skola_feed where redizo = $1`, [zdroj.redizo],
      );
      const chybyVRade = chyba ? (rows[0]?.chyby_v_rade ?? 0) + 1 : 0;
      const dalsi = dalsiKontrola({ ...zdroj, chybyVRade }, zdroj.polozky);

      await klient.query(
        `insert into skola_feed (redizo, feed_url, zdroj, naposledy_ok, naposledy_zkouseno,
           etag, modified_since, chyby_v_rade, dalsi_kontrola_at, posledni_chyba)
         values ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9)
         on conflict (redizo) do update set
           feed_url = excluded.feed_url,
           naposledy_ok = coalesce(excluded.naposledy_ok, skola_feed.naposledy_ok),
           naposledy_zkouseno = excluded.naposledy_zkouseno,
           etag = coalesce(excluded.etag, skola_feed.etag),
           modified_since = coalesce(excluded.modified_since, skola_feed.modified_since),
           chyby_v_rade = excluded.chyby_v_rade,
           dalsi_kontrola_at = excluded.dalsi_kontrola_at,
           posledni_chyba = excluded.posledni_chyba`,
        [zdroj.redizo, zdroj.feed_url, zdroj.zdroj ?? 'sonda',
         chyba ? null : new Date().toISOString(), zdroj.etag ?? null,
         zdroj.modified_since ?? null, chybyVRade, dalsi.toISOString(),
         chyba ? String(zdroj.chyba).slice(0, 200) : null],
      );

      // Fronta změn v téže transakci jako změna, ne po commitu.
      for (const redizo of dotcena) {
        await klient.query(
          `insert into skola_invalidace (id, redizo, duvod) values ($1, $2, $3)`,
          [randomUUID(), redizo, 'zmena polozek'],
        );
      }
      await klient.query('commit');
    } catch (chyba) {
      await klient.query('rollback');
      console.error(`❌ Zdroj ${zdroj.redizo} se nezapsal:`, chyba instanceof Error ? chyba.message : chyba);
    }
  }

  await klient.query(
    `update sklizen_beh set dokonceno = now(), zdroju_ok = $2,
       polozek_novych = $3, polozek_zmenenych = $4 where id = $1`,
    [behId, zdrojuOk, novych, zmenenych],
  );
  // Do běhu se ukládají jen změny obsahu: `polozek_zmenenych` má v přehledu
  // znamenat „tolik článků školy přepsaly", ne „tolik řádků jsme přepsali my".
  // Přepočty po změně verze pravidel proto jdou jen do výpisu běhu.
  console.log(
    `Zapsáno: ${novych} nových, ${zmenenych} změněných položek, `
    + `${prepoctenych} přepočtených po změně pravidel, ${zdrojuOk} zdrojů ok.`,
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const exportKam = argv[argv.indexOf('--export-stav') + 1];
  const davkaZ = argv[argv.indexOf('--davka') + 1];
  if (!argv.includes('--export-stav') && !argv.includes('--davka')) {
    console.error('Použití: --export-stav <soubor> | --davka <soubor>');
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: pripojeni() });
  const klient = await pool.connect();
  try {
    if (argv.includes('--export-stav')) await exportStav(klient, exportKam);
    if (argv.includes('--davka')) {
      await zapisDavku(klient, JSON.parse(readFileSync(davkaZ, 'utf8')));
    }
  } finally {
    klient.release();
    await pool.end();
  }
}

// Jen při spuštění z příkazové řádky: test si sem sahá pro `zmenaProtiUlozene`
// a nesmí přitom otevřít databázi.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((chyba) => {
    // Chybu vypisujeme bez připojovacího řetězce.
    console.error('Zápis selhal:', chyba instanceof Error ? chyba.message : chyba);
    process.exitCode = 1;
  });
}
