import { teamRecord } from './campaign-teams.ts';
import type { Team } from './campaign-teams.ts';
export const surpriseIds=['heatwave','rumorstorm','streetworks','nightfair','donation','powercut'] as const;
export type SurpriseId=typeof surpriseIds[number];
export type Surprise={id:SurpriseId;districtId:string;responses:Record<Team,'adapt'|'mobilize'|null>};
export function nextSeed(seed:number){return (Math.imul(seed,1664525)+1013904223)>>>0;}
export function drawSurprise(seed:number,day:number,districtIds:string[]):{seed:number;surprise:Surprise|null}{
 if(day%2===0)return {seed,surprise:null};
 const a=nextSeed(seed),b=nextSeed(a);
 return {seed:b,surprise:{id:surpriseIds[(a>>>12)%surpriseIds.length],districtId:districtIds[(b>>>12)%districtIds.length],responses:teamRecord(()=>null)}};
}
export function adapted(s:Surprise|null,team:Team){return s?.responses[team]==='adapt';}
