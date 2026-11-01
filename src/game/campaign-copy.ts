import type {Campaign} from './campaign.ts';
import {teamRecord} from './campaign-teams.ts';
/** Timelines and completed walks are append-only. Copy their containers, not immutable history. */
export function copyCampaign(g:Campaign):Campaign{
 const {history,pollHistory,poll,rumor,talkReports,logs,trail,...mutable}=g;
 return {...structuredClone(mutable),history:[...history],pollHistory:[...pollHistory],poll,rumor,logs:[...logs],
 ...(talkReports?{talkReports:[...talkReports]}:{}),
 ...(trail?{trail:teamRecord(team=>{const t=trail[team];return {...t,arrivedCells:[...t.arrivedCells],completedNodes:[...t.completedNodes],...(t.walks?{walks:[...t.walks]}:{})};})}:{}),
 };
}
