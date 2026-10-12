// Plánovač (#461): GitHub spouští plánované běhy tohoto repozitáře jen 4 až 5krát denně (měřeno 5. až 9. 10. 2026),
// proto workflow Plánovač každých 5 minut spouští externí cron-job.org (ruční spuštění přes API, workflow_dispatch).
// Plánovač spustí workflow, které jsou na řadě, podle doby od jejich posledního ručního nebo plánovaného běhu, takže
// nevadí, když ho spustí cron-job.org i záloha GitHubu, ani když běh vypadne. Bez závislostí.
//
//   node scripts/provoz/planovac.mjs [--nanecisto]

import { pathToFileURL } from 'node:url';

const MINUTA = 60 * 1000;
// Rezerva na nepřesné spouštění: úloha s intervalem 15 minut je na řadě už po 13 minutách.
export const REZERVA = 2 * MINUTA;

/** Úlohy: `interval` v minutách, nebo `denne` v čase UTC (HH:MM). `inputs` pro workflow_dispatch. */
export const ULOHY = [
  { workflow: 'dostupnost.yml', interval: 5 },
  { workflow: 'datova-linka.yml', interval: 15, inputs: { krok: 'schvaleni', nanecisto: 'false' } },
  { workflow: 'brana-slouceni.yml', interval: 60 },
  { workflow: 'triaz.yml', interval: 60 },
  { workflow: 'tep-rutiny.yml', interval: 60 },
  { workflow: 'ceka-na-tebe.yml', denne: '06:52' },
];

/** Je úloha na řadě? `posledni` je čas posledního ručního nebo plánovaného běhu (ISO), nebo null. */
export function naRade(uloha, posledni, ted) {
  const minule = posledni ? Date.parse(posledni) : -Infinity;
  if (uloha.denne) {
    const [h, m] = uloha.denne.split(':').map(Number);
    const dnes = new Date(ted);
    const termin = Date.UTC(dnes.getUTCFullYear(), dnes.getUTCMonth(), dnes.getUTCDate(), h, m);
    return ted >= termin && minule < termin;
  }
  return ted - minule >= uloha.interval * MINUTA - REZERVA;
}

async function main() {
  const nanecisto = process.argv.includes('--nanecisto');
  const repo = process.env.GITHUB_REPOSITORY || 'tangero/stredniskoly';
  const api = async (cesta, { method = 'GET', body } = {}) => {
    const odp = await fetch(`https://api.github.com/${cesta}`, {
      method,
      headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!odp.ok) throw new Error(`${method} ${cesta}: ${odp.status} ${(await odp.text()).slice(0, 200)}`);
    return odp.status === 204 ? null : odp.json();
  };
  const ted = Date.now();
  let chyby = 0;
  for (const u of ULOHY) {
    try {
      const casy = [];
      for (const udalost of ['workflow_dispatch', 'schedule']) {
        const d = await api(`repos/${repo}/actions/workflows/${u.workflow}/runs?event=${udalost}&per_page=1`);
        if (d.workflow_runs?.[0]) casy.push(d.workflow_runs[0].created_at);
      }
      const posledni = casy.sort().pop() || null;
      if (!naRade(u, posledni, ted)) {
        console.log(`${u.workflow}: není na řadě (poslední běh ${posledni}).`);
        continue;
      }
      console.log(`${u.workflow}: spouštím (poslední běh ${posledni || 'žádný'}).`);
      if (!nanecisto) {
        await api(`repos/${repo}/actions/workflows/${u.workflow}/dispatches`, { method: 'POST', body: { ref: 'main', ...(u.inputs ? { inputs: u.inputs } : {}) } });
      }
    } catch (e) {
      chyby += 1;
      console.error(`${u.workflow}: ${e.message}`);
    }
  }
  if (chyby) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
