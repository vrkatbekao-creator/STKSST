import {publicAsset} from './public-asset.ts';
import {memberIndex,memberKinds,roleLabel,helperLabel} from './campaign-character.ts';
import {helperRole} from './game/campaign-growth.ts';
import type {Helper} from './game/campaign-growth.ts';
import type {Team} from './game/campaign-teams.ts';
import type {Role} from './game/level.ts';
import type {ContactId} from './game/campaign-contacts.ts';
import {useTranslation} from 'react-i18next';
import {useState,useId} from 'react';
export function MemberPortrait({role,helper,team,full=false,map=false}:{role:Role;helper?:Helper;team:Team;full?:boolean;map?:boolean}){
 const clip=useId(),index=memberIndex(role,helper),cellX=index%3*100,y=Math.floor(index/3)*200;
 // Blue medic bag and organiser megaphone cross rectangular UV bounds at different heights.
 const x=team==='blue'&&index===4?95:cellX,w=team==='blue'&&index===3?112:team==='blue'&&index===4?105:100;
 const outline=team==='blue'&&index===3?'0,200 95,200 95,300 112,300 112,400 0,400':team==='blue'&&index===4?'95,200 200,200 200,400 112,400 112,300 95,300':null;
 return <svg className={`role-portrait member-portrait ${full?'member-full':'member-bust'}`} viewBox={`${x} ${y+(full?0:18)} ${w} ${full?200:w}`} width={map?140:'100%'} height={map?140:'100%'} x={map?-70:undefined} y={map?-76:undefined} aria-hidden="true" focusable="false" overflow="hidden" data-member-art={`${team}-${helper??role}`}><defs><clipPath id={clip}>{outline?<polygon points={outline}/>:<rect x={x} y={y} width={w} height="200"/>}</clipPath></defs><image clipPath={`url(#${clip})`} href={publicAsset(`art/members/${team}-v1.png`)} x="0" y="0" width="300" height="400" preserveAspectRatio="none"/></svg>;
}
export function ContactPortrait({id}:{id:ContactId}){const clip=useId(),x=['red','merchant','observer'].indexOf(id)*100;return <svg className="contact-portrait" viewBox={`${x} 0 100 200`} aria-hidden="true" focusable="false" overflow="hidden"><defs><clipPath id={clip}><rect x={x} y="0" width="100" height="200"/></clipPath></defs><image clipPath={`url(#${clip})`} href={publicAsset('art/members/visitors-v1.png')} width="300" height="200" preserveAspectRatio="none"/></svg>;}
export function MemberGallery(){const {t}=useTranslation();const [team,setTeam]=useState<Team>('blue');return <details className="member-gallery"><summary>{t('r_gallery')}</summary><div className="member-factions" role="group" aria-label={t('r_galleryFaction')}>{(['blue','green','white'] as const).map(id=><button key={id} className="outline-button" aria-pressed={team===id} onClick={()=>setTeam(id)}>{t(id)}</button>)}</div><div className="member-gallery-grid">{memberKinds.map(kind=>{const helper=kind==='medic'||kind==='organizer'||kind==='logistic'?kind:undefined,role=helper?helperRole[helper]:kind as Role;return <article key={kind}><MemberPortrait role={role} helper={helper} team={team} full/><strong>{helper?helperLabel(team,helper,t):roleLabel(team,role,t)}</strong><small>{t(helper?`g_helper_${helper}`:`c_role_${role}`)}</small></article>;})}</div></details>;}
