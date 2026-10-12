# Oznámení oznamovateli, že oprava je nasazená (#441)

Potvrzení hlášení chyby slibuje další e-mail, až bude oprava na webu. Tento postup ho posílá.

- **Kdy:** workflow Ověření v produkci po úspěšném nasazení main spustí `scripts/brana/oznameni-opravy.mjs`. Projde PR sloučené
  za poslední 3 dny (od 12. 10. 2026), které uzavírají issue se štítkem `bug-report` (`Closes #N`), a pro každé issue
  najde v tabulce `hlaseni_chyby` hlášení s tímto číslem (`issue`).
- **Co se pošle:** jeden e-mail na hlášení: věta z oddílu „Pro vlastníka“ v PR (bez vět, které oslovují vlastníka) a první
  adresa na webu z PR. Bez použitelné věty obecná věta „Chybu jsme opravili“. Odesílá Resend s klíčem
  idempotence podle id hlášení.
- **Nejvýš jeden:** po odeslání se v řádku nastaví `oznameno` a adresa se nahradí textem „smazáno po vyřízení“.
  Issue dostane komentář se značkou `oznameni-opravy` (bez adresy), další běh ho přeskočí. Selže-li odeslání,
  adresa i značka zůstanou a další nasazení to zkusí znovu.
- **Hlášení zavřené bez opravy PR** (duplicita, nejde o chybu, zamítnuto): nic se neposílá. Text potvrzení to říká.
  Neoznámená adresa se anonymizuje po 90 dnech od vzniku hlášení.
- **Soukromí:** adresa není v issue, v repozitáři ani ve výpisu workflow (skript vypisuje jen počty a název chyby).
- **Nastavení (vlastník):** spustit `db/migrace/007-hlaseni-oznameni.sql` v Neonu a přidat do repozitáře secrets
  `HLASENI_DATABASE_URL` (připojení k produkční databázi, ideálně role jen s právy k tabulce `hlaseni_chyby`)
  a `RESEND_API_KEY`. Bez nich skript e-maily neposílá.
- **Zkouška bez odeslání:** `--nanecisto` (potřebuje `HLASENI_DATABASE_URL`).
