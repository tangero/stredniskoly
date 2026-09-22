"""Prověrka: u kterých oborů rozhoduje vedle součtu i poměr předmětů.

Odpovídá na podnět čtenáře z 22. 9. 2026 (Gymnázium Christiana Dopplera váží
matematiku 1,5×, a ukazatel *rozhodl test* to nevidí). Není to ukazatel
k zobrazení, je to roční prověrka slepého místa; viz slovník ukazatelů,
oddíl Rozhodl test. Spouštět po každém přepnutí sady cermat-uchazeci-kolo1.

Myšlenka: když škola váží matematiku 1,5×, pak mezi uchazeči se STEJNÝM
součtem se dostali spíš ti s vyšší matematikou. Porovnáme proto přijaté
a odmítnuté kvůli kapacitě uvnitř pětibodových pásem součtu — stejné
definice soutěžících a stejná pásma jako scripts/build-pasma-prijeti.py.
"""
import openpyxl, json, collections, statistics, math, sys
from pathlib import Path
KOREN = Path(__file__).resolve().parent.parent
# Rok se předává argumentem; letopočet napevno by po přepnutí sad mlčky měřil starý ročník.
ROK = sys.argv[1] if len(sys.argv) > 1 else None
if not ROK:
    sys.exit('použití: python3 scripts/predmetovy-sklon.py <rok>   (např. 2026)')
ZDROJ = KOREN / 'data' / f'PZ{ROK}_kolo1_uchazeci_prihlasky_vysledky.xlsx'
PASMA = json.load(open(KOREN / 'public' / f'pasma_prijeti_{ROK}.json'))['data']
KAT = json.load(open(KOREN / 'public' / 'schools_data.json'))[ROK]
VYSTUP = KOREN / 'docs' / 'podklady' / f'predmetovy-sklon-{ROK}.json'
naz = {}
for r in KAT:
    naz.setdefault(f"{r.get('redizo')}_{r.get('kkov')}", (r.get('nazev',''), r.get('obor',''), r.get('obec','')))

def prijat(h): return str(h).strip() in ('1','True','true')

wb = openpyxl.load_workbook(ZDROJ, read_only=True)
it = wb.worksheets[0].iter_rows(values_only=True)
ix = {n:i for i,n in enumerate(next(it))}
obory = collections.defaultdict(lambda: {'p':[], 'n':[]})
for radek in it:
    cj, ma = radek[ix['c_procentni_skor']], radek[ix['m_procentni_skor']]
    if cj is None or ma is None: continue
    cj, ma = float(cj)/2, float(ma)/2
    for k in range(1,6):
        redizo, kkov = radek[ix[f'ss{k}_redizo']], radek[ix[f'ss{k}_kkov']]
        if not redizo or not kkov: continue
        klic = f'{redizo}_{kkov}'
        if prijat(radek[ix[f'ss{k}_prijat']]): obory[klic]['p'].append((cj+ma, ma))
        elif radek[ix[f'ss{k}_duvod_neprijeti']] == 'pro_nedostacujici_kapacitu': obory[klic]['n'].append((cj+ma, ma))

