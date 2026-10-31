"""Read-only provenance / projection / clipping audit of every rendered road segment."""
from pathlib import Path
import sys,json,gzip,zipfile,io,math
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.tools/map-libs'))
import shapefile
from shapely.geometry import shape,LineString,Point
from shapely.ops import transform,unary_union
from shapely import make_valid
from pyproj import Transformer
z=zipfile.ZipFile(ROOT/'design/assets/taipei-districts-source.zip');get=lambda s:z.read(next(n for n in z.namelist() if n.endswith(s)))
r=shapefile.Reader(shp=io.BytesIO(get('.shp')),dbf=io.BytesIO(get('.dbf')),encoding='utf8')
city=unary_union([make_valid(transform(lambda x,y,z=None:(x-300000,2800000-y),shape(s.__geo_interface__))) for s in r.iterShapes()]).buffer(1.7)
raw=json.loads(gzip.decompress((ROOT/'design/assets/taipei-roads-osm-source.json.gz').read_bytes()))
sources={f'osm-way-{s["id"]}-{s["sourceRecord"]}':s for s in raw['elements']}
data=json.loads(gzip.decompress((ROOT/'public/data/taipei-roads-v1.json.gz').read_bytes()))
project=Transformer.from_crs(4326,3826,always_xy=True).transform
max_error=0
for road in data['roads']:
 source=sources[road['id'].rsplit('-',1)[0]]
 assert road['osmId']==source['id'] and road['name']['zh-TW']==source['tags']['name']
 for attr in ['highway','bridge','tunnel','layer','oneway']:assert road[attr]==source['tags'][attr]
 coords=[]
 for p in source['geometry']:
  x,y=project(p['lon'],p['lat']);coords.append((x-300000,2800000-y))
 original=LineString(coords);shown=LineString(road['points'])
 assert city.covers(shown),road['id']
 for p in road['points']:
  distance=original.distance(Point(p));max_error=max(max_error,distance);assert distance<.15,(road['id'],distance)
print(json.dumps({'auditedSegments':len(data['roads']),'maxVertexRoundErrorMetres':round(max_error,5),'cityDisplayToleranceMetres':1.7,'sourceAttributesPreserved':True}))
