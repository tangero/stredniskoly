/**
 * ETL skript: InspIS PORTÁL CSV -> file-based JSON dataset
 *
 * Usage:
 *   node scripts/import-inspis-data.js
 *
 * Environment variables:
 *   INSPIS_CSV_PATH         default: /tmp/inspis_portal_skoly.csv
 *   INSPIS_OUTPUT_PATH      default: data/inspis_school_profiles.json
 *   INSPIS_SUMMARY_PATH     default: data/inspis_coverage_summary.json
 */
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INSPIS_CSV_PATH = process.env.INSPIS_CSV_PATH || '/tmp/inspis_portal_skoly.csv';
const INSPIS_OUTPUT_PATH = process.env.INSPIS_OUTPUT_PATH || path.join('data', 'inspis_school_profiles.json');
const INSPIS_SUMMARY_PATH = process.env.INSPIS_SUMMARY_PATH || path.join('data', 'inspis_coverage_summary.json');

const QUESTION_MAPPING = {
  'Roční školné v Kč': { field: 'rocni_skolne', type: 'number' },
  'Zaměření': { field: 'zamereni', type: 'array' },
  'Aktuální počet žáků': { field: 'aktualni_pocet_zaku', type: 'number' },
  'Nejvyšší povolený počet žáků': { field: 'nejvyssi_povoleny_pocet_zaku', type: 'number' },
  'Přijímací zkoušky': { field: 'prijimaci_zkousky', type: 'single' },
  'Přijímací zkoušky z předmětů': { field: 'zkousky_z_predmetu', type: 'array' },
  'Přípravné kurzy': { field: 'pripravne_kurzy', type: 'boolean' },
  'Dny otevřených dveří (termín/y)': { field: 'dny_otevrenych_dveri', type: 'single' },
  'Termín přijímacích zkoušek': { field: 'termin_prijimacich_zkousek', type: 'single' },
  'Forma přijímacího řízení': { field: 'forma_prijimaciho_rizeni', type: 'single' },
  'Stupeň poskytovaného vzdělání': { field: 'stupen_vzdelani', type: 'array' },
  'Forma vzdělání': { field: 'forma_vzdelani', type: 'array' },
  'Způsob hodnocení': { field: 'zpusob_hodnoceni', type: 'single' },
  'Výuka cizích jazyků': { field: 'vyuka_jazyku', type: 'array' },
  'Výuka cizích jazyků metodou CLIL (v rámci výuky jiného předmětu)': { field: 'clil_metoda', type: 'boolean' },
  'Výuka cizích jazyků metodou CLIL - jazyky': { field: 'clil_jazyky', type: 'array' },
  'Využití internetu ve výuce': { field: 'vyuziti_internetu_ve_vyuce', type: 'boolean' },
  'Speciálně vybavené odborné učebny': { field: 'odborne_ucebny', type: 'array' },
  'Prostory pro výuku tělesné výchovy': { field: 'prostory_telocvik', type: 'array' },
  'Přístup k PC/internetu mimo výuku': { field: 'pristup_k_pc', type: 'boolean' },
  'Bezbariérový přístup': { field: 'bezbariery_pristup', type: 'single' },
  'Dopravní dostupnost': { field: 'dopravni_dostupnost', type: 'array' },
  'Linka MHD nebo integrované dopravy': { field: 'linka_mhd', type: 'single' },
  'Nejbližší zastávka veřejné dopravy (v metrech)': { field: 'nejblizsi_zastavka_m', type: 'number' },
  'Umístění školy v obci': { field: 'umisteni_v_obci', type: 'single' },

  // VLNA 1.5 - Komunikace a okolí (prioritní doplnění)
  'Způsob informování rodičů': { field: 'zpusob_informovani_rodicu', type: 'array' },
  'Funkce školního informačního systému': { field: 'funkce_sis', type: 'array' },
  'V blízkosti školy': { field: 'v_blizkosti_skoly', type: 'array' },
  'Místo pro trávení volného času': { field: 'mista_volny_cas', type: 'array' },

  // VLNA 2
  'Specifické akce školy (pravidelné)': { field: 'specificke_akce', type: 'array' },
  'Zájmové činnosti': { field: 'zajmove_cinnosti', type: 'array' },
  'Specifické formy výuky tělesné výchovy - sportovní kurzy': { field: 'sportovni_kurzy', type: 'array' },
  'Mezinárodní spolupráce': { field: 'mezinarodni_spoluprace', type: 'array' },
  'Zapojení do evropských projektů': { field: 'evropske_projekty', type: 'boolean' },
  'Specifické formy podpory žákům': { field: 'podpory_zaku', type: 'array' },
  'Přítomnost specialistů': { field: 'pritomnost_specialistu', type: 'array' },
  'Školní parlament': { field: 'skolni_parlament', type: 'boolean' },
  'Stipendium': { field: 'stipendium', type: 'boolean' },
  'Spolupráce s firmami': { field: 'spoluprace_s_firmami', type: 'array' },
  'Certifikáty škol': { field: 'certifikaty', type: 'array' },
  'Nabídka dalšího vzdělávání': { field: 'nabidka_dalsiho_vzdelavani', type: 'array' },
};

