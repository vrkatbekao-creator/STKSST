"""Copernicus GLO-30 DSM -> local 30 m surface, hillshade and 50 m isolines.
This is a measured satellite surface model, not a bare-earth DTM or road survey.
"""
from pathlib import Path
import sys,json,gzip,hashlib,datetime,math,io,zipfile
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.tools/map-libs'))
import numpy as np,rasterio,shapefile
from rasterio.warp import reproject,Resampling
from rasterio.transform import from_origin
from rasterio.features import geometry_mask
from shapely.geometry import shape,mapping
from shapely.ops import unary_union
from shapely import make_valid
from PIL import Image
z=zipfile.ZipFile(ROOT/'design/assets/taipei-districts-source.zip');get=lambda ext:z.read(next(n for n in z.namelist() if n.endswith(ext)))
reader=shapefile.Reader(shp=io.BytesIO(get('.shp')),dbf=io.BytesIO(get('.dbf')),encoding='utf8')
city=unary_union([make_valid(shape(r.shape.__geo_interface__)) for r in reader.iterShapeRecords()])
left,bottom,right,top=city.bounds;left=math.floor((left-90)/30)*30;bottom=math.floor((bottom-90)/30)*30;right=math.ceil((right+90)/30)*30;top=math.ceil((top+90)/30)*30
width=round((right-left)/30);height=round((top-bottom)/30);affine=from_origin(left,top,30,30);raster=np.full((height,width),-9999,dtype='float32');sources=[]
subset_path=ROOT/'design/assets/taipei-copdem-30m.tif';meta_path=ROOT/'design/assets/taipei-surface-source-metadata.json'
if '--from-subset' in sys.argv or not all((ROOT/f'.tools/copdem-N{lat}E121.tif').exists() for lat in [24,25]):
 assert subset_path.exists() and meta_path.exists(),'Download the source tiles first.'
 previous=json.loads(meta_path.read_text('utf8'));assert hashlib.sha256(subset_path.read_bytes()).hexdigest()==previous['sourceSubsetSha256']
 with rasterio.open(subset_path) as src:
  assert src.crs.to_epsg()==3826 and src.res==(30,30)
  raster=src.read(1);affine=src.transform;width=src.width;height=src.height;left=affine.c;top=affine.f
 sources=previous['sources']
else:
 for lat in [24,25]:
  path=ROOT/f'.tools/copdem-N{lat}E121.tif';key=f'Copernicus_DSM_COG_10_N{lat}_00_E121_00_DEM'
  with rasterio.open(path) as src:
   assert src.crs.to_epsg()==4326 and src.width==3600 and src.height==3600
   reproject(rasterio.band(src,1),raster,src_transform=src.transform,src_crs=src.crs,src_nodata=src.nodata,dst_transform=affine,dst_crs='EPSG:3826',dst_nodata=-9999,resampling=Resampling.bilinear,init_dest_nodata=False)
   sources.append({'url':f'https://copernicus-dem-30m.s3.amazonaws.com/{key}/{key}.tif','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bounds':list(src.bounds),'pixelDegrees':list(src.res),'tags':src.tags()})
