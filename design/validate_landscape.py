"""Read-only full-feature audit of preserved source geometry and raster values."""
from pathlib import Path
import sys,json,gzip,math,hashlib
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.tools/map-libs'))
import numpy as np,rasterio
from shapely.geometry import Polygon,MultiPolygon
source=json.loads(gzip.decompress((ROOT/'design/assets/taipei-buildings-source.json.gz').read_bytes()))
derived=json.loads(gzip.decompress((ROOT/'public/data/taipei-buildings-v1.json.gz').read_bytes()))
assert derived['source']['extractSha256']==hashlib.sha256((ROOT/'design/assets/taipei-buildings-source.json.gz').read_bytes()).hexdigest()
original={b['id']:b for b in source['buildings']};maximum=0;invalid=[];holes=0;vertices=0
for id,name,kind,height,levels,minheight,bounds,polygons,districts in derived['buildings']:
 raw=original[id];assert kind==raw['tags']['building'];assert districts==raw['districtIds'];assert len(polygons)==len(raw['polygons'])
 for a,b in zip(polygons,raw['polygons']):
  assert len(a)==len(b);holes+=len(a)-1
  # Rounding removes only consecutive duplicate vertices; reconstruct identically.
  for ring,old in zip(a,b):
   rounded=[]
   for point in old:
    q=[round(point[0],1),round(point[1],1)];maximum=max(maximum,math.dist(point,q));vertices+=1
    if not rounded or rounded[-1]!=q:rounded.append(q)
   if rounded[0]!=rounded[-1]:rounded.append(rounded[0])
   assert (old if id in derived['audit']['fullPrecisionFallbacks'] else rounded)==ring
 geometry=MultiPolygon([Polygon(poly[0],poly[1:]) for poly in polygons])
 if not geometry.is_valid:invalid.append(id)
assert len(original)==len(derived['buildings']);assert maximum<.071;assert not invalid,invalid[:10]
surface=json.loads(gzip.decompress((ROOT/'public/data/taipei-surface-v1.json.gz').read_bytes()))
with rasterio.open(ROOT/'design/assets/taipei-copdem-30m.tif') as src:
 raster=src.read(1);assert src.crs.to_epsg()==3826;assert src.res==(30,30);assert (src.width,src.height)==(surface['width'],surface['height']);assert src.transform.c-300000==surface['x'];assert 2800000-src.transform.f==surface['y']
 data=np.array(surface['values']).reshape(raster.shape);valid=raster!=src.nodata;assert np.array_equal(data==surface['nodata'],~valid);error=float(np.max(np.abs(data[valid]*.1-raster[valid])));assert error<.0501
assert surface['source']['sourceSubsetSha256']==hashlib.sha256((ROOT/'design/assets/taipei-copdem-30m.tif').read_bytes()).hexdigest()
report={'buildingFeatures':len(original),'sourceVerticesAudited':vertices,'courtyardHoles':holes,'maxRoundingMetres':maximum,'invalidRoundedFootprints':invalid,'surfacePixelsAudited':int(valid.sum()),'maxQuantisationMetres':error,'surfaceModel':'DSM, not bare-earth DTM','surfaceRevision':surface['revision'],'buildingRevision':derived['revision']}
(ROOT/'artifacts/landscape-source-audit.json').write_text(json.dumps(report,indent=2)+'\n','utf8');print(json.dumps(report))
