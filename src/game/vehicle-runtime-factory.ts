/** Build backend runtime from already authenticated graph, connector and metadata bytes. */
import type {Campaign,Team} from './campaign.ts';
import type {VehicleGraphColumns} from './vehicle-graph-format.ts';
import type {VehicleRuntime} from './campaign-vehicle-runtime.ts';
import type {TurnRelation} from './vehicle-turn-policy.ts';
import type {CoverageDistrict} from './vehicle-geometry.ts';
import {vehicleTurnPolicy} from './vehicle-turn-policy.ts';
import {projectVehiclePoint,vehiclePointDistrict,vehicleRouteFragments} from './vehicle-geometry.ts';
import {adapted} from './campaign-events.ts';
import type {VehicleSaveContext} from './campaign-vehicle-save.ts';
import {allCells,routingEdges} from './campaign-map.ts';
import {replayVehicleExposure} from './campaign-vehicle-replay.ts';

const obj=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const id=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>0;

/** SHA must be checked before parsing: schema checks alone do not establish authenticity. */
export function parseVehicleTurnMetadata(value:unknown,sourceSha:string){
 if(!obj(value)||value.format!=='vehicle-graph-prototype-v1'||value.sourceSha256!==sourceSha||
  !Array.isArray(value.turnRestrictions)||value.turnRestrictions.length>100000||!obj(value.viaNodesByWay))throw Error('Invalid vehicle metadata');
 const relations:TurnRelation[]=[];
 for(const r of value.turnRestrictions){if(!obj(r)||!id(r.id)||!obj(r.tags)||!Array.isArray(r.members)||r.members.length>100||
   Object.keys(r.tags).length>100||!Object.values(r.tags).every(x=>typeof x==='string'&&x.length<=2000)||
   !r.members.every((m:unknown)=>obj(m)&&['n','w','r'].includes(m.type)&&id(m.ref)&&typeof m.role==='string'&&m.role.length<=2000))throw Error('Invalid vehicle restriction');
  relations.push({tags:r.tags,members:r.members});}
 const viaNodes=new Map<bigint,ReadonlySet<bigint>>();
 for(const [key,nodes] of Object.entries(value.viaNodesByWay)){
  if(!/^\d+$/.test(key)||!Number.isSafeInteger(Number(key))||Number(key)<=0||!Array.isArray(nodes)||nodes.length>100000||!nodes.every(id))throw Error('Invalid vehicle via nodes');
  viaNodes.set(BigInt(key),new Set(nodes.map(BigInt)));
 }
 return {relations,viaNodes};
}

/** Construction follows the existing walking policy's destination-node district approximation. */
export function createVehicleRuntime(revision:string,graph:VehicleGraphColumns,connectors:ReadonlyMap<number,readonly number[]>,
 turns:ReturnType<typeof parseVehicleTurnMetadata>,districts:readonly CoverageDistrict[]):VehicleRuntime{
 if(!/^[a-f0-9]{64}$/.test(revision))throw Error('Invalid vehicle revision');
 const allowTurn=vehicleTurnPolicy(turns.relations,turns.viaNodes),pointDistrict=new Map<number,string|null>();
 const districtAt=(node:number)=>{if(!pointDistrict.has(node))pointDistrict.set(node,vehiclePointDistrict(projectVehiclePoint(graph.longitudes[node],graph.latitudes[node]),districts));return pointDistrict.get(node)??null;};
 return {revision,contextFor:(game:Campaign,team:Team)=>{
  const roadConditions={rain:game.news==='rain',worksDistrict:game.surprise?.id==='streetworks'&&!adapted(game.surprise,team)?game.surprise.districtId:null};
  return {graph,connectors,allowTurn,roadConditions,edgeWeightQuarters:(edge:number)=>
   4+Number(roadConditions.rain)+(roadConditions.worksDistrict!==null&&districtAt(graph.targets[edge])===roadConditions.worksDistrict?2:0)};
 },fragmentsForRoute:(_game,_team,plan)=>vehicleRouteFragments(graph,plan,districts)};
}

/** The same authenticated graph and turn policy must be used for execution and save replay. */
export function createVehicleSaveContext(runtime:VehicleRuntime,graph:VehicleGraphColumns,
 connectors:ReadonlyMap<number,readonly number[]>,districts:readonly CoverageDistrict[]):VehicleSaveContext{
 const cellRoadNode=new Map([...allCells.values()].filter(c=>c.roadNode!==undefined).map(c=>[c.id,c.roadNode!]));
 return {revision:runtime.revision,journalContext:(game,team)=>({revision:runtime.revision,day:game.day,phase:game.phase,team,
  unitIds:game.units.filter(u=>u.team===team).map(u=>u.id),graph,walkingEdges:routingEdges,cellRoadNode,connectors,
  allowTurn:runtime.contextFor(game,team).allowTurn}),verifyExposure:(game,team,state)=>replayVehicleExposure(game,team,state,graph,districts)};
}
