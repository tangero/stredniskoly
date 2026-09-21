import test from 'node:test';
import assert from 'node:assert/strict';
import { osloveni } from '../src/lib/portal-pozvanky.ts';
import { pozvankaDoPilotu, htmlNaText } from '../src/lib/portal-email.ts';
import { normalizeKod } from '../src/lib/portal-skol.ts';

// Oslovení se hádá z ředitelova jména. Špatně oslovená ředitelka je horší než
// neutrální „Dobrý den“, takže se rod odvozuje jen tam, kde je jistý.

test('příjmení na -ová je vždy paní ředitelka', () => {
  assert.equal(osloveni('Jana Nováková'), 'Vážená paní ředitelko');
  assert.equal(osloveni('Mgr. Eva Černá-Procházková'), 'Vážená paní ředitelko');
  assert.equal(osloveni('PhDr. Marie Svobodová, Ph.D.'), 'Vážená paní ředitelko');
});

test('typicky mužská koncovka je pan ředitel', () => {
  assert.equal(osloveni('Petr Novotný'), 'Vážený pane řediteli');
  assert.equal(osloveni('Mgr. Jan Němec'), 'Vážený pane řediteli');
  assert.equal(osloveni('Ing. Pavel Kučera'), 'Dobrý den'); // -a: rod není jistý
});

test('nejisté a chybějící jméno končí neutrálně', () => {
  assert.equal(osloveni(''), 'Dobrý den');
  assert.equal(osloveni(null), 'Dobrý den');
  assert.equal(osloveni('   '), 'Dobrý den');
  // Příjmení, kde se rod z koncovky poznat nedá.
  assert.equal(osloveni('Michal Krejčí'), 'Dobrý den');
  assert.equal(osloveni('Jiří Janů'), 'Dobrý den');
});

test('tituly se do odvození rodu nepočítají', () => {
  // Bez odfiltrování titulů by se rozhodovalo podle „Ph.D.“ místo příjmení.
  assert.equal(osloveni('Mgr. Jana Nováková, Ph.D.'), 'Vážená paní ředitelko');
  assert.equal(osloveni('doc. Ing. Petr Novotný, CSc.'), 'Vážený pane řediteli');
});

// ---------------------------------------------------------------------------
// Podoba pozvánky. Rozesílka je jednorázová a neopakovatelná: co odejde
// špatně, už se nevrátí.
// ---------------------------------------------------------------------------

const KOD = 'ABCD-EFGH-JKMN';
const pozvanka = () =>
  pozvankaDoPilotu({ osloveni: 'Vážený pane řediteli', nazevSkoly: 'Gymnázium Testovací', kod: KOD });

test('v odchozím e-mailu nejsou HTML komentáře', () => {
  // `html` jde rovnou do Resendu. Vývojářská poznámka v šabloně by dorazila
  // dvaceti ředitelům, kteří si ji přečtou přes „zobrazit originál“ — ve
  // studeném e-mailu, jehož celý smysl je nevypadat jako podvod.
  assert.doesNotMatch(pozvanka().html, /<!--/, 'v šabloně zůstal HTML komentář');
});

test('kód je v textu vybratelný samostatně', () => {
  // Nejde o ověřování: normalizeKod zahodí všechno mimo [A-Z0-9], takže
  // zkopírovaná tečka přihlášení nerozbije. Jde o čitelnost — kód na vlastním
  // řádku se opisuje líp než kód uprostřed věty.
  assert.equal(normalizeKod(`${KOD}.`), normalizeKod(KOD), 'předpoklad testu přestal platit');
  const text = htmlNaText(pozvanka().html);
  assert.match(text, new RegExp(`(^|\\n)\\s*${KOD}\\s*($|\\n)`), 'kód nestojí na vlastním řádku');
});

test('šablona pozvánky nese vlastní řádek Od', () => {
  // Odesílatel patřil jen do odesílací funkce, takže ho náhled v administraci —
  // jediná kontrola před nevratnou rozesílkou dvaceti ředitelům — neuměl ukázat.
  // Kdyby se jméno kdykoli ztratilo, odešly by kódy jménem AI asistentky, což je
  // přesně ten dojem podvodu, kvůli kterému se pozvánka podepisuje člověkem.
  assert.equal(pozvanka().odesilatel, 'Patrick Zandl – Přijímačky na školu <eda@prijimackynaskolu.cz>');
});

test('textová verze e-mailu nenechá HTML entity na očích', () => {
  // Jména správců zadávají lidé sami a `esc()` je pro HTML uvozuje. Bez
  // rozkódování by v textové části stálo „Nováková &amp; spol.“.
  const text = htmlNaText('<p>Nováková &amp; spol. &lt;pozor&gt; &quot;citace&quot;</p>');
  assert.equal(text, 'Nováková & spol. <pozor> "citace"');
});

test('dekódování entit nerozpadne uvozený text na značky', () => {
  // `&amp;` se musí nahrazovat až nakonec. Kdyby šlo první, z `&amp;lt;script&amp;gt;`
  // by v textové části e-mailu vznikl `<script>` — tedy pravý opak toho, proč
  // `esc()` existuje.
  assert.equal(htmlNaText('<p>a &amp;lt;script&amp;gt; b</p>'), 'a &lt;script&gt; b');
});
