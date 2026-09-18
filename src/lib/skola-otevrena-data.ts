/**
 * Otevřená data stránky školy (/skola/{slug}.json a .md): tentýž obsah jako stránka,
 * sestavený z docs/stranka-skoly-2027.md. Čisté funkce bez přístupu k souborům,
 * aby JSON i Markdown vznikaly z jednoho objektu a šly testovat.
 *
 * Každý údaj od školy nese původ a datum; profil InspIS a strojové shrnutí inspekce jsou
 * označené. Přihlášky se za školu nesčítají (slovník ukazatelů, přihlášky na místo).
 */
import type { ProfilSkolyData } from './skola-profil-data';
import { zOd, type ZarazeniObtiznosti } from './obor-profil.ts';
import { vetyDruhehoKola } from './druhe-kolo-vyklad.ts';

export const VERZE_SCHEMATU = 3;
const WEB = 'https://www.prijimackynaskolu.cz';

const OBTIZNOST_TEXT: Record<ZarazeniObtiznosti, string> = {
  velmi_tezke: 'velmi těžké se dostat',
  tezke: 'těžké se dostat',
  stredne_tezke: 'středně těžké se dostat',
  vetsina_uspela: 'dostala se většina',
  kapacita_nerozhodovala: 'místo pro všechny',
};
const POPISKY_POLI: Record<string, string> = {
  dny_otevrenych_dveri: 'Dny otevřených dveří', odkaz_kriteria: 'Vyhlášená kritéria přijetí', kriteria_vlastnimi_slovy: 'Kritéria přijetí',
  pripravne_kurzy: 'Přípravné kurzy', ubytovani: 'Ubytování', ubytovani_poznamka: 'Ubytování, poznámka', stravovani: 'Stravování',
  skolne: 'Školné a poplatky', podpora_svp: 'Podpora žáků se SVP', kontakt_vychovny_poradce: 'Kontakt na výchovného poradce',
  prestupy: 'Přestupy během studia', popis_skoly: 'Škola o sobě',
};
const STAV_TEXT = { above: 'nad středem podobných škol', indistinguishable: 'nerozlišitelné od středu', below: 'pod středem podobných škol' } as const;

export interface SkolaZakladni {
  nazev: string;
  redizo: string;
  slug: string;
  adresa: string;
  obec: string;
  okres: string;
  kraj: string;
  zrizovatel: string;
}

const bezNull = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;

