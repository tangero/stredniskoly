#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * CSI refresh pipeline with history + diff
 *
 * Goals:
 * - Resolve current download URL from DataSet detail page (ID 69), fallback to known URL.
 * - Download source payload (CSV or JSON), normalize to stable structure by REDIZO.
 * - Write current dataset to public/csi_inspections.json.
 * - Keep historical snapshots with validity ranges (valid_from / valid_to).
 * - Generate latest diff (added/removed/changed schools).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const DATASET_DETAIL_URL = process.env.CSI_DATASET_DETAIL_URL || 'https://opendata.csicr.cz/DataSet/Detail/69';
const CSI_DOWNLOAD_FALLBACK_URL = process.env.CSI_DOWNLOAD_FALLBACK_URL || 'https://opendata.csicr.cz/Transformation/Download/139';
const CSI_SOURCE_PATH = process.env.CSI_SOURCE_PATH || '';

const OUTPUT_FILE = path.join(__dirname, '../public/csi_inspections.json');
const SNAPSHOT_DIR = path.join(__dirname, '../data/csi_snapshots');
const MANIFEST_FILE = path.join(__dirname, '../data/csi_manifest.json');
const DIFF_FILE = path.join(__dirname, '../data/csi_diff_latest.json');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({
          statusCode: response.statusCode || 200,
          headers: response.headers,
          body,
        });
      });
    }).on('error', reject);
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function isoNow() {
  return new Date().toISOString();
}

function normalizeString(v) {
  return (v || '').toString().replace(/\s+/g, ' ').trim();
}

