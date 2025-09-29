import axios from 'axios';
import { Player, PricePoint } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SportsDataPlayer {
  PlayerID: number;
  Name: string;
  FirstName: string;
  LastName: string;
  Team: string;
  Position: string;
  Jersey: number;
  Status: string;
  Height: string;
  Weight: number;
  BirthDate: string;
  BirthCity: string;
  BirthState: string;
  BirthCountry: string;
  College: string;
  Salary: number;
  PhotoUrl: string;
  Experience: number;
  SportRadarPlayerID: string;
  RotoworldPlayerID: number;
  RotoWirePlayerID: number;
  StatsPlayerID: number;
  SportsDirectPlayerID: number;
  XMLTeamPlayerID: number;
  InjuryStatus: string;
  InjuryBodyPart: string;
  InjuryStartDate: string;
  InjuryNotes: string;
  FanDuelPlayerID: number;
  DraftKingsPlayerID: number;
  YahooPlayerID: number;
  FanDuelName: string;
  DraftKingsName: string;
  YahooName: string;
  DepthChartPosition: string;
  DepthChartOrder: number;
  GlobalTeamID: number;
  FantasyDraftName: string;
  FantasyDraftPlayerID: number;
  UsaTodayPlayerID: number;
  UsaTodayHeadshotUrl: string;
  UsaTodayHeadshotNoBackgroundUrl: string;
  UsaTodayHeadshotUpdated: string;
  UsaTodayHeadshotNoBackgroundUpdated: string;
}

interface SportsDataStats {
  PlayerID: number;
  Name: string;
  Team: string;
  Number: number;
  Position: string;
  PositionCategory: string;
  Started: number;
  GlobalTeamID: number;
  Updated: string;
  Games: number;
  FantasyPoints: number;
  Minutes: number;
  Seconds: number;
  FieldGoalsMade: number;
  FieldGoalsAttempted: number;
  FieldGoalsPercentage: number;
  EffectiveFieldGoalsPercentage: number;
  TwoPointersMade: number;
  TwoPointersAttempted: number;
  TwoPointersPercentage: number;
  ThreePointersMade: number;
  ThreePointersAttempted: number;
  ThreePointersPercentage: number;
  FreeThrowsMade: number;
  FreeThrowsAttempted: number;
  FreeThrowsPercentage: number;
  OffensiveRebounds: number;
  DefensiveRebounds: number;
  Rebounds: number;
  OffensiveReboundsPercentage: number;
  DefensiveReboundsPercentage: number;
  TotalReboundsPercentage: number;
  Assists: number;
  Steals: number;
  BlockedShots: number;
  Turnovers: number;
  PersonalFouls: number;
  Points: number;
  TrueShootingAttempts: number;
  TrueShootingPercentage: number;
  PlayerEfficiencyRating: number;
  AssistsPercentage: number;
  StealsPercentage: number;
  BlocksPercentage: number;
  TurnOversPercentage: number;
  UsageRatePercentage: number;
  FantasyPointsFanDuel: number;
  FantasyPointsDraftKings: number;
  FantasyPointsYahoo: number;
  PlusMinus: number;
  DoubleDoubles: number;
  TripleDoubles: number;
}

