import {manifest,readPackage,readJsonPackage} from '../map-packages.ts';
import type {CampaignNode} from './campaign-map.ts';
export type CityPlaces={version:string;revision:string;routingRevision:string;places:CampaignNode[]};
export type StreetMeta={version:string;radiusMetres:number;revision:string;cells:number[][];anchors:[number,number][];cellLinks:number[][];nodeCells:Record<string,number>;nodeSnaps:Record<string,number>;districtAnchors:Record<string,number>;source:{sourceUrl:string;sourceSha256:string;dataTimestamp:string;licence:string};ways:[number,{'zh-TW':string;en:string},string,string,string,string,string,string,string,boolean][];audit:Record<string,any>};
export function decodeRouting(buffer:ArrayBuffer){
 const header=new DataView(buffer);if(buffer.byteLength<16||header.getUint32(0,true)!==0x31525453)throw Error('routing');
 const nodeCount=header.getUint32(4,true),linkCount=header.getUint32(8,true),pointCount=header.getUint32(12,true);let offset=16;
 function take<T extends Float64ArrayConstructor|Uint32ArrayConstructor|Uint8ArrayConstructor>(Type:T,count:number):InstanceType<T>{offset=Math.ceil(offset/Type.BYTES_PER_ELEMENT)*Type.BYTES_PER_ELEMENT;if(offset+count*Type.BYTES_PER_ELEMENT>buffer.byteLength)throw Error('routing');const result=new Type(buffer,offset,count);offset+=result.byteLength;return result as InstanceType<T>;}
 const xy=take(Float64Array,nodeCount*2),cell=take(Uint32Array,nodeCount),links=take(Uint32Array,linkCount*3),metres=take(Float64Array,linkCount),both=take(Uint8Array,linkCount),pointOffsets=take(Uint32Array,linkCount+1),points=take(Float64Array,pointCount);
 if(offset!==buffer.byteLength||pointOffsets[0]!==0||pointOffsets[linkCount]!==pointCount)throw Error('routing');
 for(let i=0;i<linkCount;i++)if(links[i*3]>=nodeCount||links[i*3+1]>=nodeCount||metres[i]<=0||!Number.isFinite(metres[i])||both[i]>1||pointOffsets[i+1]-pointOffsets[i]<4||(pointOffsets[i+1]-pointOffsets[i])%2)throw Error('routing');
 return {nodeCount,linkCount,xy,cell,links,metres,both,pointOffsets,points};
}
let ready:Promise<{base:typeof import('../data/taipei-map.json');meta:StreetMeta;graph:ReturnType<typeof decodeRouting>;places:CityPlaces}>|undefined;
export function loadStreetRuntime(){
 return ready??=(async()=>{try{const [meta,bytes,base,places]=await Promise.all([readJsonPackage(manifest.meta),readPackage(manifest.core),readJsonPackage(manifest.base),readJsonPackage(manifest.places)]);const m=meta as StreetMeta;if(m.revision!==manifest.revision||m.version!=='taipei-street-hex-v2'||!Array.isArray(m.cells)||!Array.isArray(m.anchors)||!Array.isArray(m.ways))throw Error('routing-meta');const graph=decodeRouting(bytes);if(graph.cell.some(n=>n>=m.cells.length))throw Error('routing-cell');const catalogue=places as CityPlaces;if(catalogue.version!=='taipei-places-v1'||catalogue.routingRevision!==m.revision||!Array.isArray(catalogue.places))throw Error('places');return {places:catalogue,base:base as typeof import('../data/taipei-map.json'),meta:m,graph};}catch(e){ready=undefined;throw e;}})();
}
