"""OSM reference topology -> shared 100m hex anchors with real directed road geometry."""
from pathlib import Path
import sys,json,gzip,math,io,zipfile,hashlib,heapq
from collections import defaultdict,Counter
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.tools/map-libs'))
import shapefile
from pyproj import Transformer
from shapely.geometry import shape,Point,Polygon,LineString
from shapely.ops import unary_union,transform
from shapely import make_valid,STRtree
from walk_policy import eligibility,walking_directions
SIZE=50;VERSION='taipei-street-hex-v2';DIRECTIONS=[(1,0),(1,-1),(0,-1),(-1,0),(-1,1),(0,1)]
legacy=json.loads((ROOT/'src/data/taipei-map.json').read_text('utf8'))
rawpath=ROOT/'design/assets/taipei-walk-source.json.gz';source=json.loads(gzip.decompress(rawpath.read_bytes()))
z=zipfile.ZipFile(ROOT/'design/assets/taipei-districts-source.zip');get=lambda s:z.read(next(n for n in z.namelist() if n.endswith(s)))
reader=shapefile.Reader(shp=io.BytesIO(get('.shp')),dbf=io.BytesIO(get('.dbf')),encoding='utf8')
local=lambda x,y,z=None:(x-300000,2800000-y)
regions=sorted([(r.record.as_dict()['CPTID'],make_valid(transform(local,shape(r.shape.__geo_interface__)))) for r in reader.iterShapeRecords()]);city=unary_union([g for _,g in regions]);regiontree=STRtree([g for _,g in regions])
water=unary_union([Polygon(r) for r in legacy['rivers']]).buffer(-4)
project=Transformer.from_crs(4326,3826,always_xy=True).transform
def ll(lon,lat):return local(*project(lon,lat))
def xy(q,r):return (SIZE*math.sqrt(3)*(q+r/2),SIZE*1.5*r)
def axial(x,y,size=SIZE):
 q=x/(math.sqrt(3)*size)-y/(3*size);r=y/(1.5*size);a,b,c=round(q),round(r),round(-q-r);da,db,dc=abs(a-q),abs(b-r),abs(c+q+r)
 if da>db and da>dc:a=-b-c
 elif db>dc:b=-a-c
 return a,b
def polygon(q,r):
 x,y=xy(q,r);return Polygon([(x+SIZE*math.cos(math.radians(i*60-30)),y+SIZE*math.sin(math.radians(i*60-30))) for i in range(6)])
