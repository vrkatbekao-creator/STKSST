"""Extract source node references and access tags; do not planarize road crossings."""
from pathlib import Path
import sys,json,gzip,hashlib
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.tools/map-libs'))
import osmium
source=ROOT/'.tools/taiwan-261029.osm.pbf'
meta=json.loads((ROOT/'design/assets/taipei-roads-source-metadata.json').read_text('utf8'))
w,s,e,n=meta['bboxWgs84']
keys={'highway','name','name:zh','name:zh-Hant','name:en','ref','foot','access','motorroad','bridge','tunnel','layer','oneway','oneway:foot','foot:conditional','access:conditional','sidewalk','footway','service','barrier','opening_hours'}
class Extract(osmium.SimpleHandler):
 def __init__(self):super().__init__();self.ways=[];self.barriers={}
 def node(self,node):
  if not node.location.valid():return
  if w<=node.location.lon<=e and s<=node.location.lat<=n and any(k in node.tags for k in ['barrier','foot','access']):
   self.barriers[str(node.id)]={k:v for k,v in node.tags if k in keys}
 def way(self,way):
  if 'highway' not in way.tags or len(way.nodes)<2:return
  if not all(p.location.valid() for p in way.nodes):return
  xs=[p.lon for p in way.nodes];ys=[p.lat for p in way.nodes]
  if min(xs)>e or max(xs)<w or min(ys)>n or max(ys)<s:return
  self.ways.append({'id':way.id,'tags':{k:v for k,v in way.tags if k in keys},'nodes':[[p.ref,p.lon,p.lat] for p in way.nodes]})
handler=Extract();handler.apply_file(str(source),locations=True,idx='sparse_file_array,'+str(ROOT/'.tools/walk-locations.cache'))
reader=osmium.io.Reader(str(source));header=reader.header();timestamp=header.get('osmosis_replication_timestamp');reader.close()
out={'format':'osm-walk-source-v1','sourceUrl':'https://download.geofabrik.de/asia/taiwan-261029.osm.pbf','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'dataTimestamp':timestamp,'licence':'ODbL-1.0','ways':handler.ways,'nodeRestrictions':handler.barriers}
target=ROOT/'design/assets/taipei-walk-source.json.gz';target.write_bytes(gzip.compress(json.dumps(out,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
from collections import Counter
print(json.dumps({'ways':len(handler.ways),'restrictions':len(handler.barriers),'foot':dict(Counter(x['tags'].get('foot','unknown') for x in handler.ways)),
 'access':dict(Counter(x['tags'].get('access','unknown') for x in handler.ways)),'timestamp':timestamp,'bytes':target.stat().st_size},ensure_ascii=True))
