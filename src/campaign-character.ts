import type {Team} from './game/campaign-teams.ts';
import type {Role} from './game/level.ts';
import type {Helper} from './game/campaign-growth.ts';
export const memberKinds=['heavy','ranged','scout','medic','organizer','logistic'] as const;
export type MemberKind=typeof memberKinds[number];
export const memberKind=(role:Role,helper?:Helper):MemberKind=>helper??role;
export const memberIndex=(role:Role,helper?:Helper)=>memberKinds.indexOf(memberKind(role,helper));
export const roleLabel=(team:Team,role:Role,t:(key:string)=>string)=>t(`r_${team}_${role}`);
export const helperLabel=(team:Team,helper:Helper,t:(key:string)=>string)=>t(`r_${team}_${helper}`);
