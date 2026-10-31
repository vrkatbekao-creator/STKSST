"""Freeze Taipei-area roads from a dated Geofabrik OSM extract. Build-time only."""
from pathlib import Path
import sys,io,json,gzip,hashlib,zipfile,urllib.request,subprocess,re
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/map-libs'))
import shapefile
from pyproj import Transformer
URL='https://download.geofabrik.de/asia/taiwan-261029-free.shp.zip'
archive_path=ROOT/'.tools/taiwan-261029-free.shp.zip'
archive_path.parent.mkdir(exist_ok=True)
if not archive_path.exists():
 if sys.platform=='win32':
  # Windows standard trust store, with TLS verification left enabled.
  subprocess.run(['powershell','-NoProfile','-Command',"Invoke-WebRequest -Uri '"+URL+"' -OutFile '.tools/taiwan-261029-free.shp.zip' -TimeoutSec 240 -UseBasicParsing"],cwd=ROOT,check=True,timeout=260)
 else:
  with urllib.request.urlopen(URL,timeout=240) as r,archive_path.open('wb') as f:
   while chunk:=r.read(1024*1024):f.write(chunk)
district_zip=zipfile.ZipFile(ROOT/'design/assets/taipei-districts-source.zip')
get=lambda suffix:district_zip.read(next(n for n in district_zip.namelist() if n.endswith(suffix)))
district_reader=shapefile.Reader(shp=io.BytesIO(get('.shp')),dbf=io.BytesIO(get('.dbf')),encoding='utf-8')
a,b,c,d=district_reader.bbox;t=Transformer.from_crs(3826,4326,always_xy=True)
w,s=t.transform(a,b);e,n=t.transform(c,d);bbox=[w-.003,s-.003,e+.003,n+.003]
z=zipfile.ZipFile(archive_path);prefix='gis_osm_roads_free_1'
assert 'WGS_1984' in z.read(prefix+'.prj').decode()
r=shapefile.Reader(shp=io.BytesIO(z.read(prefix+'.shp')),shx=io.BytesIO(z.read(prefix+'.shx')),dbf=io.BytesIO(z.read(prefix+'.dbf')),encoding='utf-8')
elements=[]
for item in r.iterShapeRecords(bbox=bbox):
 props=item.record.as_dict();coords=item.shape.points;parts=[*item.shape.parts,len(coords)]
 highway=props['fclass'];highway='track' if highway.startswith('track_grade') else highway
 for index in range(len(parts)-1):
  geometry=[{'lon':x,'lat':y} for x,y in coords[parts[index]:parts[index+1]]]
  if len(geometry)<2:continue
  elements.append({'type':'way','id':int(props['osm_id']),'sourceRecord':str(item.record.oid)+'-'+str(index),'tags':{
   'highway':highway,'name':props['name'],'ref':props['ref'],'layer':str(props['layer']),
   'oneway':{'F':'no','T':'yes','B':'-1'}.get(props['oneway'],'unknown'),
   'bridge':'yes' if props['bridge']=='T' else 'no','tunnel':'yes' if props['tunnel']=='T' else 'no'},'geometry':geometry})
asof=re.search(r'as of (\S+)\.',z.read('README').decode()).group(1)
assert len(elements)>1000
raw={'elements':elements,'dataTimestamp':asof,'fieldsNotProvided':['name:en','access','foot','motorroad']}
target=ROOT/'design/assets/taipei-roads-osm-source.json.gz';target.write_bytes(gzip.compress(json.dumps(raw,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
meta={'endpoint':URL,'provider':'Geofabrik / OpenStreetMap contributors','bboxWgs84':bbox,
 'retrievedAt':datetime.now(timezone.utc).isoformat(),'dataTimestamp':asof,'sourceFile':target.name,
 'sourceSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'archiveSha256':hashlib.sha256(archive_path.read_bytes()).hexdigest(),
 'elements':len(elements),'licence':'ODbL-1.0','licenceUrl':'https://opendatacommons.org/licenses/odbl/1-0/',
 'copyrightUrl':'https://www.openstreetmap.org/copyright','fieldsNotProvided':raw['fieldsNotProvided'],
 'sourceKind':'OpenStreetMap community road mapping, not an official cadastral survey'}
(ROOT/'design/assets/taipei-roads-source-metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'elements':len(elements),'bytes':target.stat().st_size,'timestamp':asof}))
