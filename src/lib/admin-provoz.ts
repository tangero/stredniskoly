// ============================================================================
// Přehled provozu projektu v administraci (#479, /admin/provoz). Šest otázek:
// čeká něco na vlastníka, běží stroj, dodává, je to dobré, jde to správným
// směrem, kolik to stojí. Data živě z GitHub API (veřejný repozitář, token
// zvyšuje limit), mezipaměť 10 minut. Čisté funkce jsou sdílené s testy;
// selhání jednoho zdroje nezastaví ostatní oddíly.
// ============================================================================

const REPO = 'tangero/stredniskoly';
const HODINA = 60 * 60 * 1000;
const DEN = 24 * HODINA;
export const MEZIPAMET_S = 600;
export const STARE_DNI = 3;
const MAX_KONTROL_BRANY = 150;

export type DruhCekani = 'PR ke schválení' | 'otázka' | 'návrh' | 'hlášení veřejnosti' | 'splatná připomínka';
export interface CekaPolozka { druh: DruhCekani; cislo: number; titulek: string; odkaz: string; cekaDni: number }
export interface FrontaPr { cislo: number; titulek: string; odkaz: string; cekaNa: string; rezim: string; hodinBezPohybu: number }
export interface SloucenyPr { cislo: number; tyden: string; rezim: string; hodinDoSlouceni: number; vraceni: boolean }
export interface Regrese { cislo: number; tyden: string; otevrena: boolean }
export interface Trasa { trasa: string; intervalHodin: number | null; behu24h: number | null; ocekavano24h: number | null; hodinOdUspechu: number | null; posledniVysledek: string }
export interface Projekt { cislo: number; titulek: string; odkaz: string; hotovo: number; celkem: number; dniBezPohybu: number; schvaleno: boolean }
export interface Hlaseni { cislo: number; od: 'škola' | 'veřejnost'; stariDni: number; schvaleno: boolean }

export type StavTrasy = 'chyba' | 'běží řídce' | 'pozor' | 'nezavedeno' | 'v pořádku';
export interface StavTrasyRadek { trasa: string; stav: StavTrasy; popis: string }

const zaokrouhli = (n: number) => Math.round(n * 10) / 10;
export const dniOd = (iso: string, ted: number) => zaokrouhli((ted - Date.parse(iso)) / DEN);
export const hodinOd = (iso: string, ted: number) => zaokrouhli((ted - Date.parse(iso)) / HODINA);

/** Pondělí týdne (UTC) jako RRRR-MM-DD. */
export function tydenOd(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Režim z titulku kontroly brány „Prošlo (R)“. */
export const rezimZTitulku = (t = '') => (t.match(/\(([^)]+)\)/) || [])[1] || '';

/** Titulek na jeden řádek, nejvýš 90 znaků (hlášení mívají v titulku víc řádků i podpis). */
export function kratkyTitulek(t = ''): string {
  const r = t.split('\n')[0].replace(/\s+/g, ' ').trim();
  return r.length > 90 ? `${r.slice(0, 89).trimEnd()}…` : r;
}

/** Na co čeká otevřený PR podle stavu sloučení a poslední kontroly brány. */
export function cekaNa(mergeable: string | null | undefined, kontrola: { conclusion?: string | null; output?: { summary?: string | null } } | null): string {
  const souhrn = kontrola?.output?.summary || '';
  if (mergeable === 'dirty') return 'konflikt s main';
  if (kontrola?.conclusion === 'success') return 'prošlo, čeká na sloučení';
  if (/chybí souhlas vlastníka|potřebuje schvaleno/.test(souhrn)) return 'tvůj souhlas';
  if (/review/.test(souhrn)) return 'review';
  if (/lhůt/.test(souhrn)) return 'lhůta na veto';
  if (kontrola) return 'oprava podle brány';
  return 'brána ještě nerozhodla';
}

export const STITKY_VEREJNYCH = ['bug-report', 'feature-request', 'puvod:hlaseni', 'puvod:email'];

interface IssueApi { number: number; title: string; html_url: string; body?: string | null; created_at: string; updated_at: string; labels: { name: string }[]; pull_request?: unknown; sub_issues_summary?: { total: number; completed: number } }

