# Dopad sjednocení precedence ročníků na popis školy

Doklad k PR #109 (18. 9. 2026), po vypořádání code review. Vznikl srovnáním
`public/soubeh_prihlasek_{2025,2026}.json` před regenerací a po ní, hodnota po hodnotě.

**Metoda.** Popis školy se sbírá ze všech výskytů klíče `REDIZO_KKOV` v **obou** ročnících.
Za změnu se považuje rozdíl v názvu školy nebo v obci. Čísla se uvádějí v klíčích i ve
školách (unikátní `REDIZO`), protože jedna škola má víc oborů a jeden klíč se v souběhu
objevuje mnohokrát — bez toho rozlišení číslo nejde přepočítat.

Proč to zapisuji: první číslo v popisu PR (23 škol) bylo spočítané jen nad ročníkem 2026,
zatímco změna se dotýká obou; recenzent dostal 22, protože počítal unikátní `REDIZO`.
Ani jedno nebylo špatně — měřila se jiná věc, a ani jedno to neuvádělo.

## Čísla

    změněných klíčů REDIZO_KKOV: 36
    z toho škol (unikátních REDIZO): 32
      název delší: 30, název kratší: 0, změněná obec: 6

**Nesoulad s webem je nulový.** Pravidlo `nazvy_oboru.py` se srovnalo s `nazvyOboru()`
v `src/lib/obor-profil-data.ts` a porovnání obou nad 2 841 klíči, které souběh používá
a katalog vede, dalo 0 rozdílů. Zbylých 2 593 klíčů katalog nevede, takže je nemá ani
katalogová mapa `nazvyOboru()` a srovnávat není co; stránka oboru u nich popis bere
z pole `mimo_prehled` v kontextu přihlášek. Před opravou byl nesoulad 36.

**Obce nejsou jednosměrné zlepšení.** Šest změn: Ostrava → Opava u Soukromé obchodní
akademie Opava (název školy mluví pro Opavu), ale také Beroun → Králův Dvůr u MŠ
Montessori Beroun (název mluví pro Beroun), Mokrá-Horákov → Brno, Pňov-Předhradí →
Poděbrady a Trboušany → Šlapanice. Který zápis je správný, z katalogu nepoznáme;
změna jen sjednocuje, co ukazuje souběh, s tím, co ukazuje stránka oboru.

**Řazení podle `id` bylo zavrženo.** Zkoušel jsem mezi nabídkami téhož ročníku vybírat
abecedně podle `id`. U PORG, který má pod jedním klíčem osmileté gymnázium v Praze, Brně
i Ostravě, by vyhrálo Brno jen proto, že jeho `id` je bez diakritiky (`8lete` < `8leté`).
Proti dosavadnímu stavu by se tedy změnila obec bez dokladu, a navíc by vznikly tři nové
rozdíly proti webu. Nejednoznačnost se místo toho hlásí při každém běhu generátoru:
45 dvojic ročník a klíč má víc nabídek s rozdílným popisem, tedy 43 klíčů roku 2026 a po jednom z let 2024 a 2025.

## Všech 36 případů

