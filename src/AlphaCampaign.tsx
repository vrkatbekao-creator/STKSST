import {mapLabel} from './map-language.ts';
import {releaseVersion} from './release-version.ts';
import {LanguageSelect} from './LanguageSelect.tsx';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useCampaign} from './game/campaign-store.ts';
import {actionCost,eventTopic,intelligence,isCommander,nearbyNodes,nextEvent,scheduledEvent,streetCanvassError,unitAvailable,wonderCondition} from './game/campaign.ts';
import {outreachQuote} from './game/campaign-outreach.ts';
import type {Command} from './game/campaign.ts';
import {cellPosition,mapFor,walkGeometry} from './game/campaign-map.ts';
import {vehicleActive} from './game/campaign-vehicle-state.ts';
import {teams} from './game/campaign-teams.ts';
import type {TravelIntent,TravelMode,TravelQuote,TravelSegment} from './game/campaign-travel.ts';
import {unitLabel} from './campaign-unit-label.ts';
import {nodeLabel} from './campaign-node-label.ts';
import {CommanderPortrait,RolePortrait,CampaignVehicle} from './CampaignArt.tsx';
import {Landmark} from './CampaignMaps.tsx';
import {CampaignDialogue} from './CampaignDialogue.tsx';
import {CampaignMedia} from './CampaignMedia.tsx';
import {CampaignGrowth} from './CampaignGrowth.tsx';
import {CampaignContacts} from './CampaignContacts.tsx';
import {RivalActions,SurprisePanel,TacticsPanel} from './CampaignTacticsPanels.tsx';
import {SessionControls} from './CampaignSession.tsx';
import {AccessibilityPanel} from './AccessibilityPanel.tsx';
import {publicAsset} from './public-asset.ts';
import {useAccessibility} from './useAccessibility.ts';
import {MobileMapSheet} from './MobileMapSheet.tsx';
import './alpha-campaign.css';

const Map=lazy(()=>import('./AlphaMap.tsx').then(m=>({default:m.AlphaMap})));
type Panel='district'|'journal'|'venues'|'team'|'tactics'|'intel'|'calendar'|'session'|'contacts';
type Destination={cellId:string;nodeId?:string;districtId?:string};
type TravelPreference='auto'|'walk'|'drive'|'motorcade';
type ModeChoice=TravelMode|'auto';
const keys:Record<Panel,string>={district:'c_district',journal:'c_journal',venues:'c_nodes',team:'c_team',tactics:'c_classTactics',
 intel:'poll',calendar:'c_calendar',session:'s_slots',contacts:'n_title'};
const modeLabel:Record<TravelMode,string>={walk:'a3_walk',drive:'c_action_drive',motorcade:'c_action_motorcade',siteTransfer:'c_action_siteTransfer',transport:'c_action_transport'};
const travelPreferences:TravelPreference[]=['auto','walk','drive','motorcade'];
const lines=['a3_chat1','a3_chat2','a3_chat3','a3_chat4'];
const mobileLayout='(max-width: 760px), (pointer: coarse) and (max-height: 500px) and (orientation: landscape)';

