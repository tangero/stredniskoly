import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import { potvrzeneUdaje, udajeSkoly, den } from '../src/lib/portal-profil.ts';
import { zaznamMaObsah } from '../src/lib/portal-skol.ts';

// Čtecí vrstva nad skutečným Postgresem (PGlite). Ověřuje se, že z řádků
// vznikne přesně ten tvar, jaký dosud web dostával z public/portal_skol.json.

async function novaDb() {
  const db = new PGlite();
  for (const prikaz of MIGRACE_PORTALU) await db.exec(prikaz);
  const s = {
    dotaz: async (sql, hodnoty = []) => {
      const r = await db.query(sql, hodnoty);
      return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
    },
  };
  return { db, s };
}

async function vloz(db, { redizo = '600171701', nazev = 'Gymnázium', pole, hodnota, zdroj = 'skola', kdy = null }) {
  const id = randomUUID();
  await db.query(
    `insert into portal_profil (id, redizo, pole, hodnota, nazev, verze_prijimani, zdroj, platne_od, zmenu_provedl)
     values ($1, $2, $3, $4, $5, '2027', $6, coalesce($7::timestamptz, now()), 'test')`,
    [id, redizo, pole, hodnota, nazev, zdroj, kdy],
  );
  return id;
}

test('platné údaje se složí do záznamu ve tvaru, jaký web čekal z JSONu', async () => {
  const { db, s } = await novaDb();
  await vloz(db, { pole: 'skolne', hodnota: 'Zdarma', kdy: '2026-09-10T08:00:00Z' });
  await vloz(db, { pole: 'ubytovani', hodnota: 'ne', kdy: '2026-09-12T08:00:00Z' });

  const data = await potvrzeneUdaje(s);
  assert.deepEqual(data['600171701'], {
    redizo: '600171701',
    nazev: 'Gymnázium',
    verze_prijimani: '2027',
    aktualizovano: '2026-09-12',
    udaje: {
      skolne: { hodnota: 'Zdarma', potvrzeno_dne: '2026-09-10', zdroj: 'skola' },
      ubytovani: { hodnota: 'ne', potvrzeno_dne: '2026-09-12', zdroj: 'skola' },
    },
  });
  assert.ok(zaznamMaObsah(data['600171701']));
});

test('zneplatněná hodnota ze záznamu zmizí a nechá za sebou tu novou', async () => {
  const { db, s } = await novaDb();
  const stare = await vloz(db, { pole: 'dny_otevrenych_dveri', hodnota: '24. 11. 2022', kdy: '2026-09-10T08:00:00Z' });
  await db.query(`update portal_profil set zneplatneno = now() where id = $1`, [stare]);
  await vloz(db, {
    pole: 'dny_otevrenych_dveri',
    hodnota: '12. 11. 2026',
    zdroj: 'redakce',
    kdy: '2026-09-19T08:00:00Z',
  });

  const zaznam = await udajeSkoly(s, '600171701');
  assert.deepEqual(zaznam.udaje.dny_otevrenych_dveri, {
    hodnota: '12. 11. 2026',
    potvrzeno_dne: '2026-09-19',
    zdroj: 'redakce',
  });
  assert.equal(zaznam.aktualizovano, '2026-09-19');
});

test('škola bez platné hodnoty v mapě není a jednotlivě vrací null', async () => {
  const { db, s } = await novaDb();
  const id = await vloz(db, { pole: 'skolne', hodnota: 'Zdarma' });
  await db.query(`update portal_profil set zneplatneno = now() where id = $1`, [id]);

  assert.deepEqual(await potvrzeneUdaje(s), {});
  assert.equal(await udajeSkoly(s, '600171701'), null);
});

test('školy se navzájem nemíchají', async () => {
  const { db, s } = await novaDb();
  await vloz(db, { pole: 'skolne', hodnota: 'Zdarma' });
  await vloz(db, { redizo: '600005631', nazev: 'SPŠ', pole: 'skolne', hodnota: '12 000 Kč ročně' });

  const data = await potvrzeneUdaje(s);
  assert.deepEqual(Object.keys(data).sort(), ['600005631', '600171701']);
  assert.equal(data['600005631'].nazev, 'SPŠ');
  assert.equal(data['600005631'].udaje.skolne.hodnota, '12 000 Kč ročně');
});

test('název školy se bere z poslední změny, ne z první', async () => {
  const { db, s } = await novaDb();
  await vloz(db, { pole: 'skolne', hodnota: 'Zdarma', nazev: 'Gymnázium', kdy: '2026-09-10T08:00:00Z' });
  await vloz(db, {
    pole: 'ubytovani',
    hodnota: 'ne',
    nazev: 'Gymnázium Nad Štolou, Praha 7',
    kdy: '2026-09-12T08:00:00Z',
  });

  const zaznam = await udajeSkoly(s, '600171701');
  assert.equal(zaznam.nazev, 'Gymnázium Nad Štolou, Praha 7');
});

test('den() převádí timestamptz na publikovaný tvar', () => {
  assert.equal(den('2026-09-19T22:30:00Z'), '2026-09-19');
  assert.equal(den(new Date('2026-01-05T00:00:00Z')), '2026-01-05');
});
