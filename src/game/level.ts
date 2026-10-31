export type Team = 'blue' | 'green';
export type Role = 'heavy' | 'ranged' | 'scout';
export type Position = { x: number; y: number };
export type Unit = Position & { id: string; team: Team; role: Role; hp: number; maxHp: number; ap: number; maxAp: number; damage: number; range: number; attackCost: number; guardedUntil?: number };
export const level = {
  id: 'city_hall', nameKey: 'stageName', width: 10, height: 7, maxDays: 28,
  winCondition: 'rout_enemy',
  obstacles: [{x:3,y:0},{x:3,y:1},{x:6,y:1},{x:4,y:3},{x:5,y:3},{x:3,y:5},{x:6,y:5},{x:6,y:6}],
};
function unit(id: string, team: Team, role: Role, x: number, y: number): Unit {
  const stats = role === 'heavy' ? { maxHp:120, maxAp:5, damage:40, range:1 } : role === 'ranged' ? { maxHp:80, maxAp:5, damage:30, range:3 } : { maxHp:90, maxAp:7, damage:35, range:1 };
  return { id, team, role, x, y, ...stats, hp:stats.maxHp, ap:stats.maxAp, attackCost:2 };
}
export function startingUnits(): Unit[] {
  return [unit('b1','blue','heavy',1,2),unit('b2','blue','ranged',0,3),unit('b3','blue','scout',1,4),unit('g1','green','heavy',8,2),unit('g2','green','ranged',9,3),unit('g3','green','scout',8,4)];
}