export function AlphaCampaign(){
 const {t,i18n}=useTranslation(),lang=i18n.language,state=useCampaign();
 // The mobile landing page can be scrolled far below the in-game HUD.
 useEffect(()=>{window.scrollTo(0,0);},[]);
 const {reduceMotion}=useAccessibility();
 const {game,selected,dispatch,select,end}=state,team=game.playerTeam;
 const map=mapFor(game),actor=game.units.find(u=>u.id===selected)!,leader=game.units.find(u=>u.id===`${team}1`)!;
 const commander=game.commanders[team],resources=game.resources[team];
 const [district,setDistrict]=useState(state.districtId),[panel,setPanel]=useState<Panel|null>(null);
 const [mobile,setMobile]=useState(()=>matchMedia(mobileLayout).matches);
 const [target,setTarget]=useState<Destination|null>(null),[choice,setChoice]=useState<ModeChoice>('walk');
 const [place,setPlace]=useState<string|null>(null);
 const [submissionError,setSubmissionError]=useState('');
 const [travelPreference,setTravelPreference]=useState<TravelPreference>('auto');
 const [quote,setQuote]=useState<TravelQuote|null>(null),[quoteError,setQuoteError]=useState(''),[loading,setLoading]=useState(false);
 const rejectedModes=useRef<Partial<Record<TravelMode,string>>>({});
 const confirming=useRef(false);
 const [arrival,setArrival]=useState<{nodeId?:string;quote?:TravelQuote;mode?:TravelMode}|null>(null);
 const [grid,setGrid]=useState(false),[terrain,setTerrain]=useState(true),[chat,setChat]=useState(0),[topic,setTopic]=useState('transport');
 const [historyRoute,setHistoryRoute]=useState<TravelSegment[]>([]);
 const [motion,setMotion]=useState<TravelQuote|null>(null);
 const [headline,setHeadline]=useState<'update'|'breaking'|null>(()=>game.day===1&&game.actions===0?'update':null);
 const lastEvent=useRef(game.surprise?game.day:0),drawerOrigin=useRef<HTMLElement|null>(null);
 const drawerClose=useRef<HTMLButtonElement>(null),quoteHeading=useRef<HTMLElement>(null);
 const fieldHeading=useRef<HTMLHeadingElement>(null),quoteOrigin=useRef<HTMLElement|null>(null);
 const fieldOrigin=useRef<HTMLElement|null>(null);
 const area=map.districts.find(d=>d.id===district)??map.districts[0];
 const activeVehicle=!!game.vehicle&&vehicleActive(game.vehicle,game.day);
 const actorDistrict=map.cells.get(actor.cellId)!.districtId;
 const mode=choice==='auto'?(target?preferredMode(target,'auto'):'walk'):choice;
 const busy=!!state.campaignPending||state.movePending||!!motion;
 const node=target?.nodeId?map.nodeById.get(target.nodeId):undefined;
 const name=(id:string)=>{const n=map.nodeById.get(id);return n?nodeLabel(n,lang,t):id;};
 const focusDistrict=(id:string)=>{setDistrict(id);setPanel(null);setHistoryRoute([]);setTarget(null);setPlace(null);};
 function togglePanel(value:Panel,event?:React.MouseEvent<HTMLElement>){
  if(panel===value){closePanel();return;}
  if(event)drawerOrigin.current=event.currentTarget;
  setPanel(value);setTarget(null);setPlace(null);setArrival(null);
 }
 function closePanel(){setPanel(null);drawerOrigin.current?.focus();}
 function preferredMode(destination:Destination, preference:TravelPreference):TravelMode{
  if(!activeVehicle)return 'walk';
  if(preference!=='auto')return preference;
  return (destination.districtId??map.cells.get(destination.cellId)?.districtId)!==actorDistrict?'motorcade':'walk';
 }
 function changeTravelMode(next:ModeChoice){
  if(choice===next)return;
  const nextMode=next==='auto'&&target?preferredMode(target,next):next;
  if(nextMode!==mode){
   setQuote(null);setQuoteError('');setSubmissionError('');setLoading(true);
  }
  setChoice(next);
 }
 function pick(destination:Destination){
  if(busy||game.talk||game.result)return;
  quoteOrigin.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setPanel(null);setPlace(null);setHistoryRoute([]);setQuote(null);setQuoteError('');setSubmissionError('');
  if(destination.cellId===actor.cellId){setTarget(null);fieldOrigin.current=quoteOrigin.current;setArrival({nodeId:destination.nodeId});return;}
  setArrival(null);setChoice(mobile?'auto':preferredMode(destination,travelPreference));setLoading(true);setTarget(destination);
 }
 function pickNode(id:string){
  const n=map.nodeById.get(id);if(n)pick({cellId:n.cellId,nodeId:id,districtId:n.districtId});
 }
 function openNode(id:string){
  if(!mobile){pickNode(id);return;}
  if(busy||game.talk||game.result)return;
  const n=map.nodeById.get(id);
  if(!n)return;
  setPanel(null);setTarget(null);setHistoryRoute([]);
  if(nearbyNodes(game,actor).some(local=>local.id===id)){
   setPlace(null);
   fieldOrigin.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
   setArrival({nodeId:id});
  }else{
   setArrival(null);setPlace(id);
  }
 }
 function chooseUnit(id:string){
  const u=game.units.find(v=>v.id===id);
  if(!u)return;
  if(u.team!==team){togglePanel('tactics');return;}
  select(id);setDistrict(map.cells.get(u.cellId)!.districtId);setTarget(null);setPlace(null);setArrival(null);
 }
 function closeField(){
  setArrival(null);
  const origin=fieldOrigin.current;
  if(origin?.isConnected){origin.focus({preventScroll:true});return;}
  document.getElementById(`a3-unit-${selected}`)?.focus({preventScroll:true});
 }
 function openFieldForUnit(id:string,origin:HTMLElement){
  if(busy||game.talk||game.result)return;
  if(id===selected&&arrival){closeField();return;}
  chooseUnit(id);
  if(game.units.find(u=>u.id===id)?.team!==team)return;
  fieldOrigin.current=origin;
  setPanel(null);setHistoryRoute([]);setArrival({});
 }
 useEffect(()=>{if(panel)drawerClose.current?.focus({preventScroll:true});},[panel]);
 useEffect(()=>{if(target&&!mobile)quoteHeading.current?.focus({preventScroll:true});},[target,mobile]);
 useEffect(()=>{
  const layout=matchMedia(mobileLayout);
  const change=()=>{setMobile(layout.matches);setPlace(null);setTarget(null);};
  layout.addEventListener('change',change);
  return()=>layout.removeEventListener('change',change);
 },[]);
 const fieldOpen=!!arrival&&!motion&&!game.talk&&!game.result;
 useEffect(()=>{if(fieldOpen)fieldHeading.current?.focus({preventScroll:true});},[fieldOpen,selected]);
 useEffect(()=>{setTarget(null);setPlace(null);setArrival(null);setHistoryRoute([]);setMotion(null);},[game.day,game.phase]);
 useEffect(()=>{if(game.talk||game.result){setTarget(null);setPlace(null);}},[game.talk,game.result]);
 useEffect(()=>{rejectedModes.current={};},[target,selected,game]);
 useEffect(()=>{
  if(!game.surprise||game.day===lastEvent.current)return;
  lastEvent.current=game.day;setHeadline('breaking');
 },[game.day,game.surprise]);
 useEffect(()=>{if(!headline)return;const timer=setTimeout(()=>setHeadline(null),headline==='update'?2000:2600);return()=>clearTimeout(timer);},[headline]);
 useEffect(()=>{
  if(!target)return;
  let current=true;
  confirming.current=false;
  setQuote(null);setLoading(true);setQuoteError('');
  const intent:TravelIntent={...target,unitId:selected,mode};
  state.quoteTravel(intent).then(result=>{
   if(!current)return;
   if(result.error)rejectedModes.current[mode]=result.error;
   setQuote(result.quote??null);setQuoteError(result.error??'');setLoading(false);
  }).catch(()=>{if(current){setQuoteError('c_errorRoute');setLoading(false);}});
  return()=>{current=false;};
 },[target,mode,selected,game]);
 function confirm(){
  if(!quote||!target||loading||busy||confirming.current)return;
  confirming.current=true;
  if(!state.confirmTravel(quote)){
   setQuote(null);setLoading(true);setSubmissionError('a3_stale');setTarget({...target});return;
  }
  const destination=map.cells.get(quote.destination)!;
  fieldOrigin.current=null;
  setDistrict(destination.districtId);setArrival({nodeId:target.nodeId,quote,mode});
  if(!reduceMotion&&!matchMedia('(prefers-reduced-motion: reduce)').matches)setMotion(quote);
  setTarget(null);
 }
 function cancel(){
  setTarget(null);
  setPlace(null);
  if(mobile)return;
  if(quoteOrigin.current?.isConnected)quoteOrigin.current.focus();
  else drawerOrigin.current?.focus();
 }
 const canAct=!busy&&!game.result&&!game.talk&&unitAvailable(game,actor);
 const action=(cmd:Command,label=t(`c_action_${cmd.type}`),blocked=false)=>{
  const cost=actionCost(game,cmd);
  return <button key={JSON.stringify(cmd)} disabled={!canAct||blocked||actor.ap<cost.ap||resources.materials<cost.materials}
   onClick={()=>void dispatch(cmd)}>{label}<small>{t('c_cost',cost)}</small></button>;
 };
 const upcoming=nextEvent(game.day),currentEvent=scheduledEvent(game.day), intel=intelligence(game);
 const surprise=game.surprise;
 const surpriseText=surprise?t(`c_surprise_${surprise.id}`)+' · '+mapLabel(map.districts.find(d=>d.id===surprise.districtId)!.name,lang):'';
 const local=nearbyNodes(game,actor);
 const nearby=local.find(n=>n.id===arrival?.nodeId)??local[0];
 const stage=nearby?game.stages.find(s=>s.nodeId===nearby.id):undefined;
 const visitBlocked=nearby?game.nodeState[nearby.id].visits[team]>=2||
  (game.movementProfile==='streets-v2'&&outreachQuote(game,team,nearby.cellId).count>=2):false;
 const support=intel.kind==='poll'||intel.kind==='result'?intel.support:undefined;
 const sum=support?teams.reduce((n,id)=>n+support[id],0):0;
 const chatter=chat%2?game.units.find(u=>u.team===team&&u.helper)??game.units.find(u=>u.team===team&&u.id!==leader.id)!:leader;
 const portrait=(u:typeof actor)=>isCommander(u)?<CommanderPortrait id={game.commanders[u.team]}/>:<RolePortrait role={u.role} helper={u.helper} team={u.team}/>;
 const pendingTarget=target?map.cells.get(quote?.destination??target.cellId):undefined;
 const nearbyPlaces=map.nodes.filter(n=>n.districtId===area.id&&(n.wonderId||n.sourcePlace||n.kind==='venue'));
 const placeButton=(id:string)=> <button key={id} onClick={()=>openNode(id)}>{name(id)}</button>;
 const modes:TravelMode[]=activeVehicle?['walk','drive','motorcade']:['walk',...(node?.sourcePlace?['siteTransfer' as const]:[]),...(node?.wonderId&&area.id!==map.cells.get(actor.cellId)!.districtId?['transport' as const]:[])];
 const mobileModes:ModeChoice[]=['auto','walk','drive','motorcade',...modes.filter(v=>v==='siteTransfer'||v==='transport')];
 const targetDistrict=target?map.districts.find(d=>d.id===(target.districtId??map.cells.get(target.cellId)?.districtId)):undefined;
 const placeDistrict=place?map.districts.find(d=>d.id===map.nodeById.get(place)?.districtId):undefined;
 const destinationLabel=node?name(node.id):targetDistrict?t('a3_mobileGround',{district:mapLabel(targetDistrict.name,lang)}):t('a3_destination');
 const confirmLabel=t(mode==='motorcade'?'a3_confirmMotorcade':mode==='drive'?'a3_confirmDrive':'c_confirmMove');
 const travelCost=quote&&target?<><p>{t('c_cost',quote)} · {t('a3_remaining',{ap:quote.remaining})}</p>
  {quote.destination!==target.cellId&&<small>{t('a3_nearbyStop')}</small>}
  {quote.walkingAp!==undefined&&<p className="a3-leg-cost">{t('a3_legCost',quote)}</p>}
  {mode==='motorcade'&&<small>{t('a3_motorcadeHint')}</small>}</>:null;
 const panelButton=(id:Panel,label=t(keys[id]))=><button aria-expanded={panel===id} onClick={e=>togglePanel(id,e)}>{label}</button>;
 const fieldMenu=fieldOpen&&arrival?<section className="a3-field-menu" aria-labelledby="a3-field-title">
  <header className="a3-drawer-head"><h2 id="a3-field-title" ref={fieldHeading} tabIndex={-1}>{t('c_actions')} · {unitLabel(game,actor,t)}</h2>
   <button onClick={closeField}>{t('close')}</button></header>
  {game.apRules==='golden-week'&&<small>{actor.ap} AP · {t('gw_walkCredit',{metres:Math.max(0,Math.floor((actor.walkCredit??0)-(actor.walkedEffort??0)))})}</small>}
  {nearby&&local.length===1&&<p>{name(nearby.id)}</p>}
  {local.length>1&&<label className="a3-nearby">{t('c_nodes')} <select value={nearby?.id??''} onChange={e=>setArrival({...arrival,nodeId:e.target.value})}>
   {local.map(n=><option key={n.id} value={n.id}>{name(n.id)}</option>)}</select></label>}
  {arrival.quote?.contacts!==undefined&&<p role="status">{t('a3_motorcadeDone')} · {t(arrival.quote.contacts?'a3_contact':'a3_noContact')}</p>}
  <div className="a3-actions">
   {game.movementProfile==='streets-v2'&&action({type:'streetCanvass',unitId:selected},undefined,!!streetCanvassError(game,actor))}
   {nearby&&action({type:'visit',unitId:selected,nodeId:nearby.id},undefined,visitBlocked)}
   {nearby&&action({type:'talkStart',unitId:selected,nodeId:nearby.id,mode:'resident'},t('d_resident'),visitBlocked)}
   {nearby&&action({type:'canvass',unitId:selected,nodeId:nearby.id},undefined,visitBlocked)}
   {nearby?.wonderId&&(['forum','livestream','culture','environment'] as const).map(type=>action({type,unitId:selected,nodeId:nearby.id},undefined,visitBlocked))}
   {nearby?.wonderId&&<button disabled={!canAct} onClick={()=>state.priority(nearby.wonderId!)}>{t('c_prioritize')} · {wonderCondition(game,nearby.wonderId,team)?'✓':'★'}</button>}
   {nearby?.kind==='venue'&&!stage&&(['island','soapbox'] as const).map(brand=>action({type:'build',unitId:selected,nodeId:nearby.id,brand},t(`c_brand_${brand}`)))}
   {stage?.team===team&&nearby&&(!stage.staffed?action({type:'staff',unitId:selected,nodeId:nearby.id},undefined,stage.openDay>game.day||resources.volunteers<1):
    action({type:'talkStart',unitId:selected,nodeId:nearby.id,mode:'stage'},t('c_action_stageEvent'),stage.lastEventDay===game.day||stage.openDay>game.day))}
   {stage?.team===team&&nearby&&action({type:'withdraw',unitId:selected,nodeId:nearby.id})}
  </div>
 </section>:null;
 return <main className={`a3-shell a3-${game.phase}${reduceMotion?' a3-reduced':''}`} id="campaign-main" tabIndex={-1}
  data-move-engine={state.lastMoveEngine??undefined} data-vehicle-engine={state.lastVehicleEngine??undefined}
  data-night-engine={state.lastNightEngine??undefined} data-night-searches={state.lastNightSearches} onKeyDown={e=>{
  if(e.key==='Escape'){if(mobile&&(target||place))return;if(target)cancel();else if(panel)closePanel();else if(fieldOpen)closeField();}
 }}>
  <div className="a3-map-layout">
  <header className="a3-desk">
   <div className="a3-title"><h1>{t('brand')} <small>{t('c_chapter')}</small></h1><b>{t('a3_update')}</b>{import.meta.env.MODE!=='alpha'&&<small>{releaseVersion}</small>}</div>
   <div className="a3-status"><span>{t('c_dayLabel')} {game.day}/28 · {t(game.phase)}</span>
    <span>{unitLabel(game,actor,t)} <strong>{actor.ap} AP</strong> · {resources.materials} {t('c_materials')}{game.apRules==='golden-week'&&<> · {t('gw_hq',{count:game.hqTokens?.[team]??0})}</>}</span>
    <button disabled={busy||!!game.talk||!!game.result} onClick={()=>void end()}>{t(game.phase==='day'?'c_endDay':'c_endNight')}{game.apRules==='golden-week'&&game.phase==='day'?' +4 AP':''}</button>
   </div>
   {mobile&&<details className="a3-mobile-about">
    <summary>{t('a3_mobileAbout')}</summary>
    <div><strong>{t('title')}</strong><p>{releaseVersion} · {t('a3_update')}</p><p>{t('a3_legend')}</p>
    {state.vehicleUnavailable&&<p>{t('c_vehicleUnavailable')}</p>}</div>
   </details>}
   {!mobile&&activeVehicle&&<div className="a3-travel-modes" role="group" aria-label={t('a3_travelMode')}>
    <strong>{t('a3_travelMode')}</strong>
    {travelPreferences.map(value=><button key={value} type="button" disabled={busy||!!game.talk||!!game.result} aria-pressed={travelPreference===value}
     onClick={()=>{setTravelPreference(value);if(target)changeTravelMode(preferredMode(target,value));}}>
     {value==='motorcade'&&<CampaignVehicle id={commander}/>} {t(value==='auto'?'a3_travelAuto':modeLabel[value])}
    </button>)}
    <small>{t(travelPreference==='auto'?'a3_travelAutoHint':'a3_travelPickDestination')}</small>
   </div>}
   {!mobile&&state.vehicleUnavailable&&<p className="a3-vehicle-warning" role="status">{t('c_vehicleUnavailable')}</p>}
  </header>
  <div className="a3-news"><b>{t(surprise?'c_breaking':'c_streetReport')}</b><span key={surprise?game.day:game.news} className={surprise?'breaking':''} role="status">{surprise?surpriseText:t(`c_news_${game.news}`)}</span>
   {panelButton('calendar',currentEvent?t(`c_event_${currentEvent}`):upcoming?t('c_scheduled',{day:upcoming,event:t(`c_event_${scheduledEvent(upcoming)}`)}):t('c_calendar'))}
  </div>
  <section className="a3-board" aria-label={t('c_cityMap')}>
   <Suspense fallback={<p className="a3-loading">{t('loadingMap')}</p>}>
    <Map game={game} districtId={area.id} selected={selected} grid={grid} terrain={terrain} mobile={mobile} districtPicker={panel==='district'}
     destination={pendingTarget?.id} segments={target?quote?.segments??[]:arrival?.quote?.segments??historyRoute}
     motion={motion} onMotionEnd={()=>setMotion(null)}
     onCell={id=>pick({cellId:id,districtId:map.cells.get(id)?.districtId})} onDistrict={focusDistrict} onNode={openNode} onUnit={openFieldForUnit}
     fieldPopup={fieldMenu?{cellId:actor.cellId,element:fieldMenu}:undefined}
     popup={!mobile&&target&&pendingTarget?{cellId:pendingTarget.id,element:<div className="a3-quote" role="group" aria-label={t('c_routePreview',{cost:quote?.ap??'—'})}>
      <strong tabIndex={-1} ref={quoteHeading}>{node?name(node.id):t('a3_destination')}</strong>
      {game.visitColors?.[pendingTarget.id]&&<small>{game.visitColors[pendingTarget.id].challenger?t('a3_contested'):
       t('a3_visitedBy',{team:t(game.visitColors[pendingTarget.id].team),count:game.visitColors[pendingTarget.id].depth})}</small>}
      <div className="a3-actions" role="group" aria-label={t('a3_quoteMode')}>{modes.map(value=><button key={value} aria-pressed={mode===value} onClick={()=>changeTravelMode(value)}>{value==='motorcade'&&<CampaignVehicle id={commander}/>} {t(modeLabel[value])}</button>)}</div>
      {loading?<p role="status">{t(mode==='drive'||mode==='motorcade'?'c_vehiclePending':'c_routePending')}</p>:travelCost??<p role="status">{quoteError?t(quoteError):null}</p>}
      <div className="a3-actions"><button className="a3-primary" onClick={confirm} disabled={loading||busy||!quote}>{confirmLabel}</button><button onClick={cancel}>{t('cancel')}</button></div>
     </div>}:undefined}/>
   </Suspense>
   <aside className="a3-left">
    {panelButton('district',mapLabel(area.name,lang)+' ▾')}
    <button onClick={()=>openNode(area.wonderId)}><svg viewBox="-24 -29 48 48" aria-hidden="true"><Landmark districtId={area.id}/></svg>{name(area.wonderId)}</button>
    {panelButton('journal')}
   </aside>
   <aside className="a3-right">
    <div className="a3-leader">{portrait(leader)}<span><small>{t('a3_leader')}</small><strong>{unitLabel(game,leader,t)}</strong><small>{leader.ap} AP</small></span>
     <button aria-expanded={panel==='tactics'} onClick={e=>{chooseUnit(leader.id);togglePanel('tactics',e);}}>{t(`c_skill_${commander}`)}</button>
    </div>
    {panelButton('venues')}{panelButton('team')}{panelButton('intel',t('a3_intel'))}{panelButton('contacts')}{panelButton('session')}
   </aside>
   {panel&&<section className={`a3-drawer ${panel==='district'||panel==='journal'?'left':''}`} aria-label={t(keys[panel])}>
    <div className="a3-drawer-head"><h2>{t(keys[panel])}</h2><button ref={drawerClose} onClick={closePanel}>{t('close')}</button></div>
    {panel==='district'&&<div className="a3-grid">{map.districts.map(d=><button key={d.id} aria-pressed={d.id===area.id} onClick={()=>focusDistrict(d.id)}>{mapLabel(d.name,lang)}</button>)}</div>}
    {panel==='venues'&&<><label>{t('c_district')} <select value={area.id} onChange={e=>setDistrict(e.target.value)}>{map.districts.map(d=><option key={d.id} value={d.id}>{mapLabel(d.name,lang)}</option>)}</select></label>
     <div className="a3-grid">{nearbyPlaces.map(n=>placeButton(n.id))}</div></>}
    {panel==='journal'&&<><ol>{game.logs.map((entry,i)=><li key={i}>{t(entry.key,{...entry.values,team:entry.values.team?t(String(entry.values.team)):'',
     action:entry.values.skill?t(`c_skill_${entry.values.skill}`):entry.values.action?t(`c_action_${entry.values.action}`):'',node:entry.values.node?name(String(entry.values.node)):''})}</li>)}</ol>
     <div className="a3-grid">{(game.trail?.[team].walks??[]).slice(-8).reverse().map((walk,i)=><button key={i} onClick={()=>{
      setArrival(null);setHistoryRoute([{mode:'walk',points:walkGeometry(walk.cells,walk.edgeIds)}]);setDistrict(map.cells.get(walk.cells.at(-1)!)!.districtId);closePanel();
     }}>{t('c_dayLabel')} {walk.day} · {t(walk.phase)} · {t('a3_walk')} {i+1}</button>)}
     {game.vehicle?.teams[team].journal.journeys.map((trip,i)=><button key={`vehicle-${i}`} onClick={()=>{
      setArrival(null);setHistoryRoute(state.vehicleHistoryRoute(i));setDistrict(map.cells.get(trip.toCell)!.districtId);closePanel();
     }}>{t('c_dayLabel')} {trip.day} · {t(trip.phase)} · {t(modeLabel[trip.mode])}</button>)}</div></>}
    {panel==='team'&&<>{game.apRules==='golden-week'&&<><p>{t('gw_rules')}</p><p>{t('gw_outreach')}</p><p>{t('gw_hqHelp')}</p></>}<div className="a3-roster">{game.units.filter(u=>u.team===team).map(u=><button key={u.id} aria-pressed={selected===u.id} onClick={()=>chooseUnit(u.id)}>
     {portrait(u)}<span>{unitLabel(game,u,t)}<small>{t(isCommander(u)?`c_skill_${commander}`:u.helper?'c_action_assist':u.role==='heavy'?'c_action_brace':u.role==='ranged'?'c_action_broadcast':'c_action_backstab')}</small></span><b>{u.ap} AP</b>
    </button>)}</div><CampaignGrowth/><TacticsPanel/><RivalActions/></>}
    {panel==='tactics'&&<><TacticsPanel/><RivalActions/>{action({type:'rest',unitId:selected})}</>}
    {(panel==='intel'||panel==='calendar')&&<div className="a3-actions">{panelButton('intel')}{panelButton('calendar')}</div>}
    {panel==='intel'&&(support?<><div className="intel-numbers">{teams.map(id=><span key={id}>{t(id)} <b>{(sum?support[id]/sum*100:0).toFixed(1)}%</b></span>)}</div>
     {intel.kind==='result'&&<p>{t('c_points',support)}</p>}</>:intel.kind==='rumor'?<p>{t(`c_rumor_${intel.band}`,{area:t('c_city'),leader:intel.leader?t(intel.leader):''})}</p>:<p>{t('c_noPoll')}</p>)}
    {panel==='calendar'&&<><p>{upcoming?t('c_scheduled',{day:upcoming,event:t(`c_event_${scheduledEvent(upcoming)}`)}):t('c_noMoreEvents')}</p>
     <label>{t('c_responseTopic')} <select value={topic} onChange={e=>setTopic(e.target.value)}>{['housing','transport','environment'].map(key=><option key={key} value={key}>{t(`c_topic_${key}`)}</option>)}</select></label>
     {action({type:'prepare',unitId:selected,topic},undefined,game.prepared[team]?.day===game.day)}
     {currentEvent&&action({type:'talkStart',unitId:selected,mode:'debate'},t('c_action_event'),game.eventDone[team]===game.day)}
     <SurprisePanel/></>}
    {panel==='contacts'&&<CampaignContacts/>}
    {panel==='session'&&<><SessionControls/><AccessibilityPanel/><label>{t('language')} <LanguageSelect/></label>
     <p><a href={publicAsset('data/GAME-DATA-CREDITS.txt')} target="_blank" rel="noreferrer">{t('p_credits')}</a></p></>}
   </section>}
   <div className="a3-tools"><button aria-pressed={grid} onClick={()=>setGrid(!grid)}>{t('a3_grid')}</button>
    <button aria-pressed={terrain} onClick={()=>setTerrain(!terrain)}>{t('a3_terrain')}</button>
    <span>{t('a3_legend')}</span></div>
   {headline&&<div className={`a3-headline ${headline==='breaking'?'breaking':''}`} key={headline+game.day} aria-hidden="true">{headline==='update'?t('a3_update'):surpriseText}</div>}
  </section>
  </div>
  {mobile&&(place||target)&&<MobileMapSheet kind={place?'place':'travel'} title={place?name(place):destinationLabel} dismiss={cancel}>
   {place?<>{placeDistrict&&<p>{mapLabel(placeDistrict.name,lang)}</p>}
    <div className="a3-actions"><button className="a3-primary" onClick={()=>pickNode(place)}>{t('a3_mobileMoveHere')}</button></div></>:<>
    <div className="a3-sheet-modes" role="group" aria-label={t('a3_quoteMode')}>{mobileModes.map(value=>{
     const effective=value==='auto'?preferredMode(target!,'auto'):value;
     const unavailable=(effective==='drive'||effective==='motorcade')&&!activeVehicle?'a3_mobileVehicleOff':rejectedModes.current[effective];
     return <button key={value} type="button" aria-disabled={!!unavailable} aria-pressed={choice===value}
      onClick={()=>{if(!unavailable)changeTravelMode(value);}}>
      {choice===value&&<span aria-hidden="true">✓ </span>}
      {t(value==='auto'?'a3_travelAuto':modeLabel[value])}
      {unavailable&&<small>{t(unavailable)}</small>}
     </button>;
    })}</div>
    <div className="a3-sheet-cost" aria-live="polite">
     {choice==='auto'&&<small>{t('a3_mobileAutoMode',{mode:t(modeLabel[mode])})}</small>}
     {submissionError&&<p>{t(submissionError)}</p>}
     {loading?<p>{t(mode==='drive'||mode==='motorcade'?'c_vehiclePending':'c_routePending')}</p>:travelCost??(quoteError&&<p>{t(quoteError)}</p>)}
    </div>
    <div className="a3-actions">
     <button className="a3-primary" disabled={loading||busy||!quote} onClick={confirm}>{confirmLabel}</button>
     <button onClick={cancel}>{t('cancel')}</button>
    </div>
   </>}
  </MobileMapSheet>}
  <div className="a3-scene">
   {game.talk?<CampaignDialogue/>:game.result?<><h2>{t(game.result==='draw'?'c_resultDraw':game.result===team?'c_resultWin':'c_resultLose')}</h2>
    {support&&<p>{t('c_points',support)}</p>}<button onClick={state.reset}>{t('playAgain')}</button></>:motion?<p role="status">{t(arrival?.mode==='motorcade'?'a3_motorcadeTraveling':'a3_arriving')}</p>:chat>=0?<div className="a3-chat">{portrait(chatter)}<div><small>{t('a3_chat')} · {unitLabel(game,chatter,t)}</small><p>{t(lines[chat])}</p></div>
      <div className="a3-actions">{chat<lines.length-1&&<button onClick={()=>setChat(chat+1)}>{t('a3_nextLine')}</button>}<button onClick={()=>setChat(-1)}>{t('close')}</button></div></div>:
    <button onClick={()=>setChat(0)}>{t('a3_chat')}</button>}
   <p className="a3-feedback" role="status">{busy?t(state.campaignPending==='night'?'c_nightPending':'c_routePending'):state.error?t(state.error):state.saveError?t(state.saveError):''}</p>
  </div>
  <footer className="a3-footer"><CampaignMedia centered/><a href={publicAsset('data/GAME-DATA-CREDITS.txt')} target="_blank" rel="noreferrer">© OpenStreetMap · Copernicus GLO-30 DSM · {t('p_credits')}</a></footer>
 </main>;
}
