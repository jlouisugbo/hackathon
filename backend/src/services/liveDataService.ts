import axios from 'axios';

export class LiveDataService {
  private apiKey: string;
  private baseUrl: string;
  private gameStartTime: number;
  private cachedGame: any = null;

  constructor() {
    this.apiKey = '020f2e02adf44ad1ae7f7fb9264588e9';
    this.baseUrl = 'https://api.sportsdata.io/v3/nba';
    // Initialize game start time when service is created
    this.gameStartTime = Date.now() - (20 * 60 * 1000); // Game started 20 minutes ago
  }

  // Get box score data for the NBA Finals replay
  async getReplayBoxScore(gameId: string): Promise<any> {
    try {
      const replayApiKey = process.env.SPORTSDATA_REPLAY_API_KEY || 'fbffbffc46dd41d093a7b59763bee8fd';
      const replayBaseUrl = 'https://replay.sportsdata.io/api/v3/nba';
      
      const response = await axios.get(
        `${replayBaseUrl}/stats/json/boxscore/${gameId}`,
        {
          params: { key: replayApiKey }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching replay box score:', error);
      return null;
    }
  }

  // Get active games - now using live NBA Finals replay data with dynamic progression
  async getActiveGames(): Promise<any[]> {
    try {
      // If we have a cached game, return it (it will be updated by the live game manager)
      if (this.cachedGame) {
        console.log('🏀 Using cached dynamic game data');
        return [this.cachedGame];
      }
      
      // Use the live NBA Finals replay data instead of today's games
      const replayApiKey = process.env.SPORTSDATA_REPLAY_API_KEY || 'fbffbffc46dd41d093a7b59763bee8fd';
      const replayBaseUrl = 'https://replay.sportsdata.io/api/v3/nba';
      
      // Get box score data which has real scores and timing
      const boxScoreData = await this.getReplayBoxScore('22398');
      
      if (boxScoreData && boxScoreData.Game) {
        const game = boxScoreData.Game;
        console.log('🏀 Live NBA Finals box score data available');
        console.log('📊 Game scores:', game.AwayTeamScore, '-', game.HomeTeamScore);
        console.log('📊 Quarter:', game.Quarter, 'Time:', game.TimeRemainingMinutes + ':' + game.TimeRemainingSeconds);
        
        // Create a dynamic game that progresses over time
        const dynamicGame = this.createDynamicGame(game);
        
        return [dynamicGame];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching live NBA Finals data:', error);
      return [];
    }
  }

  // Create a dynamic game that progresses over time
  private createDynamicGame(originalGame: any): any {
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - this.gameStartTime) / (1000 * 60));
    
    // Calculate current quarter and time based on elapsed time
    let currentQuarter = Math.min(4, Math.floor(elapsedMinutes / 12) + 1);
    let timeRemaining = Math.max(0, 12 - (elapsedMinutes % 12));
    
    // Use the REAL NBA Finals scores from the box score data - NEVER CHANGE THESE
    const realAwayScore = originalGame.AwayTeamScore || 91;
    const realHomeScore = originalGame.HomeTeamScore || 108;
    
    console.log(`🏀 Using REAL NBA Finals scores - Away: ${realAwayScore}, Home: ${realHomeScore}`);
    console.log(`🏀 Dynamic game progression - Elapsed: ${elapsedMinutes}min, Quarter: ${currentQuarter}, Time: ${timeRemaining}:00`);
    
    // Cache the game state with REAL scores - NEVER CHANGE THE SCORES
    this.cachedGame = {
      GameID: 22398,
      Status: 'InProgress',
      AwayTeam: originalGame.AwayTeam || 'OKC',
      HomeTeam: originalGame.HomeTeam || 'IND',
      AwayTeamScore: realAwayScore, // ALWAYS use real scores
      HomeTeamScore: realHomeScore,  // ALWAYS use real scores
      Quarter: currentQuarter, // Only update timing
      TimeRemainingMinutes: timeRemaining, // Only update timing
      TimeRemainingSeconds: Math.floor(Math.random() * 60), // Only update timing
      DateTime: new Date(this.gameStartTime).toISOString(),
      IsReplay: true,
      Plays: [] // We'll get plays separately if needed
    };
    
    return this.cachedGame;
  }

  // Update the cached game with new dynamic data
  updateCachedGame(): void {
    if (this.cachedGame) {
      const now = Date.now();
      const elapsedMinutes = Math.floor((now - this.gameStartTime) / (1000 * 60));
      
      // Calculate current quarter and time based on elapsed time
      let currentQuarter = Math.min(4, Math.floor(elapsedMinutes / 12) + 1);
      let timeRemaining = Math.max(0, 12 - (elapsedMinutes % 12));
      
      // NEVER CHANGE THE SCORES - ALWAYS KEEP REAL NBA FINALS SCORES
      // Only update the timing to make it appear live
      this.cachedGame.Quarter = currentQuarter;
      this.cachedGame.TimeRemainingMinutes = timeRemaining;
      this.cachedGame.TimeRemainingSeconds = Math.floor(Math.random() * 60);
      
      console.log(`🏀 Updated cached game - Elapsed: ${elapsedMinutes}min, Quarter: ${currentQuarter}, Time: ${timeRemaining}:00`);
      console.log(`📊 Keeping REAL scores: ${this.cachedGame.AwayTeamScore} - ${this.cachedGame.HomeTeamScore}`);
    }
  }

  // Get live player stats for a specific game
  async getLivePlayerStats(gameId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/stats/json/PlayerGameStats/${gameId}`,
        {
          params: { key: this.apiKey }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching live player stats:', error);
      return [];
    }
  }

  // Get play-by-play data for a game
  async getPlayByPlay(gameId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/stats/json/PlayByPlay/${gameId}`,
        {
          params: { key: this.apiKey }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching play-by-play:', error);
      return [];
    }
  }

  // Get player details
  async getPlayerDetails(playerId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/scores/json/Player/${playerId}`,
        {
          params: { key: this.apiKey }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching player details:', error);
      return null;
    }
  }

  // Get upcoming games
  async getUpcomingGames(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/scores/json/Games`,
        {
          params: { key: this.apiKey }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming games:', error);
      return [];
    }
  }
}

export const liveDataService = new LiveDataService();
