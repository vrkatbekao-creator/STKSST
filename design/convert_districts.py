"""Convert the sourced Taipei district SHP into a compact WGS84 map asset."""
import io
import json
import math
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'map-libs'))
import shapefile
from pyproj import CRS, Transformer


def simplify(points, tolerance=25):
    if len(points) < 3:
        return points
    a, b = points[0], points[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = dx * dx + dy * dy
    def distance(p):
        t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)) if length else 0
        return math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dy)
    index = max(range(1, len(points)-1), key=lambda i: distance(points[i]))
    if distance(points[index]) <= tolerance:
        return [a, b]
    return simplify(points[:index+1], tolerance)[:-1] + simplify(points[index:], tolerance)


archive = zipfile.ZipFile(ROOT / 'design/assets/taipei-districts-source.zip')
names = archive.namelist()
get = lambda suffix: archive.read(next(n for n in names if n.endswith(suffix)))
transform = Transformer.from_crs(CRS.from_wkt(get('.prj').decode()), 'EPSG:4326', always_xy=True)
reader = shapefile.Reader(shp=io.BytesIO(get('.shp')), dbf=io.BytesIO(get('.dbf')), encoding='utf-8')

def ring(points):
    reduced = simplify(points)
    if len(reduced) < 4:
        reduced = points
    return [[round(lon, 5), round(lat, 5)] for lon, lat in (transform.transform(*p[:2]) for p in reduced)]

features = []
for item in reader.iterShapeRecords():
    geometry = item.shape.__geo_interface__
    coords = geometry['coordinates']
    converted = [ring(r) for r in coords] if geometry['type'] == 'Polygon' else [[ring(r) for r in polygon] for polygon in coords]
    props = item.record.as_dict()
    features.append({'type':'Feature', 'properties':{'id':props['CPTID'], 'name':props['TNAME']}, 'geometry':{'type':geometry['type'],'coordinates':converted}})
assert len(features) == 12
asset = {'type':'FeatureCollection', 'features':features}
out = ROOT / 'design/assets/taipei-districts.geojson'
out.write_text(json.dumps(asset,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'{len(features)} districts; {out.stat().st_size} bytes; source CRS converted to WGS84')
