"""Render one feature per source building; preserve holes and unknown heights."""
from pathlib import Path
import json,gzip,math,re,hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/map-libs'))
from shapely.geometry import Polygon,MultiPolygon
source_path=ROOT/'design/assets/taipei-buildings-source.json.gz'
source=json.loads(gzip.decompress(source_path.read_bytes()))
def metres(raw):
 match=re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*(m|米|公尺|ft|feet|\')?\s*',raw or '')
 if not match:return None
 value=float(match[1])*(.3048 if match[2] in {'ft','feet',"'"} else 1)
 return round(value,2) if 0<=value<=1000 else None
def levels(raw):
 try:
  value=float(raw);return value if math.isfinite(value) and 0<value<=200 else None
 except (ValueError,TypeError):return None
buildings=[];index={};counts={};max_error=0;fallbacks=[]
for item in source['buildings']:
 polygons=[]
 for polygon in item['polygons']:
  rings=[]
  for ring in polygon:
   rounded=[]
   for p in ring:
    q=[round(p[0],1),round(p[1],1)];max_error=max(max_error,math.dist(p,q))
    if not rounded or rounded[-1]!=q:rounded.append(q)
   if rounded[0]!=rounded[-1]:rounded.append(rounded[0])
   if len(rounded)>=4:rings.append(rounded)
  if rings:polygons.append(rings)
 if len(polygons)!=len(item['polygons']) or any(len(a)!=len(b) for a,b in zip(polygons,item['polygons'])) or not MultiPolygon([Polygon(p[0],p[1:]) for p in polygons]).is_valid:
  polygons=item['polygons'];fallbacks.append(item['id'])
 if not polygons:continue
 points=[p for poly in polygons for ring in poly for p in ring];xs=[p[0] for p in points];ys=[p[1] for p in points];bounds=[min(xs),min(ys),max(xs),max(ys)]
 t=item['tags'];record=[item['id'],{'zh-TW':t.get('name:zh-Hant',t.get('name','')),'en':t.get('name:en','')},t['building'],metres(t.get('height')),levels(t.get('building:levels')),metres(t.get('min_height')),bounds,polygons,item['districtIds']]
 i=len(buildings);buildings.append(record)
 for x in range(math.floor(bounds[0]/500),math.floor(bounds[2]/500)+1):
  for y in range(math.floor(bounds[1]/500),math.floor(bounds[3]/500)+1):index.setdefault(f'{x},{y}',[]).append(i)
 for id in item['districtIds']:counts[id]=counts.get(id,0)+1
out={'version':'taipei-buildings-v1','projection':'EPSG:3826','origin':[300000,2800000],'source':{**source['source'],'extractSha256':hashlib.sha256(source_path.read_bytes()).hexdigest()},'buildings':buildings,'gridMetres':500,'index':index,'districtCounts':counts,'audit':{'fullPrecisionFallbacks':fallbacks,'sourceCount':len(source['buildings']),'renderCount':len(buildings),'maxRoundingErrorMetres':max_error,'heightKnown':sum(b[3] is not None for b in buildings),'levelsKnown':sum(b[4] is not None for b in buildings),'courtyards':sum(any(len(p)>1 for p in b[7]) for b in buildings)}}
out['revision']=hashlib.sha256(json.dumps(out,ensure_ascii=False,separators=(',',':'),sort_keys=True).encode()).hexdigest()
target=ROOT/'public/data/taipei-buildings-v1.json.gz';target.write_bytes(gzip.compress(json.dumps(out,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
(ROOT/'artifacts/buildings-data-audit.json').write_text(json.dumps({'revision':out['revision'],'bytes':target.stat().st_size,**out['audit']},indent=2)+'\n','utf8')
print(json.dumps({'bytes':target.stat().st_size,**out['audit']}))
