import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bezEmailu } from '../src/lib/bez-emailu.ts';

// #279: logy /api/bug-report odcházejí drainem do BetterStacku; adresa hlásícího v nich nesmí být.
const ROUTE = fs.readFileSync('src/app/api/bug-report/route.ts', 'utf8');

/** Argumenty všech volání console.* (i víceřádkových) až po uzavírací závorku. */
function volaniLogu(zdroj) {
  const vysledek = [];
  for (const m of zdroj.matchAll(/console\.(log|error|warn|info|debug)\(/g)) {
    let hloubka = 1;
    let i = m.index + m[0].length;
    while (i < zdroj.length && hloubka > 0) {
      if (zdroj[i] === '(') hloubka++;
      else if (zdroj[i] === ')') hloubka--;
      i++;
    }
    vysledek.push(zdroj.slice(m.index, i));
  }
  return vysledek;
}

test('žádné logovací volání v /api/bug-report nevkládá adresu hlásícího', () => {
  const volani = volaniLogu(ROUTE);
  assert.ok(volani.length >= 5, 'parser našel logovací volání');
  // Proměnná `email` ani `body.email` jako hodnota v šabloně nebo argument; slovo „email“ v textu nevadí.
  for (const v of volani) assert.doesNotMatch(v, /\$\{\s*(?:body\.)?email\b|[(,]\s*(?:body\.)?email\s*[,)]/, v);
  // Kontrola testu: původní tvar logu by neprošel.
  assert.match('console.log(`📧 Would send email to ${email} about`)', /\$\{\s*(?:body\.)?email\b/);
});

test('chyby, které by mohly nést adresu (Resend, databáze), jdou do logu přes bezEmailu', () => {
  const volani = volaniLogu(ROUTE);
  assert.ok(volani.some((v) => /Failed to send email/.test(v) && /bezEmailu\(errorText\)/.test(v)));
  assert.ok(volani.some((v) => /uložení selhalo/.test(v) && /bezEmailu\(/.test(v)));
  // Identifikátor pro dohledání zůstává: číslo issue.
  assert.ok(volani.some((v) => /Email sent for issue #\$\{issueNumber\}/.test(v)));
  assert.ok(volani.some((v) => /Would send email about issue #\$\{issueNumber\}/.test(v)));
});

test('bezEmailu nahradí adresu a zbytek textu nechá', () => {
  assert.equal(bezEmailu('422 - {"message":"Invalid `to` field: skola@example.cz"}'), '422 - {"message":"Invalid `to` field: [e-mail]"}');
  assert.equal(bezEmailu('Key (email)=(rodic.novak+test@example.co.uk) already exists.'), 'Key (email)=([e-mail]) already exists.');
  assert.equal(bezEmailu('<skola@example.cz>, a@b.cz'), '<[e-mail]>, [e-mail]');
  assert.equal(bezEmailu('bez adresy, issue #12'), 'bez adresy, issue #12');
});
