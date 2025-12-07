export enum IPLTeam {
  CSK = 'CSK',
  MI = 'MI',
  RCB = 'RCB',
  KKR = 'KKR',
  SRH = 'SRH',
  RR = 'RR',
  DC = 'DC',
  PBKS = 'PBKS',
  LSG = 'LSG',
  GT = 'GT',
}

export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper' | 'Unknown';

export interface MatchPerformance {
  opponent: string;
  date?: string;
  performance: string; // e.g. "45(23) & 1/24"
}

export interface DetailedStats {
  // Meta
  matches: number;
  lastUpdated: string;
  
  // Batting
  innings?: number;
  runs?: number;
  ballsFaced?: number;
  battingAverage?: number;
  battingStrikeRate?: number;
  highestScore?: string;
  
  // Bowling
  overs?: number; // derived from balls bowled usually, or direct
  wickets?: number;
  runsConceded?: number;
  economy?: number;
  bowlingAverage?: number;
  bowlingStrikeRate?: number;
  bestBowling?: string;

  // History
  recentMatches?: MatchPerformance[];
  summary?: string;
}

export interface Player {
  id: string;
  name: string;
  iplTeam: IPLTeam;
  smatTeam: string;
  role: PlayerRole;
  stats: DetailedStats;
}
