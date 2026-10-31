"""Audit the frozen database against original node references, tags and coordinates."""
from pathlib import Path
import sys,json,gzip,math,hashlib
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.tools/map-libs'))
from pyproj import Transformer
from walk_policy import eligibility,walking_directions
raw=ROOT/'design/assets/taipei-walk-source.json.gz'
source=json.loads(gzip.decompress(raw.read_bytes()))
data=json.loads((ROOT/'src/data/taipei-street-map-v2.json').read_text('utf8'))
assert data['sourceExtractSha256']==hashlib.sha256(raw.read_bytes()).hexdigest()
revision=data.pop('revision');assert revision==hashlib.sha256(json.dumps(data,separators=(',',':'),sort_keys=True).encode()).hexdigest();data['revision']=revision
ways={w['id']:w for w in source['ways']};project=Transformer.from_crs(4326,3826,always_xy=True).transform
def xy(lon,lat):
 x,y=project(lon,lat);return x-300000,2800000-y
def source_point(id,way):
 if id.startswith('v:'):
  _,wid,j,k=id.split(':');assert int(wid)==way['id'];j,k=int(j),int(k);a=xy(*way['nodes'][j-1][1:]);b=xy(*way['nodes'][j][1:]);count=max(1,math.ceil(math.dist(a,b)/20));assert 0<k<count
  return (a[0]+(b[0]-a[0])*k/count,a[1]+(b[1]-a[1])*k/count)
 return xy(*next(n[1:] for n in way['nodes'] if str(n[0])==id))
nodes=data['graphNodes'];maximum=0;oneways=0
for a,b,metres,wid,flat,both in data['graphLinks']:
 way=ways[wid];assert eligibility(way['tags'])[0]
 for i in [a,b]:maximum=max(maximum,math.dist(nodes[i][:2],source_point(nodes[i][3],way)))
 assert math.dist(flat[:2],nodes[a][:2])<.001 and math.dist(flat[-2:],nodes[b][:2])<.001
 assert metres>0 and len(flat)>=4
 if way['tags'].get('oneway:foot') in {'yes','1','true','-1'}:assert not both;oneways+=1
assert maximum<.071
for tags,allowed in [({'highway':'residential'},True),({'highway':'motorway','foot':'yes'},False),({'highway':'path','foot':'no'},False),({'highway':'service','access':'private'},False),({'highway':'path','access':'private','foot':'yes'},True),({'highway':'cycleway'},False),({'highway':'cycleway','foot':'yes'},True),({'highway':'path','foot:conditional':'yes @ (Mo-Fr)'},False)]:assert eligibility(tags)[0]==allowed,tags
assert not eligibility({'barrier':'wall'},True)[0]
assert walking_directions({'oneway':'yes'})==(True,True)
assert walking_directions({'oneway:foot':'yes'})==(True,False)
assert walking_directions({'oneway:foot':'-1'})==(False,True)
result={'revision':revision,'sourceSha256':data['source']['sourceSha256'],'sourceExtractSha256':data['sourceExtractSha256'],'linksAudited':len(data['graphLinks']),'routingNodes':len(nodes),'maxEndpointRoundingMetres':maximum,'onewayFootLinks':oneways,'policyFixtures':12,'note':'Coordinate rounding audit, not survey accuracy. Reference IDs retain grade separation.'}
(ROOT/'artifacts/road-movement-data-audit.json').write_text(json.dumps(result,indent=2)+'\n','utf8');print(json.dumps(result))
