import test from 'node:test';
import assert from 'node:assert/strict';
import { stavSkol } from '../src/lib/cim-skoly-ziji.ts';
import { nastavPoolProTesty } from '../src/lib/novinky-db.ts';

/**
 * Stav sběru zpráv pro prototyp Čím školy žijí. Falešný pool odpovídá podle
 * dotazu, ne podle pořadí: zdroje a zprávy se čtou souběžně.
 */
function pool(feedy, zpravy = []) {
  const query = async (sql) => {
    if (/from skola_feed/.test(sql)) return { rows: feedy, rowCount: feedy.length };
    if (/from skola_novinka/.test(sql)) return { rows: zpravy, rowCount: zpravy.length };
    return { rows: [], rowCount: 0 };
  };
  return { connect: async () => ({ query, release() {} }), query };
}

test.afterEach(() => {
  nastavPoolProTesty(null);
  delete process.env.DATABASE_URL;
});

test('výpis aktualit nahradí snímek sondy až po prvním úspěšném čtení', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([
    { redizo: '600000001', chyby_v_rade: 1, aktivni: true, typ: 'html', naposledy_ok: null },
    { redizo: '600000002', chyby_v_rade: 0, aktivni: true, typ: 'tinyfish', naposledy_ok: '2026-10-01T04:10:00.000Z' },
    { redizo: '600000003', chyby_v_rade: 0, aktivni: true, typ: 'rss', naposledy_ok: '2026-10-01T04:10:00.000Z' },
  ]));
  const s = await stavSkol(['600000001', '600000002', '600000003'], new Date('2026-10-02T08:00:00Z'));
  assert.deepEqual([s.get('600000001').vypis, s.get('600000001').kanal], [false, false]);
  assert.deepEqual([s.get('600000002').vypis, s.get('600000002').kanal], [true, false]);
  assert.deepEqual([s.get('600000003').vypis, s.get('600000003').kanal], [false, true]);
});
