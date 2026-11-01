import type { Campaign } from './game/campaign.ts';
import type { CommanderId } from './game/campaign-tactics.ts';
import type { Team } from './game/campaign-teams.ts';
import type { Role } from './game/level.ts';
export type SceneKind='street'|'stage'|'departure'|'skill';
export type MediaEvent={kind:SceneKind;commander:CommanderId;team:Team;action:string;cue:string;actorRole?:Role};
export type MediaSession={game:Campaign;started:boolean};
// Presentation observes committed commands. It never changes the game or reads support.
export function mediaEvent(previous:MediaSession,next:MediaSession):MediaEvent|null{
 const a=previous.game,b=next.game;
 if(!previous.started||!next.started||a===b||a.day!==b.day||a.phase!==b.phase||b.actions<=a.actions||b.result)return null;
 const log=b.logs[0];if(log?.key!=='c_logAction'||log.values.team!==b.playerTeam)return null;
 const unit=b.units.find(u=>u.id===log.values.unit);if(!unit)return null;
 const action=String(log.values.action),commander=b.commanders[unit.team];
 const base={commander,team:unit.team,action,...(unit.id!==`${unit.team}1`?{actorRole:unit.role}:{})};
 if(['move','transport'].includes(action)&&unit.id===`${unit.team}1`)return {...base,kind:'departure',cue:'departure'};
 if(['canvass','visit','forum','livestream','culture','environment'].includes(action))return {...base,kind:'street',cue:'street'};
 if(['stageEvent','event'].includes(action))return {...base,kind:'stage',cue:`theme-${unit.team}`};
 if(['skill','rally','broadcast','backstab','brace','respond'].includes(action))return {...base,kind:'skill',cue:action==='skill'?`skill-${commander}`:action==='backstab'?'slash':action==='broadcast'?'signal':'shield'};
 return null;
}
export const previewEvent=(kind:SceneKind,commander:CommanderId,team:Team):MediaEvent=>({kind,commander,team,action:kind==='departure'?'transport':kind==='street'?'canvass':kind==='stage'?'stageEvent':'skill',cue:kind==='stage'?`theme-${team}`:kind==='skill'?`skill-${commander}`:kind});
