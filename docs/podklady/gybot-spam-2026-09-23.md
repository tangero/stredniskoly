# Spam ve školních novinkách Gymnázia Botičská

23. 9. 2026 nahlášeno napadení webu `gybot.cz`. Feed školy REDIZO
`600004724` zanesl do veřejného bloku novinek články propagující online
kasina. Veřejné API vracelo šest kasinových titulků jako nejnovější zprávy
ze života školy. V databázi bylo 19 položek: 11 zjevných kasinových článků,
jeden podezřelý testovací článek a sedm starších legitimních školních zpráv.

Okamžitý zásah v produkční databázi: `skola:600004724 = false`,
`skola_feed.aktivni = false` a jednotlivé přepínače `polozka:<id> = false`
pro všech 12 položek z rubriky `/nezarazene/`. Položky zůstaly v interním
záznamu pro dohled, veřejné API vrátilo prázdné seznamy. Sklízeč vypnutý
feed nevybírá.

Kontrola všech 4 835 uložených položek odhalila stejný problém u školy
`600010368` (`tgacv.cz`): všech 12 jejích uložených novinek propagovalo
hazard. Feed i veřejný blok této školy byly vypnuty a všech 12 položek
skryto. Rozšířený detektor označuje všech 23 zjevných hazardních položek
obou škol. Článek jiné školy „Stavebnický Blackjack“ označen není: samotný
název hry bez internetového sázení nebo podobného kontextu nestačí.

Následná oprava přidala úzkou detekci zjevné propagace hazardu, která vyžaduje
odpovídající motiv v titulku **i** v odkazu. Sklízeč takovou novou položku uloží,
ale zároveň ji automaticky skryje přepínačem. Ruční rozhodnutí administrátora
automat nepřepíše. V `/admin/skolni-novinky?redizo=600004724` je u každého
článku vidět podezření a stav skrytí; tlačítka „Skrýt článek“ a „Obnovit
článek“ vyžadují důvod. Čtení veřejného API vyřadí skryté položky před
omezením počtu výsledků, aby spam nevytlačil legitimní starší zprávy.

Po nasazení opravy lze přepínač `skola:600004724` vrátit na `true` a znovu
ukázat sedm legitimních uložených zpráv. Samotný feed zůstává vypnutý, dokud
škola nepotvrdí odstranění napadení a dokud nebude jeho obsah znovu ověřen.
