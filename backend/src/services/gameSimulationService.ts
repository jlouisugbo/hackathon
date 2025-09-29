import axios from 'axios';

interface SportsDataGame {
  GameID: number;
  Season: number;
  SeasonType: number;
  Status: string;
  DateTime: string;
  DateTimeUTC: string;
  AwayTeam: string;
  HomeTeam: string;
  AwayTeamID: number;
  HomeTeamID: number;
  StadiumID: number;
  Channel: string;
  Attendance: number;
  AwayTeamScore: number;
  HomeTeamScore: number;
  Updated: string;
  Quarter: string;
  TimeRemainingMinutes: number;
  TimeRemainingSeconds: number;
  GlobalGameID: number;
  GlobalAwayTeamID: number;
  GlobalHomeTeamID: number;
  PointSpread: number;
  OverUnder: number;
  AwayTeamMoneyLine: number;
  HomeTeamMoneyLine: number;
  LastPlay: string;
  IsClosed: boolean;
  GameEndDateTime: string;
  HomeTeamRotationNumber: number;
  AwayTeamRotationNumber: number;
  NeutralVenue: boolean;
  OverPayout: number;
  UnderPayout: number;
  Quarters: Array<{
    QuarterID: number;
    GameID: number;
    Number: number;
    Name: string;
    AwayScore: number;
    HomeScore: number;
    Updated: string;
    Created: string;
  }>;
}

interface SportsDataPlay {
  PlayID: number;
  GameID: number;
  QuarterID: number;
  Quarter: number;
  TimeRemaining: string;
  AwayScore: number;
  HomeScore: number;
  Team: string;
  Description: string;
  Updated: string;
  Created: string;
}

interface SportsDataPlayerGameStats {
  StatID: number;
  GameID: number;
  PlayerID: number;
  Name: string;
  Team: string;
  Number: number;
  Position: string;
  PositionCategory: string;
  Started: boolean;
  Played: boolean;
  FantasyPoints: number;
  FantasyPointsFanDuel: number;
  FantasyPointsDraftKings: number;
  FantasyPointsYahoo: number;
  FantasyPointsSuperdraft: number;
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
  FantasyPointsFantasyDraft: number;
  PlusMinus: number;
  DoubleDoubles: number;
  TripleDoubles: number;
  FantasyPointsHalfPointPpr: number;
  Updated: string;
  Created: string;
}

export class GameSimulationService {
  private apiKey: string;
  private replayApiKey: string;
  private baseUrl: string;
  private replayBaseUrl: string;

  constructor() {
    this.apiKey = process.env.SPORTSDATA_API_KEY || '';
    this.replayApiKey = process.env.SPORTSDATA_REPLAY_API_KEY || 'fbffbffc46dd41d093a7b59763bee8fd';
    this.baseUrl = 'https://api.sportsdata.io/v3/nba';
    this.replayBaseUrl = 'https://replay.sportsdata.io/api/v3/nba';
    
    if (!this.apiKey) {
      console.warn('⚠️ SPORTSDATA_API_KEY not found in environment variables');
    }
    if (!this.replayApiKey) {
      console.warn('⚠️ SPORTSDATA_REPLAY_API_KEY not found in environment variables');
    } else {
      console.log('✅ Replay API key configured for 2025 NBA Finals');
    }
  }