class NBAPlayersService {
  private apiKey: string;
  private baseUrl: string = 'https://api.sportsdata.io/v3/nba';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.apiKey = process.env.SPORTSDATA_API_KEY || '020f2e02adf44ad1ae7f7fb9264588e9';
    if (!this.apiKey) {
      console.warn('⚠️ SPORTSDATA_API_KEY not found in environment variables');
    }
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: { key: this.apiKey },
        timeout: 10000
      });

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching from SportsData API: ${endpoint}`, error);
      throw error;
    }
  }

  async getAllPlayers(): Promise<Player[]> {
    try {
      console.log('🏀 Fetching NBA players from SportsData API...');
      
      // Fetch active players
      const playersData: SportsDataPlayer[] = await this.makeRequest<SportsDataPlayer[]>('/scores/json/Players');
      
      // Try to fetch current season stats, fallback to previous year if not available
      let statsData: SportsDataStats[] = [];
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      
      try {
        statsData = await this.makeRequest<SportsDataStats[]>(`/scores/json/PlayerSeasonStats/${currentYear}`);
        console.log(`✅ Fetched ${currentYear} season stats: ${statsData.length} records`);
      } catch (error) {
        console.log(`⚠️ ${currentYear} season stats not available, trying ${previousYear}...`);
        try {
          statsData = await this.makeRequest<SportsDataStats[]>(`/scores/json/PlayerSeasonStats/${previousYear}`);
          console.log(`✅ Fetched ${previousYear} season stats: ${statsData.length} records`);
        } catch (fallbackError) {
          console.log(`⚠️ No season stats available for ${currentYear} or ${previousYear}, proceeding without stats`);
          statsData = [];
        }
      }
      
      console.log(`✅ Fetched ${playersData.length} players and ${statsData.length} stats records`);

      // Create a map of stats by player ID for quick lookup
      const statsMap = new Map<number, SportsDataStats>();
      statsData.forEach(stat => {
        statsMap.set(stat.PlayerID, stat);
      });

      // Convert to our Player format
      const players: Player[] = playersData
        .filter(player => player.Status === 'Active')
        .map(player => {
          const stats = statsMap.get(player.PlayerID);
          const basePrice = this.calculateBasePrice(player, stats);
          const volatility = this.calculateVolatility(player, stats);
          
          // Combine first and last name
          const fullName = `${player.FirstName} ${player.LastName}`.trim();
          
          return {
            id: `nba-${player.PlayerID}`,
            name: fullName,
            team: player.Team,
            position: this.mapPosition(player.Position),
            currentPrice: basePrice,
            priceChange24h: 0,
            priceChangePercent24h: 0,
            priceHistory: this.generateInitialPriceHistory(basePrice, volatility),
            stats: stats ? this.mapStats(stats) : this.getDefaultStats(),
            isPlaying: Math.random() > 0.3, // 70% chance of playing
            volatility,
            imageUrl: player.PhotoUrl || `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.PlayerID}.png`,
            jersey: player.Jersey
          };
        });

      console.log(`✅ Converted ${players.length} active NBA players`);
      return players;

    } catch (error) {
      console.error('❌ Error fetching NBA players:', error);
      // Return empty array if API fails
      return [];
    }
  }

  private calculateBasePrice(player: SportsDataPlayer, stats: SportsDataStats | undefined): number {
    if (!stats) {
      // Default price based on position and experience
      const basePrice = player.Experience > 5 ? 100 : 50;
      return basePrice + Math.random() * 50;
    }

    // Calculate price based on performance metrics
    const ppg = stats.Points / Math.max(stats.Games, 1);
    const rpg = stats.Rebounds / Math.max(stats.Games, 1);
    const apg = stats.Assists / Math.max(stats.Games, 1);
    const fg = stats.FieldGoalsPercentage || 0;
    const threePt = stats.ThreePointersPercentage || 0;
    const ft = stats.FreeThrowsPercentage || 0;
    const fantasyPoints = stats.FantasyPoints / Math.max(stats.Games, 1);

    // Weighted scoring system
    let price = 50; // Base price
    
    // Points per game (heavily weighted)
    price += ppg * 2;
    
    // Rebounds and assists
    price += rpg * 1.5;
    price += apg * 1.5;
    
    // Shooting percentages
    price += fg * 0.5;
    price += threePt * 0.3;
    price += ft * 0.2;
    
    // Fantasy points (indicator of overall value)
    price += fantasyPoints * 0.1;
    
    // Experience bonus
    price += player.Experience * 2;
    
    // Ensure minimum price
    return Math.max(price, 10);
  }

  private calculateVolatility(player: SportsDataPlayer, stats: SportsDataStats | undefined): number {
    if (!stats) {
      return 0.2; // Default volatility
    }

    // Calculate volatility based on consistency
    const games = stats.Games;
    if (games < 10) {
      return 0.3; // High volatility for players with few games
    }

    // Lower volatility for more experienced players
    const experienceFactor = Math.max(0.1, 0.3 - (player.Experience * 0.02));
    
    // Position-based volatility
    const positionVolatility = {
      'PG': 0.25,
      'SG': 0.22,
      'SF': 0.20,
      'PF': 0.18,
      'C': 0.15
    };
    
    const posVol = positionVolatility[this.mapPosition(player.Position)] || 0.2;
    
    return Math.min(0.4, Math.max(0.1, experienceFactor + posVol));
  }

  private mapPosition(position: string): 'PG' | 'SG' | 'SF' | 'PF' | 'C' {
    const positionMap: { [key: string]: 'PG' | 'SG' | 'SF' | 'PF' | 'C' } = {
      'PG': 'PG',
      'SG': 'SG',
      'SF': 'SF',
      'PF': 'PF',
      'C': 'C',
      'G': 'PG',
      'F': 'SF',
      'G-F': 'SG',
      'F-G': 'SF',
      'F-C': 'PF',
      'C-F': 'C'
    };
    
    return positionMap[position] || 'SF';
  }

  private mapStats(stats: SportsDataStats) {
    return {
      ppg: stats.Points / Math.max(stats.Games, 1),
      rpg: stats.Rebounds / Math.max(stats.Games, 1),
      apg: stats.Assists / Math.max(stats.Games, 1),
      fg: stats.FieldGoalsPercentage || 0,
      threePt: stats.ThreePointersPercentage || 0,
      ft: stats.FreeThrowsPercentage || 0,
      gamesPlayed: stats.Games,
      minutesPerGame: stats.Minutes / Math.max(stats.Games, 1),
      fantasyPoints: stats.FantasyPoints / Math.max(stats.Games, 1),
      steals: stats.Steals / Math.max(stats.Games, 1),
      blocks: stats.BlockedShots / Math.max(stats.Games, 1),
      turnovers: stats.Turnovers / Math.max(stats.Games, 1),
      plusMinus: stats.PlusMinus / Math.max(stats.Games, 1)
    };
  }

  private getDefaultStats() {
    return {
      ppg: 0,
      rpg: 0,
      apg: 0,
      fg: 0,
      threePt: 0,
      ft: 0,
      gamesPlayed: 0,
      minutesPerGame: 0,
      fantasyPoints: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      plusMinus: 0
    };
  }

  private generateInitialPriceHistory(basePrice: number, volatility: number): PricePoint[] {
    const history: PricePoint[] = [];
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    let currentPrice = basePrice * (0.8 + Math.random() * 0.4);

    for (let i = 0; i < 30; i++) {
      const timestamp = thirtyDaysAgo + (i * 24 * 60 * 60 * 1000);
      const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
      currentPrice = Math.max(10, currentPrice + change);

      history.push({
        timestamp,
        price: Math.round(currentPrice * 100) / 100,
        volume: Math.floor(Math.random() * 10000) + 1000
      });
    }

    return history;
  }

  async getPlayerStats(playerId: string, season: number = new Date().getFullYear()): Promise<SportsDataStats | null> {
    try {
      const stats = await this.makeRequest<SportsDataStats[]>(`/scores/json/PlayerSeasonStats/${season}`);
      const playerStats = stats.find(stat => `nba-${stat.PlayerID}` === playerId);
      return playerStats || null;
    } catch (error) {
      console.error(`❌ Error fetching stats for player ${playerId}:`, error);
      return null;
    }
  }

  async getTeamPlayers(team: string): Promise<Player[]> {
    const allPlayers = await this.getAllPlayers();
    return allPlayers.filter(player => player.team === team);
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🧹 NBA Players Service cache cleared');
  }
}

export default NBAPlayersService;
