import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {initialCampaign,interactionCells} from '../src/game/campaign.ts';
import {mapFor} from '../src/game/campaign-map.ts';
import * as rules from '../src/game/road-movement.ts';

const baseline=process.argv.includes('--baseline');
const policy=rules.roadAPPolicy??{metresPerAP:100,stairs:1,rain:1,streetworks:1};
const g=initialCampaign(1,'blue','streets-v2'),map=mapFor(g),unit=g.units[0];
g.units=[unit];g.surprise=null;unit.ap=14;
const rows=[],timings=[];
for(const district of map.districts)for(const weather of ['clear','rain']){
  unit.cellId=district.anchor;g.news=weather;
  // Same 3,000 effort-metre search bound for each policy; not a real-world time estimate.
  const started=performance.now(),walk=rules.roadMovement(g,unit,3000/policy.metresPerAP);
  timings.push(performance.now()-started);
  for(const node of map.nodes.filter(n=>n.districtId===district.id&&n.cellId!==unit.cellId)){
    const destination=interactionCells(g,node).filter(id=>walk.costs.has(id)).sort((a,b)=>walk.costs.get(a)-walk.costs.get(b)||a.localeCompare(b))[0];
    const route=destination?rules.roadRoute(walk,destination):null;
    rows.push({district:district.id,districtName:district.name['zh-TW'],node:node.id,weather,metres:route?Math.round(route.metres):null,moveAP:route?.cost??null,totalAP:route?route.cost+2:null,canVisit:!!route&&route.cost+2<=14});
  }
}
const median=values=>{const v=values.sort((a,b)=>a-b);return v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;};
const summary={samples:rows.length,canVisit:rows.filter(r=>r.canVisit).length,medianMoveAP:median(rows.filter(r=>r.moveAP!==null).map(r=>r.moveAP)),byWeather:Object.fromEntries(['clear','rain'].map(weather=>{const subset=rows.filter(r=>r.weather===weather);return [weather,{samples:subset.length,canVisit:subset.filter(r=>r.canVisit).length,medianMoveAP:median(subset.filter(r=>r.moveAP!==null).map(r=>r.moveAP))}];})),medianSearchMs:Math.round(median(timings)*100)/100};
const result={date:'2026-11-02',synthetic:true,method:'12 district Wonder anchors to four local activities, clear/rain, one unblocked 14-AP actor, 2 AP reserved for canvassing; 3,000 weighted-metre search bound. Not human win-rate testing.',policy,summary,rows};
if(!baseline){const before=JSON.parse(readFileSync('artifacts/movement-ap-before.json','utf8'));result.before=before.summary;const common=rows.map(row=>({after:row,before:before.rows.find(old=>old.district===row.district&&old.node===row.node&&old.weather===row.weather)})).filter(pair=>pair.before?.moveAP!==null&&pair.after.moveAP!==null);result.comparison={commonRoutes:common.length,increased:common.filter(p=>p.after.moveAP>p.before.moveAP).length,reduced:common.filter(p=>p.after.moveAP<p.before.moveAP).length};}
writeFileSync(`artifacts/movement-ap-${baseline?'before':'after'}.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({policy,summary,comparison:result.comparison}));