/** Položky čekající na vlastníka z otevřených issues (PR ke schválení se přidávají zvlášť). */
export function cekaniZIssues(issues: IssueApi[], ted: number): CekaPolozka[] {
  const dnes = new Date(ted).toISOString().slice(0, 10);
  const vysledek: CekaPolozka[] = [];
  for (const i of issues) {
    if (i.pull_request) continue;
    const s = new Set(i.labels.map((l) => l.name));
    if (s.has('trvale') || s.has('stop') || s.has('zamitnuto')) continue;
    const z = { cislo: i.number, titulek: kratkyTitulek(i.title), odkaz: i.html_url };
    if (s.has('otazka')) vysledek.push({ druh: 'otázka', ...z, cekaDni: dniOd(i.updated_at, ted) });
    else if (s.has('navrh') && !s.has('schvaleno')) vysledek.push({ druh: 'návrh', ...z, cekaDni: dniOd(i.created_at, ted) });
    else if (STITKY_VEREJNYCH.some((v) => s.has(v)) && !s.has('schvaleno')) vysledek.push({ druh: 'hlášení veřejnosti', ...z, cekaDni: dniOd(i.created_at, ted) });
    else if (s.has('pripominka')) {
      const t = (i.body || '').match(/Termín:?\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      if (t && t <= dnes) vysledek.push({ druh: 'splatná připomínka', ...z, cekaDni: dniOd(`${t}T00:00:00Z`, ted) });
    }
  }
  return vysledek;
}

export function hlaseniZIssues(issues: IssueApi[], ted: number): Hlaseni[] {
  return issues.filter((i) => !i.pull_request).flatMap((i) => {
    const s = new Set(i.labels.map((l) => l.name));
    const skola = s.has('portal-skoly');
    if (!skola && !STITKY_VEREJNYCH.some((v) => s.has(v))) return [];
    return [{ cislo: i.number, od: skola ? 'škola' as const : 'veřejnost' as const, stariDni: dniOd(i.created_at, ted), schvaleno: s.has('schvaleno') }];
  });
}

export function projektyZIssues(issues: IssueApi[], ted: number): Projekt[] {
  return issues.filter((i) => !i.pull_request && i.labels.some((l) => l.name === 'projekt')).map((i) => ({
    cislo: i.number,
    titulek: kratkyTitulek(i.title.replace(/^Projekt:\s*/, '')),
    odkaz: i.html_url,
    hotovo: i.sub_issues_summary?.completed ?? 0,
    celkem: i.sub_issues_summary?.total ?? 0,
    dniBezPohybu: dniOd(i.updated_at, ted),
    schvaleno: i.labels.some((l) => l.name === 'schvaleno'),
  }));
}

/** Stav trasy: chyba, když selhala nebo mlčí déle než dvojnásobek intervalu (aspoň 2 h); řídce, když proběhla méně než polovina plánu. */
export function stavTras(trasy: Trasa[]): StavTrasyRadek[] {
  return trasy.map((t) => {
    const h = t.hodinOdUspechu;
    const rutina = t.trasa.startsWith('Rutina');
    if (t.posledniVysledek === 'nezavedeno') return { trasa: t.trasa, stav: 'nezavedeno', popis: 'workflow ještě není na main' };
    if (t.posledniVysledek === 'failure') return { trasa: t.trasa, stav: 'chyba', popis: 'poslední běh selhal' };
    if (rutina && (h == null || h > 12)) return { trasa: t.trasa, stav: 'chyba', popis: 'tep nepřišel 12 h' };
    if (rutina && t.posledniVysledek !== 'tep zapsán') return { trasa: t.trasa, stav: 'pozor', popis: 'tep zatím nepřišel' };
    if (t.intervalHodin && h != null && h > 2 * Math.max(t.intervalHodin, 1)) return { trasa: t.trasa, stav: 'chyba', popis: `mlčí ${h} h` };
    if (t.ocekavano24h && t.behu24h != null && t.behu24h < t.ocekavano24h / 2) return { trasa: t.trasa, stav: 'běží řídce', popis: `${t.behu24h} z ${t.ocekavano24h} plánovaných běhů za 24 h` };
    return { trasa: t.trasa, stav: 'v pořádku', popis: h == null ? '' : `poslední úspěch před ${h} h` };
  });
}

export function cekaniPodleDruhu(ceka: CekaPolozka[]): { druh: DruhCekani; pocet: number; nejstarsiDni: number }[] {
  const m = new Map<DruhCekani, { druh: DruhCekani; pocet: number; nejstarsiDni: number }>();
  for (const r of ceka) {
    const g = m.get(r.druh) || { druh: r.druh, pocet: 0, nejstarsiDni: 0 };
    g.pocet += 1;
    g.nejstarsiDni = Math.max(g.nejstarsiDni, r.cekaDni);
    m.set(r.druh, g);
  }
  return [...m.values()].sort((a, b) => b.pocet - a.pocet);
}

export const POREDI_REZIMU = ['bez brány', 'R', 'E', 'souhlas', 'L', 'K', 'H2', 'neznámý'];

/** Sloučené PR po týdnech a režimech, týdny od nejstaršího. */
export function tydnyPodleRezimu(slouceno: SloucenyPr[]): { tyden: string; pocty: Record<string, number>; celkem: number }[] {
  const tydny = [...new Set(slouceno.map((r) => r.tyden))].sort();
  return tydny.map((tyden) => {
    const pocty: Record<string, number> = {};
    for (const r of slouceno.filter((x) => x.tyden === tyden)) pocty[r.rezim] = (pocty[r.rezim] || 0) + 1;
    return { tyden, pocty, celkem: Object.values(pocty).reduce((a, b) => a + b, 0) };
  });
}

/** Regrese a vrácení proti sloučeným po týdnech (nejnovější první); podíl = (regrese + vrácení) / sloučeno. */
export function kvalitaPoTydnech(slouceno: SloucenyPr[], regrese: Regrese[]) {
  const tydny = [...new Set([...slouceno.map((r) => r.tyden), ...regrese.map((r) => r.tyden)])].sort().reverse();
  return tydny.map((tyden) => {
    const s = slouceno.filter((r) => r.tyden === tyden);
    const reg = regrese.filter((r) => r.tyden === tyden).length;
    const vr = s.filter((r) => r.vraceni).length;
    return { tyden, slouceno: s.length, regrese: reg, vraceni: vr, podil: s.length ? (reg + vr) / s.length : 0 };
  });
}

export function hlaseniPodlePuvodu(hlaseni: Hlaseni[]) {
  return (['škola', 'veřejnost'] as const).map((od) => {
    const h = hlaseni.filter((r) => r.od === od);
    return { od, otevreno: h.length, bezSchvaleni: h.filter((r) => !r.schvaleno).length, nejstarsiDni: h.length ? Math.max(...h.map((r) => r.stariDni)) : 0 };
  });
}

export function median(cisla: number[]): number | null {
  if (!cisla.length) return null;
  const s = [...cisla].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return zaokrouhli(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

// ----------------------------------------------------------------------------
// Načtení z GitHubu
// ----------------------------------------------------------------------------

export const TRASY: [string, string, number | null][] = [
  ['Hlídání dostupnosti', 'dostupnost.yml', 5 / 60],
  ['Plánovač', 'planovac.yml', 5 / 60],
  ['Datová linka (schválení)', 'datova-linka.yml', 0.25],
  ['Brána sloučení', 'brana-slouceni.yml', 1],
  ['Triáž hlášení', 'triaz.yml', 1],
  ['Kontrola tepu', 'tep-rutiny.yml', 1],
  ['Ranní zpráva', 'ceka-na-tebe.yml', 24],
  ['Review (Kimi)', 'review.yml', null],
  ['Oponentura', 'oponentura.yml', null],
  ['Ověření v produkci', 'overeni-produkce.yml', null],
  ['Týdenní přehled', 'tydenni-prehled.yml', 168],
];
const ISSUE_TEPU = 462;

export interface Provoz {
  ted: number;
  ceka: CekaPolozka[] | null;
  fronta: FrontaPr[] | null;
  slouceno: SloucenyPr[] | null;
  regrese: Regrese[] | null;
  trasy: Trasa[] | null;
  projekty: Projekt[] | null;
  hlaseni: Hlaseni[] | null;
  chyby: string[];
}

type FetchFn = typeof fetch;

/** Paralelně, ale nejvýš `n` naráz. */
async function poNejvys<T, V>(n: number, polozky: T[], fn: (x: T) => Promise<V>): Promise<V[]> {
  const vysledky: V[] = new Array(polozky.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, polozky.length) }, async () => {
    while (i < polozky.length) {
      const k = i++;
      vysledky[k] = await fn(polozky[k]);
    }
  }));
  return vysledky;
}

