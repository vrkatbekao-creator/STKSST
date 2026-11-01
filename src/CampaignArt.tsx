import {publicAsset} from './public-asset.ts';
import type { CommanderId } from './game/campaign-tactics.ts';
import type { Role } from './game/level.ts';
export const portraitPath=(id:CommanderId)=>publicAsset(`art/portraits/${id}-v1.png`);
export function CommanderPortrait({id,className=''}:{id:CommanderId;className?:string}){return <img className={`commander-portrait ${className}`} src={portraitPath(id)} alt="" draggable={false} width="256" height="256"/>;}
// Small symbols stay vector-native so faces and props remain readable at map scale.
export function RoleDrawing({role}:{role:Role}){return <g stroke="#14233d" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
 <path d="M18 88Q19 58 50 58Q81 58 83 88Z" fill={role==='heavy'?'#ffc74f':role==='ranged'?'#72d8e0':'#8cdd90'}/>
 <circle cx="50" cy="38" r="23" fill="#f7cda9"/>
 {role==='heavy'?<><path d="M26 30Q28 5 51 12Q76 8 74 30L65 24L35 26Z" fill="#dad9d1"/><path d="M14 55L44 62L40 92Q15 91 8 73Z" fill="#ffd34e"/><path d="M20 65L31 68L28 82L18 77Z" fill="#f7faff"/></>:role==='ranged'?<><path d="M28 25Q39 7 64 14L76 30L60 25L54 20L44 29Z" fill="#253b5d"/><path d="M25 31Q18 51 29 54M75 31Q82 51 71 54" fill="none" stroke="#727dff" strokeWidth="9"/><path d="M20 65L70 65L77 88L17 88Z" fill="#e6f7ff"/><path d="M36 76L46 72L55 78L64 71" fill="none" stroke="#245ce1"/></>:<><path d="M23 27Q30 6 54 12Q73 14 77 30Z" fill="#8cdd90"/><path d="M42 14L43 3M49 13L60 4" fill="none" stroke="#428a59"/><path d="M12 74L28 61L39 76L26 88Z" fill="#fff7df"/><path d="M22 70L29 75M18 75L25 80" stroke="#db6a41"/></>}
 <path d="M39 36L42 36M58 36L61 36" strokeWidth="5"/><path d="M42 47Q50 54 58 46" fill="none" strokeWidth="3"/>
 </g>;}
export function RolePortrait({role,helper}:{role:Role;helper?:string}){return <svg viewBox="0 0 100 100" aria-hidden="true" className="role-portrait"><RoleDrawing role={role}/>{helper&&<g><circle cx="79" cy="76" r="16" fill="#fff" stroke="#14233d" strokeWidth="3"/><text x="79" y="84" fontSize="24" fill="#245ce1" textAnchor="middle" fontWeight="900">{helper==='medic'?'+':helper==='organizer'?'♪':'↗'}</text></g>}</svg>;}
export function VehicleDrawing({id}:{id:CommanderId}){const ocean=id==='shen',white=id==='huang',body=ocean?'#db6a41':white?'#f7faff':'#245ce1',accent=ocean?'#67cbd0':white?'#b69bea':'#ffd34e';return <g stroke="#14233d" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
 <ellipse cx="82" cy="89" rx="68" ry="5" fill="#14233d" opacity=".15" stroke="none"/>
 <path d={ocean?'M13 51H86L99 37H125L144 60L150 64V80H10Z':'M15 57H41L52 35H101L119 56H146V80H11Z'} fill={body}/>
 <path d={ocean?'M101 42H121L133 58H101Z':'M57 40H97L109 56H49Z'} fill="#bce8f4"/>
 <path d="M18 65H89M18 72H89" stroke={ocean?'#8f4a31':accent} strokeWidth={ocean?'3':'6'}/>
 <path d="M38 51V17L70 23L38 33" fill={accent}/><path d="M75 51V22L96 27L75 36" fill={accent}/>
 <circle cx="38" cy="79" r="14" fill="#14233d"/><circle cx="124" cy="79" r="14" fill="#14233d"/><circle cx="38" cy="79" r="6" fill="#f7faff"/><circle cx="124" cy="79" r="6" fill="#f7faff"/>
 {ocean?<><circle cx="68" cy="51" r="13" fill="#f6d3a1"/><circle cx="68" cy="51" r="7" fill="none"/><path d="M68 34V68M51 51H85M56 39L80 63M56 63L80 39" strokeWidth="2"/></>:<><path d="M104 18L120 14V36L104 30Z" fill={accent}/><path d="M104 25H98V32H104" fill="#f7faff"/></>}
 <path d="M137 64H149" stroke="#ffd34e" strokeWidth="5"/>
 </g>;}
export function CampaignVehicle({id}:{id:CommanderId}){return <svg viewBox="0 0 164 100" aria-hidden="true" className={`campaign-vehicle vehicle-${id}`}><VehicleDrawing id={id}/></svg>;}