mask=geometry_mask([mapping(city)],(height,width),affine,invert=True);raster[~mask]=-9999
valid=raster!=-9999;assert valid.sum()>250000;assert np.min(raster[valid])>-200 and np.max(raster[valid])<2000
target=ROOT/'design/assets/taipei-copdem-30m.tif'
with rasterio.open(target,'w',driver='GTiff',height=height,width=width,count=1,dtype='float32',crs='EPSG:3826',transform=affine,nodata=-9999,compress='deflate') as dst:dst.write(raster,1)
grid=np.rint(raster*10).astype('int32');grid[~valid]=-99999
# Nodata neighbors cannot create artificial cliff shading along the city edge.
dy,dx=np.gradient(np.where(valid,raster,0),30)
interior=valid.copy();interior[1:-1,1:-1]&=valid[:-2,1:-1]&valid[2:,1:-1]&valid[1:-1,:-2]&valid[1:-1,2:]
slope=np.arctan(np.hypot(dx,dy));aspect=np.arctan2(-dx,dy);shade=np.clip(np.cos(math.pi/4)*np.cos(slope)+np.sin(math.pi/4)*np.sin(slope)*np.cos(math.radians(315)-aspect),0,1);shade[~interior]=.65
stops=np.array([0,50,200,500,1200]);colors=np.array([[50,92,108],[60,111,109],[87,127,112],[126,135,126],[174,166,149]])
rgb=np.stack([np.interp(raster,stops,colors[:,channel]) for channel in range(3)],axis=2);rgb*=np.clip(.55+shade*.55,.4,1.1)[:,:,None]
rgba=np.concatenate([np.clip(rgb,0,255).astype('uint8'),(valid*255).astype('uint8')[:,:,None]],axis=2);Image.fromarray(rgba).save(ROOT/'public/data/taipei-surface-hillshade.png')
# Marching squares: retain each segment separately, never bridge a nodata gap.
contours={};corners=[(0,0),(0,1),(1,1),(1,0)];pairs=[(0,1),(1,2),(2,3),(3,0)]
for row in range(height-1):
 for col in range(width-1):
  values=[float(raster[row+dy,col+dx]) for dy,dx in corners]
  if min(values)==-9999:continue
  for level in range(max(0,math.ceil(min(values)/50)*50),math.floor(max(values)/50)*50+1,50):
   hits=[]
   for a,b in pairs:
    if (values[a]<level)!=(values[b]<level):
     t=(level-values[a])/(values[b]-values[a]);ay,ax=corners[a];by,bx=corners[b];hits.append([round(left-300000+(col+.5+ax+(bx-ax)*t)*30,1),round(2800000-top+(row+.5+ay+(by-ay)*t)*30,1)])
   for i in range(0,len(hits)-1,2):contours.setdefault(level,[]).append(hits[i]+hits[i+1])
metadata_path=ROOT/'design/assets/taipei-surface-source-metadata.json'
retrieved=json.loads(metadata_path.read_text('utf8'))['retrievedAt'] if metadata_path.exists() else datetime.datetime.now(datetime.timezone.utc).isoformat()
metadata={'provider':'Copernicus GLO-30 Public / AWS','model':'DSM','release':'2021','acquisition':'2011–2015 (older gap-fill possible)','nativeResolution':'1 arc-second (~30 m)','gridMetres':30,'verticalDatum':'EGM2008 (EPSG:3855)','retrievedAt':retrieved,'sources':sources,'sourceSubsetSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'datasetUrl':'https://registry.opendata.aws/copernicus-dem/','productUrl':'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM','licence':'Copernicus DEM licence, free GLO-30/GLO-90 use with attribution','processing':'Bilinear reprojection from EPSG:4326 to EPSG:3826 at 30 m, city mask, decimetre quantisation (max 0.05 m, not accuracy), hillshade and 50 m surface isolines. No bare-earth correction.'}
out={'version':'taipei-surface-v1','projection':'EPSG:3826','origin':[300000,2800000],'source':metadata,'x':float(left-300000),'y':float(2800000-top),'width':width,'height':height,'step':30,'nodata':-99999,'scale':.1,'values':grid.ravel().tolist(),'contours':[[level,lines] for level,lines in sorted(contours.items())]}
out['revision']=hashlib.sha256(json.dumps(out,separators=(',',':'),sort_keys=True).encode()).hexdigest();raw=json.dumps(out,ensure_ascii=False,separators=(',',':')).encode();(ROOT/'public/data/taipei-surface-v1.json.gz').write_bytes(gzip.compress(raw,mtime=0))
(ROOT/'design/assets/taipei-surface-source-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n','utf8')
audit={'revision':out['revision'],'width':width,'height':height,'validPixels':int(valid.sum()),'nodataPixels':int((~valid).sum()),'minMetres':float(raster[valid].min()),'maxMetres':float(raster[valid].max()),'maxQuantisationMetres':float(np.max(np.abs(grid[valid]*.1-raster[valid]))),'contourSegments':sum(len(v) for v in contours.values()),'gzipBytes':(ROOT/'public/data/taipei-surface-v1.json.gz').stat().st_size,'sourceSubsetSha256':metadata['sourceSubsetSha256']}
(ROOT/'artifacts/surface-data-audit.json').write_text(json.dumps(audit,indent=2)+'\n','utf8');print(json.dumps(audit),flush=True)
