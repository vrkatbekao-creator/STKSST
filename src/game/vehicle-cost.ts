/** v0.18 vehicle cost primitives. Not connected to campaign commands yet. */
export type VehicleMode = 'drive' | 'motorcade';
export const vehicleCostPolicy = Object.freeze({
  quarterMetresPerDriveAP: 8_000 * 4,
  quarterMetresPerMotorcadeAP: 4_000 * 4,
  boardingEffortMetresPerAP: 1800,
  curbsideMetres: 300,
  quarterMetresPerSupply: 20_000 * 4,
  motorcadeAPPerStrain: 4,
});

/** Local connections share the daily walking pool; curbside hops under 300m cost 0 AP once daily allowance is active. */
export function vehicleBoardingAP(effort:number,hasMovement:boolean,previousWalked=0,walkCredit=0){
 if(!Number.isFinite(effort)||effort<0||(!hasMovement&&effort!==0))throw new RangeError('Invalid boarding effort');
 if(!hasMovement)return 0;
 if(effort<vehicleCostPolicy.curbsideMetres&&(previousWalked>0||walkCredit>0))return 0;
 const covered=Math.max(previousWalked,walkCredit);
 if(previousWalked+effort<=covered+1e-6)return 0;
 return Math.max(1,Math.ceil((previousWalked+effort-covered-1e-6)/vehicleCostPolicy.boardingEffortMetresPerAP));
}

export function boardingWalkCharge(effort:number,hasMovement:boolean,walked=0,credit=0,shared=true){
 if(!shared)return {ap:vehicleBoardingAP(effort,hasMovement),walked:0,credit:0,curbside:false};
 const ap=vehicleBoardingAP(effort,hasMovement,walked,credit);
 if(!hasMovement||(effort<vehicleCostPolicy.curbsideMetres&&(walked>0||credit>0))){
  return {ap:0,walked,credit,curbside:hasMovement};
 }
 return {ap,walked:walked+effort,credit:Math.max(walked,credit)+ap*vehicleCostPolicy.boardingEffortMetresPerAP,curbside:false};
}

/** Calculate the incremental cost of a prepaid allowance, without floats. */
export function incrementalAllowance(previous: number, added: number, allowance: number): number {
  if (![previous, added, allowance].every(Number.isSafeInteger) || previous < 0 || added < 0 || allowance <= 0 || !Number.isSafeInteger(previous + added)) {
    throw new RangeError('Invalid vehicle allowance');
  }
  const divisor = BigInt(allowance);
  const ceiling = (value: number) => (BigInt(value) + divisor - 1n) / divisor;
  return Number(ceiling(previous + added) - ceiling(previous));
}

export function quoteVehicleCost(input: {
  mode: VehicleMode;
  previousWeightedQuarterMetres: number;
  addedWeightedQuarterMetres: number;
  previousTeamQuarterMetres: number;
  addedTeamQuarterMetres: number;
}): { ap: number; supplies: number; fatigue: number; health: number } {
  if (input.mode !== 'drive' && input.mode !== 'motorcade') throw new RangeError('Invalid vehicle mode');
  const limit = input.mode === 'drive' ? vehicleCostPolicy.quarterMetresPerDriveAP : vehicleCostPolicy.quarterMetresPerMotorcadeAP;
  const ap = incrementalAllowance(input.previousWeightedQuarterMetres, input.addedWeightedQuarterMetres, limit);
  const supplies = incrementalAllowance(input.previousTeamQuarterMetres, input.addedTeamQuarterMetres, vehicleCostPolicy.quarterMetresPerSupply);
  const priorAp = incrementalAllowance(0, input.previousWeightedQuarterMetres, limit);
  const strain = input.mode === 'motorcade' ? incrementalAllowance(priorAp, ap, vehicleCostPolicy.motorcadeAPPerStrain) : 0;
  return { ap, supplies, fatigue: strain, health: strain };
}