export function sestavOtevrenaData(skola: SkolaZakladni, d: ProfilSkolyData, obdobi: { vysledky: number | null; uchazeci: number | null; maturita: string | null }) {
  const u = d.portal?.udaje ?? {};
  const udajeSkoly = Object.entries(u)
    .filter(([, v]) => v?.hodnota?.trim())
    .map(([pole, v]) => ({ pole, hodnota: v!.hodnota, potvrzeno_dne: v!.potvrzeno_dne, puvod: pole === 'popis_skoly' ? 'text_skoly' : 'potvrdila_skola' }));
  const vypsane = d.obory.filter(o => o.vypsano);
  const i = d.inspis;

  return {
    verze_schematu: VERZE_SCHEMATU,
    nazev: skola.nazev,
    redizo: skola.redizo,
    url: `${WEB}/skola/${skola.slug}`,
    adresa: skola.adresa,
    obec: skola.obec,
    okres: skola.okres,
    kraj: skola.kraj,
    zrizovatel: skola.zrizovatel,
    web: d.web,
    poloha: d.poloha ? { lat: d.poloha.lat, lon: d.poloha.lon, nejblizsi_zastavka: d.poloha.zastavka, zastavka_km: d.poloha.zastavkaKm } : null,
    obdobi_dat: bezNull({ prijimaci_rizeni_kolo1: obdobi.vysledky, data_o_uchazecich: obdobi.uchazeci, maturita_jaro: obdobi.maturita, platnost_cermat: d.platnostDat }),
    pocet_oboru: vypsane.length,
    celkova_kapacita: vypsane.reduce((s, o) => s + (o.kapacita ?? 0), 0),
    obory: d.obory.map(o => bezNull({
      nazev: o.nazev,
      url: `${WEB}${o.href}`,
      delka_studia: o.delka,
      pro_koho: o.proKoho,
      srovnatelna_skupina: o.skupina,
      vypsano_v_roce: o.vypsano ? d.rok : null,
      kapacita: o.kapacita,
      prihlasky: o.prihlasky,
      prijati: o.prijati,
      soutezici_uchazeci: o.soutezici,
      obtiznost_prijeti: o.zarazeni,
      obtiznost_prijeti_text: o.zarazeni ? OBTIZNOST_TEXT[o.zarazeni] : null,
      predchozi_rok: o.predchoziRok,
      obtiznost_prijeti_predchozi: o.zarazeniPredchozi,
      tlak_prvnich_voleb: o.tlak,
      cj_prijati: o.cjPrijati,
      ma_prijati: o.maPrijati,
      prumerne_umisteni_prijatych: o.umisteniPrijatych,
      novy_obor: o.novy || null,
      drivejsi_nazev: o.drivejsiNazev,
      druhe_kolo: o.druheKolo ? (() => {
        const v = vetyDruhehoKola(o.druheKolo);
        return {
          rok: o.druheKolo.rok,
          ...o.druheKolo.zaznam,
          predchozi_rok: o.druheKolo.predchozi ? { rok: o.druheKolo.rok - 1, ...o.druheKolo.predchozi } : null,
          popis: [v.hlavni, ...v.doplnky, v.predchozi].filter(Boolean).join(' '),
        };
      })() : null,
    })),
    maturita: d.maturita ? {
      obdobi: 'jaro',
      skupiny_oboru: d.maturita.skupiny.map(s => ({
        smo16: s.smo16,
        nazev: s.nazev,
        let_nad_skupinou: s.letNad,
        let_se_zarazenim: s.letSeZarazenim,
        skol_ve_skupine: s.skolVeSkupine,
        stred_podobnych_skol_procent_bodu: s.stredPodobnychSkol,
        roky: s.roky.filter(r => r.zaznam).map(r => bezNull({
          rok: r.rok,
          spolecna_cast: r.zaznam!.spolecna_cast ?? null,
          cestina: r.zaznam!.cj ?? null,
          matematika: r.zaznam!.ma ?? null,
          zarazeni_proti_skupine: r.stav,
        })),
      })),
    } : null,
    udaje_od_skoly: udajeSkoly,
    inspekce: d.inspekce ? {
      datum: d.inspekce.datum,
      puvod: 'shrnuti_vytvorene_automaticky_ze_zpravy_csi',
      shrnuti: d.inspekce.souhrn,
      prednosti: d.inspekce.silne,
      vytky: d.inspekce.rizika,
      komu_skola_sedne: d.inspekce.sedi,
      kdo_ma_byt_opatrny: d.inspekce.opatrne,
      otazky_na_den_otevrenych_dveri: d.inspekce.otazky,
      zmena_od_minula: d.inspekce.zmena,
    } : null,
    inspekcni_zpravy: (d.inspekceSeznam?.inspections ?? []).map(z => ({ od: z.dateFrom.slice(0, 10), do: z.dateTo.slice(0, 10), zprava: z.reportUrl })),
    profil_inspis: i ? {
      puvod: 'starsi_udaj_inspis_export_2026-02-11',
      ...bezNull({
        pocet_zaku: i.aktualni_pocet_zaku,
        nejvyssi_povoleny_pocet_zaku: i.nejvyssi_povoleny_pocet_zaku,
        rocni_skolne: i.rocni_skolne,
        bezbarierovy_pristup: i.bezbariery_pristup,
        specialiste: i.pritomnost_specialistu,
        cizi_jazyky: i.vyuka_jazyku?.filter(j => j !== 'jiné'),
        odborne_ucebny: i.odborne_ucebny,
        doprava: i.dopravni_dostupnost,
        umisteni_v_obci: i.umisteni_v_obci,
      }),
    } : null,
    soubezne_prihlasky: d.soubeh ? {
      rok: d.soubeh.rok,
      poznamka: 'Počty se mezi obory školy nesčítají; jeden uchazeč mohl mít na přihlášce více oborů školy.',
      obory: d.soubeh.obory.map(o => ({
        obor: o.nazev,
        uchazecu: o.uchazecu,
        dalsi_obory: o.radky.filter(r => !r.tataSkola).map(r => bezNull({
          skola: r.nazev, obec: r.obec, obor: r.obor, spolecnych_uchazecu: r.uchazecu, km_vzdusnou_carou: r.km,
          obtiznost_prijeti: r.zarazeni, url: r.href ? `${WEB}${r.href}` : null,
        })),
      })),
    } : null,
    nejblizsi_skoly_stejneho_typu: d.okoli.filter(s => s.podobna).slice(0, 8).map(s => ({ skola: s.nazev, obec: s.obec, km_vzdusnou_carou: s.km, url: `${WEB}${s.href}` })),
    zdroje: 'CERMAT (souhrny 1. kola, data o uchazečích, maturita společná část), ČŠI (inspekční zprávy, profil InspIS), rejstřík škol MŠMT, portál pro školy',
    licence: 'Údaje od škol z portálu CC BY 4.0; ostatní údaje podle podmínek zdrojů (CERMAT, ČŠI, MŠMT). Uveďte zdroj prijimackynaskolu.cz.',
  };
}

