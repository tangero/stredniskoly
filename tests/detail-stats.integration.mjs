import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://localhost:3221';
test('skutečný detail Macharova lycea publikuje správnou škálu a počty', async () => {
  const response = await fetch(`${base}/skola/600007774-gymnazium-j-s-machara-kralovicka-technicke-lyceum/detail`);
  assert.equal(response.status, 200);
  const html = await response.text();
  // Kontrolujeme text pro čtenáře, ne přibalené hodnoty v serializovaných props.
  const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<!--.*?-->/gs, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /36,1 \/ 50 bodů/);
  assert.match(text, /30,1 \/ 50 bodů/);
  assert.match(text, /Počet přihlášek 37/);
  assert.match(text, /Přihlášky a přijatí podle priority · 2025/);
  assert.doesNotMatch(text, /Šance přijetí podle priority|Minimální body|\(těžší\)|\(lehčí\)/);
});
