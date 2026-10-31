import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { useTranslation } from 'react-i18next';
import { useGame } from './game/store.ts';
import { level } from './game/level.ts';
import { at, blocked, distance, paths, damagePreview, guarded, apForDay } from './game/rules.ts';
const CELL=92, X=40, Y=40, WIDTH=1000, HEIGHT=724;
export default function Board(){
 const host=useRef<HTMLDivElement>(null);const [app,setApp]=useState<Application|null>(null);const [failed,setFailed]=useState(false);
 const {t,i18n}=useTranslation();const game=useGame(s=>s.game);const selected=useGame(s=>s.selected);const cell=useGame(s=>s.cell);
 const unit=game.units.find(u=>u.id===selected);const reachable=unit?paths(game,unit):new Map<string,number>();
 useEffect(()=>{let disposed=false;const a=new Application();void a.init({width:WIDTH,height:HEIGHT,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,autoStart:false,preference:'webgl'}).then(()=>{if(disposed){a.destroy(true,{children:true});return;}host.current?.appendChild(a.canvas);setApp(a);}).catch(()=>{if(!disposed)setFailed(true);});return()=>{disposed=true;setApp(null);if(a.renderer)a.destroy(true,{children:true});};},[]);
 useEffect(()=>{if(!app)return;app.stage.removeChildren().forEach(c=>c.destroy({children:true}));const scene=new Container();app.stage.addChild(scene);
  const g=new Graphics();scene.addChild(g);
  for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++){
   const p={x,y};const px=X+x*CELL,py=Y+y*CELL;const obstacle=blocked(p);const occupied=game.units.find(u=>at(u,p));const move=reachable.has(`${x},${y}`)&&!occupied;const target=unit&&occupied?.team==='green'&&distance(unit,occupied)<=unit.range&&unit.ap>=unit.attackCost;
   const road=x===4||x===5||y===3;g.roundRect(px+3,py+3,CELL-6,CELL-6,3).fill(obstacle?0x404c45:move?0x2e6454:road?0x263c34:0x21372f).stroke({width:1,color:move?0x619c7c:0x3c5147});
   if(road&&!obstacle&&!occupied)g.rect(px+CELL/2-5,py+CELL/2-1,10,2).fill(0x506151);
   if(move)g.circle(px+CELL/2,py+CELL/2,4).fill(0x8eb99d);
   if(obstacle){g.roundRect(px+18,py+23,56,43,4).fill(0x6a7462).stroke({color:0x8b9680,width:1});for(let n=0;n<3;n++)g.moveTo(px+22+n*17,py+29).lineTo(px+32+n*17,py+59).stroke({width:4,color:0xb6ad76});}
   if(target&&occupied&&unit){
    g.roundRect(px+5,py+5,CELL-10,CELL-10,4).stroke({width:2,color:0xec8977});
    const preview=damagePreview(game,unit,occupied);
    const label=new Text({text:`−${preview.damage}${preview.advantage?' ↑':''}`,style:{fontSize:16,fontWeight:'bold',fill:preview.advantage?0xffd784:0xf4b5a6,fontFamily:'Arial'}});label.anchor.set(.5,0);label.position.set(px+CELL/2,py+7);scene.addChild(label);
   }
  }
  for(const u of game.units){const cx=X+u.x*CELL+CELL/2,cy=Y+u.y*CELL+CELL/2;const active=u.id===selected;
   if(guarded(game,u)){g.roundRect(cx-35,cy-37,70,79,12).fill({color:0xd8d985,alpha:0.12}).stroke({width:2,color:0xe0d685});}
   if(active)g.circle(cx,cy-3,33).stroke({width:2,color:0xe5d17a});
   g.circle(cx,cy,26).fill(0x101e19);g.circle(cx,cy+1,23).fill(u.team==='blue'?0x6089af:0xa0b878).stroke({width:2,color:u.team==='blue'?0xb5d1ed:0xd3e2af});
   const text=new Text({text:t(`mark_${u.role}`),style:{fontFamily:'Arial, sans-serif',fontSize:23,fontWeight:'bold',fill:0x12231d}});text.anchor.set(.5);text.position.set(cx,cy+1);scene.addChild(text);
   g.roundRect(cx-26,cy+29,52,5,2).fill(0x101e19);g.roundRect(cx-26,cy+29,Math.max(1,52*u.hp/u.maxHp),5,2).fill(u.team==='blue'?0x9bc6eb:0xb8d494);
   for(let n=0;n<apForDay(game,u);n++)g.circle(cx-(apForDay(game,u)-1)*3.5+n*7,cy+42,2).fill(n<u.ap?0xdfd38c:0x43564a);
  }
  for(let x=0;x<level.width;x++){const txt=new Text({text:String.fromCharCode(65+x),style:{fontSize:13,fill:0x93a58e,fontFamily:'monospace'}});txt.anchor.set(.5);txt.position.set(X+x*CELL+CELL/2,18);scene.addChild(txt);}
  for(let y=0;y<level.height;y++){const txt=new Text({text:String(y+1),style:{fontSize:13,fill:0x93a58e,fontFamily:'monospace'}});txt.anchor.set(.5);txt.position.set(18,Y+y*CELL+CELL/2);scene.addChild(txt);}
  app.render();
 },[app,game,selected,i18n.language,t]);
 return <><div className={`board ${failed?'fallback':''}`}><div className="canvas-host" ref={host} aria-hidden="true"/><div className="board-controls" role="group" aria-label={t('mapLabel')}>
 {Array.from({length:level.width*level.height},(_,index)=>{const x=index%level.width,y=Math.floor(index/level.width);const u=game.units.find(v=>v.x===x&&v.y===y);const name=u?t('unitState',{team:t(u.team),role:t(u.role),hp:u.hp,ap:u.ap}):t(blocked({x,y})?'obstacle':'empty');return <button key={index} className={`tile ${blocked({x,y})?'barrier':''} ${u?.team??''} ${u&&guarded(game,u)?'guarded':''}`} disabled={!!game.result} aria-label={`${t('cell',{x:String.fromCharCode(65+x),y:y+1})}: ${name}`} aria-pressed={u?.id===selected} onClick={()=>cell({x,y})} title={`${String.fromCharCode(65+x)}${y+1} · ${name}${u&&unit&&u.team!==unit.team?' · '+t('previewDamage',{damage:damagePreview(game,unit,u).damage}):''}`}><span>{u?t(`mark_${u.role}`):blocked({x,y})?'▧':'·'}</span>{u&&unit&&u.team!==unit.team&&distance(unit,u)<=unit.range&&unit.ap>=unit.attackCost&&<b className="fallback-damage">−{damagePreview(game,unit,u).damage}</b>}</button>;})}
 </div>{game.feedback?.position&&typeof game.feedback.values?.damage==='number'&&<div key={game.feedback.id} aria-hidden="true" className="damage-burst" style={{left:`${(X+game.feedback.position.x*CELL+CELL/2)/WIDTH*100}%`,top:`${(Y+game.feedback.position.y*CELL+CELL/2)/HEIGHT*100}%`}}>{game.feedback.values.damage===0?t('guardStatus'):`−${game.feedback.values.damage}`}</div>}</div>{failed&&<p role="status" className="render-warning">{t('renderError')}</p>}</>;
}
