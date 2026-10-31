export const teams=['blue','green','white'] as const;
export type Team=typeof teams[number];
export function teamRecord<T>(make:(team:Team)=>T):Record<Team,T>{return Object.fromEntries(teams.map(team=>[team,make(team)])) as Record<Team,T>;}
export const teamHomes:Record<Team,string>={blue:'6300500',green:'6301000',white:'6300400'};
export const defaultCommanders={blue:'jiang',green:'shen',white:'huang'} as const;
export function campaignOutcome(scores:Record<Team,number>):Team|'draw'{const ordered=[...teams].sort((a,b)=>scores[b]-scores[a]);return scores[ordered[0]]===scores[ordered[1]]?'draw':ordered[0];}
