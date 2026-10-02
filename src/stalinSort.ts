import type { TierId, TierResult } from './types';

export interface StalinSortSimulation {
  tierId: TierId;
  size: number;
  initialArray: number[];
  keptIndices: boolean[];
  survivorsCount: number;
  purgedCount: number;
  firstElement: number;
  maxPossible: number;
  highestKept: number;
  runningMaxAt: number[]; // Running max value at each index
}

export function runStalinSortSimulation(tierId: TierId, array: number[]): StalinSortSimulation {
  const size = array.length;
  const keptIndices = new Array<boolean>(size).fill(false);
  const runningMaxAt = new Array<number>(size);

  let survivorsCount = 0;
  let purgedCount = 0;
  let runningMax = -Infinity;
  let maxPossible = -Infinity;

  for (let i = 0; i < size; i++) {
    const val = array[i];
    if (val > maxPossible) {
      maxPossible = val;
    }

    if (i === 0) {
      // First element is always kept in standard Stalin Sort
      keptIndices[i] = true;
      runningMax = val;
      survivorsCount++;
    } else {
      if (val >= runningMax) {
        keptIndices[i] = true;
        runningMax = val;
        survivorsCount++;
      } else {
        keptIndices[i] = false;
        purgedCount++;
      }
    }
    runningMaxAt[i] = runningMax;
  }

  return {
    tierId,
    size,
    initialArray: array,
    keptIndices,
    survivorsCount,
    purgedCount,
    firstElement: array[0] || 0,
    maxPossible,
    highestKept: runningMax,
    runningMaxAt,
  };
}

export function toTierResult(sim: StalinSortSimulation, durationMs: number): TierResult {
  const rate = sim.size > 0 ? (sim.survivorsCount / sim.size) * 100 : 0;
  return {
    tierId: sim.tierId,
    size: sim.size,
    survivors: sim.survivorsCount,
    purged: sim.purgedCount,
    survivalRate: Number(rate.toFixed(2)),
    firstElement: sim.firstElement,
    maxElement: sim.maxPossible,
    highestKept: sim.highestKept,
    durationMs,
    initialArray: sim.initialArray,
    keptIndices: sim.keptIndices,
  };
}
