"""Build a single projected hex lattice from original official district/river/bridge data.
Install build-only pyshp, pyproj and shapely under .tools/map-libs.
"""
from pathlib import Path
import sys, io, json, math, zipfile, hashlib, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/map-libs'))
import shapefile
from pyproj import Transformer
from shapely.geometry import shape, Point, Polygon, LineString, mapping
from shapely.ops import unary_union, transform
from shapely import make_valid

SIZE = 190
VERSION = 'taipei-hex-v1'
def local(x, y, z=None): return (x-300000, 2800000-y)
project = Transformer.from_crs(4326, 3826, always_xy=True).transform
def ll(x, y, z=None): return local(*project(x, y))
def xy(q, r): return (SIZE*math.sqrt(3)*(q+r/2), SIZE*1.5*r)
def rounded(p): return [round(p[0], 1), round(p[1], 1)]
archive = zipfile.ZipFile(ROOT/'design/assets/taipei-districts-source.zip')
get = lambda suffix: archive.read(next(n for n in archive.namelist() if n.endswith(suffix)))
reader = shapefile.Reader(shp=io.BytesIO(get('.shp')), dbf=io.BytesIO(get('.dbf')), encoding='utf-8')
regions = []
for item in reader.iterShapeRecords():
    props = item.record.as_dict()
    geom = make_valid(transform(local, shape(item.shape.__geo_interface__)))
    regions.append((props['CPTID'], props['TNAME'], geom))
regions.sort()
city = unary_union([g for _,_,g in regions])
overlap = sum(g.area for _,_,g in regions)-city.area
assert overlap < 10, f'District interiors overlap by {overlap} square metres'

ns={'k':'http://www.opengis.net/kml/2.2'}
root=ET.parse(ROOT/'design/assets/taipei-rivers-source.kml').getroot()
rivers=[]
for polygon in root.findall('.//k:Polygon',ns):
    rings=[]
    for coords in polygon.findall('.//k:LinearRing/k:coordinates',ns):
        rings.append([ll(*map(float, t.split(',')[:2])) for t in coords.text.split()])
    if rings: rivers.append(make_valid(Polygon(rings[0],rings[1:])))
water=unary_union(rivers).intersection(city.buffer(300))
bridge_records=json.loads((ROOT/'design/assets/taipei-bridges-source.json').read_text('utf-8-sig'))
bridges=[]
for b in bridge_records:
    try:
        a=ll(float(b['Longitude_start']),float(b['Latitude_start']))
        z=ll(float(b['Longitude_end']),float(b['Latitude_end']))
        line=LineString([a,z])
        if 10 < line.length < 2500 and line.intersects(water) and b['river_cross']=='是':
            bridges.append({'id':str(b['ID']),'bridgeCode':str(b['bridge_id']),'name':b['bridge_name'],'en':b['bridge_name_eng'] or '', 'points':[rounded(a),rounded(z)],'_line':line})
    except (ValueError,TypeError,KeyError): pass
bridge_corridor=unary_union([b['_line'].buffer(90) for b in bridges])
blocked_water=water.difference(bridge_corridor)
minx,miny,maxx,maxy=city.bounds
cells=[]
for r in range(math.floor(miny/(SIZE*1.5))-1,math.ceil(maxy/(SIZE*1.5))+2):
    for q in range(math.floor(minx/(SIZE*math.sqrt(3))-r/2)-1,math.ceil(maxx/(SIZE*math.sqrt(3))-r/2)+2):
        x,y=xy(q,r); p=Point(x,y)
        owners=[id for id,_,g in regions if g.covers(p)]
        if not owners: continue
        cells.append({'id':f'{VERSION}:{q},{r}','q':q,'r':r,'x':round(x,1),'y':round(y,1),'districtId':owners[0],
                      'terrain':'water' if blocked_water.covers(p) else 'urban','neighbors':[]})
by_coord={(c['q'],c['r']):c for c in cells}
for c in cells:
    if c['terrain']=='water': continue
    for dq,dr in [(1,0),(1,-1),(0,-1),(-1,0),(-1,1),(0,1)]:
        n=by_coord.get((c['q']+dq,c['r']+dr))
        if n and n['terrain']!='water' and not blocked_water.intersects(LineString([(c['x'],c['y']),(n['x'],n['y'])])):
            c['neighbors'].append(n['id'])