SIRKA = 5
vysledky = []
for klic, o in obory.items():
    if klic not in PASMA: continue
    if len(o['p']) < 10 or len(o['n']) < 5: continue
    biny = collections.defaultdict(lambda: {'p':[], 'n':[]})
    for s, m in o['p']: biny[int(s//SIRKA)]['p'].append(m)
    for s, m in o['n']: biny[int(s//SIRKA)]['n'].append(m)
    vahy, rozdily, vsechny_m, n_prekryv = [], [], [], 0
    for b in biny.values():
        if len(b['p']) >= 3 and len(b['n']) >= 3:
            w = min(len(b['p']), len(b['n']))
            rozdily.append(statistics.mean(b['p']) - statistics.mean(b['n'])); vahy.append(w)
            vsechny_m += b['p'] + b['n']; n_prekryv += len(b['p']) + len(b['n'])
    if not vahy or n_prekryv < 20: continue
    sklon = sum(r*w for r,w in zip(rozdily,vahy)) / sum(vahy)
    sd = statistics.pstdev(vsechny_m) if len(vsechny_m) > 1 else 0
    z = sklon / (sd / math.sqrt(n_prekryv)) if sd else 0
    p = PASMA[klic]
    vysledky.append(dict(klic=klic, nazev=naz.get(klic,('','',''))[0], obor=naz.get(klic,('','',''))[1],
        obec=naz.get(klic,('','',''))[2], typ=p.get('typ'), sklon=round(sklon,2), z=round(z,2),
        n_prekryv=n_prekryv, rozhodl_test=p.get('rozhodl_test'), median=p.get('median_prijatych'),
        prijatych=len(o['p']), kkov=klic.split('_')[1]))

json.dump(vysledky, open(VYSTUP, 'w'), ensure_ascii=False, indent=1)
print('doklad →', VYSTUP.relative_to(KOREN))
print('oborů s dostatečným překryvem:', len(vysledky))
sk = [v['sklon'] for v in vysledky]
q = statistics.quantiles(sk, n=20)
print(f'sklon (body M navíc u přijatých při stejném součtu): 5.pct {q[0]:+.1f} | medián {statistics.median(sk):+.1f} | 95.pct {q[-1]:+.1f}')
PRAH_S, PRAH_Z = 2.0, 2.5
napadne = [v for v in vysledky if abs(v['sklon']) >= PRAH_S and abs(v['z']) >= PRAH_Z]
print(f'\nNÁPADNÉ (|sklon| ≥ {PRAH_S} b a |z| ≥ {PRAH_Z}): {len(napadne)} z {len(vysledky)}')
print(f'  z toho matematika navíc: {sum(1 for v in napadne if v["sklon"]>0)} | čeština navíc: {sum(1 for v in napadne if v["sklon"]<0)}')
print('\n  podle typu školy:')
for t in sorted({v['typ'] for v in vysledky}, key=str):
    vse = [v for v in vysledky if v['typ']==t]; nap = [v for v in napadne if v['typ']==t]
    print(f'    {str(t):6s} nápadných {len(nap):3d} z {len(vse):4d} ({100*len(nap)/max(1,len(vse)):4.1f} %)')
print('\n  podle mediánu přijatých (výběrovost):')
s = sorted([v for v in vysledky if v['median'] is not None], key=lambda v: v['median'])
for i,(lo,hi) in enumerate([(0,len(s)//3),(len(s)//3,2*len(s)//3),(2*len(s)//3,len(s))]):
    c = s[lo:hi]; nap = [v for v in c if abs(v['sklon'])>=PRAH_S and abs(v['z'])>=PRAH_Z]
    print(f'    třetina {i+1} (medián {c[0]["median"]:.0f}–{c[-1]["median"]:.0f} b): nápadných {len(nap):3d} z {len(c):4d} ({100*len(nap)/len(c):4.1f} %)')
print('\n  Doppler (kontrola metody — čekáme matematiku navíc u čtyřletého):')
for v in vysledky:
    if 'Doppler' in v['nazev']: print(f'    {v["kkov"]:11s} sklon {v["sklon"]:+.1f} b  z {v["z"]:+.1f}  rozhodl_test {v["rozhodl_test"]}  n {v["n_prekryv"]}')
print('\n  20 nejnápadnějších:')
for v in sorted(napadne, key=lambda v:-abs(v['z']))[:20]:
    print(f'    {v["sklon"]:+5.1f} b  z {v["z"]:+5.1f}  rt {v["rozhodl_test"]:.3f}  n {v["n_prekryv"]:3d}  {str(v["typ"]):4s} {v["nazev"][:42]} · {v["obor"][:22]} · {v["obec"][:12]}')