function normalizeQuestion(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeValue(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseBoolean(value) {
  const normalized = normalizeValue(value).toLowerCase();
  if (normalized.startsWith('ano')) return true;
  if (normalized === 'ne') return false;
  return null;
}

function parseNumber(value) {
  const cleaned = normalizeValue(value).replace(/[^\d-]/g, '');
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return Number.isNaN(num) ? null : num;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
}

function createEmptySchool(redizo) {
  return {
    redizo,
    rocni_skolne: null,
    zamereni: null,
    aktualni_pocet_zaku: null,
    nejvyssi_povoleny_pocet_zaku: null,
    prijimaci_zkousky: null,
    zkousky_z_predmetu: null,
    pripravne_kurzy: null,
    dny_otevrenych_dveri: null,
    termin_prijimacich_zkousek: null,
    forma_prijimaciho_rizeni: null,
    stupen_vzdelani: null,
    forma_vzdelani: null,
    zpusob_hodnoceni: null,
    vyuka_jazyku: null,
    clil_metoda: null,
    clil_jazyky: null,
    vyuziti_internetu_ve_vyuce: null,
    odborne_ucebny: null,
    prostory_telocvik: null,
    pristup_k_pc: null,
    bezbariery_pristup: null,
    dopravni_dostupnost: null,
    linka_mhd: null,
    nejblizsi_zastavka_m: null,
    umisteni_v_obci: null,

    specificke_akce: null,
    zajmove_cinnosti: null,
    sportovni_kurzy: null,
    mezinarodni_spoluprace: null,
    evropske_projekty: null,
    podpory_zaku: null,
    pritomnost_specialistu: null,
    skolni_parlament: null,
    stipendium: null,
    spoluprace_s_firmami: null,
    certifikaty: null,
    nabidka_dalsiho_vzdelavani: null,
    completeness_pct: 0,
  };
}

function isFilled(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function calculateCompleteness(data) {
  const keys = [
    'rocni_skolne', 'zamereni', 'aktualni_pocet_zaku', 'nejvyssi_povoleny_pocet_zaku',
    'prijimaci_zkousky', 'zkousky_z_predmetu', 'pripravne_kurzy', 'dny_otevrenych_dveri', 'termin_prijimacich_zkousek',
    'forma_prijimaciho_rizeni', 'stupen_vzdelani', 'forma_vzdelani', 'zpusob_hodnoceni',
    'vyuka_jazyku', 'clil_metoda', 'clil_jazyky', 'vyuziti_internetu_ve_vyuce',
    'odborne_ucebny', 'prostory_telocvik', 'pristup_k_pc',
    'bezbariery_pristup', 'dopravni_dostupnost', 'linka_mhd', 'nejblizsi_zastavka_m', 'umisteni_v_obci',
    'specificke_akce', 'zajmove_cinnosti', 'sportovni_kurzy', 'mezinarodni_spoluprace', 'evropske_projekty',
    'podpory_zaku', 'pritomnost_specialistu', 'skolni_parlament', 'stipendium',
    'spoluprace_s_firmami', 'certifikaty', 'nabidka_dalsiho_vzdelavani',
  ];

  const filled = keys.filter((k) => isFilled(data[k])).length;
  return Math.round((filled / keys.length) * 100);
}

async function buildInspisDataset() {
  console.log('Starting InspIS ETL (CSV -> JSON)...');
  console.log(`CSV: ${INSPIS_CSV_PATH}`);

  const input = fs.createReadStream(INSPIS_CSV_PATH, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let headers = [];
  let rowsTotal = 0;
  let rowsSS = 0;
  const rowsBySchool = new Map();
  const unmappedQuestions = new Map();

  for await (const lineRaw of rl) {
    if (!lineRaw) continue;
    const line = lineRaw.replace(/^\uFEFF/, '');
    const cols = parseCsvLine(line);

    if (headers.length === 0) {
      headers = cols;
      continue;
    }

    rowsTotal += 1;

    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = cols[i] || '';
    }

    if (row.Nazev_formulare !== 'Portál - SŠ') continue;
    rowsSS += 1;

    const redizo = normalizeValue(row.REDIZO || '');
    if (!redizo) continue;

    if (!rowsBySchool.has(redizo)) rowsBySchool.set(redizo, []);
    rowsBySchool.get(redizo).push(row);

    const question = normalizeQuestion(row.Nazev_otazky || '');
    if (!QUESTION_MAPPING[question]) {
      unmappedQuestions.set(question, (unmappedQuestions.get(question) || 0) + 1);
    }
  }

  console.log(`Rows total: ${rowsTotal}`);
  console.log(`Rows SŠ: ${rowsSS}`);
  console.log(`Unique schools: ${rowsBySchool.size}`);

  const schools = {};

  for (const [redizo, rows] of rowsBySchool.entries()) {
    const school = createEmptySchool(redizo);
    const arrayValues = new Map();

    for (const row of rows) {
      const question = normalizeQuestion(row.Nazev_otazky || '');
      const mapping = QUESTION_MAPPING[question];
      if (!mapping) continue;

      const value = normalizeValue(row.Odpoved || '');
      if (!value) continue;

      if (mapping.type === 'single') {
        if (!school[mapping.field]) school[mapping.field] = value;
      } else if (mapping.type === 'array') {
        if (!arrayValues.has(mapping.field)) arrayValues.set(mapping.field, new Set());
        arrayValues.get(mapping.field).add(value);
      } else if (mapping.type === 'boolean') {
        if (school[mapping.field] === null) school[mapping.field] = parseBoolean(value);
      } else if (mapping.type === 'number') {
        if (school[mapping.field] === null) school[mapping.field] = parseNumber(value);
      }
    }

    for (const [field, values] of arrayValues.entries()) {
      school[field] = Array.from(values).sort((a, b) => a.localeCompare(b, 'cs'));
    }

    school.completeness_pct = calculateCompleteness(school);
    schools[redizo] = school;
  }

  const schoolValues = Object.values(schools);
  const schoolsWithInspis = schoolValues.filter((s) => s.completeness_pct > 0).length;
  const coveragePct = rowsBySchool.size > 0
    ? Number(((schoolsWithInspis / rowsBySchool.size) * 100).toFixed(2))
    : 0;

  const topUnmapped = Array.from(unmappedQuestions.entries())
    .filter(([q]) => q.length > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([question, count]) => ({ question, count }));

  const dataset = {
    generated_at: new Date().toISOString(),
    source_csv_path: INSPIS_CSV_PATH,
    stats: {
      rows_total: rowsTotal,
      rows_ss: rowsSS,
      schools_total: rowsBySchool.size,
      schools_with_inspis: schoolsWithInspis,
      coverage_percentage: coveragePct,
      unmapped_questions_top: topUnmapped,
    },
    schools,
  };

  const summary = {
    generated_at: dataset.generated_at,
    schools_total: dataset.stats.schools_total,
    schools_with_inspis: dataset.stats.schools_with_inspis,
    coverage_percentage: dataset.stats.coverage_percentage,
    rows_ss: dataset.stats.rows_ss,
    top_unmapped_questions: dataset.stats.unmapped_questions_top,
  };

  fs.mkdirSync(path.dirname(INSPIS_OUTPUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(INSPIS_SUMMARY_PATH), { recursive: true });

  fs.writeFileSync(INSPIS_OUTPUT_PATH, JSON.stringify(dataset, null, 2));
  fs.writeFileSync(INSPIS_SUMMARY_PATH, JSON.stringify(summary, null, 2));

  console.log(`Output: ${INSPIS_OUTPUT_PATH}`);
  console.log(`Summary: ${INSPIS_SUMMARY_PATH}`);
  console.log(`Coverage: ${coveragePct}% (${schoolsWithInspis}/${rowsBySchool.size})`);
}

if (require.main === module) {
  buildInspisDataset()
    .then(() => {
      console.log('InspIS ETL complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('InspIS ETL failed:', error);
      process.exit(1);
    });
}

module.exports = { buildInspisDataset };
