// Fast seeded Pseudo-Random Number Generator (Mulberry32)
export function createPRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple string hash to 32-bit integer
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash) || 1337;
}

// Reference epoch: 2026-09-01 (Day 1)
const EPOCH_DATE = new Date('2026-09-01T00:00:00Z').getTime();

export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayNumber(dateStr?: string): number {
  const targetDate = dateStr ? new Date(`${dateStr}T00:00:00Z`).getTime() : Date.now();
  const diffMs = targetDate - EPOCH_DATE;
  const dayNum = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  return dayNum;
}

export function getTimeUntilNextDaily(): { hours: number; minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const formatted = [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');

  return { hours, minutes, seconds, formatted };
}

// Generate an array of size N
// Uses random shuffle of 1..N or random uniform values with a chance of duplicates
export function generateStalinArray(size: number, rng: () => number): number[] {
  const arr = new Array<number>(size);
  // Using uniform integers from 1 to size
  // This allows occasional duplicate values and natural distribution
  for (let i = 0; i < size; i++) {
    arr[i] = Math.floor(rng() * size) + 1;
  }
  return arr;
}
