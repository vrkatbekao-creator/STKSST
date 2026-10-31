export type EventId = 'volunteers' | 'rain' | 'spotlight';
export type FieldEvent = { id: EventId; day: number };
export const eventIds: EventId[] = ['volunteers', 'rain', 'spotlight'];
// The complete RNG state stays in Game, so a seed reproduces event draws.
export function drawEvent(seed: number, day: number): { event: FieldEvent; seed: number } {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { event: { id: eventIds[next % eventIds.length], day }, seed: next };
}