export type OtevrenaDataSkoly = ReturnType<typeof sestavOtevrenaData>;

const cislo = (n: number, desetin = 0) => n.toLocaleString('cs-CZ', { minimumFractionDigits: desetin, maximumFractionDigits: desetin });

export function otevrenaDataMarkdown(o: OtevrenaDataSkoly): string {
  const r: string[] = [];
  r.push(`# ${o.nazev}`, '', `> ${o.obec}, ${o.kraj} · ${o.url}`, '');
  r.push('## Základní informace', '');
  r.push(`- **Adresa:** ${o.adresa}`, `- **Okres:** ${o.okres}`, `- **Kraj:** ${o.kraj}`, `- **Zřizovatel:** ${o.zrizovatel}`);
  if (o.web) r.push(`- **Web školy:** ${o.web}`);
  if (o.poloha) r.push(`- **Nejbližší zastávka:** ${o.poloha.nejblizsi_zastavka}, zhruba ${cislo(Math.round(o.poloha.zastavka_km * 100) * 10)} m`);
  r.push(`- **Obory v 1. kole ${o.obdobi_dat.prijimaci_rizeni_kolo1 ?? ''}:** ${o.pocet_oboru}, celkem ${cislo(o.celkova_kapacita)} míst`, '');

  r.push(`## Co tu lze studovat (1. kolo ${o.obdobi_dat.prijimaci_rizeni_kolo1 ?? ''})`, '');
  r.push('Obtížnost přijetí popisuje, kolik soutěžících uchazečů se v 1. kole dostalo; soutěžící uchazeči jsou ti, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš. Přihlášky se za školu nesčítají.', '');
  for (const ob of o.obory) {
    r.push(`### ${ob.nazev}, ${ob.delka_studia}leté`, '');
    r.push(`- **Pro koho:** žáci ${ob.pro_koho}`);
    if (!ob.vypsano_v_roce) r.push('- **V posledním 1. kole bez jednoznačné shody s nabídkou**; ověřte u školy');
    if (ob.kapacita != null) r.push(`- **Místa:** ${cislo(ob.kapacita)}`);
    if (ob.obtiznost_prijeti_text) {
      r.push(`- **Obtížnost přijetí:** ${ob.obtiznost_prijeti_text}${ob.soutezici_uchazeci && ob.obtiznost_prijeti !== 'kapacita_nerozhodovala' ? ` (přijato ${cislo(ob.prijati ?? 0)} ${zOd(ob.soutezici_uchazeci)} ${cislo(ob.soutezici_uchazeci)} soutěžících uchazečů)` : ''}`);
    }
    if (ob.predchozi_rok && ob.obtiznost_prijeti_predchozi) r.push(`- **V roce ${ob.predchozi_rok}:** ${OBTIZNOST_TEXT[ob.obtiznost_prijeti_predchozi]}`);
    if (ob.prihlasky != null) r.push(`- **Přihlášky:** ${cislo(ob.prihlasky)}; **přijatí:** ${cislo(ob.prijati ?? 0)}`);
    if (ob.tlak_prvnich_voleb != null) r.push(`- **Tlak prvních voleb:** ${cislo(ob.tlak_prvnich_voleb, 1)}× (kolik uchazečů chtělo obor jako 1. volbu na jedno místo)`);
    if (ob.cj_prijati != null && ob.ma_prijati != null) r.push(`- **Průměr přijatých:** čeština ${cislo(ob.cj_prijati, 1)}, matematika ${cislo(ob.ma_prijati, 1)} z 50 bodů`);
    if (ob.druhe_kolo) r.push(`- **2. kolo:** ${ob.druhe_kolo.popis}`);
    r.push(`- **Detail:** ${ob.url}`, '');
  }

  if (o.maturita) {
    r.push(`## Maturita, společná část (jaro)`, '');
    r.push('Podobné školy jsou školy se stejným typem oborů; střed znamená, že polovina z nich dopadla lépe a polovina hůř. Srovnání i střed stojí na průměrném podílu bodů z testu, tedy na jedné veličině. Výsledek z velké části odráží, koho škola přijímá, a neměří sám o sobě kvalitu výuky.', '');
    for (const s of o.maturita.skupiny_oboru) {
      r.push(`### ${s.nazev}`, '');
      r.push(`- **Čeština nad středem podobných škol:** ${s.let_nad_skupinou} ${zOd(s.let_se_zarazenim)} ${s.let_se_zarazenim} let se srovnáním`);
      r.push('', '| Rok | Maturitu udělalo | Čeština, % bodů | Střed podobných škol | Srovnání | Matematiku volilo |', '|---|---:|---:|---:|---|---:|');
      for (const rok of s.roky) {
        const cj = rok.cestina, sc = rok.spolecna_cast, ma = rok.matematika;
        r.push(`| ${rok.rok} | ${sc?.passed !== undefined && sc.registered ? `${cislo(sc.passed)} ${zOd(sc.registered)} ${cislo(sc.registered)}` : '—'} | ${cj?.averagePercentScore !== undefined ? `${cislo(cj.averagePercentScore, 1)} %` : '—'} | ${cj?.groupComparison ? `${cislo(cj.groupComparison.medianPercentScore, 1)} %` : '—'} | ${rok.zarazeni_proti_skupine ? STAV_TEXT[rok.zarazeni_proti_skupine] : 'bez srovnání'} | ${ma?.subjectChoiceShare !== undefined ? `${Math.round(ma.subjectChoiceShare)} %` : '—'} |`);
      }
      r.push('');
    }
  }

  if (o.udaje_od_skoly.length) {
    r.push('## Údaje od školy', '');
    for (const x of o.udaje_od_skoly) r.push(`- **${POPISKY_POLI[x.pole] ?? x.pole}** (${x.puvod === 'text_skoly' ? 'text školy' : 'potvrdila škola'} ${x.potvrzeno_dne}): ${x.hodnota.replace(/\n+/g, ' ')}`);
    r.push('');
  }

  if (o.inspekce) {
    r.push(`## Inspekce ČŠI ${o.inspekce.datum}`, '', '*Shrnutí vytvořené automaticky ze zprávy ČŠI.*', '', o.inspekce.shrnuti, '');
    if (o.inspekce.prednosti.length) { r.push('**Co inspekce chválí:**'); o.inspekce.prednosti.forEach(p => r.push(`- ${p.tag}: ${p.detail}`)); r.push(''); }
    if (o.inspekce.vytky.length) { r.push('**Na co si dát pozor:**'); o.inspekce.vytky.forEach(p => r.push(`- ${p.tag}: ${p.detail}`)); r.push(''); }
    if (o.inspekce.otazky_na_den_otevrenych_dveri.length) { r.push('**Na co se zeptat na dni otevřených dveří:**'); o.inspekce.otazky_na_den_otevrenych_dveri.forEach(p => r.push(`- ${p}`)); r.push(''); }
  }
  if (o.inspekcni_zpravy.length) {
    r.push('**Inspekční zprávy:**');
    o.inspekcni_zpravy.forEach(z => r.push(`- ${z.od}: ${z.zprava}`));
    r.push('');
  }

  if (o.profil_inspis) {
    const p = o.profil_inspis;
    r.push('## Profil školy (starší údaj z InspIS, export 11. 2. 2026)', '');
    if (p.pocet_zaku) r.push(`- **Žáků:** ${cislo(p.pocet_zaku)}${p.nejvyssi_povoleny_pocet_zaku ? ` (nejvýš ${cislo(p.nejvyssi_povoleny_pocet_zaku)})` : ''}`);
    if (p.specialiste?.length) r.push(`- **Specialisté:** ${p.specialiste.join(', ')}`);
    if (p.cizi_jazyky?.length) r.push(`- **Cizí jazyky:** ${p.cizi_jazyky.join(', ')}`);
    if (p.bezbarierovy_pristup) r.push(`- **Bezbariérový přístup:** ${p.bezbarierovy_pristup}`);
    if (p.doprava?.length) r.push(`- **Doprava:** ${p.doprava.join(', ')}`);
    r.push('');
  }

  if (o.soubezne_prihlasky) {
    r.push(`## Kam se hlásí stejní uchazeči (1. kolo ${o.soubezne_prihlasky.rok})`, '', o.soubezne_prihlasky.poznamka, '');
    for (const ob of o.soubezne_prihlasky.obory) {
      r.push(`### ${ob.obor} (${cislo(ob.uchazecu)} uchazečů)`, '');
      ob.dalsi_obory.forEach(x => r.push(`- ${x.skola}, ${x.obec}: ${x.obor}, ${cislo(x.spolecnych_uchazecu ?? 0)} společných${x.km_vzdusnou_carou != null ? `, ${cislo(x.km_vzdusnou_carou, 1)} km` : ''}${x.obtiznost_prijeti ? `, ${OBTIZNOST_TEXT[x.obtiznost_prijeti]}` : ''}`));
      r.push('');
    }
  }
  if (o.nejblizsi_skoly_stejneho_typu.length) {
    r.push('## Nejbližší školy se stejným typem oborů (vzdušnou čarou)', '');
    o.nejblizsi_skoly_stejneho_typu.forEach(s => r.push(`- ${s.skola}, ${s.obec}: ${cislo(s.km_vzdusnou_carou, 1)} km`));
    r.push('');
  }

  r.push('---', '', `*Zdroje: ${o.zdroje}. ${o.licence} JSON: ${o.url}.json*`, '');
  return r.join('\n');
}
