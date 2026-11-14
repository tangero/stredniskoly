-- #557: vyřazení výpisu aktualit, který nepřinesl žádnou zprávu (rozhodnutí vlastníka 13. 11. 2026).
-- RED IZO 600013260: web školy má jen titulní stránku, samostatnou stránku aktualit nemá (kontrola 29. 10. 2026).
-- Sklízeč bere zdroje z registru public/skoly_vypisy.json, kde je škola vyřazená skriptem
-- scripts/build-skoly-vypisy.py (VYRAZENE); tato migrace srovná stav tabulky, aby stránka školy
-- a přehled zdrojů v administraci zdroj nevedly jako aktivní.
-- Mění jen uvedené RED IZO. Idempotentní: opakované spuštění nic nezmění. Spouští vlastník.
update skola_feed
   set aktivni = false
 where redizo in ('600013260')
   and aktivni;
