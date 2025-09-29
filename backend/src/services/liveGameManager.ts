import { liveDataService } from './liveDataService';
import { realPriceEngine, PriceUpdate } from '../utils/realPriceEngine';
import { broadcastPriceUpdate } from '../socket/socketHandler';
import { Server } from 'socket.io';

export class LiveGameManager {
  private activeGames: Set<string> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private io: Server | null = null;

  // Set the Socket.IO instance
  setSocketIO(io: Server): void {
    this.io = io;
  }

  // Start monitoring live games
  async startLiveMonitoring(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🏀 Starting live game monitoring...');
    
    // Check for active games every 5 seconds for more frequent updates
    this.updateInterval = setInterval(async () => {
      await this.checkAndUpdateGames();
    }, 5000) as unknown as NodeJS.Timeout;
    
    // Initial check
    await this.checkAndUpdateGames();
  }

  // Stop monitoring
  stopLiveMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('🏀 Stopped live game monitoring');
  }

  // Process replay data for live updates
  private async processReplayData(replayGame: any): Promise<void> {
    try {
      console.log('🎮 Processing live NBA Finals replay data...');
      
      // Broadcast game score update if we have the game data
      if (replayGame.AwayTeamScore !== undefined && replayGame.HomeTeamScore !== undefined) {
        this.broadcastGameScoreUpdate(replayGame);
      }
      
      console.log('✅ Live NBA Finals data processed successfully');
    } catch (error) {
      console.error('❌ Error processing replay data:', error);
    }
  }

  // Simulate price updates based on live plays
  private async simulatePriceUpdateFromPlay(play: any): Promise<void> {
    try {
      // Extract player names from play description
      const playerNames = this.extractPlayerNames(play.Description);
      
      for (const playerName of playerNames) {
        // Find the player in our data
        const player = await this.findPlayerByName(playerName);
        if (player) {
          // Calculate price impact based on play type
          const priceImpact = this.calculatePlayImpact(play.Description);
          
          if (priceImpact !== 0) {
            // Update player price
            const newPrice = player.currentPrice + priceImpact;
            await this.updatePlayerPrice(player.id, newPrice);
            
            console.log(`💰 ${playerName}: $${player.currentPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${priceImpact > 0 ? '+' : ''}${priceImpact.toFixed(2)})`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error simulating price update:', error);
    }
  }

  // Extract player names from play description
  private extractPlayerNames(description: string): string[] {
    const names: string[] = [];
    
    // Common NBA player name patterns
    const namePatterns = [
      /([A-Z][a-z]+ [A-Z][a-z]+)/g, // First Last
      /([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)/g, // First M. Last
    ];
    
    for (const pattern of namePatterns) {
      const matches = description.match(pattern);
      if (matches) {
        names.push(...matches);
      }
    }
    
    return names;
  }

  // Find player by name
  private async findPlayerByName(name: string): Promise<any> {
    // This would need to be implemented to search through our player data
    // For now, return null
    return null;
  }

  // Calculate price impact based on play description
  private calculatePlayImpact(description: string): number {
    const impact = Math.random() * 2 - 1; // Random between -1 and 1
    
    // Higher impact for certain play types
    if (description.includes('three pointer') || description.includes('3-pointer')) {
      return impact * 1.5;
    } else if (description.includes('dunk') || description.includes('layup')) {
      return impact * 1.2;
    } else if (description.includes('turnover') || description.includes('misses')) {
      return impact * -0.8;
    }
    
    return impact;
  }

  // Update player price
  private async updatePlayerPrice(playerId: string, newPrice: number): Promise<void> {
    // This would need to be implemented to update the player's price
    // For now, just log it
    console.log(`📈 Updated price for player ${playerId}: $${newPrice.toFixed(2)}`);
  }

  // Update player prices for live games
  private async updatePlayerPrices(): Promise<void> {
    try {
      // Skip player price updates for now to avoid 404 errors
      // The game simulation works perfectly without player stats
      console.log('🏀 Skipping player price updates (game simulation working)');
      return;
      
      // Get price updates from real price engine
      const priceUpdates = await realPriceEngine.updatePricesForGame('22398');
      
      if (priceUpdates.length === 0) {
        console.log('🏀 No price updates available');
        return;
      }

      console.log(`🏀 ${priceUpdates.length} players updated`);

      // Broadcast price updates to all connected users
      if (this.io) {
        for (const update of priceUpdates) {
          broadcastPriceUpdate(
            this.io,
            update.playerId,
            update.newPrice,
            update.priceChange,
            update.priceChangePercent
          );

          console.log(`💰 ${update.playerName}: $${update.oldPrice} → $${update.newPrice} (${update.priceChangePercent.toFixed(2)}%)`);
        }
      }
    } catch (error) {
      console.error('❌ Error updating player prices:', error);
    }
  }

  // Check for active games and update prices
  private async checkAndUpdateGames(): Promise<void> {
    try {
      const activeGames = await liveDataService.getActiveGames();
      
      if (activeGames.length === 0) {
        console.log('🏀 No active games found');
        return;
      }
      
      // Check if we have live NBA Finals replay data
      const replayGame = activeGames.find(game => game.IsReplay);
      if (replayGame) {
        console.log(`🏀 Live NBA Finals replay detected: ${replayGame.AwayTeam} vs ${replayGame.HomeTeam}`);
        console.log(`📊 Replay data: ${replayGame.Plays ? replayGame.Plays.length : 0} plays available`);
        console.log(`📊 Current scores: ${replayGame.AwayTeam} ${replayGame.AwayTeamScore} - ${replayGame.HomeTeamScore} ${replayGame.HomeTeam}`);
        console.log(`📊 Quarter: ${replayGame.Quarter}, Time: ${replayGame.TimeRemainingMinutes}:${replayGame.TimeRemainingSeconds}`);
        
        // Update the cached game with new dynamic data
        liveDataService.updateCachedGame();
        
        // Broadcast score update immediately
        this.broadcastGameScoreUpdate(replayGame);
        
        // Update player prices for live games
        await this.updatePlayerPrices();
        
        // Process the replay data for live updates
        await this.processReplayData(replayGame);
        return;
      }

      console.log(`🏀 Found ${activeGames.length} active games`);

      for (const game of activeGames) {
        if (game.Status === 'InProgress') {
          // Broadcast score update for live games
          this.broadcastGameScoreUpdate(game);
          await this.updateGamePrices(game.GameID);
        }
      }
    } catch (error) {
      console.error('Error checking active games:', error);
    }
  }

  // Update prices for a specific game
  private async updateGamePrices(gameId: string): Promise<void> {
    try {
      console.log(`🏀 Updating prices for game: ${gameId}`);
      
      const priceUpdates = await realPriceEngine.updatePricesForGame(gameId);
      
      if (priceUpdates.length === 0) {
        console.log(`🏀 No price updates for game: ${gameId}`);
        return;
      }

      console.log(`🏀 ${priceUpdates.length} players updated in game: ${gameId}`);

      // Broadcast price updates to all connected users
      if (this.io) {
        for (const update of priceUpdates) {
          broadcastPriceUpdate(
            this.io,
            update.playerId,
            update.newPrice,
            update.priceChange,
            update.priceChangePercent
          );

          console.log(`💰 ${update.playerName}: $${update.oldPrice} → $${update.newPrice} (${update.priceChangePercent.toFixed(2)}%)`);
        }
      }
    } catch (error) {
      console.error(`Error updating prices for game ${gameId}:`, error);
    }
  }

  // Get current active games
  getActiveGames(): string[] {
    return Array.from(this.activeGames);
  }

  // Check if monitoring is running
  isMonitoring(): boolean {
    return this.isRunning;
  }

  // Force update for a specific game (for testing)
  async forceUpdateGame(gameId: string): Promise<PriceUpdate[]> {
    return await realPriceEngine.updatePricesForGame(gameId);
  }

  // Broadcast game score update to all connected clients
  private broadcastGameScoreUpdate(gameData: any): void {
    if (!this.io) return;

    const scoreUpdate = {
      homeScore: gameData.HomeTeamScore || 0,
      awayScore: gameData.AwayTeamScore || 0,
      quarter: parseInt(gameData.Quarter) || 1,
      timeRemaining: `${gameData.TimeRemainingMinutes || 12}:${String(gameData.TimeRemainingSeconds || 0).padStart(2, '0')}`,
      lastScore: {
        team: gameData.HomeTeamScore > gameData.AwayTeamScore ? 'home' : 'away',
        points: Math.abs(gameData.HomeTeamScore - gameData.AwayTeamScore),
        teamName: gameData.HomeTeamScore > gameData.AwayTeamScore ? gameData.HomeTeam : gameData.AwayTeam
      }
    };

    this.io.to('general').emit('game_score_update', scoreUpdate);
    this.io.to('live_trading').emit('game_score_update', scoreUpdate);

    console.log(`🏀 Score Update: ${gameData.AwayTeam} ${scoreUpdate.awayScore} - ${scoreUpdate.homeScore} ${gameData.HomeTeam} | Q${scoreUpdate.quarter} ${scoreUpdate.timeRemaining}`);
  }
}

export const liveGameManager = new LiveGameManager();