function parseCsvLine(line) {
  const out = [];
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
      out.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

function findInsensitiveKey(obj, candidates) {
  const keys = Object.keys(obj || {});
  const map = new Map(keys.map((k) => [k.toLowerCase(), k]));
  for (const c of candidates) {
    const hit = map.get(c.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function normalizeReport(rec) {
  return {
    dateFrom: normalizeString(rec.dateFrom),
    dateTo: normalizeString(rec.dateTo),
    reportUrl: normalizeString(rec.reportUrl),
    portalUrl: normalizeString(rec.portalUrl),
  };
}

function sortReports(reports) {
  return reports.slice().sort((a, b) => new Date(b.dateFrom) - new Date(a.dateFrom));
}

function normalizeDatasetByRedizo(records) {
  const grouped = new Map();

  for (const rec of records) {
    const redizo = normalizeString(rec.redizo);
    if (!redizo) continue;
    const jmeno = normalizeString(rec.jmeno);

    if (!grouped.has(redizo)) {
      grouped.set(redizo, {
        redizo,
        jmeno,
        inspections: [],
      });
    }

    grouped.get(redizo).inspections.push(normalizeReport(rec));
  }

  const out = {};
  for (const [redizo, school] of grouped.entries()) {
    const dedup = new Map();
    for (const insp of school.inspections) {
      const key = `${insp.dateFrom}|${insp.dateTo}|${insp.reportUrl}|${insp.portalUrl}`;
      dedup.set(key, insp);
    }
    const inspections = sortReports(Array.from(dedup.values()));
    out[redizo] = {
      redizo,
      jmeno: school.jmeno,
      inspections,
      inspectionCount: inspections.length,
      lastInspectionDate: inspections[0] ? inspections[0].dateFrom : null,
    };
  }

  return out;
}

function parseCsvPayload(csvText) {
  const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return {};

  const headers = parseCsvLine(lines[0]);
  const idx = (nameCandidates) => {
    for (const c of nameCandidates) {
      const i = headers.findIndex((h) => normalizeString(h).toLowerCase() === c.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  const redizoIdx = idx(['redizo']);
  const jmenoIdx = idx(['jmeno', 'název školy', 'nazev skoly']);
  const dateFromIdx = idx(['datum od', 'datum_od', 'datefrom']);
  const dateToIdx = idx(['datum do', 'datum_do', 'dateto']);
  const reportIdx = idx(['link iz', 'reporturl', 'odkaz na zprávu', 'odkaz na zpravu']);
  const portalIdx = idx(['portal link', 'portalurl', 'odkaz na portal']);

  const records = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;

    records.push({
      redizo: redizoIdx >= 0 ? values[redizoIdx] : '',
      jmeno: jmenoIdx >= 0 ? values[jmenoIdx] : '',
      dateFrom: dateFromIdx >= 0 ? values[dateFromIdx] : '',
      dateTo: dateToIdx >= 0 ? values[dateToIdx] : '',
      reportUrl: reportIdx >= 0 ? values[reportIdx] : '',
      portalUrl: portalIdx >= 0 ? values[portalIdx] : '',
    });
  }

  return normalizeDatasetByRedizo(records);
}

function parseJsonPayload(jsonText) {
  const parsed = JSON.parse(jsonText);
  let rows = [];

  if (Array.isArray(parsed)) rows = parsed;
  if (parsed && Array.isArray(parsed.data)) rows = parsed.data;
  if (parsed && Array.isArray(parsed.items)) rows = parsed.items;

  if (!Array.isArray(rows)) return {};

  const records = rows.map((row) => {
    const redizoK = findInsensitiveKey(row, ['redizo']);
    const jmenoK = findInsensitiveKey(row, ['jmeno', 'nazev_skoly', 'nazevskoly', 'school_name']);
    const dateFromK = findInsensitiveKey(row, ['datefrom', 'date_from', 'datum_od', 'datumod']);
    const dateToK = findInsensitiveKey(row, ['dateto', 'date_to', 'datum_do', 'datumdo']);
    const reportK = findInsensitiveKey(row, ['reporturl', 'report_url', 'link_iz', 'odkaz_na_zpravu', 'pdf_url']);
    const portalK = findInsensitiveKey(row, ['portalurl', 'portal_url', 'portal_link', 'odkaz_na_portal']);

    return {
      redizo: redizoK ? row[redizoK] : '',
      jmeno: jmenoK ? row[jmenoK] : '',
      dateFrom: dateFromK ? row[dateFromK] : '',
      dateTo: dateToK ? row[dateToK] : '',
      reportUrl: reportK ? row[reportK] : '',
      portalUrl: portalK ? row[portalK] : '',
    };
  });

  return normalizeDatasetByRedizo(records);
}

async function resolveDatasetDownloadUrl(detailUrl) {
  const response = await httpGet(detailUrl);
  const html = response.body;

  const jsonCandidates = Array.from(html.matchAll(/https:\/\/opendata\.csicr\.cz\/Transformation\/Download\/\d+/g))
    .map((m) => m[0]);
  if (jsonCandidates.length === 0) {
    throw new Error(`No transformation URL found in ${detailUrl}`);
  }

  // Keep last occurrence; dataset pages often append newest transformation later in DOM.
  return jsonCandidates[jsonCandidates.length - 1];
}

function buildDiff(previousData, nextData) {
  const prevKeys = new Set(Object.keys(previousData || {}));
  const nextKeys = new Set(Object.keys(nextData || {}));

  const addedSchools = [];
  const removedSchools = [];
  const changedSchools = [];

  for (const redizo of nextKeys) {
    if (!prevKeys.has(redizo)) addedSchools.push(redizo);
  }
  for (const redizo of prevKeys) {
    if (!nextKeys.has(redizo)) removedSchools.push(redizo);
  }

  for (const redizo of nextKeys) {
    if (!prevKeys.has(redizo)) continue;
    const prev = previousData[redizo];
    const next = nextData[redizo];

    const prevHash = sha256(JSON.stringify(prev));
    const nextHash = sha256(JSON.stringify(next));
    if (prevHash === nextHash) continue;

    const prevSet = new Set((prev.inspections || []).map((r) => `${r.dateFrom}|${r.dateTo}|${r.reportUrl}|${r.portalUrl}`));
    const nextSet = new Set((next.inspections || []).map((r) => `${r.dateFrom}|${r.dateTo}|${r.reportUrl}|${r.portalUrl}`));

    const addedInspections = [];
    const removedInspections = [];

    for (const k of nextSet) if (!prevSet.has(k)) addedInspections.push(k);
    for (const k of prevSet) if (!nextSet.has(k)) removedInspections.push(k);

    changedSchools.push({
      redizo,
      school_name: next.jmeno || prev.jmeno || '',
      inspection_count_before: prev.inspectionCount || 0,
      inspection_count_after: next.inspectionCount || 0,
      added_inspections: addedInspections.length,
      removed_inspections: removedInspections.length,
    });
  }

  return {
    generated_at: isoNow(),
    summary: {
      schools_added: addedSchools.length,
      schools_removed: removedSchools.length,
      schools_changed: changedSchools.length,
    },
    added_schools: addedSchools,
    removed_schools: removedSchools,
    changed_schools: changedSchools,
  };
}

function loadJsonOrNull(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function readCurrentDatasetIfExists() {
  return loadJsonOrNull(OUTPUT_FILE) || {};
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

function createVersionId() {
  return isoNow().replace(/[:.]/g, '-');
}

function buildStats(dataset) {
  const schools = Object.keys(dataset).length;
  let inspections = 0;
  for (const school of Object.values(dataset)) {
    inspections += school.inspectionCount || 0;
  }
  return { schools, inspections };
}

function updateManifest(previousManifest, previousHash, nextHash, downloadUrl, nextData) {
  const now = isoNow();
  const manifest = previousManifest || { versions: [], current_version_id: null };

  if (previousHash === nextHash) return manifest;

  const versionId = createVersionId();
  const snapshotName = `csi_inspections_${versionId}.json`;
  const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName);
  writeJson(snapshotPath, nextData);

  const stats = buildStats(nextData);

  const versions = manifest.versions || [];
  if (versions.length > 0 && !versions[versions.length - 1].valid_to) {
    versions[versions.length - 1].valid_to = now;
  }

  versions.push({
    version_id: versionId,
    file: `data/csi_snapshots/${snapshotName}`,
    valid_from: now,
    valid_to: null,
    source_download_url: downloadUrl,
    sha256: nextHash,
    stats,
  });

  return {
    versions,
    current_version_id: versionId,
  };
}

async function main() {
  try {
    console.log('CSI refresh started');
    console.log(`Dataset page: ${DATASET_DETAIL_URL}`);

    let downloadUrl = '';
    try {
      downloadUrl = await resolveDatasetDownloadUrl(DATASET_DETAIL_URL);
      console.log(`Resolved download URL: ${downloadUrl}`);
    } catch (err) {
      downloadUrl = CSI_DOWNLOAD_FALLBACK_URL;
      console.log(`Resolve failed, using fallback: ${downloadUrl}`);
      console.log(`Reason: ${err.message}`);
    }

    let payload = '';
    if (CSI_SOURCE_PATH) {
      payload = fs.readFileSync(CSI_SOURCE_PATH, 'utf-8');
      console.log(`Loaded source from local file: ${CSI_SOURCE_PATH}`);
    } else {
      const payloadResp = await httpGet(downloadUrl);
      payload = payloadResp.body;
    }
    const trimmed = payload.trim();

    let processed = {};
    try {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        processed = parseJsonPayload(payload);
        console.log('Parsed source as JSON');
      } else {
        processed = parseCsvPayload(payload);
        console.log('Parsed source as CSV');
      }
    } catch (err) {
      console.log(`Primary parser failed (${err.message}), trying CSV fallback`);
      processed = parseCsvPayload(payload);
      console.log('Parsed source as CSV fallback');
    }

    const previousData = readCurrentDatasetIfExists();
    const previousHash = sha256(JSON.stringify(previousData));
    const nextHash = sha256(JSON.stringify(processed));

    writeJson(OUTPUT_FILE, processed);
    console.log(`Wrote current dataset: ${OUTPUT_FILE}`);

    const diff = buildDiff(previousData, processed);
    writeJson(DIFF_FILE, diff);
    console.log(`Wrote diff: ${DIFF_FILE}`);

    const previousManifest = loadJsonOrNull(MANIFEST_FILE);
    const manifest = updateManifest(previousManifest, previousHash, nextHash, downloadUrl, processed);
    writeJson(MANIFEST_FILE, manifest);
    console.log(`Wrote manifest: ${MANIFEST_FILE}`);

    const stats = buildStats(processed);
    const changed = previousHash !== nextHash;
    console.log(`Schools: ${stats.schools}`);
    console.log(`Inspections: ${stats.inspections}`);
    console.log(`Changed: ${changed ? 'yes' : 'no'}`);

    // CI output flag
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `download_url=${downloadUrl}\n`);
    }
  } catch (error) {
    console.error('CSI refresh failed:', error);
    process.exit(1);
  }
}

main();
