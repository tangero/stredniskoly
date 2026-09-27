import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_KRITERII, MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import { kriteriaSkoly, mapujDipsyNabidky, oboryProKriteria, overenePodkladyKriterii, overZadani, vyberKriteria, zapisKriteria } from '../src/lib/portal-kriteria.ts';
import { odkazNaPodklad, stavKriterii } from '../src/lib/kriteria-stav.ts';

const REDIZO = '600171701';

async function novaDb() {
  const db = new PGlite();
  for (const prikaz of [...MIGRACE_PORTALU, ...MIGRACE_KRITERII]) await db.exec(prikaz);
  const roleId = randomUUID();
  await db.query(`insert into portal_role (id, redizo, osoba_id, role, email, jmeno, zmenu_provedl)
    values ($1,$2,$3,'spravce','skola@example.test','Správce','test')`, [roleId, REDIZO, randomUUID()]);
  const wrapper = (client) => ({ dotaz: async (sql, args = []) => {
    const result = await client.query(sql, args);
    return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
  } });
  return { db, roleId, s: wrapper(db), tx: (fn) => db.transaction((client) => fn(wrapper(client))) };
}

function zadani(roleId, extra = {}) {
  return { redizo: REDIZO, oborKlic: `${REDIZO}_79-41-K/41`, rok: 2027,
    kolo: null, rezim: 'jine', popis: 'Matematika × 1,5', odkaz: '', podkladRok: 2026,
    oborIdentita: { redizo: REDIZO, izo: 'izo_061385476', kkov: '79-41-K/41', zamereni: '',
      forma: 'den', delkaStudia: 4, zdrojId: 'nabidka-2026', podkladRok: 2026 },
    roleId, ocekavaneId: null, ...extra };
}

test('vstup vyžaduje určitý rok, kolo a popis odlišného bodování', () => {
  const base = { oborKlic: 'obor', rok: 2027, kolo: null, rezim: 'jine', popis: 'Matematika × 1,5', odkaz: '', ocekavaneId: null };
  assert.equal(overZadani(base).ok, true);
  assert.equal(overZadani({ ...base, rok: 2028 }).ok, false);
  assert.equal(overZadani({ ...base, kolo: 0 }).ok, false);
  assert.equal(overZadani({ ...base, kolo: 3 }).ok, true);
  assert.equal(overZadani({ ...base, kolo: 4 }).ok, false);
  assert.equal(overZadani({ ...base, popis: '' }).ok, false);
  assert.equal(overZadani({ ...base, odkaz: 'javascript:alert(1)' }).ok, false);
});

test('obory 2027 jsou zatím výslovně odvozené z nabídky 2026', async () => {
  const obory2026 = await oboryProKriteria(REDIZO, 2026, { online: false });
  const obory2027 = await oboryProKriteria(REDIZO, 2027, { online: false });
  assert.ok(obory2026.length > 0);
  assert.deepEqual(obory2027.map((o) => o.klic), obory2026.map((o) => o.klic));
  assert.ok(obory2027.every((o) => o.podkladRok === 2026));
  assert.ok(obory2027.every((o) => o.konaJPZ === null));
  assert.ok(obory2027.every((o) => o.zdrojTyp === 'katalog'));
  assert.equal((await oboryProKriteria('000000000', 2027, { online: false })).length, 0);
});

test('DiPSy karty filtrují skutečný ročník a patřící školu', () => {
  const card = { id: randomUUID(), skolniRok: 2027, kolo: 1, zamereni: '',
    skolniObor: { kod: '79-41-K/41', nazev: 'Gymnázium', formaStudia: 'FormaStudia/den', delkaStudia: 4 },
    skola: { izo: '061385476' }, reditelstviSkoly: { redizo: REDIZO } };
  assert.equal(mapujDipsyNabidky([{ ...card, skolniRok: 2026 }], REDIZO, 2027).length, 0);
  assert.equal(mapujDipsyNabidky([{ ...card, reditelstviSkoly: { redizo: '123' } }], REDIZO, 2027).length, 0);
  assert.equal(mapujDipsyNabidky([card], REDIZO, 2027).length, 1);
  assert.equal(mapujDipsyNabidky([card], REDIZO, 2027)[0].konaJPZ, null);
  assert.equal(mapujDipsyNabidky([card], REDIZO, 2027)[0].zdrojTyp, 'dipsy');
  assert.equal(mapujDipsyNabidky([{ ...card, konaJPZ: false }], REDIZO, 2027)[0].konaJPZ, false);
  const secondRound = mapujDipsyNabidky([{ ...card, id: randomUUID(), kolo: 2 }], REDIZO, 2027);
  assert.equal(secondRound[0].klic, mapujDipsyNabidky([card], REDIZO, 2027)[0].klic);
});

