import { useEffect,useState } from 'react';
const cache=new Map<string,Promise<unknown>>();
export function useGeoData<T>(file:string,decode:(v:unknown)=>T){
 const [state,setState]=useState<{data:T|null;error:boolean}>({data:null,error:false}),[attempt,retry]=useState(0);
 useEffect(()=>{let alive=true;let request=cache.get(file);if(!request){request=fetch(`${import.meta.env.BASE_URL}data/${file}`).then(async response=>{if(!response.ok||!response.body)throw Error('geo');const text=response.headers.get('Content-Encoding')==='gzip'?await response.text():await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();return decode(JSON.parse(text));});cache.set(file,request);}request.then(data=>{if(alive)setState({data:data as T,error:false});}).catch(()=>{cache.delete(file);if(alive)setState({data:null,error:true});});return()=>{alive=false;};},[file,decode,attempt]);
 return {...state,retry:()=>{setState({data:null,error:false});retry(n=>n+1);}};
}