export async function nactiProvoz({ token = process.env.GITHUB_TOKEN, ted = Date.now(), fetchFn = fetch }: { token?: string; ted?: number; fetchFn?: FetchFn } = {}): Promise<Provoz> {
  const api = async <T>(cesta: string): Promise<T> => {
    const odp = await fetchFn(`https://api.github.com/${cesta}`, {
      headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      next: { revalidate: MEZIPAMET_S },
    } as RequestInit);
    if (!odp.ok) throw new Error(`${cesta.split('?')[0]}: ${odp.status}`);
    return odp.json() as Promise<T>;
  };
  const chyby: string[] = [];
  const zkus = async <T>(nazev: string, fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (e) {
      chyby.push(`${nazev}: ${e instanceof Error ? e.message : 'chyba'}`);
      return null;
    }
  };
  type KontrolaApi = { id: number; conclusion: string | null; output?: { title?: string | null; summary?: string | null }; app?: { slug?: string } };
  const brana = async (sha: string): Promise<KontrolaApi | null> => {
    const d = await api<{ check_runs?: KontrolaApi[] }>(`repos/${REPO}/commits/${sha}/check-runs?check_name=${encodeURIComponent('Brána sloučení')}&filter=all&per_page=50`);
    return (d.check_runs || []).filter((k) => !k.app?.slug || k.app.slug === 'github-actions').sort((a, b) => b.id - a.id)[0] || null;
  };

  const issues = await zkus('issues', async () => {
    const vse: IssueApi[] = [];
    for (let s = 1; s <= 3; s++) {
      const d = await api<IssueApi[]>(`repos/${REPO}/issues?state=open&per_page=100&page=${s}`);
      vse.push(...d);
      if (d.length < 100) break;
    }
    return vse;
  });

  type PrApi = { number: number; title: string; html_url: string; updated_at: string; created_at: string; merged_at: string | null; draft?: boolean; head: { sha: string } };
  const fronta = await zkus('otevřené PR', async () => {
    const prs = (await api<PrApi[]>(`repos/${REPO}/pulls?state=open&base=main&per_page=100`)).filter((p) => !p.draft);
    return poNejvys(6, prs, async (p) => {
      const [detail, kontrola] = await Promise.all([api<{ mergeable_state?: string }>(`repos/${REPO}/pulls/${p.number}`), brana(p.head.sha)]);
      return { cislo: p.number, titulek: kratkyTitulek(p.title), odkaz: p.html_url, cekaNa: cekaNa(detail.mergeable_state, kontrola), rezim: rezimZTitulku(kontrola?.output?.title ?? ''), hodinBezPohybu: hodinOd(p.updated_at, ted) };
    });
  });

  const od = ted - 28 * DEN;
  const slouceno = await zkus('sloučené PR', async () => {
    const zavrene: PrApi[] = [];
    for (let s = 1; s <= 4; s++) {
      const d = await api<PrApi[]>(`repos/${REPO}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100&page=${s}`);
      zavrene.push(...d);
      if (d.length < 100 || Date.parse(d[d.length - 1].updated_at) < od) break;
    }
    const sloucene = zavrene.filter((p) => p.merged_at && Date.parse(p.merged_at) >= od).sort((a, b) => Date.parse(b.merged_at!) - Date.parse(a.merged_at!));
    return poNejvys(8, sloucene.map((p, index) => ({ p, index })), async ({ p, index }) => {
      const kontrola = index < MAX_KONTROL_BRANY ? await brana(p.head.sha).catch(() => null) : null;
      return {
        cislo: p.number,
        tyden: tydenOd(p.merged_at!),
        rezim: index < MAX_KONTROL_BRANY ? rezimZTitulku(kontrola?.output?.title ?? '') || 'bez brány' : 'neznámý',
        hodinDoSlouceni: zaokrouhli((Date.parse(p.merged_at!) - Date.parse(p.created_at)) / HODINA),
        vraceni: /^revert/i.test(p.title),
      };
    });
  });

  const regrese = await zkus('regrese', async () => {
    const d = await api<(IssueApi & { user?: { login?: string }; state: string })[]>(`repos/${REPO}/issues?state=all&labels=rutina&since=${new Date(od).toISOString()}&per_page=100`);
    return d.filter((i) => !i.pull_request && i.user?.login === 'github-actions[bot]' && /^Regrese/.test(i.title) && Date.parse(i.created_at) >= od)
      .map((i) => ({ cislo: i.number, tyden: tydenOd(i.created_at), otevrena: i.state === 'open' }));
  });

  const trasy = await zkus('trasy', async () => {
    type BehApi = { event: string; conclusion: string | null; status: string; created_at: string };
    const radky = await poNejvys(4, TRASY, async ([trasa, wf, interval]): Promise<Trasa> => {
      let behy: BehApi[];
      try {
        behy = (await api<{ workflow_runs: BehApi[] }>(`repos/${REPO}/actions/workflows/${wf}/runs?per_page=100&created=%3E${new Date(ted - DEN).toISOString()}`)).workflow_runs;
      } catch (e) {
        if (e instanceof Error && /404/.test(e.message)) return { trasa, intervalHodin: interval, behu24h: 0, ocekavano24h: interval ? Math.round(24 / interval) : null, hodinOdUspechu: null, posledniVysledek: 'nezavedeno' };
        throw e;
      }
      const skutecne = behy.filter((b) => b.conclusion !== 'skipped');
      let uspech = skutecne.find((b) => b.conclusion === 'success');
      if (!uspech) uspech = (await api<{ workflow_runs: BehApi[] }>(`repos/${REPO}/actions/workflows/${wf}/runs?per_page=1&status=success`)).workflow_runs[0];
      return {
        trasa,
        intervalHodin: interval,
        behu24h: interval ? behy.filter((b) => b.event === 'schedule' || b.event === 'workflow_dispatch').length : skutecne.length,
        ocekavano24h: interval ? Math.round(24 / interval) : null,
        hodinOdUspechu: uspech ? hodinOd(uspech.created_at, ted) : null,
        posledniVysledek: skutecne[0]?.conclusion || skutecne[0]?.status || 'žádný běh',
      };
    });
    const komentare = await api<{ body?: string; created_at: string; updated_at: string }[]>(`repos/${REPO}/issues/${ISSUE_TEPU}/comments?per_page=100`).catch(() => []);
    const tep = komentare.find((k) => (k.body || '').includes('<!-- tep-rutiny -->'));
    radky.unshift({ trasa: 'Rutina Claude Code (tep)', intervalHodin: 3, behu24h: null, ocekavano24h: null, hodinOdUspechu: tep ? hodinOd(tep.updated_at, ted) : null, posledniVysledek: tep && tep.updated_at !== tep.created_at ? 'tep zapsán' : 'tep zatím nepřišel' });
    const hlava = await api<{ sha: string }>(`repos/${REPO}/commits/main`);
    const kontroly = (await api<{ check_runs: { conclusion: string | null }[] }>(`repos/${REPO}/commits/${hlava.sha}/check-runs?per_page=100`)).check_runs;
    radky.push({ trasa: 'CI na main', intervalHodin: null, behu24h: null, ocekavano24h: null, hodinOdUspechu: null, posledniVysledek: kontroly.some((k) => k.conclusion === 'failure') ? 'failure' : 'success' });
    return radky;
  });

  const ceka = issues ? cekaniZIssues(issues, ted) : null;
  if (ceka && fronta) {
    for (const p of fronta.filter((x) => x.cekaNa === 'tvůj souhlas')) ceka.unshift({ druh: 'PR ke schválení', cislo: p.cislo, titulek: p.titulek, odkaz: p.odkaz, cekaDni: zaokrouhli(p.hodinBezPohybu / 24) });
  }
  return {
    ted,
    ceka,
    fronta,
    slouceno,
    regrese,
    trasy,
    projekty: issues ? projektyZIssues(issues, ted) : null,
    hlaseni: issues ? hlaseniZIssues(issues, ted) : null,
    chyby,
  };
}
