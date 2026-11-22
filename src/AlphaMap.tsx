import {mapLabel} from './map-language.ts';
import {useEffect,useMemo,useRef,useState} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {useTranslation} from 'react-i18next';
import * as maplibre from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type {GeoJSONSource,StyleSpecification} from 'maplibre-gl';
import type {Feature,FeatureCollection,Geometry,Position} from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import {axialAt,cellPosition,mapFor,polygonPoints} from './game/campaign-map.ts';
import {projectVehiclePoint} from './game/vehicle-geometry.ts';
import type {Campaign} from './game/campaign.ts';
import {isCommander,unitAvailable} from './game/campaign.ts';
import type {TravelQuote,TravelSegment} from './game/campaign-travel.ts';
import {unitLabel} from './campaign-unit-label.ts';
import {nodeLabel} from './campaign-node-label.ts';
import {districtScenes} from './district-streets.ts';
import {useDistrictLayers} from './useDistrictLayers.ts';
import {factionColors,campaignPalette} from './campaign-palette.ts';
import {decodeSurface,surfaceHeight} from './surface-map.ts';
import {useGeoData} from './useGeoData.ts';
import {useAccessibility} from './useAccessibility.ts';
import {memberIndex} from './campaign-character.ts';
import {publicAsset} from './public-asset.ts';
import {DistrictLandmark} from './DistrictStreets.tsx';
import {CampaignVehicle} from './CampaignArt.tsx';
import {createMapTapGesture} from './mobile-map-gesture.ts';

maplibre.setWorkerUrl(mapWorkerUrl);

export const alphaLngLat=([x,y]:number[]):[number,number]=>{
 let lon=121+(x+50000)/101000,lat=(2800000-y)/110800;
 for(let i=0;i<5;i++){const [px,py]=projectVehiclePoint(lon,lat);lon+=(x-px)/101000;lat-=(y-py)/111000;}
 return [lon,lat];
};
const closed=(ring:number[][]):Position[]=>{
 const p=ring.map(alphaLngLat);
 if(p.length&&p[0].some((v,i)=>v!==p.at(-1)![i]))p.push(p[0]);
 return p;
};
const feature=(geometry:Geometry,properties:Feature['properties']={}):Feature=>({type:'Feature',geometry,properties});
const collection=(features:Feature[]=[]):FeatureCollection=>({type:'FeatureCollection',features});
const sources=['districts','rivers','roads','buildings','hex','visits','contest','picked','route'] as const;
const accents={blue:['#91b9f3','#245ce1','#143b82'],green:['#ffc0a8','#db6a41','#8f361f'],white:['#d9def2','#f7faff','#493a73']};
type Props={game:Campaign;districtId:string;selected:string;destination?:string;segments:TravelSegment[];grid:boolean;terrain:boolean;mobile:boolean;
 onCell:(id:string)=>void;onNode:(id:string)=>void;onDistrict:(id:string)=>void;onUnit:(id:string,origin:HTMLElement)=>void;districtPicker:boolean;
 popup?:{cellId:string;element:React.ReactNode};fieldPopup?:{cellId:string;element:React.ReactNode};motion:TravelQuote|null;onMotionEnd:()=>void};

