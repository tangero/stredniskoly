# Podklady pro náhledy při sdílení

Ilustrace `school-illustration.png` vznikla 11. 9. 2026 vestavěným nástrojem `image_gen`. Je to fiktivní škola; neidentifikuje žádnou školu v katalogu. Společný motiv používají tři náhledy. Přesné zadání je v `docs/podklady/og-oprava-2027/image-prompt.txt`.

Texty nejsou součástí ilustrace. Vykresluje je `src/lib/og-image.tsx` pomocí plných statických fontů Noto Sans Regular/Bold, načítaných z tohoto adresáře. Česká diakritika tak nezávisí na výchozím latinském fontu ani na externím síťovém požadavku.

Zdroj fontů: https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans

Licence fontů: SIL Open Font License 1.1, úplné znění v `fonts/LICENSE`. Fontové soubory nebyly upraveny.

Rok výsledků přebírá hlavní náhled z `public/cermat_results_meta.json`. Přijímací sezóna 2027 je samostatný údaj: při změně sezóny aktualizovat společnou šablonu a související metadata, nikoli přepisovat rok výsledků na rok přijímání.
