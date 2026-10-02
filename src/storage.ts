import type { DailyGameData, PlayerStats, AppSettings } from './types';
import { getTodayDateStr } from './prng';

const STORAGE_KEYS = {
  DAILY_PREFIX: 'stalindle_daily_',
  STATS: 'stalindle_stats',
  SETTINGS: 'stalindle_settings',
  PLAYER_ID: 'stalindle_player_id',
};

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
  if (!id) {
    id = 'comrade_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(STORAGE_KEYS.PLAYER_ID, id);
  }
  return id;
}

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // ignore
    }
  }
  return {
    soundEnabled: true,
  };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadTodayGame(dateStr: string = getTodayDateStr()): DailyGameData | null {
  const raw = localStorage.getItem(STORAGE_KEYS.DAILY_PREFIX + dateStr);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export function saveDailyGame(game: DailyGameData) {
  localStorage.setItem(STORAGE_KEYS.DAILY_PREFIX + game.dateStr, JSON.stringify(game));
  if (game.completed) {
    updateStatsWithGame(game);
  }
}

export function loadStats(): PlayerStats {
  const raw = localStorage.getItem(STORAGE_KEYS.STATS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return {
    gamesPlayed: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: '',
    bestSurvivors: 0,
    worstSurvivors: 999999,
    totalSurvivorsAllTime: 0,
    rankHistory: {},
    scoreDistribution: [0, 0, 0, 0, 0, 0, 0],
  };
}

function updateStatsWithGame(game: DailyGameData) {
  const stats = loadStats();
  const today = game.dateStr;

  // Don't double-record the exact same day in statistics
  if (stats.lastPlayedDate === today) {
    return;
  }

  if (stats.lastPlayedDate) {
    const lastDate = new Date(stats.lastPlayedDate);
    const currentDate = new Date(today);
    const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      stats.currentStreak += 1;
    } else if (diffDays > 1) {
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
  }

  if (stats.currentStreak > stats.maxStreak) {
    stats.maxStreak = stats.currentStreak;
  }

  stats.gamesPlayed += 1;
  stats.lastPlayedDate = today;
  stats.bestSurvivors = Math.max(stats.bestSurvivors, game.totalSurvivors);
  if (game.totalSurvivors < stats.worstSurvivors) {
    stats.worstSurvivors = game.totalSurvivors;
  }
  stats.totalSurvivorsAllTime += game.totalSurvivors;

  const rankId = game.rank.id;
  stats.rankHistory[rankId] = (stats.rankHistory[rankId] || 0) + 1;

  // Distribution buckets: < 7, 7-10, 11-15, 16-22, 23-32, 33-44, 45+
  const buckets = [7, 11, 16, 23, 33, 45, Infinity];
  for (let i = 0; i < buckets.length; i++) {
    if (game.totalSurvivors < buckets[i]) {
      stats.scoreDistribution[i] = (stats.scoreDistribution[i] || 0) + 1;
      break;
    }
  }

  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}
