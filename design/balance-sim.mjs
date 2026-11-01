import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync} from 'node:fs';import {performance} from 'node:perf_hooks';
import {initialCampaign,chooseCommander,automatedFactionTurn,endCampaignPhase,totals,intelligence} from '../src/game/campaign.ts';
import {career} from '../src/game/campaign-growth.ts';
import {validSession,encodeSave,decodeSave} from '../src/game/campaign-save.ts';
import {mapFor} from '../src/game/campaign-map.ts';
const teams=['blue','green','white'],commanders=['jiang','shen','huang'];
if(!isMainThread){
 for(const job of workerData){const started=performance.now();let g=chooseCommander(initialCampaign(job.seed,job.team,job.profile),job.commander);let maxRoster=3,assists=0,recruits=0,fullReports=0;
  try{for(let day=1;day<=28;day++){
   if(job.phase==='night')g=endCampaignPhase(g);g=automatedFactionTurn(g,g.playerTeam,job.compact?{recruit:false,expertDialogue:true}:{});if(job.phase!=='night')g=endCampaignPhase(g);g=endCampaignPhase(g);
   for(const team of teams){const count=g.units.filter(u=>u.team===team).length;maxRoster=Math.max(maxRoster,count);if(count>7)throw Error('roster exceeded');}
   const key=`${g.playerTeam}1`,s={game:g,selected:key,districtId:mapFor(g).cells.get(g.units.find(u=>u.id===key).cellId).districtId,view:'city'};
   if(!validSession(s))throw Error(`invalid session day ${day}`);
   if(g.day>=15&&!g.result&&('support' in intelligence(g)||intelligence(g).kind!=='rumor'))throw Error('blackout leaked');
   if([7,15,28].includes(day)){const saved=decodeSave(JSON.stringify(encodeSave(s)));if(saved.error||JSON.stringify(saved.save.session)!==JSON.stringify(s))throw Error('save mismatch');}
   assists+=g.logs.filter(l=>l.key==='c_logAction'&&l.values.action==='assist').length;recruits=g.units.length-9;fullReports=g.talkReports?.length??0;
  }
  parentPort.postMessage({...job,result:g.result,scores:totals(g.support),rosters:Object.fromEntries(teams.map(t=>[t,g.units.filter(u=>u.team===t).length])),meanHealth:g.units.reduce((s,u)=>s+career(u).health,0)/g.units.length,meanLevel:g.units.reduce((s,u)=>s+career(u).level,0)/g.units.length,maxRoster,recruits,reportsRetained:fullReports,elapsedMs:Math.round(performance.now()-started),invariants:true});
  }catch(e){parentPort.postMessage({...job,error:String(e),elapsedMs:Math.round(performance.now()-started)});}
 }
}else{
 const baseline=process.argv.includes('--baseline'),night=process.argv.includes('--night'),compact=process.argv.includes('--compact');const name=compact?'balance-compact':night?'balance-night':baseline?'balance-pilot':'balance-final';const jobs=[];
 if(!night&&!compact)for(let seed=1;seed<=(baseline?4:12);seed++)for(const team of teams)for(const commander of commanders)jobs.push({seed:seed*7919,team,commander,profile:'legacy-hex',phase:'day'});
 if(!baseline)for(let seed=1;seed<=(compact?1:2);seed++)for(const team of teams)for(const commander of commanders)jobs.push({seed:seed*1543,team,commander,profile:'streets-v2',phase:night?'night':'day',...(compact?{compact:true}:{})});
 const results=[],start=performance.now();const batches=[jobs.filter((_,i)=>i%2===0),jobs.filter((_,i)=>i%2===1)];
 const save=()=>{const group=key=>Object.fromEntries([...new Set(results.map(r=>r[key]))].map(id=>{const rows=results.filter(r=>r[key]===id&&!r.error);return [id,{games:rows.length,wins:rows.filter(r=>r.result===r.team).length,draws:rows.filter(r=>r.result==='draw').length,meanPlayerScore:rows.length?Math.round(rows.reduce((s,r)=>s+r.scores[r.team],0)/rows.length):0}];}));const report={date:'2026-11-01',synthetic:true,method:'Each player faction uses the same automated decision policy as both rivals. Player acts first; rivals alternate order. Not human playtesting or proof of universal balance.',phase:name,totalPlanned:jobs.length,completed:results.length,elapsedMs:Math.round(performance.now()-start),errors:results.filter(r=>r.error),byFaction:group('team'),byCommander:group('commander'),meanRoster:results.filter(r=>!r.error).length?results.filter(r=>!r.error).reduce((s,r)=>s+Object.values(r.rosters).reduce((a,b)=>a+b,0),0)/(results.filter(r=>!r.error).length*3):0,results};writeFileSync(new URL(`../artifacts/${name}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');return report;};
 await Promise.all(batches.map(batch=>new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:batch});w.on('message',r=>{results.push(r);if(results.length%6===0||r.error){save();console.log(`${name}: ${results.length}/${jobs.length}${r.error?' ERROR '+r.error:''}`);}});w.on('error',reject);w.on('exit',code=>code?reject(Error(`worker exit ${code}`)):resolve());})));
 const report=save();console.log(JSON.stringify({phase:name,completed:report.completed,errors:report.errors.length,byFaction:report.byFaction,byCommander:report.byCommander,meanRoster:report.meanRoster,seconds:report.elapsedMs/1000}));if(report.errors.length)process.exitCode=1;
}