def build_graph():
 oldcoords={(c['q'],c['r']):c for c in legacy['cells']};cells=[];bycoord={}
 minx,miny,maxx,maxy=city.bounds
 for r in range(math.floor(miny/75)-1,math.ceil(maxy/75)+2):
  for q in range(math.floor(minx/(SIZE*math.sqrt(3))-r/2)-1,math.ceil(maxx/(SIZE*math.sqrt(3))-r/2)+2):
   x,y=xy(q,r);p=Point(x,y);owners=sorted(int(i) for i in regiontree.query(p,predicate='intersects'))
   if not owners:continue
   parent=oldcoords.get(axial(x,y,190));terrain=parent['terrain'] if parent else 'urban'
   c={'q':q,'r':r,'x':x,'y':y,'district':owners[0],'terrain':terrain};bycoord[(q,r)]=len(cells);cells.append(c)
 print(f'{len(cells)} shared hexes',flush=True)
 points={};nodehex={};adj=defaultdict(list);reverse=defaultdict(list);wayinfo={};excluded=Counter();rawedges=0
 def register(id,p):
  if id in nodehex:return nodehex[id]
  cell=bycoord.get(axial(*p));nodehex[id]=cell if cell is not None and city.covers(Point(p)) else None
  if nodehex[id] is not None:points[id]=p
  return nodehex[id]
 for way in source['ways']:
  tags=way['tags'];allowed,assumed,why=eligibility(tags)
  if not allowed:excluded[why]+=1;continue
  wayinfo[way['id']]={'id':way['id'],'name':{'zh-TW':tags.get('name:zh-Hant') or tags.get('name:zh') or tags.get('name',''),'en':tags.get('name:en','')},'highway':tags['highway'],'foot':tags.get('foot','unknown'),'access':tags.get('access','unknown'),'bridge':tags.get('bridge','no'),'tunnel':tags.get('tunnel','no'),'layer':tags.get('layer','0'),'onewayFoot':tags.get('oneway:foot','no'),'assumed':assumed}
  previous=None
  for j,(osmid,lon,lat) in enumerate(way['nodes']):
   p=ll(lon,lat);id=str(osmid);register(id,p)
   restriction=source['nodeRestrictions'].get(id,{})
   if restriction and not eligibility(restriction,True)[0]:previous=None;continue
   if previous is not None:
    aid,a=previous;length=math.dist(a,p)
    if length>0 and city.covers(LineString([a,p])):
     if tags.get('bridge','no')=='no' and tags.get('tunnel','no')=='no' and LineString([a,p]).intersection(water).length>3:
      excluded['water-segment']+=1
     else:
      count=max(1,math.ceil(length/20));last=aid
      for k in range(1,count+1):
       nid=id if k==count else f'v:{way["id"]}:{j}:{k}'
       pos=p if k==count else (a[0]+(p[0]-a[0])*k/count,a[1]+(p[1]-a[1])*k/count);register(nid,pos)
       if nodehex.get(last) is not None and nodehex.get(nid) is not None:
        ca,cb=cells[nodehex[last]],cells[nodehex[nid]];dq,dr=cb['q']-ca['q'],cb['r']-ca['r']
        if max(abs(dq),abs(dr),abs(dq+dr))<=1:
         edge=(nid,length/count,way['id']);back=(last,length/count,way['id']);forward,backward=walking_directions(tags)
         if forward:adj[last].append(edge);reverse[nid].append(back)
         if backward:adj[nid].append(back);reverse[last].append(edge)
         rawedges+=1
       last=nid
   previous=(id,p)
 print(f'{len(points)} source/virtual vertices, {rawedges} source segments',flush=True)
 def reachable(graph,seed,allowed=None):
  seen={seed};queue=[seed]
  for id in queue:
   for item in graph.get(id,[]):
    n=item[0]
    if n not in seen and (allowed is None or n in allowed):seen.add(n);queue.append(n)
  return seen
 # The central public street component must be reachable in both directions.
 central=next(d for d in legacy['districts'] if d['id']=='6300500');origin=next(c for c in legacy['cells'] if c['id']==central['anchor'])
 seed=min(adj,key=lambda id:math.dist(points[id],(origin['x'],origin['y'])))
 main=reachable(adj,seed)&reachable(reverse,seed)
 bycell=defaultdict(list)
 for id in main:bycell[nodehex[id]].append(id)
 anchors={i:min(ids,key=lambda id:(math.dist(points[id],(cells[i]['x'],cells[i]['y'])),id)) for i,ids in bycell.items()}
 keep=set(anchors.values())
 for id in main:
  out=[v for v in adj.get(id,[]) if v[0] in main];back=[v for v in reverse.get(id,[]) if v[0] in main]
  if len(out)!=2 or len(back)!=2 or {v[0] for v in out}!={v[0] for v in back} or len({v[2] for v in out+back})!=1 or any(nodehex[v[0]]!=nodehex[id] for v in out+back):keep.add(id)
 ordered=sorted(keep);indices={id:i for i,id in enumerate(ordered)};links=[];pairs={};cell_links=set()
 for id in sorted(main):
  for n,_,_ in adj.get(id,[]):
   if n in main and nodehex[id]!=nodehex[n]:cell_links.add((nodehex[id],nodehex[n]))
 for start in ordered:
  for n,length,way in adj.get(start,[]):
   if n not in main:continue
   previous=start;ids=[start,n];distance=length
   while n not in keep:
    following=[v for v in adj[n] if v[0] in main and v[0]!=previous]
    assert len(following)==1
    to,cost,wid=following[0];assert way==wid
    previous,n=n,to;distance+=cost;ids.append(n)
   if n==start:continue
   flat=[]
   for id in ids:
    x,y=points[id];p=[round(x,1),round(y,1)]
    if flat[-2:]!=p:flat.extend(p)
   key=(indices[start],indices[n],way);reverse_key=(indices[n],indices[start],way)
   if reverse_key in pairs:
    old=links[pairs[reverse_key]]
    if old[4]==sum([flat[k:k+2] for k in range(len(flat)-2,-1,-2)],[]):old[5]=1;continue
   pairs[key]=len(links);links.append([indices[start],indices[n],round(distance,2),way,flat,0])
 used={edge[3] for edge in links}
 print(f'{len(main)} source vertices -> {len(ordered)} routing nodes / {len(links)} compressed links; {len(anchors)} road hexes',flush=True)
 return {'cells':cells,'core':sorted(bycell),'positions':{str(i):points[anchors[i]] for i in bycell},'anchorNodes':{str(i):indices[anchors[i]] for i in bycell},
  'graphNodes':[[round(points[id][0],1),round(points[id][1],1),nodehex[id],id] for id in ordered],'graphLinks':links,'cellLinks':sorted(cell_links),
  'ways':{str(id):wayinfo[id] for id in used},'audit':{'rawVertices':len(points),'rawEdges':rawedges,'sourceComponent':len(main),'walkableCells':len(bycell),'excluded':dict(excluded)}}

