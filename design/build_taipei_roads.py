"""Clip a frozen OSM road extract to original Taipei boundaries; no gameplay changes."""
from pathlib import Path
import sys,io,json,gzip,zipfile,hashlib,math
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/map-libs'))
import shapefile
from pyproj import Transformer
from shapely.geometry import shape,LineString,Polygon
from shapely.ops import unary_union,transform
from shapely import make_valid,STRtree

archive=zipfile.ZipFile(ROOT/'design/assets/taipei-districts-source.zip')
get=lambda suffix:archive.read(next(n for n in archive.namelist() if n.endswith(suffix)))
reader=shapefile.Reader(shp=io.BytesIO(get('.shp')),dbf=io.BytesIO(get('.dbf')),encoding='utf-8')
local=lambda x,y,z=None:(x-300000,2800000-y)
regions=sorted([(r.record.as_dict()['CPTID'],make_valid(transform(local,shape(r.shape.__geo_interface__)))) for r in reader.iterShapeRecords()])
city=unary_union([g for _,g in regions]);region_tree=STRtree([g for _,g in regions])
project=Transformer.from_crs(4326,3826,always_xy=True).transform
def ll(x,y):return local(*project(x,y))
raw_path=ROOT/'design/assets/taipei-roads-osm-source.json.gz'
raw=json.loads(gzip.decompress(raw_path.read_bytes()));meta=json.loads((ROOT/'design/assets/taipei-roads-source-metadata.json').read_text('utf-8'))
assert not raw.get('remark')
assert hashlib.sha256(raw_path.read_bytes()).hexdigest()==meta['sourceSha256']
game=json.loads((ROOT/'src/data/taipei-map.json').read_text('utf-8'))
hex_polys=[Polygon([(c['x']+190*math.cos(math.radians(i*60-30)),c['y']+190*math.sin(math.radians(i*60-30))) for i in range(6)]) for c in game['cells']]
hex_tree=STRtree(hex_polys)
classes={**{v:'express' for v in ['motorway','motorway_link','trunk','trunk_link']},
 **{v:'arterial' for v in ['primary','primary_link','secondary','secondary_link','tertiary','tertiary_link']},
 **{v:'street' for v in ['residential','living_street','unclassified','road']},
 **{v:'alley' for v in ['service','track']},
 **{v:'path' for v in ['footway','pedestrian','path','steps','cycleway','bridleway']}}
roads=[];cell_index={};excluded={};district_counts={id:0 for id,_ in regions}
for e in sorted(raw['elements'],key=lambda e:e['id']):
 tags=e.get('tags',{});highway=tags.get('highway','')
 if e.get('type')!='way' or highway not in classes or tags.get('area')=='yes':
  excluded[highway]=excluded.get(highway,0)+1;continue
 coords=[ll(p['lon'],p['lat']) for p in e.get('geometry',[]) if 'lon'in p and 'lat'in p]
 if len(coords)<2:continue
 line=LineString(coords)
 if not line.intersects(city):continue
 clipped=line.intersection(city)
 parts=[clipped] if clipped.geom_type=='LineString' else [g for g in getattr(clipped,'geoms',[]) if g.geom_type=='LineString']
 for part_no,part in enumerate(parts):
  if part.length<2:continue
  # Source geometry is retained in the gzip; display simplification is at most 1.5 metres.
  shown=part.simplify(1.5,preserve_topology=True)
  points=[[round(x,1),round(y,1)] for x,y in shown.coords]
  if len(set(map(tuple,points)))<2:continue
  ds=[regions[int(i)][0] for i in sorted(region_tree.query(part,predicate='intersects'))]
  if not ds:continue
  for id in ds:district_counts[id]+=1
  name=tags.get('name:zh-Hant') or tags.get('name:zh') or tags.get('name') or ''
  en=tags.get('name:en') or ''
  road={'id':f'osm-way-{e["id"]}-{e.get("sourceRecord",0)}-{part_no}','osmId':e['id'],'highway':highway,'class':classes[highway],
   'name':{'zh-TW':name,'en':en},'ref':tags.get('ref',''),'points':points,
   'bounds':[round(v,1) for v in shown.bounds],'districtIds':ds,'lengthMetres':round(part.length,1),
   'bridge':tags.get('bridge','no'),'tunnel':tags.get('tunnel','no'),'layer':tags.get('layer','0'),
   'access':tags.get('access','unknown'),'foot':tags.get('foot','unknown'),'oneway':tags.get('oneway','unknown'),
   'restricted':highway in ['motorway','motorway_link'] or tags.get('motorroad')=='yes' or tags.get('access') in ['private','no'] or tags.get('foot') in ['private','no']}
  index=len(roads);roads.append(road)
  # Exact clipped geometry, not midpoint proximity, defines which real streets cross a hex.
  for i in sorted(hex_tree.query(part,predicate='intersects')):
   c=game['cells'][int(i)]
   cell_index.setdefault(c['id'],[]).append(index)
assert len(roads)>1000 and all(v>0 for v in district_counts.values())
assert len({r['id'] for r in roads})==len(roads)
out={'version':'taipei-osm-roads-v1','projection':game['projection'],'origin':game['origin'],
 'source':meta,'clipBoundarySha256':hashlib.sha256((ROOT/'design/assets/taipei-districts-source.zip').read_bytes()).hexdigest(),
 'displaySimplifyMetres':1.5,'coordinateRoundMetres':0.1,'districtCounts':district_counts,
 'roads':roads,'cellIndex':cell_index,'excludedHighways':excluded}
target=ROOT/'public/data/taipei-roads-v1.json.gz';target.parent.mkdir(parents=True,exist_ok=True)
target.write_bytes(gzip.compress(json.dumps(out,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
print(json.dumps({'roads':len(roads),'osmWays':len({r['osmId'] for r in roads}),'named':sum(bool(r['name']['zh-TW']) for r in roads),
 'englishNamed':sum(bool(r['name']['en']) for r in roads),'hexes':len(cell_index),'districtCounts':district_counts,'bytes':target.stat().st_size}))
