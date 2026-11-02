"""Freeze official facility coordinates onto the unchanged source walking graph."""
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import re
import sys
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.tools/map-libs'))
from pyproj import Transformer
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

sources = [
    {'id': 'market', 'file': 'markets.csv', 'dataset': 'https://data.gov.tw/dataset/121593', 'download': 'https://data.taipei/api/dataset/89bebb3a-990d-4070-bd67-631a575f6d4a/resource/35acfce1-2c4d-4c70-aa75-601cdab2b3f7/download', 'metadataUpdated': '2026-10-13'},
    {'id': 'nightmarket', 'file': 'night-markets.csv', 'dataset': 'https://data.gov.tw/dataset/121594', 'download': 'https://data.taipei/api/dataset/c013d9ec-a550-46bd-ac60-45f085930706/resource/4874f750-b972-4c42-ad76-986960670c70/download', 'metadataUpdated': '2026-10-13'},
    {'id': 'station', 'file': 'mrt-exits.csv', 'dataset': 'https://data.taipei/dataset/detail?id=cfa4778c-62c1-497b-b704-756231de348b', 'download': 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=307a7f61-e302-4108-a817-877ccbfca7c1', 'metadataUpdated': '2026-08-04'},
]
raw = json.loads((ROOT/'src/data/taipei-street-map-v2.json').read_text('utf-8'))
base = json.loads((ROOT/'src/data/taipei-map.json').read_text('utf-8'))
polygons = [unary_union([Polygon(ring) for ring in d['rings']]) for d in base['districts']]
anchors = {index: raw['graphNodes'][node][:2] for index, node in raw['anchors']}
by_district = [[(index, p) for index, p in anchors.items() if raw['cells'][index][2] == district] for district in range(12)]
project = Transformer.from_crs(4326, 3826, always_xy=True)
corrections = json.loads((ROOT/'design/assets/places-source/corrections.json').read_text('utf-8'))
entrance_blob = (ROOT/'design/assets/places-source/mrt-exits.csv').read_bytes()
try:
    entrance_text = entrance_blob.decode('utf-8-sig')
except UnicodeDecodeError:
    entrance_text = entrance_blob.decode('cp950')
entrances = list(csv.DictReader(io.StringIO(entrance_text)))
rejected = Counter()
groups = {}

def coordinate(value):
    value = str(value).strip()
    try:
        return float(value)
    except ValueError:
        parts = [float(p) for p in re.findall(r'[+-]?\d+(?:\.\d+)?', value)]
        if len(parts) != 3:
            raise ValueError('Invalid coordinate')
        return parts[0] + parts[1]/60 + parts[2]/3600

for source in sources:
    blob = (ROOT/'design/assets/places-source'/source['file']).read_bytes()
    source.update({'sha256': hashlib.sha256(blob).hexdigest(), 'bytes': len(blob), 'retrieved': '2026-11-02', 'licence': 'Open Government Data License 1.0'})
    try:
        text = blob.decode('utf-8-sig'); source['encoding'] = 'utf-8-sig'
    except UnicodeDecodeError:
        text = blob.decode('cp950'); source['encoding'] = 'cp950'
    rows = list(csv.DictReader(io.StringIO(text)))
    source['rows'] = len(rows)
    for row in rows:
        try:
            lon, lat = (coordinate(row['經度']), coordinate(row['緯度'])) if source['id'] == 'station' else (coordinate(row['GTag_longitude']), coordinate(row['GTag_latitude']))
            if not (120 < lon < 123 and 24 < lat < 26):
                raise ValueError('Out of range')
        except (ValueError, KeyError):
            rejected['invalid-coordinate'] += 1
            continue
        original_coordinates = [lon, lat]
        correction = next((c for c in corrections if c['dataset'] == source['id'] and c['sourceName'] == row.get('stitle')), None)
        if correction:
            reference = next(r for r in entrances if r['出入口名稱'] == correction['referenceName'])
            lon, lat = coordinate(reference['經度']), coordinate(reference['緯度'])
        east, north = project.transform(lon, lat)
        p = (east-300000, 2800000-north)
        district = next((i for i, polygon in enumerate(polygons) if polygon.covers(Point(p))), None)
        if district is None:
            rejected['outside-taipei'] += 1
            continue
        index, target = min(by_district[district], key=lambda item: (math.dist(item[1], p), item[0]))
        snap = math.dist(target, p)
        if snap > 180:
            rejected['road-snap-over-180m'] += 1
            continue
        seq = row['項次'] if source['id'] == 'station' else row['seqno']
        name = row['出入口名稱'] if source['id'] == 'station' else row['stitle']
        if source['id'] == 'nightmarket':
            name += ' · ' + (row.get('xAddress') or row.get('xbody') or '').strip()
        key = (source['id'], index)
        entry = groups.setdefault(key, {'names': [], 'ids': [], 'coordinates': [], 'snaps': [], 'district': district, 'locationCorrections': []})
        entry['names'].append(name.strip()); entry['ids'].append(seq); entry['coordinates'].append([lon, lat]); entry['snaps'].append(snap)
        if correction:
            entry['locationCorrections'].append({**correction, 'originalSourceCoordinates': original_coordinates})

places = []
for (kind, index), group in sorted(groups.items()):
    q, r = raw['cells'][index][:2]
    identity = kind + ':' + ','.join(sorted(group['ids']))
    name = '／'.join(dict.fromkeys(group['names']))
    places.append({'id': 'poi_' + kind + '_' + hashlib.sha256(identity.encode()).hexdigest()[:12], 'districtId': base['districts'][group['district']]['id'], 'cellId': f"{raw['version']}:{q},{r}", 'kind': 'transit' if kind == 'station' else 'market', 'wonderId': None, 'syntheticVenue': False, 'sourcePlace': True, 'placeType': kind, 'name': {'zh-TW': name, 'en': name}, 'sourceIds': sorted(group['ids']), 'sourceCoordinates': group['coordinates'][0], 'snapMetres': round(max(group['snaps']), 1)})
    if group['locationCorrections']:
        places[-1]['locationCorrections'] = group['locationCorrections']
result = {'version': 'taipei-places-v1', 'date': '2026-11-02', 'routingRevision': raw['revision'], 'sources': sources, 'policy': 'official facilities, city-clipped, same-district walkable road anchors within 180m; merge same-kind facilities sharing an anchor; no inferred crowds or campaign permission', 'places': places, 'audit': {'count': len(places), 'rejected': dict(rejected), 'byType': dict(Counter(p['placeType'] for p in places)), 'byDistrict': {d['id']: sum(p['districtId'] == d['id'] for p in places) for d in base['districts']}}}
canonical = json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode()
result['revision'] = hashlib.sha256(canonical).hexdigest()
text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
(ROOT/'src/data/taipei-places.json').write_text(text, encoding='utf-8')
(ROOT/'public/data/taipei-places-v1.json').write_text(text, encoding='utf-8')
print(json.dumps({'revision': result['revision'], **result['audit']}))