fingerprint=hashlib.sha256(rawpath.read_bytes()+(ROOT/'design/walk_policy.py').read_bytes()+(ROOT/'design/assets/taipei-districts-source.zip').read_bytes()+(ROOT/'src/data/taipei-map.json').read_bytes()+b'full-source-compression-v2-size50').hexdigest()
stage_path=ROOT/".tools/street-routing-stage-v2.json.gz"
stage=json.loads(gzip.decompress(stage_path.read_bytes())) if stage_path.exists() else {}
if stage.get('fingerprint')!=fingerprint:
 stage=build_graph();stage['fingerprint']=fingerprint;stage_path.write_bytes(gzip.compress(json.dumps(stage,separators=(",",":")).encode(),mtime=0))
cells=stage["cells"];core=set(stage["core"]);positions=stage["positions"];wayinfo=stage["ways"]
print(f"{len(core)} retained tactical hexes",flush=True)
nodecells={};occupied=set();snaps={};district_anchors={};catalog=json.loads((ROOT/'src/data/taipei-wonders.json').read_text('utf8'))
for n in legacy['nodes']:
 district_index=next(i for i,(id,_) in enumerate(regions) if id==n['districtId'])
 old=next(c for c in legacy['cells'] if c['id']==n['cellId'])
 if n['kind']=='wonder':target=ll(*next(w for w in catalog['wonders'] if w['id']==n['wonderId'])['geography']['coordinates'])
 else:
  hub=positions[str(district_anchors[n['districtId']])];dx,dy={'market':(-220,0),'transit':(220,0),'venue':(0,-220),'community':(0,220),'waterfront':(0,220)}[n['kind']];target=(hub[0]+dx,hub[1]+dy)
 choices=[i for i in core if cells[i]['district']==district_index and i not in occupied]
 index=min(choices,key=lambda i:(math.dist(positions[str(i)],target),i));snap=math.dist(positions[str(index)],target)
 assert snap<650,(n['id'],snap)
 nodecells[n['id']]=index;occupied.add(index);snaps[n['id']]=round(snap,1);cells[index]['terrain']='plaza'
 if n['kind']=='wonder':district_anchors[n['districtId']]=index
terrain=['urban','lane','park','slope','plaza','water'];packed=[];anchorpoints={}
for i,c in enumerate(cells):
 if i in core:
  p=positions[str(i)];anchorpoints[str(i)]=stage['anchorNodes'][str(i)]
  if c['terrain']=='water':c['terrain']='lane'
 packed.append([c['q'],c['r'],c['district'],terrain.index(c['terrain'])])
for edge in stage['graphLinks']:
 if len(edge[4])==2:edge[4]=edge[4]*2
usedways={int(id) for id in wayinfo}
out={'version':VERSION,'radiusMetres':SIZE,'projection':'EPSG:3826','origin':[300000,2800000],
 'source':{k:source[k] for k in ['sourceUrl','sourceSha256','dataTimestamp','licence']},'sourceExtractSha256':hashlib.sha256(rawpath.read_bytes()).hexdigest(),
 'policy':'walk-game-policy-v1','cells':packed,'anchors':[[int(i),index] for i,index in anchorpoints.items()],'graphNodes':stage['graphNodes'],'graphLinks':stage['graphLinks'],'cellLinks':stage['cellLinks'],'nodeCells':nodecells,'nodeSnaps':snaps,'districtAnchors':district_anchors,
 'ways':[[wayinfo[str(id)][k] for k in ['id','name','highway','foot','access','bridge','tunnel','layer','onewayFoot','assumed']] for id in sorted(usedways)],'audit':{**stage['audit'],'maxNodeSnap':max(snaps.values())},'venueLayout':'fictional-public-road-sites-220m-hub-offsets'}
out['revision']=hashlib.sha256(json.dumps(out,separators=(',',':'),sort_keys=True).encode()).hexdigest()
target=ROOT/'src/data/taipei-street-map-v2.json';target.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
(ROOT/'src/data/taipei-street-map-v2.js').write_text("import data from './taipei-street-map-v2.json' with { type: 'json' };\nexport default data;\n",encoding='utf8')
(ROOT/'src/data/taipei-street-map-v2.d.ts').write_text('declare const data: unknown;\nexport default data;\n',encoding='utf8')
(ROOT/'public/data/taipei-walk-network-v2.json.gz').write_bytes(gzip.compress(json.dumps(out,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
print(json.dumps({'cells':len(cells),'walkableCells':len(core),'links':len(stage['graphLinks']),'nodes':len(nodecells),'maxSnap':max(snaps.values()),'bytes':target.stat().st_size,'revision':out['revision']}),flush=True)