test('konkrétní kolo přebije společné pravidlo, jiná kola je dědí', async () => {
  const { roleId, s, tx } = await novaDb();
  await tx((t) => zapisKriteria(t, zadani(roleId)));
  await tx((t) => zapisKriteria(t, zadani(roleId, { kolo: 2, popis: 'Ve 2. kole navíc školní test' })));
  const rows = await kriteriaSkoly(s, REDIZO, 2027);
  assert.equal(rows.length, 2);
  assert.equal(vyberKriteria(rows, zadani(roleId).oborKlic, 2027, 1).popis, 'Matematika × 1,5');
  assert.equal(vyberKriteria(rows, zadani(roleId).oborKlic, 2027, 2).popis, 'Ve 2. kole navíc školní test');
  assert.equal(vyberKriteria(rows, zadani(roleId).oborKlic, 2027, 3).popis, 'Matematika × 1,5');
  assert.equal(vyberKriteria(rows, zadani(roleId).oborKlic, 2026, 1), null);
});

test('změna uchová historii a odmítne starý formulář', async () => {
  const { db, roleId, s, tx } = await novaDb();
  const first = await tx((t) => zapisKriteria(t, zadani(roleId)));
  const second = await tx((t) => zapisKriteria(t, zadani(roleId, { ocekavaneId: first.id, popis: 'Matematika × 2' })));
  await assert.rejects(() => tx((t) => zapisKriteria(t, zadani(roleId, { ocekavaneId: first.id, popis: 'Starý formulář' }))), /mezitím změnil/);
  assert.equal((await kriteriaSkoly(s, REDIZO, 2027))[0].id, second.id);
  const history = await db.query(`select id, zneplatneno, nahrazuje_id from portal_kriteria order by poradi`);
  assert.equal(history.rows.length, 2);
  assert.ok(history.rows[0].zneplatneno);
  assert.equal(history.rows[1].nahrazuje_id, first.id);
  assert.equal(second.obor_identita.podkladRok, 2026);
  assert.equal(second.obor_identita.kkov, '79-41-K/41');
});

test('pravidla 2026 jsou pouze historický kontext pro 2027; výjimka kola má přednost', () => {
  const oborKlic = 'obor-a';
  const vzor = { id: randomUUID(), oborKlic, rok: 2026, kolo: null, rezim: 'jine',
    popis: 'Matematika × 1,5', zdroj: 'dipsy_pdf', zdrojUrl: 'https://dipsy.gov.cz/',
    zjistenoAt: '2026-09-24T06:00:00Z', publikovanoAt: null, overenoAt: '2026-09-24T07:00:00Z' };
  const pravidla = [vzor, { ...vzor, id: randomUUID(), kolo: 2, rezim: 'pouze_jpz', popis: '' }];
  const prvni = stavKriterii(pravidla, oborKlic, 2027, 1);
  assert.equal(prvni.stav, 'historicka');
  assert.equal(prvni.rok, 2026);
  assert.equal(prvni.vyssiPrioritaOvereni, true);
  const druhe = stavKriterii(pravidla, oborKlic, 2027, 2);
  assert.equal(druhe.stav, 'historicka');
  assert.equal(druhe.pravidla[0].rezim, 'pouze_jpz');
  assert.equal(druhe.vyssiPrioritaOvereni, false);
  const aktualni = stavKriterii([...pravidla, { ...vzor, id: randomUUID(), rok: 2027, kolo: 1 }], oborKlic, 2027, 1);
  assert.equal(aktualni.stav, 'aktualni');
  assert.equal(aktualni.rok, 2027);
  assert.equal(stavKriterii(pravidla, oborKlic, 2028, 1).stav, 'nezname');
});

