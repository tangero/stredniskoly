# Oznámení oznamovateli, že oprava je nasazená (#441)

Potvrzení hlášení chyby slibuje další e-mail, až bude oprava na webu. Tento postup ho posílá.

- **Kdy:** workflow Ověření v produkci po úspěšném nasazení main spustí `scripts/brana/oznameni-opravy.mjs`. Projde PR sloučené
  za poslední 3 dny (od 12. 10. 2026), které uzavírají issue se štítkem `bug-report` (`Closes #N`), a pro každé issue
  najde v tabulce `hlaseni_chyby` hlášení s tímto číslem (`issue`).
- **Co se pošle:** jeden e-mail na hlášení: obecná věta, že chyba je opravená a na webu, věta z oddílu
  `## Pro oznamovatele` v popisu PR a první adresa na webu z PR. Oddíl „Pro vlastníka“ se nepoužívá, protože tyká
  a mluví k vlastníkovi. Bez oddílu „Pro oznamovatele“ jde jen obecná věta. Odesílá Resend s klíčem idempotence
  podle id hlášení.
- **Jak psát PR:** PR, který opravuje hlášení `bug-report`, má oddíl `## Pro oznamovatele`: jedna až dvě věty pro
  člověka, který chybu nahlásil, s vykáním, bez adres a technických slov (například „Na stránce školy je teď správný
  počet míst v oboru Agropodnikání.“). Když se hlášení převedlo na nové zadání (`puvod:hlaseni`), PR uzavírá
  i původní hlášení (`Closes #<hlášení>`), jinak e-mail neodejde.
- **Nejvýš jeden:** po odeslání se v řádku nastaví `oznameno` a adresa se nahradí textem „smazáno po vyřízení“.
  Issue dostane komentář se značkou `oznameni-opravy` (bez adresy, jen když se něco odeslalo), další běh ho přeskočí.
  Když e-mail odejde, ale zápis do databáze selže, výpis uvede jen id hlášení a adresu je třeba smazat ručně. Selže-li odeslání,
  adresa i značka zůstanou a další nasazení to zkusí znovu.
- **Hlášení zavřené bez opravy PR** (duplicita, nejde o chybu, zamítnuto): nic se neposílá. Text potvrzení to říká.
  Neoznámená adresa se anonymizuje po 90 dnech od vzniku hlášení.
- **Soukromí:** adresa není v issue, v repozitáři ani ve výpisu workflow (skript vypisuje jen počty a název chyby).
- **Nastavení (vlastník):** spustit `db/migrace/007-hlaseni-oznameni.sql` v Neonu a přidat do repozitáře secrets
  `HLASENI_DATABASE_URL` (připojení k produkční databázi, ideálně role jen s právy k tabulce `hlaseni_chyby`)
  a `RESEND_API_KEY`. Bez nich skript e-maily neposílá.
- **Zkouška bez odeslání:** `--nanecisto` (potřebuje `HLASENI_DATABASE_URL`).
