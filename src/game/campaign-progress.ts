import type { Campaign,CampaignUnit } from './campaign.ts';
import { mapFor, allCells as cells,nodeById,nodes } from './campaign-map.ts';
import { teamRecord } from './campaign-teams.ts';
import type { Team } from './campaign-teams.ts';
export type CampaignWalk={unitId:string;day:number;phase:'day'|'night';cells:string[];edgeIds?:number[]};
export type CampaignTrail=Record<Team,{arrivedCells:string[];completedNodes:string[];partial:boolean;walks?:CampaignWalk[]}>;
export function initialTrail(units:CampaignUnit[]):CampaignTrail{return teamRecord(team=>({arrivedCells:units.filter(u=>u.team===team).map(u=>u.cellId),completedNodes:[],partial:false,walks:[]}));}
/** Older saves recorded influence from outreach, but not the cells traversed. */
export function legacyTrail(g:Campaign):CampaignTrail{return teamRecord(team=>({arrivedCells:[...new Set(g.units.filter(u=>u.team===team).map(u=>u.cellId))],completedNodes:nodes.filter(n=>g.nodeState[n.id].influence[team]>0).map(n=>n.id),partial:true}));}
export function ensureTrail(g:Campaign){return g.trail??=legacyTrail(g);}
export function trailFor(g:Campaign,team:Team=g.playerTeam){return (g.trail??legacyTrail(g))[team];}
export function recordArrival(g:Campaign,team:Team,ids:string[]){const trail=ensureTrail(g)[team];trail.arrivedCells=[...new Set([...trail.arrivedCells,...ids.filter(id=>cells.has(id))])];}
export function recordWalk(g:Campaign,u:CampaignUnit,path:string[],edgeIds?:number[]){recordArrival(g,u.team,path);if(path.length>1){const trail=ensureTrail(g)[u.team];(trail.walks??=[]).push({unitId:u.id,day:g.day,phase:g.phase,cells:[...path],...(edgeIds?{edgeIds:[...edgeIds]}:{})});}}
export function todaysWalks(g:Campaign,unitId:string,team:Team=g.playerTeam){return (trailFor(g,team).walks??[]).filter(w=>w.day===g.day&&w.unitId===unitId);}
export function recordNodeActivity(g:Campaign,team:Team,nodeId:string){const trail=ensureTrail(g)[team];if(nodeById.has(nodeId)&&!trail.completedNodes.includes(nodeId))trail.completedNodes.push(nodeId);}
export function nodeProgress(g:Campaign,nodeId:string,team:Team=g.playerTeam){const trail=trailFor(g,team),n=mapFor(g).nodeById.get(nodeId)!;return {completed:trail.completedNodes.includes(nodeId),arrived:trail.arrivedCells.includes(n.cellId),today:g.nodeState[nodeId].visits[team]};}
export function districtProgress(g:Campaign,districtId:string,team:Team=g.playerTeam){const local=nodes.filter(n=>n.districtId===districtId),done=new Set(trailFor(g,team).completedNodes);return {completed:local.filter(n=>done.has(n.id)).length,total:local.length};}
