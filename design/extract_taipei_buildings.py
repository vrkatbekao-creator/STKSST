"""Freeze individually sourced OSM footprints, including relation courtyards.
No generated heights, owner details or household addresses are retained.
"""
from pathlib import Path
import sys,json,gzip,hashlib,io,zipfile,math,datetime
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.tools/map-libs'))
import osmium,shapefile
from pyproj import Transformer
from shapely.geometry import shape,mapping
from shapely.ops import unary_union,transform
from shapely import make_valid
project=Transformer.from_crs(4326,3826,always_xy=True).transform
def local(lon,lat,z=None):
 x,y=project(lon,lat);return x-300000,2800000-y
z=zipfile.ZipFile(ROOT/'design/assets/taipei-districts-source.zip');get=lambda suffix:z.read(next(n for n in z.namelist() if n.endswith(suffix)))
reader=shapefile.Reader(shp=io.BytesIO(get('.shp')),dbf=io.BytesIO(get('.dbf')),encoding='utf8')
regions=sorted((r.record.as_dict()['CPTID'],make_valid(transform(lambda x,y,z=None:(x-300000,2800000-y),shape(r.shape.__geo_interface__)))) for r in reader.iterShapeRecords())
city=unary_union([g for _,g in regions]);bounds=json.loads((ROOT/'design/assets/taipei-roads-source-metadata.json').read_text('utf8'))['bboxWgs84'];w,s,e,n=bounds
factory=osmium.geom.GeoJSONFactory();items=[];errors=0
keys={'building','name','name:en','name:zh-Hant','height','building:levels','min_height','building:min_level','roof:shape'}
class Buildings(osmium.SimpleHandler):
 def area(self,area):
  global errors
  if area.tags.get('building','no') in {'no','construction','proposed'}:return
  try:
   rings=list(area.outer_rings());pts=[(p.lon,p.lat) for ring in rings for p in ring]
   if not pts or min(p[0] for p in pts)>e or max(p[0] for p in pts)<w or min(p[1] for p in pts)>n or max(p[1] for p in pts)<s:return
   geometry=make_valid(transform(local,shape(json.loads(factory.create_multipolygon(area)))))
   if not geometry.intersects(city):return
   clipped=geometry.intersection(city);polys=[clipped] if clipped.geom_type=='Polygon' else [p for p in getattr(clipped,'geoms',[]) if p.geom_type=='Polygon']
   if not polys:return
   tags={k:v for k,v in area.tags if k in keys}
   items.append({'id':('w' if area.from_way() else 'r')+str(area.orig_id()),'tags':tags,'polygons':[[list(p.exterior.coords),*[list(r.coords) for r in p.interiors]] for p in polys],'districtIds':[id for id,g in regions if g.intersects(geometry)],'sourceAreaMetres2':round(geometry.area,2)})
  except (ValueError,RuntimeError,osmium.InvalidLocationError):errors+=1
handler=Buildings();pbf=ROOT/'.tools/taiwan-261029.osm.pbf'
handler.apply_file(str(pbf),locations=True,idx='sparse_file_array,'+str(ROOT/'.tools/building-locations.cache'))
reader=osmium.io.Reader(str(pbf));timestamp=reader.header().get('osmosis_replication_timestamp');reader.close()
out={'version':'taipei-buildings-source-v1','projection':'EPSG:3826','origin':[300000,2800000],'source':{'url':'https://download.geofabrik.de/asia/taiwan-261029.osm.pbf','sha256':hashlib.sha256(pbf.read_bytes()).hexdigest(),'dataTimestamp':timestamp,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'licence':'ODbL-1.0'},'buildings':sorted(items,key=lambda b:b['id']),'geometryErrors':errors}
target=ROOT/'design/assets/taipei-buildings-source.json.gz';target.write_bytes(gzip.compress(json.dumps(out,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
print(json.dumps({'buildings':len(items),'errors':errors,'bytes':target.stat().st_size,'sourceTimestamp':timestamp}),flush=True)
