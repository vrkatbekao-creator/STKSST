import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCampaign } from './game/campaign-store.ts';
import { nodes,wonders } from './game/campaign-map.ts';
import { districtProgress,nodeProgress,trailFor } from './game/campaign-progress.ts';
import { progressKey } from './campaign-progress-labels.ts';
import { districtVisitPlans } from './game/campaign-plans.ts';
export function ProgressBadge({nodeId}:{nodeId:string}){const {t}=useTranslation();const {game}=useCampaign();const status=nodeProgress(game,nodeId);return <span className={`node-progress-badge ${status.completed?'complete':''}`}>{status.completed?'✓ ':''}{t(progressKey(status),{count:status.today})}</span>;}
export function NodeChecklist({nodeId,onNode,onPlan}:{nodeId:string;onNode:(id:string)=>void;onPlan:(id:string|null)=>void}){
 const {t,i18n}=useTranslation();const {game,districtId,selected,dispatch}=useCampaign();const lang=i18n.language==='en'?'en':'zh-TW',progress=districtProgress(game,districtId),unit=game.units.find(u=>u.id===selected)!;
 const [filter,setFilter]=useState<'all'|'unfinished'|'available'>('all');const plans=districtVisitPlans(game,unit,districtId),available=plans.filter(p=>p.canAct).length;
 const shown=plans.filter(p=>filter==='all'||(filter==='available'?p.canAct:!nodeProgress(game,p.nodeId).completed));
 return <section id="campaign-locations" tabIndex={-1} className="node-checklist" aria-label={t('c_sweepProgress')}><div className="node-checklist-heading"><strong>{t('c_sweepProgress')}</strong><span>{t('c_completedCount',progress)}</span></div><p>{t('c_progressHelp')}</p><p className="node-plan-overview">{t('c_planOverview',{count:available,ap:unit.ap})}</p><p>{t('c_planBudgetHelp')}</p>{trailFor(game).partial&&<p className="progress-partial">{t('c_legacyTrail')}</p>}
 <div className="node-filters" role="group" aria-label={t('c_filterLocations')}>{(['all','unfinished','available'] as const).map(key=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{t(`c_filter_${key}`)}</button>)}</div>
 {!shown.length&&<p className="node-plan-empty">{t('c_noMatchingLocations')}</p>}<div className="map-node-list" role="group" aria-label={t('c_nodes')}>{shown.map(plan=>{const n=nodes.find(n=>n.id===plan.nodeId)!,w=wonders.find(w=>w.id===n.wonderId),name=w?w.name[lang]:t(`c_node_${n.kind}`);return <article className="node-plan-card" key={n.id} data-node-id={n.id}>
 <button className="node-summary" aria-pressed={nodeId===n.id} onClick={()=>onNode(n.id)}><strong>{n.kind==='wonder'?'★ ':''}{name}</strong><ProgressBadge nodeId={n.id}/></button>
 <p className={`node-plan-state ${plan.canAct?'ready':''}`}>{t(`c_plan_${plan.state}`,{move:plan.moveAp,total:plan.totalAp,ap:plan.activityAp,materials:plan.materials})}</p>
 <div className="node-plan-buttons"><button aria-label={`${t('c_previewNodeRoute')}：${name}`} className="outline-button" disabled={!plan.destination||!plan.moveAp||!!game.result} onClick={()=>{onNode(n.id);onPlan(plan.destination);}}>{t('c_previewNodeRoute')}</button><button aria-label={`${t(plan.moveAp?'c_moveAndCanvass':'c_canvassHere')}：${name}`} className="campaign-primary" disabled={!plan.canAct||!!game.talk} onClick={()=>{onNode(n.id);dispatch({type:'canvassRoute',unitId:unit.id,nodeId:n.id});onPlan(null);}}>{t(plan.moveAp?'c_moveAndCanvass':'c_canvassHere')}</button></div>
 </article>;})}</div></section>;
}