všech 36 případů:
  600005216_65-42-M/01
    − SŠ gastronomická a hotelová s.r.o., Vrbova | Praha
    + SŠ gastronomická a hotelová s.r.o., Vrbova 1233 | Praha
  600005216_65-42-M/02
    − SŠ gastronomická a hotelová s.r.o., Vrbova | Praha
    + SŠ gastronomická a hotelová s.r.o., Vrbova 1233 | Praha
  600005836_63-41-M/02
    − Obch. akademie Praha, Vinořská | Praha
    + Obch. akademie Praha, s.r.o., Vinořská 163 | Praha
  600005836_78-42-M/08
    − Obch. akademie Praha, Vinořská | Praha
    + Obch. akademie Praha, s.r.o., Vinořská 163 | Praha
  600005861_31-43-M/01
    − VOŠ oděvního návrhářství a SPŠ oděvní, Jablonského | Praha
    + VOŠ oděvního návrhářství a SPŠ oděvní, Jablonského 333 | Praha
  600005950_79-41-K/41
    − Gymnázium FOSTRA International s.r.o., Roháčova | Praha
    + Gymnázium FOSTRA International s.r.o., Roháčova 1148 | Praha
  600006026_63-41-M/02
    − Královská střední škola, Svídnická | Praha
    + Královská střední škola, s.r.o., Svídnická 506 | Praha
  600006131_79-41-K/41
    − Gymnázium Čakovice, náměstí 25. března | Praha
    + Gymnázium Čakovice, náměstí 25. března 100 | Praha
  600006689_78-42-M/08
    − Vyšší odborná škola a Střední zem. škola, Mendelova | Benešov
    + Vyšší odborná škola a Střední zem. škola, Mendelova 131 | Benešov
  600006697_23-45-L/01
    − Střední průmyslová škola, Komenského | Vlašim
    + Střední průmyslová škola, Komenského 41 | Vlašim
  600007332_79-41-K/41
    − Dvořákovo gymnázium, Dvořákovo nám. | Kralupy nad Vltavou
    + Dvořákovo gymnázium, Dvořákovo nám. 800 | Kralupy nad Vltavou
  600012271_78-42-M/02
    − ACADEMIA MERCURII soukromá SŠ, Smiřických | Náchod
    + ACADEMIA MERCURII soukromá SŠ, s.r.o., Smiřických 740 | Náchod
  600012891_79-41-K/41
    − Krkonošské gymnázium a SOŠ, Komenského | Vrchlabí
    + Krkonošské gymnázium a Střední odborná škola, Komenského 586 | Vrchlabí
  600012891_79-41-K/81
    − Krkonošské gymnázium a SOŠ, Komenského | Vrchlabí
    + Krkonošské gymnázium a Střední odborná škola, Komenského 586 | Vrchlabí
  600013511_66-43-M/01
    − SŠ KNIH, Bzenecká | Brno
    + SŠ KNIH,o.p.s., Bzenecká 4226 | Brno
  600013839_63-41-M/02
    − Obchodní akademie ELDO, Střední | Brno
    + Obchodní akademie ELDO, o.p.s., Střední 552 | Brno
  600015726_79-41-K/41
    − Gymnázium, Smetanova | Moravský Krumlov
    + Gymnázium, Smetanova 168 | Moravský Krumlov
  600016358_63-41-M/01
    − PrimMat - Soukr. SŠ podnikatelská s.r.o., Československé armády | Frýdek-Místek
    + PrimMat - Soukr. SŠ podnikatelská s.r.o., Československé armády 482 | Frýdek-Místek
  600016366_79-41-K/41
    − Gymnázium EDUCAnet Ostrava s.r.o., Mjr. Nováka | Ostrava
    + Gymnázium EDUCAnet Ostrava s.r.o., Mjr. Nováka 1455 | Ostrava
  600016447_79-41-K/41
    − Lék. a přír. GYMNÁZIUM PRIGO, Mojmírovců | Ostrava
    + PRIGO, gymnázium 8leté a 4leté, s.r.o., Mojmírovců 1002 | Ostrava
  600016510_26-41-L/01
    − Střední škola polytechnická, Sýkorova | Havířov
    + Střední škola polytechnická, Sýkorova 613 | Havířov
  600016901_18-20-M/01
    − EDUCA - SOŠ, B. Martinů | Nový Jičín
    + EDUCA - SOŠ, s.r.o., B. Martinů 1994 | Nový Jičín
  600017290_63-41-M/01
    − Soukromá obchodní akademie Opava s.r.o., Slavíkova | Ostrava
    + Soukromá obchodní akademie Opava s.r.o., Slavíkova | Opava
  600017290_75-41-M/01
    − Soukromá obchodní akademie Opava s.r.o., Slavíkova | Ostrava
    + Soukromá obchodní akademie Opava s.r.o., Slavíkova | Opava
  600017699_23-41-M/01
    − Střední průmyslová škola, Zengrova | Ostrava
    + Střední průmyslová škola, Zengrova 822 | Ostrava
  600017869_36-47-M/01
    − SPŠ stavební, Komenského sady | Lipník nad Bečvou
    + SPŠ stavební, Komenského sady 257 | Lipník nad Bečvou
  600170837_39-41-L/01
    − Střední škola automobilní Holice, Nádražní | Holice
    + Střední škola automobilní Holice, Nádražní 301 | Holice
  651017459_18-20-M/01
    − Střední škola - Podorlické vzděl.centrum, Pulická | Dobruška
    + Střední škola - Podorlické vzděl.centrum, Pulická 695 | Dobruška
  651028922_79-41-K/41
    − 1. Slovanské gymnázium a jazyková škola, Masná | Praha
    + 1. Slovanské gymnázium a jazyková škola, Na příkopě 850 | Praha
  691000107_23-41-M/01
    − VOŠ a SPŠ, U Stadionu | Rychnov nad Kněžnou
    + VOŠ a SPŠ, U Stadionu 1166 | Rychnov nad Kněžnou
  691005265_78-42-M/01
    − MŠ Montessori Beroun, V Zahradách | Beroun
    + MŠ Montessori Beroun, V Zahradách | Králův Dvůr
  691006270_79-41-K/41
    − Základní škola a gymnázium | Mokrá-Horákov
    + Základní škola a gymnázium | Brno
  691006474_78-42-M/03
    − ZŠ a SŠ JEDNA RADOST, Školní | Pňov-Předhradí
    + ZŠ a SŠ JEDNA RADOST, Školní | Poděbrady
  691010366_78-42-M/04
    − AGEL SZdzrŠ a VOŠ zdravotnická s.r.o., Antošovická | Ostrava
    + AGEL SZdzrŠ a VOŠ zdravotnická s.r.o., Antošovická 107 | Ostrava
  691015163_79-41-K/41
    − ScioŠkola Brno Medlánky - SŠ, Hudcova | Brno
    + ScioŠkola Brno Medlánky - SŠ, s.r.o., Hudcova 367 | Brno
  691015805_79-41-K/41
    − Střední škola a základní škola Arktur | Trboušany
    + Střední škola a základní škola Arktur | Šlapanice
