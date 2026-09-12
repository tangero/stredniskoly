import json,sys,re,unicodedata,argparse,hashlib
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Porovnání adres a identifikátorů v původních XLSX CERMAT 2025/2026')
parser.add_argument('--input-dir',type=Path,required=True)
args=parser.parse_args()
sys.path.insert(0,str(ROOT/'scripts'))
from import_cermat_results import load_flat_xlsx,is_valid_flat,make_key

def norm(v):
 return re.sub(r'\s+',' ',re.sub(r'[^a-z0-9/ ]',' ',''.join(c for c in unicodedata.normalize('NFD',str(v or '')).lower() if not unicodedata.combining(c)))).strip()
def addr(r):
 street=norm(r['ULICE']);city=norm(r['OBEC']);zip=re.sub(r'\s','',str(r['PSČ'] or ''))
 return '|'.join([street,city,zip]) if street and city and re.search(r'\d',street) else None

data={y:[r for r in load_flat_xlsx(args.input_dir/f'PZ{y}_kolo1_skolobory_vysledky.xlsx') if is_valid_flat(r)] for y in [2025,2026]}
old,now=data[2025],data[2026]
oldaddr=defaultdict(list);newaddr=defaultdict(list)
for r in old:
 if addr(r): oldaddr[addr(r)].append(r)
for r in now:
 if addr(r): newaddr[addr(r)].append(r)
oldids={str(r['REDIZO']) for r in old};newids={str(r['REDIZO']) for r in now}
pairs={}
for a, rows in newaddr.items():
 for r in rows:
  for p in oldaddr.get(a,[]):
   if str(r['REDIZO'])==str(p['REDIZO']):continue
   key=(str(p['REDIZO']),str(r['REDIZO']),a)
   pairs[key]={'redizo_2025':key[0],'redizo_2026':key[1],'adresa':a,'nazev_2025':p['NÁZEV ŠKOLY'],'nazev_2026':r['NÁZEV ŠKOLY'], 'new_redizo_absent_2025':key[1] not in oldids,'old_redizo_absent_2026':key[0] not in newids,'old_same_address_current':any(str(x['REDIZO'])==key[0] for x in rows),'current_same_address_previous':any(str(x['REDIZO'])==key[1] for x in oldaddr[a]),'shared_izo':sorted({x['IZO'] for x in oldaddr[a] if str(x['REDIZO'])==key[0]}&{x['IZO'] for x in rows if str(x['REDIZO'])==key[1]})}
namechanges=[]
for a,rows in newaddr.items():
 for rid in {str(r['REDIZO']) for r in rows}:
  prev=[r for r in oldaddr.get(a,[]) if str(r['REDIZO'])==rid];cur=[r for r in rows if str(r['REDIZO'])==rid]
  if prev and {norm(r['NÁZEV ŠKOLY']) for r in prev}!={norm(r['NÁZEV ŠKOLY']) for r in cur}:
   namechanges.append({'redizo':rid,'address':a,'old':sorted({r['NÁZEV ŠKOLY'] for r in prev}),'new':sorted({r['NÁZEV ŠKOLY'] for r in cur}),'old_izo':sorted({r['IZO'] for r in prev}),'new_izo':sorted({r['IZO'] for r in cur})})
report=json.load(open(ROOT/'docs/podklady/migrace-katalogu-2027/rozbor-1004.json'))
key=lambda r:make_key(str(r['REDIZO']),r['KKOV'],r.get('ZAMĚŘENÍ OBORU') or '')
# Match report rows to new raw rows by source ID.
byuuid={str(r['ID_SOF']):r for r in now};oldkeys={key(r) for r in old}
stats=defaultdict(int)
for item in report['rows']:
 r=byuuid[item['source_id']];candidates=oldaddr.get(addr(r),[]);same=[p for p in candidates if str(p['REDIZO'])==str(r['REDIZO'])];program=[p for p in same if p['KKOV']==r['KKOV']];different=[p for p in candidates if str(p['REDIZO'])!=str(r['REDIZO'])]
 if key(r) in oldkeys:stats['exact_key_in_official_2025']+=1
 if same:stats['same_address_same_redizo']+=1
 if program:stats['same_address_same_redizo_same_kkov']+=1
 if different:stats['same_address_other_redizo']+=1
 if same and not program:stats['same_address_same_redizo_no_kkov']+=1
 if not candidates:stats['no_exact_address_2025']+=1
out={'scope':{y:{'offers':len(rows),'redizo':len({str(r['REDIZO']) for r in rows}),'addresses':len({addr(r) for r in rows if addr(r)}),'without_number_address':sum(addr(r) is None for r in rows)} for y,rows in data.items()},'cross_redizo_pairs':list(pairs.values()),'name_changes_same_address_redizo':namechanges,'pending_1004':dict(stats)}
out['source_hashes']={str(y):hashlib.sha256((args.input_dir/f'PZ{y}_kolo1_skolobory_vysledky.xlsx').read_bytes()).hexdigest() for y in [2025,2026]}
(ROOT/'docs/podklady/adresni-parovani/rozbor.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({'scope':out['scope'],'pending':dict(stats),'cross_redizo_pairs':len(pairs),'cross_redizo_addresses':len({r['adresa'] for r in pairs.values()}),'name_changes':len(namechanges)},ensure_ascii=False,indent=2))
