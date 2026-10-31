import { useEffect,useState } from 'react';
import { validRoadData } from './road-map.ts';
import type { RoadData } from './road-map.ts';
let cached:Promise<RoadData>|undefined;
async function readRoads(){
 const response=await fetch(`${import.meta.env.BASE_URL}data/taipei-roads-v1.json.gz`);
 if(!response.ok||!response.body)throw Error('roads');
 const text=response.headers.get('Content-Encoding')==='gzip'?await response.text():await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
 const data:unknown=JSON.parse(text);if(!validRoadData(data))throw Error('roads');return data;
}
export function useRoadMap(){
 const [state,setState]=useState<{data:RoadData|null;error:boolean}>({data:null,error:false}),[attempt,retry]=useState(0);
 useEffect(()=>{let mounted=true;(cached??=readRoads()).then(data=>{if(mounted)setState({data,error:false});}).catch(()=>{cached=undefined;if(mounted)setState({data:null,error:true});});return()=>{mounted=false;};},[attempt]);
 return {...state,retry:()=>{setState({data:null,error:false});retry(n=>n+1);}};
}
