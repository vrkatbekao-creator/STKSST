/** Pure preview adapter; the gameplay command and persistence are not wired yet. */
import type {Campaign,CampaignUnit} from './campaign.ts';
import type {VehicleGraphColumns} from './vehicle-graph-format.ts';
import type {VehicleMode} from './vehicle-cost.ts';
import type {VehicleTeamLedger} from './vehicle-ledger.ts';
import {validVehicleLedger} from './vehicle-ledger.ts';
import {campaignBoardingRoutes} from './campaign-vehicle-boarding.ts';
import {planVehicleLeg} from './vehicle-leg-planner.ts';
import type {VehicleLegOptions,VehicleLegPlan} from './vehicle-leg-planner.ts';
import type {VehicleRoadConditions} from './vehicle-leg-planner.ts';

export type VehiclePlanContext={graph:VehicleGraphColumns;connectors:ReadonlyMap<number,readonly number[]>;
 allowTurn:(incoming:bigint,node:bigint,outgoing:bigint)=>boolean;edgeWeightQuarters:(edge:number)=>number;
 roadConditions?:VehicleRoadConditions;planLeg?:(options:VehicleLegOptions)=>VehicleLegPlan|null};

/** Context must already be SHA/revision validated. Does not alter game or ledger. */
export function previewCampaignVehicleLeg(g:Campaign,u:CampaignUnit,destinationCell:string,mode:VehicleMode,
 ledger:VehicleTeamLedger,context:VehiclePlanContext,reserve={ap:0,materials:0}){
 const actor=g.units.find(v=>v.id===u.id&&v.team===u.team);
 if(!actor||!['drive','motorcade'].includes(mode)||g.result||g.talk||g.movementProfile!=='streets-v2'||
  !validVehicleLedger(ledger,g.day,actor.team,g.units.filter(v=>v.team===actor.team).map(v=>v.id))||
  !Number.isSafeInteger(reserve.ap)||reserve.ap<0||!Number.isSafeInteger(reserve.materials)||reserve.materials<0)return null;
 if(g.resources[actor.team].materials<reserve.materials)return null;
 const origins=campaignBoardingRoutes(g,actor,actor.cellId,context.connectors,'toVehicle');
 const destinations=campaignBoardingRoutes(g,actor,destinationCell,context.connectors,'fromVehicle');
 if(!origins.length||!destinations.length)return null;
 const unit=ledger.units[actor.id]??{drive:0,motorcade:0};
 const options:VehicleLegOptions={sharedWalk:g.apRules==='golden-week',previousWalkedEffort:actor.walkedEffort??0,previousWalkCredit:actor.walkCredit??0,mode,origins,destinations,ap:actor.ap,
  materials:g.resources[actor.team].materials-reserve.materials,reservedAp:reserve.ap,
  previousWeightedQuarterMetres:unit[mode],previousTeamQuarterMetres:ledger.actualQuarterMetres,
  allowTurn:context.allowTurn,edgeWeightQuarters:context.edgeWeightQuarters,roadConditions:context.roadConditions};
 return context.planLeg?context.planLeg(options):planVehicleLeg(context.graph,options);
}