  /**
   * Get games for a specific date
   */
  async getGamesByDate(date: string): Promise<SportsDataGame[]> {
    try {
      console.log(`🏀 Fetching games for date: ${date}`);
      const response = await this.makeRequest<SportsDataGame[]>(`/scores/json/GamesByDate/${date}`);
      console.log(`✅ Found ${response.length} games for ${date}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching games by date:', error);
      throw error;
    }
  }

  /**
   * Get play-by-play data for a specific game
   */
  async getPlayByPlay(gameId: number): Promise<SportsDataPlay[]> {
    try {
      console.log(`🏀 Fetching play-by-play for game: ${gameId}`);
      const response = await this.makeRequest<SportsDataPlay[]>(`/scores/json/PlayByPlay/${gameId}`);
      console.log(`✅ Found ${response.length} plays for game ${gameId}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching play-by-play:', error);
      throw error;
    }
  }

  /**
   * Get play-by-play data from replay API (2025 NBA Finals)
   */
  async getReplayPlayByPlay(gameId: number = 22398): Promise<{Plays: SportsDataPlay[]}> {
    try {
      console.log(`🏀 Fetching replay play-by-play for game: ${gameId}`);
      const response = await this.makeReplayRequest<{Plays: SportsDataPlay[]}>(`/pbp/json/playbyplay/${gameId}`);
      console.log(`✅ Found ${response.Plays.length} plays for replay game ${gameId}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching replay play-by-play:', error);
      throw error;
    }
  }

  /**
   * Get player stats for a specific game
   */
  async getPlayerGameStats(gameId: number): Promise<SportsDataPlayerGameStats[]> {
    try {
      console.log(`🏀 Fetching player stats for game: ${gameId}`);
      const response = await this.makeRequest<SportsDataPlayerGameStats[]>(`/scores/json/PlayerGameStats/${gameId}`);
      console.log(`✅ Found ${response.length} player stats for game ${gameId}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching player game stats:', error);
      throw error;
    }
  }

  /**
   * Get recent games (last 7 days) - using today's date
   */
  async getRecentGames(): Promise<SportsDataGame[]> {
    try {
      console.log('🏀 Fetching recent games...');
      const today = new Date().toISOString().split('T')[0];
      const response = await this.makeRequest<SportsDataGame[]>(`/scores/json/GamesByDate/${today}`);
      console.log(`✅ Found ${response.length} games for ${today}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching recent games:', error);
      // Try yesterday if today fails
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        console.log(`🔄 Trying yesterday's games: ${yesterdayStr}`);
        const response = await this.makeRequest<SportsDataGame[]>(`/scores/json/GamesByDate/${yesterdayStr}`);
        console.log(`✅ Found ${response.length} games for ${yesterdayStr}`);
        return response;
      } catch (fallbackError) {
        console.error('❌ Error fetching yesterday games:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * Get games for a specific season
   */
  async getGamesBySeason(season: number): Promise<SportsDataGame[]> {
    try {
      console.log(`🏀 Fetching games for season: ${season}`);
      const response = await this.makeRequest<SportsDataGame[]>(`/scores/json/Games/${season}`);
      console.log(`✅ Found ${response.length} games for season ${season}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching games by season:', error);
      throw error;
    }
  }

  /**
   * Simulate a game using play-by-play data
   */
  async simulateGame(gameId: number): Promise<{
    game: SportsDataGame;
    plays: SportsDataPlay[];
    playerStats: SportsDataPlayerGameStats[];
    simulation: {
      events: Array<{
        time: string;
        description: string;
        awayScore: number;
        homeScore: number;
        impact: 'high' | 'medium' | 'low';
      }>;
      finalScore: {
        away: number;
        home: number;
      };
      topPerformers: Array<{
        playerId: number;
        name: string;
        team: string;
        points: number;
        fantasyPoints: number;
      }>;
    };
  }> {
    try {
      console.log(`🎮 Starting simulation for game: ${gameId}`);
      
      // Get game details
      const games = await this.getRecentGames();
      const game = games.find(g => g.GameID === gameId);
      
      if (!game) {
        throw new Error(`Game ${gameId} not found`);
      }

      // Get play-by-play and player stats
      const [plays, playerStats] = await Promise.all([
        this.getPlayByPlay(gameId),
        this.getPlayerGameStats(gameId)
      ]);

      // Simulate the game
      const simulation = this.createGameSimulation(game, plays, playerStats);

      console.log(`✅ Game simulation completed for ${game.AwayTeam} vs ${game.HomeTeam}`);
      
      return {
        game,
        plays,
        playerStats,
        simulation
      };
    } catch (error) {
      console.error('❌ Error simulating game:', error);
      throw error;
    }
  }

  /**
   * Create a game simulation from play-by-play data
   */
  private createGameSimulation(
    game: SportsDataGame,
    plays: SportsDataPlay[],
    playerStats: SportsDataPlayerGameStats[]
  ) {
    const events = plays
      .filter(play => play.Description && play.Description.trim() !== '')
      .map(play => ({
        time: play.TimeRemaining,
        description: play.Description,
        awayScore: play.AwayScore,
        homeScore: play.HomeScore,
        impact: this.calculatePlayImpact(play.Description)
      }))
      .sort((a, b) => {
        // Sort by time remaining (latest first)
        const timeA = this.parseTimeRemaining(a.time);
        const timeB = this.parseTimeRemaining(b.time);
        return timeB - timeA;
      });

    const finalScore = {
      away: game.AwayTeamScore,
      home: game.HomeTeamScore
    };

    const topPerformers = playerStats
      .filter(player => player.Played)
      .sort((a, b) => b.FantasyPoints - a.FantasyPoints)
      .slice(0, 5)
      .map(player => ({
        playerId: player.PlayerID,
        name: player.Name,
        team: player.Team,
        points: player.Points,
        fantasyPoints: player.FantasyPoints
      }));

    return {
      events,
      finalScore,
      topPerformers
    };
  }

  /**
   * Calculate the impact level of a play
   */
  private calculatePlayImpact(description: string): 'high' | 'medium' | 'low' {
    const highImpactKeywords = [
      '3-pointer', 'three-pointer', 'dunk', 'block', 'steal', 'foul', 'free throw',
      'rebound', 'assist', 'turnover', 'timeout', 'substitution'
    ];
    
    const mediumImpactKeywords = [
      '2-pointer', 'two-pointer', 'jump shot', 'layup', 'foul'
    ];

    const lowerDescription = description.toLowerCase();
    
    if (highImpactKeywords.some(keyword => lowerDescription.includes(keyword))) {
      return 'high';
    }
    
    if (mediumImpactKeywords.some(keyword => lowerDescription.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Parse time remaining string to minutes
   */
  private parseTimeRemaining(timeString: string): number {
    if (!timeString || timeString === '') return 0;
    
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes + (seconds / 60);
    }
    
    return 0;
  }

  /**
   * Make API request with error handling
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('SportsData API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const params = { key: this.apiKey };

    try {
      const response = await axios.get(url, { 
        params,
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NBA-Player-Stock-Market/1.0'
        }
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error(`❌ API Error: ${error.response.status} - ${error.response.statusText}`);
        console.error(`❌ URL: ${url}`);
        console.error(`❌ Response:`, error.response.data);
      } else {
        console.error('❌ Network Error:', error.message);
      }
      throw error;
    }
  }

  /**
   * Make replay API request with error handling
   */
  private async makeReplayRequest<T>(endpoint: string): Promise<T> {
    if (!this.replayApiKey) {
      throw new Error('SportsData Replay API key not configured. Contact SportsData for replay access.');
    }

    const url = `${this.replayBaseUrl}${endpoint}`;
    const params = { key: this.replayApiKey };

    try {
      const response = await axios.get(url, { 
        params,
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NBA-Player-Stock-Market/1.0'
        }
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error(`❌ Replay API Error: ${error.response.status} - ${error.response.statusText}`);
        console.error(`❌ URL: ${url}`);
        console.error(`❌ Response:`, error.response.data);
      } else {
        console.error('❌ Network Error:', error.message);
      }
      throw error;
    }
  }
}

export default GameSimulationService;
