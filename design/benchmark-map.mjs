// CLI resource probe in separate fresh processes, not a browser FPS benchmark.
import {performance} from 'node:perf_hooks';import {writeFileSync,mkdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const mode=process.argv[2],root=new URL('../',import.meta.url);
if(mode==='before'||mode==='after'){
 const start=performance.now();const map=await import(mode==='before'?'../.tools/campaign-map-before.ts':'../src/game/campaign-map.ts');await new Promise(setImmediate);global.gc?.();const memory=process.memoryUsage();console.log(JSON.stringify({milliseconds:performance.now()-start,heapUsed:memory.heapUsed,arrayBuffers:memory.arrayBuffers,rss:memory.rss,edges:map.routingEdges.length,nodes:map.routingNodes.length}));
}else{
 mkdirSync(new URL('.tools/',root),{recursive:true});const baseline=execFileSync('git',['show','ef1b26b:src/game/campaign-map.ts'],{cwd:root,encoding:'utf8'}).replaceAll("'../data/","'../src/data/");writeFileSync(new URL('.tools/campaign-map-before.ts',root),baseline);
 const runs={before:[],after:[]};for(let i=0;i<3;i++)for(const mode of ['before','after'])runs[mode].push(JSON.parse(execFileSync(process.execPath,['--expose-gc',new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),mode],{cwd:root,encoding:'utf8'})));
 const median=(values)=>[...values].sort((a,b)=>a-b)[1];const summary=Object.fromEntries(Object.entries(runs).map(([key,rows])=>[key,Object.fromEntries(['milliseconds','heapUsed','arrayBuffers','rss','edges','nodes'].map(metric=>[metric,Math.round(median(rows.map(r=>r[metric])))]))]));
 const report={date:'2026-11-01',baseline:'ef1b26b',scope:'Three fresh Node CLI processes per implementation, median retained memory after GC, same host. Includes loading/hash/decompression in new path. Not browser peak memory, FPS or cold-start certification.',runs,summary};writeFileSync(new URL('artifacts/map-memory-benchmark.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