function style():StyleSpecification{
 return {version:8,sources:Object.fromEntries(sources.map(id=>[id,{type:'geojson',data:collection()}])),
  layers:[
   {id:'ground',type:'background',paint:{'background-color':'#b9c7c9'}},
   {id:'districts',type:'fill',source:'districts',paint:{'fill-color':['case',['get','active'],'#e7e5d9','#d8dfdc'],'fill-opacity':.78}},
   {id:'district-line',type:'line',source:'districts',paint:{'line-color':'#728994','line-width':1.4}},
   {id:'rivers',type:'fill',source:'rivers',paint:{'fill-color':'#87b8cc'}},
   {id:'roads',type:'line',source:'roads',paint:{'line-color':'#fff8e4','line-width':['interpolate',['linear'],['zoom'],11,.55,16,2.3]}},
   {id:'hex',type:'line',source:'hex',paint:{'line-color':'#476a7d','line-opacity':.32,'line-width':.8}},
   {id:'visits',type:'fill',source:'visits',paint:{'fill-color':['get','color'],'fill-opacity':.72}},
   {id:'visit-line',type:'line',source:'visits',paint:{'line-color':['get','outline'],'line-width':2}},
   {id:'contest',type:'line',source:'contest',paint:{'line-color':'#526071','line-width':1.2}},
   {id:'picked',type:'fill',source:'picked',paint:{'fill-color':'#ffd34e','fill-opacity':.36,'fill-outline-color':'#a86b00'}},
   {id:'footprints',type:'fill',source:'buildings',minzoom:13,paint:{'fill-color':'#718695','fill-opacity':.28,'fill-outline-color':'#566f7f'}},
   {id:'extrusions',type:'fill-extrusion',source:'buildings',minzoom:13.6,filter:['>', ['get','height'],0],
    paint:{'fill-extrusion-height':['get','height'],'fill-extrusion-base':['get','base'],'fill-extrusion-color':'#a8b9bf','fill-extrusion-opacity':.82}},
   {id:'route-shadow',type:'line',source:'route',paint:{'line-color':'#14283b','line-width':7,'line-opacity':.88}},
   {id:'route-car',type:'line',source:'route',filter:['in',['get','mode'],['literal',['drive','motorcade']]],paint:{'line-color':['case',['==',['get','mode'],'motorcade'],'#fba632','#60cced'],'line-width':4}},
   {id:'route-foot',type:'line',source:'route',filter:['in',['get','mode'],['literal',['walk','transfer']]],paint:{'line-color':'#dff8ff','line-width':4,'line-dasharray':[1,1]}},
  ]};
}

