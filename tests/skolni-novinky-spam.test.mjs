import test from 'node:test';
import assert from 'node:assert/strict';
import { podezreniNaSpam } from '../src/lib/skolni-novinky-spam.ts';

test('zjevné kasinové články z napadeného školního webu se označí', () => {
  const pripady = [
    ['Retrobet Casino Deutschland – Registrierung und Kontoeröffnung', 'https://www.gybot.cz/nezarazene/retrobet-casino-deutschland-registrierung-und-kontoeroffnung/'],
    ['Vox Casino gry – automaty, gry stołowe i kasyno na żywo', 'https://www.gybot.cz/nezarazene/vox-casino-gry-automaty-gry-stolowe-i-kasyno-na-zywo/'],
    ['Пин Ап Казино – Официальный сайт', 'https://www.gybot.cz/nezarazene/pin-ap-kazino-oficialnyy-sayt/'],
    ['Speelautomaten Instructies Voor Geld 2026', 'https://www.tgacv.cz/speelautomaten-instructies-voor-geld-2026/'],
    ['Progressioni Online Blackjack Elettronico', 'https://www.tgacv.cz/progressioni-online-blackjack-elettronico/'],
    ['كيف يمكنني تحديد كازينو يقدم مكافآت سخية', 'https://www.tgacv.cz/kyf-ymknny-thdyd-kzynw-yqdm-mkfat-skhy/'],
  ];
  for (const [titulek, url] of pripady) assert.ok(podezreniNaSpam(titulek, url));
});

test('samotná zmínka o hazardu školní článek automaticky neskryje', () => {
  assert.equal(podezreniNaSpam('Prevence závislosti na hazardu', 'https://skola.cz/prevence/hazard/'), null);
  assert.equal(podezreniNaSpam('Fotografie z oslavy školy', 'https://www.gybot.cz/fotogalerie/oslava/'), null);
  assert.equal(podezreniNaSpam('Stavebnický Blackjack aneb Křup a bum', 'https://skola.cz/stavebnicky-blackjack/'), null);
});