test('rozpor zdrojů nepředstírá potvrzené pravidlo', () => {
  const vzor = { id: randomUUID(), oborKlic: 'obor-a', rok: 2027, kolo: null, rezim: 'pouze_jpz',
    popis: '', zdroj: 'skola', zdrojUrl: '', zjistenoAt: '2027-01-20T10:00:00Z',
    publikovanoAt: null, overenoAt: null };
  const stav = stavKriterii([vzor, { ...vzor, id: randomUUID(), zdroj: 'dipsy_pdf', rezim: 'jine', popis: 'Matematika × 1,5' }], 'obor-a', 2027, 1);
  assert.equal(stav.stav, 'rozpor');
});

test('stejný režim s odlišným slovním popisem není automatický rozpor', () => {
  const vzor = { id: randomUUID(), oborKlic: 'obor-a', rok: 2027, kolo: null, rezim: 'jine',
    popis: 'Matematika má vyšší váhu.', zdroj: 'skola', zdrojUrl: '',
    zjistenoAt: '2027-01-20T10:00:00Z', publikovanoAt: null, overenoAt: null };
  const pdf = { ...vzor, id: randomUUID(), zdroj: 'dipsy_pdf',
    popis: 'Za test z matematiky se přiděluje více bodů.' };
  const aktualni = stavKriterii([vzor, pdf], 'obor-a', 2027, 1);
  assert.equal(aktualni.stav, 'aktualni');
  assert.deepEqual(aktualni.pravidla.map((p) => p.popis), [vzor.popis, pdf.popis]);
  const historicka = stavKriterii([{ ...vzor, rok: 2026 }, { ...pdf, rok: 2026 }], 'obor-a', 2027, 1);
  assert.equal(historicka.stav, 'historicka');
});

test('databáze nepřijme samostatná pravidla ani podklady pro nenačítané čtvrté kolo', async () => {
  const { db, roleId, tx } = await novaDb();
  await assert.rejects(() => tx((t) => zapisKriteria(t, zadani(roleId, { kolo: 4 }))));
  await assert.rejects(() => db.query(
    `insert into kriteria_podklad (id, redizo, obor_klic, rok, kolo, zdroj, zdroj_id,
       pozorovano_at, stav) values ($1,$2,'obor-a',2026,4,'dipsy_pdf','nabidka-a',now(),'kandidat')`,
    [randomUUID(), REDIZO],
  ));
});

test('z podkladu se nevykreslí nebezpečné schéma odkazu', () => {
  assert.equal(odkazNaPodklad('javascript:alert(1)'), null);
  assert.equal(odkazNaPodklad('https://dipsy.gov.cz/'), 'https://dipsy.gov.cz/');
});

test('novější neověřený podklad označí změnu; stejný hash ji nevyvolá', async () => {
  const { db, s } = await novaDb();
  const hashA = 'a'.repeat(64);
  const hashB = 'b'.repeat(64);
  const add = async (id, stav, pozorovano, rezim, overeno, hash) => db.query(
    `insert into kriteria_podklad (id, redizo, obor_klic, rok, kolo, zdroj, zdroj_id,
       pozorovano_at, overeno_at, rezim, popis, stav, obsah_sha256)
     values ($1,$2,'obor-a',2026,1,'dipsy_pdf','nabidka-a',$3,$4,$5,$6,$7,$8)`,
    [id, REDIZO, pozorovano, overeno, rezim, rezim === 'jine' ? 'Matematika × 1,5' : '', stav, hash],
  );
  await add(randomUUID(), 'overeno', '2026-01-20T10:00:00Z', 'jine', '2026-01-21T10:00:00Z', hashA);
  assert.equal((await overenePodkladyKriterii(s, REDIZO, [2026])).length, 1);
  await add(randomUUID(), 'kandidat', '2026-02-01T10:00:00Z', null, null, hashA);
  let pravidla = await overenePodkladyKriterii(s, REDIZO, [2026]);
  assert.equal(pravidla[0].novaVerzeAt, null);
  await add(randomUUID(), 'kandidat', '2026-02-02T10:00:00Z', null, null, hashB);
  pravidla = await overenePodkladyKriterii(s, REDIZO, [2026]);
  assert.equal(pravidla.length, 1);
  assert.ok(pravidla[0].novaVerzeAt);
  assert.equal(stavKriterii(pravidla, 'obor-a', 2026, 1).stav, 'zmena_k_overeni');
  await assert.rejects(() => add(randomUUID(), 'overeno', '2026-02-03T10:00:00Z', 'jine', null, hashB));
});