export function AlphaMap(props:Props){
 const {t,i18n}=useTranslation(), lang=i18n.language;
 const {reduceMotion}=useAccessibility();
 const {game,districtId,districtPicker,grid,terrain,destination,segments,popup,fieldPopup}=props;
 const mapData=mapFor(game), district=mapData.districts.find(d=>d.id===districtId)!;
 const host=useRef<HTMLDivElement>(null), map=useRef<maplibre.Map|null>(null);
 const live=useRef(props);live.current=props;
 const acceptTap=useRef<(event:MouseEvent,select:()=>void)=>void>((_event,select)=>select());
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[terrainFailed,setTerrainFailed]=useState(false);
 const [view,setView]=useState({x:district.bounds[0],y:district.bounds[1],width:district.bounds[2]-district.bounds[0],height:district.bounds[3]-district.bounds[1]});
 const [popupPoint,setPopupPoint]=useState({x:0,y:0,width:0,height:0});
 const surface=useGeoData('taipei-surface-v1.json.gz',decodeSurface);
 const {roads,buildings}=useDistrictLayers(districtId,view);
 const defaultCenter=alphaLngLat(district.center);
 const updateBounds=(m:maplibre.Map)=>{
  const b=m.getBounds(),a=projectVehiclePoint(b.getWest(),b.getNorth()),z=projectVehiclePoint(b.getEast(),b.getSouth());
  setView({x:a[0],y:a[1],width:z[0]-a[0],height:z[1]-a[1]});
 };
 useEffect(()=>{
  if(!host.current)return;
  let instance:maplibre.Map;
  try{
   instance=new maplibre.Map({container:host.current,style:style(),center:defaultCenter,zoom:mapData.campaignMap.radiusMetres===150?13.2:13.9,pitch:44,maxPitch:58,minZoom:9.5,maxZoom:17.8,
    maxBounds:[[121.38,24.88],[121.79,25.26]],dragRotate:false,pitchWithRotate:false,attributionControl:false});
  }catch{setFailed(true);return;}
  map.current=instance;
  instance.addControl(new maplibre.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-right');
  const container=host.current;
  const size=new ResizeObserver(()=>instance.resize());size.observe(container);
  const gesture=createMapTapGesture();
  let pendingTap:number|undefined;
  let touch=false;
  const stopTap=()=>{if(pendingTap!==undefined)window.clearTimeout(pendingTap);pendingTap=undefined;};
  const point=(e:PointerEvent)=>({x:e.clientX,y:e.clientY});
  const start=(e:PointerEvent)=>{
   if(!live.current.mobile||e.button!==0)return;
   stopTap();
   touch=e.pointerType==='touch';
   gesture.start(e.pointerId,point(e));
  };
  const move=(e:PointerEvent)=>gesture.move(e.pointerId,point(e));
  const end=(e:PointerEvent)=>{
   move(e);
   gesture.end(e.pointerId,container.contains(document.elementFromPoint(e.clientX,e.clientY)));
  };
  const cancel=(e:PointerEvent)=>gesture.end(e.pointerId,false);
  acceptTap.current=(event,select)=>{
   if(!live.current.mobile||event.detail===0){select();return;}
   if(!gesture.consume())return;
   if(!touch){select();return;}
   stopTap();
   pendingTap=window.setTimeout(()=>{pendingTap=undefined;select();},320);
  };
  container.addEventListener('pointerdown',start,true);
  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerup',end,true);
  window.addEventListener('pointercancel',cancel,true);
  instance.on('dragstart',stopTap);
  instance.on('zoomstart',stopTap);
  instance.on('dblclick',stopTap);
  instance.on('load',()=>{updateBounds(instance);setReady(true);});
  instance.on('error',event=>{if('sourceId' in event&&event.sourceId==='elevation')setTerrainFailed(true);
   else if(event.error.message.includes('Worker failed'))setFailed(true);});
  instance.on('webglcontextlost',()=>setFailed(true));
  instance.on('moveend',()=>updateBounds(instance));
  instance.on('click',e=>acceptTap.current(e.originalEvent,()=>{
   const p=live.current, data=mapFor(p.game);
   if(p.districtPicker){
    const hit=instance.queryRenderedFeatures(e.point,{layers:['districts']})[0]?.properties.id;
    if(typeof hit==='string')p.onDistrict(hit);
    return;
   }
   const [x,y]=projectVehiclePoint(e.lngLat.lng,e.lngLat.lat);
   const {q,r}=axialAt(x,y,data.campaignMap.radiusMetres);
   const id=`${data.campaignMap.version}:${q},${r}`,cell=data.cells.get(id);
   if(cell&&cell.terrain!=='water'&&cell.walkable!==false)p.onCell(id);
  }));
  return()=>{
   stopTap();
   container.removeEventListener('pointerdown',start,true);
   window.removeEventListener('pointermove',move,true);
   window.removeEventListener('pointerup',end,true);
   window.removeEventListener('pointercancel',cancel,true);
   size.disconnect();instance.remove();map.current=null;
  };
 },[]);
 useEffect(()=>{
  const instance=map.current;if(!instance)return;
  const zoom=new maplibre.NavigationControl({showCompass:false});
  instance.addControl(zoom,'bottom-right');
  const controls=instance.getContainer();
  instance.getCanvas().setAttribute('aria-label',t('c_cityMap'));
  for(const [selector,label] of [['.maplibregl-ctrl-zoom-in',t('a3_zoomIn')],['.maplibregl-ctrl-zoom-out',t('a3_zoomOut')]]){
   const button=controls.querySelector(selector);
   button?.setAttribute('aria-label',label);button?.setAttribute('title',label);
  }
  return()=>{if(instance.hasControl(zoom))instance.removeControl(zoom);};
 },[lang,t]);
 function source(id:typeof sources[number],data:FeatureCollection){
  (map.current?.getSource(id) as GeoJSONSource|undefined)?.setData(data);
 }
 useEffect(()=>{
  if(!ready)return;
  source('districts',collection(mapData.districts.map(d=>feature({type:'Polygon',coordinates:d.rings.map(closed)},{id:d.id,active:d.id===districtId}))));
  source('rivers',collection(mapData.campaignMap.rivers.map(ring=>feature({type:'Polygon',coordinates:[closed(ring)]}))));
 },[ready,mapData.campaignMap,districtId]);
 useEffect(()=>{
  const m=map.current;if(!ready||!m)return;
  const reduce=reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(districtPicker)m.fitBounds([[121.43,24.95],[121.67,25.22]],{padding:65,pitch:0,duration:reduce?0:320});
  else if(!live.current.motion&&!live.current.fieldPopup)m.easeTo({center:defaultCenter,zoom:Math.max(mapData.campaignMap.radiusMetres===150?13.1:13.8,m.getZoom()),pitch:44,duration:reduce?0:400});
 },[ready,districtId,districtPicker]);
 useEffect(()=>{
  if(!props.motion)return;
  const m=map.current;
  if(failed||!ready||!m||reduceMotion){live.current.onMotionEnd();return;}
  const parts=props.motion.segments.flatMap(s=>s.points.slice(1).map((to,i)=>{
   const from=s.points[i];return {from,to,distance:Math.hypot(to[0]-from[0],to[1]-from[1])};
  })).filter(p=>p.distance>0);
  const total=parts.reduce((n,p)=>n+p.distance,0);
  if(!total){live.current.onMotionEnd();return;}
  const token=document.createElement('span');token.className='a3-travel-token';token.setAttribute('aria-hidden','true');
  if(props.motion.segments.some(s=>s.mode==='drive'||s.mode==='motorcade')){
   token.innerHTML=renderToStaticMarkup(<CampaignVehicle id={game.commanders[game.playerTeam]}/>);
   token.classList.add('vehicle');
  }else token.textContent='◆';
  const marker=new maplibre.Marker({element:token}).setLngLat(alphaLngLat(parts[0].from)).addTo(m);
  const began=performance.now(),duration=total>4000?1350:780;
  const dest=mapData.cells.get(props.motion.destination)!;
  m.easeTo({center:alphaLngLat(cellPosition(dest)),duration});
  let frame=0,index=0,passed=0;
  function animate(now:number){
   const fraction=Math.min(1,(now-began)/duration),at=total*fraction;
   while(index<parts.length-1&&passed+parts[index].distance<at)passed+=parts[index++].distance;
   const {from,to,distance}=parts[index],along=Math.min(1,(at-passed)/distance);
   marker.setLngLat(alphaLngLat(from.map((v,i)=>v+(to[i]-v)*along)));
   if(fraction===1)live.current.onMotionEnd();
   else frame=requestAnimationFrame(animate);
  }
  frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);marker.remove();};
 },[props.motion,ready,failed,reduceMotion,mapData.cells]);
 useEffect(()=>{
  const m=map.current;if(!ready||!m)return;
  if(!m.getSource('elevation'))m.addSource('elevation',{type:'raster-dem',tiles:[new URL(
   `${import.meta.env.BASE_URL}alpha-data/terrain/{z}/{x}/{y}.png`,location.href).href.replaceAll('%7B','{').replaceAll('%7D','}')],
   bounds:[121.42,24.94,121.72,25.23],tileSize:256,minzoom:9,maxzoom:12,encoding:'mapbox'});
  m.setTerrain(terrain&&!terrainFailed?{source:'elevation',exaggeration:.85}:null);
 },[ready,terrain,terrainFailed]);
 useEffect(()=>{
  const m=map.current;if(!ready||!m)return;
  const night=game.phase==='night';
  m.setPaintProperty('ground','background-color',night?'#233746':'#b9c7c9');
  m.setPaintProperty('districts','fill-color',night?
   ['case',['get','active'],'#50616b','#455560']:['case',['get','active'],'#e7e5d9','#d8dfdc']);
  m.setPaintProperty('roads','line-color',night?'#d6c597':'#fff8e4');
  m.setPaintProperty('rivers','fill-color',night?'#27536d':'#87b8cc');
  m.setPaintProperty('extrusions','fill-extrusion-color',night?'#74899e':'#a8b9bf');
 },[ready,game.phase]);
 useEffect(()=>{if(ready&&roads.data)source('roads',collection(roads.data.roads.map(r=>feature({type:'LineString',coordinates:r.points.map(alphaLngLat)}))));},[ready,roads.data]);
 useEffect(()=>{if(ready&&buildings.data)source('buildings',collection(buildings.data.buildings.map(b=>feature(
  {type:'MultiPolygon',coordinates:b.polygons.map(poly=>poly.map(closed))},{height:b.height??0,base:Math.min(b.height??0,b.minHeight??0)}))));},[ready,buildings.data]);
 const localCells=useMemo(()=>[...mapData.cells.values()].filter(c=>c.x>=view.x&&c.y>=view.y&&c.x<=view.x+view.width&&c.y<=view.y+view.height),[mapData.cells,view]);
 const hexFeature=(id:string,properties:Feature['properties']={})=>{
  const cell=mapData.cells.get(id);return cell?feature({type:'Polygon',coordinates:[closed(polygonPoints(cell,mapData.campaignMap.radiusMetres))]},properties):null;
 };
 useEffect(()=>{
  if(!ready)return;
  source('hex',collection(grid&&!districtPicker&&localCells.length<6500?localCells.flatMap(c=>hexFeature(c.id)??[]):[]));
 },[ready,grid,districtPicker,localCells]);
 useEffect(()=>{
  if(!ready)return;
  const entries=Object.entries(game.visitColors??{});
  source('visits',collection(entries.flatMap(([id,visit])=>hexFeature(id,{color:visit.challenger?'#fff':accents[visit.team][visit.depth-1],outline:visit.challenger?'#34404c':accents[visit.team][2]})??[])));
  source('contest',collection(entries.flatMap(([id,visit])=>{
   const c=mapData.cells.get(id);if(!visit.challenger||!c)return [];
   const r=mapData.campaignMap.radiusMetres;
   return [-.34,0,.34].map(d=>feature({type:'LineString',coordinates:[[c.x+r*(d-.28),c.y+r*.31],[c.x+r*(d+.28),c.y-r*.31]].map(alphaLngLat)}));
  })));
 },[ready,game.visitColors,mapData.cells]);
 useEffect(()=>{
  if(!ready)return;
  source('picked',collection(destination?(hexFeature(destination)?[hexFeature(destination)!]:[]):[]));
  source('route',collection(segments.filter(s=>s.points.length>1).map(s=>feature({type:'LineString',coordinates:s.points.map(alphaLngLat)},{mode:s.mode}))));
 },[ready,destination,segments,mapData.cells]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  const marker=(xy:number[],label:string,cls:string,click:(origin:HTMLElement)=>void,color?:string)=>{
   const el=document.createElement('button');el.type='button';el.className=cls;el.textContent=label;
   if(color)el.style.setProperty('--mark',color);
   el.onclick=e=>{e.stopPropagation();acceptTap.current(e,()=>{if(el.isConnected)click(el);});};
   return new maplibre.Marker({element:el,anchor:'bottom'}).setLngLat(alphaLngLat(xy)).addTo(m);
  };
  if(districtPicker)return;
  const markers=mapData.nodes.filter(n=>n.wonderId||game.stages.some(s=>s.nodeId===n.id)).map(n=>{
   const stage=game.stages.find(s=>s.nodeId===n.id),cell=mapData.cells.get(n.cellId)!;
   const visit=game.visitColors?.[cell.id],status=visit?(visit.challenger?t('a3_contested'):t('a3_visitedBy',{team:t(visit.team),count:visit.depth})):null;
   const color=stage?(stage.brand==='island'?campaignPalette.stages.island:campaignPalette.stages.soapbox):districtScenes[n.districtId].accent;
   const pin=marker(cellPosition(cell),`${stage?'◒ ':''}${nodeLabel(n,lang,t)}${status?' · '+status:''}`,'a3-pin',()=>live.current.onNode(n.id),color);
   if(n.wonderId)pin.getElement().insertAdjacentHTML('afterbegin',renderToStaticMarkup(
    <svg viewBox="-24 -29 48 48" aria-hidden="true"><DistrictLandmark districtId={n.districtId}/></svg>));
   return pin;
  });
  for(const u of game.units.filter(u=>unitAvailable(game,u))){
   if(props.motion&&u.id===props.selected)continue;
   const point=cellPosition(mapData.cells.get(u.cellId)!);
   const name=unitLabel(game,u,t);
   const mkr=marker(point,name,`a3-token${u.id===props.selected?' selected':''}`,origin=>live.current.onUnit(u.id,origin),factionColors[u.team]);
   mkr.getElement().id=`a3-unit-${u.id}`;
   if(isCommander(u)){const img=document.createElement('img');img.src=`${import.meta.env.BASE_URL}art/portraits/${game.commanders[u.team]}-v1.png`;img.alt='';mkr.getElement().prepend(img);}
   else {
    const sprite=document.createElement('span'),index=memberIndex(u.role,u.helper);
    sprite.className='a3-member-token';sprite.style.backgroundImage=`url("${publicAsset(`art/members/${u.team}-v1.png`)}")`;
    sprite.style.backgroundPosition=`${(index%3)*50}% ${index<3?0:66.6}%`;
    mkr.getElement().prepend(sprite);
   }
   markers.push(mkr);
  }
  return()=>markers.forEach(m=>m.remove());
 },[ready,game.units,game.commanders,game.stages,game.visitColors,game.day,props.selected,props.motion,lang,districtPicker,mapData.cells]);
 useEffect(()=>{
  for(const unit of game.units.filter(unit=>unit.team===game.playerTeam)){
   host.current?.querySelector(`#a3-unit-${unit.id}`)?.setAttribute('aria-expanded',String(!!fieldPopup&&unit.id===props.selected));
  }
 },[ready,game.units,game.day,props.selected,props.motion,lang,districtPicker,!!fieldPopup]);
 const popupCell=popup?.cellId??fieldPopup?.cellId;
 const isField=!!fieldPopup;
 useEffect(()=>{
  const m=map.current,cell=popupCell?mapData.cells.get(popupCell):undefined;
  if(!ready||!m||!cell)return;
  const position=alphaLngLat(cellPosition(cell));
  const track=()=>{
   const p=m.project(position),{clientWidth:width,clientHeight:height}=m.getContainer();
   setPopupPoint({x:p.x,y:p.y,width,height});
  };
  const p=m.project(position),{clientWidth:width,clientHeight:height}=m.getContainer();
  if(!isField||p.x<0||p.y<0||p.x>width||p.y>height){
   m.easeTo({center:position,duration:reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches?0:250});
  }
  track();m.on('move',track);m.on('resize',track);
  return()=>{m.off('move',track);m.off('resize',track);};
 },[ready,popupCell,isField,mapData.cells,reduceMotion]);
 const popupStyle={'--popup-x':`${popupPoint.x}px`,'--popup-y':`${popupPoint.y}px`} as React.CSSProperties;
 const fieldSide=popupPoint.x>popupPoint.width/2?'left':'right';
 const fieldVertical=popupPoint.y>popupPoint.height/2?'above':'below';
 const elevationCell=popup?mapData.cells.get(popup.cellId):undefined;
 const elevation=surface.data&&elevationCell?surfaceHeight(surface.data,cellPosition(elevationCell)[0],cellPosition(elevationCell)[1]):null;
 return <>
  <div ref={host} className="a3-map" aria-label={t('c_cityMap')} hidden={failed}/>
  {failed&&<section className="a3-map-fallback"><p>{t('a3_mapUnavailable')}</p>{mapData.districts.map(d=><button key={d.id}
   onClick={()=>districtPicker?props.onDistrict(d.id):props.onNode(d.wonderId)}>{mapLabel(d.name,lang)}</button>)}
   {!districtPicker&&game.units.filter(u=>u.team===game.playerTeam&&unitAvailable(game,u)).map(u=>
    <button key={u.id} aria-expanded={u.id===props.selected&&isField} onClick={e=>props.onUnit(u.id,e.currentTarget)}>{unitLabel(game,u,t)}</button>)}
  </section>}
  {(roads.error||buildings.error||terrain&&terrainFailed)&&!failed&&<button className="a3-map-warning" onClick={()=>{roads.retry();buildings.retry();setTerrainFailed(false);}}>{t('p_retry')}</button>}
  {popup&&<div className={`a3-pin-popup ${failed?'fallback':''}`} style={popupStyle}>{popup.element}
   {terrain&&elevation!==null&&<small className="a3-elevation">{t('a3_elevation',{metres:Math.round(elevation)})}</small>}</div>}
  {fieldPopup&&<div className={`a3-field-popup ${fieldSide} ${fieldVertical}${failed||!ready?' fallback':''}`} style={popupStyle}>{fieldPopup.element}</div>}
 </>;
}
