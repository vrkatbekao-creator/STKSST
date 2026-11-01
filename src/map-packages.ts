import manifest from './data/map-packages.json' with {type:'json'};
export {manifest};
export type PackageEntry={file:string;sha256:string;bytes:number;gzipBytes:number};
export async function readPackage(entry:PackageEntry):Promise<ArrayBuffer>{
 let packed:ArrayBuffer;
 if(typeof window==='undefined'){
  const fs=await import(/* @vite-ignore */ String('node:fs/promises'));
  const bytes:Uint8Array=await fs.readFile(new URL('../public/data/runtime-v1/'+entry.file,import.meta.url));
  packed=bytes.slice().buffer as ArrayBuffer;
 }else{
  const response=await fetch(`${import.meta.env.BASE_URL}data/runtime-v1/${entry.file}`);
  if(!response.ok)throw Error('map-package');
  // Some hosts transparently decompress .gz resources.
  const bytes=await response.arrayBuffer();
  if(response.headers.get('Content-Encoding')==='gzip')return verify(bytes,entry);
  packed=bytes;
 }
 const bytes=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 return verify(bytes,entry);
}
async function verify(bytes:ArrayBuffer,entry:PackageEntry){
 if(bytes.byteLength!==entry.bytes)throw Error('map-package-size');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==entry.sha256)throw Error('map-package-hash');return bytes;
}
export async function readJsonPackage(entry:PackageEntry):Promise<unknown>{return JSON.parse(new TextDecoder().decode(await readPackage(entry)));}
/** Bounded completed LRU; at most two district package requests/decode tasks at once. */
export function packageCache<T>(limit:number,load:(key:string)=>Promise<T>){
 const values=new Map<string,T>(),pending=new Map<string,Promise<T>>();let active=0;const queue:(()=>void)[]=[];
 const slot=()=>new Promise<void>(resolve=>{const start=()=>{active++;resolve();};if(active<2)start();else queue.push(start);});
 return {async get(key:string){if(values.has(key)){const v=values.get(key)!;values.delete(key);values.set(key,v);return v;}let task=pending.get(key);if(!task){task=(async()=>{await slot();try{const v=await load(key);values.set(key,v);while(values.size>limit)values.delete(values.keys().next().value!);return v;}finally{active--;queue.shift()?.();}})();pending.set(key,task);task.finally(()=>pending.delete(key)).catch(()=>{});}return task;},keys:()=>[...values.keys()]};
}
export function viewDistricts(districtId:string,bounds:{x:number;y:number;width:number;height:number}){
 return manifest.districts.filter(d=>d.id===districtId||d.bounds[0]<=bounds.x+bounds.width&&d.bounds[2]>=bounds.x&&d.bounds[1]<=bounds.y+bounds.height&&d.bounds[3]>=bounds.y).map(d=>d.id).sort();
}
