#!/usr/bin/env node

/**
 * Skript pro zpracování dat ČŠI (Česká školní inspekce)
 *
 * Stahuje otevřená data inspekčních zpráv z ČŠI a zpracovává je
 * do formátu vhodného pro aplikaci. Agreguje zprávy podle REDIZO
 * a vytváří přehled pro každou školu.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CSV_URL = 'https://opendata.csicr.cz/Transformation/Download/137';
const OUTPUT_FILE = path.join(__dirname, '../public/csi_inspections.json');
const TEMP_CSV = path.join(__dirname, '../data/csi/inspections.csv');

/**
 * Stáhne CSV soubor z URL
 */
function downloadCSV(url) {
  return new Promise((resolve, reject) => {
    console.log('Stahuji data ČŠI...');
    https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        console.log('✓ Data stažena');
        resolve(data);
      });
    }).on('error', reject);
  });
}

/**
 * Parsuje CSV řádek (s ohledem na quoted strings)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * Zpracuje CSV data a vytvoří agregovaný JSON
 */
function processCSV(csvData) {
  const lines = csvData.split('\n');
  const headers = parseCSVLine(lines[0]);

  // Mapa: REDIZO -> array of inspections
  const inspectionsByRedizo = new Map();

  console.log('Zpracovávám data...');

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]);
    if (values.length < 6) continue;

    const [redizo, jmeno, datumOd, datumDo, linkIZ, portalLink] = values;

    if (!inspectionsByRedizo.has(redizo)) {
      inspectionsByRedizo.set(redizo, {
        redizo,
        jmeno: jmeno.replace(/^"|"$/g, ''), // Remove quotes
        inspections: []
      });
    }

    inspectionsByRedizo.get(redizo).inspections.push({
      dateFrom: datumOd.replace(/^"|"$/g, ''),
      dateTo: datumDo.replace(/^"|"$/g, ''),
      reportUrl: linkIZ.replace(/^"|"$/g, ''),
      portalUrl: portalLink.replace(/^"|"$/g, '')
    });
  }

  // Seřadit inspekce podle data (od nejnovější)
  for (const school of inspectionsByRedizo.values()) {
    school.inspections.sort((a, b) =>
      new Date(b.dateFrom) - new Date(a.dateFrom)
    );

    // Přidat počet a datum poslední inspekce
    school.inspectionCount = school.inspections.length;
    school.lastInspectionDate = school.inspections[0]?.dateFrom || null;
  }

  // Konvertovat Map na Object
  const result = {};
  for (const [redizo, data] of inspectionsByRedizo) {
    result[redizo] = data;
  }

  console.log(`✓ Zpracováno ${inspectionsByRedizo.size} škol s ${lines.length - 1} inspekcemi`);

  return result;
}

/**
 * Hlavní funkce
 */
async function main() {
  try {
    // Stáhnout CSV
    const csvData = await downloadCSV(CSV_URL);

    // Zpracovat a agregovat data
    const processedData = processCSV(csvData);

    // Uložit jako JSON
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(processedData, null, 2),
      'utf-8'
    );

    console.log(`✓ Data uložena do: ${OUTPUT_FILE}`);
    console.log(`✓ Celkem škol: ${Object.keys(processedData).length}`);

    // Statistiky
    const totalInspections = Object.values(processedData)
      .reduce((sum, school) => sum + school.inspectionCount, 0);
    console.log(`✓ Celkem inspekcí: ${totalInspections}`);

  } catch (error) {
    console.error('Chyba:', error);
    process.exit(1);
  }
}

main();
