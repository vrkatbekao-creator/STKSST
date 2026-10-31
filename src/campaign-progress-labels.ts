import type { nodeProgress } from './game/campaign-progress.ts';
export function progressKey(status:ReturnType<typeof nodeProgress>){return status.today>=2?'c_progressCapped':status.today?'c_progressToday':status.completed?'c_progressPast':status.arrived?'c_progressArrived':'c_progressNone';}
