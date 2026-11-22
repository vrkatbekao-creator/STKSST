/** Adapter for real walking graph and campaign occupancy; not yet a playable command. */
import type {Campaign,CampaignUnit} from './campaign.ts';
import {routingEdgeCells,mapFor,routingNodes,routingEdges,routingOutgoing,routingIncoming} from './campaign-map.ts';
import {unitAvailable,unitGuarded} from './campaign-tactics.ts';
import {roadEffort} from './road-movement.ts';
import {boardingRoutes} from './vehicle-boarding.ts';

/** Caller must authenticate connector revision and validate that vehicle indexes are in range. */
export function campaignBoardingRoutes(g:Campaign,u:CampaignUnit,cellId:string,
  connectors:ReadonlyMap<number,readonly number[]>,direction:'toVehicle'|'fromVehicle'){
 const actor=g.units.find(v=>v.id===u.id&&v.team===u.team);
 if(g.result||g.talk||g.movementProfile!=='streets-v2'||!actor||!unitAvailable(g,actor)||unitGuarded(g,actor)||actor.bracedUntil>=g.day)return [];
 if(direction==='toVehicle'&&cellId!==actor.cellId)return [];
 const start=mapFor(g).cells.get(cellId)?.roadNode;if(start===undefined)return [];
 const occupied=new Set(g.units.filter(v=>v.id!==actor.id&&unitAvailable(g,v)).map(v=>v.cellId));
 if(occupied.has(cellId))return [];
 return boardingRoutes({start,nodeCount:routingNodes.length,edges:routingEdges,outgoing:routingOutgoing,incoming:routingIncoming,
  connectors,direction,maxMetres:600,blocked:e=>routingEdgeCells(g,routingEdges[e.id]).some(id=>occupied.has(id)),
  edgeEffort:e=>roadEffort(g,e.id,actor.team)});
}
