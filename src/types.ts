export type TierId = 'squad' | 'platoon' | 'company';

export interface TierConfig {
  id: TierId;
  name: string;
  russianName: string;
  size: number;
  icon: string;
  color: string;
  description: string;
  stepDelayMs: number; // Deliberate pace
}

export interface TierResult {
  tierId: TierId;
  size: number;
  survivors: number;
  purged: number;
  survivalRate: number; // 0 to 100
  firstElement: number;
  maxElement: number;
  highestKept: number;
  durationMs: number;
  initialArray: number[];
  keptIndices: boolean[];
}

export interface RankInfo {
  id: string;
  title: string;
  russianTitle: string;
  medal: string;
  stars: number;
  badgeColor: string;
  description: string;
  quote: string;
  minSurvivors: number;
}

export interface DailyGameData {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  completed: boolean;
  tierResults: TierResult[];
  totalSurvivors: number;
  totalPurged: number;
  totalElements: number;
  totalSurvivalRate: number;
  rank: RankInfo;
  completedAt: number;
  seed: number;
  initialArrays: Record<TierId, number[]>;
}

export interface PlayerStats {
  gamesPlayed: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  bestSurvivors: number;
  worstSurvivors: number;
  totalSurvivorsAllTime: number;
  rankHistory: Record<string, number>;
  scoreDistribution: number[];
}

export interface AppSettings {
  soundEnabled: boolean;
}
