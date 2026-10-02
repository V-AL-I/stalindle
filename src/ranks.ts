import type { RankInfo } from './types';

export const RANKS: RankInfo[] = [
  {
    id: 'supreme',
    title: 'GENERALISSIMO SUPREME',
    russianTitle: 'ГЕНЕРАЛИССИМУС',
    medal: '🎖️🌟🎖️',
    stars: 5,
    badgeColor: '#ffd166',
    description: 'Astronomical fortune! The laws of probability bend to your iron will. The Politburo is speechless.',
    quote: '"Gratitude of the Motherland is eternal. Even statistics salute you!"',
    minSurvivors: 45,
  },
  {
    id: 'marshal',
    title: 'MARSHAL OF THE RED ARMY',
    russianTitle: 'МАРШАЛ СОВЕТСКОГО СОЮЗА',
    medal: '🎖️⚔️',
    stars: 4,
    badgeColor: '#ffb703',
    description: 'Legendary fortitude! A massive cadre of comrades survived the purge unscathed.',
    quote: '"Not one step back! Your ranks stand proud and unblemished before history."',
    minSurvivors: 33,
  },
  {
    id: 'hero',
    title: 'HERO OF SOCIALIST LABOUR',
    russianTitle: 'ГЕРОЙ ТРУДА',
    medal: '🏅⭐',
    stars: 4,
    badgeColor: '#06d6a0',
    description: 'Remarkable discipline! Far more soldiers endured than bourgeois mathematics predicted.',
    quote: '"Discipline and faith in the collective yield unprecedented preservation."',
    minSurvivors: 23,
  },
  {
    id: 'red_star',
    title: 'ORDER OF THE RED STAR',
    russianTitle: 'ОРДЕН КРАСНОЙ ЗВЕЗДЫ',
    medal: '⭐',
    stars: 3,
    badgeColor: '#e63946',
    description: 'Commendable bravery. A solid core of comrades demonstrated unwavering alignment.',
    quote: '"A disciplined vanguard is all that is required for final victory."',
    minSurvivors: 16,
  },
  {
    id: 'proletariat',
    title: 'LOYAL PROLETARIAT',
    russianTitle: 'ВЕРНЫЙ ПРОЛЕТАРИЙ',
    medal: '🔨🌾',
    stars: 2,
    badgeColor: '#4cc9f0',
    description: 'Standard party compliance. Sacrifices were made in the name of algorithmic purity.',
    quote: '"Order is restored. The survivors march onward in non-decreasing harmony."',
    minSurvivors: 11,
  },
  {
    id: 'quarry',
    title: 'GULAG QUARRY WORKER',
    russianTitle: 'ТРУДОВАЯ КОЛОНИЯ',
    medal: '⛏️',
    stars: 1,
    badgeColor: '#adb5bd',
    description: 'Unfortunate sorting disaster. An early arrogant giant ruined the collective.',
    quote: '"A harsh winter in Siberia awaits those who could not keep in line."',
    minSurvivors: 7,
  },
  {
    id: 'saboteur',
    title: 'SABOTEUR OF THE STATE',
    russianTitle: 'ВРАГ НАРОДА',
    medal: '🚫',
    stars: 0,
    badgeColor: '#ef233c',
    description: 'Catastrophic purge! Element #1 or #2 was a colossal titan that executed virtually everyone.',
    quote: '"An absolute massacre. Counter-revolutionary elements have devastated the squad."',
    minSurvivors: 0,
  },
];

export function getRankForSurvivors(totalSurvivors: number): RankInfo {
  for (const rank of RANKS) {
    if (totalSurvivors >= rank.minSurvivors) {
      return rank;
    }
  }
  return RANKS[RANKS.length - 1];
}
