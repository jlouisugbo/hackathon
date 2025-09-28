export interface Player {
  id: string;
  name: string;
  team: string;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  priceHistory: PricePoint[];
  stats: PlayerStats;
  isPlaying: boolean;
  volatility: number;
  imageUrl: string;
  jersey: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface PlayerStats {
  ppg: number; // points per game
  rpg: number; // rebounds per game
  apg: number; // assists per game
  fg: number;  // field goal percentage
  threePt: number; // 3-point percentage
  gamesPlayed: number;
  minutesPerGame: number;
}

export interface Portfolio {
  userId: string;
  seasonHoldings: Holding[];
  liveHoldings: Holding[];
  totalValue: number;
  availableBalance: number;
  todaysPL: number;
  seasonPL: number;
  livePL: number;
  tradesRemaining: number;
  lastUpdated: number;
}

export interface Holding {
  playerId: string;
  playerName: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  purchaseDate: number;
}

export interface MarketImpact {
  priceImpact: number;
  priceImpactPercent: number;
  newPrice: number;
  impactLevel: 'minimal' | 'moderate' | 'significant' | 'major';
  description?: string;
}

export interface Trade {
  id: string;
  userId: string;
  playerId: string;
  playerName: string;
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  shares: number;
  price: number;
  timestamp: number;
  accountType: 'season' | 'live';
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
  multiplier?: number;
  totalAmount: number;
  marketImpact?: MarketImpact;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  eventType: 'basket' | 'three_pointer' | 'assist' | 'rebound' | 'steal' | 'block' | 'dunk';
  multiplier?: number;
  description: string;
  priceImpact: number;
  quarter: number;
  gameTime: string;
}

export interface LiveGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  quarter: number;
  timeRemaining: string;
  isActive: boolean;
  startTime: number;
  activePlayers: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  joinDate: number;
  totalPortfolioValue: number;
  seasonRank: number;
  liveRank: number;
  badges: Badge[];
  stats: UserStats;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedDate: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserStats {
  totalTrades: number;
  winRate: number;
  bestDay: number;
  worstDay: number;
  longestStreak: number;
  totalProfit: number;
  avgHoldTime: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string;
  portfolioValue: number;
  todaysPL: number;
  todaysPLPercent: number;
  rank: number;
  previousRank: number;
  badges: Badge[];
}

export interface MarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  activeTraders: number;
  topGainer: {
    playerId: string;
    playerName: string;
    priceChange: number;
    priceChangePercent: number;
  };
  topLoser: {
    playerId: string;
    playerName: string;
    priceChange: number;
    priceChangePercent: number;
  };
}

export interface FlashMultiplier {
  playerId: string;
  playerName: string;
  multiplier: number;
  duration: number; // seconds
  startTime: number;
  eventDescription: string;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'user' | 'system' | 'trade';
  tradeData?: {
    playerId: string;
    playerName: string;
    type: 'buy' | 'sell';
    shares: number;
    price: number;
  };
}

export interface NotificationData {
  id: string;
  userId: string;
  type: 'trade_executed' | 'price_alert' | 'flash_multiplier' | 'rank_change' | 'badge_earned';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  data?: any;
}

export interface PriceAlert {
  id: string;
  userId: string;
  playerId: string;
  playerName: string;
  type: 'above' | 'below';
  targetPrice: number;
  isActive: boolean;
  createdAt: number;
}

// Socket Event Types
export interface SocketEvents {
  // Client to Server
  'join_room': (userId: string) => void;
  'send_chat_message': (message: string) => void;
  'subscribe_player': (playerId: string) => void;
  'unsubscribe_player': (playerId: string) => void;

  // Server to Client
  'price_update': (data: { playerId: string; price: number; change: number; changePercent: number }) => void;
  'flash_multiplier': (data: FlashMultiplier) => void;
  'game_event': (event: GameEvent) => void;
  'leaderboard_update': (leaderboard: LeaderboardEntry[]) => void;
  'chat_message': (message: ChatMessage) => void;
  'trade_executed': (trade: Trade) => void;
  'portfolio_update': (portfolio: Portfolio) => void;
  'market_data': (data: MarketData) => void;
  'notification': (notification: NotificationData) => void;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request Types
export interface TradeRequest {
  playerId: string;
  type: 'buy' | 'sell';
  shares: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
  accountType: 'season' | 'live';
}

export interface CreateUserRequest {
  username: string;
  email: string;
  avatarUrl?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  avatarUrl?: string;
}

// Utility Types
export type AccountType = 'season' | 'live';
export type OrderType = 'market' | 'limit';
export type TradeType = 'buy' | 'sell';
export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type EventType = 'basket' | 'three_pointer' | 'assist' | 'rebound' | 'steal' | 'block' | 'dunk';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type NotificationType = 'trade_executed' | 'price_alert' | 'flash_multiplier' | 'rank_change' | 'badge_earned' | 'system';

// Constants
export const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];
export const TEAMS = [
  'LAL', 'GSW', 'MIL', 'DAL', 'BOS', 'PHI', 'DEN', 'BRK', 'POR', 'MIA',
  'LAC', 'PHX', 'UTA', 'ATL', 'CHI', 'MEM', 'NYK', 'MIN', 'NOP', 'SAS',
  'WAS', 'SAC', 'IND', 'CLE', 'TOR', 'ORL', 'CHA', 'DET', 'OKC', 'HOU'
];

export const INITIAL_BALANCE = 10000;
export const LIVE_TRADES_LIMIT = 5;
export const PRICE_UPDATE_INTERVAL = 10000; // 10 seconds
export const FLASH_MULTIPLIER_DURATION = 30000; // 30 seconds