catalog=json.loads((ROOT/'src/data/taipei-wonders.json').read_text('utf-8'))
themes=['market','skyline','park','arts','civic','river','temple','ecology','music','hill','culture','spring']
districts=[]; nodes=[]; occupied=set()
for index,(id,name,geom) in enumerate(regions):
    w=next(w for w in catalog['wonders'] if w['districtId']==id)
    wx,wy=ll(*w['geography']['coordinates'])
    available=[c for c in cells if c['districtId']==id and c['terrain']!='water' and c['neighbors']]
    anchor=min(available,key=lambda c:math.hypot(c['x']-wx,c['y']-wy))
    offset=math.hypot(anchor['x']-wx,anchor['y']-wy)
    assert offset<650, (name,offset)
    nearby=sorted(available,key=lambda c:math.hypot(c['x']-anchor['x'],c['y']-anchor['y']))
    chosen=[anchor]
    for c in nearby:
        if len(chosen)==5: break
        if c['id'] not in occupied and c not in chosen and math.hypot(c['x']-anchor['x'],c['y']-anchor['y'])>=300:
            chosen.append(c)
    assert len(chosen)==5
    kinds=['wonder','market','transit','venue','community']
    if id=='6300600': kinds[-1]='waterfront'
    for kind,c in zip(kinds,chosen):
        occupied.add(c['id'])
        nodes.append({'id':w['id'] if kind=='wonder' else f'{id}_{kind}','districtId':id,'cellId':c['id'],'kind':kind,
                      'wonderId':w['id'] if kind=='wonder' else None,'syntheticVenue':True,
                      **({'sourceCoordinates':w['geography']['coordinates'],'snapMetres':round(offset,1)} if kind=='wonder' else {})})
    # Consistently simplified geometry is display-only; cell ownership uses original rings.
    polys=geom.geoms if geom.geom_type=='MultiPolygon' else [geom]
    rings=[]
    for poly in polys:
        simple=poly.simplify(15,preserve_topology=True)
        rings.extend([[rounded(p) for p in ring.coords] for ring in [simple.exterior,*simple.interiors]])
    center=geom.representative_point()
    districts.append({'id':id,'name':w['districtName'],'theme':themes[index],'rings':rings,'center':rounded(center.coords[0]),
                      'bounds':[round(v,1) for v in geom.bounds],'anchor':anchor['id'],'wonderId':w['id']})
    # Terrain is explicitly synthetic, never presented as measured elevation or real streets.
    for c in available:
        h=abs(c['q']*31+c['r']*17)%13
        if c['id'] in [n['cellId'] for n in nodes if n['districtId']==id]: c['terrain']='plaza'
        elif id in ['6301000','6301100','6301200','6300900','6300800'] and h<3: c['terrain']='slope'
        elif h<3 or id=='6300300' and h<6: c['terrain']='park'
        elif h==7: c['terrain']='lane'

# Assert reciprocal edges, unique ownership, and all five local nodes connected.
lookup={c['id']:c for c in cells}
for c in cells:
    for n in c['neighbors']: assert c['id'] in lookup[n]['neighbors']
for d in districts:
    seen={d['anchor']}; queue=[d['anchor']]
    for cellid in queue:
        for n in lookup[cellid]['neighbors']:
            if n not in seen: seen.add(n); queue.append(n)
    assert all(n['cellId'] in seen for n in nodes if n['districtId']==d['id']), d['name']
river_polys=water.geoms if hasattr(water,'geoms') else [water]
water_rings=[]
for p in river_polys:
    if p.geom_type=='Polygon': water_rings.append([rounded(v) for v in p.simplify(12).exterior.coords])
sources=[]
for f in ['taipei-districts-source.zip','taipei-rivers-source.kml','taipei-bridges-source.json']:
    sources.append({'file':f,'sha256':hashlib.sha256((ROOT/'design/assets'/f).read_bytes()).hexdigest()})
out={'version':VERSION,'projection':'EPSG:3826','origin':[300000,2800000],'radiusMetres':SIZE,'maxWonderSnapMetres':650,
     'syntheticTerrain':True,'topologyOverlapSquareMetres':round(overlap,3),'sources':sources,
     'districts':districts,'cells':cells,'nodes':nodes,'rivers':water_rings,'bridges':[{k:v for k,v in b.items() if k!='_line'} for b in bridges]}
path=ROOT/'src/data/taipei-map.json'
path.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'{len(cells)} hexes, {len(nodes)} nodes, {len(districts)} districts, {len(bridges)} verified bridge segments; {path.stat().st_size} bytes')
